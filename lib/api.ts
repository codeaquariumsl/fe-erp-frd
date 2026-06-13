import type { ReactNode } from "react"

export const driversApi = crud("drivers")
export const palletsApi = crud("pallets")
export const palletRacksApi = crud("pallet-racks")

export interface Cheque {
  id: number
  chequeNo: string
  chequeDate: string
  amount: number
  bankName: string
  customerName: string
  invoices: string
}

export interface CancelChequeRequest {
  id: number
  cancelDate: string
  cancelReason: string
}

export interface CancelChequeResponse {
  message: string
  referenceNo: string
  chequeNo: string
  cancelledAmount: number
}

export interface ReturnChequeRequest {
  receiptId: number
  returnDate: string
  reason: string
  bankCharge?: number
  penalty?: number
}

export interface ReturnChequeResponse {
  referenceNo: string
  customer: string
  chequeNo: string
  bank: string
  amount: number
  charges: number
  invoices: string[]
}

export const chequesApi = {
  async getInHand(): Promise<Cheque[]> {
    return apiRequest<Cheque[]>("/cheques/in-hand")
  },
  async cancel(data: CancelChequeRequest): Promise<CancelChequeResponse> {
    return apiRequest<CancelChequeResponse>("/cheques/cancel", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async getDeposited(): Promise<(Cheque & { depositDate?: string })[]> {
    return apiRequest<(Cheque & { depositDate?: string })[]>("/cheques/deposited")
  },
  async getForSettlement(customerId: number | string): Promise<any[]> {
    return apiRequest<any[]>(`/cheques/for-settlement/${customerId}`)
  },
  async returnCheque(data: ReturnChequeRequest): Promise<ReturnChequeResponse> {
    return apiRequest<ReturnChequeResponse>("/cheques/return", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }
}

function transformColdRoom(backendRoom: any): ColdRoom {
  return {
    id: backendRoom.id,
    name: backendRoom.name,
    status: backendRoom.status,
    storeId: backendRoom.storeId,
    temperature: backendRoom.temperature,
    targetTemp: backendRoom.targetTemp,
    humidity: backendRoom.humidity,
    targetHumidity: backendRoom.targetHumidity,
    occupied: backendRoom.occupied,
    capacity: backendRoom.capacity,
    lastMaintenance: backendRoom.lastMaintenance || "-",
    nextMaintenance: backendRoom.nextMaintenance || "-",
    Store: backendRoom.Store || { id: 0, name: "Unknown Store" }, items: (backendRoom.ColdRoomItems || []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
    })),
    availableRacks: backendRoom.availableRacks || 0,
    availablePallets: backendRoom.availablePallets || 0,
    createdAt: backendRoom.createdAt,
    updatedAt: backendRoom.updatedAt,
    createdByUsername: backendRoom.createdByUsername || "System",
    updatedByUsername: backendRoom.updatedByUsername || "System",
  }
}
// Cold Room APIs
export const coldRoomsApi = {
  ...crud("cold-rooms"),
  async getAll(): Promise<ColdRoom[]> {
    const response = await apiRequest<any[]>(`/cold-rooms`)
    return response.map(transformColdRoom)
  },
  async getById(id: number | string): Promise<ColdRoom> {
    const response = await apiRequest<any>(`/cold-rooms/${id}`)
    return transformColdRoom(response)
  },
}
export const coldRoomLogsApi = crud("cold-rooms/logs")
/**
 * Central API helper used across the ERP front-end.
 *
 * Features:
 * • Automatically detects JSON vs. raw-text responses
 * • Uses /api/proxy/* so the browser never calls the real backend directly
 * • Adds the "Authorization: Bearer <token>" header when a token exists
 * • Throws with the server-supplied message (if any) on non-2xx responses
 * • Automatically detects unauthorized responses and redirects to login
 * • Handles various unauthorized response formats (401, 403, "Unauthorized" message)
 * • Shows user-friendly notifications when session expires
 * • Clears all authentication data on unauthorized access
 */

const API_BASE = "/api/proxy"

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

/**
 * Helper function to get the current selected location ID from localStorage
 * Returns null if no location is selected or if running on server side
 */
function getCurrentLocationId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("selectedLocationId")
}

/**
 * Helper function to add location ID to URL query parameters
 */
function addLocationToUrl(endpoint: string): string {
  const locationId = getCurrentLocationId()
  if (!locationId) return endpoint

  const separator = endpoint.includes('?') ? '&' : '?'
  return `${endpoint}${separator}locationId=${locationId}`
}

/**
 * Utility function to make API requests without location context
 * Useful for global data that shouldn't be filtered by location
 */
export async function apiRequestWithoutLocation<T = unknown>(endpoint: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(endpoint, { ...init, skipLocation: true })
}

/**
 * Utility function to make API requests with explicit location ID
 * Useful when you need to query data for a specific location different from current selection
 */
export async function apiRequestWithLocation<T = unknown>(endpoint: string, locationId: string, init: RequestInit = {}): Promise<T> {
  const separator = endpoint.includes('?') ? '&' : '?'
  const endpointWithLocation = `${endpoint}${separator}locationId=${locationId}`

  let body = init.body
  if (init.method && !["GET", "HEAD"].includes(init.method)) {
    const existingBody = init.body ? JSON.parse(init.body as string) : {}
    body = JSON.stringify({
      ...existingBody,
      locationId,
    })
  }

  return apiRequest<T>(endpointWithLocation, { ...init, body, skipLocation: true })
}

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface DashboardMainDetails {
  summary: {
    totalInventoryValue: { value: number; trend: number }
    monthlySales: { value: number; trend: number }
    activeCustomers: { value: number; trend: number }
    totalOrders: { value: number; pending: number }
    lowStockItems: { value: number; status: string }
    profitMargin?: { value: number; trend: number }
  }
  salesTrend: Array<{ month: string; sales: number }>
  deliveryOrderStatus: Array<{ status: string; count: number }>
  topInventoryItems: any[]
  recentOrders: any[]
  lowStockItems: any[]
}

export interface User {
  id: number
  username: string
  email: string
  fullName?: string
  mobile?: string
  status: string
  roleId: number
  createdAt: string
  updatedAt: string
  Role?: {
    id: number
    name: string
    description: string
  }
}

export interface Role {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface Permission {
  id: string
  name: string
  description: string
  module: string
  action: string
}

export interface RolePermission {
  id: number
  roleId: number
  permissionId: string
  createdAt: string
}

export interface Category {
  id: number
  name: string
  code: string
  superCategoryId: number | null
  isActive: boolean
  image?: string
  createdAt: string
  updatedAt: string
  createdByUsername: string
  updatedByUsername: string
}

export interface Driver {
  id: number;
  name: string;
  mobile: string;
  username: string;
  email: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Location {
  id: number
  name: string
  code: string
  address: string
  city: string
  state: string
  country: string
  postalCode: string
  contactPerson: string
  contactNumber: string
  email: string
  taxNumber: string
  taxRate: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdByUsername: string
  updatedByUsername: string
}

export interface Store {
  id: number
  name: string
  capacity: number
  locationId: number
  createdAt: string
  updatedAt: string
  createdByUsername: string
  updatedByUsername: string
}

export interface Vehicle {
  id: number
  vehicleNumber: string
  vehicleType: string
  capacityKg: number
  driverName: string
  contactNumber: string
  status: string
  routeIds: number[]
  createdAt: string
  updatedAt: string
}

export interface Item {
  id: number
  sku: string
  barcode?: string
  name: string
  categoryId: number
  temperature?: string | null
  unit: string
  country?: string | null
  color?: string | null
  weight?: string | null
  locationId: number
  boxCount?: number | null
  qty?: number | null
  sellingPrice: number
  reorderLevelQty: number
  reorderDateRange?: string | null
  overstockLevelQty?: number | null
  overstockDateRange?: string | null
  itemsPerBox: number
  leadTimeDays: number
  image?: string
  doNotAllowDirectSale: boolean
  allowsMinus: boolean
  isProductionRawMaterial: boolean
  isTaxInclusive: boolean
  status: string
  createdAt: string
  createdBy: number
  updatedAt: string
  updatedBy: number
  Category?: {
    id: number
    name: string
    code: string
    superCategoryId?: number | null
    isActive: boolean
    image?: string
    createdAt: string
    createdBy: number
    updatedAt: string
    updatedBy: number
  }
}

/* Pagination Types */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface ItemPrice {
  id: number;
  type?: string;
  customerId?: number;
  itemId: number;
  price: number;
  status?: string;
  effectiveDate?: string;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
  Item: Item;
  Customer?: {
    id: number;
    name: string;
    type: string;
    parentId: number | null;
    address: string;
    contactPerson: string;
    contactNumber: string;
    email: string;
    createdAt: string;
    createdBy: number;
    updatedAt: string;
    updatedBy: number;
    deliveryTime: number;
    status: string;
  };
}

export interface ItemPriceDetail {
  id: number;
  item: Item;
  price: number;
  effectiveDate: string;
  status: string;
}

export interface CustomerWisePriceResponse {
  message: string;
  customerId: string;
  groupedPrices: Array<{
    customer: {
      id: number;
      name: string;
      type: string;
      parentId: number | null;
      address: string;
      contactPerson: string;
      contactNumber: string;
      email: string;
      createdAt: string;
      createdBy: number;
      updatedAt: string;
      updatedBy: number;
      deliveryTime: number;
      status: string;
    };
    itemPrices: ItemPriceDetail[];
  }>;
  prices: ItemPrice[];
  totalPrices: number;
  fromParent: boolean;
}

// Interface for Items with Scheduled GRN information
export interface ItemWithSchedule {
  id: number;
  name: string;
  categoryId: number;
  temperature: number;
  unit: string;
  country: string;
  color: string;
  weight: number;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  Category: {
    id: number;
    name: string;
    code: string;
    image?: string | null;
  };
  scheduledGrnId: number;
  scheduledGrn: {
    id: number;
    grnNumber: string;
  };
  grnItemList: Array<{
    id: number;
    grnId: number;
    itemId: number;
    grnQty: number;
    availableQty: number;
    weight: number;
    palletRackId: number | null;
    PalletRack: {
      id: number;
      code: string;
      availableQty: number;
      weight: number;
      location: number;
    } | null;
    grn: {
      id: number;
      grnNumber: string;
      grnDate: string;
      status: string;
    };
  }>;
}

// Types for Cold Room and Cold Room Logs

export interface ColdRoomItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface ColdRoom {
  Store: Store;
  id: number;
  name: string;
  status: 'Optimal' | 'Warning' | 'Critical' | string;
  storeId: number;
  temperature: number;
  targetTemp: number;
  humidity: number;
  targetHumidity: number;
  occupied: number;
  capacity: number;
  lastMaintenance: string;
  nextMaintenance: string;
  items: ColdRoomItem[];
  availableRacks: number;
  availablePallets: number;
  createdAt: string;
  updatedAt: string;
  createdByUsername: string;
  updatedByUsername: string;
}

export interface ColdRoomLog {
  id: number;
  timestamp: string;
  coldRoomId: number;
  coldRoomName: string;
  temperature: number;
  humidity: number;
  status: 'Optimal' | 'Warning' | 'Critical' | string;
}

export interface StockAdjustmentItem {
  id?: number
  adjustmentId?: number // Changed from stockAdjustmentId
  itemId: number
  batchId?: number
  systemQty: number | string // Added string to handle API numbers
  adjustedQty: number | string
  newQty: number | string
  remark?: string
  Item?: Item
  Batch?: any
}

export interface StockAdjustment {
  id?: number
  adjustmentNumber: string
  locationId: number
  storeId: number
  adjustmentDate: string
  reason: string
  notes?: string
  status: 'Draft' | 'Approved' | 'Cancelled' | 'Pending' | string
  approvedBy?: number
  approvedDate?: string
  createdAt?: string
  createdBy?: number
  updatedAt?: string
  updatedBy?: number
  items?: StockAdjustmentItem[] // Keep both for safety
  Items?: StockAdjustmentItem[] // Backend returns Items
  Store?: any
  Location?: any
  ApprovedByUser?: { id: number; fullName: string }
  createdUserName?: string
  updatedUserName?: string
  approvedUserName?: string
  Creator?: { id: number; fullName: string }
}

export interface StockReconciliationItem {
  id?: number
  reconciliationId?: number
  itemId: number
  batchId?: number
  systemQty: number | string
  physicalQty: number | string
  adjustedQty?: number | string
  remark?: string
  Item?: Item
  Batch?: any
}

export interface StockReconciliation {
  id?: number
  reconciliationNumber: string
  locationId: number
  storeId: number
  reconciliationDate: string
  notes?: string
  status: 'Pending' | 'Approved' | 'Rejected' | string
  approvedBy?: number
  approvedDate?: string
  createdAt?: string
  createdBy?: number
  updatedAt?: string
  updatedBy?: number
  Items?: StockReconciliationItem[]
  Store?: Store
  Location?: Location
  createdUserName?: string
  updatedUserName?: string
  approvedUserName?: string
}


export interface Supplier {
  id: number
  name: string
  type: string
  ledgerType: string
  contactPerson: string
  phone: string
  email: string
  address: string
  country: string
  status: string
  createdAt: string
  updatedAt: string
}


export interface CustomerReturnItem {
  id?: number
  customerReturnId?: number
  itemId: number
  batchId?: number
  quantity: number
  unitPrice: number
  totalPrice: number
  unitId?: number
  condition: 'Damaged' | 'Expired' | 'Good' | 'Poor' | 'Defective'
  expiryDate?: string
  serialNumbers?: string
  reason?: string
  disposition: 'Refund' | 'Replace' | 'Credit Note' | 'Dispose' | 'Restock'
  isRefundable: boolean
  refundAmount?: number
  coldRoomId?: number
  palletRackId?: number
  notes?: string
  item?: Item
  discount?: number
  taxAmount?: number
  excludingTaxAmount?: number
}

export interface CustomerReturn {
  id?: number
  returnNumber: string
  customerId: number
  salesOrderId?: number
  invoiceId?: number
  deliveryOrderId?: number
  returnDate: string
  returnTypeId: number
  reason?: string
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled' | 'Approved' | 'Rejected'
  totalAmount: number
  currency: string
  refundAmount?: number
  utilizedAmount?: number
  subTotal?: number
  taxAmount?: number
  taxRate?: number
  discountAmount?: number
  isTaxReturn?: boolean
  refundStatus: 'Pending' | 'Processed' | 'Completed' | 'Not Applicable'
  approvedBy?: number
  approvedDate?: string
  notes?: string
  locationId: number
  storeId?: number
  createdAt?: string
  createdBy?: number
  updatedAt?: string
  updatedBy?: number
  customer?: Customer
  returnType?: ReturnType
  items?: CustomerReturnItem[]
}

export interface InvoiceRemainingQtyItem {
  itemId: number
  itemName: string
  itemSku: string
  originalQty: number
  returnedQty: number
  remainingQty: number
  price: number
  discount: number
}

export interface InvoiceRemainingQtyResponse {
  invoiceId: number
  items: InvoiceRemainingQtyItem[]
}


export interface CategoryDiscount {
  id: number
  customerId: number
  categoryId: number
  discountPercentage: number
  Category?: {
    id: number
    name: string
    code: string
  }
}

export interface Customer {
  id: number
  name: string
  type: string
  parentId: number | null
  address: string
  contactPerson: string
  contactNumber: string
  email: string
  isTaxInclusive: boolean
  taxNumber: string
  deliveryTime: number
  username?: string
  discountRate: number
  creditPeriod: number
  status: string
  createdAt: string
  updatedAt: string
  CategoryDiscounts?: CategoryDiscount[]
}

// Credit Note Types
export interface CreditNoteItem {
  id?: number
  creditNoteId?: number
  itemId: number
  invoiceItemId?: number
  customerReturnItemId?: number
  code?: string
  qty: number
  unitPrice: number
  discount: number
  discountedAmount?: number
  isTaxItem: boolean
  taxAmount?: number
  total?: number
  reason?: string
  createdAt?: string
  updatedAt?: string
  Item?: Item
}

export interface CreditNote {
  id?: number
  creditNoteNumber: string
  customerId: number
  invoiceId?: number
  customerReturnId?: number
  creditNoteDate: string
  reason?: string
  isTaxCreditNote: boolean
  taxRate: number
  taxAmount?: number
  subtotal?: number
  total: number
  appliedAmount: number
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Applied' | 'Cancelled'
  notes?: string
  locationId: number
  approvedBy?: number
  approvedDate?: string
  rejectionReason?: string
  createdAt?: string
  createdBy?: number
  updatedAt?: string
  updatedBy?: number
  Customer?: Customer
  Invoice?: any
  CustomerReturn?: CustomerReturn
  CreditNoteItems?: CreditNoteItem[]
  items?: CreditNoteItem[]
}

export interface CreateCreditNoteRequest {
  customerId: number
  invoiceId?: number
  customerReturnId?: number
  creditNoteDate: string
  reason?: string
  isTaxCreditNote: boolean
  taxRate: number
  notes?: string
  locationId: number
  items: Omit<CreditNoteItem, 'id' | 'creditNoteId' | 'createdAt' | 'updatedAt'>[]
}

export interface UpdateCreditNoteRequest {
  reason?: string
  notes?: string
  items?: Omit<CreditNoteItem, 'id' | 'creditNoteId' | 'createdAt' | 'updatedAt'>[]
}

export interface ApplyCreditNoteRequest {
  invoiceId: number
  amount: number
}

export interface CustomerAvailableCredit {
  customerId: number
  totalAvailableCredit: number
  creditNotes: Array<{
    id: number
    creditNoteNumber: string
    creditNoteDate: string
    total: number
    appliedAmount: number
    availableAmount: number
  }>
}

// Backend response structure for Purchase Order Items
export interface PurchaseOrderItemResponse {
  id: number
  purchaseOrderId: number
  itemId: number
  quantity: number
  unitPrice: number
  totalPrice: number
  createdAt: string
  updatedAt: string
  Item: Item
}

// Frontend structure for creating/updating Purchase Order Items
export interface PurchaseOrderItem {
  itemId: number
  quantity: number
  unitPrice: number
  totalPrice: number
  item?: Item
}

// Backend response structure for Purchase Orders
export interface PurchaseOrderResponse {
  id: number
  orderNumber: string
  supplierId: number
  orderDate: string
  deliveryDate: string
  status: "Pending" | "Approved" | "Received" | "Cancelled"
  currency?: "LKR" | "USD"
  totalAmount: number
  createdAt: string
  updatedAt: string
  Supplier: Supplier
  PurchaseOrderItems: PurchaseOrderItemResponse[]
}

// Frontend structure for Purchase Orders (normalized)
export interface PurchaseOrder {
  id?: number
  orderNumber: string
  supplierId: number
  orderDate: string
  deliveryDate: string
  status: "Pending" | "Approved" | "Received" | "Cancelled"
  currency?: "LKR" | "USD"
  totalAmount: number
  items: PurchaseOrderItem[]
  supplier?: Supplier
  createdAt?: string
  updatedAt?: string
}

export interface CreatePurchaseOrderRequest {
  orderNumber: string
  supplierId: number
  orderDate: string
  deliveryDate: String
  status: string
  currency?: string
  totalAmount: number
  items: PurchaseOrderItem[]
}

export interface CreateDOSummaryResponse {
  success: string
  message: string
  code: string
}

export interface UpdatePurchaseOrderRequest {
  orderNumber: string
  supplierId: number
  orderDate: string
  deliveryDate: string
  status: string
  currency?: string
  totalAmount: number
  items: PurchaseOrderItem[]
}

// GRN Types based on the API collection
export interface GRNItem {
  rackCode: string
  coldRoomName: string
  palletRackId: number
  coldRoomId: number
  remarks: string
  damageReason: string
  rejectedQty: number
  grnItemId?: number // for QC and unique identification (from backend GRNItemResponse.id)
  itemId: number
  grnQty: number
  availableQty: number
  weight: number
  costPrice: number
  expireDate: string
  item?: Item
  unit?: string // Unit of measurement for the item
}

export interface GRNItemResponse {
  rejectedQty: any
  remarks: any
  damageReason: any
  rackCode: any
  palletRackId: any
  coldRoomName: any
  coldRoomId: any
  id: number
  grnId: number
  itemId: number
  grnQty: number
  availableQty: number
  weight: number
  costPrice: number
  expireDate: string
  createdAt: string
  updatedAt: string
  Item: Item
}

export interface GRNResponse {
  remarks: string
  updatedUserName: string | undefined
  approvedAt: string | undefined
  approvedUserName: string | undefined
  qcCheckedAt: string | undefined
  qcCheckedUserName: string | undefined
  id: number
  grnNumber: string
  PurchaseOrder: any
  supplierId: number
  storeId: number
  grnDate: string
  status: "Pending" | "Approved" | "Rejected"
  createdAt: string
  updatedAt: string
  Supplier: Supplier
  Store: Store
  GRNItems: GRNItemResponse[]
}

export interface GRN {
  remarks: string
  PurchaseOrder: any
  qcCheckedUserName?: string
  qcCheckedAt?: string
  approvedUserName?: string
  approvedAt?: string
  updatedUserName?: string
  createdUserName?: string
  id?: number
  grnNumber: string
  supplierId: number
  storeId: number
  grnDate: string
  status: "Pending" | "Approved" | "Rejected" | "QC Checked" | "QC Failed"
  items: GRNItem[]
  supplier?: Supplier
  store?: Store
  createdAt?: string
  updatedAt?: string
  totalAmount?: number // Calculated field from items
}

export interface CreateGRNRequest {
  grnNumber: string
  supplierId: number
  storeId: number
  grnDate: string
  totalAmount: number
  items: GRNItem[]
}

export interface UpdateGRNRequest {
  grnNumber: string
  supplierId: number
  storeId: number
  grnDate: string
  items: GRNItem[]
}

export interface ApproveRejectGRNRequest {
  status: "Approved" | "Rejected"
}

/* -------------------------------------------------------------------------- */
/*                               HELPER UTILS                                 */
/* -------------------------------------------------------------------------- */

/** Parse the body according to the Content-Type header. */
async function safeParse<T = unknown>(res: Response): Promise<T> {
  const type = res.headers.get("content-type") || ""
  const text = await res.text()

  if (type.includes("application/json")) {
    return JSON.parse(text) as T
  }

  // Sometimes the backend sends `"token"` (a quoted string) with
  // header text/plain; try to JSON.parse it anyway.
  try {
    return JSON.parse(text) as T
  } catch {
    // @ts-expect-error – caller might expect a string
    return text
  }
}

/** 
 * Helper function to handle unauthorized responses and redirect to login
 */
function handleUnauthorizedResponse(response: Response, parsed: any): void {
  const isUnauthorized = (
    // Check for 401 status code
    // response.status === 401 ||
    // Check for 403 Forbidden status (also requires re-authentication)
    response.status === 403 ||
    // Check for "Unauthorized" message in response body (case-insensitive)
    (() => {
      const message = typeof parsed === "string"
        ? parsed
        : (parsed as { message?: string; error?: string })?.message ||
        (parsed as { message?: string; error?: string })?.error

      return message && message.toLowerCase().includes("unauthorized")
    })() ||
    // Check for specific unauthorized response format
    (parsed && typeof parsed === "object" && "message" in parsed && parsed.message === "Unauthorized")
  )

  if (isUnauthorized) {
    console.log("🚫 Unauthorized response detected:", {
      status: response.status,
      url: response.url,
      responseData: parsed,
      timestamp: new Date().toISOString()
    })

    handleUnauthorizedAccess()
  }
}

/** 
 * Helper function to handle unauthorized access - clears auth data and redirects to login
 */
function handleUnauthorizedAccess(): void {
  if (typeof window === "undefined") return

  console.log("🔒 Unauthorized access detected. Redirecting to login page...")

  // Show user-friendly notification
  try {
    // Dynamic import to avoid circular dependencies and ensure it works in all contexts
    import("./toastr").then(({ toastr }) => {
      toastr.warning("Your session has expired. Please login again.", {
        title: "Session Expired",
        duration: 4000
      })
    }).catch(() => {
      // Fallback to console if toastr fails to load
      console.warn("Session expired. Please login again.")
    })
  } catch (error) {
    console.warn("Session expired. Please login again.")
  }

  // Clear all authentication and session data
  localStorage.removeItem("auth_token")
  localStorage.removeItem("user_data")
  localStorage.removeItem("user_permissions")
  localStorage.removeItem("customer_data")
  localStorage.removeItem("selected_child_customer")
  localStorage.removeItem("selectedLocationId")

  // Get current path to redirect back after login
  const currentPath = window.location.pathname + window.location.search
  const isAlreadyOnLogin = currentPath === "/" || currentPath.includes("/auth/login") || currentPath.includes("/login")

  if (!isAlreadyOnLogin) {
    // Store current path for redirect after successful login
    localStorage.setItem("redirect_after_login", currentPath)

    // Add a small delay to ensure localStorage is updated and toast is shown before redirect
    setTimeout(() => {
      // Use window.location.replace to prevent back button issues
      // Changed from /auth/login to / as there is no /auth/login page, 
      // and the root page handles login via ProtectedRoute
      window.location.replace("/")
    }, 1500) // Increased delay to show the toast
  }
}

/** 
 * Wrapper around fetch that handles auth header, location context, parsing & errors
 * 
 * Automatically includes:
 * - Authorization header with auth token (if available)
 * - Current location ID in query params for GET requests
 * - Current location ID in request body for POST/PUT/DELETE requests
 * - User context in request body for non-GET requests
 * - Automatic unauthorized response detection and login redirect
 * 
 * Options:
 * - skipAuth: Skip adding authorization header
 * - skipLocation: Skip adding location context to the request
 */
async function apiRequest<T = unknown>(endpoint: string, init: RequestInit & { skipAuth?: boolean; skipLocation?: boolean } = {}): Promise<T> {
  const token = typeof window !== "undefined" && !init.skipAuth ? localStorage.getItem("auth_token") : null

  // Get user data from localStorage if available
  const userData = typeof window !== "undefined" ? localStorage.getItem("user_data") : null
  const user = userData ? JSON.parse(userData) : null

  // Get current location ID
  const locationId = !init.skipLocation ? getCurrentLocationId() : null

  // Add location ID to endpoint for GET requests
  let finalEndpoint = endpoint
  if (locationId && (!init.method || ["GET", "HEAD"].includes(init.method))) {
    finalEndpoint = addLocationToUrl(endpoint)
  }

  // Prepare request body with user ID and location ID for non-GET requests
  let body = init.body
  if (init.method && !["GET", "HEAD"].includes(init.method)) {
    const existingBody = init.body ? JSON.parse(init.body as string) : {}
    const bodyData: any = { ...existingBody }

    // Add user context if available
    if (user) {
      bodyData.user = { id: user.id }
    }

    // Add location context if available and not skipped
    if (locationId) {
      bodyData.locationId = locationId
    }

    body = JSON.stringify(bodyData)
  }

  const res = await fetch(`${API_BASE}${finalEndpoint}`, {
    headers: {
      "Content-Type": init.body || body ? "application/json" : undefined,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    } as HeadersInit,
    ...init,
    body,
  })

  const parsed = await safeParse<T>(res)

  // Check for unauthorized responses and handle redirect
  if (!res.ok) {
    handleUnauthorizedResponse(res, parsed)

    const message =
      typeof parsed === "string"
        ? parsed
        : (parsed as { message?: string; error?: string })?.message ||
        (parsed as { message?: string; error?: string })?.error ||
        `Request failed (${res.status})`
    throw new Error(message)
  }

  // Also check for successful responses that might contain unauthorized messages
  // (some APIs might return 200 OK with unauthorized content)
  if (res.ok && parsed && typeof parsed === "object") {
    // Check message field
    if ("message" in parsed) {
      const message = (parsed as { message?: string }).message
      if (message === "Unauthorized" || (message && message.toLowerCase().includes("unauthorized"))) {
        handleUnauthorizedResponse(res, parsed)
        throw new Error("Session expired. Please login again.")
      }
    }

    // Check error field  
    if ("error" in parsed) {
      const error = (parsed as { error?: string }).error
      if (error === "Unauthorized" || (error && error.toLowerCase().includes("unauthorized"))) {
        handleUnauthorizedResponse(res, parsed)
        throw new Error("Session expired. Please login again.")
      }
    }

    // Check success field for wrapped responses that indicate auth failure
    if ("success" in parsed && (parsed as { success?: boolean }).success === false) {
      const message = (parsed as { message?: string }).message
      if (message === "Unauthorized" || (message && message.toLowerCase().includes("unauthorized"))) {
        handleUnauthorizedResponse(res, parsed)
        throw new Error("Session expired. Please login again.")
      }
    }
  }

  return parsed
}

/** Transform backend Purchase Order response to frontend format */
function transformPurchaseOrder(backendOrder: PurchaseOrderResponse): PurchaseOrder {
  return {
    id: backendOrder.id,
    orderNumber: backendOrder.orderNumber,
    supplierId: backendOrder.supplierId,
    orderDate: backendOrder.orderDate,
    deliveryDate: backendOrder.deliveryDate || "", // Ensure deliveryDate is included
    status: backendOrder.status,
    currency: backendOrder.currency as "LKR" | "USD" || "LKR",
    totalAmount: backendOrder.totalAmount,
    supplier: backendOrder.Supplier,
    items: backendOrder.PurchaseOrderItems?.map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      item: item.Item,
    })),
    createdAt: backendOrder.createdAt,
    updatedAt: backendOrder.updatedAt,
  }
}

/** Transform backend GRN response to frontend format */
function transformGRN(backendGRN: GRNResponse): GRN {
  return {
    id: backendGRN.id,
    grnNumber: backendGRN.grnNumber,
    PurchaseOrder: backendGRN.PurchaseOrder,
    supplierId: backendGRN.supplierId,
    storeId: backendGRN.storeId,
    grnDate: backendGRN.grnDate,
    status: backendGRN.status,
    supplier: backendGRN.Supplier,
    store: backendGRN.Store,
    remarks: backendGRN.remarks,
    items: backendGRN.GRNItems.map((item) => ({
      grnItemId: item.id, // for QC and unique identification
      itemId: item.itemId,
      grnQty: item.grnQty,
      availableQty: item.availableQty,
      weight: item.weight,
      costPrice: item.costPrice,
      expireDate: item.expireDate,
      coldRoomId: item.coldRoomId,
      coldRoomName: item.coldRoomName,
      palletRackId: item.palletRackId,
      rackCode: item.rackCode,
      damageReason: item.damageReason,
      remarks: item.remarks,
      rejectedQty: item.rejectedQty,
      item: item.Item,
    })),
    createdAt: backendGRN.createdAt,
    updatedAt: backendGRN.updatedAt,
    qcCheckedUserName: backendGRN.qcCheckedUserName,
    qcCheckedAt: backendGRN.qcCheckedAt,
    approvedUserName: backendGRN.approvedUserName,
    approvedAt: backendGRN.approvedAt,
    updatedUserName: backendGRN.updatedUserName,
    createdUserName: backendGRN.updatedUserName,
  }
}

// Transform backend sales order response to frontend format
function transformSalesOrder(backendOrder: any): SalesOrder {
  return {
    id: backendOrder.id,
    orderNumber: backendOrder.orderNumber,
    isDelivery: backendOrder.isDelivery,
    idSalesPerson: backendOrder.idSalesPerson ?? 0,
    SalesPerson: backendOrder.SalesPerson ?? null,
    customerId: backendOrder.customerId,
    routeId: backendOrder.routeId ?? 0,
    customerName: backendOrder.Customer?.name ?? "",
    customerType: backendOrder.Customer?.type ?? "",
    customerIsTaxInclusive: backendOrder.Customer?.isTaxInclusive ?? false,
    customerTaxNumber: backendOrder.Customer?.taxNumber ?? "",
    contactNumber: backendOrder.Customer?.contactNumber ?? "",
    orderDate: backendOrder.orderDate,
    dispatchDate: backendOrder.dispatchDate,
    timeSlot: backendOrder.timeslot,
    deliveryDate: backendOrder.deliveryDate ?? "",
    items: (backendOrder.SalesOrderItems || []).map((item: any) => ({
      itemId: item.itemId,
      code: item.code,
      qty: item.qty,
      price: item.price,
      item: item.Item,
      discount: item.discount,
      isTaxItem: item.isTaxItem,
      taxAmount: item.taxAmount,
      customerItemCode: item.customerItemCode
    })),
    totalWeight: backendOrder.totalWeight ?? 0,
    isTaxInvoice: backendOrder.isTaxInvoice ?? false,
    taxRate: backendOrder.taxRate ?? 0,
    taxAmount: backendOrder.taxAmount ?? 0,
    totalAmount: backendOrder.totalAmount ?? 0,
    status: backendOrder.status,
    deliveryOrderStatus: backendOrder.deliveryOrderStatus ?? "Pending",
    paymentStatus: backendOrder.paymentStatus ?? "",
    deliveryAddress: backendOrder.Customer?.address ?? "",
    poNumber: backendOrder.poNumber ?? "",
    createdAt: backendOrder.createdAt,
    createdUserName: backendOrder.createdUserName,
    updatedAt: backendOrder.updatedAt,
  }
}

export const authApi = {
  /** POST /auth/login – returns new API response format with permissions */
  async login(username: string, password: string): Promise<{
    success: boolean;
    message: string;
    data: {
      token: string;
      user: User & {
        Role?: {
          id: number;
          name: string;
          description: string;
          permissions: Permission[];
        };
      };
      permissions: string[];
      customer?: {
        id: number;
        name: string;
        type: string;
        parentId: number | null;
        address: string;
        contactPerson: string;
        contactNumber: string;
        email: string;
        deliveryTime: number;
        status: string;
        createdAt: string;
        updatedAt: string;
        childCustomers?: Array<{
          id: number;
          name: string;
          type: string;
          parentId: number | null;
          address: string;
          contactPerson: string;
          contactNumber: string;
          email: string;
          deliveryTime: number;
          status: string;
          createdAt: string;
          updatedAt: string;
        }>;
      };
    };
  }> {
    const result = await apiRequest<{
      success: boolean;
      message: string;
      data: {
        token: string;
        user: User & {
          Role?: {
            id: number;
            name: string;
            description: string;
            permissions: Permission[];
          };
        };
        permissions: string[];
        customer?: {
          id: number;
          name: string;
          type: string;
          parentId: number | null;
          address: string;
          contactPerson: string;
          contactNumber: string;
          email: string;
          deliveryTime: number;
          status: string;
          createdAt: string;
          updatedAt: string;
          childCustomers?: Array<{
            id: number;
            name: string;
            type: string;
            parentId: number | null;
            address: string;
            contactPerson: string;
            contactNumber: string;
            email: string;
            deliveryTime: number;
            status: string;
            createdAt: string;
            updatedAt: string;
          }>;
        };
      };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      skipAuth: true,
      skipLocation: true,
    })

    return result
  },

  /** Validate token and get current user */
  async validateToken(token: string): Promise<User> {
    const response = await apiRequest<any>("/users/profile", {
      headers: { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` },
      skipAuth: true,
      skipLocation: true,
    })

    // Handle wrapped response format {success: true, data: User, message: string}
    if (response && typeof response === 'object' && 'data' in response && response.data) {
      return response.data
    }

    // Handle direct user object (fallback)
    if (response && typeof response === 'object' && 'id' in response && 'username' in response) {
      return response
    }

    // If we can't determine the format, throw an error
    throw new Error('Invalid user data format received from server')
  },

  /** Get user permissions */
  async getUserPermissions(userId: number, token: string): Promise<string[]> {
    return apiRequest<string[]>(`/users/${userId}/permissions`, {
      headers: { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` },
      skipLocation: true,
    })
  },
}

/* -------------------------------------------------------------------------- */
/*                              PERMISSIONS API                               */
/* -------------------------------------------------------------------------- */

export const permissionsApi = {
  /** GET /permissions - Get all permissions */
  async getAll(): Promise<ApiResponse<Permission[]>> {
    return apiRequest<ApiResponse<Permission[]>>("/permissions", { skipLocation: true })
  },

  /** GET /permissions/by-module - Get permissions grouped by module */
  async getByModule(): Promise<ApiResponse<Record<string, Permission[]>>> {
    return apiRequest<ApiResponse<Record<string, Permission[]>>>("/permissions/by-module")
  },

  /** POST /permissions - Create new permission */
  async create(permission: Omit<Permission, 'createdAt'>): Promise<ApiResponse<Permission>> {
    return apiRequest<ApiResponse<Permission>>("/permissions", {
      method: "POST",
      body: JSON.stringify(permission),
    })
  },

  /** PUT /permissions/:id - Update permission */
  async update(id: string, permission: Omit<Permission, 'id' | 'createdAt'>): Promise<ApiResponse<Permission>> {
    return apiRequest<ApiResponse<Permission>>(`/permissions/${id}`, {
      method: "PUT",
      body: JSON.stringify(permission),
    })
  },

  /** DELETE /permissions/:id - Delete permission */
  async remove(id: string): Promise<ApiResponse<void>> {
    return apiRequest<ApiResponse<void>>(`/permissions/${id}`, {
      method: "DELETE",
    })
  },
}

/* -------------------------------------------------------------------------- */
/*                                ROLES API                                   */
/* -------------------------------------------------------------------------- */

export interface RoleWithPermissions extends Role {
  permissions?: Permission[]
  userCount?: number
}

export const rolesApi = {
  /** GET /roles - Get all roles with permissions */
  async getAll(): Promise<ApiResponse<RoleWithPermissions[]>> {
    return apiRequest<ApiResponse<RoleWithPermissions[]>>("/roles")
  },

  /** GET /roles/:id - Get role by ID */
  async getById(id: number): Promise<ApiResponse<RoleWithPermissions>> {
    return apiRequest<ApiResponse<RoleWithPermissions>>(`/roles/${id}`)
  },

  /** POST /roles - Create new role */
  async create(role: { name: string; description?: string }): Promise<ApiResponse<Role>> {
    return apiRequest<ApiResponse<Role>>("/roles", {
      method: "POST",
      body: JSON.stringify(role),
    })
  },

  /** PUT /roles/:id - Update role */
  async update(id: number, role: { name?: string; description?: string }): Promise<ApiResponse<Role>> {
    return apiRequest<ApiResponse<Role>>(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(role),
    })
  },

  /** DELETE /roles/:id - Delete role */
  async remove(id: number): Promise<ApiResponse<void>> {
    return apiRequest<ApiResponse<void>>(`/roles/${id}`, {
      method: "DELETE",
    })
  },

  /** GET /roles/:id/permissions - Get role permissions */
  async getPermissions(id: number): Promise<ApiResponse<string[]>> {
    return apiRequest<ApiResponse<string[]>>(`/roles/${id}/permissions`)
  },

  /** PUT /roles/:id/permissions - Update role permissions */
  async updatePermissions(id: number, permissions: string[]): Promise<ApiResponse<void>> {
    return apiRequest<ApiResponse<void>>(`/roles/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    })
  },
}

/* -------------------------------------------------------------------------- */
/*                                USERS API                                   */
/* -------------------------------------------------------------------------- */

export interface UserWithRole extends User {
  Role?: {
    id: number
    name: string
    description: string
  }
  permissions?: string[]
}

export interface CreateUserRequest {
  username: string
  password: string
  email: string
  fullName?: string
  mobile?: string
  status: string
  roleId: number
}

export interface UpdateUserRequest {
  username?: string
  email?: string
  fullName?: string
  mobile?: string
  status?: string
  roleId?: number
}

/**
 * Users API - Enhanced with new password management endpoints
 * 
 * Password Change API Examples:
 * 
 * 1. User changes own password:
 *    PUT /api/users/{userId}/password
 *    { currentPassword, newPassword, confirmPassword }
 * 
 * 2. Admin changes user password:
 *    PUT /api/users/{userId}/password
 *    { newPassword, confirmPassword } (no currentPassword required for admin)
 */


export interface AssignedCustomer extends Customer {
  assignmentId: number
  assignedDate: string
}

export const usersApi = {
  /** GET /users - Get all users with pagination */
  async getAll(params?: {
    page?: number
    limit?: number
    search?: string
    roleId?: number
    isActive?: boolean
  }): Promise<ApiResponse<{
    users: UserWithRole[]
    pagination: {
      currentPage: number
      totalPages: number
      totalCount: number
      limit: number
    }
  }>> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.roleId) queryParams.append('roleId', params.roleId.toString())
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())

    const url = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiRequest<ApiResponse<{
      users: UserWithRole[]
      pagination: {
        currentPage: number
        totalPages: number
        totalCount: number
        limit: number
      }
    }>>(url)
  },

  /** GET /users/:id - Get user by ID */
  async getById(id: number): Promise<ApiResponse<UserWithRole>> {
    return apiRequest<ApiResponse<UserWithRole>>(`/users/${id}`)
  },

  /** GET /users/profile - Get current user profile */
  async getProfile(): Promise<ApiResponse<UserWithRole>> {
    return apiRequest<ApiResponse<UserWithRole>>("/users/profile")
  },

  /** POST /users/register - Create new user */
  async create(userData: CreateUserRequest): Promise<ApiResponse<{ user: UserWithRole }>> {
    return apiRequest<ApiResponse<{ user: UserWithRole }>>("/users/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  },

  /** PUT /users/:id - Update user */
  async update(id: number, userData: UpdateUserRequest): Promise<ApiResponse<UserWithRole>> {
    return apiRequest<ApiResponse<UserWithRole>>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    })
  },

  /** DELETE /users/:id - Delete user */
  async remove(id: number): Promise<ApiResponse<void>> {
    return apiRequest<ApiResponse<void>>(`/users/${id}`, {
      method: "DELETE",
    })
  },

  /** GET /users/:id/permissions - Get user permissions */
  async getPermissions(id: number): Promise<ApiResponse<string[]>> {
    return apiRequest<ApiResponse<string[]>>(`/users/${id}/permissions`)
  },

  /** PUT /users/profile - Update current user profile */
  async updateProfile(userData: Partial<UpdateUserRequest>): Promise<ApiResponse<UserWithRole>> {
    return apiRequest<ApiResponse<UserWithRole>>("/users/profile", {
      method: "PUT",
      body: JSON.stringify(userData),
    })
  },

  /** PUT /users/:id/password - Change user password (own or admin) */
  async changePassword(userId: number, currentPassword: string, newPassword: string, confirmPassword: string): Promise<ApiResponse<{
    userId: number;
    username: string;
    updatedAt: string;
  }>> {
    return apiRequest<ApiResponse<{
      userId: number;
      username: string;
      updatedAt: string;
    }>>(`/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword
      }),
    })
  },

  /** PUT /users/:id/password - Admin updates user password (no current password required) */
  async adminChangePassword(userId: number, newPassword: string, confirmPassword: string): Promise<ApiResponse<{
    userId: number;
    username: string;
    updatedAt: string;
  }>> {
    return apiRequest<ApiResponse<{
      userId: number;
      username: string;
      updatedAt: string;
    }>>(`/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({
        newPassword,
        confirmPassword
      }),
    })
  },

  /** GET /users/sales-persons - Get all sales persons */
  async getSalesPersons(): Promise<User[]> {
    const response = await apiRequest<User[]>(`/users/sales-persons`, { skipLocation: true })
    return Array.isArray(response) ? response : []
  },

  /** POST /users/{salesPersonId}/customers - Assign customers to sales person */
  async assignCustomers(salesPersonId: number, customerIds: number[]): Promise<any> {
    return apiRequest(`/users/${salesPersonId}/customers`, {
      method: "POST",
      body: JSON.stringify({ customerIds }),
    })
  },

  /** GET /users/{salesPersonId}/customers - Get assigned customers */
  async getAssignedCustomers(salesPersonId: number): Promise<AssignedCustomer[]> {
    const response = await apiRequest<any>(`/users/${salesPersonId}/customers`)
    return response && response.data && Array.isArray(response.data) ? response.data : []
  },

  /** DELETE /users/{salesPersonId}/customers/{customerId} - Remove customer assignment */
  async removeCustomerAssignment(salesPersonId: number, customerId: number): Promise<any> {
    return apiRequest(`/users/${salesPersonId}/customers/${customerId}`, {
      method: "DELETE",
    })
  },
}

/* -------------------------------------------------------------------------- */
/*                              GENERIC CRUD APIS                             */
/* -------------------------------------------------------------------------- */

function crud(path: string) {
  /**
   * If the backend returns `{ success, data }` unwrap it.
   * Otherwise return the raw value.
   */
  const unwrap = <T,>(res: unknown): T => {
    // Wrapped style
    if (res && typeof res === "object" && "data" in (res as any)) {
      return (res as { data: T }).data
    }
    // Raw style
    return res as T
  }

  return {
    /** GET /<path> */
    getAll: async <T = unknown>() => {
      const res = await apiRequest<unknown>(`/${path}`)
      return unwrap<T[]>(res)
    },

    getExpenseSuppliers: async <T = unknown>() => {
      const res = await apiRequest<unknown>(`/${path}/expense`)
      return unwrap<T[]>(res)
    },

    /** GET /<path>/:id */
    getById: async <T = unknown>(id: number | string) => {
      const res = await apiRequest<unknown>(`/${path}/${id}`)
      return unwrap<T>(res)
    },

    /** POST /<path> */
    create: async <T = unknown>(payload: unknown) => {
      const res = await apiRequest<unknown>(`/${path}`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
      return unwrap<T>(res)
    },

    /** PUT /<path>/:id */
    update: async <T = unknown>(id: number | string, payload: unknown) => {
      const res = await apiRequest<unknown>(`/${path}/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
      return unwrap<T>(res)
    },

    /** PATCH /<path>/:id/:action */
    patch: async <T = unknown>(actionPath: string, payload: unknown) => {
      const res = await apiRequest<unknown>(`/${path}/${actionPath}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      return unwrap<T>(res)
    },

    /** DELETE /<path>/:id */
    remove: (id: number | string) => apiRequest<void>(`/${path}/${id}`, { method: "DELETE" }),
  }
}

export const categoriesApi = crud("categories")
export const locationsApi = {
  /** GET /locations - Get all locations without location filtering */
  async getAll<T = Location>(): Promise<T[]> {
    return apiRequest<T[]>("/locations", { skipLocation: true })
  },

  /** GET /locations/:id - Get location by ID */
  async getById(id: number | string): Promise<Location> {
    return apiRequest<Location>(`/locations/${id}`, { skipLocation: true })
  },

  /** POST /locations - Create new location */
  async create(data: Partial<Location>): Promise<Location> {
    return apiRequest<Location>("/locations", {
      method: "POST",
      body: JSON.stringify(data),
      skipLocation: true,
    })
  },

  /** PUT /locations/:id - Update location */
  async update(id: number | string, data: Partial<Location>): Promise<Location> {
    return apiRequest<Location>(`/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      skipLocation: true,
    })
  },

  /** DELETE /locations/:id - Delete location */
  async remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/locations/${id}`, {
      method: "DELETE",
      skipLocation: true,
    })
  },
}

export const storesApi = {
  ...crud("stores"),
  async getByLocation(locationId: number | string): Promise<{
    success: boolean
    message: string
    locationInfo: {
      id: number
      name: string
      address: string
      city: string
    }
    data: Store[]
  }> {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    const response = await fetch(`${API_BASE}/stores/location/${locationId}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!response.ok) throw new Error("Failed to fetch stores by location")
    return await response.json()
  }
}

export const vehiclesApi = crud("vehicles")
export const routesApi = crud("routes")

// Enhanced Items API with scheduled GRN information
export const itemsApi = {
  ...crud("items"),

  // Get all items with optional pagination support
  // Usage without pagination: itemsApi.getAll()
  // Usage with pagination: itemsApi.getAll(1, 10)
  async getAll(page?: number, limit?: number): Promise<PaginatedResponse<Item> | Item[]> {
    let url = `/items`

    // Only add pagination params if provided
    if (page !== undefined && limit !== undefined) {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      url = `/items?${params.toString()}`
    }

    const res = await apiRequest<unknown>(url)

    // Check if response has pagination structure
    if (res && typeof res === 'object' && 'pagination' in (res as any)) {
      return res as PaginatedResponse<Item>
    }

    // Fallback to unwrap for non-paginated responses
    if (res && typeof res === 'object' && 'data' in (res as any)) {
      return (res as { data: Item[] }).data
    }

    return res as Item[]
  },

  // Get all active items with their scheduled GRN information for a specific date and store
  async getWithSchedule(date: string, storeId: number | string): Promise<ItemWithSchedule[]> {
    return await apiRequest<ItemWithSchedule[]>(`/items/with-schedule/${date}/${storeId}`)
  },

  // Get finished goods items
  async getFinishedGoods(): Promise<Item[]> {
    return await apiRequest<Item[]>("/items/finished-goods")
  },

  // Get raw materials items
  async getRawMaterials(): Promise<Item[]> {
    return await apiRequest<Item[]>("/items/raw-materials")
  },
}

export const itemPricesApi = {
  ...crud("item-prices"),

  // Get item prices with optional query parameters
  async getCustomerWisePrice(customerId: number | string): Promise<CustomerWisePriceResponse | ItemPrice[]> {
    return await apiRequest(`/grn-schedule-items/getCustomerWisePrice/${customerId}`)
  }
}
export const suppliersApi = crud("suppliers")
export const customersApi = {
  ...crud("customers"),
  async updateCategoryDiscounts(customerId: number, discounts: { categoryId: number, discountPercentage: number }[]) {
    return await apiRequest(`/customer-category-discounts/bulk`, {
      method: "POST",
      body: JSON.stringify({ customerId, discounts }),
    })
  },
  async getCategoryDiscounts(customerId: number) {
    const res = await apiRequest<any>(`/customer-category-discounts/customer/${customerId}`)
    return res && res.data ? res.data : res
  }
}
function transformCustomerReturn(backend: any): CustomerReturn {
  return {
    ...backend,
    totalAmount: parseFloat(backend.totalAmount || 0),
    subTotal: parseFloat(backend.subTotal || 0),
    taxAmount: parseFloat(backend.taxAmount || 0),
    discountAmount: parseFloat(backend.discountAmount || 0),
    refundAmount: parseFloat(backend.refundAmount || 0),
    utilizedAmount: parseFloat(backend.utilizedAmount || 0),
    customer: backend.Customer,
    returnType: backend.ReturnType,
    items: (backend.CustomerReturnItems || []).map((item: any) => ({
      ...item,
      quantity: parseFloat(item.quantity || 0),
      unitPrice: parseFloat(item.unitPrice || 0),
      totalPrice: parseFloat(item.totalPrice || 0),
      taxAmount: parseFloat(item.taxAmount || 0),
      excludingTaxAmount: parseFloat(item.excludingTaxAmount || 0),
      refundAmount: parseFloat(item.refundAmount || 0),
      item: item.Item
    }))
  }
}

export const customerReturnsApi = {
  ...crud("customer-returns"),
  async getAll(params?: { page?: number; limit?: number; status?: string; customerId?: string; search?: string }): Promise<PaginatedResponse<CustomerReturn>> {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.status && params.status !== 'all') query.append('status', params.status)
    if (params?.customerId && params.customerId !== 'all') query.append('customerId', params.customerId)
    if (params?.search) query.append('search', params.search)

    const res = await apiRequest<any>(`/customer-returns${query.toString() ? `?${query.toString()}` : ''}`)

    if (res && typeof res === 'object' && 'data' in res) {
      return {
        data: (res.data || []).map(transformCustomerReturn),
        pagination: {
          page: res.page || 1,
          limit: res.limit || 10,
          total: res.total || 0,
          totalPages: res.totalPages || 0,
          hasNextPage: (res.page || 1) < (res.totalPages || 0),
          hasPrevPage: (res.page || 1) > 1
        }
      }
    }

    const data = Array.isArray(res) ? res : []
    return {
      data: data.map(transformCustomerReturn),
      pagination: {
        page: 1,
        limit: data.length,
        total: data.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    }
  },
  async getByCustomerId(customerId: number, status?: string): Promise<CustomerReturn[]> {
    const query = new URLSearchParams()
    query.append('customerId', customerId.toString())
    query.append('hasBalance', 'true')
    if (status) query.append('status', status)
    const res = await apiRequest<any>(`/customer-returns?${query.toString()}`)
    const data = res && typeof res === 'object' && 'returns' in res ? res.returns : res
    return Array.isArray(data) ? data.map(transformCustomerReturn) : []
  },
  async getById(id: number | string): Promise<CustomerReturn> {
    const res = await apiRequest<any>(`/customer-returns/${id}`)
    const data = res && typeof res === 'object' && 'data' in res ? res.data : res
    return transformCustomerReturn(data)
  },
  async approve(id: number | string, data: { status: string; notes?: string }) {
    const res = await apiRequest<any>(`/customer-returns/${id}/approve`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
    return transformCustomerReturn(res)
  },
  async getStats(params?: { status?: string; customerId?: string; locationId?: string; startDate?: string; endDate?: string }) {
    const query = new URLSearchParams()
    if (params?.status && params.status !== 'all') query.append('status', params.status)
    if (params?.customerId && params.customerId !== 'all') query.append('customerId', params.customerId)
    if (params?.locationId) query.append('locationId', params.locationId)
    if (params?.startDate) query.append('startDate', params.startDate)
    if (params?.endDate) query.append('endDate', params.endDate)

    return await apiRequest<any[]>(`/customer-returns/stats${query.toString() ? `?${query.toString()}` : ''}`)
  },
  async getInvoiceRemainingQty(invoiceId: number): Promise<InvoiceRemainingQtyResponse> {
    return apiRequest<InvoiceRemainingQtyResponse>(`/customer-returns/invoice-remaining/${invoiceId}`)
  }
}

export const inventoryApi = crud("inventory")
export const salesApi = crud("sales")
export const timeSlotsApi = crud("time-slots")

// Simple CRUD units API as fallback
export const unitsCrudApi = crud("units")

// Enhanced Delivery Orders API with additional features from the backend
export const deliveryOrdersApi = {
  ...crud("delivery-orders"),

  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: number | string;
    driverId?: number | string;
    routeId?: number | string;
    date?: string;
  }): Promise<PaginatedResponse<any> & { summary?: any }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.append(key, value.toString());
        }
      });
    }
    const res = await apiRequest<any>(`/delivery-orders?${query.toString()}`);
    
    // Support both old and new response formats
    if (res && res.pagination) {
      return res;
    }
    
    // Fallback for old format (if any)
    const data = Array.isArray(res) ? res : (res?.data || []);
    return {
      data,
      pagination: {
        total: data.length,
        page: 1,
        limit: data.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      summary: res?.summary || null
    };
  },

  // Assign driver, route, vehicle to delivery order
  async assign(id: number | string, data: { driverId?: number; routeId?: number; vehicleId?: number }) {
    return await apiRequest(`/delivery-orders/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Approve or reject delivery order
  async approveReject(id: number | string, data: { status: "Approved" | "Rejected" | "Scheduled" }) {
    return await apiRequest(`/delivery-orders/${id}/approve-reject`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Get approved delivery orders by driver
  async getApprovedByDriver(driverId: number | string) {
    return await apiRequest(`/delivery-orders/approved/driver/${driverId}`);
  },

  // Get delivery order summary with filters
  async getSummary(filters?: { routeId?: number; driverId?: number; vehicleId?: number; deliveryDate?: string }) {
    return await apiRequest('/delivery-orders/summary', {
      method: 'POST',
      body: JSON.stringify(filters || {}),
    });
  },


  async createSummary(data: any) {
    return await apiRequest('/delivery-order-summary-items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get all delivery order summaries with items
  async getSummaryItems(params?: { page?: number; limit?: number; isActive?: boolean; isDispatched?: boolean; dateFrom?: string; dateTo?: string; search?: string }) {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.isActive !== undefined) query.append('isActive', params.isActive.toString())
    if (params?.isDispatched !== undefined) query.append('isDispatched', params.isDispatched.toString())
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom)
    if (params?.dateTo) query.append('dateTo', params.dateTo)
    if (params?.search) query.append('search', params.search)

    return await apiRequest(`/delivery-order-summary-items${query.toString() ? `?${query.toString()}` : ''}`);
  },

  async getSummaryItemsTimeslot(data: any) {
    return await apiRequest('/delivery-order-summary-items/timeslot', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update summary items with GRN assignments
  async updateSummaryItems(data: any) {
    return await apiRequest('/delivery-order-summary-items/dispatched', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get delivery order items with summary for comprehensive view
  async getItemsWithSummary(filters: { routeId: number; date: string }) {
    return await apiRequest('/delivery-orders/items-with-summary', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  },

  // Get lorry stock balances
  async getLorryStock(vehicleId: number | string) {
    return await apiRequest(`/delivery-orders/lorry-stock?vehicleId=${vehicleId}`);
  },

  // Get store stock balances
  async getStoreStock(storeId: number | string) {
    return await apiRequest(`/delivery-orders/store-stock?storeId=${storeId}`);
  },

  // Get delivery order stock trace
  async getStockTrace(deliveryOrderId: number | string) {
    return await apiRequest(`/delivery-orders/stock-trace?deliveryOrderId=${deliveryOrderId}`);
  },

  // Get lorry unload history
  async getLorryUnloadHistory(vehicleId: number | string) {
    return await apiRequest(`/delivery-orders/lorry-unload-history?vehicleId=${vehicleId}`);
  },

  // Get delivery order item results
  async getItemResults(deliveryOrderId: number | string) {
    return await apiRequest(`/delivery-orders/item-results?deliveryOrderId=${deliveryOrderId}`);
  },

  // Get delivery order invoice and items
  async getInvoice(deliveryOrderId: number | string) {
    return await apiRequest(`/delivery-orders/invoice?deliveryOrderId=${deliveryOrderId}`);
  },

  // Confirm delivery order as delivered
  async confirmDelivered(data: { deliveryOrderId: number }) {
    return await apiRequest(`/delivery-orders/confirm-delivered`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Finalize delivery order (driver delivery finalization)
  async finalize(data: {
    deliveryOrderId: number;
    items: Array<{
      itemId: number;
      acceptedQty: number;
      rejectedQty: number;
      damagedQty: number;
      weightDiffQty: number;
    }>;
  }) {
    return await apiRequest(`/delivery-orders/finalize`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Unload DO-assigned lorry stock balance back to stores
  async unloadLorryBalance(data: {
    deliveryOrderId: number;
    unloads: Array<{
      itemId: number;
      type: "rejected" | "damaged" | "weightDiff";
      qty: number;
      storeId: number;
    }>;
  }) {
    return await apiRequest(`/delivery-orders/unload-do-lorry-balance`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Confirm delivery order (set status to In Transit)
  async confirm(data: { deliveryOrderId: number }) {
    return await apiRequest(`/delivery-orders/confirm`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// Delivery Order Summary Items API (based on Postman collection)
export const deliveryOrderSummaryItemsApi = {
  // Get all delivery order summary items with pagination
  async getAll(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', String(params.page))
    if (params?.limit) query.append('limit', String(params.limit))
    const queryString = query.toString()
    return await apiRequest(`/delivery-order-summary-items${queryString ? `?${queryString}` : ''}`)
  },

  // Get summary items by filter (Date and/or Route) - POST API
  async getByFilter(params: {
    summaryDate?: string;
    routeId?: number;
    page?: number;
    limit?: number
  }) {
    return await apiRequest(`/delivery-order-summary-items/filter`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  // Get summary items by release status
  async getByReleaseStatus(params: {
    isReleased: boolean;
    page?: number;
    limit?: number
  }) {
    const query = new URLSearchParams()
    query.append('isReleased', String(params.isReleased))
    if (params.page) query.append('page', String(params.page))
    if (params.limit) query.append('limit', String(params.limit))
    return await apiRequest(`/delivery-order-summary-items/release-status?${query.toString()}`)
  },

  // Get summary item by ID
  async getById(id: number | string) {
    return await apiRequest(`/delivery-order-summary-items/${id}`)
  },

  // Update release info for a specific summary item
  async updateRelease(id: number | string, data: {
    releaseStoreId?: number;
    isReleased?: boolean;
    user: { id: number };
  }) {
    return await apiRequest(`/delivery-order-summary-items/${id}/release`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Bulk update release status for multiple items
  async bulkUpdate(data: {
    summaryItemIds: number[];
    isReleased?: boolean;
    releaseStoreId?: number;
    user: { id: number };
  }) {
    return await apiRequest(`/delivery-order-summary-items/bulk-update`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete summary item
  async delete(id: number | string) {
    return await apiRequest(`/delivery-order-summary-items/${id}`, {
      method: 'DELETE',
    })
  },
};

export const grnScheduleApi = {
  ...crud("grn-schedule-items"),

  // Get item prices with optional query parameters
  async getCustomerWisePrice(customerId: number | string): Promise<CustomerWisePriceResponse | ItemPrice[]> {
    return await apiRequest(`/grn-schedule-items/getCustomerWisePrice/${customerId}`)
  }
}

/* -------------------------------------------------------------------------- */
/*                           PURCHASE ORDER SPECIFIC APIS                     */
/* -------------------------------------------------------------------------- */

export const purchaseOrdersApi = {
  async getAll(): Promise<PurchaseOrder[]> {
    const response = await apiRequest<PurchaseOrderResponse[]>("/purchase-orders")
    return response.map(transformPurchaseOrder)
  },

  async getById(id: number | string): Promise<PurchaseOrder> {
    const response = await apiRequest<PurchaseOrderResponse>(`/purchase-orders/${id}`)
    return transformPurchaseOrder(response)
  },

  async create(payload: CreatePurchaseOrderRequest): Promise<PurchaseOrder> {
    const response = await apiRequest<PurchaseOrderResponse>("/purchase-orders", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return transformPurchaseOrder(response)
  },

  async getAvailableList(): Promise<PurchaseOrder[]> {
    const response = await apiRequest<PurchaseOrderResponse[]>("/purchase-orders/available", {
      method: "POST",
    })
    return response.map(transformPurchaseOrder)
  },

  async update(id: number | string, payload: UpdatePurchaseOrderRequest): Promise<PurchaseOrder> {
    const response = await apiRequest<PurchaseOrderResponse>(`/purchase-orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    return transformPurchaseOrder(response)
  },

  remove: (id: number | string) => apiRequest<void>(`/purchase-orders/${id}`, { method: "DELETE" }),
}

/* -------------------------------------------------------------------------- */
/*                               GRN SPECIFIC APIS                            */
/* -------------------------------------------------------------------------- */

export const grnApi = {
  async getItemGrnAvailability() {
    return apiRequest<any[]>("/grns/item-grn-availability");
  },
  async getAll(): Promise<GRN[]> {
    const response = await apiRequest<GRNResponse[]>("/grns")
    return response.map(transformGRN)
  },

  async getById(id: number | string): Promise<GRN> {
    const response = await apiRequest<GRNResponse>(`/grns/${id}`)
    return transformGRN(response)
  },

  async create(payload: CreateGRNRequest): Promise<GRN> {
    const response = await apiRequest<GRNResponse>("/grns", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return transformGRN(response)
  },

  async update(id: number | string, payload: UpdateGRNRequest): Promise<GRN> {
    const response = await apiRequest<GRNResponse>(`/grns/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    return transformGRN(response)
  },

  async approveReject(id: number | string, payload: ApproveRejectGRNRequest): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>(`/grns/${id}/approve-reject`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
    return response
  },

  remove: (id: number | string) => apiRequest<void>(`/grns/${id}`, { method: "DELETE" }),

  /**
   * Get all cold rooms with racks for a given store (for GRN form)
   * GET /cold-rooms/store/:storeId/cold-rooms-with-racks
   */
  async getColdRoomsWithRacksForStore(storeId: number) {
    return apiRequest<any[]>(`/cold-rooms/store/${storeId}/cold-rooms-with-racks`);
  },
  /**
   * Submit QC check for a GRN
   * POST /grns/:id/qc-check
   * @param id GRN id
   * @param payload QC check data (array of items with rejectedQty, damageReason, remarks, etc.)
   */
  async qcCheck(id: number | string, payload: any): Promise<any> {
    return apiRequest<any>(`/grns/grns/${id}/qc-check`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
}

/* -------------------------------------------------------------------------- */
/*                            SALES ORDER SPECIFIC APIS                       */
/* -------------------------------------------------------------------------- */

export interface SalesOrderItem {
  Item: any
  item: any
  itemId: number
  code: string
  qty: number
  price: number
  name?: string
  unit?: string
  isTaxItem: boolean
  discountedAmount: number
  excludingTaxAmount: number
  total: number
  discount?: number;
  customerItemCode?: any;
}

export interface SalesOrder {
  deliveryOrderStatus: string
  createdUserName: any
  contactNumber: string
  id: number
  idSalesPerson?: number
  orderNumber: string
  customerId: number
  isDelivery: boolean
  routeId: number
  customerName?: string
  customerType?: string
  customerIsTaxInclusive?: boolean
  customerTaxNumber?: string
  orderDate: string
  deliveryDate?: string
  dispatchDate?: string
  timeSlot?: string
  items: SalesOrderItem[]
  totalWeight: number
  isTaxInvoice: boolean,
  taxRate: number,
  taxAmount: number,
  subTotal: number
  totalAmount: number
  status: string
  paymentStatus?: string
  deliveryAddress?: string
  poNumber?: string
  createdAt?: string
  updatedAt?: string
  SalesPerson?: User
  Customer?: any
}

export const salesOrdersApi = {
  async getAll(params?: {
    page?: number
    limit?: number
    search?: string
    customerId?: string | number
    salesPersonId?: string | number
    isTaxInvoice?: string   // "ALL" | "TAX" | "REGULAR"
    status?: string         // "ALL" | "Pending" | "Approved" | "Rejected" | "Cancelled"
    deliveryOrderStatus?: string // "ALL" | "Pending" | "Approved" | "Scheduled" | "Dispatched" | "In Transit" | "Delivered" | "Finalized" | "Failed" | "No DO"
  }): Promise<PaginatedResponse<SalesOrder>> {
    const qp = new URLSearchParams()
    if (params?.page) qp.append("page", params.page.toString())
    if (params?.limit) qp.append("limit", params.limit.toString())
    if (params?.search) qp.append("search", params.search)
    if (params?.customerId) qp.append("customerId", params.customerId.toString())
    if (params?.salesPersonId) qp.append("salesPersonId", params.salesPersonId.toString())
    if (params?.isTaxInvoice && params.isTaxInvoice !== "ALL")
      qp.append("isTaxInvoice", params.isTaxInvoice)
    if (params?.status && params.status !== "ALL")
      qp.append("status", params.status)
    if (params?.deliveryOrderStatus && params.deliveryOrderStatus !== "ALL")
      qp.append("deliveryOrderStatus", params.deliveryOrderStatus)

    const url = `/sales-orders${qp.toString() ? `?${qp.toString()}` : ""}`
    const response = await apiRequest<{ data: any[]; pagination: PaginationMeta }>(url)
    return {
      data: (response.data ?? []).map(transformSalesOrder),
      pagination: response.pagination ?? {
        page: 1, limit: 0, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false
      },
    }
  },
  async getById(id: number | string): Promise<SalesOrder> {
    const response = await apiRequest<any>(`/sales-orders/${id}`)
    return transformSalesOrder(response)
  },
  async getByCustomerId(customerId: number): Promise<SalesOrder[]> {
    const response = await apiRequest<any[]>(`/sales-orders/customer/${customerId}`)
    return response.map(transformSalesOrder)
  },
  async create(payload: {
    isAlreadyApproved: boolean
    orderNumber: string
    customerId: number
    idSalesPerson?: number
    routeId: number
    orderDate: string
    deliveryDate?: string
    dispatchDate?: string
    timeSlot?: string
    isDelivery: boolean
    deliveryAddress?: string
    poNumber?: string
    isTaxInvoice: boolean,
    taxRate: number,
    taxAmount: number,
    totalWeight: number
    subTotal: number
    totalAmount: number
    items: {
      itemId: number
      code: string
      qty: number
      price: number
      isTaxItem: boolean;
      taxAmount: number;
      discount: number;
    }[]
  }): Promise<SalesOrder> {
    return apiRequest<SalesOrder>("/sales-orders", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },
  async update(id: number | string, payload: {
    orderNumber: string
    customerId: number
    idSalesPerson?: number
    routeId: number
    isDelivery: boolean
    orderDate: string
    deliveryDate?: string
    dispatchDate?: string
    timeSlot?: string
    deliveryAddress?: string
    poNumber?: string
    isTaxInvoice: boolean,
    taxRate: number,
    taxAmount: number,
    totalWeight: number
    subTotal: number
    totalAmount: number
    items: {
      itemId: number
      code: string
      qty: number
      price: number
      isTaxItem: boolean;
      taxAmount: number;
      discount: number;
    }[]
  }): Promise<SalesOrder> {
    return apiRequest<SalesOrder>(`/sales-orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },
  async remove(id: number | string) {
    return apiRequest<void>(`/sales-orders/${id}`, { method: "DELETE" })
  },
  async approveReject(id: number | string, status: "Approved" | "Rejected") {
    return apiRequest<SalesOrder>(`/sales-orders/${id}/approve-reject`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
  },
  async cancel(id: number | string) {
    return apiRequest<SalesOrder>(`/sales-orders/${id}/cancel`, {
      method: "PATCH",
    })
  },
  async getItemsByCustomer(customerId: number, locationId: number): Promise<any> {
    return apiRequest<any>("/sales-orders/items-by-customer", {
      method: "POST",
      body: JSON.stringify({ customerId, locationId }),
    })
  },
}

// Document Sequence API
export interface DocumentSequence {
  documentType: string;
  prefix: string;
  currentNumber: number;
  numberLength: number;
}

/* -------------------------------------------------------------------------- */
/*                               GIN TYPES & APIS                             */
/* -------------------------------------------------------------------------- */

// GIN Item (frontend)
export interface GINItem {
  dispatchedQty: number
  item: any
  itemId: number;
  qty: number;
  remarks?: string;
  grnId?: number;
  coldRoomId?: number;
  palletRackId?: number;
  summaryId?: number;
  grn?: {
    id: number;
    grnNumber: string;
    grnDate: string;
  };
  coldRoom?: {
    id: number;
    name: string;
    temperature: number;
  };
  palletRack?: {
    id: number;
    code: string;
    capacity: number;
  };
  reverseQty?: number;
}

// GIN Item (backend response)
export interface GINItemResponse {
  dispatchedQty: number
  id: number;
  ginId: number;
  itemId: number;
  qty: number;
  grnId: number;
  coldRoomId?: number;
  palletRackId?: number;
  remarks?: string;
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
  Item: Item;
  GRN: {
    id: number;
    grnNumber: string;
    grnDate: string;
  };
  ColdRoom?: {
    id: number;
    name: string;
    temperature: number;
  };
  PalletRack?: {
    id: number;
    code: string;
    capacity: number;
  };
}

// GIN (backend response)
export interface GINResponse {
  deliveryOrderNumbers: never[]
  id: number;
  ginNumber: string;
  issueStoreId: number;
  transferStoreId: number;
  ginDate: string;
  remarks: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  IssueStore?: Store;
  TransferStore?: Store;
  GINItems: GINItemResponse[];
}

// GIN (frontend)
export interface GIN {
  deliveryOrderNumbers: any
  ginNumber: string
  id?: number;
  issueStoreId: number;
  transferStoreId: number;
  ginDate: string;
  remarks: string;
  status?: string;
  items: GINItem[];
  issueStore?: Store;
  transferStore?: Store;
  // Backend response format (capitalized)
  IssueStore?: Store;
  TransferStore?: Store;
  GINItems?: GINItemResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGINRequest {
  issueStoreId: number;
  transferStoreId: number;
  ginDate: string;
  remarks: string;
  items: GINItem[];
}

export interface UpdateGINRequest {
  issueStoreId: number;
  transferStoreId: number;
  ginDate: string;
  remarks: string;
  items: GINItem[];
}

export interface ApproveRejectGINRequest {
  status: "Approved" | "Rejected";
}

export interface ReverseStockGINRequest {
  ginId: number;
  items: Array<{
    ginItemId: number;
    reverseQty: number;
    palletRackId?: number | null;
  }>;
}

function transformGIN(backendGIN: GINResponse): GIN {
  return {
    id: backendGIN.id,
    ginNumber: backendGIN.ginNumber,
    issueStoreId: backendGIN.issueStoreId,
    transferStoreId: backendGIN.transferStoreId,
    ginDate: backendGIN.ginDate,
    remarks: backendGIN.remarks,
    status: backendGIN.status,
    issueStore: backendGIN.IssueStore,
    transferStore: backendGIN.TransferStore,
    deliveryOrderNumbers: backendGIN.deliveryOrderNumbers || [],
    items: backendGIN.GINItems?.map((item) => ({
      ginItemId: item.id,
      itemId: item.itemId,
      qty: item.qty,
      dispatchedQty: item.dispatchedQty,
      grnId: item.grnId,
      coldRoomId: item.coldRoomId,
      palletRackId: item.palletRackId,
      remarks: item.remarks,
      item: item.Item,
      grn: item.GRN,
      coldRoom: item.ColdRoom,
      palletRack: item.PalletRack,
    })),
    createdAt: backendGIN.createdAt,
    updatedAt: backendGIN.updatedAt,
  };
}

export const ginApi = {
  async getAll(): Promise<GIN[]> {
    const response = await apiRequest<GINResponse[]>("/gins");
    return response.map(transformGIN);
  },

  async getById(id: number | string): Promise<GIN> {
    const response = await apiRequest<GINResponse>(`/gins/${id}`);
    return transformGIN(response);
  },

  async create(payload: CreateGINRequest): Promise<GIN> {
    const response = await apiRequest<GINResponse>("/gins", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return transformGIN(response);
  },

  async update(id: number | string, payload: UpdateGINRequest): Promise<GIN> {
    const response = await apiRequest<GINResponse>(`/gins/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
    return transformGIN(response);
  },

  async approveReject(id: number | string, payload: ApproveRejectGINRequest): Promise<GIN> {
    // POST /gins/:id/approve
    const response = await apiRequest<GINResponse>(`/gins/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return transformGIN(response);
  },

  async reverseStock(id: number | string, payload: ReverseStockGINRequest): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>(`/gins/${id}/reverse`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response;
  },

  remove: (id: number | string) => apiRequest<void>(`/gins/${id}`, { method: "DELETE" }),
};

/* -------------------------------------------------------------------------- */
/*                                BATCH TYPES                                 */
/* -------------------------------------------------------------------------- */

export interface Batch {
  id?: number;
  batchNumber: string;
  batchDate: string;
  expireDate: string;
  reference?: string;
  grnId: number;
  locationId: number;
  storeId: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdByUsername?: string;
  updatedByUsername?: string;
  GRN?: {
    id: number;
    grnNumber: string;
    grnDate: string;
  };
  Location?: Location;
  Store?: Store;
  BatchItems?: BatchItem[];
}

export interface BatchItem {
  id?: number;
  batchId: number;
  itemId: number;
  batchQuantity: number;
  availableQuantity: number;
  locationId: number;
  storeId: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdByUsername?: string;
  updatedByUsername?: string;
  Batch?: Batch;
  Item?: Item;
  Location?: Location;
  Store?: Store;
}

export interface CreateBatchRequest {
  batchNumber: string;
  batchDate: string;
  expireDate: string;
  reference?: string;
  grnId: number;
  locationId: number;
  storeId: number;
  isActive: boolean;
}

export interface UpdateBatchRequest {
  expireDate?: string;
  reference?: string;
  isActive?: boolean;
}

export interface CreateBatchItemRequest {
  batchId: number;
  itemId: number;
  batchQuantity: number;
  availableQuantity: number;
  locationId: number;
  storeId: number;
  isActive: boolean;
  expireDate?: string;
  costPrice?: number;
  sellingPrice?: number;
}

export interface UpdateBatchItemRequest {
  availableQuantity?: number;
  isActive?: boolean;
}

export interface UpdateBatchItemQuantityRequest {
  quantityChange: number;
  operation: "add" | "subtract";
}

export interface GenerateBatchNumberRequest {
  grnId: number;
}

export interface BatchItemSummary {
  itemId: number;
  totalBatchQuantity: number;
  totalAvailableQuantity: number;
  batchCount: number;
  Item?: Item;
}

/* -------------------------------------------------------------------------- */
/*                               BATCH APIS                                   */
/* -------------------------------------------------------------------------- */

export const batchesApi = {
  /** GET /batches - Get all batches with optional filtering */
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    locationId?: number;
    storeId?: number;
    isActive?: boolean;
    expiringSoon?: boolean;
  }): Promise<{
    batches: Batch[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString());
    if (params?.storeId) queryParams.append('storeId', params.storeId.toString());
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.expiringSoon !== undefined) queryParams.append('expiringSoon', params.expiringSoon.toString());

    const url = `/batches${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiRequest<{
      batches: Batch[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        limit: number;
      };
    }>(url);
  },

  /** GET /batches/:id - Get batch by ID */
  async getById(id: number | string): Promise<Batch> {
    return apiRequest<Batch>(`/batches/${id}`);
  },

  /** POST /batches - Create new batch */
  async create(payload: CreateBatchRequest): Promise<Batch> {
    return apiRequest<Batch>("/batches", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** PUT /batches/:id - Update batch */
  async update(id: number | string, payload: UpdateBatchRequest): Promise<Batch> {
    return apiRequest<Batch>(`/batches/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /** DELETE /batches/:id - Delete batch (soft delete) */
  async remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/batches/${id}`, {
      method: "DELETE",
    });
  },

  /** POST /batches/generate-batch-number - Generate unique batch number */
  async generateBatchNumber(payload: GenerateBatchNumberRequest): Promise<{ batchNumber: string }> {
    return apiRequest<{ batchNumber: string }>("/batches/generate-batch-number", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** POST /auto-generate/grn/:grnId - Auto-generate batch with batch items from GRN */
  async autoGenerateFromGRN(grnId: number | string): Promise<{ message: string; batch: Batch }> {
    return apiRequest<{ message: string; batch: Batch }>(`/batches/auto-generate/grn/${grnId}`, {
      method: "POST",
    });
  },

  /** GET /batches/grn/:grnId - Get batches by GRN ID */
  async getByGrnId(grnId: number | string): Promise<Batch[]> {
    return apiRequest<Batch[]>(`/batches/grn/${grnId}`);
  },

  /** GET /batches/expiring - Get expiring batches */
  async getExpiring(params?: {
    days?: number;
    locationId?: number;
    storeId?: number;
  }): Promise<Batch[]> {
    const queryParams = new URLSearchParams();
    if (params?.days) queryParams.append('days', params.days.toString());
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString());
    if (params?.storeId) queryParams.append('storeId', params.storeId.toString());

    const url = `/batches/expiring${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiRequest<Batch[]>(url);
  },
};

export const batchItemsApi = {
  /** GET /batch-items - Get all batch items with optional filtering */
  async getAll(params?: {
    page?: number;
    limit?: number;
    batchId?: number;
    itemId?: number;
    locationId?: number;
    storeId?: number;
    isActive?: boolean;
    hasAvailableQuantity?: boolean;
  }): Promise<{
    batchItems: BatchItem[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.batchId) queryParams.append('batchId', params.batchId.toString());
    if (params?.itemId) queryParams.append('itemId', params.itemId.toString());
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString());
    if (params?.storeId) queryParams.append('storeId', params.storeId.toString());
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.hasAvailableQuantity !== undefined) queryParams.append('hasAvailableQuantity', params.hasAvailableQuantity.toString());

    const url = `/batch-items${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiRequest<{
      batchItems: BatchItem[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        limit: number;
      };
    }>(url);
  },

  /** GET /batch-items/:id - Get batch item by ID */
  async getById(id: number | string): Promise<BatchItem> {
    return apiRequest<BatchItem>(`/batch-items/${id}`);
  },

  /** POST /batch-items - Create new batch item */
  async create(payload: CreateBatchItemRequest): Promise<BatchItem> {
    return apiRequest<BatchItem>("/batch-items", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** PUT /batch-items/:id - Update batch item */
  async update(id: number | string, payload: UpdateBatchItemRequest): Promise<BatchItem> {
    return apiRequest<BatchItem>(`/batch-items/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /** DELETE /batch-items/:id - Delete batch item (soft delete) */
  async remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/batch-items/${id}`, {
      method: "DELETE",
    });
  },

  /** GET /batch-items/batch/:batchId - Get batch items by batch ID */
  async getByBatchId(batchId: number | string): Promise<BatchItem[]> {
    return apiRequest<BatchItem[]>(`/batch-items/batch/${batchId}`);
  },

  /** GET /batch-items/item/:itemId - Get batch items by item ID (FIFO order) */
  async getByItemId(itemId: number | string, params?: {
    onlyAvailable?: boolean;
    locationId?: number;
    storeId?: number;
  }): Promise<BatchItem[]> {
    const queryParams = new URLSearchParams();
    if (params?.onlyAvailable !== undefined) queryParams.append('onlyAvailable', params.onlyAvailable.toString());
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString());
    if (params?.storeId) queryParams.append('storeId', params.storeId.toString());

    const url = `/batch-items/item/${itemId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiRequest<BatchItem[]>(url);
  },

  /** PUT /batch-items/:id/quantity - Update available quantity */
  async updateQuantity(id: number | string, payload: UpdateBatchItemQuantityRequest): Promise<BatchItem> {
    return apiRequest<BatchItem>(`/batch-items/${id}/quantity`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /** GET /batch-items/summary - Get batch items summary */
  async getSummary(params?: {
    locationId?: number;
    storeId?: number;
  }): Promise<BatchItemSummary[]> {
    const queryParams = new URLSearchParams();
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString());
    if (params?.storeId) queryParams.append('storeId', params.storeId.toString());

    const url = `/batch-items/summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiRequest<BatchItemSummary[]>(url);
  },
};

export const documentSequenceApi = {
  async getAll(): Promise<DocumentSequence[]> {
    return apiRequest<DocumentSequence[]>("/documents");
  },
  async getByType(documentType: string): Promise<DocumentSequence> {
    return apiRequest<DocumentSequence>(`/documents/${documentType}`);
  },
  async create(payload: DocumentSequence): Promise<DocumentSequence> {
    return apiRequest<DocumentSequence>("/documents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async update(documentType: string, payload: Partial<DocumentSequence>): Promise<DocumentSequence> {
    return apiRequest<DocumentSequence>(`/documents/${documentType}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async remove(documentType: string) {
    return apiRequest<void>(`/documents/${documentType}`, { method: "DELETE" });
  },
  async generateNumber(documentType: string): Promise<{ documentNumber: string }> {
    return apiRequest<{ documentNumber: string }>("/documents/generate", {
      method: "POST",
      body: JSON.stringify({ documentType }),
    });
  },
};

/* -------------------------------------------------------------------------- */
/*                               REPORTS APIS                                 */
/* -------------------------------------------------------------------------- */

// Define interface for BinCard entry
export interface BinCardEntry {
  date: string;
  refNo: string;
  description: string;
  inQty: number;
  outQty: number;
  balance: number;
}

// Define interface for BinCard response
export interface BinCardResponse {
  itemId: number;
  itemName: string;
  startDate: string;
  endDate: string;
  location: string;
  data: BinCardEntry[];
}

export interface StockSummary {
  itemId: number;
  Item: any;
  totalQty: number;
  totalWeight: number;
  totalValue: number;
  stores: Array<{
    storeId: number;
    storeName: string;
    qty: number;
    weight: number;
    value: number;
  }>;
}

export interface StockMovement {
  id: number;
  itemId: number;
  itemName: string;
  storeId: number;
  storeName: string;
  documentType: string;
  documentNumber: string;
  inOut: "IN" | "OUT";
  qty: number;
  weight: number;
  costPrice: number;
  movementDate: string;
  remarks?: string;
}

export interface LowStockItem {
  itemId: number;
  itemName: string;
  currentQty: number;
  reorderLevel: number;
  storeId: number;
  storeName: string;
}

export interface ExpiredItem {
  itemId: number;
  itemName: string;
  grnId: number;
  grnNumber: string;
  expireDate: string;
  qty: number;
  storeId: number;
  storeName: string;
}

export interface InventoryValuation {
  itemId: number;
  itemName: string;
  totalQty: number;
  avgCostPrice: number;
  totalValue: number;
  stores: Array<{
    storeId: number;
    storeName: string;
    qty: number;
    avgCostPrice: number;
    value: number;
  }>;
}

// GRN Valuation interface
export interface GrnValuation {
  totalInventoryValue: number;
}

export interface GeneralSalesReport {
  summary: {
    totalSales: number
    totalOutstanding: number
    totalOverDue: number
  }
  details: Array<{
    id: number
    customerName: string
    location: string
    poNo: string
    invoiceDate: string
    dueDate: string
    invValue: number
    paidAmount: number
    returnedAmount: number
    outstanding: number
    overDueValue: number
    salesRep: string
  }>
}

export interface RepWiseSalesItem {
  salesRepId: number
  salesRepName: string
  totalSales: number
  totalOutstanding: number
  totalOverDue: number
  invoices: Array<{
    id: number
    customerName: string
    location: string
    poNo: string
    invoiceDate: string
    dueDate: string
    invValue: number
    outstanding: number
    overDueValue: number
  }>
}

export type RepWiseSalesReport = RepWiseSalesItem[]

export interface RepWiseSalesOrdersItem {
  salesRepId: number
  salesRepName: string
  totalSales: number
  orderCount: number
  orders: Array<{
    id: number
    orderNumber: string
    customerName: string
    location: string
    orderDate: string
    deliveryDate: string | null
    totalAmount: number
    status: string
  }>
}

export type RepWiseSalesOrdersReport = RepWiseSalesOrdersItem[]

export interface ExpensesReport {
  summary: {
    totalExpenses?: number
  }
  details: Array<{
    id: number
    paymentDate: string
    categoryName: string
    description: string
    amount: number
    status: string
  }>
}

export const dashboardApi = {
  getMainDetails: async (): Promise<DashboardMainDetails> => {
    return apiRequest<DashboardMainDetails>("/dashboard/main-details")
  }
}

export const reportsApi = {
  // Stock Reports
  async getBinCard(itemId: string | number, startDate: string, endDate: string, locationId: string | number): Promise<BinCardResponse> {
    console.log('getBinCard called with:', { itemId, startDate, endDate, locationId });

    // Validate all required parameters more strictly
    if (!itemId || itemId === '' || itemId === 'undefined' || itemId === 'null') {
      console.error('Invalid itemId:', itemId);
      throw new Error("Item ID is required");
    }
    if (!startDate || startDate === '' || startDate === 'undefined') {
      console.error('Invalid startDate:', startDate);
      throw new Error("Start date is required");
    }
    if (!endDate || endDate === '' || endDate === 'undefined') {
      console.error('Invalid endDate:', endDate);
      throw new Error("End date is required");
    }
    if (!locationId || locationId === '' || locationId === 'undefined' || locationId === 'null') {
      console.error('Invalid locationId:', locationId);
      throw new Error("Location ID is required");
    }

    try {
      // Convert and validate parameters
      const cleanItemId = itemId.toString().trim();
      const cleanStartDate = startDate.trim();
      const cleanEndDate = endDate.trim();
      const cleanLocationId = locationId.toString().trim();

      const params = new URLSearchParams();
      params.append('itemId', cleanItemId);
      params.append('startDate', cleanStartDate);
      params.append('endDate', cleanEndDate);
      params.append('locationId', cleanLocationId);

      const url = `/reports/bincard?${params.toString()}`;
      console.log('Making request to:', url);

      const response = await apiRequest<BinCardResponse>(url);
      console.log('Response received:', response);

      return response;
    } catch (error: any) {
      console.error('BinCard API Error:', error);
      throw new Error(`Failed to fetch bincard: ${error.message || 'Unknown error'}`);
    }
  },

  async getStockSummary(): Promise<StockSummary[]> {
    return apiRequest<StockSummary[]>("/reports/stock-summary");
  },

  async getStockByStore(storeId: number | string, minQty?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (minQty) params.append('minQty', minQty.toString());
    const url = `/reports/stock-by-store/${storeId}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  async getStockByItem(itemId: number | string): Promise<any[]> {
    return apiRequest<any[]>(`/reports/stock-by-item/${itemId}`);
  },

  // GRN Reports
  async getGrnSummary(status?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const url = `/reports/grn-summary${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  async getGrnByDateRange(startDate: string, endDate: string): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    return apiRequest<any[]>(`/reports/grn-by-date-range?${params.toString()}`);
  },

  async getGrnItemAvailability(): Promise<any[]> {
    return apiRequest<any[]>("/reports/grn-item-availability");
  },

  // GIN Reports
  async getGinSummary(status?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const url = `/reports/gin-summary${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  async getGinByDateRange(startDate: string, endDate: string): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    return apiRequest<any[]>(`/reports/gin-by-date-range?${params.toString()}`);
  },

  async getGinTransfers(issueStoreId?: number, transferStoreId?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (issueStoreId) params.append('issueStoreId', issueStoreId.toString());
    if (transferStoreId) params.append('transferStoreId', transferStoreId.toString());
    const url = `/reports/gin-transfers${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  // Inventory Movement Reports
  async getStockMovements(documentType?: string, inOut?: "IN" | "OUT"): Promise<StockMovement[]> {
    const params = new URLSearchParams();
    if (documentType) params.append('documentType', documentType);
    if (inOut) params.append('inOut', inOut);
    const url = `/reports/stock-movements/${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<StockMovement[]>(url);
  },

  async getItemStockMovements(itemId: number | string, startDate?: string, endDate?: string): Promise<StockMovement[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const url = `/reports/stock-movements/${itemId}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<StockMovement[]>(url);
  },

  // Dashboard Reports
  async getLowStockItems(threshold?: number): Promise<LowStockItem[]> {
    const params = new URLSearchParams();
    if (threshold) params.append('threshold', threshold.toString());
    const url = `/reports/low-stock-items${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<LowStockItem[]>(url);
  },

  async getExpiredItems(): Promise<ExpiredItem[]> {
    return apiRequest<ExpiredItem[]>("/reports/expired-items");
  },

  async getInventoryValuation(): Promise<InventoryValuation[]> {
    return apiRequest<InventoryValuation[]>("/reports/inventory-valuation");
  },

  async getGrnValuation(): Promise<GrnValuation> {
    return apiRequest<GrnValuation>("/reports/grn-value");
  },

  // Enhanced Stock Movement Reports
  async getDetailedItemStockMovements(itemId: number | string, startDate?: string, endDate?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const url = `/reports/stock-movements/item/${itemId}/detailed${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  async getStockMovementsByStore(storeId: number | string, startDate?: string, endDate?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const url = `/reports/stock-movements/store/${storeId}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  async getStockMovementTrends(startDate?: string, endDate?: string, groupBy?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (groupBy) params.append('groupBy', groupBy);
    const url = `/reports/stock-movements/trends${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  async getStockMovementSummary(startDate?: string, endDate?: string, categoryId?: number, itemId?: number): Promise<{
    filter: {
      startDate: string;
      endDate: string;
      categoryId: number;
    };
    data: Array<{
      itemCode: string;
      itemName: string;
      opening: number;
      inQty: number;
      outQty: number;
      closing: number;
    }>;
  }> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (categoryId) params.append('categoryId', categoryId.toString());
    if (itemId) params.append('itemId', itemId.toString());
    const url = `/reports/stock-movement-summary${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any>(url);
  },

  // Sales Reports
  async getSalesSummary(startDate?: string, endDate?: string, status?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);
    const url = `/reports/sales/summary${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any>(url);
  },

  async getSalesByCustomer(customerId: number | string, startDate?: string, endDate?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const url = `/reports/sales/customer/${customerId}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  async getSalesByItem(itemId: number | string, startDate?: string, endDate?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const url = `/reports/sales/item/${itemId}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  async getSalesBySalesPerson(salesPersonId: number | string, startDate?: string, endDate?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const url = `/reports/sales/sales-person/${salesPersonId}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  async getSalesByDateRange(startDate?: string, endDate?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const url = `/reports/sales/date-range${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  async getTopSellingItems(startDate?: string, endDate?: string, limit?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (limit) params.append('limit', limit.toString());
    const url = `/reports/sales/top-items${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  async getSalespersonCommissionReport(date: string, salesPersonId?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('date', date);
    if (salesPersonId) params.append('salesPersonId', salesPersonId);
    const url = `/reports/sales/salesperson-commission?${params.toString()}`;
    return apiRequest<any>(url);
  },

  async getGeneralSales(params?: { startDate?: string; endDate?: string; customerId?: number; salesRepId?: number; status?: string }): Promise<GeneralSalesReport> {
    const query = new URLSearchParams()
    if (params?.startDate) query.append('startDate', params.startDate)
    if (params?.endDate) query.append('endDate', params.endDate)
    if (params?.customerId) query.append('customerId', params.customerId.toString())
    if (params?.salesRepId) query.append('salesRepId', params.salesRepId.toString())
    if (params?.status) query.append('status', params.status)
    return apiRequest<GeneralSalesReport>(`/reports/general-sales?${query.toString()}`)
  },

  async getRepWiseSales(params?: { startDate?: string; endDate?: string; salesRepId?: number }): Promise<RepWiseSalesReport> {
    const query = new URLSearchParams()
    if (params?.startDate) query.append('startDate', params.startDate)
    if (params?.endDate) query.append('endDate', params.endDate)
    if (params?.salesRepId) query.append('salesRepId', params.salesRepId.toString())
    return apiRequest<RepWiseSalesReport>(`/reports/rep-wise-sales?${query.toString()}`)
  },

  async getRepWiseSalesOrders(params?: { startDate?: string; endDate?: string; salesRepId?: number; status?: string }): Promise<RepWiseSalesOrdersReport> {
    const query = new URLSearchParams()
    if (params?.startDate) query.append('startDate', params.startDate)
    if (params?.endDate) query.append('endDate', params.endDate)
    if (params?.salesRepId) query.append('salesRepId', params.salesRepId.toString())
    if (params?.status) query.append('status', params.status)
    return apiRequest<RepWiseSalesOrdersReport>(`/reports/rep-wise-sales-orders?${query.toString()}`)
  },

  async getExpensesReport(params?: { startDate?: string; endDate?: string; categoryId?: number }): Promise<ExpensesReport> {
    const query = new URLSearchParams()
    if (params?.startDate) query.append('startDate', params.startDate)
    if (params?.endDate) query.append('endDate', params.endDate)
    if (params?.categoryId) query.append('categoryId', params.categoryId.toString())
    return apiRequest<ExpensesReport>(`/reports/expenses?${query.toString()}`)
  },

  async getItemWisePurchasing(startDate?: string, endDate?: string, categoryId?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (categoryId) params.append('categoryId', categoryId.toString());
    const url = `/reports/purchasing/item-wise${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any[]>(url);
  },

  async getSupplierWisePO(startDate?: string, endDate?: string, supplierId?: string, status?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (supplierId) params.append('supplierId', supplierId);
    if (status) params.append('status', status);
    const url = `/reports/purchasing/supplier-wise-po${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any>(url);
  },
};

/* -------------------------------------------------------------------------- */
/*                              INVOICE TYPES & APIS                          */
/* -------------------------------------------------------------------------- */

// Invoice Item (frontend)
export interface InvoiceItem {
  itemId: number;
  code: string;
  qty: number;
  price: number;
  discount?: number;
  isTaxItem?: boolean;
  taxAmount?: number;
  discountedAmount?: number;
  excludingTaxAmount?: number;
  total?: number;
  item?: Item;
}

// Invoice Item (backend response)
export interface InvoiceItemResponse {
  id: number;
  invoiceId: number;
  itemId: number;
  code: string;
  qty: number;
  price: number;
  discount: number;
  isTaxItem?: boolean;
  taxAmount?: number;
  discountedAmount?: number;
  excludingTaxAmount?: number;
  total?: number;
  createdAt: string;
  updatedAt: string;
  Item: Item;
}

// Invoice (frontend)
export interface Invoice {
  SalesOrder: any
  DeliveryOrder: any
  id?: number;
  invoiceNumber: string;
  customerId: number;
  salesOrderId?: number;
  deliveryOrderId?: number;
  invoiceDate: string;
  subTotal?: number;
  isTaxInvoice?: boolean;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  paidAmount?: number;
  setoffAmount?: number;
  status?: string;
  items: InvoiceItem[];
  customer?: Customer;
  SalesPerson?: User;
  salesOrder?: SalesOrder;
  ReceiptInvoices?: ReceiptInvoice[];
  createdAt?: string;
  updatedAt?: string;
}

// Invoice (backend response)
export interface InvoiceResponse {
  DeliveryOrder: any
  total: number | undefined
  id: number;
  invoiceNumber: string;
  customerId: number;
  salesOrderId?: number;
  deliveryOrderId?: number;
  invoiceDate: string;
  subTotal?: number;
  isTaxInvoice?: boolean;
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number;
  paidAmount: number;
  setoffAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  Customer?: Customer;
  SalesPerson?: User;
  SalesOrder?: SalesOrder;
  deliveryOrder?: any;
  ReceiptInvoices?: ReceiptInvoiceResponse[];
  InvoiceItems: InvoiceItemResponse[];
}

export interface CreateInvoiceRequest {
  invoiceNumber: string;
  customerId: number;
  salesOrderId?: number;
  deliveryOrderId?: number;
  invoiceDate: string;
  items: InvoiceItem[];
}

export interface UpdateInvoiceRequest {
  invoiceNumber: string;
  customerId: number;
  salesOrderId?: number;
  deliveryOrderId?: number;
  invoiceDate: string;
  items: InvoiceItem[];
}

export interface ApproveRejectInvoiceRequest {
  status: "Approved" | "Rejected";
}

function transformInvoice(backendInvoice: InvoiceResponse): Invoice {
  return {
    id: backendInvoice.id,
    invoiceNumber: backendInvoice.invoiceNumber,
    customerId: backendInvoice.customerId,
    salesOrderId: backendInvoice.salesOrderId,
    deliveryOrderId: backendInvoice.deliveryOrderId,
    invoiceDate: backendInvoice.invoiceDate,
    subTotal: backendInvoice.subTotal,
    isTaxInvoice: backendInvoice.isTaxInvoice,
    taxRate: backendInvoice.taxRate,
    taxAmount: backendInvoice.taxAmount,
    totalAmount: typeof backendInvoice.total === 'string' ? parseFloat(backendInvoice.total) : (backendInvoice.total || 0),
    paidAmount: typeof backendInvoice.paidAmount === 'string' ? parseFloat(backendInvoice.paidAmount) : (backendInvoice.paidAmount || 0),
    setoffAmount: typeof backendInvoice.setoffAmount === 'string' ? parseFloat(backendInvoice.setoffAmount) : (backendInvoice.setoffAmount || 0),
    status: backendInvoice.status,
    SalesPerson: backendInvoice.SalesPerson,
    customer: backendInvoice.Customer,
    SalesOrder: backendInvoice.SalesOrder,
    DeliveryOrder: backendInvoice.DeliveryOrder,
    items: backendInvoice.InvoiceItems?.map((item) => ({
      itemId: item.itemId,
      code: item.code,
      qty: item.qty,
      price: item.price,
      discount: item.discount,
      isTaxItem: item.isTaxItem,
      taxAmount: item.taxAmount,
      item: item.Item,
      discountedAmount: item.discountedAmount,
      excludingTaxAmount: item.excludingTaxAmount,
      total: item.total,
    })) || [],
    ReceiptInvoices: backendInvoice.ReceiptInvoices?.map((ri) => ({
      invoiceId: ri.invoiceId,
      invoiceAmount: typeof ri.invoiceAmount === 'string' ? parseFloat(ri.invoiceAmount) : ri.invoiceAmount,
      paidAmount: typeof ri.paidAmount === 'string' ? parseFloat(ri.paidAmount) : ri.paidAmount,
      balanceAmount: typeof ri.balanceAmount === 'string' ? parseFloat(ri.balanceAmount) : ri.balanceAmount,
      receipt: ri.receipt ? transformReceipt(ri.receipt) : undefined
    })) || [],
    createdAt: backendInvoice.createdAt,
    updatedAt: backendInvoice.updatedAt
  };
}

export const invoicesApi = {
  async getAll(params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    customerId?: string | number
    salesPersonId?: string | number
    dateFrom?: string
    dateTo?: string
    outstanding?: boolean
  }): Promise<PaginatedResponse<Invoice>> {
    const qp = new URLSearchParams()
    if (params?.page) qp.append("page", params.page.toString())
    if (params?.limit) qp.append("limit", params.limit.toString())
    if (params?.search) qp.append("search", params.search)
    if (params?.status) qp.append("status", params.status)
    if (params?.customerId) qp.append("customerId", params.customerId.toString())
    if (params?.salesPersonId) qp.append("salesPersonId", params.salesPersonId.toString())
    if (params?.dateFrom) qp.append("dateFrom", params.dateFrom)
    if (params?.dateTo) qp.append("dateTo", params.dateTo)
    if (params?.outstanding) qp.append("outstanding", "true")

    const url = `/invoices${qp.toString() ? `?${qp.toString()}` : ""}`
    const response = await apiRequest<{ data: InvoiceResponse[]; pagination: PaginationMeta }>(url)
    return {
      data: (response.data ?? []).map(transformInvoice),
      pagination: response.pagination ?? {
        page: 1, limit: 0, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false
      },
    }
  },

  async getById(id: number | string): Promise<Invoice> {
    const response = await apiRequest<InvoiceResponse>(`/invoices/${id}`);
    return transformInvoice(response);
  },

  async create(payload: CreateInvoiceRequest): Promise<Invoice> {
    const response = await apiRequest<InvoiceResponse>("/invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return transformInvoice(response);
  },

  async update(id: number | string, payload: UpdateInvoiceRequest): Promise<Invoice> {
    const response = await apiRequest<InvoiceResponse>(`/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return transformInvoice(response);
  },

  async approveReject(id: number | string, payload: ApproveRejectInvoiceRequest): Promise<Invoice> {
    const response = await apiRequest<InvoiceResponse>(`/invoices/${id}/approve-reject`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return transformInvoice(response);
  },

  async getByCustomerId(customerId: number | string): Promise<Invoice[]> {
    const response = await apiRequest<InvoiceResponse[]>(`/invoices/customer/${customerId}`);
    return Array.isArray(response) ? response.map(transformInvoice) : [];
  },

  remove: (id: number | string) => apiRequest<void>(`/invoices/${id}`, { method: "DELETE" }),
};

// Activity Logs API
export const activityLogsApi = {
  // Admin endpoints
  getAll: (params?: {
    userId?: number
    action?: string
    resource?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const queryString = queryParams.toString()
    return apiRequest(`/activity-logs${queryString ? `?${queryString}` : ""}`)
  },

  getSummary: (params?: {
    startDate?: string
    endDate?: string
    userId?: number
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const queryString = queryParams.toString()
    return apiRequest(`/activity-logs/summary${queryString ? `?${queryString}` : ""}`)
  },

  getUserActivity: (userId: number, params?: {
    action?: string
    resource?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const queryString = queryParams.toString()
    return apiRequest(`/activity-logs/user/${userId}${queryString ? `?${queryString}` : ""}`)
  },

  cleanup: (daysToKeep: number) => apiRequest("/activity-logs/cleanup", {
    method: "DELETE",
    body: JSON.stringify({ daysToKeep })
  }),

  // User endpoints
  getMyActivity: (params?: {
    action?: string
    resource?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const queryString = queryParams.toString()
    return apiRequest(`/activity-logs/my-activity${queryString ? `?${queryString}` : ""}`)
  },
}

/* -------------------------------------------------------------------------- */
/*                               UNITS TYPES & APIS                           */
/* -------------------------------------------------------------------------- */

export interface Unit {
  id: number
  name: string
  code: string
  symbol: string
  unitType: 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'AREA' | 'COUNT' | 'TIME' | 'OTHER'
  baseUnit?: string
  conversionFactor?: number
  description?: string
  isDecimalAllowed: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdByUsername: string
  updatedByUsername: string
}

export interface CreateUnitRequest {
  name: string
  symbol: string
  unitType: 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'AREA' | 'COUNT' | 'TIME' | 'OTHER'
  baseUnit?: string
  conversionFactor?: number
  description?: string
  isDecimalAllowed: boolean
}

export interface UpdateUnitRequest {
  name?: string
  symbol?: string
  unitType?: 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'AREA' | 'COUNT' | 'TIME' | 'OTHER'
  baseUnit?: string
  conversionFactor?: number
  description?: string
  isDecimalAllowed?: boolean
  isActive?: boolean
}

export interface UnitType {
  value: string
  label: string
  description?: string
}

export interface ConvertUnitsRequest {
  fromUnitId: number
  toUnitId: number
  value: number
}

export interface ConvertUnitsResponse {
  fromUnit: Unit
  toUnit: Unit
  originalValue: number
  convertedValue: number
  formula: string
}

export const unitsApi = {
  // Get all units with optional filters
  async getAll(params?: {
    unitType?: string
    isActive?: boolean
    search?: string
    page?: number
    limit?: number
  }): Promise<{ units: Unit[], totalCount: number }> {
    const queryParams = new URLSearchParams()
    if (params?.unitType) queryParams.append('unitType', params.unitType)
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())

    const queryString = queryParams.toString()
    return apiRequest<{ units: Unit[], totalCount: number }>(`/units${queryString ? `?${queryString}` : ''}`)
  },

  // Get unit by ID
  async getById(id: number | string): Promise<Unit> {
    return apiRequest<Unit>(`/units/${id}`)
  },

  // Get active units
  async getActive(unitType?: string): Promise<Unit[]> {
    const queryParams = new URLSearchParams()
    if (unitType) queryParams.append('unitType', unitType)

    const queryString = queryParams.toString()
    const response = await apiRequest<unknown>(`/units/active${queryString ? `?${queryString}` : ''}`)

    // Handle wrapped response format
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data: Unit[] }).data
    }

    // Handle direct array response
    if (Array.isArray(response)) {
      return response as Unit[]
    }

    // Fallback to empty array
    console.warn('Unexpected units response format:', response)
    return []
  },

  // Get unit types
  async getTypes(): Promise<UnitType[]> {
    return apiRequest<UnitType[]>('/units/types')
  },

  // Create new unit
  async create(unitData: CreateUnitRequest): Promise<Unit> {
    return apiRequest<Unit>('/units', {
      method: 'POST',
      body: JSON.stringify(unitData),
    })
  },

  // Update unit
  async update(id: number | string, unitData: UpdateUnitRequest): Promise<Unit> {
    return apiRequest<Unit>(`/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(unitData),
    })
  },

  // Delete unit
  async remove(id: number | string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/units/${id}`, {
      method: 'DELETE',
    })
  },

  // Convert units
  async convert(conversionData: ConvertUnitsRequest): Promise<ConvertUnitsResponse> {
    return apiRequest<ConvertUnitsResponse>('/units/convert', {
      method: 'POST',
      body: JSON.stringify(conversionData),
    })
  },
}

/* -------------------------------------------------------------------------- */
/*                           PRODUCTION TYPES & APIS                          */
/* -------------------------------------------------------------------------- */

// Production Config Types
export interface ProductionConfig {
  id?: number
  locationId: number
  rawMaterialStoreId: number
  outputStoreId: number
  finishedGoodsStoreId?: number  // Keep for backward compatibility
  wasteStoreId?: number          // Keep for backward compatibility
  description?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  createdBy?: number
  updatedBy?: number
  createdByUsername?: string
  updatedByUsername?: string
  Location?: Location
  RawMaterialStore?: Store
  OutputStore?: Store
  FinishedGoodsStore?: Store  // Keep for backward compatibility
  WasteStore?: Store          // Keep for backward compatibility
  Creator?: { id: number; username: string }
  Updater?: { id: number; username: string }
}

export interface CreateProductionConfigRequest {
  locationId: number
  rawMaterialStoreId: number
  outputStoreId: number
  finishedGoodsStoreId?: number  // Keep for backward compatibility
  wasteStoreId?: number          // Keep for backward compatibility
  description?: string
  isActive?: boolean
}

export interface UpdateProductionConfigRequest {
  locationId?: number
  rawMaterialStoreId?: number
  outputStoreId?: number
  finishedGoodsStoreId?: number  // Keep for backward compatibility
  wasteStoreId?: number          // Keep for backward compatibility
  description?: string
  isActive?: boolean
}

// BOM (Bill of Materials) Types
export interface BOM {
  id?: number
  bomCode?: string
  itemId: number
  locationId: number
  qty: string | number
  version: string
  isActive: boolean
  totalCost?: string
  createdAt?: string
  updatedAt?: string
  createdBy?: number
  updatedBy?: number
  createdByUsername?: string
  updatedByUsername?: string
  Item?: Item
  Location?: Location
  BOMItems?: BOMItem[]
  Creator?: { id: number; username: string }
  Updater?: { id: number; username: string }
}

export interface CreateBOMRequest {
  itemId: number
  locationId: number
  qty: number
  version: string
  bomCode: string
  isActive?: boolean
  items?: CreateBOMItemRequest[]
}

export interface UpdateBOMRequest {
  itemId?: number
  locationId?: number
  qty?: number
  version?: string
  bomCode?: string
  isActive?: boolean
  items?: (CreateBOMItemRequest & { id?: number })[]
  removeItems?: number[]
}

// BOM Item Types
export interface BOMItem {
  id?: number
  bomId?: number
  itemId: number
  quantity: string | number
  cost: string | number
  totalCost?: string
  wastagePercentage?: string | number
  sequence?: number
  remark?: string
  unit?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  createdBy?: number
  updatedBy?: number
  createdByUsername?: string
  updatedByUsername?: string
  BOM?: BOM
  Item?: Item
}

export interface CreateBOMItemRequest {
  itemId: number
  quantity: number
  cost: number
  wastagePercentage?: number
  sequence?: number
  remark?: string
}

export interface UpdateBOMItemRequest {
  quantity?: number
  cost?: number
  wastagePercentage?: number
  sequence?: number
  remark?: string
}

export interface BOMCalculationResult {
  item: {
    id: number
    name: string
    quantity: number
    cost: number
    totalCost: number
    wastagePercentage: number
    wastageQuantity: number
    finalQuantity: number
  }[]
  summary: {
    totalItems: number
    totalCost: number
    totalWastage: number
    productionQuantity: number
  }
}

// Production Order Types
export interface ProductionOrder {
  id?: number
  code: string  // This is the actual field name for order number
  orderNumber?: string  // Keep for backward compatibility
  itemId: number
  bomId: number
  batchId?: number | null
  locationId: number
  plannedQuantity: string | number
  produceQuantity?: string | number
  actualQuantity?: number  // Keep for compatibility
  wastageQuantity?: string | number
  date: string
  startDate?: string | null
  endDate?: string | null
  plannedStartDate?: string  // Keep for compatibility
  plannedEndDate?: string  // Keep for compatibility
  actualStartDate?: string
  actualEndDate?: string
  status: "planned" | "in_progress" | "completed" | "cancelled" | "on_hold" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD"
  priority: "low" | "medium" | "high" | "urgent" | "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  notes?: string | null
  estimatedCost?: string | number
  actualCost?: string | number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  createdBy?: number
  updatedBy?: number
  createdByUsername?: string
  updatedByUsername?: string
  Item?: Item & {
    sku?: string
    barcode?: string
    categoryId?: number
    temperature?: string | null
    unit?: string
    country?: string | null
    color?: string | null
    weight?: string | null
    sellingPrice?: number
    reorderLevelQty?: number
    reorderDateRange?: string | null
    overstockLevelQty?: number | null
    overstockDateRange?: string | null
    itemsPerBox?: number
    leadTimeDays?: number
    image?: string
    doNotAllowDirectSale?: boolean
    allowsMinus?: boolean
    isProductionRawMaterial?: boolean
    status?: string
    Category?: { id: number; name: string }
  }
  BOM?: BOM & {
    totalCost?: string
  }
  Batch?: any
  Location?: Location
  Creator?: { id: number; username: string }
  Updater?: { id: number; username: string }
  ProductionOrderItems?: ProductionOrderItemDetailed[]
  productionOrderItems?: ProductionOrderItem[]  // Keep for backward compatibility
  user?: { id: number; username?: string }
}

export interface ProductionOrderItemDetailed {
  id?: number
  productionOrderId?: number
  bomId?: number | null
  itemId: number
  quantity: string | number
  unit?: string
  cost?: string | number
  totalCost?: string | number
  remark?: string
  sequence?: number
  wastageQuantity?: string | number
  status?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  createdBy?: number
  updatedBy?: number
  Item?: {
    id: number
    name: string
    sku?: string
  }
  BOM?: any
}

export interface ProductionOrderItem {
  itemId: number
  quantity: number
  unit?: string
  cost?: number
  remark?: string
  sequence?: number
  wastageQuantity?: number
  status?: string
}

export interface CreateProductionOrderRequest {
  itemId: number
  bomId: number
  plannedQuantity: number
  locationId: number
  productionOrderItems?: ProductionOrderItem[]
}

export interface UpdateProductionOrderRequest {
  code?: string
  orderNumber?: string
  itemId?: number
  bomId?: number
  locationId?: number
  plannedQuantity?: string | number
  actualQuantity?: number
  produceQuantity?: string | number
  startDate?: string
  endDate?: string
  plannedStartDate?: string
  plannedEndDate?: string
  actualStartDate?: string
  actualEndDate?: string
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD" | "planned" | "in_progress" | "completed" | "cancelled" | "on_hold"
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "low" | "medium" | "high" | "urgent"
  notes?: string
}

export interface UpdateProductionOrderStatusRequest {
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD"
  actualStartDate?: string
  actualEndDate?: string
  actualQuantity?: number
}

// Production Config APIs
export const productionConfigsApi = {
  /** GET /production-configs - Get all production configs with pagination */
  async getAll(params?: {
    page?: number
    limit?: number
    search?: string
    locationId?: number
    isActive?: boolean
  }): Promise<ProductionConfig[]> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())

    const url = `/production-configs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiRequest<ProductionConfig[]>(url)
  },

  /** GET /production-configs/:id - Get production config by ID */
  async getById(id: number | string): Promise<ProductionConfig> {
    return apiRequest<ProductionConfig>(`/production-configs/${id}`)
  },

  /** POST /production-configs - Create new production config */
  async create(payload: CreateProductionConfigRequest): Promise<ProductionConfig> {
    return apiRequest<ProductionConfig>("/production-configs", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /** PUT /production-configs/:id - Update production config */
  async update(id: number | string, payload: UpdateProductionConfigRequest): Promise<ProductionConfig> {
    return apiRequest<ProductionConfig>(`/production-configs/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  /** DELETE /production-configs/:id - Delete production config */
  async remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/production-configs/${id}`, {
      method: "DELETE",
    })
  },

  /** GET /production-configs/location/:locationId - Get configs by location */
  async getByLocation(locationId: number | string): Promise<ProductionConfig[]> {
    return apiRequest<ProductionConfig[]>(`/production-configs/location/${locationId}`)
  },
}

// BOM APIs
export const bomsApi = {
  /** GET /boms - Get all BOMs with pagination */
  async getAll(params?: {
    page?: number
    limit?: number
    search?: string
    itemId?: number
    locationId?: number
    isActive?: boolean
  }): Promise<BOM[]> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.itemId) queryParams.append('itemId', params.itemId.toString())
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())

    const url = `/boms${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiRequest<BOM[]>(url)
  },

  /** GET /boms/:id - Get BOM by ID with items */
  async getById(id: number | string): Promise<BOM> {
    return apiRequest<BOM>(`/boms/${id}`)
  },

  /** POST /boms - Create new BOM (simple or with items) */
  async create(payload: CreateBOMRequest): Promise<BOM> {
    return apiRequest<BOM>("/boms", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /** PUT /boms/:id - Update BOM (simple or with items management) */
  async update(id: number | string, payload: UpdateBOMRequest): Promise<BOM> {
    return apiRequest<BOM>(`/boms/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  /** DELETE /boms/:id - Delete BOM */
  async remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/boms/${id}`, {
      method: "DELETE",
    })
  },

  /** GET /boms/item/:itemId - Get BOMs by item */
  async getByItem(itemId: number | string): Promise<BOM[]> {
    return apiRequest<BOM[]>(`/boms/item/${itemId}`)
  },

  /** POST /boms/:id/items - Add item to BOM */
  async addItem(bomId: number | string, payload: CreateBOMItemRequest): Promise<BOMItem> {
    return apiRequest<BOMItem>(`/boms/${bomId}/items`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /** PUT /boms/:bomId/items/:itemId - Update BOM item */
  async updateItem(bomId: number | string, itemId: number | string, payload: UpdateBOMItemRequest): Promise<BOMItem> {
    return apiRequest<BOMItem>(`/boms/${bomId}/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  /** DELETE /boms/:bomId/items/:itemId - Remove item from BOM */
  async removeItem(bomId: number | string, itemId: number | string): Promise<void> {
    return apiRequest<void>(`/boms/${bomId}/items/${itemId}`, {
      method: "DELETE",
    })
  },

  /** GET /boms/:id/calculate-requirements - Calculate material requirements */
  async calculateRequirements(bomId: number | string, productionQuantity: number): Promise<BOMCalculationResult> {
    return apiRequest<BOMCalculationResult>(`/boms/${bomId}/calculate-requirements?productionQuantity=${productionQuantity}`)
  },

  /** POST /boms/:id/duplicate - Duplicate BOM */
  async duplicate(bomId: number | string, payload: {
    newItemId: number
    newVersion: string
    newName: string
  }): Promise<BOM> {
    return apiRequest<BOM>(`/boms/${bomId}/duplicate`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },
}

// BOM Items APIs (integrated into BOM API but kept for backward compatibility)
export const bomItemsApi = {
  /** GET /bom-items/bom/:bomId - Get all items for a specific BOM */
  async getByBom(bomId: number | string): Promise<BOMItem[]> {
    const bom = await bomsApi.getById(bomId)
    return bom.BOMItems || []
  },

  /** POST /bom-items - Create new BOM item (via BOM API) */
  async create(payload: CreateBOMItemRequest & { bomId: number }): Promise<BOMItem> {
    return bomsApi.addItem(payload.bomId, payload)
  },

  /** PUT /bom-items/:id - Update BOM item (via BOM API) */
  async update(id: number | string, payload: UpdateBOMItemRequest & { bomId: number }): Promise<BOMItem> {
    return bomsApi.updateItem(payload.bomId, id, payload)
  },

  /** DELETE /bom-items/:id - Delete BOM item (via BOM API) */
  async remove(id: number | string, bomId: number): Promise<void> {
    return bomsApi.removeItem(bomId, id)
  },
}

// Production Orders APIs
export const productionOrdersApi = {
  /** GET /production-orders - Get all production orders with pagination */
  async getAll(params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    priority?: string
    locationId?: number
    itemId?: number
  }): Promise<ProductionOrder[]> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.priority) queryParams.append('priority', params.priority)
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())
    if (params?.itemId) queryParams.append('itemId', params.itemId.toString())

    const url = `/production-orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiRequest<ProductionOrder[]>(url)
  },

  /** GET /production-orders/:id - Get production order by ID */
  async getById(id: number | string): Promise<ProductionOrder> {
    return apiRequest<ProductionOrder>(`/production-orders/${id}`)
  },

  /** POST /production-orders - Create new production order */
  async create(payload: CreateProductionOrderRequest): Promise<ProductionOrder> {
    return apiRequest<ProductionOrder>("/production-orders", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /** PUT /production-orders/:id - Update production order */
  async update(id: number | string, payload: UpdateProductionOrderRequest): Promise<ProductionOrder> {
    return apiRequest<ProductionOrder>(`/production-orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  /** DELETE /production-orders/:id - Delete production order */
  async remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/production-orders/${id}`, {
      method: "DELETE",
    })
  },

  /** GET /production-orders/status/:status - Get orders by status */
  async getByStatus(status: string): Promise<ProductionOrder[]> {
    return apiRequest<ProductionOrder[]>(`/production-orders/status/${status}`)
  },

  /** PATCH /production-orders/:id/status - Update production order status */
  async updateStatus(id: number | string, payload: UpdateProductionOrderStatusRequest): Promise<ProductionOrder> {
    return apiRequest<ProductionOrder>(`/production-orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  },

  /** GET /production-orders/location/:locationId - Get orders by location */
  async getByLocation(locationId: number | string): Promise<ProductionOrder[]> {
    return apiRequest<ProductionOrder[]>(`/production-orders/location/${locationId}`)
  },

  /** GET /production-orders/date-range - Get orders by date range */
  async getByDateRange(params: {
    startDate: string
    endDate: string
  }): Promise<ProductionOrder[]> {
    const queryParams = new URLSearchParams()
    queryParams.append('startDate', params.startDate)
    queryParams.append('endDate', params.endDate)

    return apiRequest<ProductionOrder[]>(`/production-orders/date-range?${queryParams.toString()}`)
  },
}

/* -------------------------------------------------------------------------- */
/*                            RETURN TYPES TYPES & APIS                       */
/* -------------------------------------------------------------------------- */

export interface ReturnType {
  id: number
  name: string
  code: string
  description?: string
  isRefundable: boolean
  isReplaceable: boolean
  priority: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdByUsername: string
  updatedByUsername: string
}

export interface CreateReturnTypeRequest {
  name: string
  description?: string
  isRefundable: boolean
  isReplaceable: boolean
  priority: number
}

export interface UpdateReturnTypeRequest {
  name?: string
  description?: string
  isRefundable?: boolean
  isReplaceable?: boolean
  priority?: number
  isActive?: boolean
}

export const returnTypesApi = {
  // Get all return types with optional filters
  async getAll(params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }): Promise<{ returnTypes: ReturnType[], totalCount: number }> {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())

    const queryString = queryParams.toString()
    return apiRequest<{ returnTypes: ReturnType[], totalCount: number }>(`/return-types${queryString ? `?${queryString}` : ''}`)
  },

  // Get return type by ID
  async getById(id: number | string): Promise<ReturnType> {
    return apiRequest<ReturnType>(`/return-types/${id}`)
  },

  // Get active return types
  async getActive(): Promise<ReturnType[]> {
    const response = await apiRequest<unknown>('/return-types/active')

    // Handle wrapped response format
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data: ReturnType[] }).data
    }

    // Handle direct array response
    if (Array.isArray(response)) {
      return response as ReturnType[]
    }

    // Fallback to empty array
    console.warn('Unexpected return types response format:', response)
    return []
  },

  // Create new return type
  async create(returnTypeData: CreateReturnTypeRequest): Promise<ReturnType> {
    return apiRequest<ReturnType>('/return-types', {
      method: 'POST',
      body: JSON.stringify(returnTypeData),
    })
  },

  // Update return type
  async update(id: number | string, returnTypeData: UpdateReturnTypeRequest): Promise<ReturnType> {
    return apiRequest<ReturnType>(`/return-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(returnTypeData),
    })
  },

  // Delete return type
  async remove(id: number | string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/return-types/${id}`, {
      method: 'DELETE',
    })
  },
}

/* -------------------------------------------------------------------------- */
/*                      CUSTOMER ITEM CODES TYPES & APIS                      */
/* -------------------------------------------------------------------------- */

export interface CustomerItemCode {
  id?: number
  customerId: number
  itemId: number
  code: string
  locationId: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  createdByUsername?: string
  updatedByUsername?: string
  Customer?: Customer
  Item?: Item
  Location?: Location
}

export interface CreateCustomerItemCodeRequest {
  customerId: number
  itemId: number
  code: string
  locationId: number
  isActive?: boolean
}

export interface UpdateCustomerItemCodeRequest {
  code?: string
  isActive?: boolean
}

export interface CustomerItemCodeResponse {
  customerItemCodes: CustomerItemCode[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
  }
}

export const customerItemCodesApi = {
  // Get all customer item codes with pagination and filtering
  async getAll(params?: {
    page?: number
    limit?: number
    customerId?: number
    itemId?: number
    locationId?: number
    isActive?: boolean
    search?: string
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
  }): Promise<CustomerItemCodeResponse> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.customerId) queryParams.append('customerId', params.customerId.toString())
    if (params?.itemId) queryParams.append('itemId', params.itemId.toString())
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    const queryString = queryParams.toString()
    return apiRequest<CustomerItemCodeResponse>(`/customer-item-codes${queryString ? `?${queryString}` : ''}`)
  },

  // Get customer item code by ID
  async getById(id: number | string): Promise<CustomerItemCode> {
    return apiRequest<CustomerItemCode>(`/customer-item-codes/${id}`)
  },

  // Create new customer item code
  async create(data: CreateCustomerItemCodeRequest): Promise<CustomerItemCode> {
    return apiRequest<CustomerItemCode>('/customer-item-codes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update customer item code
  async update(id: number | string, data: UpdateCustomerItemCodeRequest): Promise<CustomerItemCode> {
    return apiRequest<CustomerItemCode>(`/customer-item-codes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete customer item code
  async remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/customer-item-codes/${id}`, {
      method: 'DELETE',
    })
  },

  // Get customer item codes by customer ID
  async getByCustomerId(customerId: number | string, params?: {
    isActive?: boolean
    locationId?: number
  }): Promise<CustomerItemCode[]> {
    const queryParams = new URLSearchParams()
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())

    const queryString = queryParams.toString()
    return apiRequest<CustomerItemCode[]>(`/customer-item-codes/customer/${customerId}${queryString ? `?${queryString}` : ''}`)
  },

  // Get customer item codes by item ID
  async getByItemId(itemId: number | string, params?: {
    isActive?: boolean
    locationId?: number
  }): Promise<CustomerItemCode[]> {
    const queryParams = new URLSearchParams()
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())

    const queryString = queryParams.toString()
    return apiRequest<CustomerItemCode[]>(`/customer-item-codes/item/${itemId}${queryString ? `?${queryString}` : ''}`)
  },

  // Get customer item code by combination (customer + item + location)
  async getByCombination(customerId: number | string, itemId: number | string, locationId: number | string): Promise<CustomerItemCode> {
    return apiRequest<CustomerItemCode>(`/customer-item-codes/customer/${customerId}/item/${itemId}/location/${locationId}`)
  },

  // Bulk create/update customer item codes
  async bulkCreateUpdate(data: {
    customerItemCodes: CreateCustomerItemCodeRequest[]
  }): Promise<{
    created: CustomerItemCode[]
    updated: CustomerItemCode[]
    errors: any[]
  }> {
    return apiRequest<{
      created: CustomerItemCode[]
      updated: CustomerItemCode[]
      errors: any[]
    }>('/customer-item-codes/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Search customer item codes
  async search(params: {
    search: string
    page?: number
    limit?: number
  }): Promise<CustomerItemCodeResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('search', params.search)
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())

    return apiRequest<CustomerItemCodeResponse>(`/customer-item-codes?${queryParams.toString()}`)
  },
}

/* -------------------------------------------------------------------------- */
/*                         SUPPLIER RETURNS TYPES & APIS                      */
/* -------------------------------------------------------------------------- */

export interface SupplierReturnItem {
  id?: number
  supplierReturnId?: number
  itemId: number
  batchId?: number
  quantity: number
  unitPrice: number
  totalPrice: number
  unitId: number
  condition: string
  expiryDate?: string
  serialNumbers?: string
  reason?: string
  disposition: string
  isRefundable: boolean
  refundAmount?: number
  coldRoomId?: number
  palletRackId?: number
  notes?: string
  createdAt?: string
  createdBy?: number
  updatedAt?: string
  updatedBy?: number
  item?: Item
  batch?: Batch
  unit?: Unit
  // Backend response properties
  Item?: Item
}

export interface SupplierReturn {
  id?: number
  returnNumber?: string
  supplierId: number
  purchaseOrderId?: number
  grnId?: number
  returnDate?: string
  returnTypeId: number
  reason: string
  notes?: string
  locationId: number
  storeId: number
  status?: "Pending" | "Processing" | "Approved" | "Completed" | "Cancelled"
  totalAmount?: number | string
  currency?: string
  refundAmount?: number | string
  refundStatus?: string
  approvedBy?: number
  approvedDate?: string
  createdBy?: number
  updatedBy?: number
  items?: SupplierReturnItem[]
  // Frontend convenience properties (lowercase)
  supplier?: Supplier
  purchaseOrder?: PurchaseOrder
  grn?: GRN
  returnType?: ReturnType
  location?: Location
  store?: Store
  // Backend response properties (capitalized)
  Supplier?: Supplier
  PurchaseOrder?: PurchaseOrder
  GRN?: GRN
  ReturnType?: ReturnType
  Location?: Location
  Store?: Store
  Creator?: { id: number; username: string }
  Updater?: { id: number; username: string }
  createdAt?: string
  updatedAt?: string
  createdByUsername?: string
  updatedByUsername?: string
}

export interface CreateSupplierReturnRequest {
  supplierId: number
  purchaseOrderId?: number
  grnId?: number
  returnTypeId: number
  reason: string
  notes?: string
  locationId: number
  storeId: number
  items?: SupplierReturnItem[]
}

export interface UpdateSupplierReturnRequest {
  status?: string
  notes?: string
  refundAmount?: number
}

export interface SupplierReturnStatsResponse {
  totalReturns: number
  totalAmount: number
  averageReturnValue: number
  returnsByStatus: Array<{
    status: string
    count: number
    totalAmount: number
  }>
  returnsBySupplier: Array<{
    supplier: Supplier
    count: number
    totalAmount: number
  }>
}

// Transform backend supplier return response to frontend format
function transformSupplierReturn(backendReturn: any): SupplierReturn {
  return {
    ...backendReturn,
    // Convert string amounts to numbers
    totalAmount: backendReturn.totalAmount ? parseFloat(backendReturn.totalAmount.toString()) : undefined,
    refundAmount: backendReturn.refundAmount ? parseFloat(backendReturn.refundAmount.toString()) : undefined,
    // Map capitalized backend properties to lowercase frontend properties
    supplier: backendReturn.Supplier,
    purchaseOrder: backendReturn.PurchaseOrder,
    grn: backendReturn.GRN,
    returnType: backendReturn.ReturnType,
    location: backendReturn.Location,
    store: backendReturn.Store,
    // Transform SupplierReturnItems to items
    items: backendReturn.SupplierReturnItems?.map((item: any) => ({
      id: item.id,
      itemId: item.itemId,
      batchId: item.batchId,
      quantity: parseFloat(item.quantity?.toString() || '0'),
      unitPrice: parseFloat(item.unitPrice?.toString() || '0'),
      totalPrice: parseFloat(item.totalPrice?.toString() || '0'),
      unitId: item.unitId,
      condition: item.condition,
      expiryDate: item.expiryDate,
      serialNumbers: item.serialNumbers,
      reason: item.reason,
      disposition: item.disposition,
      isRefundable: item.isRefundable,
      refundAmount: parseFloat(item.refundAmount?.toString() || '0'),
      coldRoomId: item.coldRoomId,
      palletRackId: item.palletRackId,
      notes: item.notes,
      // Map Item information
      item: item.Item,
    })) || [],
    // Map user information
    createdByUsername: backendReturn.Creator?.username,
    updatedByUsername: backendReturn.Updater?.username,
  }
}

export const supplierReturnsApi = {
  // Get all supplier returns with filtering
  async getAll(params?: {
    page?: number
    limit?: number
    status?: string
    supplierId?: number
    locationId?: number
  }): Promise<SupplierReturn[]> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId.toString())
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())

    const queryString = queryParams.toString()
    const response = await apiRequest<unknown>(`/supplier-returns${queryString ? `?${queryString}` : ''}`)

    console.log('Raw supplier returns API response:', response)

    // Handle wrapped response format with "returns" property
    if (response && typeof response === 'object' && 'returns' in response) {
      const returnsArray = (response as { returns: any[] }).returns
      console.log('Found returns array with length:', returnsArray.length)
      return returnsArray.map(transformSupplierReturn)
    }

    // Handle wrapped response format with "data" property
    if (response && typeof response === 'object' && 'data' in response) {
      const dataArray = (response as { data: any[] }).data
      return dataArray.map(transformSupplierReturn)
    }

    // Handle direct array response
    if (Array.isArray(response)) {
      return response.map(transformSupplierReturn)
    }

    // Fallback to empty array
    console.warn('Unexpected supplier returns response format:', response)
    return []
  },

  // Get supplier return by ID
  async getById(id: number | string): Promise<SupplierReturn> {
    const response = await apiRequest<any>(`/supplier-returns/${id}`)
    return transformSupplierReturn(response)
  },

  // Create new supplier return
  async create(payload: CreateSupplierReturnRequest): Promise<SupplierReturn> {
    const response = await apiRequest<any>('/supplier-returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return transformSupplierReturn(response)
  },

  // Update supplier return
  async update(id: number | string, payload: UpdateSupplierReturnRequest): Promise<SupplierReturn> {
    const response = await apiRequest<any>(`/supplier-returns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return transformSupplierReturn(response)
  },

  // Approve supplier return
  async approve(id: number | string, payload: { status: string; notes?: string }): Promise<SupplierReturn> {
    const response = await apiRequest<any>(`/supplier-returns/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return transformSupplierReturn(response)
  },

  // Get supplier return statistics
  async getStats(params?: {
    startDate?: string
    endDate?: string
    supplierId?: number
    locationId?: number
  }): Promise<SupplierReturnStatsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId.toString())
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())

    const queryString = queryParams.toString()
    return apiRequest<SupplierReturnStatsResponse>(`/supplier-returns/stats${queryString ? `?${queryString}` : ''}`)
  },

  // Delete supplier return
  async remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/supplier-returns/${id}`, {
      method: 'DELETE',
    })
  },
}

/* -------------------------------------------------------------------------- */
/*                         SUPPLIER PAYMENTS TYPES & APIS                     */
/* -------------------------------------------------------------------------- */

export interface BankDetails {
  bankName: string
  accountNumber: string
  branchCode?: string
}

export interface SupplierAccountDetails {
  bankName: string
  accountNumber: string
  accountHolder: string
}

export interface PaymentGRN {
  id: number
  grnId: number
  grnAmount: number
  paidAmount: number
  pendingAmount: number
  GRN?: {
    id: number
    grnNumber: string
    grnDate: string
    status: string
    totalAmount: number
  }
}

export interface SupplierPayment {
  id?: number
  paymentNumber?: string
  supplierId: number
  purchaseOrderId?: number
  grnId?: number
  supplierReturnId?: number
  paymentDate?: string
  paymentType: string
  paymentMethod: string
  amount: number
  currency: "LKR" | "USD" | string
  exchangeRate: number
  amountInBaseCurrency?: number
  referenceNumber?: string
  bankDetails?: BankDetails
  supplierAccountDetails?: SupplierAccountDetails
  chequeNumber?: string
  chequeDate?: string
  bankAccountId?: number
  dueDate?: string
  paidDate?: string
  status?: "Pending" | "Approved" | "Processed" | "Cancelled" | "Rejected"
  notes?: string
  attachments?: string
  approvedBy?: number
  approvedDate?: string
  processedBy?: number
  processedDate?: string
  reconciled?: boolean
  reconciledDate?: string
  locationId: number
  createdBy?: number
  updatedBy?: number
  // Frontend convenience properties (lowercase)
  supplier?: Supplier
  purchaseOrder?: PurchaseOrder
  grn?: GRN
  supplierReturn?: SupplierReturn
  location?: Location
  // Backend response properties (capitalized)
  Supplier?: Supplier
  PurchaseOrder?: PurchaseOrder
  GRN?: GRN
  SupplierReturn?: SupplierReturn
  Creator?: { id: number; username: string }
  ApprovedByUser?: { id: number; username: string }
  createdAt?: string
  updatedAt?: string
  createdByUsername?: string
  updatedByUsername?: string
  PaymentGRNs?: PaymentGRN[]
  PaymentMethods?: SupplierPaymentMethod[]
}

export interface SupplierPaymentMethod {
  id: number
  paymentTypeId: number
  paymentAmount: number
  ledgerAccountId: number
  referenceNo?: string | null
  bankId?: number | null
  bankBranchId?: number | null
  cardType?: string | null
  chequeNo?: string | null
  chequeDate?: string | null
  isActive: boolean
  PaymentType?: {
    id: number
    paymentTypeName: string
  }
}

export interface SupplierPaymentMethodRequest {
  paymentTypeId: number
  paymentAmount: number
  ledgerAccountId: number
  referenceNumber?: string
  cardType?: string
  bankId?: number
  bankBranchId?: number
  chequeNo?: string
  chequeDate?: string
}

export interface CreateSupplierPaymentRequest {
  supplierId: number
  purchaseOrderId?: number
  grnId?: number
  paymentType?: string
  paymentMethod?: string
  amount: number
  currency?: "LKR" | "USD"
  exchangeRate?: number
  referenceNumber?: string
  bankDetails?: BankDetails
  supplierAccountDetails?: SupplierAccountDetails
  dueDate?: string
  notes?: string
  locationId: number
  paymentGRNs?: Array<{
    grnId: number
    grnAmount: number
    paidAmount: number
    notes?: string
  }>
  paymentMethods?: SupplierPaymentMethodRequest[]
}

export interface UpdateSupplierPaymentRequest {
  status?: string
  referenceNumber?: string
  notes?: string
}

export interface ProcessSupplierPaymentRequest {
  paidDate: string
  referenceNumber: string
  notes?: string
}

export interface CancelSupplierPaymentRequest {
  reason: string
}

export interface OutstandingPaymentResponse {
  supplierId: number
  supplier: Supplier
  outstandingPayments: Array<{
    purchaseOrderId: number
    grnId: number
    amount: number
    dueDate: string
    overdueDays: number
  }>
  totalOutstanding: number
  overdueAmount: number
}

export interface OutstandingGRN {
  id: number | null
  grnAmount: number
  paidAmount: number
  pendingAmount: number
  currency: string
  notes?: string | null
  isUnpaid: boolean
  SupplierPayment?: {
    id: number
    paymentNumber: string
    supplierId: number
    amount: number
    amountInBaseCurrency: number
    paymentDate: string
    status: string
    Supplier?: Supplier
    Location?: Location
  } | null
  GRN?: {
    id: number
    grnNumber: string
    grnDate: string
    status: string
  }
  Supplier?: Supplier
  Location?: Location
}

export interface OutstandingGRNsResponse {
  outstandingGRNs: OutstandingGRN[]
  summary: {
    totalOutstandingGRNs: number
    incompletePaymentGRNs: number
    unpaidGRNs: number
    totalGRNAmount: number
    totalPaidAmount: number
    totalPendingAmount: number
  }
}

export interface SupplierPaymentPagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface SupplierPaymentsResponse {
  payments: SupplierPayment[]
  pagination: SupplierPaymentPagination
}

export interface SupplierPaymentStatsResponse {
  totalPayments: number
  totalAmount: number
  averagePaymentAmount: number
  paymentsByStatus: Array<{
    status: string
    count: number
    totalAmount: number
  }>
  paymentsByMethod: Array<{
    method: string
    count: number
    totalAmount: number
  }>
  paymentsBySupplier: Array<{
    supplier: Supplier
    count: number
    totalAmount: number
  }>
}

// Transform backend supplier payment response to frontend format
function transformSupplierPayment(backendPayment: any): SupplierPayment {
  return {
    ...backendPayment,
    // Convert string amounts to numbers
    amount: typeof backendPayment.amount === 'string' ? parseFloat(backendPayment.amount) : backendPayment.amount,
    exchangeRate: typeof backendPayment.exchangeRate === 'string' ? parseFloat(backendPayment.exchangeRate) : backendPayment.exchangeRate,
    amountInBaseCurrency: typeof backendPayment.amountInBaseCurrency === 'string' ? parseFloat(backendPayment.amountInBaseCurrency) : backendPayment.amountInBaseCurrency,
    // Transform PaymentGRNs and convert string amounts to numbers
    PaymentGRNs: backendPayment.PaymentGRNs?.map((pg: any) => ({
      ...pg,
      grnAmount: typeof pg.grnAmount === 'string' ? parseFloat(pg.grnAmount) : pg.grnAmount,
      paidAmount: typeof pg.paidAmount === 'string' ? parseFloat(pg.paidAmount) : pg.paidAmount,
      pendingAmount: typeof pg.pendingAmount === 'string' ? parseFloat(pg.pendingAmount) : pg.pendingAmount,
      GRN: pg.GRN ? {
        ...pg.GRN,
        totalAmount: typeof pg.GRN.totalAmount === 'string' ? parseFloat(pg.GRN.totalAmount) : pg.GRN.totalAmount,
      } : undefined,
    })),
    // Map backend properties to frontend convenience properties
    supplier: backendPayment.Supplier,
    purchaseOrder: backendPayment.PurchaseOrder,
    grn: backendPayment.GRN,
    supplierReturn: backendPayment.SupplierReturn,
    createdByUsername: backendPayment.Creator?.username,
    updatedByUsername: backendPayment.Creator?.username, // Using Creator as fallback
  }
}

export const supplierPaymentsApi = {
  // Get all supplier payments with filtering
  async getAll(params?: {
    page?: number
    limit?: number
    status?: string
    supplierId?: number
    paymentType?: string
    paymentMethod?: string
    startDate?: string
    endDate?: string
  }): Promise<SupplierPayment[]> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId.toString())
    if (params?.paymentType) queryParams.append('paymentType', params.paymentType)
    if (params?.paymentMethod) queryParams.append('paymentMethod', params.paymentMethod)
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)

    const queryString = queryParams.toString()
    const response = await apiRequest<unknown>(`/supplier-payments${queryString ? `?${queryString}` : ''}`)

    // Handle wrapped response format with "payments" property and pagination
    if (response && typeof response === 'object' && 'payments' in response) {
      const paymentsResponse = response as SupplierPaymentsResponse
      return paymentsResponse.payments.map(transformSupplierPayment)
    }

    // Handle wrapped response format with "data" property
    if (response && typeof response === 'object' && 'data' in response) {
      const payments = (response as { data: any[] }).data
      return payments.map(transformSupplierPayment)
    }

    // Handle direct array response
    if (Array.isArray(response)) {
      return (response as any[]).map(transformSupplierPayment)
    }

    // Fallback to empty array
    console.warn('Unexpected supplier payments response format:', response)
    return []
  },

  // Get supplier payment by ID
  async getById(id: number | string): Promise<SupplierPayment> {
    const response = await apiRequest<any>(`/supplier-payments/${id}`)
    return transformSupplierPayment(response)
  },

  // Create new supplier payment
  async create(payload: CreateSupplierPaymentRequest): Promise<SupplierPayment> {
    const response = await apiRequest<any>('/supplier-payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return transformSupplierPayment(response)
  },

  // Update supplier payment
  async update(id: number | string, payload: UpdateSupplierPaymentRequest): Promise<SupplierPayment> {
    const response = await apiRequest<any>(`/supplier-payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return transformSupplierPayment(response)
  },

  // Approve supplier payment
  async approve(id: number | string, payload: { notes?: string }): Promise<SupplierPayment> {
    const response = await apiRequest<any>(`/supplier-payments/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return transformSupplierPayment(response)
  },

  // Process supplier payment
  async process(id: number | string, payload: ProcessSupplierPaymentRequest): Promise<SupplierPayment> {
    const response = await apiRequest<any>(`/supplier-payments/${id}/process`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return transformSupplierPayment(response)
  },

  // Cancel supplier payment
  async cancel(id: number | string, payload: CancelSupplierPaymentRequest): Promise<SupplierPayment> {
    const response = await apiRequest<any>(`/supplier-payments/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return transformSupplierPayment(response)
  },

  // Get outstanding payments
  async getOutstanding(params?: {
    supplierId?: number
    locationId?: number
  }): Promise<OutstandingPaymentResponse[]> {
    const queryParams = new URLSearchParams()
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId.toString())
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())

    const queryString = queryParams.toString()
    return apiRequest<OutstandingPaymentResponse[]>(`/supplier-payments/outstanding${queryString ? `?${queryString}` : ''}`)
  },

  // Get outstanding GRNs for a supplier
  async getOutstandingGRNs(supplierId: number): Promise<OutstandingGRNsResponse> {
    return apiRequest<OutstandingGRNsResponse>(`/supplier-payments/outstanding-grns?supplierId=${supplierId}`)
  },

  // Get supplier payment statistics
  async getStats(params?: {
    startDate?: string
    endDate?: string
    supplierId?: number
    locationId?: number
  }): Promise<SupplierPaymentStatsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId.toString())
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())

    const queryString = queryParams.toString()
    return apiRequest<SupplierPaymentStatsResponse>(`/supplier-payments/stats${queryString ? `?${queryString}` : ''}`)
  },

  // Delete supplier payment
  async remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/supplier-payments/${id}`, {
      method: 'DELETE',
    })
  },
}

/* -------------------------------------------------------------------------- */
/*                         GOOD REQUEST NOTES TYPES & APIS                    */
/* -------------------------------------------------------------------------- */

export interface GoodRequestNoteItem {
  id?: number
  goodRequestNoteId?: number
  itemId: number
  requestedQuantity: number
  approvedQuantity?: number
  unitId: number
  estimatedWeight?: number
  urgency: "High" | "Normal" | "Low"
  purpose?: string
  remarks?: string
  createdAt?: string
  updatedAt?: string
  // Frontend convenience properties
  item?: Item
  unit?: Unit
  // Backend response properties
  Item?: Item
  Unit?: Unit
}

export interface GoodRequestNote {
  id?: number
  documentNumber?: string
  requestDate: string
  fromLocationId: number
  fromStoreId: number
  toLocationId: number
  toStoreId: number
  priority: "High" | "Normal" | "Low" | "Urgent"
  expectedDeliveryDate?: string
  status?: "Pending" | "Approved" | "Rejected" | "Processed"
  remarks?: string
  approvedBy?: number
  approvedDate?: string
  processedBy?: number
  processedDate?: string
  createdBy?: number
  updatedBy?: number
  createdAt?: string
  updatedAt?: string
  // Items
  items?: GoodRequestNoteItem[]
  // Frontend convenience properties
  fromLocation?: Location
  fromStore?: Store
  toLocation?: Location
  toStore?: Store
  approver?: User
  processor?: User
  creator?: User
  // Backend response properties
  FromLocation?: Location
  FromStore?: Store
  ToLocation?: Location
  ToStore?: Store
  ApprovedBy?: User
  ProcessedBy?: User
  Creator?: User
  GoodRequestNoteItems?: GoodRequestNoteItem[]
  issueNoteId?: number // Auto-created Issue Note ID when approved
}

export interface CreateGoodRequestNoteRequest {
  requestDate: string
  fromLocationId: number
  fromStoreId: number
  toLocationId: number
  toStoreId: number
  priority: "High" | "Normal" | "Low" | "Urgent"
  expectedDeliveryDate?: string
  remarks?: string
  items: Array<{
    itemId: number
    requestedQuantity: number
    unitId: number
    estimatedWeight?: number
    urgency: "High" | "Normal" | "Low"
    purpose?: string
    remarks?: string
  }>
}

export interface UpdateGoodRequestNoteRequest {
  priority?: "High" | "Normal" | "Low" | "Urgent"
  expectedDeliveryDate?: string
  remarks?: string
  items?: Array<{
    itemId: number
    requestedQuantity: number
    unitId: number
    estimatedWeight?: number
    urgency: "High" | "Normal" | "Low"
    purpose?: string
    remarks?: string
  }>
}

export interface ApproveRejectGoodRequestNoteRequest {
  status: "Approved" | "Rejected"
  remarks?: string
  itemApprovals?: Array<{
    itemId: number
    approvedQuantity: number
  }>
}

export interface GoodRequestNoteStatsResponse {
  totalRequests: number
  pendingRequests: number
  approvedRequests: number
  rejectedRequests: number
  requestsByPriority: Array<{
    priority: string
    count: number
  }>
  requestsByLocation: Array<{
    location: Location
    count: number
  }>
}

export interface GoodRequestNotesResponse {
  goodRequestNotes: any[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// Transform backend good request note response to frontend format
function transformGoodRequestNote(backendNote: any): GoodRequestNote {
  return {
    ...backendNote,
    // Map the new API response field names
    documentNumber: backendNote.requestNumber || backendNote.documentNumber,
    // Map capitalized backend properties to lowercase frontend properties
    fromLocation: backendNote.FromLocation,
    fromStore: backendNote.FromStore,
    toLocation: backendNote.ToLocation,
    toStore: backendNote.ToStore,
    approver: backendNote.ApprovedByUser,
    processor: backendNote.ProcessedBy,
    creator: backendNote.RequestedByUser,
    // Transform items - handle both new (Items) and old (GoodRequestNoteItems) field names
    items: (backendNote.Items || backendNote.GoodRequestNoteItems)?.map((item: any) => ({
      ...item,
      item: item.Item,
      unit: item.Unit,
    })) || [],
  }
}

export const goodRequestNotesApi = {
  // Get all good request notes with filtering
  async getAll(params?: {
    page?: number
    limit?: number
    status?: string
    fromLocationId?: number
    toLocationId?: number
    priority?: string
  }): Promise<GoodRequestNote[]> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.fromLocationId) queryParams.append('fromLocationId', params.fromLocationId.toString())
    if (params?.toLocationId) queryParams.append('toLocationId', params.toLocationId.toString())
    if (params?.priority) queryParams.append('priority', params.priority)

    const queryString = queryParams.toString()
    const response = await apiRequest<GoodRequestNotesResponse | any>(`/good-request-notes${queryString ? `?${queryString}` : ''}`)

    // Handle new paginated response format
    if (response && typeof response === 'object' && 'goodRequestNotes' in response) {
      const notesArray = (response as GoodRequestNotesResponse).goodRequestNotes
      return notesArray.map(transformGoodRequestNote)
    }

    // Handle wrapped response format (legacy)
    if (response && typeof response === 'object' && 'requests' in response) {
      const requestsArray = (response as { requests: any[] }).requests
      return requestsArray.map(transformGoodRequestNote)
    }

    // Handle direct array response (legacy)
    if (Array.isArray(response)) {
      return response.map(transformGoodRequestNote)
    }

    // Fallback to empty array
    console.warn('Unexpected good request notes response format:', response)
    return []
  },

  // Get good request note by ID
  async getById(id: number | string): Promise<GoodRequestNote> {
    const response = await apiRequest<any>(`/good-request-notes/${id}`)
    return transformGoodRequestNote(response)
  },

  // Create new good request note
  async create(payload: CreateGoodRequestNoteRequest): Promise<GoodRequestNote> {
    const response = await apiRequest<any>('/good-request-notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return transformGoodRequestNote(response)
  },

  // Update good request note
  async update(id: number | string, payload: UpdateGoodRequestNoteRequest): Promise<GoodRequestNote> {
    const response = await apiRequest<any>(`/good-request-notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return transformGoodRequestNote(response)
  },

  // Approve or reject good request note
  async approveReject(id: number | string, payload: ApproveRejectGoodRequestNoteRequest): Promise<GoodRequestNote & { issueNoteId?: number }> {
    const response = await apiRequest<any>(`/good-request-notes/${id}/approve-reject`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return transformGoodRequestNote(response)
  },

  // Get good request note statistics
  async getStats(params?: {
    locationId?: number
    startDate?: string
    endDate?: string
  }): Promise<GoodRequestNoteStatsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)

    const queryString = queryParams.toString()
    return apiRequest<GoodRequestNoteStatsResponse>(`/good-request-notes/stats${queryString ? `?${queryString}` : ''}`)
  },

  // Delete good request note
  async remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/good-request-notes/${id}`, {
      method: 'DELETE',
    })
  },
}

/* -------------------------------------------------------------------------- */
/*                            ISSUE NOTES TYPES & APIS                        */
/* -------------------------------------------------------------------------- */

export interface IssueNoteItem {
  id?: number
  issueNoteId?: number
  goodRequestNoteItemId?: number
  itemId: number
  batchId?: number
  requestedQuantity: number
  issuedQuantity?: number
  actualIssuedQuantity?: number
  costPrice?: number
  totalCost?: number
  actualWeight?: number
  estimatedWeight?: number
  expiryDate?: string
  unitId: number
  remarks?: string
  createdAt?: string
  updatedAt?: string
  createdBy?: number
  updatedBy?: number
  isActive?: boolean
  // Frontend convenience properties
  item?: Item
  batch?: Batch
  unit?: Unit
  // Backend response properties
  Item?: Item
  Batch?: Batch
  Unit?: Unit
  Category?: Category
}

export interface IssueNote {
  id?: number
  documentNumber?: string
  issueNumber?: string
  goodRequestNoteId?: number
  issueDate?: string
  fromLocationId: number
  fromStoreId: number
  toLocationId: number
  toStoreId: number
  deliveryExpectedDate?: string
  deliveryActualDate?: string
  status?: "Pending" | "Processing" | "Approved" | "Rejected" | "Completed"
  remarks?: string
  issuedBy?: number
  approvedBy?: number
  approvedDate?: string
  transferInNoteId?: number
  createdBy?: number
  updatedBy?: number
  createdAt?: string
  updatedAt?: string
  isActive?: boolean
  // Items
  items?: IssueNoteItem[]
  // Frontend convenience properties
  goodRequestNote?: GoodRequestNote
  fromLocation?: Location
  fromStore?: Store
  toLocation?: Location
  toStore?: Store
  issuer?: User
  approver?: User
  creator?: User
  // Backend response properties
  GoodRequestNote?: GoodRequestNote
  FromLocation?: Location
  FromStore?: Store
  ToLocation?: Location
  ToStore?: Store
  IssuedByUser?: User
  ApprovedByUser?: User
  IssueNoteItems?: IssueNoteItem[]
  Items?: IssueNoteItem[]
}

export interface AvailableBatch {
  id: number
  batchNumber: string
  itemId: number
  availableQuantity: number
  costPrice: number
  expiryDate?: string
  manufacturedDate?: string
  qualityGrade?: string
  locationId: number
  storeId: number
  item?: Item
  location?: Location
  store?: Store
}

export interface UpdateIssueNoteRequest {
  deliveryExpectedDate?: string
  remarks?: string
  items?: Array<{
    itemId: number
    batchId?: number
    issuedQuantity: number
    costPrice?: number
    actualWeight?: number
    remarks?: string
  }>
}

export interface ApproveRejectIssueNoteRequest {
  status: "Approved" | "Rejected"
  remarks?: string
}

export interface IssueNoteStatsResponse {
  totalIssues: number
  pendingIssues: number
  approvedIssues: number
  rejectedIssues: number
  issuesByLocation: Array<{
    location: Location
    count: number
  }>
}

export interface IssueNotesResponse {
  issueNotes: any[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// Transform backend issue note response to frontend format
function transformIssueNote(backendNote: any): IssueNote {
  return {
    ...backendNote,
    documentNumber: backendNote.issueNumber || backendNote.documentNumber,
    // Map capitalized backend properties to lowercase frontend properties
    goodRequestNote: backendNote.GoodRequestNote,
    fromLocation: backendNote.FromLocation,
    fromStore: backendNote.FromStore,
    toLocation: backendNote.ToLocation,
    toStore: backendNote.ToStore,
    approver: backendNote.ApprovedByUser || backendNote.ApprovedBy,
    creator: backendNote.IssuedByUser || backendNote.Creator,
    // Transform items - handle both new (Items) and old (IssueNoteItems) field names
    items: (backendNote.Items || backendNote.IssueNoteItems)?.map((item: any) => ({
      ...item,
      item: item.Item,
      batch: item.Batch,
      unit: item.Unit,
      // Add explicit number conversion for quantities
      requestedQuantity: parseFloat(item.requestedQuantity) || 0,
      issuedQuantity: parseFloat(item.issuedQuantity) || 0,
      actualIssuedQuantity: parseFloat(item.actualIssuedQuantity) || 0,
      costPrice: parseFloat(item.costPrice) || 0,
      totalCost: parseFloat(item.totalCost) || 0,
      actualWeight: parseFloat(item.actualWeight) || 0,
      estimatedWeight: parseFloat(item.estimatedWeight) || 0
    })) || [],
  }
}

export const issueNotesApi = {
  // Get all issue notes with filtering
  async getAll(params?: {
    page?: number
    limit?: number
    status?: string
    fromLocationId?: number
    toLocationId?: number
  }): Promise<IssueNote[]> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.fromLocationId) queryParams.append('fromLocationId', params.fromLocationId.toString())
    if (params?.toLocationId) queryParams.append('toLocationId', params.toLocationId.toString())

    const queryString = queryParams.toString()
    const response = await apiRequest<IssueNotesResponse | unknown>(`/issue-notes${queryString ? `?${queryString}` : ''}`)

    // Handle new paginated response format
    if (response && typeof response === 'object' && 'issueNotes' in response) {
      const notesArray = (response as IssueNotesResponse).issueNotes
      return notesArray.map(transformIssueNote)
    }

    // Handle legacy wrapped response format
    if (response && typeof response === 'object' && 'issues' in response) {
      const issuesArray = (response as { issues: any[] }).issues
      return issuesArray.map(transformIssueNote)
    }

    // Handle direct array response
    if (Array.isArray(response)) {
      return response.map(transformIssueNote)
    }

    // Fallback to empty array
    console.warn('Unexpected issue notes response format:', response)
    return []
  },

  // Get issue note by ID
  async getById(id: number | string): Promise<IssueNote> {
    const response = await apiRequest<any>(`/issue-notes/${id}`)
    return transformIssueNote(response)
  },

  // Get available batches for item at location/store
  async getAvailableBatches(params: {
    itemId: number
    locationId: number
    storeId: number
  }): Promise<AvailableBatch[]> {
    const queryParams = new URLSearchParams()
    queryParams.append('itemId', params.itemId.toString())
    queryParams.append('locationId', params.locationId.toString())
    queryParams.append('storeId', params.storeId.toString())

    return apiRequest<AvailableBatch[]>(`/issue-notes/available-batches?${queryParams.toString()}`)
  },

  // Update issue note (assign batches)
  async update(id: number | string, payload: UpdateIssueNoteRequest): Promise<IssueNote> {
    const response = await apiRequest<any>(`/issue-notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return transformIssueNote(response)
  },

  // Approve or reject issue note
  async approveReject(id: number | string, payload: ApproveRejectIssueNoteRequest): Promise<IssueNote> {
    const response = await apiRequest<any>(`/issue-notes/${id}/approve-reject`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return transformIssueNote(response)
  },

  // Get issue note statistics
  async getStats(params?: {
    locationId?: number
    startDate?: string
    endDate?: string
  }): Promise<IssueNoteStatsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)

    const queryString = queryParams.toString()
    return apiRequest<IssueNoteStatsResponse>(`/issue-notes/stats${queryString ? `?${queryString}` : ''}`)
  },

  // Delete issue note
  async remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/issue-notes/${id}`, {
      method: 'DELETE',
    })
  },
}

/* -------------------------------------------------------------------------- */
/*                          TRANSFER IN NOTES TYPES & APIS                    */
/* -------------------------------------------------------------------------- */

export interface TransferInNoteItem {
  id?: number
  transferInNoteId?: number
  itemId: number
  batchId?: number
  issuedQuantity: number
  receivedQuantity?: number
  acceptedQuantity?: number
  rejectedQuantity?: number
  damagedQuantity?: number
  receivedWeight?: number
  qualityGrade?: string
  inspectionNotes?: string
  storageLocationId?: number
  unitId: number
  costPrice?: number
  actualWeight?: number
  remarks?: string
  createdAt?: string
  updatedAt?: string
  // Frontend convenience properties
  item?: Item
  batch?: Batch
  unit?: Unit
  storageLocation?: Location
  // Backend response properties
  Item?: Item
  Batch?: Batch
  Unit?: Unit
  StorageLocation?: Location
}

export interface TransferInNote {
  id?: number
  documentNumber?: string
  issueNoteId?: number
  transferDate?: string
  fromLocationId: number
  fromStoreId: number
  toLocationId: number
  toStoreId: number
  vehicleId?: number
  driverId?: number
  expectedDeliveryDate?: string
  dispatchedDate?: string
  receivedDate?: string
  status?: "Pending" | "Dispatched" | "In Transit" | "Received" | "Completed"
  remarks?: string
  dispatchedBy?: number
  receivedBy?: number
  approvedBy?: number
  approvedDate?: string
  createdBy?: number
  updatedBy?: number
  createdAt?: string
  updatedAt?: string
  // Items
  items?: TransferInNoteItem[]
  // Frontend convenience properties
  issueNote?: IssueNote
  fromLocation?: Location
  fromStore?: Store
  toLocation?: Location
  toStore?: Store
  vehicle?: Vehicle
  driver?: Driver
  dispatcher?: User
  receiver?: User
  approver?: User
  creator?: User
  // Backend response properties
  IssueNote?: IssueNote
  FromLocation?: Location
  FromStore?: Store
  ToLocation?: Location
  ToStore?: Store
  Vehicle?: Vehicle
  Driver?: Driver
  DispatchedBy?: User
  ReceivedBy?: User
  ApprovedBy?: User
  Creator?: User
  TransferInNoteItems?: TransferInNoteItem[]
}

export interface UpdateTransferInNoteRequest {
  vehicleId?: number
  driverId?: number
  expectedDeliveryDate?: string
  remarks?: string
}

export interface DispatchTransferInNoteRequest {
  vehicleId: number
  driverId: number
  remarks?: string
}

export interface ReceiveTransferInNoteRequest {
  remarks?: string
  items: Array<{
    itemId: number
    receivedQuantity: number
    acceptedQuantity: number
    rejectedQuantity: number
    damagedQuantity: number
    receivedWeight?: number
    qualityGrade?: string
    inspectionNotes?: string
    storageLocationId?: number
  }>
}

export interface ApproveTransferInNoteRequest {
  remarks?: string
}

export interface TransferInNoteStatsResponse {
  totalTransfers: number
  pendingTransfers: number
  dispatchedTransfers: number
  receivedTransfers: number
  completedTransfers: number
  transfersByLocation: Array<{
    location: Location
    count: number
  }>
}

// Transform backend transfer in note response to frontend format
function transformTransferInNote(backendNote: any): TransferInNote {
  return {
    ...backendNote,
    // Map capitalized backend properties to lowercase frontend properties
    issueNote: backendNote.IssueNote,
    fromLocation: backendNote.FromLocation,
    fromStore: backendNote.FromStore,
    toLocation: backendNote.ToLocation,
    toStore: backendNote.ToStore,
    vehicle: backendNote.Vehicle,
    driver: backendNote.Driver,
    dispatcher: backendNote.DispatchedBy,
    receiver: backendNote.ReceivedBy,
    approver: backendNote.ApprovedBy,
    creator: backendNote.Creator,
    // Transform items
    items: backendNote.TransferInNoteItems?.map((item: any) => ({
      ...item,
      item: item.Item,
      batch: item.Batch,
      unit: item.Unit,
      storageLocation: item.StorageLocation,
    })) || [],
  }
}

export const transferInNotesApi = {
  // Get all transfer in notes with filtering
  async getAll(params?: {
    page?: number
    limit?: number
    status?: string
    fromLocationId?: number
    toLocationId?: number
  }): Promise<TransferInNote[]> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.fromLocationId) queryParams.append('fromLocationId', params.fromLocationId.toString())
    if (params?.toLocationId) queryParams.append('toLocationId', params.toLocationId.toString())

    const queryString = queryParams.toString()
    const response = await apiRequest<unknown>(`/transfer-in-notes${queryString ? `?${queryString}` : ''}`)

    // Handle wrapped response format
    if (response && typeof response === 'object' && 'transfers' in response) {
      const transfersArray = (response as { transfers: any[] }).transfers
      return transfersArray.map(transformTransferInNote)
    }

    // Handle direct array response
    if (Array.isArray(response)) {
      return response.map(transformTransferInNote)
    }

    // Fallback to empty array
    console.warn('Unexpected transfer in notes response format:', response)
    return []
  },

  // Get transfer in note by ID
  async getById(id: number | string): Promise<TransferInNote> {
    const response = await apiRequest<any>(`/transfer-in-notes/${id}`)
    return transformTransferInNote(response)
  },

  // Update transfer in note
  async update(id: number | string, payload: UpdateTransferInNoteRequest): Promise<TransferInNote> {
    const response = await apiRequest<any>(`/transfer-in-notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return transformTransferInNote(response)
  },

  // Dispatch transfer in note
  async dispatch(id: number | string, payload: DispatchTransferInNoteRequest): Promise<TransferInNote> {
    const response = await apiRequest<any>(`/transfer-in-notes/${id}/dispatch`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return transformTransferInNote(response)
  },

  // Receive transfer in note
  async receive(id: number | string, payload: ReceiveTransferInNoteRequest): Promise<TransferInNote> {
    const response = await apiRequest<any>(`/transfer-in-notes/${id}/receive`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return transformTransferInNote(response)
  },

  // Approve transfer in note (update stock)
  async approve(id: number | string, payload: ApproveTransferInNoteRequest): Promise<TransferInNote> {
    const response = await apiRequest<any>(`/transfer-in-notes/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return transformTransferInNote(response)
  },

  // Get transfer in note statistics
  async getStats(params?: {
    locationId?: number
    startDate?: string
    endDate?: string
  }): Promise<TransferInNoteStatsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.locationId) queryParams.append('locationId', params.locationId.toString())
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)

    const queryString = queryParams.toString()
    return apiRequest<TransferInNoteStatsResponse>(`/transfer-in-notes/stats${queryString ? `?${queryString}` : ''}`)
  },

  remove: (id: number | string) => apiRequest<void>(`/transfer-in-notes/${id}`, { method: "DELETE" }),
}

/* -------------------------------------------------------------------------- */
/*                           PAYMENT TYPES TYPES & APIS                      */
/* -------------------------------------------------------------------------- */

export interface PaymentType {
  id: number
  paymentTypeName: string
  description: string
  isActive: boolean
  createdAt: string
  createdBy: number
  updatedAt: string
  updatedBy: number
  createdByUsername: string
  updatedByUsername: string
}

export const paymentTypesApi = {
  ...crud("payment-types"),

  // Get all active payment types
  async getAll(): Promise<PaymentType[]> {
    return apiRequest<PaymentType[]>(`/payment-types`)
  },

  // Get payment type by ID
  async getById(id: number | string): Promise<PaymentType> {
    return apiRequest<PaymentType>(`/payment-types/${id}`)
  },
}

/* -------------------------------------------------------------------------- */
/*                             RECEIPTS TYPES & APIS                         */
/* -------------------------------------------------------------------------- */

// Backend response for individual receipt invoice
export interface ReceiptInvoiceResponse {
  id: number
  receiptId: number
  invoiceId: number
  invoiceAmount: string | number
  paidAmount: string | number
  balanceAmount: string | number
  isActive: boolean
  createdAt: string
  updatedAt: string
  invoice?: Invoice
  receipt?: ReceiptResponse
}

// Frontend structure for receipt invoices
export interface ReceiptInvoice {
  invoiceId: number
  invoiceAmount: number
  paidAmount: number
  balanceAmount: number
  receipt?: Receipt
}

// Backend response for individual receipt credit note set-off
export interface ReceiptCreditNoteResponse {
  id: number
  receiptId: number
  creditNoteId: number
  amount: string | number
  isActive: boolean
  createdAt: string
  updatedAt: string
  CreditNote?: CreditNote
}

// Frontend structure for receipt credit note set-offs
export interface ReceiptCreditNote {
  creditNoteId: number
  amount: number
  creditNoteNumber?: string
}

// Backend response for individual receipt payment
export interface ReceiptPaymentResponse {
  id: number
  receiptId: number
  paymentTypeId: number
  paymentAmount: string | number
  referenceNo?: string
  cardType?: string | null
  bankName?: string | null
  bankBranch?: string | null
  chequeNo?: string | null
  chequeDate?: string | null
  status?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  PaymentType?: PaymentType
}

export interface ReceiptSettledCheque {
  id: number
  receiptId: number
  receiptPaymentId: number
  amount: number
  cheque?: ReceiptPayment
}

// Frontend structure for receipt payments
export interface ReceiptPayment {
  id?: number
  receiptId?: number
  paymentTypeId: number
  paymentAmount: number
  amount?: number | string
  ledgerAccountId?: number
  cardType?: string | null
  bankId?: number | null
  bankName?: string | null
  bankBranch?: string | null
  chequeNo?: string | null
  chequeDate?: string | null
  referenceNo?: string
  status?: string
  isDeposited?: boolean
  bankDepositId?: number
  Receipt?: Receipt
  LedgerAccount?: LedgerAccount
  PaymentType?: PaymentType
}

// Frontend Receipt structure (normalized from backend response)
export interface Receipt {
  id: number
  receiptNo: string
  receiptDate: string
  locationId?: number
  userId: number
  customerId: number
  totalAmount?: number
  totalPaid: number
  totalBalance?: number
  isSettled?: boolean
  remarks?: string
  printedCount: number
  isActive?: boolean
  createdAt: string
  updatedAt: string
  createdBy?: number
  updatedBy?: number
  createdByUsername?: string
  updatedByUsername?: string
  customer?: Customer
  user?: User
  invoices?: ReceiptInvoiceResponse[]
  receiptInvoices?: ReceiptInvoice[]
  payments?: ReceiptPaymentResponse[]
  receiptPayments?: ReceiptPayment[]
  creditNoteSetOffs?: ReceiptCreditNote[]
  totalCreditNoteAmount?: number
  totalReturnAmount?: number
  settledCheques?: ReceiptSettledCheque[]
}

// Backend response structure for Receipt
export interface ReceiptResponse {
  id: number
  receiptNo: string
  receiptDate: string
  locationId?: number
  userId: number
  customerId: number
  totalAmount?: string | number
  totalPaid: string | number
  totalBalance?: string | number
  isSettled?: boolean
  remarks?: string
  printedCount: number
  isActive?: boolean
  createdAt: string
  updatedAt: string
  createdBy?: number
  updatedBy?: number
  Customer?: Customer
  user?: User
  invoices?: ReceiptInvoiceResponse[]
  payments?: ReceiptPaymentResponse[]
  settledCheques?: ReceiptSettledCheque[]
  creditNoteSetOffs?: ReceiptCreditNoteResponse[]
  totalCreditNoteAmount?: string | number
  totalReturnAmount?: string | number
  createdByUsername?: string
  updatedByUsername?: string
}

export interface CreateReceiptRequest {
  receiptNo: string
  receiptDate: string
  userId: number
  customerId: number
  totalPaid: number
  remarks?: string
  printedCount: number
  receiptInvoices: ReceiptInvoice[]
  receiptPayments: ReceiptPayment[]
  customerReturnSetOffs?: { id: number; amount: number }[]
  totalReturnAmount?: number
  creditNoteSetOffs?: { id: number; amount: number }[]
  totalCreditNoteAmount?: number
  returnedChequeSettlements?: { id: number; amount: number }[]
}

export interface UpdateReceiptRequest {
  receiptNo?: string
  receiptDate?: string
  customerId?: number
  totalPaid?: number
  remarks?: string
  printedCount?: number
  receiptInvoices?: ReceiptInvoice[]
  receiptPayments?: ReceiptPayment[]
}

export interface OutstandingInvoice extends Invoice {
  outstandingAmount: number
}

// Helper function to transform backend ReceiptResponse to frontend Receipt
function transformReceipt(backendReceipt: ReceiptResponse): Receipt {
  return {
    id: backendReceipt.id,
    receiptNo: backendReceipt.receiptNo,
    receiptDate: backendReceipt.receiptDate,
    locationId: backendReceipt.locationId,
    userId: backendReceipt.userId,
    customerId: backendReceipt.customerId,
    totalAmount: typeof backendReceipt.totalAmount === 'string' ? parseFloat(backendReceipt.totalAmount) : backendReceipt.totalAmount,
    totalPaid: typeof backendReceipt.totalPaid === 'string' ? parseFloat(backendReceipt.totalPaid.toString()) : backendReceipt.totalPaid,
    totalBalance: typeof backendReceipt.totalBalance === 'string' ? parseFloat(backendReceipt.totalBalance) : backendReceipt.totalBalance,
    isSettled: backendReceipt.isSettled,
    remarks: backendReceipt.remarks,
    printedCount: backendReceipt.printedCount,
    isActive: backendReceipt.isActive,
    createdAt: backendReceipt.createdAt,
    updatedAt: backendReceipt.updatedAt,
    createdBy: backendReceipt.createdBy,
    updatedBy: backendReceipt.updatedBy,
    createdByUsername: backendReceipt.createdByUsername,
    updatedByUsername: backendReceipt.updatedByUsername,
    customer: backendReceipt.Customer,
    user: backendReceipt.user,
    invoices: backendReceipt.invoices || [],
    payments: backendReceipt.payments || [],
    receiptInvoices: (backendReceipt.invoices || []).map(inv => ({
      invoiceId: inv.invoiceId,
      invoiceAmount: typeof inv.invoiceAmount === 'string' ? parseFloat(inv.invoiceAmount) : inv.invoiceAmount,
      paidAmount: typeof inv.paidAmount === 'string' ? parseFloat(inv.paidAmount) : inv.paidAmount,
      balanceAmount: typeof inv.balanceAmount === 'string' ? parseFloat(inv.balanceAmount) : inv.balanceAmount,
    })),
    receiptPayments: (backendReceipt.payments || []).map(pmt => ({
      id: pmt.id,
      receiptId: pmt.receiptId,
      paymentTypeId: pmt.paymentTypeId,
      paymentAmount: typeof pmt.paymentAmount === 'string' ? parseFloat(pmt.paymentAmount) : pmt.paymentAmount,
      referenceNo: pmt.referenceNo,
      cardType: pmt.cardType,
      bankName: pmt.bankName,
      bankBranch: pmt.bankBranch,
      chequeNo: pmt.chequeNo,
      chequeDate: pmt.chequeDate,
      status: pmt.status,
      PaymentType: pmt.PaymentType,
    })),
    creditNoteSetOffs: (backendReceipt.creditNoteSetOffs || []).map(cn => ({
      creditNoteId: cn.creditNoteId,
      amount: typeof cn.amount === 'string' ? parseFloat(cn.amount) : cn.amount,
      creditNoteNumber: cn.CreditNote?.creditNoteNumber
    })),
    settledCheques: (backendReceipt.settledCheques || []).map(sc => ({
      id: sc.id,
      receiptId: sc.receiptId,
      receiptPaymentId: sc.receiptPaymentId,
      amount: typeof sc.amount === 'string' ? parseFloat(sc.amount) : sc.amount,
      cheque: sc.cheque
    })),
    totalCreditNoteAmount: typeof backendReceipt.totalCreditNoteAmount === 'string' ? parseFloat(backendReceipt.totalCreditNoteAmount) : backendReceipt.totalCreditNoteAmount,
    totalReturnAmount: typeof backendReceipt.totalReturnAmount === 'string' ? parseFloat(backendReceipt.totalReturnAmount) : backendReceipt.totalReturnAmount,
  }
}

export const receiptsApi = {
  ...crud("receipts"),

  // Get all receipts
  async getAll(params?: {
    customerId?: number
    status?: string
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: string
  }): Promise<Receipt[]> {
    const queryParams = new URLSearchParams()
    if (params?.customerId) queryParams.append('customerId', params.customerId.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    const queryString = queryParams.toString()
    const response = await apiRequest<ReceiptResponse[]>(`/receipts${queryString ? `?${queryString}` : ''}`)
    return response.map(r => transformReceipt(r))
  },

  // Get receipt by ID
  async getById(id: number | string): Promise<Receipt> {
    const response = await apiRequest<ReceiptResponse>(`/receipts/${id}`)
    return transformReceipt(response)
  },

  // Create receipt
  async create(payload: CreateReceiptRequest): Promise<Receipt> {
    const response = await apiRequest<ReceiptResponse>(`/receipts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return transformReceipt(response)
  },

  // Update receipt
  async update(id: number | string, payload: UpdateReceiptRequest): Promise<Receipt> {
    const response = await apiRequest<ReceiptResponse>(`/receipts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return transformReceipt(response)
  },

  // Get outstanding invoices for a customer
  async getOutstandingInvoices(customerId: number): Promise<OutstandingInvoice[]> {
    return apiRequest<OutstandingInvoice[]>(`/receipts/customer/${customerId}/outstanding-invoices`)
  },

  // Delete receipt
  remove: (id: number | string) => apiRequest<void>(`/receipts/${id}`, { method: "DELETE" }),
}

/* -------------------------------------------------------------------------- */
/*                          ACCOUNTING MANAGEMENT                            */
/* -------------------------------------------------------------------------- */

export interface AccountType {
  id: number
  code: string
  name: string
  description?: string
  drBehavior: 'increase' | 'decrease'
  crBehavior: 'increase' | 'decrease'
  status: 'Active' | 'Inactive'
  isSystemProtected: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AccountCategory {
  id: number
  name: string
  code: string
  accountTypeId: number
  status: 'Active' | 'Inactive'
  accountType?: AccountType
  AccountType?: AccountType
  createdAt?: string
  updatedAt?: string
}

export interface ControlAccount {
  id: number
  code: string
  name: string
  accountTypeId: number
  accountCategoryId: number
  controlType: 'CUSTOMER' | 'SUPPLIER' | 'BANK' | 'INVENTORY'
  status: 'Active' | 'Inactive'
  accountType?: AccountType
  AccountType?: AccountType
  accountCategory?: AccountCategory
  AccountCategory?: AccountCategory
  createdAt?: string
  updatedAt?: string
}

export interface LedgerAccount {
  id: number
  ledgerCode: string
  name: string
  accountTypeId: number
  accountCategoryId: number
  controlAccountId?: number
  openingBalance: number
  openingBalanceType: 'DR' | 'CR'
  ledgerType: 'GENERAL' | 'SYSTEM' | 'BANK' | 'CASH' | 'PETTY_CASH' | 'CASH_BOOK' | 'CONTROL'
  isBankLedger: boolean
  isUseControlAccount: boolean
  bankAccountId?: number
  accountNumber?: string
  accountHolderName?: string
  bankId?: number
  branchId?: number
  status: 'Active' | 'Inactive'
  accountType?: AccountType
  AccountType?: AccountType
  accountCategory?: AccountCategory
  AccountCategory?: AccountCategory
  controlAccount?: ControlAccount
  ControlAccount?: ControlAccount
  Bank?: Bank
  BankBranch?: BankBranch
  Branch?: BankBranch
  cashBookLedgerId?: string
  pettyCashAmount?: string
  bufferLevel?: string
  createdAt?: string
  updatedAt?: string
}

export interface JournalEntryLine {
  id?: number
  ledgerAccountId: number
  debitAmount: number
  creditAmount: number
  description?: string
  lineNumber?: number
  ledgerAccount?: LedgerAccount
  LedgerAccount?: LedgerAccount
}

export interface JournalEntry {
  id: number
  journalNumber: string
  journalDate: string
  description?: string
  referenceModule: 'SALES' | 'PURCHASE' | 'INVENTORY' | 'MANUAL' | 'PAYMENT' | 'RECEIPT'
  referenceId?: string
  referenceNumber?: string
  totalDebit: number
  totalCredit: number
  status: 'Draft' | 'Submitted' | 'Approved' | 'Posted' | 'Rejected' | 'Voided'
  isAutoPosted: boolean
  lines?: JournalEntryLine[]
  Lines?: JournalEntryLine[]
  approvalStatus?: string
  postedAt?: string
  postedBy?: number
  approvedAt?: string
  approvedBy?: number
  rejectionReason?: string
  Creator?: any
  PostedByUser?: any
  ApprovedByUser?: any
  createdBy?: number
  createdAt?: string
  updatedAt?: string
}

export interface AutoPostingRule {
  id: number
  ruleName: string
  description?: string
  triggerModule: string
  triggerEvent: string
  debitLedgerId: number
  creditLedgerId: number
  debitAmount?: string
  creditAmount?: string
  useControlAccount: boolean
  controlAccountType?: 'CUSTOMER' | 'SUPPLIER' | 'BANK' | 'INVENTORY'
  isEnabled: boolean
  ruleOrder?: number
  debitLedger?: LedgerAccount
  creditLedger?: LedgerAccount
  createdAt?: string
  updatedAt?: string
}

export interface PettyCashBook {
  id: number
  pettyCashCode: string
  name: string
  location: string
  custodian: string
  initialAmount: number
  currentBalance: number
  ledgerAccountId: number
  status: 'Active' | 'Inactive'
  ledgerAccount?: LedgerAccount
  createdAt?: string
  updatedAt?: string
}

export interface PettyCashCategory {
  id: number
  name: string
  description?: string
  ledgerAccountId: number
  status: 'Active' | 'Inactive'
  ledgerAccount?: LedgerAccount
  createdAt?: string
  updatedAt?: string
}

export interface PettyCashPaymentLine {
  id?: number
  paymentId?: number
  categoryId: number
  ledgerAccountId: number
  amount: number
  description: string
  category?: PettyCashCategory
  Category?: PettyCashCategory
  ledgerAccount?: LedgerAccount
}

export interface PettyCashPayment {
  id?: number
  paymentNumber?: string
  paymentDate: string
  pettyCashBookId: number
  description: string
  status: 'Draft' | 'Approved' | 'Posted' | 'Cancelled'
  totalAmount: number
  approvedBy?: number
  approvedDate?: string
  postedBy?: number
  postedDate?: string
  pettyCashBook?: PettyCashBook
  PettyCashBook?: PettyCashBook
  lines: PettyCashPaymentLine[]
  createdAt?: string
  updatedAt?: string
}

export interface PettyCashReimbursement {
  id?: number
  reimbursementNumber?: string
  reimbursementDate: string
  pettyCashBookId: number
  sourceLedgerAccountId: number
  amount: number
  description?: string
  status: 'Draft' | 'Approved' | 'Posted' | 'Cancelled'
  approvedBy?: number
  approvedDate?: string
  postedBy?: number
  postedDate?: string
  PettyCashBook?: PettyCashBook
  SourceLedgerAccount?: LedgerAccount
  createdAt?: string
  updatedAt?: string
}

export const accountTypesApi = {
  ...crud('account-types'),
  getRules: () => apiRequest('/account-types/rules/all'),
}

export const accountCategoriesApi = {
  ...crud('account-categories'),
  getByAccountType: (accountTypeId: number) =>
    apiRequest<AccountCategory[]>(`/account-categories/type/${accountTypeId}`),
  getNextCode: async (accountTypeId: number) => {
    const res = await apiRequest<{ data: { nextCode: string } }>(`/account-categories/next-code?accountTypeId=${accountTypeId}`)
    return res.data
  },
}

export const controlAccountsApi = {
  ...crud('control-accounts'),
  getByType: (controlType: string) =>
    apiRequest<ControlAccount[]>(`/control-accounts/type/${controlType}`),
  getNextCode: async (accountCategoryId: number) => {
    const res = await apiRequest<{ data: { nextCode: string } }>(`/control-accounts/next-code?accountCategoryId=${accountCategoryId}`)
    return res.data
  },
}

export const ledgerAccountsApi = {
  ...crud('ledger-accounts'),
  getAll: <T = LedgerAccount>(params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.search) query.append('search', params.search)
    return apiRequest<PaginatedResponse<T>>(`/ledger-accounts?${query.toString()}`)
  },
  getByCode: (code: string) => apiRequest<LedgerAccount>(`/ledger-accounts/code/${code}`),
  getChartOfAccounts: () => apiRequest('/ledger-accounts/chart/all'),
  getExpenseAccounts: <T = LedgerAccount>() => apiRequest<T[]>('/ledger-accounts/expense/all'),
  getPaymentAccounts: <T = LedgerAccount>() => apiRequest<T[]>('/ledger-accounts/payment/all'),
  getBankAccounts: <T = LedgerAccount>() => apiRequest<T[]>('/ledger-accounts/bank/all'),
  getAllAccounts: <T = LedgerAccount>() => apiRequest<T[]>('/ledger-accounts/all'),
  setupSystemLedgers: () => apiRequest('/ledger-accounts/setup/system', { method: 'POST' }),
  getNextCode: async (params: { accountCategoryId?: number; controlAccountId?: number }) => {
    const query = new URLSearchParams()
    if (params.accountCategoryId) query.append('accountCategoryId', params.accountCategoryId.toString())
    if (params.controlAccountId) query.append('controlAccountId', params.controlAccountId.toString())
    const res = await apiRequest<{ data: { nextCode: string } }>(`/ledger-accounts/next-code?${query.toString()}`)
    return res.data
  },
}

export const journalEntriesApi = {
  getAll: async (page: number, p0: number, params?: {
    page?: number
    limit?: number
    status?: string
    module?: string
    startDate?: string
    endDate?: string
  }): Promise<JournalEntry[]> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.module) queryParams.append('module', params.module)
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)

    const response = await apiRequest<any>(`/journal-entries?${queryParams.toString()}`)
    return response?.data || response || []
  },

  getById: (id: number | string) => apiRequest<JournalEntry>(`/journal-entries/${id}`),

  create: (payload: Omit<JournalEntry, 'id' | 'journalNumber' | 'createdAt' | 'updatedAt'>) =>
    apiRequest<JournalEntry>('/journal-entries', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  update: (id: number | string, payload: Partial<JournalEntry>) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  submit: (id: number | string) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}/submit`, { method: 'POST' }),

  approve: (id: number | string) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}/approve`, { method: 'POST' }),

  approveAndPost: (id: number | string) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}/approve-and-post`, { method: 'POST' }),

  post: (id: number | string) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}/post`, { method: 'POST' }),

  unpost: (id: number | string) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}/unpost`, { method: 'POST' }),

  reject: (id: number | string, reason: string) =>
    apiRequest<JournalEntry>(`/journal-entries/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),

  delete: (id: number | string) =>
    apiRequest<void>(`/journal-entries/${id}`, { method: 'DELETE' }),

  getAuditTrail: (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())

    return apiRequest<JournalEntry[]>(`/journal-entries/audit/trail?${queryParams.toString()}`)
  },
}

export const autoPostingRulesApi = {
  ...crud('auto-posting-rules'),

  getByModule: (triggerModule: string, triggerEvent?: string) => {
    const query = triggerEvent ? `?triggerEvent=${triggerEvent}` : ''
    return apiRequest<AutoPostingRule[]>(`/auto-posting-rules/module/${triggerModule}${query}`)
  },

  toggle: (id: number | string) =>
    apiRequest<AutoPostingRule>(`/auto-posting-rules/${id}/toggle`, { method: 'POST' }),

  preview: (payload: {
    ruleId: number
    amount: number
    referenceId: string
    referenceNumber: string
  }) =>
    apiRequest('/auto-posting-rules/preview/journal', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
}

export const pettyCashBooksApi = crud('petty-cash-books')
export const pettyCashCategoriesApi = crud('petty-cash-categories')

/* -------------------------------------------------------------------------- */
/*                   ACCOUNTING TRANSACTION FEATURES                         */
/* -------------------------------------------------------------------------- */

export interface BillEntryDetail {
  id?: number
  billEntryId?: number
  ledgerId: number
  description: string
  quantity?: number
  unitPrice?: number
  amount: number
  taxAmount?: number
  ledger?: LedgerAccount
  createdAt?: string
  updatedAt?: string
}

export interface BillEntry {
  id: number
  billNumber: string
  supplierInvoiceNumber?: string
  supplierId: number
  billDate: string
  dueDate: string
  description?: string
  amount: number
  taxRate?: number
  taxAmount?: number
  totalAmount: number
  grnId?: number
  purchaseOrderId?: number
  currencyCode?: string
  paymentTerms?: string
  status: 'Draft' | 'Submitted' | 'Approved' | 'Posted' | 'Rejected'
  approvalStatus?: string
  paidAmount?: number
  balance?: number
  rejectionReason?: string
  journalEntryId?: number
  postedAt?: string
  postedBy?: number
  approvedAt?: string
  approvedBy?: number
  createdBy?: number
  updatedBy?: number
  supplier?: Supplier
  Supplier?: Supplier
  Creator?: any
  ApprovedByUser?: any
  PostedByUser?: any
  details?: BillEntryDetail[]
  Details?: BillEntryDetail[]
  createdAt?: string
  updatedAt?: string
  createdByUsername?: string
  updatedByUsername?: string
}

export interface CreateBillEntryRequest {
  supplierId: number
  supplierInvoiceNumber?: string
  billDate: string
  dueDate: string
  description?: string
  amount: number
  taxAmount?: number
  grnId?: number
  purchaseOrderId?: number
  currencyCode?: string
  paymentTerms?: string
  details?: BillEntryDetail[]
}

export interface UpdateBillEntryRequest {
  supplierInvoiceNumber?: string
  description?: string
  amount?: number
  taxAmount?: number
  dueDate?: string
  paymentTerms?: string
}

export interface BillPaymentEntry {
  id: number
  billPaymentId: number
  billEntryId: number
  taxRate?: number
  taxAmount?: number
  amount: string | number
  lineNumber?: number
  description?: string
  BillEntry?: BillEntry
  createdAt?: string
  updatedAt?: string
}

export interface BillPaymentDetail {
  id: number
  billPaymentId: number
  amount: string | number
  lineNumber?: number
  paymentTypeId: number
  ledgerAccountId?: number
  referenceNo?: string
  bankId?: number
  bankBranchId?: number
  cardType?: string
  chequeNo?: string
  chequeDate?: string
  LedgerAccount?: LedgerAccount
  createdAt?: string
  updatedAt?: string
}

export interface BillPayment {
  id: number
  paymentNumber: string
  supplierId: number
  paymentDate: string
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Online' | 'LC'
  bankAccountId?: number
  amount: number | string
  currencyCode?: string
  description?: string
  referenceNumber?: string
  status: 'Draft' | 'Allocated' | 'Submitted' | 'Approved' | 'Posted' | 'Cancelled' | 'Rejected' | 'Partially Paid'
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected'
  journalEntryId?: number
  rejectionReason?: string
  postedAt?: string
  postedBy?: number
  approvedAt?: string
  approvedBy?: number
  createdAt?: string
  createdBy?: number
  updatedAt?: string
  updatedBy?: number
  Supplier?: Supplier
  BankAccount?: any
  Creator?: User
  ApprovedByUser?: User
  PostedByUser?: User
  Allocations?: PaymentAllocation[]
  Entries?: BillPaymentEntry[]
  Details?: BillPaymentDetail[]
}

export interface CreateBillPaymentRequest {
  supplierId: number
  paymentDate: string
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Online' | 'LC'
  bankAccountId?: number
  amount: number
  description?: string
  referenceNumber?: string
}

export interface UpdateBillPaymentRequest {
  paymentDate?: string
  paymentMethod?: string
  amount?: number
  description?: string
}

export interface PaymentAllocation {
  id?: number
  billEntryId: number
  allocatedAmount: number | string
  taxRate?: number
  taxAmount?: number
  currencyCode?: string
  description?: string
  billEntry?: BillEntry
  BillEntry?: BillEntry
}

// One Payment Line (Debit/Credit entry)
export interface OnePaymentLine {
  id?: number
  lineType: 'Debit' | 'Credit'
  ledgerAccountId: number
  amount: number | string
  description?: string
  referenceType?: 'SUPPLIER' | 'CUSTOMER' | 'EMPLOYEE' | 'OTHER'
  referenceId?: number
  ledgerAccount?: LedgerAccount
  LedgerAccount?: LedgerAccount
}

// Payment Method details
export interface OnePaymentMethod {
  id?: number
  paymentMethod: string
  bankAccountId?: number
  ledgerAccountId?: number
  amount: number | string
  referenceNumber?: string
  // Cheque-specific fields
  chequeNo?: string
  chequeDate?: string
  bankName?: string
  BankAccount?: any
  ledgerAccount?: LedgerAccount
  LedgerAccount?: LedgerAccount
}

// Main OnePayment interface
export interface OnePayment {
  id: number
  paymentNumber: string
  referenceNumber?: string
  paymentDate: string
  description?: string
  currencyCode: string
  totalAmount: number
  totalPaymentAmount?: string | number
  status: 'Draft' | 'Submitted' | 'Approved' | 'Posted' | 'Reversed' | 'Rejected' | 'Cancelled'
  rejectionReason?: string
  reversalReason?: string
  lines?: OnePaymentLine[]
  Lines?: OnePaymentLine[]
  paymentMethods?: OnePaymentMethod[]
  PaymentMethods?: OnePaymentMethod[]
  createdAt?: string
  updatedAt?: string
  createdByUsername?: string
  updatedByUsername?: string
  approvedAt?: string
  approvedByUsername?: string
  postedAt?: string
  postedByUsername?: string
  Creator?: {
    id: number
    fullName: string
    email: string
  }
}

// Create OnePayment request
export interface CreateOnePaymentRequest {
  paymentDate: string
  referenceNumber?: string
  description?: string
  currencyCode: string
  lines: {
    lineType: 'Debit' | 'Credit'
    ledgerAccountId: number
    amount: number
    description?: string
    referenceType?: 'SUPPLIER' | 'CUSTOMER' | 'EMPLOYEE' | 'OTHER'
    referenceId?: number
  }[]
  paymentMethods: {
    paymentMethod: string
    bankAccountId?: number
    ledgerAccountId?: number
    amount: number
    referenceNumber?: string
    chequeNo?: string
    chequeDate?: string
    bankName?: string
  }[]
}

// Update OnePayment request (Draft only)
export interface UpdateOnePaymentRequest {
  paymentDate?: string
  description?: string
  lines?: {
    lineType: 'Debit' | 'Credit'
    ledgerAccountId: number
    amount: number
    description?: string
    referenceType?: 'SUPPLIER' | 'CUSTOMER' | 'EMPLOYEE' | 'OTHER'
    referenceId?: number
  }[]
  paymentMethods?: {
    paymentMethod: string
    bankAccountId?: number
    ledgerAccountId?: number
    amount: number
    referenceNumber?: string
    chequeNo?: string
    chequeDate?: string
    bankName?: string
  }[]
}


export interface FundsTransfer {
  id: number
  transferNumber: string
  transferDate: string
  sourceBankAccountId: number
  destinationBankAccountId: number
  amount: number | string
  description?: string
  referenceNumber?: string
  status: 'Draft' | 'Submitted' | 'Approved' | 'Posted' | 'Reconciled' | 'Cancelled'
  reconciliationStatus?: 'Pending' | 'Reconciled' | 'Mismatched'
  reconciliationDate?: string
  cancellationReason?: string
  sourceBankAccount?: LedgerAccount
  destinationBankAccount?: LedgerAccount
  SourceBankAccount?: LedgerAccount
  DestinationBankAccount?: LedgerAccount
  Creator?: { id: number; fullName: string; email: string }
  createdAt?: string
  updatedAt?: string
  createdByUsername?: string
  updatedByUsername?: string
}

export interface CreateFundsTransferRequest {
  transferDate: string
  sourceBankAccountId: number
  destinationBankAccountId: number
  amount: number
  description?: string
  referenceNumber?: string
}

export interface UpdateFundsTransferRequest {
  transferDate?: string
  amount?: number
  description?: string
}


// API Methods
export const billEntriesApi = {
  ...crud('bill-entries'),

  getAll: async <T = BillEntry>(params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<PaginatedResponse<T>> => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.search) query.append('search', params.search)
    if (params?.status && params.status !== 'All') query.append('status', params.status)
    const res = await apiRequest<any>(`/bill-entries?${query.toString()}`)

    if (res && res.data && res.pagination) {
      return {
        data: res.data,
        pagination: {
          page: res.pagination.page || 1,
          limit: res.pagination.limit || 10,
          total: res.pagination.total || 0,
          totalPages: res.pagination.pages || 0,
          hasNextPage: (res.pagination.page || 1) < (res.pagination.pages || 0),
          hasPrevPage: (res.pagination.page || 1) > 1
        }
      }
    }

    return {
      data: Array.isArray(res) ? res : [],
      pagination: {
        page: 1,
        limit: 10,
        total: Array.isArray(res) ? res.length : 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    }
  },

  submit: (id: number | string) =>
    apiRequest<BillEntry>(`/bill-entries/${id}/submit`, { method: 'POST' }),

  approve: (id: number | string) =>
    apiRequest<BillEntry>(`/bill-entries/${id}/approve`, { method: 'POST' }),

  post: (id: number | string) =>
    apiRequest<BillEntry>(`/bill-entries/${id}/post`, { method: 'POST' }),

  reject: (id: number | string, payload: { rejectionReason: string }) =>
    apiRequest<BillEntry>(`/bill-entries/${id}/reject`, { method: 'POST', body: JSON.stringify(payload) }),

  getBySupplier: (supplierId: number, params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.status) query.append('status', params.status)
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    return apiRequest<BillEntry[]>(`/bill-entries/supplier/${supplierId}?${query.toString()}`)
  },

  getOutstanding: async (supplierId?: number, params?: { page?: number; limit?: number }): Promise<BillEntry[]> => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    
    const endpoint = supplierId 
      ? `/bill-entries/supplier/${supplierId}/outstanding?${query.toString()}` 
      : `/bill-entries/outstanding?${query.toString()}`
    const response = await apiRequest<any>(endpoint)
    return response?.data || response || []
  },

  // Detail operations
  addDetail: (billEntryId: number, payload: BillEntryDetail) =>
    apiRequest<BillEntryDetail>(`/bill-entries/${billEntryId}/details`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateDetail: (billEntryId: number, detailId: number, payload: Partial<BillEntryDetail>) =>
    apiRequest<BillEntryDetail>(`/bill-entries/${billEntryId}/details/${detailId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  removeDetail: (billEntryId: number, detailId: number) =>
    apiRequest<void>(`/bill-entries/${billEntryId}/details/${detailId}`, {
      method: 'DELETE'
    }),

  getDetails: (billEntryId: number) =>
    apiRequest<BillEntryDetail[]>(`/bill-entries/${billEntryId}/details`),
}

export const billPaymentsApi = {
  ...crud('bill-payments'),

  allocate: (id: number | string, payload: { allocations: PaymentAllocation[] }) =>
    apiRequest<BillPayment>(`/bill-payments/${id}/allocate`, { method: 'POST', body: JSON.stringify(payload) }),

  submit: (id: number | string) =>
    apiRequest<BillPayment>(`/bill-payments/${id}/submit`, { method: 'POST' }),

  approve: (id: number | string) =>
    apiRequest<BillPayment>(`/bill-payments/${id}/approve`, { method: 'POST' }),

  post: (id: number | string) =>
    apiRequest<BillPayment>(`/bill-payments/${id}/post`, { method: 'POST' }),

  cancel: (id: number | string, payload?: { cancellationReason?: string }) =>
    apiRequest<BillPayment>(`/bill-payments/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload || {}) }),

  getAllocations: (id: number | string) =>
    apiRequest<PaymentAllocation[]>(`/bill-payments/${id}/allocations`),

  getBySupplier: (supplierId: number, params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.status) query.append('status', params.status)
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    return apiRequest<BillPayment[]>(`/bill-payments/supplier/${supplierId}?${query.toString()}`)
  },
}

export const onePaymentsApi = {
  ...crud('one-payments'),

  getAll: <T = OnePayment>(params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.search) query.append('search', params.search)
    if (params?.status && params.status !== 'All') query.append('status', params.status)
    return apiRequest<PaginatedResponse<T>>(`/one-payments?${query.toString()}`)
  },

  submit: (id: number | string) =>
    apiRequest<OnePayment>(`/one-payments/${id}/submit`, { method: 'POST' }),

  approve: (id: number | string) =>
    apiRequest<OnePayment>(`/one-payments/${id}/approve`, { method: 'POST' }),

  approveAndPost: (id: number | string) =>
    apiRequest<OnePayment>(`/one-payments/${id}/approve-and-post`, { method: 'POST' }),

  post: (id: number | string) =>
    apiRequest<OnePayment>(`/one-payments/${id}/post`, { method: 'POST' }),

  reject: (id: number | string, payload: { rejectionReason: string }) =>
    apiRequest<OnePayment>(`/one-payments/${id}/reject`, { method: 'POST', body: JSON.stringify(payload) }),

  reverse: (id: number | string, payload: { reversalReason: string }) =>
    apiRequest<OnePayment>(`/one-payments/${id}/reverse`, { method: 'POST', body: JSON.stringify(payload) }),

  cancel: (id: number | string) =>
    apiRequest<OnePayment>(`/one-payments/${id}/cancel`, { method: 'POST' }),
}

export const fundsTransfersApi = {
  ...crud('funds-transfers'),

  submit: (id: number | string) =>
    apiRequest<FundsTransfer>(`/funds-transfers/${id}/submit`, { method: 'POST' }),

  approve: (id: number | string) =>
    apiRequest<FundsTransfer>(`/funds-transfers/${id}/approve`, { method: 'POST' }),

  post: (id: number | string) =>
    apiRequest<FundsTransfer>(`/funds-transfers/${id}/post`, { method: 'POST' }),

  reconcile: (id: number | string, payload?: { reconciliationDate?: string }) =>
    apiRequest<FundsTransfer>(`/funds-transfers/${id}/reconcile`, { method: 'POST', body: JSON.stringify(payload || {}) }),

  cancel: (id: number | string, payload?: { cancellationReason?: string }) =>
    apiRequest<FundsTransfer>(`/funds-transfers/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload || {}) }),

  getByAccount: (accountId: number, params?: { dateFrom?: string; dateTo?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom)
    if (params?.dateTo) query.append('dateTo', params.dateTo)
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    return apiRequest<FundsTransfer[]>(`/funds-transfers/account/${accountId}?${query.toString()}`)
  },
}

export const paymentAllocationsApi = {
  getByBill: (billEntryId: number) =>
    apiRequest<PaymentAllocation[]>(`/payment-allocations/bill/${billEntryId}`),

  getSupplierOutstanding: (supplierId: number) =>
    apiRequest<BillEntry[]>(`/payment-allocations/supplier/${supplierId}/outstanding`),

  getSupplierSummary: (supplierId: number) =>
    apiRequest<any>(`/payment-allocations/supplier/${supplierId}/summary`),
}


/* -------------------------------------------------------------------------- */
/*                        ACCOUNTING REPORTS TYPES & APIS                    */
/* -------------------------------------------------------------------------- */

// Trial Balance Report
export interface TrialBalanceItem {
  ledgerCode: string
  ledgerName: string
  accountType: string
  accountCategory: string
  openingBalance: string | number
  openingBalanceType: 'DR' | 'CR'
  journalDebits: string | number
  journalCredits: string | number
  closingBalance: string | number
  closingBalanceType: 'DR' | 'CR'
  debitBalance: string | number
  creditBalance: string | number
}

export interface TrialBalanceReport {
  success: boolean
  asOfDate: string
  data: TrialBalanceItem[]
  summary: {
    totalDebits: string | number
    totalCredits: string | number
    difference: string | number
    isBalanced: boolean
    message: string
  }
}

// Profit & Loss Report
export interface ProfitLossReport {
  success: boolean
  period: {
    startDate: string
    endDate: string
  }
  incomeStatement: {
    sales: {
      accounts: Array<{
        ledgerCode: string
        ledgerName: string
        amount: string | number
      }>
      total: string | number
    }
    costOfGoodsSold: {
      amount: string | number
    }
    grossProfit: string | number
    operatingExpenses: {
      accounts: Array<{
        ledgerCode: string
        ledgerName: string
        amount: string | number
      }>
      total: string | number
    }
    netProfitLoss: string | number
    profitMargin: string | number
  }
}

// Balance Sheet Report
export interface BalanceSheetReport {
  success: boolean
  asOfDate: string
  balanceSheet: {
    assets: {
      accounts: Array<{
        ledgerCode: string
        ledgerName: string
        category: string
        amount: string | number
      }>
      total: string | number
    }
    liabilities: {
      accounts: Array<{
        ledgerCode: string
        ledgerName: string
        category: string
        amount: string | number
      }>
      total: string | number
    }
    equity: {
      accounts: Array<{
        ledgerCode: string
        ledgerName: string
        category: string
        amount: string | number
      }>
      total: string | number
    }
  }
  summary: {
    totalAssets: string | number
    totalLiabilitiesAndEquity: string | number
    difference: string | number
    isBalanced: boolean
    message: string
  }
}

// Customer Outstanding Report
export interface CustomerOutstandingItem {
  customerId: number
  customerName: string
  creditLimit: string | number
  totalOutstanding: string | number
  creditExceeded: boolean
  invoices: Array<{
    invoiceNumber: string
    invoiceDate: string
    invoiceAmount: string | number
    paidAmount: string | number
    balanceAmount: string | number
    daysOutstanding: number
    agingBucket: string
  }>
}

export interface CustomerOutstandingReport {
  success: boolean
  asOfDate: string
  customerOutstanding: CustomerOutstandingItem[]
  summary: {
    totalCustomers: number
    totalOutstanding: string | number
    overdueCases: number
  }
}

// Supplier Outstanding Report
export interface SupplierOutstandingItem {
  supplierId: number
  supplierName: string
  totalOutstanding: string | number
  bills: Array<{
    billNumber: string
    billDate: string
    billAmount: string | number
    paidAmount: string | number
    balanceAmount: string | number
    daysOutstanding: number
    agingBucket: string
  }>
}

export interface SupplierOutstandingReport {
  success: boolean
  asOfDate: string
  supplierOutstanding: SupplierOutstandingItem[]
  summary: {
    totalSuppliers: number
    totalOutstanding: string | number
    overduePayments: number
  }
}

// Stock Valuation Report
export interface StockValuationItem {
  itemSku: string
  itemName: string
  quantity: number
  unitCost: string | number
  sellingPrice: string | number
  valuationAtCost: string | number
  valuationAtMarket: string | number
  margin: string | number
}

export interface StockValuationReport {
  success: boolean
  asOfDate: string
  stockValuation: StockValuationItem[]
  summary: {
    totalItems: number
    totalQuantity: number
    totalValuationAtCost: string | number
    totalValuationAtMarket: string | number
    potentialProfit: string | number
    profitMargin: string | number
  }
}

// Cash & Bank Book Report
export interface CashBankTransaction {
  date: string
  referenceNo?: string
  description: string
  debit: string | number
  credit: string | number
  balance: string | number
}

export interface CashBankAccountData {
  ledgerName: string
  ledgerType: 'CASH' | 'BANK'
  openingBalance: string | number
  closingBalance: string | number
  transactions: CashBankTransaction[]
}

export interface Bank {
  id: number
  code: string
  name: string
  status: 'Active' | 'Inactive'
  createdAt?: string
  updatedAt?: string
}

export interface BankBranch {
  id: number
  bankId: number
  branchCode: string
  branchName: string
  swiftCode?: string
  status: 'Active' | 'Inactive'
  createdAt?: string
  updatedAt?: string
  Bank?: Bank
  bank?: Bank
}

export const banksApi = {
  ...crud('banks'),

  // Get all banks
  async getAll(params?: { status?: string }): Promise<Bank[]> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)

    const queryString = queryParams.toString()
    const res = await apiRequest<{ data: Bank[] }>(`/banks${queryString ? `?${queryString}` : ''}`)
    return res.data || []
  },

  // Get bank by ID
  async getById(id: number | string): Promise<Bank> {
    const res = await apiRequest<{ data: Bank }>(`/banks/${id}`)
    return res.data
  },
}

export const bankBranchesApi = {
  ...crud('bank-branches'),

  // Get all bank branches
  async getAll(params?: { status?: string }): Promise<BankBranch[]> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)

    const queryString = queryParams.toString()
    const res = await apiRequest<{ data: BankBranch[] }>(`/bank-branches${queryString ? `?${queryString}` : ''}`)
    return res.data || []
  },

  // Get bank branch by ID
  async getById(id: number | string): Promise<BankBranch> {
    const res = await apiRequest<{ data: BankBranch }>(`/bank-branches/${id}`)
    return res.data
  },

  // Get branches by bank ID
  async getByBankId(bankId: number): Promise<BankBranch[]> {
    const res = await apiRequest<{ data: BankBranch[] }>(`/bank-branches/bank/${bankId}`)
    return res.data || []
  },
}

export interface CashBankBookReport {
  success: boolean
  period: {
    startDate: string
    endDate: string
  }
  accounts: CashBankAccountData[]
  summary: {
    totalCash: string | number
    totalBank: string | number
    totalCashAndBank: string | number
  }
}

// Accounting Dashboard
export interface AccountingDashboard {
  success: boolean
  asOfDate: string
  dashboard: {
    trialBalance: {
      totalDebits: string | number
      totalCredits: string | number
      isBalanced: boolean
    }
    profitAndLoss: {
      totalIncome: string | number
      totalExpenses: string | number
      netProfit: string | number
    }
    balanceSheet: {
      totalAssets: string | number
      totalLiabilities: string | number
      totalEquity: string | number
      isBalanced: boolean
    }
  }
}

export const accountingReportsApi = {
  // Trial Balance Report
  async getTrialBalance(params?: {
    asOfDate?: string
  }): Promise<TrialBalanceReport> {
    const queryParams = new URLSearchParams()
    if (params?.asOfDate) queryParams.append('asOfDate', params.asOfDate)

    const queryString = queryParams.toString()
    return apiRequest<TrialBalanceReport>(`/accounting/trial-balance${queryString ? `?${queryString}` : ''}`)
  },

  // Profit & Loss Report
  async getProfitLoss(params: {
    startDate: string
    endDate: string
  }): Promise<ProfitLossReport> {
    const queryParams = new URLSearchParams()
    queryParams.append('startDate', params.startDate)
    queryParams.append('endDate', params.endDate)

    return apiRequest<ProfitLossReport>(`/accounting/profit-loss?${queryParams.toString()}`)
  },

  // Balance Sheet Report
  async getBalanceSheet(params?: {
    asOfDate?: string
  }): Promise<BalanceSheetReport> {
    const queryParams = new URLSearchParams()
    if (params?.asOfDate) queryParams.append('asOfDate', params.asOfDate)

    const queryString = queryParams.toString()
    return apiRequest<BalanceSheetReport>(`/accounting/balance-sheet${queryString ? `?${queryString}` : ''}`)
  },

  // Customer Outstanding Report
  async getCustomerOutstanding(params?: {
    asOfDate?: string
    customerId?: number | string
  }): Promise<CustomerOutstandingReport> {
    const queryParams = new URLSearchParams()
    if (params?.asOfDate) queryParams.append('asOfDate', params.asOfDate)
    if (params?.customerId) queryParams.append('customerId', params.customerId.toString())

    const queryString = queryParams.toString()
    return apiRequest<CustomerOutstandingReport>(`/accounting/customer-outstanding${queryString ? `?${queryString}` : ''}`)
  },

  // Supplier Outstanding Report
  async getSupplierOutstanding(params?: {
    asOfDate?: string
  }): Promise<SupplierOutstandingReport> {
    const queryParams = new URLSearchParams()
    if (params?.asOfDate) queryParams.append('asOfDate', params.asOfDate)

    const queryString = queryParams.toString()
    return apiRequest<SupplierOutstandingReport>(`/accounting/supplier-outstanding${queryString ? `?${queryString}` : ''}`)
  },

  // Stock Valuation Report
  async getStockValuation(params?: {
    asOfDate?: string
  }): Promise<StockValuationReport> {
    const queryParams = new URLSearchParams()
    if (params?.asOfDate) queryParams.append('asOfDate', params.asOfDate)

    const queryString = queryParams.toString()
    return apiRequest<StockValuationReport>(`/accounting/stock-valuation${queryString ? `?${queryString}` : ''}`)
  },

  // Cash & Bank Book Report
  async getCashBankBook(params?: {
    startDate?: string
    endDate?: string
  }): Promise<CashBankBookReport> {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)

    const queryString = queryParams.toString()
    return apiRequest<CashBankBookReport>(`/accounting/cash-bank-book${queryString ? `?${queryString}` : ''}`)
  },

  // Accounting Dashboard
  async getDashboard(): Promise<AccountingDashboard> {
    return apiRequest<AccountingDashboard>(`/accounting/dashboard`)
  },

  // Ledger Details Report
  async getLedgerDetails(params: {
    ledgerAccountId: number
    startDate: string
    endDate: string
  }): Promise<LedgerDetailsReport> {
    const queryParams = new URLSearchParams()
    queryParams.append('ledgerAccountId', params.ledgerAccountId.toString())
    queryParams.append('startDate', params.startDate)
    queryParams.append('endDate', params.endDate)

    return apiRequest<LedgerDetailsReport>(`/accounting/ledger-details?${queryParams.toString()}`)
  },

  // General Ledger Report (all accounts)
  async getGeneralLedger(params: {
    startDate: string
    endDate: string
    accountCategory?: string
  }): Promise<any> {
    const queryParams = new URLSearchParams()
    queryParams.append('startDate', params.startDate)
    queryParams.append('endDate', params.endDate)
    if (params.accountCategory && params.accountCategory !== 'all') {
      queryParams.append('accountCategory', params.accountCategory)
    }

    return apiRequest<any>(`/accounting/general-ledger?${queryParams.toString()}`)
  },
}

// Ledger Details Report Interface
export interface LedgerDetailsReport {
  success: boolean
  ledgerAccount: {
    id: number
    ledgerCode: string
    name: string
    accountType: string
    accountCategory: string
    controlAccount: string
    description?: string
  }
  period: {
    startDate: string
    endDate: string
  }
  balances: {
    openingBalance: string
    openingBalanceType: 'DR' | 'CR'
    closingBalance: string
    closingBalanceType: 'DR' | 'CR'
  }
  periodTotals: {
    totalDebit: string
    totalCredit: string
    netMovement: string
  }
  transactions: Array<{
    transactionId: number
    transactionNumber: string
    transactionDate: string
    module: string
    referenceModule: string
    referenceNumber: string
    referenceId: number
    description: string
    debit: string
    credit: string
    balance: string
    balanceType: 'DR' | 'CR'
  }>
  summary: {
    totalTransactions: number
    periodStartDate: string
    periodEndDate: string
  }
}

/* -------------------------------------------------------------------------- */
/*                              STOCK MANAGEMENT                              */
/* -------------------------------------------------------------------------- */

export interface StockByStore {
  id: number
  itemId: number
  storeId: number
  availableQty: number
  reservedQty?: number
  weight?: number
  status?: string
  updatedAt?: string
  Store?: {
    id: number
    name: string
    capacity?: number
  }
  Item?: {
    id: number
    name: string
    sku: string
    barcode?: string
    unit?: string
  }
}

export interface StockTransferData {
  itemId: number
  fromStoreId: number
  toStoreId: number
  qty: number
  weight: number
  remark: string
}

export const stockApi = {
  // Get stock details for a specific item across all stores
  async getByItem(itemId: number | string): Promise<StockByStore[]> {
    return apiRequest<StockByStore[]>(`/stock/item/${itemId}`)
  },

  async transfer(data: StockTransferData): Promise<any> {
    return apiRequest('/stock/transfer', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  async getByStore(storeId: number | string): Promise<any> {
    return apiRequest(`/stock/store/${storeId}`)
  },

  async getDetails(itemId: number | string, storeId?: number | string): Promise<any> {
    const query = storeId ? `?storeId=${storeId}` : ''
    return apiRequest(`/stock/item/${itemId}/details${query}`)
  },

  async getAll(filters?: { itemId?: number; storeId?: number; locationId?: number }): Promise<any> {
    const params = new URLSearchParams()
    if (filters?.itemId) params.append('itemId', filters.itemId.toString())
    if (filters?.storeId) params.append('storeId', filters.storeId.toString())
    if (filters?.locationId) params.append('locationId', filters.locationId.toString())

    const query = params.toString()
    return apiRequest(`/stock${query ? `?${query}` : ''}`)
  },
}

export const stockAdjustmentApi = {
  /** GET /stock/adjustment/all - Fetch adjustments with filters */
  async getAll(params?: {
    storeId?: number
    locationId?: number
    status?: string
  }): Promise<StockAdjustment[]> {
    const query = new URLSearchParams()
    if (params?.storeId) query.append('storeId', params.storeId.toString())
    if (params?.locationId) query.append('locationId', params.locationId.toString())
    if (params?.status) query.append('status', params.status)

    const queryString = query.toString()
    return apiRequest<StockAdjustment[]>(`/stock/adjustment/all${queryString ? `?${queryString}` : ''}`)
  },

  /** GET /stock/adjustment/:id - Get full details including items */
  async getById(id: number | string): Promise<StockAdjustment> {
    return apiRequest<StockAdjustment>(`/stock/adjustment/${id}`)
  },

  /** POST /stock/adjustment/create - Create new stock adjustment */
  async create(data: {
    locationId: number
    storeId: number
    adjustmentDate: string
    reason: string
    notes?: string
    items: Array<{
      itemId: number
      batchId?: number
      systemQty: number
      adjustedQty: number
      newQty: number
      remark?: string
    }>
  }): Promise<StockAdjustment> {
    return apiRequest<StockAdjustment>('/stock/adjustment/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /** PUT /stock/adjustment/update/:id - Update existing stock adjustment */
  async update(id: number | string, data: {
    reason: string
    notes?: string
    items: Array<{
      itemId: number
      batchId?: number
      systemQty: number
      adjustedQty: number
      newQty: number
      remark?: string
    }>
  }): Promise<StockAdjustment> {
    return apiRequest<StockAdjustment>(`/stock/adjustment/update/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /** POST /stock/adjustment/approve/:id - Approve stock adjustment */
  async approve(id: number | string, status: string): Promise<StockAdjustment> {
    return apiRequest<StockAdjustment>(`/stock/adjustment/approve/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  },
}

export const stockReconciliationApi = {
  /** GET /stock/reconciliation/all - Fetch all reconciliations */
  async getAll(params?: {
    storeId?: number
    locationId?: number
    status?: string
  }): Promise<StockReconciliation[]> {
    const query = new URLSearchParams()
    if (params?.storeId) query.append('storeId', params.storeId.toString())
    if (params?.locationId) query.append('locationId', params.locationId.toString())
    if (params?.status) query.append('status', params.status)

    const queryString = query.toString()
    return apiRequest<StockReconciliation[]>(`/stock/reconciliation/all${queryString ? `?${queryString}` : ''}`)
  },

  /** GET /stock/reconciliation/:id - Get details */
  async getById(id: number | string): Promise<StockReconciliation> {
    return apiRequest<StockReconciliation>(`/stock/reconciliation/${id}`)
  },

  /** POST /stock/reconciliation/create - Create new stock reconciliation */
  async create(data: {
    locationId: number
    storeId: number
    reconciliationDate: string
    notes?: string
    items: Array<{
      itemId: number
      batchId?: number | null
      systemQty: number
      physicalQty: number
      remark?: string
    }>
  }): Promise<StockReconciliation> {
    return apiRequest<StockReconciliation>('/stock/reconciliation/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /** PUT /stock/reconciliation/update/:id - Update existing reconciliation */
  async update(id: number | string, data: {
    notes?: string
    items: Array<{
      itemId: number
      batchId?: number | null
      systemQty: number
      physicalQty: number
      remark?: string
    }>
  }): Promise<StockReconciliation> {
    return apiRequest<StockReconciliation>(`/stock/reconciliation/update/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /** POST /stock/reconciliation/approve/:id - Approve stock reconciliation */
  async approve(id: number | string, status: 'Approved' | 'Rejected' | string): Promise<StockReconciliation> {
    return apiRequest<StockReconciliation>(`/stock/reconciliation/approve/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  },
}

/* -------------------------------------------------------------------------- */
/*                            CREDIT NOTES API                                */
/* -------------------------------------------------------------------------- */

function transformCreditNote(backend: any): CreditNote {
  const items = (backend.CreditNoteItems || backend.items || []).map((item: any) => ({
    ...item,
    qty: parseFloat(item.qty || 0),
    unitPrice: parseFloat(item.unitPrice || 0),
    total: parseFloat(item.total || 0),
    taxAmount: parseFloat(item.taxAmount || 0)
  }))
  return {
    ...backend,
    taxAmount: parseFloat(backend.taxAmount || 0),
    subtotal: parseFloat(backend.subtotal || 0),
    total: parseFloat(backend.total || 0),
    appliedAmount: parseFloat(backend.appliedAmount || 0),
    taxRate: parseFloat(backend.taxRate || 0),
    items: items,
    CreditNoteItems: items
  }
}

export const creditNotesApi = {
  /** GET /credit-notes - Get all credit notes with optional filters */
  async getAll(params?: {
    page?: number
    limit?: number
    status?: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Applied' | 'Cancelled' | 'all'
    customerId?: number | string
    locationId?: number | string
    search?: string
  }): Promise<PaginatedResponse<CreditNote>> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status)
    if (params?.customerId && params.customerId !== 'all') queryParams.append('customerId', params.customerId.toString())
    if (params?.locationId && params.locationId !== 'all') queryParams.append('locationId', params.locationId.toString())
    if (params?.search) queryParams.append('search', params.search)

    const url = `/credit-notes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const res = await apiRequest<any>(url)

    if (res && typeof res === 'object' && 'creditNotes' in res) {
      return {
        data: (res.creditNotes || []).map(transformCreditNote),
        pagination: {
          page: res.pagination?.page || 1,
          limit: res.pagination?.limit || 10,
          total: res.pagination?.total || 0,
          totalPages: res.pagination?.pages || 0,
          hasNextPage: (res.pagination?.page || 1) < (res.pagination?.pages || 0),
          hasPrevPage: (res.pagination?.page || 1) > 1
        }
      }
    }

    const data = Array.isArray(res) ? res : []
    return {
      data: data.map(transformCreditNote),
      pagination: {
        page: 1,
        limit: data.length,
        total: data.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    }
  },

  /** GET /credit-notes/:id - Get credit note by ID */
  async getById(id: number | string): Promise<CreditNote> {
    return apiRequest<CreditNote>(`/credit-notes/${id}`)
  },

  /** GET /credit-notes/customer/:customerId - Get credit notes by customer ID */
  async getByCustomer(customerId: number, status?: string): Promise<CreditNote[]> {
    const queryParams = new URLSearchParams()
    if (status) queryParams.append('status', status)

    const url = `/credit-notes/customer/${customerId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiRequest<CreditNote[]>(url)
  },

  /** GET /credit-notes/customer/:customerId/available-credit - Get customer available credit */
  async getCustomerAvailableCredit(customerId: number): Promise<CustomerAvailableCredit> {
    return apiRequest<CustomerAvailableCredit>(`/credit-notes/customer/${customerId}/available-credit`)
  },

  /** GET /credit-notes/:id/items - Get credit note items */
  async getItems(id: number | string): Promise<CreditNoteItem[]> {
    return apiRequest<CreditNoteItem[]>(`/credit-notes/${id}/items`)
  },

  /** POST /credit-notes - Create new credit note */
  async create(data: CreateCreditNoteRequest): Promise<{
    message: string
    creditNote: CreditNote
  }> {
    return apiRequest<{
      message: string
      creditNote: CreditNote
    }>('/credit-notes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /** POST /credit-notes/from-return - Create credit note from customer return */
  async createFromReturn(customerReturnId: number): Promise<{
    message: string
    creditNote: CreditNote
  }> {
    return apiRequest<{
      message: string
      creditNote: CreditNote
    }>('/credit-notes/from-return', {
      method: 'POST',
      body: JSON.stringify({ customerReturnId }),
    })
  },

  /** PUT /credit-notes/:id - Update credit note (only if status is Draft) */
  async update(id: number | string, data: UpdateCreditNoteRequest): Promise<{
    message: string
    creditNote: CreditNote
  }> {
    return apiRequest<{
      message: string
      creditNote: CreditNote
    }>(`/credit-notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /** DELETE /credit-notes/:id - Delete credit note (only if status is Draft) */
  async remove(id: number | string): Promise<{
    message: string
  }> {
    return apiRequest<{
      message: string
    }>(`/credit-notes/${id}`, {
      method: 'DELETE',
    })
  },

  /** PATCH /credit-notes/:id/approve-reject - Approve or reject credit note */
  async approveOrReject(id: number | string, action: 'approve' | 'reject', rejectionReason?: string): Promise<{
    message: string
    creditNote: CreditNote
  }> {
    return apiRequest<{
      message: string
      creditNote: CreditNote
    }>(`/credit-notes/${id}/approve-reject`, {
      method: 'PATCH',
      body: JSON.stringify({
        action,
        ...(rejectionReason && { rejectionReason }),
      }),
    })
  },

  /** POST /credit-notes/:id/apply - Apply credit note to invoice */
  async applyToInvoice(id: number | string, data: ApplyCreditNoteRequest): Promise<{
    message: string
    creditNote: CreditNote
    invoice: any
  }> {
    return apiRequest<{
      message: string
      creditNote: CreditNote
      invoice: any
    }>(`/credit-notes/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

/* -------------------------------------------------------------------------- */
/*                       BANK RECONCILIATION MODULE                          */
/* -------------------------------------------------------------------------- */

export interface BankReconciliationItem {
  id?: number
  reconciliationId?: number
  transactionType: 'Book' | 'Statement'
  transactionDate: string
  description: string
  referenceNumber?: string
  debitAmount: number
  creditAmount: number
  isMatched: boolean
  matchedItemId?: number
  journalEntryId?: number
  receiptId?: number
  paymentId?: number
  transferId?: number
  statementLineId?: number
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface BankReconciliation {
  id?: number
  reconciliationNumber: string
  bankAccountId: number
  reconciliationDate: string
  statementDate: string
  openingBalance: number
  closingBalance: number
  statementOpeningBalance: number
  statementClosingBalance: number
  status: 'Draft' | 'In Progress' | 'Reconciled' | 'Approved'
  totalBookDebits: number
  totalBookCredits: number
  totalStatementDebits: number
  totalStatementCredits: number
  outstandingChecks: number
  depositsInTransit: number
  difference: number
  notes?: string
  reconciledBy?: number
  reconciledAt?: string
  approvedBy?: number
  approvedAt?: string
  createdAt?: string
  createdBy?: number
  updatedAt?: string
  updatedBy?: number
  bankAccount?: LedgerAccount
  items?: BankReconciliationItem[]
  ReconciledByUser?: { id: number; fullName: string }
  ApprovedByUser?: { id: number; fullName: string }
  Creator?: { id: number; fullName: string }
}

export interface BankStatementLine {
  id?: number
  statementId?: number
  transactionDate: string
  description: string
  referenceNumber?: string
  debitAmount: number
  creditAmount: number
  balance: number
  isReconciled: boolean
  reconciliationItemId?: number
  createdAt?: string
  updatedAt?: string
}

export interface BankStatement {
  id?: number
  statementNumber: string
  bankAccountId: number
  statementDate: string
  openingBalance: number
  closingBalance: number
  totalDebits: number
  totalCredits: number
  status: 'Draft' | 'Finalized'
  notes?: string
  createdAt?: string
  createdBy?: number
  updatedAt?: string
  updatedBy?: number
  bankAccount?: LedgerAccount
  lines?: BankStatementLine[]
}

export interface UnreconciledTransaction {
  id: number
  transactionDate?: string
  description: string
  referenceNumber?: string
  chequeNumber?: string
  debitAmount: number | string
  creditAmount: number | string
  transactionType?: 'Journal' | 'Receipt' | 'Payment' | 'Transfer'
  referenceId?: number
  journalNumber?: string
  receiptNumber?: string
  paymentNumber?: string
  transferNumber?: string
  TransactionHeader?: {
    id: number
    transactionNumber: string
    transactionDate: string
    description: string
    status: string
  }
}

export interface UnreconciledTransactionDetailsResponse {
  checksAndPayments: UnreconciledTransaction[]
  depositsAndCredits: UnreconciledTransaction[]
  openingBalance: number
}

export interface BankReconciliationSummary {
  reconciliation: BankReconciliation
  bookTransactions: {
    total: number
    matched: number
    unmatched: number
    totalDebits: number
    totalCredits: number
  }
  statementTransactions: {
    total: number
    matched: number
    unmatched: number
    totalDebits: number
    totalCredits: number
  }
  outstandingItems: {
    checks: Array<{
      id: number
      date: string
      description: string
      amount: number
      referenceNumber?: string
    }>
    deposits: Array<{
      id: number
      date: string
      description: string
      amount: number
      referenceNumber?: string
    }>
  }
  calculatedBalance: number
  difference: number
  isBalanced: boolean
}

export const bankReconciliationsApi = {
  /** GET /accounting/bank-reconciliations - List all reconciliations */
  async getAll(params?: {
    page?: number
    limit?: number
    status?: string
    bankAccountId?: number
    startDate?: string
    endDate?: string
  }): Promise<PaginatedResponse<BankReconciliation>> {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.status) query.append('status', params.status)
    if (params?.bankAccountId) query.append('bankAccountId', params.bankAccountId.toString())
    if (params?.startDate) query.append('startDate', params.startDate)
    if (params?.endDate) query.append('endDate', params.endDate)

    return apiRequest<PaginatedResponse<BankReconciliation>>(
      `/accounting/bank-reconciliations?${query.toString()}`
    )
  },

  /** GET /accounting/bank-reconciliations/:id - Get reconciliation details */
  async getById(id: number | string): Promise<BankReconciliation> {
    return apiRequest<BankReconciliation>(`/accounting/bank-reconciliations/${id}`)
  },

  /** POST /accounting/bank-reconciliations - Create new reconciliation */
  async create(data: {
    bankAccountId: number
    reconciliationNumber: string
    reconciliationDate: string
    statementDate: string
    statementPeriodFrom: string
    statementPeriodTo: string
    openingBalance: number
    closingBalance: number
    remarks?: string
    items: any[]
  }): Promise<BankReconciliation> {
    return apiRequest<BankReconciliation>('/accounting/bank-reconciliations', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /** PUT /accounting/bank-reconciliations/:id - Update reconciliation */
  async update(
    id: number | string,
    data: Partial<BankReconciliation>
  ): Promise<BankReconciliation> {
    return apiRequest<BankReconciliation>(`/accounting/bank-reconciliations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /** DELETE /accounting/bank-reconciliations/:id - Delete reconciliation */
  async delete(id: number | string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/accounting/bank-reconciliations/${id}`, {
      method: 'DELETE',
    })
  },

  /** GET /accounting/bank-reconciliations/unreconciled-transactions/:bankAccountId - Get unmatched transactions */
  async getUnreconciledTransactions(
    bankAccountId: number,
    asOfDate?: string
  ): Promise<UnreconciledTransaction[]> {
    const query = asOfDate ? `?asOfDate=${asOfDate}` : ''
    return apiRequest<UnreconciledTransaction[]>(
      `/accounting/bank-reconciliations/unreconciled-transactions/${bankAccountId}${query}`
    )
  },

  /** GET /accounting/bank-reconciliations/unreconciled-transaction-details/:bankAccountId - Get unmatched transactions with date range */
  async getUnreconciledTransactionDetails(
    bankAccountId: number,
    params?: { dateFrom?: string; dateTo?: string }
  ): Promise<UnreconciledTransactionDetailsResponse> {
    const query = new URLSearchParams()
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom)
    if (params?.dateTo) query.append('dateTo', params.dateTo)

    const queryString = query.toString()
    return apiRequest<UnreconciledTransactionDetailsResponse>(
      `/accounting/bank-reconciliations/unreconciled-transaction-details/${bankAccountId}${queryString ? `?${queryString}` : ''}`
    )
  },

  /** POST /accounting/bank-reconciliations/:id/items - Add items to reconciliation */
  async addItems(
    id: number | string,
    items: Omit<BankReconciliationItem, 'id' | 'reconciliationId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<{ message: string; items: BankReconciliationItem[] }> {
    return apiRequest<{ message: string; items: BankReconciliationItem[] }>(
      `/accounting/bank-reconciliations/${id}/items`,
      {
        method: 'POST',
        body: JSON.stringify({ items }),
      }
    )
  },

  /** POST /accounting/bank-reconciliations/:id/match - Match book and statement items */
  async matchItems(
    id: number | string,
    data: {
      bookItemId: number
      statementItemId: number
    }
  ): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(
      `/accounting/bank-reconciliations/${id}/match`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  },

  /** POST /accounting/bank-reconciliations/:id/unmatch - Unmatch items */
  async unmatchItems(
    id: number | string,
    data: {
      itemId: number
    }
  ): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(
      `/accounting/bank-reconciliations/${id}/unmatch`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  },

  /** POST /accounting/bank-reconciliations/:id/complete - Mark as reconciled */
  async complete(id: number | string): Promise<BankReconciliation> {
    return apiRequest<BankReconciliation>(
      `/accounting/bank-reconciliations/${id}/complete`,
      {
        method: 'POST',
      }
    )
  },

  /** POST /accounting/bank-reconciliations/:id/approve - Approve reconciliation */
  async approve(id: number | string): Promise<BankReconciliation> {
    return apiRequest<BankReconciliation>(
      `/accounting/bank-reconciliations/${id}/approve`,
      {
        method: 'POST',
      }
    )
  },

  /** POST /accounting/bank-reconciliations/:id/reject - Reject reconciliation */
  async reject(
    id: number | string,
    data: { reason: string }
  ): Promise<BankReconciliation> {
    return apiRequest<BankReconciliation>(
      `/accounting/bank-reconciliations/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  },

  /** GET /accounting/bank-reconciliations/:id/summary - Get detailed summary report */
  async getSummary(id: number | string): Promise<BankReconciliationSummary> {
    return apiRequest<BankReconciliationSummary>(
      `/accounting/bank-reconciliations/${id}/summary`
    )
  },
}

export const bankStatementsApi = {
  /** GET /accounting/bank-reconciliations/statements - List all statements */
  async getAll(params?: {
    page?: number
    limit?: number
    bankAccountId?: number
    status?: string
  }): Promise<PaginatedResponse<BankStatement>> {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.bankAccountId) query.append('bankAccountId', params.bankAccountId.toString())
    if (params?.status) query.append('status', params.status)

    return apiRequest<PaginatedResponse<BankStatement>>(
      `/accounting/bank-reconciliations/statements?${query.toString()}`
    )
  },

  /** GET /accounting/bank-reconciliations/statements/:id - Get statement details */
  async getById(id: number | string): Promise<BankStatement> {
    return apiRequest<BankStatement>(`/accounting/bank-reconciliations/statements/${id}`)
  },

  /** POST /accounting/bank-reconciliations/statements - Create bank statement */
  async create(data: {
    bankAccountId: number
    statementDate: string
    openingBalance: number
    closingBalance: number
    notes?: string
    lines: Omit<BankStatementLine, 'id' | 'statementId' | 'createdAt' | 'updatedAt'>[]
  }): Promise<BankStatement> {
    return apiRequest<BankStatement>('/accounting/bank-reconciliations/statements', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /** PUT /accounting/bank-reconciliations/statements/:id - Update statement */
  async update(
    id: number | string,
    data: Partial<BankStatement>
  ): Promise<BankStatement> {
    return apiRequest<BankStatement>(`/accounting/bank-reconciliations/statements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /** DELETE /accounting/bank-reconciliations/statements/:id - Delete statement */
  async delete(id: number | string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(
      `/accounting/bank-reconciliations/statements/${id}`,
      {
        method: 'DELETE',
      }
    )
  },
}

export const pettyCashApi = {
  // Books
  async getAllBooks(): Promise<PettyCashBook[]> {
    return apiRequest<PettyCashBook[]>("/petty-cash/books")
  },
  async getBookById(id: number | string): Promise<PettyCashBook> {
    return apiRequest<PettyCashBook>(`/petty-cash/books/${id}`)
  },
  async createBook(data: Partial<PettyCashBook>): Promise<PettyCashBook> {
    return apiRequest<PettyCashBook>("/petty-cash/books", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  // Categories
  async getAllCategories(): Promise<PettyCashCategory[]> {
    return apiRequest<PettyCashCategory[]>("/petty-cash/categories")
  },
  async createCategory(data: Partial<PettyCashCategory>): Promise<PettyCashCategory> {
    return apiRequest<PettyCashCategory>("/petty-cash/categories", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  // Payments
  async getAllPayments(): Promise<PettyCashPayment[]> {
    return apiRequest<PettyCashPayment[]>("/petty-cash/payments")
  },
  async getPaymentById(id: number | string): Promise<PettyCashPayment> {
    return apiRequest<PettyCashPayment>(`/petty-cash/payments/${id}`)
  },
  async createPayment(data: Partial<PettyCashPayment>): Promise<PettyCashPayment> {
    return apiRequest<PettyCashPayment>("/petty-cash/payments", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async approvePayment(id: number | string): Promise<PettyCashPayment> {
    return apiRequest<PettyCashPayment>(`/petty-cash/payments/${id}/approve`, {
      method: "PATCH",
    })
  },
  async postPayment(id: number | string): Promise<PettyCashPayment> {
    return apiRequest<PettyCashPayment>(`/petty-cash/payments/${id}/post`, {
      method: "POST",
    })
  },
  async deletePayment(id: number | string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/petty-cash/payments/${id}`, {
      method: "DELETE",
    })
  },

  // Reimbursements
  async getAllReimbursements(): Promise<PettyCashReimbursement[]> {
    return apiRequest<PettyCashReimbursement[]>("/petty-cash/reimbursements")
  },
  async createReimbursement(data: Partial<PettyCashReimbursement>): Promise<PettyCashReimbursement> {
    return apiRequest<PettyCashReimbursement>("/petty-cash/reimbursements", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async approveReimbursement(id: number | string): Promise<PettyCashReimbursement> {
    return apiRequest<PettyCashReimbursement>(`/petty-cash/reimbursements/${id}/approve`, {
      method: "PATCH",
    })
  },
  async postReimbursement(id: number | string): Promise<PettyCashReimbursement> {
    return apiRequest<PettyCashReimbursement>(`/petty-cash/reimbursements/${id}/post`, {
      method: "POST",
    })
  },
}


/* -------------------------------------------------------------------------- */
/*                            BANK DEPOSITS API                               */
/* -------------------------------------------------------------------------- */

export interface BankDepositItem {
  id?: number
  bankDepositId?: number
  receiptPaymentId: number
  amount: number | string
  description?: string
  receiptPayment?: ReceiptPayment
  ReceiptPayment?: ReceiptPayment
}

export interface BankDeposit {
  id: number
  depositNumber: string
  depositDate: string
  bankAccountId: number
  locationId: number
  totalAmount: number | string
  description?: string
  referenceNumber?: string
  status: 'Draft' | 'Submitted' | 'Approved' | 'Posted' | 'Rejected' | 'Cancelled'
  approvalStatus: 'Pending' | 'Approved' | 'Rejected'
  journalEntryId?: number
  createdAt: string
  createdBy: number
  updatedAt: string
  updatedBy: number
  Items?: BankDepositItem[]
  BankAccount?: LedgerAccount
  Creator?: { id: number; fullName: string }
}

export const bankDepositsApi = {
  ...crud("bank-deposits"),

  async getPendingPayments(params: { locationId?: number; paymentTypeId?: number; depositDate?: string }): Promise<ReceiptPayment[]> {
    const queryParams = new URLSearchParams()
    if (params.locationId) queryParams.append('locationId', params.locationId.toString())
    if (params.paymentTypeId) queryParams.append('paymentTypeId', params.paymentTypeId.toString())
    if (params.depositDate) queryParams.append('depositDate', params.depositDate)

    const res = await apiRequest<any>(`/bank-deposits/pending-payments?${queryParams.toString()}`)
    return res.data || res || []
  },

  async post(id: number | string): Promise<BankDeposit> {
    const res = await apiRequest<any>(`/bank-deposits/${id}/post`, { method: 'POST' })
    return res.data || res
  },

  async cancel(id: number | string): Promise<BankDeposit> {
    const res = await apiRequest<any>(`/bank-deposits/${id}/cancel`, { method: 'POST' })
    return res.data || res
  }
}
