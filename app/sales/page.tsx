"use client"

import * as XLSX from "xlsx"

import { useEffect, useState, useMemo } from "react"
// Customer filter state for sales orders
import { salesOrdersApi, SalesOrder, SalesOrderItem, customersApi, Customer, timeSlotsApi, itemsApi, locationsApi, Location, usersApi, User, accountingReportsApi } from "@/lib/api"

// Extended Customer interface with routes
interface CustomerWithRoutes extends Customer {
  routes?: Array<{
    id: number
    routeName: string
    days: string[]
  }>
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Plus, Search, MoreHorizontal, ShoppingCart, TrendingUp, Clock, CheckCircle, Eye, Edit, Trash2, CircleDot, Send, Truck, CheckCircle2, Package, AlertTriangle, HourglassIcon, ChevronsUpDown, Check, X, FileDown, Loader2 } from "lucide-react"
import { CustomerSelect } from "@/components/customer/customer-select"
import { format } from "date-fns"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toastr } from "@/lib/toastr"
import { sendSalesOrderSMS } from "@/lib/sms"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

// Helper function to calculate discountedAmount, excludingTaxAmount, and total
const calculateItemTotals = (
  quantity: number,
  sellingPrice: number,
  discountPercentage: number,
  isTaxItem: boolean,
  isTaxInvoice: boolean,
  taxRate: number = 0.18
) => {
  // Calculate discounted amount
  const discountedAmount = sellingPrice * ((discountPercentage || 0) / 100)

  // Calculate amount after discount
  const afterDiscount = sellingPrice - discountedAmount

  // Calculate excluding tax amount
  const excludingTaxAmount = isTaxItem
    ? afterDiscount / (1 + taxRate)
    : afterDiscount

  // Calculate total (quantity * excluding tax amount)
  const total = quantity * excludingTaxAmount

  return {
    discountedAmount: Number(discountedAmount),
    afterDiscount: Number(afterDiscount),
    excludingTaxAmount: Number(excludingTaxAmount),
    total: Number(total)
  }
}

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchCustomerId, setSearchCustomerId] = useState("ALL")
  const [searchSalesPersonId, setSearchSalesPersonId] = useState("ALL")
  const [searchIsTaxInvoice, setSearchIsTaxInvoice] = useState("ALL")
  const [searchStatus, setSearchStatus] = useState("ALL")
  const [searchDeliveryOrderStatus, setSearchDeliveryOrderStatus] = useState("ALL")
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])   // current page rows
  const [totalOrders, setTotalOrders] = useState(0)                   // server total count
  const [totalPages, setTotalPages] = useState(1)
  const [summaryData, setSummaryData] = useState({
    totalAmount: 0,
    totalApprovedCount: 0,
    totalApprovedAmount: 0,
    totalPendingCount: 0,
    totalPendingAmount: 0,
  })
  const [customers, setCustomers] = useState<CustomerWithRoutes[]>([])
  const [availableItems, setAvailableItems] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [salesPersons, setSalesPersons] = useState<User[]>([])
  const [customerOutstanding, setCustomerOutstanding] = useState<any>(null)
  const [isCheckingLimit, setIsCheckingLimit] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Time slots for delivery scheduling
  const [timeSlots, setTimeSlots] = useState<any[]>([])

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [itemPopoverOpen, setItemPopoverOpen] = useState<number | null>(null)
  const getToday = () => {
    const d = new Date()
    // Use local timezone to get today's date in YYYY-MM-DD format
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const todayString = `${year}-${month}-${day}`
    return todayString
  }
  const [newOrder, setNewOrder] = useState({
    customerId: "",
    routeId: "",
    idSalesPerson: "",
    isDelivery: true,
    orderDate: getToday(),
    deliveryDate: "",
    deliveryAddress: "",
    poNumber: "",
    dispatchDate: "",
    timeSlot: "",
    items: [] as SalesOrderItem[],
    isTaxInvoice: false,
  })

  const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null)
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null)

  // ── Server-side fetch (re-runs on every filter / page change) ────────────
  const fetchOrders = async () => {
    setLoading(true)
    setError("")
    try {
      const result = await salesOrdersApi.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        customerId: searchCustomerId !== "ALL" ? searchCustomerId : undefined,
        salesPersonId: searchSalesPersonId !== "ALL" ? searchSalesPersonId : undefined,
        isTaxInvoice: searchIsTaxInvoice !== "ALL" ? searchIsTaxInvoice : undefined,
        status: searchStatus !== "ALL" ? searchStatus : undefined,
        deliveryOrderStatus: searchDeliveryOrderStatus !== "ALL" ? searchDeliveryOrderStatus : undefined,
      })
      setSalesOrders(result.data)
      setTotalOrders(result.pagination.total)
      setTotalPages(result.pagination.totalPages)
      if (result.summary) {
        setSummaryData({
          totalAmount: result.summary.totalAmount || 0,
          totalApprovedCount: result.summary.totalApprovedCount || 0,
          totalApprovedAmount: result.summary.totalApprovedAmount || 0,
          totalPendingCount: result.summary.totalPendingCount || 0,
          totalPendingAmount: result.summary.totalPendingAmount || 0,
        })
      }
    } catch (err: any) {
      setError(err.message || "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [currentPage, itemsPerPage, searchTerm, searchCustomerId, searchSalesPersonId, searchIsTaxInvoice, searchStatus, searchDeliveryOrderStatus])

  // Fetch customers for order dialog
  useEffect(() => {
    customersApi.getAll()
      .then((data: any[]) => setCustomers(data as CustomerWithRoutes[]))
      .catch((err: any) => console.error("Failed to load customers:", err))
  }, [])

  // Fetch current location to get tax rate
  useEffect(() => {
    locationsApi.getAll()
      .then((locations: Location[]) => {
        // Get the first active location or the first location
        const location = locations.find(l => l.isActive) || locations[0]
        setCurrentLocation(location || null)
      })
      .catch((err: any) => console.error("Failed to load location:", err))
  }, [])

  // Fetch sales persons list
  useEffect(() => {
    usersApi.getSalesPersons()
      .then((data) => {
        setSalesPersons(data || [])
      })
      .catch((err) => {
        console.error("Failed to load sales persons:", err)
        setSalesPersons([])
      })
  }, [])

  // Fetch available items when customer changes
  useEffect(() => {
    if (newOrder.customerId) {
      const customer = customers.find((c: CustomerWithRoutes) => String(c.id) === newOrder.customerId)

      // Fetch both category discounts AND outstanding balance
      setIsCheckingLimit(true)
      Promise.all([
        customersApi.getCategoryDiscounts(Number(newOrder.customerId)),
        accountingReportsApi.getCustomerOutstanding({ customerId: newOrder.customerId })
      ])
        .then(([discounts, outstandingData]) => {
          const outstanding = outstandingData.customerOutstanding?.[0] || null
          setSelectedCustomer(customer ? { ...customer, CategoryDiscounts: discounts } : null)
          setCustomerOutstanding(outstanding)
        })
        .catch(err => {
          console.error("Failed to load customer details:", err)
          setSelectedCustomer(customer || null)
        })
        .finally(() => setIsCheckingLimit(false))

      // Get both customer-specific items and default items
      Promise.all([
        salesOrdersApi.getItemsByCustomer(Number(newOrder.customerId), 1), // Using locationId = 1 for now
        itemsApi.getAll() // get all items as default
      ])
        .then(([customerItems, defaultItems]) => {
          const customerItemsData = customerItems?.data || [];
          const defaultItemsData = Array.isArray(defaultItems) ? defaultItems : (defaultItems as any)?.data || [];

          if (customerItemsData.length > 0) {
            // Create a Set of item IDs that the customer already has specific settings for
            const customerItemIds = new Set(customerItemsData.map((ci: any) => ci.item.id));

            // Helper to normalize availability from default item payloads
            const normalizeAvailability = (di: any) => {
              if (di.availability && typeof di.availability.totalAvailableQuantity === 'number') {
                return {
                  totalAvailableQuantity: di.availability.totalAvailableQuantity || 0,
                  totalWeight: di.availability.totalWeight || 0,
                  totalStockRecords: di.availability.totalStockRecords || 0,
                  hasStock: !!di.availability.hasStock,
                  allowsNegativeStock: !!di.availability.allowsNegativeStock
                }
              }

              // Some endpoints return qty or include availability on the nested item
              const possibleQty = di.qty ?? di.item?.qty ?? 0
              return {
                totalAvailableQuantity: possibleQty,
                totalWeight: di.totalWeight ?? 0,
                totalStockRecords: 0,
                hasStock: possibleQty > 0,
                allowsNegativeStock: !!di.allowsMinus
              }
            }

            // Format default items to match the customer-items structure expected by the UI
            const defaultItemsToAdd = defaultItemsData
              .filter((di: any) => !customerItemIds.has(di.id))
              .map((di: any) => ({
                item: {
                  id: di.id,
                  name: di.name,
                  barcode: di.barcode,
                  sku: di.sku,
                  unit: di.unit,
                  weight: di.weight,
                  sellingPrice: di.sellingPrice,
                  Category: di.Category,
                  isTaxInclusive: di.isTaxInclusive
                },
                availability: normalizeAvailability(di),
                customerItemCode: {
                  code: di.sku || 'N/A' // Prefer SKU
                }
              }));

            // Combine customer-specific items with remaining default items
            setAvailableItems([...customerItemsData, ...defaultItemsToAdd]);
            console.log("Loaded items:", customerItemsData.length, "customer-specific and", defaultItemsToAdd.length, "default items");
          } else {
            // Helper to normalize availability from default item payloads
            const normalizeAvailability = (di: any) => {
              if (di.availability && typeof di.availability.totalAvailableQuantity === 'number') {
                return {
                  totalAvailableQuantity: di.availability.totalAvailableQuantity || 0,
                  totalWeight: di.availability.totalWeight || 0,
                  totalStockRecords: di.availability.totalStockRecords || 0,
                  hasStock: !!di.availability.hasStock,
                  allowsNegativeStock: !!di.availability.allowsNegativeStock
                }
              }

              const possibleQty = di.qty ?? di.item?.qty ?? 0
              return {
                totalAvailableQuantity: possibleQty,
                totalWeight: di.totalWeight ?? 0,
                totalStockRecords: 0,
                hasStock: possibleQty > 0,
                allowsNegativeStock: !!di.allowsMinus
              }
            }

            // If no customer-specific items, use all default items with their default codes and availability
            const itemsWithDefaultCodes = defaultItemsData.map((di: any) => ({
              item: {
                id: di.id,
                name: di.name,
                barcode: di.barcode,
                sku: di.sku,
                unit: di.unit,
                weight: di.weight,
                sellingPrice: di.sellingPrice,
                Category: di.Category,
                isTaxInclusive: di.isTaxInclusive
              },
              availability: normalizeAvailability(di),
              customerItemCode: {
                code: di.sku || 'N/A' // Prefer SKU
              }
            }));
            setAvailableItems(itemsWithDefaultCodes);
            console.log("No customer-specific items found, using", itemsWithDefaultCodes.length, "default items");
          }
        })
        .catch((err: Error) => {
          console.error("Failed to load items:", err)
          // On error, try to fetch default items as fallback
          itemsApi.getAll()
            .then((defaultItems) => {
              const defaultItemsWithCodes = (defaultItems || []).map((di: any) => ({
                item: {
                  id: di.id,
                  name: di.name,
                  barcode: di.barcode,
                  sku: di.sku,
                  unit: di.unit,
                  weight: di.weight,
                  sellingPrice: di.sellingPrice,
                  Category: di.Category,
                  isTaxInclusive: di.isTaxInclusive
                },
                availability: {
                  totalAvailableQuantity: 0 // This would need to be updated with real availability
                },
                customerItemCode: {
                  code: di.sku || 'N/A' // Prefer barcode, fallback to SKU
                }
              }));
              setAvailableItems(defaultItemsWithCodes);
              console.log("Loaded", defaultItemsWithCodes.length, "default items as fallback");
            })
            .catch((fallbackErr: Error) => {
              console.error("Failed to load default items:", fallbackErr)
              setAvailableItems([])
            })
        })
    } else {
      setAvailableItems([])
      setSelectedCustomer(null)
    }
  }, [newOrder.customerId, customers])

  // Clear items when customer changes
  useEffect(() => {
    setNewOrder((prev) => ({ ...prev, items: [], deliveryDate: "", dispatchDate: "", timeSlot: "" }))
    setCustomerOutstanding(null)
    setError("")
  }, [newOrder.customerId])

  // Helper function to get valid delivery dates based on customer's route days
  const getValidDeliveryDates = (customerId: string) => {
    if (!customerId) return []

    const customer = customers.find(c => String(c.id) === customerId)

    if (customer?.type !== "Supermarket" || !newOrder.isDelivery) {
      // Non-Supermarket customers can select any date starting from today
      const validDates = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Get next 30 days as valid delivery dates for non-supermarket customers
      for (let i = 0; i <= 30; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)

        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })

        // Use local timezone to format date as YYYY-MM-DD
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const dateString = `${year}-${month}-${day}`

        validDates.push({
          date: dateString,
          dayName,
          formatted: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        })
      }

      return validDates
    }

    // Supermarket logic - use route-based delivery dates
    if (!customer?.routes || customer.routes.length === 0) return []

    const route = customer.routes[0] // Get first route
    if (!route?.days || route.days.length === 0) return []

    const validDates = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // First check if today is a valid delivery day
    const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' })
    if (route.days.includes(todayDayName)) {
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      validDates.push({
        date: dateString,
        dayName: todayDayName,
        formatted: today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      })
    }

    // Get next 60 days to find valid delivery dates
    for (let i = 1; i <= 60; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)

      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })

      if (route.days.includes(dayName)) {
        // Use local timezone to format date as YYYY-MM-DD
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const dateString = `${year}-${month}-${day}`

        validDates.push({
          date: dateString,
          dayName,
          formatted: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        })
      }
    }

    return validDates
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSearchCustomerId("ALL")
    setSearchSalesPersonId("ALL")
    setSearchIsTaxInvoice("ALL")
    setSearchStatus("ALL")
    setSearchDeliveryOrderStatus("ALL")
    setCurrentPage(1)
  }

  const getTotalPages = () => totalPages

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1)
  }

  // Results Summary Component
  const ResultsSummary = () => {
    const startIndex = totalOrders === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
    const endIndex = Math.min(currentPage * itemsPerPage, totalOrders)

    return (
      <div className="flex items-center justify-between text-xs text-muted-foreground py-2 border-t">
        <span>
          Showing {startIndex}-{endIndex} of {totalOrders} orders
        </span>
        {(searchTerm || searchCustomerId !== "ALL" || searchSalesPersonId !== "ALL" || searchIsTaxInvoice !== "ALL" || searchStatus !== "ALL" || searchDeliveryOrderStatus !== "ALL") && (
          <span className="flex items-center">
            <Search className="mr-1 h-3 w-3" />
            Filters active
          </span>
        )}
      </div>
    )
  }

  // Pagination Component
  const PaginationControls = () => {
    const total = getTotalPages()
    if (total <= 1) return null

    const getVisiblePages = () => {
      const delta = 2
      const range = []
      const rangeWithDots = []

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(total - 1, currentPage + delta); i++) {
        range.push(i)
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...')
      } else {
        rangeWithDots.push(1)
      }

      rangeWithDots.push(...range)

      if (currentPage + delta < total - 1) {
        rangeWithDots.push('...', total)
      } else {
        rangeWithDots.push(total)
      }

      return rangeWithDots
    }

    return (
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Show</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-700">entries</span>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            {'<<'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            {'<'}
          </Button>

          {getVisiblePages().map((page, index) => (
            <Button
              key={index}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => typeof page === 'number' && handlePageChange(page)}
              disabled={typeof page !== 'number'}
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === total}
            className="h-8 w-8 p-0"
          >
            {'>'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(total)}
            disabled={currentPage === total}
            className="h-8 w-8 p-0"
          >
            {'>>'}
          </Button>
        </div>
      </div>
    )
  }

  // Create new sales order
  const handleCreateOrder = async () => {
    // Validate required fields
    if (!newOrder.customerId) {
      setError("Please select a customer.")
      return
    }
    if (!newOrder.orderDate || !newOrder.deliveryDate || !newOrder.deliveryAddress) {
      setError("Please fill all required fields.")
      return
    }
    if (newOrder.items.length === 0) {
      setError("Please add at least one item to the order.")
      return
    }
    // Validate Credit Limit
    if (customerOutstanding?.creditExceeded) {
      const errorMsg = `Cannot create order: Customer '${customerOutstanding.customerName}' has exceeded their credit limit of LKR ${parseFloat(customerOutstanding.creditLimit).toLocaleString()}. Current Outstanding: LKR ${parseFloat(customerOutstanding.totalOutstanding).toLocaleString()}`
      setError(errorMsg)
      toastr.error("Credit Limit Exceeded")
      return
    }
    // Validate dispatchDate for delivery orders
    if (newOrder.isDelivery && !newOrder.dispatchDate) {
      setError("Please select a dispatch date for delivery orders.")
      return
    }
    // Validate each item
    for (const item of newOrder.items) {
      if (!item.itemId || !item.qty) {
        setError("Please fill all required fields in Order Items.")
        return
      }
      // Validate stock availability
      const selectedItem = availableItems.find(ai => ai.item.id === item.itemId)
      if (selectedItem && item.qty > selectedItem.availability.totalAvailableQuantity) {
        setError(`Insufficient stock for ${selectedItem.item.name}. Available: ${selectedItem.availability.totalAvailableQuantity}`)
        return
      }
    }
    // Calculate totalAmount and taxAmount using helper function
    let totalAmount = 0;
    let totalTaxAmount = 0;
    const taxRateValue = currentLocation ? parseFloat(currentLocation.taxRate) / 100 : 0.18;

    const itemsWithTax = newOrder.items.map(item => {
      const selectedItem = availableItems.find(ai => ai.item.id === item.itemId)
      const sellingPrice = selectedItem?.item?.sellingPrice || 0
      const isTaxItem = item.isTaxItem || selectedItem?.item?.isTaxInclusive || false

      // Calculate item totals using helper function
      const itemTotals = calculateItemTotals(
        item.qty,
        sellingPrice,
        item.discount || 0,
        isTaxItem,
        newOrder.isTaxInvoice,
        taxRateValue
      )

      // Calculate tax for this item (use total which already includes qty)
      const taxForItem = Number(itemTotals.total) * Number(taxRateValue)

      totalAmount += Number(itemTotals.total)
      totalTaxAmount += Number(taxForItem)

      return {
        itemId: item.itemId,
        code: selectedItem?.customerItemCode?.code || selectedItem?.item?.sku || 'N/A',
        qty: item.qty,
        price: sellingPrice,
        discount: item.discount || 0,
        isTaxItem: isTaxItem,
        taxAmount: Number(taxForItem),
        discountedAmount: Number(itemTotals.afterDiscount), // ??? why this use afterDiscount ? 
        excludingTaxAmount: Number(itemTotals.excludingTaxAmount),
        total: Number(itemTotals.total),
      }
    })

    setLoading(true)
    setError("")
    try {
      const createdOrder = await toastr.promise(
        salesOrdersApi.create({
          isAlreadyApproved: false,
          orderNumber: "", // Let backend generate order number
          customerId: Number(newOrder.customerId),
          routeId: Number(newOrder.routeId),
          idSalesPerson: Number(newOrder.idSalesPerson) || 0,
          isDelivery: newOrder.isDelivery,
          orderDate: newOrder.orderDate,
          deliveryDate: newOrder.deliveryDate,
          dispatchDate: newOrder.isDelivery ? newOrder.dispatchDate : newOrder.deliveryDate,
          deliveryAddress: newOrder.deliveryAddress,
          poNumber: newOrder.poNumber,
          timeSlot: newOrder.timeSlot,
          items: itemsWithTax,
          totalWeight: 0,
          isTaxInvoice: newOrder.isTaxInvoice,
          taxRate: currentLocation ? Number(currentLocation.taxRate) : 0,
          taxAmount: Number(totalTaxAmount),
          subTotal: Number(totalAmount),
          totalAmount: Number(totalAmount + totalTaxAmount),
        }),
        {
          loading: "Creating new sales order...",
          success: "Sales order created successfully!",
          error: "Failed to create sales order"
        }
      )
      setOpenDialog(false)
      // Reload orders
      await fetchOrders()
    } catch (err: any) {
      setError(err.message || "Failed to create order")
    } finally {
      setLoading(false)
    }
  }

  // Edit order handler
  const handleEditOrder = async () => {
    if (!editOrder) return
    // Calculate totalWeight, totalAmount and tax amounts
    let totalWeight = 0;
    let totalAmount = 0;
    let totalTaxAmount = 0;
    const taxRate = editOrder.taxRate ? Number(editOrder.taxRate.toString()) / 100 : 0.18;

    const updatedItems = editOrder.items.map(item => {
      const unitWeight = item?.item?.weight || item?.Item?.weight || 1;
      const isTaxItem = item.isTaxItem || item.item?.isTaxInclusive || item.Item?.isTaxInclusive || false;

      // Calculate item totals using helper function
      const itemTotals = calculateItemTotals(
        item.qty,
        item.price,
        item.discount || 0,
        isTaxItem,
        editOrder.isTaxInvoice || false,
        taxRate
      )

      // Calculate tax for this item (use total which already includes qty)
      const taxForItem = itemTotals.total * taxRate;

      totalWeight += item.qty * unitWeight;
      totalAmount += Number(itemTotals.total);
      totalTaxAmount += Number(taxForItem);

      return {
        itemId: item.itemId,
        code: item?.customerItemCode?.code || item?.item?.sku || item?.Item?.sku || "",
        qty: item.qty,
        price: item.price,
        isTaxItem: isTaxItem,
        discount: item.discount || 0,
        taxAmount: Number(taxForItem),
        discountedAmount: Number(itemTotals.afterDiscount),
        excludingTaxAmount: Number(itemTotals.excludingTaxAmount),
        total: Number(itemTotals.total)
      };
    });

    setLoading(true)
    setError("")
    try {
      await toastr.promise(
        salesOrdersApi.update(editOrder.id!, {
          orderNumber: editOrder.orderNumber,
          customerId: editOrder.customerId,
          idSalesPerson: editOrder.idSalesPerson,
          routeId: editOrder.routeId,
          isDelivery: editOrder.isDelivery,
          orderDate: editOrder.orderDate,
          deliveryDate: editOrder.deliveryDate,
          dispatchDate: editOrder.dispatchDate,
          timeSlot: editOrder.timeSlot,
          deliveryAddress: editOrder.deliveryAddress,
          poNumber: editOrder.poNumber,
          items: updatedItems,
          totalWeight,
          isTaxInvoice: editOrder.isTaxInvoice || false,
          taxRate: editOrder.taxRate ? Number(editOrder.taxRate.toString()) : 0,
          taxAmount: Number(totalTaxAmount),
          subTotal: Number(totalAmount),
          totalAmount: Number(totalAmount + totalTaxAmount),
        }),
        {
          loading: `Updating ${editOrder.orderNumber}...`,
          success: `${editOrder.orderNumber} updated successfully!`,
          error: `Failed to update ${editOrder.orderNumber}`
        }
      )

      setEditOrder(null)
      await fetchOrders()
    } catch (err: any) {
      setError(err.message || "Failed to update order")
    } finally {
      setLoading(false)
    }
  }

  // Delete order handler
  const handleDeleteOrder = async (orderId: number) => {
    const orderToDelete = salesOrders.find(o => o.id === orderId)
    const orderNumber = orderToDelete?.orderNumber || `Order #${orderId}`

    setLoading(true)
    setError("")

    try {
      await toastr.promise(
        salesOrdersApi.remove(orderId),
        {
          loading: `Deleting ${orderNumber}...`,
          success: `${orderNumber} deleted successfully!`,
          error: `Failed to delete ${orderNumber}`
        }
      )
      await fetchOrders()
    } catch (err: any) {
      setError(err.message || "Failed to delete order")
    } finally {
      setLoading(false)
    }
  }

  // Approve/Reject order handler
  const handleApproveRejectOrder = async (orderId: number, status: "Approved" | "Rejected") => {
    const orderToUpdate = salesOrders.find(o => o.id === orderId)
    const orderNumber = orderToUpdate?.orderNumber || `Order #${orderId}`

    setLoading(true)
    setError("")

    try {
      await toastr.promise(
        salesOrdersApi.approveReject(orderId, status),
        {
          loading: `${status === "Approved" ? "Approving" : "Rejecting"} ${orderNumber}...`,
          success: `${orderNumber} ${status.toLowerCase()} successfully!`,
          error: `Failed to ${status.toLowerCase()} ${orderNumber}`
        }
      )
      setViewOrder(null)
      await fetchOrders()
    } catch (err: any) {
      setError(err.message || `Failed to ${status.toLowerCase()} order`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async (orderId: number) => {
    const orderToUpdate = salesOrders.find(o => o.id === orderId)
    const orderNumber = orderToUpdate?.orderNumber || `Order #${orderId}`

    setLoading(true)
    setError("")

    try {
      await salesOrdersApi.cancel(orderId)
      toastr.success(`${orderNumber} cancelled successfully!`)
      setViewOrder(null)
      await fetchOrders()
    } catch (err: any) {
      const errorMessage = err?.error || err?.message || "Failed to cancel order"
      setError(errorMessage)
      toastr.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            Pending
          </Badge>
        )
      case "Approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Approved
          </Badge>
        )
      case "Dispatched":
        return (
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
            Dispatched
          </Badge>
        )
      case "Scheduled":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Scheduled
          </Badge>
        )
      case "In Transit":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            In Transit
          </Badge>
        )
      case "Finalized":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            Finalized
          </Badge>
        )
      case "Delivered":
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            Delivered
          </Badge>
        )
      case "Cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <CircleDot className="h-4 w-4 text-gray-500" />
      case "Approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Dispatched":
        return <Send className="h-4 w-4 text-indigo-500" />
      case "Scheduled":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "In Transit":
        return <Truck className="h-4 w-4 text-yellow-500" />
      case "Finalized":
        return <CheckCircle2 className="h-4 w-4 text-purple-500" />
      case "Delivered":
        return <Package className="h-4 w-4 text-green-600" />
      case "Failed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <HourglassIcon className="h-4 w-4 text-gray-400" />
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return (
          <Badge variant="default" className="bg-green-600">
            Paid
          </Badge>
        )
      case "Pending":
        return <Badge variant="secondary">Pending</Badge>
      case "Overdue":
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Helper to format dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    try {
      return format(new Date(dateStr), "yyyy-MM-dd")
    } catch {
      return dateStr
    }
  }

  // Calculate month-over-month sales growth
  const calculateMonthOverMonthGrowth = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Get first day of current month
    const currentMonthStart = new Date(currentYear, currentMonth, 1)
    // Get first day of next month (end of current month)
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 1)

    // Get first day of previous month
    const previousMonthStart = new Date(currentYear, currentMonth - 1, 1)
    // Get first day of current month (end of previous month)
    const previousMonthEnd = new Date(currentYear, currentMonth, 1)

    // Calculate current month sales
    const currentMonthSales = salesOrders
      .filter(order => {
        const orderDate = new Date(order.orderDate)
        return orderDate >= currentMonthStart && orderDate < currentMonthEnd
      })
      .reduce((sum, order) => sum + (order.totalAmount ?? 0), 0)

    // Calculate previous month sales
    const previousMonthSales = salesOrders
      .filter(order => {
        const orderDate = new Date(order.orderDate)
        return orderDate >= previousMonthStart && orderDate < previousMonthEnd
      })
      .reduce((sum, order) => sum + (order.totalAmount ?? 0), 0)

    // Calculate percentage change
    if (previousMonthSales === 0) {
      return currentMonthSales > 0 ? "New sales this month!" : "No data"
    }

    const percentageChange = ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100
    const sign = percentageChange >= 0 ? "+" : ""

    return `${sign}${percentageChange.toFixed(1)}% from last month`
  }

  // Ensure all logic is above this line and no stray code before return
  // ── Export filtered sales orders to Excel ───────────────────────────────
  const exportSalesOrdersExcel = async () => {
    try {
      setExporting(true)
      // Fetch all filtered rows (no pagination — large limit)
      const result = await salesOrdersApi.getAll({
        limit: 500,
        search: searchTerm || undefined,
        customerId: searchCustomerId !== "ALL" ? searchCustomerId : undefined,
        salesPersonId: searchSalesPersonId !== "ALL" ? searchSalesPersonId : undefined,
        isTaxInvoice: searchIsTaxInvoice !== "ALL" ? searchIsTaxInvoice : undefined,
        status: searchStatus !== "ALL" ? searchStatus : undefined,
        deliveryOrderStatus: searchDeliveryOrderStatus !== "ALL" ? searchDeliveryOrderStatus : undefined,
      })
      const orders = result.data

      const now = new Date()
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

      const wb = XLSX.utils.book_new()

      // ── Sheet 1: Orders Summary ──────────────────────────────────────────
      const summaryHeader = [
        "Order #", "Invoice Type", "Customer", "Type", "Delivery?",
        "Order Date", "Delivery Date", "Dispatch Date",
        "Sales Person", "PO Number",
        "Sub Total (LKR)", "Tax Amount (LKR)", "Total Amount (LKR)",
        "SO Status", "DO Status",
      ]
      const summaryRows: any[][] = [summaryHeader]
      orders.forEach((o) => {
        summaryRows.push([
          o.orderNumber,
          o.isTaxInvoice ? "Tax Invoice" : "Regular",
          o.customerName || "",
          o.customerType || "",
          o.isDelivery ? "Delivery" : "Pickup",
          o.orderDate ? o.orderDate.substring(0, 10) : "",
          o.deliveryDate ? o.deliveryDate.substring(0, 10) : "",
          o.dispatchDate ? o.dispatchDate.substring(0, 10) : "",
          o.SalesPerson?.fullName || "",
          o.poNumber || "",
          Number(o.subTotal ?? 0),
          Number(o.taxAmount ?? 0),
          Number(o.totalAmount ?? 0),
          o.status || "",
          o.deliveryOrderStatus || "No DO",
        ])
      })
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
      wsSummary["!cols"] = [
        { wch: 16 }, { wch: 13 }, { wch: 30 }, { wch: 14 }, { wch: 10 },
        { wch: 13 }, { wch: 13 }, { wch: 13 },
        { wch: 20 }, { wch: 14 },
        { wch: 17 }, { wch: 17 }, { wch: 17 },
        { wch: 12 }, { wch: 14 },
      ]
      XLSX.utils.book_append_sheet(wb, wsSummary, "Orders Summary")

      // ── Sheet 2: Item Details ────────────────────────────────────────────
      const itemHeader = [
        "Order #", "Customer", "Order Date", "SO Status", "DO Status",
        "Item Name", "Code", "Qty", "Unit Price (LKR)",
        "Discount %", "Tax Item?",
        "Line Total (LKR)",
      ]
      const itemRows: any[][] = [itemHeader]
      orders.forEach((o) => {
        if (o.items && o.items.length > 0) {
          o.items.forEach((item: any) => {
            itemRows.push([
              o.orderNumber,
              o.customerName || "",
              o.orderDate ? o.orderDate.substring(0, 10) : "",
              o.status || "",
              o.deliveryOrderStatus || "No DO",
              item.itemName || item.name || "",
              item.code || "",
              Number(item.qty ?? 0),
              Number(item.price ?? 0),
              Number(item.discount ?? 0),
              item.isTaxItem ? "Yes" : "No",
              Number(item.total ?? (item.qty * item.price) ?? 0),
            ])
          })
        } else {
          itemRows.push([
            o.orderNumber, o.customerName || "",
            o.orderDate ? o.orderDate.substring(0, 10) : "",
            o.status || "", o.deliveryOrderStatus || "No DO",
            "", "", "", "", "", "", "",
          ])
        }
      })
      const wsItems = XLSX.utils.aoa_to_sheet(itemRows)
      wsItems["!cols"] = [
        { wch: 16 }, { wch: 30 }, { wch: 13 }, { wch: 12 }, { wch: 14 },
        { wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 16 },
        { wch: 11 }, { wch: 10 }, { wch: 16 },
      ]
      XLSX.utils.book_append_sheet(wb, wsItems, "Item Details")

      const activeFilters = [
        searchStatus !== "ALL" ? searchStatus : null,
        searchDeliveryOrderStatus !== "ALL" ? searchDeliveryOrderStatus : null,
        searchIsTaxInvoice !== "ALL" ? searchIsTaxInvoice : null,
      ].filter(Boolean).join("_")

      XLSX.writeFile(wb, `SalesOrders_${activeFilters ? activeFilters + "_" : ""}${dateStr}.xlsx`)
    } catch (err: any) {
      console.error("Export failed:", err)
      toastr.error("Export failed: " + (err.message || "Unknown error"))
    } finally {
      setExporting(false)
    }
  }

  return (
    <ERPLayout>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales Orders</h1>
            <p className="text-muted-foreground">Manage customer orders and deliveries</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportSalesOrdersExcel}
              disabled={exporting}
              className="border-green-600 text-green-700 hover:bg-green-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              {exporting ? "Exporting..." : "Export Excel"}
            </Button>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setNewOrder({
                    customerId: "",
                    routeId: "",
                    idSalesPerson: "",
                    isDelivery: false,
                    orderDate: getToday(),
                    deliveryDate: "",
                    deliveryAddress: "",
                    poNumber: "",
                    dispatchDate: "",
                    timeSlot: "",
                    items: [],
                    isTaxInvoice: false,
                  })
                  setOpenDialog(true)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Sales Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <Label htmlFor="orderDate">Order Date <span className="text-red-600">*</span></Label>
                      <Input
                        disabled
                        id="orderDate"
                        type="date"
                        value={newOrder.orderDate}
                        onChange={(e) => setNewOrder({ ...newOrder, orderDate: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="customer">Customer <span className="text-red-600">*</span></Label>
                      <CustomerSelect
                        customers={customers}
                        value={newOrder.customerId}
                        onValueChange={(id) => {
                          const value = id ? String(id) : ""
                          setNewOrder((prev) => {
                            const selectedCust = customers.find((cust) => String(cust.id) === value)
                            const defaultDeliveryDate = selectedCust?.type !== "Supermarket" ? getToday() : ""

                            return {
                              ...prev,
                              customerId: value,
                              routeId: (selectedCust as any)?.routes?.[0]?.id ? String((selectedCust as any).routes[0].id) : "",
                              deliveryAddress: selectedCust?.address || "",
                              isTaxInvoice: selectedCust?.isTaxInclusive || false,
                              deliveryDate: defaultDeliveryDate,
                              dispatchDate: "",
                              timeSlot: ""
                            }
                          })
                        }}
                        placeholder="Select customer..."
                        showMainBadge={true}
                        className="w-full font-normal"
                      />
                      {isCheckingLimit && (
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <HourglassIcon className="h-3 w-3 animate-spin" />
                          <span>Checking credit limit & discounts...</span>
                        </div>
                      )}
                      {customerOutstanding?.creditExceeded && (
                        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md flex items-start gap-3 mt-2 animate-in fade-in slide-in-from-top-1">
                          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold text-xs">Credit Limit Exceeded!</p>
                            <p className="text-[10px] leading-tight mt-0.5">
                              Customer has exceeded their assigned credit limit.
                            </p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px]">
                              <span>Outstanding:</span>
                              <span className="font-mono font-bold text-red-700">LKR {parseFloat(customerOutstanding.totalOutstanding).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              <span>Credit Limit:</span>
                              <span className="font-mono">LKR {parseFloat(customerOutstanding.creditLimit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {!isCheckingLimit && newOrder.customerId && !customerOutstanding?.creditExceeded && customerOutstanding?.creditLimit > 0 && (
                        <div className="bg-green-50 border border-green-100 text-green-800 p-2 rounded-md mt-2 flex items-center gap-2 text-[10px]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          <span>Credit OK. Available Limit: LKR {(parseFloat(customerOutstanding.creditLimit) - parseFloat(customerOutstanding.totalOutstanding)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {newOrder.customerId && availableItems.length === 0 && (
                        <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>No items available for this customer.</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="isDelivery">Order Type</Label>
                      <div className="flex items-center space-x-3 mt-2">
                        <span className={`text-sm ${!newOrder.isDelivery ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                          Pickup
                        </span>
                        <Switch
                          id="isDelivery"
                          checked={newOrder.isDelivery}
                          onCheckedChange={(checked) => {
                            // If switching to pickup (checked = false), set delivery date to today
                            const updatedOrder = {
                              ...newOrder,
                              isDelivery: checked,
                              // Auto-set today's date when switching to pickup
                              deliveryDate: !checked ? getToday() : newOrder.deliveryDate,
                              dispatchDate: "",
                              timeSlot: ""
                            }
                            setNewOrder(updatedOrder)
                          }}
                        />
                        <span className={`text-sm ${newOrder.isDelivery ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                          Delivery
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {newOrder.isDelivery ? "Order will be delivered to customer" : "Customer will pickup the order"}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="isTaxInvoice">Tax Invoice</Label>
                      <div className="flex items-center space-x-3 mt-2">
                        <span className={`text-sm ${!newOrder.isTaxInvoice ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                          Regular
                        </span>
                        <Switch
                          id="isTaxInvoice"
                          checked={newOrder.isTaxInvoice && (selectedCustomer?.isTaxInclusive || false)}
                          disabled={!selectedCustomer?.isTaxInclusive}
                          onCheckedChange={(checked) => {
                            setNewOrder({ ...newOrder, isTaxInvoice: checked && (selectedCustomer?.isTaxInclusive || false) })
                          }}
                        />
                        <span className={`text-sm ${newOrder.isTaxInvoice && selectedCustomer?.isTaxInclusive ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                          Tax Invoice
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedCustomer?.isTaxInclusive
                          ? newOrder.isTaxInvoice
                            ? `Tax Number: ${selectedCustomer.taxNumber}`
                            : "Regular invoice"
                          : "Customer does not support tax invoices"}
                      </p>
                    </div>

                  </div>

                  <div className="grid-cols-5 grid gap-4">
                    <div>
                      <Label htmlFor="deliveryDate">{newOrder.isDelivery ? "Delivery Date" : "Pickup Date"}<span className="text-red-600">*</span></Label>
                      <Input
                        id="deliveryDate"
                        type="date"
                        value={newOrder.deliveryDate}
                        onChange={(e) => setNewOrder({ ...newOrder, deliveryDate: e.target.value })}
                        min={getToday()}
                        disabled={!newOrder.customerId}
                        placeholder="Select customer first"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="deliveryAddress">
                        {newOrder.isDelivery ? "Delivery Address" : "Address"}
                        <span className="text-red-600">*</span>
                      </Label>
                      <Input
                        id="deliveryAddress"
                        placeholder={newOrder.isDelivery ? "Enter delivery address" : "Enter address"}
                        value={newOrder.deliveryAddress}
                        onChange={(e) => setNewOrder({ ...newOrder, deliveryAddress: e.target.value })}
                      />
                    </div>

                    {newOrder.isDelivery && (
                      <div>
                        <Label htmlFor="dispatchDate">Dispatch Date<span className="text-red-600">*</span></Label>
                        <Input
                          id="dispatchDate"
                          type="date"
                          value={newOrder.dispatchDate}
                          onChange={(e) => setNewOrder({ ...newOrder, dispatchDate: e.target.value })}
                          min={getToday()}
                          disabled={!newOrder.customerId}
                          placeholder="Select customer first"
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="salesPerson">Sales Person</Label>
                      <Select
                        value={newOrder.idSalesPerson}
                        onValueChange={(value) => {
                          setNewOrder({ ...newOrder, idSalesPerson: value })
                        }}
                      >
                        <SelectTrigger id="salesPerson">
                          <SelectValue placeholder="Select sales person" />
                        </SelectTrigger>
                        <SelectContent>
                          {salesPersons.map((sp) => (
                            <SelectItem key={sp.id} value={String(sp.id)}>
                              {sp.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="poNumber">
                        PO Number
                      </Label>
                      <Input
                        id="poNumber"
                        placeholder="Enter PO Number"
                        value={newOrder.poNumber}
                        onChange={(e) => setNewOrder({ ...newOrder, poNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Order Items <span className="text-red-600">*</span></Label>
                      {newOrder.customerId && (
                        <div className="text-sm text-muted-foreground">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${availableItems.length > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                            }`}>
                            {availableItems.length} item{availableItems.length !== 1 ? 's' : ''} available
                          </span>
                        </div>
                      )}
                    </div>
                    <Table className="min-w-[700px] max-w-full text-xs">
                      <TableHeader>
                        <TableRow className="h-8 bg-gray-100">
                          <TableHead className="py-1 min-w-[350px]">Item Name</TableHead>
                          <TableHead className="py-1">Code</TableHead>
                          <TableHead className="py-1">Quantity</TableHead>
                          <TableHead className="py-1">Price</TableHead>
                          <TableHead className="py-1">Discount (%)</TableHead>
                          <TableHead className="py-1">Discounted Price</TableHead>
                          {(selectedCustomer?.isTaxInclusive || false) && <TableHead className="py-1">Excluding Tax Price</TableHead>}
                          <TableHead className="py-1">Total</TableHead>
                          <TableHead className="py-1">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newOrder.items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={newOrder.isTaxInvoice && (selectedCustomer?.isTaxInclusive || false) ? 7 : 6} className="text-center py-8 text-muted-foreground">
                              No items added. Click "Add Item" to get started.
                            </TableCell>
                          </TableRow>
                        ) : (
                          newOrder.items.map((item, index) => {
                            const selectedItem = availableItems.find(ai => ai.item.id === item.itemId)
                            const sellingPrice = selectedItem?.item?.sellingPrice || 0
                            const unit = selectedItem?.item?.unit
                            const isTaxItem = item.isTaxItem || selectedItem?.item?.isTaxInclusive || false
                            const taxRateValue = currentLocation ? parseFloat(currentLocation.taxRate) / 100 : 0.18

                            // Use helper function to calculate item totals
                            const itemTotals = calculateItemTotals(
                              item.qty,
                              sellingPrice,
                              item.discount || 0,
                              isTaxItem,
                              newOrder.isTaxInvoice,
                              taxRateValue
                            )

                            return (
                              <TableRow key={index} className="h-10">
                                <TableCell className="py-1">
                                  <Popover open={itemPopoverOpen === index} onOpenChange={(open) => setItemPopoverOpen(open ? index : null)}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between h-8 font-normal"
                                      >
                                        {item.itemId
                                          ? availableItems.find((ai) => ai.item.id === item.itemId)?.item.name
                                          : "Select item..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[350px] p-0" align="start">
                                      <Command>
                                        <CommandInput placeholder="Search item..." />
                                        <CommandList>
                                          <CommandEmpty>No item found.</CommandEmpty>
                                          <CommandGroup>
                                            {availableItems.map((availableItem) => (
                                              <CommandItem
                                                key={availableItem.item.id}
                                                value={availableItem.item.name + " " + (availableItem.item.sku || "")}
                                                onSelect={() => {
                                                  const value = availableItem.item.id
                                                  const selected = availableItems.find(ai => ai.item.id === value)
                                                  const updatedItems = [...newOrder.items]
                                                  updatedItems[index] = {
                                                    ...updatedItems[index],
                                                    itemId: value,
                                                    price: selected?.item?.sellingPrice || 0,
                                                    discount: (() => {
                                                      const categoryId = selected?.item?.categoryId || selected?.item?.Category?.id
                                                      const categoryDiscount = selectedCustomer?.CategoryDiscounts?.find(
                                                        (cd: any) => cd.categoryId === categoryId
                                                      )
                                                      return categoryDiscount ? categoryDiscount.discountPercentage : (selectedCustomer?.discountRate || 0)
                                                    })(),
                                                    isTaxItem: selected?.item?.isTaxInclusive || false,
                                                    discountedAmount: 0,
                                                    excludingTaxAmount: 0,
                                                    total: 0,
                                                  }
                                                  setNewOrder({ ...newOrder, items: updatedItems })
                                                  setItemPopoverOpen(null)
                                                }}
                                              >
                                                <Check
                                                  className={cn(
                                                    "mr-2 h-4 w-4",
                                                    item.itemId === availableItem.item.id ? "opacity-100" : "opacity-0"
                                                  )}
                                                />
                                                <div className="flex flex-col">
                                                  <div className="font-medium">{availableItem.item.name}</div>
                                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>Stock: {availableItem.availability.totalAvailableQuantity}</span>
                                                    {availableItem.item.sku && (
                                                      <>
                                                        <span>•</span>
                                                        <span>{availableItem.item.sku}</span>
                                                      </>
                                                    )}
                                                  </div>
                                                </div>
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                                    {selectedItem?.customerItemCode?.code}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        min={1}
                                        max={selectedItem?.availability?.totalAvailableQuantity || 0}
                                        placeholder="Qty"
                                        value={item.qty}
                                        onChange={(e) => {
                                          const newQty = Number(e.target.value)
                                          const maxAvailable = selectedItem?.availability?.totalAvailableQuantity || 0

                                          // Only update if within available range
                                          if (newQty >= 1 && newQty <= maxAvailable) {
                                            const updatedItems = [...newOrder.items]
                                            updatedItems[index].qty = newQty
                                            setNewOrder({ ...newOrder, items: updatedItems })
                                          }
                                        }}
                                        className={`h-8 w-24 ${item.qty > (selectedItem?.availability?.totalAvailableQuantity || 0) ? 'border-red-500 focus:border-red-500' : ''}`}
                                      />
                                      {unit && <span className="text-xs text-muted-foreground font-medium">{unit}</span>}
                                    </div>
                                    {selectedItem && item.qty > (selectedItem?.availability?.totalAvailableQuantity || 0) && (
                                      <p className="text-xs text-red-500">
                                        Max: {selectedItem.availability?.totalAvailableQuantity || 0}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-xs font-medium">LKR {sellingPrice.toLocaleString()}</span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    placeholder="0"
                                    value={item.discount || 0}
                                    onChange={(e) => {
                                      const value = Number(e.target.value)
                                      // Validate between 0 and 100
                                      if (value >= 0 && value <= 100) {
                                        const updatedItems = [...newOrder.items]
                                        updatedItems[index].discount = value
                                        setNewOrder({ ...newOrder, items: updatedItems })
                                      }
                                    }}
                                    className="w-24 h-8"
                                  />
                                </TableCell>

                                <TableCell className="py-1">
                                  <div className="text-xs">
                                    {isTaxItem ? (
                                      <span className="font-medium text-green-700">LKR {itemTotals.afterDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </div>
                                </TableCell>

                                {newOrder.isTaxInvoice && (selectedCustomer?.isTaxInclusive || false) && (
                                  <TableCell className="py-1">
                                    <div className="text-xs">
                                      {isTaxItem ? (
                                        <span className="font-medium text-blue-700">LKR {itemTotals.excludingTaxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </div>
                                  </TableCell>
                                )}
                                <TableCell className="py-1">
                                  <div className="text-xs">
                                    {item.discount && item.discount > 0 ? (
                                      <div>
                                        <p className="font-medium text-green-700">LKR {itemTotals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                      </div>
                                    ) : (
                                      <p className="font-medium text-green-700">LKR {itemTotals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      const updatedItems = newOrder.items.filter((_, i) => i !== index)
                                      setNewOrder({ ...newOrder, items: updatedItems })
                                    }}
                                    className="h-7 w-7"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                    <div className="mt-3 space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updatedItems = [...newOrder.items, {
                            itemId: 0,
                            qty: 1,
                            price: 0,
                            discount: 0,
                            Item: null,
                            item: null,
                            itemPriceId: 0,
                            code: "",
                            isTaxItem: false,
                            discountedAmount: 0,
                            excludingTaxAmount: 0,
                            total: 0,
                          } as SalesOrderItem]
                          setNewOrder({ ...newOrder, items: updatedItems })
                          setError("")
                        }}
                        disabled={availableItems.length === 0}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Item
                      </Button>
                      {availableItems.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Select a customer to add items
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-4 border-t">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Total Items: {newOrder.items.length}
                      </div>
                      {(() => {
                        let totalExcludingTax = 0;
                        let totalDiscount = 0;
                        let totalTax = 0;
                        const taxRateValue = currentLocation ? parseFloat(currentLocation.taxRate) / 100 : 0.18;

                        for (const item of newOrder.items) {
                          const selectedItem = availableItems.find(ai => ai.item.id === item.itemId)
                          const sellingPrice = selectedItem?.item?.sellingPrice || 0
                          const isTaxItem = item.isTaxItem || selectedItem?.item?.isTaxInclusive || false

                          // Use helper function to calculate totals
                          const itemTotals = calculateItemTotals(
                            item.qty,
                            sellingPrice,
                            item.discount || 0,
                            isTaxItem,
                            newOrder.isTaxInvoice,
                            taxRateValue
                          )

                          totalExcludingTax += itemTotals.total
                          totalDiscount += itemTotals.discountedAmount

                          // Calculate tax for this item (use total which already includes qty)
                          if (isTaxItem) {
                            totalTax += itemTotals.total * taxRateValue
                          }
                        }

                        const finalTotal = totalExcludingTax + totalTax;

                        return (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              Subtotal (Excluding Tax): LKR {totalExcludingTax.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                            {totalTax > 0 && (
                              <div className="text-sm font-medium text-blue-600">
                                Tax ({currentLocation?.taxRate}%): +LKR {totalTax.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </div>
                            )}
                            <div className="text-lg font-bold border-t pt-1">
                              Total Amount: LKR {finalTotal.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                    <Button
                      onClick={handleCreateOrder}
                      disabled={loading || customerOutstanding?.creditExceeded}
                      className={customerOutstanding?.creditExceeded ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      {loading ? "Creating Order..." : customerOutstanding?.creditExceeded ? "Credit Limit Exceeded" : "Create Order"}
                    </Button>
                  </div>
                  {error && <div className="text-red-600">{error}</div>}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                LKR {summaryData.totalAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </CardContent>
          </Card>

          {/* <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                LKR {summaryData.totalAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
              <p className="text-xs text-muted-foreground">Overall</p>
            </CardContent>
          </Card> */}

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Orders</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryData.totalApprovedCount}
              </div>
              <p className="text-xs text-muted-foreground">
                LKR {summaryData.totalApprovedAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </CardContent>
          </Card>

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryData.totalPendingCount}
              </div>
              <p className="text-xs text-muted-foreground">
                LKR {summaryData.totalPendingAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </CardContent>
          </Card>

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesOrders.filter((order) => order.deliveryOrderStatus === "Delivered").length}
              </div>
              <p className="text-xs text-muted-foreground">Current page completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 w-full justify-between">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <CustomerSelect
                  customers={customers}
                  value={searchCustomerId === "ALL" ? "" : searchCustomerId}
                  onValueChange={(id) => setSearchCustomerId(id ? String(id) : "ALL")}
                  placeholder="All Customers"
                  showMainBadge={true}
                  className="font-normal"
                />
                <Select
                  value={searchSalesPersonId}
                  onValueChange={setSearchSalesPersonId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by sales person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sales Persons</SelectItem>
                    {salesPersons.map((sp) => (
                      <SelectItem key={sp.id} value={String(sp.id)}>{sp.fullName || 'Unknown'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={searchIsTaxInvoice}
                  onValueChange={setSearchIsTaxInvoice}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by invoice type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Invoice Types</SelectItem>
                    <SelectItem value="TAX">Tax Invoice</SelectItem>
                    <SelectItem value="REGULAR">Regular Invoice</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={searchStatus}
                  onValueChange={setSearchStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={searchDeliveryOrderStatus}
                  onValueChange={setSearchDeliveryOrderStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by DO status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All DO Statuses</SelectItem>
                    <SelectItem value="Pending">DO Pending</SelectItem>
                    <SelectItem value="Approved">DO Approved</SelectItem>
                    <SelectItem value="Scheduled">DO Scheduled</SelectItem>
                    <SelectItem value="Dispatched">DO Dispatched</SelectItem>
                    <SelectItem value="In Transit">DO In Transit</SelectItem>
                    <SelectItem value="Delivered">DO Delivered</SelectItem>
                    <SelectItem value="Finalized">DO Finalized</SelectItem>
                    <SelectItem value="Failed">DO Failed</SelectItem>
                  </SelectContent>
                </Select>
                {(searchTerm || searchCustomerId !== "ALL" || searchSalesPersonId !== "ALL" || searchIsTaxInvoice !== "ALL" || searchStatus !== "ALL" || searchDeliveryOrderStatus !== "ALL") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 px-2 text-gray-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-2"></span>
                Loading orders...
              </div>
            ) : totalOrders === 0 ? (
              <div className="text-center text-muted-foreground py-8">No sales orders found.</div>
            ) : (
              <>
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Dispatch Date</TableHead>
                      <TableHead>Amount (LKR)</TableHead>
                      <TableHead>SO Status</TableHead>
                      <TableHead>DO Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="text-muted-foreground">
                            <p>No orders on this page</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      salesOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-muted/50 transition">
                          <TableCell className="py-2">
                            <div>
                              <div className="font-semibold text-blue-700">{order.orderNumber}</div>
                              <div className="text-sm text-muted-foreground">{order.isTaxInvoice ? " (Tax Invoice)" : ""}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div>
                              <div className="font-medium">{order.customerName}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <span>{order.customerType}</span>
                                <span>•</span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${order.isDelivery
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700'
                                  }`}>
                                  {order.isDelivery ? 'Delivery' : 'Pickup'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">{formatDate(order.orderDate)}</TableCell>
                          <TableCell className="py-2">{formatDate(order.deliveryDate || "")}</TableCell>
                          <TableCell className="py-2">
                            <div>
                              <div className="font-medium">{formatDate(order.dispatchDate || "")}</div>
                              {/* <div className="text-sm text-muted-foreground">{formatDate(order.timeSlot || "")}</div> */}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <span className="font-medium text-green-700">{Number(order.totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </TableCell>
                          <TableCell className="py-2">{getStatusBadge(order.status)}</TableCell>
                          {/* <TableCell>{getPaymentStatusBadge(order.paymentStatus ?? "Pending")}</TableCell> */}
                          <TableCell className="py-2">{getStatusBadge(order.deliveryOrderStatus ? order.deliveryOrderStatus : "Pending")}</TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center space-x-2">
                              <Button className="h-8 w-8" variant="outline" size="sm" onClick={() => setViewOrder(order)}>
                                <Eye className="h-4 w-4 text-blue-700" />
                              </Button>

                              {(order.status === "Pending" || order.status === "Processing") && (
                                <Button className="h-8 w-8" variant="outline" size="sm" onClick={() => setEditOrder(order)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {(order.status === "Pending" || order.status === "Processing" || order.status === "Cancelled") && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 w-8 hover:bg-red-50 hover:border-red-200">
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-red-600">Delete Sales Order</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete <strong>{order.orderNumber}</strong>?
                                        <br />
                                        <br />
                                        {order.status === "Processing" && (
                                          <div className="text-orange-600 font-medium mb-2">
                                            ⚠️ Warning: This order is currently being processed.
                                          </div>
                                        )}
                                        This action cannot be undone and will permanently remove:
                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                          <li>Order details and items</li>
                                          <li>Customer delivery information</li>
                                          <li>All associated order data</li>
                                        </ul>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteOrder(order.id)}
                                        className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                        disabled={loading}
                                      >
                                        {loading ? "Deleting..." : "Delete Order"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Results Summary and Pagination */}
                <ResultsSummary />
                <PaginationControls />
              </>
            )}
          </CardContent>
        </Card>

        {/* View Order Dialog */}
        <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sales Order Details</DialogTitle>
            </DialogHeader>
            {viewOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div><b>Order #:</b> {viewOrder.orderNumber}</div>
                  <div><b>Order Date:</b> {formatDate(viewOrder.orderDate)}</div>
                  <div><b>Delivery Date:</b> {formatDate(viewOrder.deliveryDate || "")}</div>
                  <div><b>Customer:</b> {viewOrder.customerName}</div>
                  {viewOrder.isDelivery ? <div><b>Dispatch Date:</b> {formatDate(viewOrder.dispatchDate || "")}</div> : null}
                  <div className="col-span-2"><b>{viewOrder.isDelivery ? 'Delivery' : 'Pickup'} Address:</b> {viewOrder.deliveryAddress}</div>
                  <div><b>Contact Number:</b> {viewOrder.contactNumber}</div>
                  <div><b>Order Type:</b>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${viewOrder.isDelivery
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                      }`}>
                      {viewOrder.isDelivery ? 'Delivery' : 'Pickup'}
                    </span>
                  </div>
                  {viewOrder.poNumber && <div><b>PO Number:</b> {viewOrder.poNumber}</div>}
                  <div><b>Status:</b> {getStatusBadge(viewOrder.status)}</div>
                  {viewOrder.SalesPerson && (
                    <div className="bg-amber-50 p-3 rounded col-span-3">
                      <b className="block mb-2">Sales Person Details</b>
                      <div className="grid grid-cols-3 gap-4">
                        <div><b>Name:</b> {viewOrder.SalesPerson.fullName || 'N/A'}</div>
                        <div><b>Mobile:</b> {viewOrder.SalesPerson.mobile || 'N/A'}</div>
                      </div>
                    </div>
                  )}
                  {viewOrder.isTaxInvoice && (
                    <div className="col-span-3">
                      <div className="grid grid-cols-3 gap-4 bg-blue-50 p-3 rounded">
                        <div><b>Tax Invoice:</b> Yes</div>
                        <div><b>Tax Rate:</b> {viewOrder.taxRate}%</div>
                        <div><b>Tax Number:</b> {viewOrder.customerTaxNumber}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <b>Items:</b>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Discounted Price</TableHead>
                        <TableHead className="text-right">Excluding Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(viewOrder.items || []).map((item, idx) => {
                        const unit = item.item?.unit || (item.Item?.unit) || "";
                        const unitPrice = item.price;
                        const discountAmount = unitPrice * ((item.discount || 0) / 100);
                        const itemName = (item.item?.name || item.Item?.name || 'Unknown Item');
                        const taxRateValue = viewOrder.taxRate ? parseFloat(viewOrder.taxRate.toString()) / 100 : 0.18;
                        const itemTotals = calculateItemTotals(
                          item.qty,
                          item.price,
                          item.discount || 0,
                          item.isTaxItem || false,
                          viewOrder.isTaxInvoice || false,
                          taxRateValue
                        );

                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              <div className="font-medium">{itemName}</div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div className="flex items-center gap-1">
                                  <div>{item.item?.barcode || item.Item?.sku || 'N/A'}</div>
                                  {item.code && (
                                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono text-xs">
                                      {item.code}
                                    </span>
                                    // {/* <span className="text-xs text-muted-foreground">Customer Code</span> */}
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{item.qty} {unit}</TableCell>
                            <TableCell className="text-right">{Number(unitPrice).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}</TableCell>

                            <TableCell className="text-right">
                              {item.discount && item.discount > 0 ? (
                                <div className="text-red-600">
                                  <div className="text-xs">{item.discount}%</div>
                                  <div className="font-medium">- {Number(discountAmount).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No discount</span>
                              )}
                            </TableCell>

                            <TableCell className="text-right font-medium text-blue-700">
                              {item.isTaxItem ? (
                                (() => {

                                  return `${Number(itemTotals.afterDiscount).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}`;
                                })()
                              ) : (
                                '-'
                              )}
                            </TableCell>


                            <TableCell className="text-right font-medium text-blue-700">
                              {item.isTaxItem ? (
                                (() => {
                                  return `${Number(itemTotals.excludingTaxAmount).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}`;
                                })()
                              ) : (
                                '-'
                              )}
                            </TableCell>

                            <TableCell className="text-right font-medium text-green-700">
                              {Number(itemTotals.total).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end mt-4">
                    <div className="space-y-2 text-right">
                      {(() => {
                        let totalExcludingTax = 0;
                        let totalDiscount = 0;
                        let totalTax = 0;
                        const taxRateValue = viewOrder.taxRate ? parseFloat(viewOrder.taxRate.toString()) / 100 : 0.18;

                        (viewOrder.items || []).forEach(item => {
                          const isTaxItem = item.isTaxItem || item.item?.isTaxInclusive || item.Item?.isTaxInclusive || false;

                          // Use helper function to calculate item totals
                          const itemTotals = calculateItemTotals(
                            item.qty,
                            item.price,
                            item.discount || 0,
                            isTaxItem,
                            viewOrder.isTaxInvoice || false,
                            taxRateValue
                          );

                          totalExcludingTax += itemTotals.total;
                          totalDiscount += itemTotals.discountedAmount;

                          // Calculate tax for this item
                          if (isTaxItem) {
                            totalTax += itemTotals.total * taxRateValue;
                          }
                        });

                        return (
                          <>
                            <div className="text-sm font-medium">
                              Subtotal: <span className="font-bold">LKR {totalExcludingTax.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}</span>
                            </div>
                            {totalTax > 0 && (
                              <div className="text-sm font-medium text-blue-600">
                                Tax ({viewOrder.taxRate}%): <span className="font-bold">+LKR {totalTax.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}</span>
                              </div>
                            )}
                            <div className="text-lg font-bold">
                              Total Amount: <span className="text-green-700">LKR {Number(viewOrder.totalAmount ?? 0).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <div>
                    <Label>Created At</Label>
                    <p className="font-medium">{viewOrder.createdAt ? format(new Date(viewOrder.createdAt), "PPP p") : ""}</p>
                    {viewOrder.createdUserName && (
                      <p className="font-medium text-xs text-muted-foreground">by {viewOrder.createdUserName}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {viewOrder.status === "Pending" && (
                      <Button onClick={() => handleApproveRejectOrder(viewOrder.id, "Approved")}
                        className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
                        disabled={loading}
                      >
                        {loading ? "Approving..." : "Approve Order"}</Button>
                    )}
                    {viewOrder.status === "Approved" && viewOrder.deliveryOrderStatus === "Pending" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel Order
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-red-600">Cancel Finalized Order</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel the finalized order <strong>{viewOrder.orderNumber}</strong>?
                              <br /><br />
                              This action will:
                              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                                <li>Update the order status to Cancelled</li>
                                <li>The order cannot be processed for delivery</li>
                              </ul>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Order</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancelOrder(viewOrder.id)}
                              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                              disabled={loading}
                            >
                              {loading ? "Cancelling..." : "Yes, Cancel Order"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>

            )}

          </DialogContent>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog open={!!editOrder} onOpenChange={() => setEditOrder(null)}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Sales Order</DialogTitle>
            </DialogHeader>
            {editOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="orderDate">Order Date <span className="text-red-600">*</span></Label>
                    <Input
                      disabled
                      id="orderDate"
                      type="date"
                      value={editOrder.orderDate?.slice(0, 10) || ""}
                      onChange={e => setEditOrder({ ...editOrder, orderDate: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="customer">Customer <span className="text-red-600">*</span></Label>
                    <Input value={editOrder.customerName} disabled />
                  </div>

                  <div className="flex items-center space-x-2 min-w-[140px]">
                    <span className={`text-sm ${!editOrder.isDelivery ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                      Pickup
                    </span>
                    <Switch
                      checked={editOrder.isDelivery}
                      onCheckedChange={(checked) => {
                        // If switching to pickup (checked = false), set delivery date to today
                        const updatedOrder = {
                          ...editOrder,
                          isDelivery: checked,
                          // Auto-set today's date when switching to pickup
                          deliveryDate: !checked ? getToday() : editOrder.deliveryDate
                        }
                        setEditOrder(updatedOrder)
                      }}
                    />
                    <span className={`text-sm ${editOrder.isDelivery ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                      Delivery
                    </span>
                  </div>
                  <div>
                    <Label htmlFor="editIsTaxInvoice">Tax Invoice</Label>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className={`text-sm ${!(editOrder.isTaxInvoice && editOrder.customerIsTaxInclusive) ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                        Regular
                      </span>
                      <Switch
                        id="editIsTaxInvoice"
                        checked={(editOrder.isTaxInvoice || false) && (editOrder.customerIsTaxInclusive || false)}
                        disabled={!editOrder.customerIsTaxInclusive}
                        onCheckedChange={(checked) => {
                          setEditOrder({ ...editOrder, isTaxInvoice: checked && (editOrder.customerIsTaxInclusive || false) })
                        }}
                      />
                      <span className={`text-sm ${(editOrder.isTaxInvoice && editOrder.customerIsTaxInclusive) ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                        Tax Invoice
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {editOrder.customerIsTaxInclusive
                        ? editOrder.isTaxInvoice
                          ? `Tax Number: ${editOrder.customerTaxNumber}`
                          : "Regular invoice"
                        : "Customer does not support tax invoices"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="deliveryDate">Delivery Date <span className="text-red-600">*</span></Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      min={getToday()}
                      value={editOrder.deliveryDate?.slice(0, 10) || ""}
                      onChange={e => setEditOrder({ ...editOrder, deliveryDate: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="deliveryAddress">
                      {editOrder.isDelivery ? "Delivery Address" : "Address"}
                      <span className="text-red-600">*</span>
                    </Label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          id="deliveryAddress"
                          placeholder={editOrder.isDelivery ? "Enter delivery address" : "Enter address"}
                          value={editOrder.deliveryAddress || ""}
                          onChange={e => setEditOrder({ ...editOrder, deliveryAddress: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {editOrder.isDelivery && (
                    <div>
                      <Label htmlFor="dispatchDate">Dispatch Date<span className="text-red-600">*</span></Label>
                      <Input
                        id="dispatchDate"
                        type="date"
                        min={getToday()}
                        value={editOrder.dispatchDate?.slice(0, 10) || ""}
                        onChange={e => setEditOrder({ ...editOrder, dispatchDate: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="editSalesPerson">Sales Person</Label>
                    <Select
                      value={editOrder.idSalesPerson ? String(editOrder.idSalesPerson) : ""}
                      onValueChange={(value) => {
                        setEditOrder({ ...editOrder, idSalesPerson: Number(value) })
                      }}
                    >
                      <SelectTrigger id="editSalesPerson">
                        <SelectValue placeholder="Select sales person" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesPersons.map((sp) => (
                          <SelectItem key={sp.id} value={String(sp.id)}>
                            {sp.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="editPoNumber">
                      PO Number
                    </Label>
                    <Input
                      id="editPoNumber"
                      placeholder="Enter PO Number"
                      value={editOrder.poNumber}
                      onChange={(e) => setEditOrder({ ...editOrder, poNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Order Items <span className="text-red-600">*</span></Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Discount (%)</TableHead>
                          <TableHead>Discounted Amount</TableHead>
                          <TableHead>Excluding Tax</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editOrder.items.map((item, index) => {
                          const unit = item.item?.unit || item.Item?.unit || "";
                          const unitPrice = item.price;
                          const isTaxItem = item.isTaxItem || item.item?.isTaxInclusive || item.Item?.isTaxInclusive || false;
                          const taxRateValue = editOrder.taxRate ? parseFloat(editOrder.taxRate.toString()) / 100 : 0.18;

                          const itemTotals = calculateItemTotals(
                            item.qty,
                            unitPrice,
                            item.discount || 0,
                            isTaxItem,
                            editOrder.isTaxInvoice || false,
                            taxRateValue
                          );

                          const itemName = item.item?.name || item.Item?.name || 'Unknown Item';

                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="font-medium text-sm">{itemName}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <span>{item.item?.barcode || item.Item?.sku || 'N/A'}</span>
                                  {item.customerItemCode && (
                                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono text-xs">
                                      {item.customerItemCode.code}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  placeholder="Qty"
                                  className="w-20"
                                  value={item.qty}
                                  onChange={e => {
                                    const updatedItems = [...editOrder.items]
                                    updatedItems[index].qty = Number(e.target.value)
                                    setEditOrder({ ...editOrder, items: updatedItems })
                                  }}
                                />
                              </TableCell>
                              <TableCell className="text-sm">
                                LKR {Number(unitPrice ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  placeholder="0"
                                  className="w-max"
                                  value={item.discount || 0}
                                  onChange={e => {
                                    const updatedItems = [...editOrder.items]
                                    updatedItems[index].discount = Number(e.target.value)
                                    setEditOrder({ ...editOrder, items: updatedItems })
                                  }}
                                />
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                LKR {Number(itemTotals.afterDiscount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              {editOrder.isTaxInvoice && (
                                <TableCell className="text-sm">
                                  {isTaxItem ? (
                                    <span className="font-medium text-blue-700">
                                      LKR {itemTotals.excludingTaxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="text-sm">
                                {item.discount && item.discount > 0 ? (
                                  <div className="space-y-0.5">
                                    <div className="text-xs text-muted-foreground line-through">
                                      LKR {Number(unitPrice * item.qty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className="font-medium text-green-700">
                                      LKR {itemTotals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="font-medium">
                                    LKR {itemTotals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    const updatedItems = editOrder.items.filter((_, i) => i !== index)
                                    setEditOrder({ ...editOrder, items: updatedItems })
                                  }}
                                  title="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-4 border-t">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Total Items: {editOrder.items.length}
                    </div>
                    {(() => {
                      let totalExcludingTax = 0;
                      let totalDiscount = 0;
                      let totalTax = 0;
                      let totalWeight = 0;
                      const taxRateValue = editOrder.taxRate ? parseFloat(editOrder.taxRate.toString()) / 100 : 0.18;

                      for (const item of editOrder.items) {
                        const unitWeight = item?.item?.weight || item?.Item?.weight || 1;
                        const isTaxItem = item.isTaxItem || item.item?.isTaxInclusive || item.Item?.isTaxInclusive || false;

                        // Use helper function to calculate item totals
                        const itemTotals = calculateItemTotals(
                          item.qty,
                          item.price,
                          item.discount || 0,
                          isTaxItem,
                          editOrder.isTaxInvoice || false,
                          taxRateValue
                        );

                        totalExcludingTax += itemTotals.total;
                        totalDiscount += itemTotals.discountedAmount;
                        totalWeight += item.qty * unitWeight;

                        // Calculate tax for this item
                        if (isTaxItem) {
                          totalTax += itemTotals.total * taxRateValue;
                        }
                      }

                      const finalTotal = totalExcludingTax + totalTax;

                      return (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            Subtotal: LKR {totalExcludingTax.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </div>
                          {totalTax > 0 && (
                            <div className="text-sm font-medium text-blue-600">
                              Tax ({editOrder.taxRate}%): +LKR {totalTax.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                          )}
                          <div className="text-lg font-bold">
                            Total Amount: LKR {finalTotal.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  <Button onClick={handleEditOrder}>Save Changes</Button>
                </div>
                {error && <div className="text-red-600">{error}</div>}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
