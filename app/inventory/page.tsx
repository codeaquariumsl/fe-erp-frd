"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Search, MoreHorizontal, Package, AlertTriangle, Thermometer, ArrowRightLeft, Eye, MapPin, Loader2 } from "lucide-react"
import { useStockOperations } from "@/hooks/use-stock-operations"
import { storesApi, categoriesApi, salesOrdersApi, itemsApi } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showStockDetails, setShowStockDetails] = useState(false)
  const [showStockTransfer, setShowStockTransfer] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [itemTypeFilter, setItemTypeFilter] = useState<string>("all") // "all" | "finish" | "raw"
  const [stockDetails, setStockDetails] = useState<any[]>([])
  const [loadingStockDetails, setLoadingStockDetails] = useState(false)
  const [inventory, setInventory] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [transferData, setTransferData] = useState({
    itemId: "",
    fromStoreId: "",
    toStoreId: "",
    qty: "",
    weight: "",
    remark: ""
  })

  const { loading: stockLoading, error: stockError, transferStock, getStockDetails: fetchStockDetails, getAllStock } = useStockOperations()

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const locationId = localStorage.getItem("selectedLocationId")
        // Load stores, stock, categories, approved sales orders, and all items
        const [storesResponse, stockResponse, categoriesResponse, approvedSalesOrdersResponse, itemsResponse] = await Promise.all([
          storesApi.getAll(),
          getAllStock({ locationId: Number(locationId) || 1 }),
          categoriesApi.getAll(),
          salesOrdersApi.getAll({ status: "Approved" }).catch(() => ({ data: [] })),
          itemsApi.getAll().catch(() => [])
        ])

        const storesData = Array.isArray(storesResponse) ? storesResponse : []
        setStores(storesData)

        const categoriesData = Array.isArray(categoriesResponse) ? categoriesResponse : []
        setCategories(categoriesData)

        const rawStockData = stockResponse.success ? stockResponse.data : []
        // Only include store stock (exclude lorry and unassigned stock records)
        const stockData = rawStockData.filter(
          (stock: any) => stock.storeId !== null && !stock.lorryId
        )

        // Calculate reserved quantity per item from approved sales orders
        const reservedQtyMap: Record<number, number> = {}
        const approvedOrders = (approvedSalesOrdersResponse as any)?.data || []
        if (Array.isArray(approvedOrders)) {
          approvedOrders.forEach((order: any) => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((soItem: any) => {
                const itemId = Number(soItem.itemId)
                const qty = Number(soItem.qty || 0)
                if (itemId) {
                  reservedQtyMap[itemId] = (reservedQtyMap[itemId] || 0) + qty
                }
              })
            }
          })
        }

        const itemsData = Array.isArray(itemsResponse)
          ? itemsResponse
          : Array.isArray((itemsResponse as any)?.data)
            ? (itemsResponse as any).data
            : []

        // Group stock data by itemId to create inventory summary, initialized with all items
        const itemGroups: Record<number, any> = {}

        // Initialize with all items so both finish and raw items (including items with 0 stock) appear
        itemsData.forEach((item: any) => {
          itemGroups[item.id] = {
            itemId: item.id,
            item: item,
            stores: [],
            totalQty: 0,
            totalWeight: 0
          }
        })

        // Aggregate stock data into itemGroups
        stockData.forEach((stock: any) => {
          const itemId = stock.itemId
          if (!itemGroups[itemId]) {
            itemGroups[itemId] = {
              itemId: itemId,
              item: stock.Item,
              stores: [],
              totalQty: 0,
              totalWeight: 0
            }
          }

          // Add to total quantities
          itemGroups[itemId].totalQty += stock.availableQty || 0
          itemGroups[itemId].totalWeight += stock.weight || 0

          // Add store information
          if (stock.Store) {
            itemGroups[itemId].stores.push({
              storeId: stock.storeId,
              storeName: stock.Store.name,
              quantity: stock.availableQty,
              weight: stock.weight,
              status: stock.status,
              updatedAt: stock.updatedAt
            })
          }
        })

        // Convert grouped data to inventory format
        const inventoryData = Object.values(itemGroups).map((group: any) => {
          const item = group.item
          const category = categoriesData.find((c: any) => c.id === item.categoryId) as any

          // Determine primary location (store with highest quantity)
          const primaryStore = group.stores.length > 0
            ? group.stores.reduce((max: any, store: any) =>
              store.quantity > max.quantity ? store : max
            )
            : null

          // Determine stock status
          let status = "In Stock"
          if (group.totalQty <= 0) status = "Out of Stock"
          else if (group.totalQty < (item.reorderLevelQty || 50)) status = "Low Stock"
          else if (group.totalQty > (item.overstockLevelQty || 1000)) status = "Overstock"

          const reservedQty = reservedQtyMap[item.id] || 0
          const balance = (group.totalQty || 0) - reservedQty

          return {
            id: item.sku || `ITEM-${item.id}`,
            itemId: item.id,
            name: item.name,
            barcode: item.barcode || "",
            category: category?.name || item.Category?.name || "Unknown",
            isProductionRawMaterial: !!item.isProductionRawMaterial,
            quantity: group.totalQty,
            quantityInHand: group.totalQty,
            reservedQty,
            balance,
            unit: item.unit || "box",
            location: primaryStore?.storeName || (group.stores.length > 0 ? "Multiple Locations" : "—"),
            locationCount: group.stores.length,
            purchasePrice: item.costPrice || 0,
            sellingPrice: item.sellingPrice || 0,
            reorderLevel: item.reorderLevelQty || 0,
            overstockLevel: item.overstockLevelQty || 0,
            status,
            weight: group.totalWeight,
            stores: group.stores,
            lastUpdated: group.stores.length > 0
              ? new Date(Math.max(...group.stores.map((s: any) => new Date(s.updatedAt).getTime())))
              : new Date()
          }
        })

        setInventory(inventoryData)
      } catch (error) {
        console.error('Error loading inventory data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleStockTransfer = async () => {
    try {
      const result = await transferStock({
        itemId: parseInt(transferData.itemId),
        fromStoreId: parseInt(transferData.fromStoreId),
        toStoreId: parseInt(transferData.toStoreId),
        qty: parseInt(transferData.qty),
        weight: parseFloat(transferData.weight),
        remark: transferData.remark
      })

      if (result.success) {
        setShowStockTransfer(false)
        setTransferData({
          itemId: "",
          fromStoreId: "",
          toStoreId: "",
          qty: "",
          weight: "",
          remark: ""
        })
        alert('Stock transferred successfully!')
        // Reload inventory data
        window.location.reload()
      } else {
        alert(`Failed to transfer stock: ${result.error}`)
      }
    } catch (error) {
      console.error('Error transferring stock:', error)
      alert('Error transferring stock')
    }
  }

  const handleViewStockDetails = async (item: any) => {
    setSelectedItem(item)
    setShowStockDetails(true)
    setLoadingStockDetails(true)

    try {
      const itemId = item.itemId || parseInt(item.id.replace('INV-', ''))
      const result = await fetchStockDetails(itemId)
      console.log(result.data);

      if (result.success) {
        setStockDetails(result.data)
      } else {
        // If API fails, show empty array
        setStockDetails([])
      }
    } catch (error) {
      console.error('Error fetching stock details:', error)
      // If API fails, show empty array
      setStockDetails([])
    } finally {
      setLoadingStockDetails(false)
    }
  }

  const typeCounts = useMemo(() => {
    const finish = inventory.filter((i) => !i.isProductionRawMaterial).length
    const raw = inventory.filter((i) => i.isProductionRawMaterial).length
    return { all: inventory.length, finish, raw }
  }, [inventory])

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === "all" || item.status === statusFilter

    const matchesType =
      itemTypeFilter === "all" ||
      (itemTypeFilter === "finish" && !item.isProductionRawMaterial) ||
      (itemTypeFilter === "raw" && item.isProductionRawMaterial)

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Stock":
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">In Stock</Badge>
      case "Low Stock":
        return <Badge variant="destructive">Low Stock</Badge>
      case "Out of Stock":
        return <Badge variant="secondary">Out of Stock</Badge>
      case "Overstock":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">Overstock</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <ERPLayout>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">
              Manage your fruit inventory and stock levels
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-2 md:grid-cols-4">
          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : inventory.length}
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                Active inventory items
              </p>
            </CardContent>
          </Card>

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> :
                  `LKR ${inventory.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0).toLocaleString()}`
                }
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                Current inventory value
              </p>
            </CardContent>
          </Card>

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> :
                  inventory.filter(item => item.status === "Low Stock" || item.status === "Out of Stock").length
                }
              </div>
              <p className="text-xs text-muted-foreground leading-tight">Need attention</p>
            </CardContent>
          </Card>

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total Stores</CardTitle>
              <Thermometer className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stores.length}
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                Active stores
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>

                {/* Item Type Filter (All / Finish / Raw) */}
                <div className="flex items-center bg-gray-100 p-1 rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter("all")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      itemTypeFilter === "all"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    All Items ({typeCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter("finish")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      itemTypeFilter === "finish"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Finished Goods ({typeCounts.finish})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter("raw")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      itemTypeFilter === "raw"
                        ? "bg-white text-amber-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Raw Materials ({typeCounts.raw})
                  </button>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="In Stock">In Stock</SelectItem>
                    <SelectItem value="Low Stock">Low Stock</SelectItem>
                    <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    <SelectItem value="Overstock">Overstock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading inventory...</span>
              </div>
            ) : (
              <Table className="text-xs">
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Qty in Hand</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Locations</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {searchTerm
                          ? 'No items found matching your search.'
                          : itemTypeFilter !== 'all'
                          ? `No ${itemTypeFilter === 'finish' ? 'finished goods' : 'raw materials'} found.`
                          : 'No inventory items found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="py-2">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              {item.barcode && <span>{item.barcode}</span>}
                              {item.isProductionRawMaterial ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                                  Raw Material
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                  Finished Good
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">{item.category}</TableCell>
                        <TableCell className="py-2">
                          <span className={(item.quantityInHand ?? item.quantity) <= 0 ? "text-red-600 font-semibold" : (item.quantityInHand ?? item.quantity) < (item.reorderLevel || 50) ? "text-orange-600 font-medium" : "font-medium"}>
                            {item.quantityInHand ?? item.quantity} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className={(item.reservedQty ?? 0) > 0 ? "text-orange-600 font-medium" : "text-gray-500"}>
                            {item.reservedQty ?? 0} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className={(item.balance ?? item.quantity) < 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                            {item.balance ?? item.quantity} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-500" />
                            <span>{item.location}</span>
                            {item.locationCount > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                +{item.locationCount - 1} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-sm">
                            <div className={item.quantity < (item.reorderLevel || 0) ? "text-red-600 font-medium" : ""}>
                              {item.quantity}/{item.reorderLevel || 0}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-sm">
                            <div className="font-medium">{Number(item.quantity * item.purchasePrice).toFixed(2)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewStockDetails(item)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Stock Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setTransferData({ ...transferData, itemId: item.itemId.toString() })
                                setShowStockTransfer(true)
                              }}>
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                Transfer Stock
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Stock Details Dialog */}
        <Dialog open={showStockDetails} onOpenChange={setShowStockDetails}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>Stock Details - {selectedItem?.name}</span>
                {selectedItem && (
                  selectedItem.isProductionRawMaterial ? (
                    <Badge variant="outline" className="text-xs font-normal bg-amber-50 text-amber-700 border-amber-200">
                      Raw Material
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-200">
                      Finished Good
                    </Badge>
                  )
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Item ID</Label>
                  <p className="text-sm font-medium">{selectedItem?.id}</p>
                </div>
                <div>
                  <Label>Category</Label>
                  <p className="text-sm font-medium">{selectedItem?.category}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Stock Distribution</h3>
                {loadingStockDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading stock details...</span>
                  </div>
                ) : selectedItem ? (
                  <div className="space-y-4">
                    {/* Store Stock */}
                    {selectedItem.stores && selectedItem.stores.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Store Locations
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Store</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Weight</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Last Updated</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedItem.stores.map((store: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{store.storeName}</TableCell>
                                <TableCell>{store.quantity} {selectedItem.unit}</TableCell>
                                <TableCell>{store.weight} kg</TableCell>
                                <TableCell>
                                  <Badge variant={store.status === 'Active' ? 'default' : 'secondary'}>
                                    {store.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{new Date(store.updatedAt).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Fallback if no detailed stock info */}
                    {(!selectedItem.stores || selectedItem.stores.length === 0) && (
                      <div className="text-center text-gray-500 py-8">
                        <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm">No detailed stock information available</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm">No item selected</p>
                  </div>
                )}
              </div>

              {selectedItem && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-4">
                  <Card>
                    <CardContent className="pt-4 px-3 pb-3">
                      <div className="text-xl font-bold">
                        {selectedItem.quantityInHand ?? selectedItem.quantity}
                      </div>
                      <p className="text-xs text-muted-foreground">Qty in Hand ({selectedItem.unit})</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 px-3 pb-3">
                      <div className="text-xl font-bold text-orange-600">
                        {selectedItem.reservedQty ?? 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Reserved ({selectedItem.unit})</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 px-3 pb-3">
                      <div className={`text-xl font-bold ${(selectedItem.balance ?? selectedItem.quantity) < 0 ? "text-red-600" : "text-green-600"}`}>
                        {selectedItem.balance ?? selectedItem.quantity}
                      </div>
                      <p className="text-xs text-muted-foreground">Balance ({selectedItem.unit})</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 px-3 pb-3">
                      <div className="text-xl font-bold">
                        {selectedItem.weight?.toFixed(1) || 0} kg
                      </div>
                      <p className="text-xs text-muted-foreground">Total Weight</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 px-3 pb-3">
                      <div className="text-xl font-bold">
                        {selectedItem.stores?.length || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Locations</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 px-3 pb-3">
                      <div className="text-xl font-bold">
                        LKR {((selectedItem.quantityInHand ?? selectedItem.quantity) * selectedItem.purchasePrice).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Total Value</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Stock Transfer Dialog */}
        <Dialog open={showStockTransfer} onOpenChange={setShowStockTransfer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Stock</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fromStore">From Store</Label>
                  <Select value={transferData.fromStoreId} onValueChange={(value) =>
                    setTransferData({ ...transferData, fromStoreId: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="toStore">To Store</Label>
                  <Select value={transferData.toStoreId} onValueChange={(value) =>
                    setTransferData({ ...transferData, toStoreId: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Enter quantity"
                    value={transferData.qty}
                    onChange={(e) => setTransferData({ ...transferData, qty: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    placeholder="Enter weight"
                    value={transferData.weight}
                    onChange={(e) => setTransferData({ ...transferData, weight: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="remark">Remark</Label>
                <Textarea
                  id="remark"
                  placeholder="Enter transfer remark"
                  value={transferData.remark}
                  onChange={(e) => setTransferData({ ...transferData, remark: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowStockTransfer(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStockTransfer} disabled={stockLoading}>
                  {stockLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Transfer Stock
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
