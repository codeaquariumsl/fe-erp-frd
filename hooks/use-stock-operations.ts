import { useState } from 'react'
import { stockApi, stockAdjustmentApi, stockReconciliationApi, StockTransferData } from '../lib/api'

interface StockDetails {
  storeId: string
  storeName: string
  quantity: number
  weight: number
  avgPurchasePrice: number
  totalValue: number
  lastUpdated: string
}

export const useStockOperations = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const transferStock = async (data: StockTransferData) => {
    setLoading(true)
    setError(null)

    try {
      const result = await stockApi.transfer(data)
      return { success: true, data: result }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getStockByItem = async (itemId: number) => {
    setLoading(true)
    setError(null)

    try {
      const result = await stockApi.getByItem(itemId)
      return { success: true, data: result }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getStockByStore = async (storeId: number) => {
    setLoading(true)
    setError(null)

    try {
      const result = await stockApi.getByStore(storeId)
      return { success: true, data: result }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getStockDetails = async (itemId: number, storeId?: number) => {
    setLoading(true)
    setError(null)

    try {
      const result = await stockApi.getDetails(itemId, storeId)
      return { success: true, data: result }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getAllStock = async (filters?: { itemId?: number; storeId?: number; locationId?: number }) => {
    setLoading(true)
    setError(null)

    try {
      const result = await stockApi.getAll(filters)
      return { success: true, data: result }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    transferStock,
    getStockByItem,
    getStockByStore,
    getStockDetails,
    getAllStock,
    stockAdjustment: stockAdjustmentApi,
    stockReconciliation: stockReconciliationApi
  }
}
