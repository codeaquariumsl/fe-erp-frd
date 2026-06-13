/**
 * Batch Management Utilities
 * 
 * This module provides utility functions for batch management operations
 * including expiry calculations, batch number generation, and FIFO operations.
 */

import { format, differenceInDays, addDays, isValid } from "date-fns"

export interface BatchExpiryStatus {
  status: 'expired' | 'expiring_soon' | 'warning' | 'valid'
  label: string
  daysRemaining: number
  variant: 'destructive' | 'secondary' | 'default'
  className?: string
}

export interface BatchSummary {
  totalBatches: number
  activeBatches: number
  expiredBatches: number
  expiringSoonBatches: number
  totalValue: number
  averageDaysToExpiry: number
}

/**
 * Calculate expiry status for a batch based on its expiration date
 */
export function getBatchExpiryStatus(
  expireDate: string | Date, 
  warningDays: number = 30
): BatchExpiryStatus {
  const today = new Date()
  const expire = new Date(expireDate)
  
  if (!isValid(expire)) {
    return {
      status: 'warning',
      label: 'Invalid Date',
      daysRemaining: 0,
      variant: 'secondary'
    }
  }
  
  const daysRemaining = differenceInDays(expire, today)
  
  if (daysRemaining < 0) {
    return {
      status: 'expired',
      label: 'Expired',
      daysRemaining,
      variant: 'destructive',
      className: 'bg-red-100 text-red-800 border-red-300'
    }
  } else if (daysRemaining <= 7) {
    return {
      status: 'expiring_soon',
      label: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
      daysRemaining,
      variant: 'destructive',
      className: 'bg-red-100 text-red-800 border-red-300'
    }
  } else if (daysRemaining <= warningDays) {
    return {
      status: 'warning',
      label: `${daysRemaining} days`,
      daysRemaining,
      variant: 'secondary',
      className: 'bg-orange-100 text-orange-800 border-orange-300'
    }
  } else {
    return {
      status: 'valid',
      label: `${daysRemaining} days`,
      daysRemaining,
      variant: 'default',
      className: 'bg-green-100 text-green-800 border-green-300'
    }
  }
}

/**
 * Generate a batch number based on GRN information
 */
export function generateBatchNumber(
  grnId: number, 
  grnNumber?: string, 
  date?: Date | string,
  sequence?: number
): string {
  const batchDate = date ? new Date(date) : new Date()
  const dateStr = format(batchDate, 'yyyyMMdd')
  const seqStr = sequence ? sequence.toString().padStart(3, '0') : '001'
  
  if (grnNumber) {
    // Use GRN number if available: BATCH-GRN001-20241008-001
    return `BATCH-${grnNumber}-${dateStr}-${seqStr}`
  } else {
    // Use GRN ID if GRN number not available: BATCH-GRN001-20241008-001
    return `BATCH-GRN${grnId.toString().padStart(3, '0')}-${dateStr}-${seqStr}`
  }
}

/**
 * Calculate suggested expiry date based on item type and batch date
 */
export function calculateSuggestedExpiryDate(
  batchDate: Date | string,
  itemType?: string,
  defaultDays: number = 365
): Date {
  const batch = new Date(batchDate)
  
  // Default shelf life by item type (in days)
  const shelfLifeMap: Record<string, number> = {
    'fresh': 7,
    'dairy': 14,
    'frozen': 365,
    'canned': 730,
    'dry': 540,
    'produce': 14,
    'meat': 30,
    'seafood': 21,
    'bakery': 7,
    'beverage': 365
  }
  
  const shelfLifeDays = itemType ? shelfLifeMap[itemType.toLowerCase()] || defaultDays : defaultDays
  return addDays(batch, shelfLifeDays)
}

/**
 * Get batches sorted by FIFO (First In, First Out) order
 */
export function sortBatchesByFIFO<T extends { batchDate: string; expireDate: string }>(
  batches: T[]
): T[] {
  return [...batches].sort((a, b) => {
    // Primary sort: expiry date (earliest first)
    const expiryComparison = new Date(a.expireDate).getTime() - new Date(b.expireDate).getTime()
    
    if (expiryComparison !== 0) {
      return expiryComparison
    }
    
    // Secondary sort: batch date (oldest first)
    return new Date(a.batchDate).getTime() - new Date(b.batchDate).getTime()
  })
}

/**
 * Calculate batch summary statistics
 */
export function calculateBatchSummary(
  batches: Array<{
    isActive: boolean
    expireDate: string
    batchDate: string
    BatchItems?: Array<{ batchQuantity: number; Item?: { costPrice?: number } }>
  }>,
  warningDays: number = 30
): BatchSummary {
  const today = new Date()
  
  const activeBatches = batches.filter(b => b.isActive)
  const expiredBatches = activeBatches.filter(b => 
    differenceInDays(new Date(b.expireDate), today) < 0
  )
  const expiringSoonBatches = activeBatches.filter(b => {
    const days = differenceInDays(new Date(b.expireDate), today)
    return days >= 0 && days <= warningDays
  })
  
  // Calculate total value
  const totalValue = batches.reduce((sum, batch) => {
    if (!batch.isActive || !batch.BatchItems) return sum
    
    return sum + batch.BatchItems.reduce((itemSum, item) => {
      const cost = item.Item?.costPrice || 0
      return itemSum + (item.batchQuantity * cost)
    }, 0)
  }, 0)
  
  // Calculate average days to expiry for active batches
  const activeBatchDays = activeBatches
    .map(b => differenceInDays(new Date(b.expireDate), today))
    .filter(days => days >= 0) // Only include non-expired batches
  
  const averageDaysToExpiry = activeBatchDays.length > 0
    ? activeBatchDays.reduce((sum, days) => sum + days, 0) / activeBatchDays.length
    : 0
  
  return {
    totalBatches: batches.length,
    activeBatches: activeBatches.length,
    expiredBatches: expiredBatches.length,
    expiringSoonBatches: expiringSoonBatches.length,
    totalValue: Math.round(totalValue * 100) / 100, // Round to 2 decimal places
    averageDaysToExpiry: Math.round(averageDaysToExpiry)
  }
}

/**
 * Validate batch data before creation/update
 */
export interface BatchValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateBatchData(batch: {
  batchNumber?: string
  batchDate: string | Date
  expireDate: string | Date
  grnId: number
  locationId: number
  storeId: number
}): BatchValidationResult {
  const errors: string[] = []
  
  // Validate required fields
  if (!batch.grnId || batch.grnId <= 0) {
    errors.push('Valid GRN ID is required')
  }
  
  if (!batch.locationId || batch.locationId <= 0) {
    errors.push('Valid Location ID is required')
  }
  
  if (!batch.storeId || batch.storeId <= 0) {
    errors.push('Valid Store ID is required')
  }
  
  // Validate dates
  const batchDate = new Date(batch.batchDate)
  const expireDate = new Date(batch.expireDate)
  
  if (!isValid(batchDate)) {
    errors.push('Valid batch date is required')
  }
  
  if (!isValid(expireDate)) {
    errors.push('Valid expiry date is required')
  }
  
  if (isValid(batchDate) && isValid(expireDate)) {
    if (expireDate <= batchDate) {
      errors.push('Expiry date must be after batch date')
    }
    
    // Check if batch date is not too far in the future
    const maxFutureDays = 30
    if (differenceInDays(batchDate, new Date()) > maxFutureDays) {
      errors.push(`Batch date cannot be more than ${maxFutureDays} days in the future`)
    }
  }
  
  // Validate batch number format if provided
  if (batch.batchNumber) {
    const batchNumberRegex = /^BATCH-.*$/
    if (!batchNumberRegex.test(batch.batchNumber)) {
      errors.push('Batch number should start with "BATCH-"')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Format batch number for display
 */
export function formatBatchNumber(batchNumber: string): string {
  if (!batchNumber) return 'N/A'
  
  // If it's already formatted, return as is
  if (batchNumber.startsWith('BATCH-')) {
    return batchNumber
  }
  
  // Otherwise, add BATCH- prefix
  return `BATCH-${batchNumber}`
}

/**
 * Calculate quantity utilization percentage
 */
export function calculateUtilizationPercentage(
  availableQuantity: number,
  batchQuantity: number
): number {
  if (batchQuantity <= 0) return 0
  return Math.round((availableQuantity / batchQuantity) * 100)
}

/**
 * Get batch status color based on utilization and expiry
 */
export function getBatchStatusColor(
  expireDate: string | Date,
  utilizationPercentage: number,
  isActive: boolean = true
): string {
  if (!isActive) return 'text-gray-500'
  
  const expiryStatus = getBatchExpiryStatus(expireDate)
  
  // If expired or expiring soon, prioritize expiry status
  if (expiryStatus.status === 'expired') return 'text-red-600'
  if (expiryStatus.status === 'expiring_soon') return 'text-red-500'
  
  // Otherwise, base on utilization
  if (utilizationPercentage <= 10) return 'text-red-400'
  if (utilizationPercentage <= 30) return 'text-orange-500'
  if (utilizationPercentage <= 70) return 'text-yellow-600'
  
  return 'text-green-600'
}

/**
 * Filter batches by various criteria
 */
export interface BatchFilterOptions {
  isActive?: boolean
  expiredOnly?: boolean
  expiringSoon?: boolean
  warningDays?: number
  storeIds?: number[]
  locationIds?: number[]
  itemIds?: number[]
  dateRange?: {
    start: Date | string
    end: Date | string
  }
}

export function filterBatches<T extends {
  isActive: boolean
  expireDate: string
  batchDate: string
  storeId: number
  locationId: number
  BatchItems?: Array<{ itemId: number }>
}>(batches: T[], options: BatchFilterOptions): T[] {
  return batches.filter(batch => {
    // Active status filter
    if (options.isActive !== undefined && batch.isActive !== options.isActive) {
      return false
    }
    
    // Expiry filters
    if (options.expiredOnly || options.expiringSoon) {
      const expiryStatus = getBatchExpiryStatus(batch.expireDate, options.warningDays)
      
      if (options.expiredOnly && expiryStatus.status !== 'expired') {
        return false
      }
      
      if (options.expiringSoon && !['expired', 'expiring_soon'].includes(expiryStatus.status)) {
        return false
      }
    }
    
    // Store filter
    if (options.storeIds?.length && !options.storeIds.includes(batch.storeId)) {
      return false
    }
    
    // Location filter
    if (options.locationIds?.length && !options.locationIds.includes(batch.locationId)) {
      return false
    }
    
    // Item filter (check if batch contains any of the specified items)
    if (options.itemIds?.length && batch.BatchItems) {
      const hasItems = batch.BatchItems.some(item => 
        options.itemIds!.includes(item.itemId)
      )
      if (!hasItems) return false
    }
    
    // Date range filter
    if (options.dateRange) {
      const batchDate = new Date(batch.batchDate)
      const startDate = new Date(options.dateRange.start)
      const endDate = new Date(options.dateRange.end)
      
      if (batchDate < startDate || batchDate > endDate) {
        return false
      }
    }
    
    return true
  })
}