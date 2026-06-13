"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Plus, Search, MoreHorizontal, Package, AlertTriangle, Thermometer, ArrowRightLeft, Eye, MapPin, Loader2 } from "lucide-react"
import { useStockOperations } from "@/hooks/use-stock-operations"
import { itemsApi, storesApi, categoriesApi } from "@/lib/api"

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showStockDetails, setShowStockDetails] = useState(false)
  const [showStockTransfer, setShowStockTransfer] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"combined" | "stores" | "lorries">("combined")
  const [storeInventory, setStoreInventory] = useState<any[]>([])
  const [lorryInventory, setLorryInventory] = useState<any[]>([])
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
        // Load stores and categories first
        const [storesResponse, stockResponse, categoriesResponse] = await Promise.all([
          storesApi.getAll(),
          getAllStock({ locationId: Number(locationId) || 1 }),
          categoriesApi.getAll()
        ])

        const storesData = Array.isArray(storesResponse) ? storesResponse : []
        setStores(storesData)

        const categoriesData = Array.isArray(categoriesResponse) ? categoriesResponse : []
        setCategories(categoriesData)

        const stockData = stockResponse.success ? stockResponse.data : []

        // Group stock data by itemId to create inventory summary
        const itemGroups = stockData.reduce((acc: any, stock: any) => {
          const itemId = stock.itemId
          if (!acc[itemId]) {
            acc[itemId] = {
              itemId: itemId,
              item: stock.Item,
              stores: [],
              lorries: [],
              totalQty: 0,
              totalWeight: 0
            }
          }

          // Add to total quantities
          acc[itemId].totalQty += stock.availableQty || 0
          acc[itemId].totalWeight += stock.weight || 0

          // Add store or lorry information
          if (stock.Store) {
            acc[itemId].stores.push({
              storeId: stock.storeId,
              storeName: stock.Store.name,
              quantity: stock.availableQty,
              weight: stock.weight,
              status: stock.status,
              updatedAt: stock.updatedAt
            })
          }

          if (stock.Lorry) {
            acc[itemId].lorries.push({
              lorryId: stock.lorryId,
              lorryNumber: stock.Lorry.vehicleNumber,
              driverName: stock.Lorry.driverName,
              quantity: stock.availableQty,
              weight: stock.weight,
              status: stock.status,
              updatedAt: stock.updatedAt
            })
          }

          return acc
        }, {})

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
          if (group.totalQty === 0) status = "Out of Stock"
          else if (group.totalQty < (item.reorderLevelQty || 50)) status = "Low Stock"
          else if (group.totalQty > (item.overstockLevelQty || 1000)) status = "Overstock"

          return {
            id: item.sku,
            itemId: item.id,
            name: item.name,
            barcode: item.barcode,
            category: category?.name || "Unknown",
            quantity: group.totalQty,
            unit: item.unit || "box",
            location: primaryStore?.storeName || "Multiple Locations",
            locationCount: group.stores.length + group.lorries.length,
            purchasePrice: item.costPrice || 0,
            sellingPrice: item.sellingPrice || 0,
            reorderLevel: item.reorderLevelQty || 0,
            overstockLevel: item.overstockLevelQty || 0,
            status,
            weight: group.totalWeight,
            stores: group.stores,
            lorries: group.lorries,
            lastUpdated: group.stores.length > 0
              ? new Date(Math.max(...group.stores.map((s: any) => new Date(s.updatedAt).getTime())))
              : new Date()
          }
        })

        setInventory(inventoryData)

        // Create separate store-wise inventory
        const storeStockData = stockData.filter((stock: any) => stock.storeId !== null && stock.lorryId === null)
        const storeItemGroups = storeStockData.reduce((acc: any, stock: any) => {
          const key = `${stock.itemId}-${stock.storeId}`
          if (!acc[key]) {
            acc[key] = {
              itemId: stock.itemId,
              storeId: stock.storeId,
              item: stock.Item,
              store: stock.Store,
              quantity: 0,
              weight: 0,
              status: stock.status,
              updatedAt: stock.updatedAt
            }
          }
          acc[key].quantity += stock.availableQty || 0
          acc[key].weight += stock.weight || 0
          return acc
        }, {})

        const storeInventoryData = Object.values(storeItemGroups).map((group: any) => {
          const item = group.item
          const category = categoriesData.find((c: any) => c.id === item.categoryId) as any

          let status = "In Stock"
          if (group.quantity === 0) status = "Out of Stock"
          else if (group.quantity < (item.reorderLevelQty || 50)) status = "Low Stock"
          else if (group.quantity > (item.overstockLevelQty || 1000)) status = "Overstock"

          return {
            id: `${item.sku}-${group.storeId}`,
            itemId: item.id,
            storeId: group.storeId,
            name: item.name,
            barcode: item.barcode,
            category: category?.name || "Unknown",
            quantity: group.quantity,
            unit: item.unit || "box",
            storeName: group.store.name,
            storeCapacity: group.store.capacity,
            purchasePrice: item.costPrice || 0,
            sellingPrice: item.sellingPrice || 0,
            reorderLevel: item.reorderLevelQty || 0,
            status,
            weight: group.weight,
            lastUpdated: new Date(group.updatedAt)
          }
        })

        // Create separate lorry-wise inventory
        const lorryStockData = stockData.filter((stock: any) => stock.storeId === null && stock.lorryId !== null)
        const lorryItemGroups = lorryStockData.reduce((acc: any, stock: any) => {
          const key = `${stock.itemId}-${stock.lorryId}`
          if (!acc[key]) {
            acc[key] = {
              itemId: stock.itemId,
              lorryId: stock.lorryId,
              item: stock.Item,
              lorry: stock.Lorry,
              quantity: 0,
              weight: 0,
              status: stock.status,
              updatedAt: stock.updatedAt
            }
          }
          acc[key].quantity += stock.availableQty || 0
          acc[key].weight += stock.weight || 0
          return acc
        }, {})

        const lorryInventoryData = Object.values(lorryItemGroups).map((group: any) => {
          const item = group.item
          const category = categoriesData.find((c: any) => c.id === item.categoryId) as any

          let status = "In Transit"
          if (group.quantity === 0) status = "Empty"
          else if (group.quantity < (item.reorderLevelQty || 50)) status = "Low Stock"

          return {
            id: `${item.sku}-${group.lorryId}`,
            itemId: item.id,
            lorryId: group.lorryId,
            name: item.name,
            barcode: item.barcode,
            category: category?.name || "Unknown",
            quantity: group.quantity,
            unit: item.unit || "box",
            vehicleNumber: group.lorry.vehicleNumber,
            vehicleType: group.lorry.vehicleType,
            driverName: group.lorry.driverName,
            contactNumber: group.lorry.contactNumber,
            capacity: group.lorry.capacityKg,
            purchasePrice: item.costPrice || 0,
            sellingPrice: item.sellingPrice || 0,
            status,
            weight: group.weight,
            lastUpdated: new Date(group.updatedAt)
          }
        })

        setStoreInventory(storeInventoryData)
        setLorryInventory(lorryInventoryData)
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

  const getFilteredData = () => {
    let data = []
    switch (viewMode) {
      case "stores":
        data = storeInventory
        break
      case "lorries":
        data = lorryInventory
        break
      default:
        data = inventory
    }

    return data.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.storeName && item.storeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.vehicleNumber && item.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.driverName && item.driverName.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === "all" || item.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }

  const filteredInventory = getFilteredData()

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
      case "In Transit":
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">In Transit</Badge>
      case "Empty":
        return <Badge variant="secondary">Empty</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <ERPLayout>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {viewMode === "stores" ? "Store-wise Inventory" :
                viewMode === "lorries" ? "Lorry-wise Inventory" :
                  "Inventory Management"
              }
            </h1>
            <p className="text-muted-foreground">
              {viewMode === "stores" ? "View and manage inventory across different store locations" :
                viewMode === "lorries" ? "Track inventory currently loaded in vehicles for delivery" :
                  "Manage your fruit inventory and stock levels"
              }
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
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> :
                  viewMode === "stores" ? storeInventory.length :
                    viewMode === "lorries" ? lorryInventory.length :
                      inventory.length
                }
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                {viewMode === "stores" ? "Store stock records" :
                  viewMode === "lorries" ? "Lorry stock records" :
                    "Active inventory items"
                }
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
                  `LKR ${(viewMode === "stores" ? storeInventory :
                    viewMode === "lorries" ? lorryInventory :
                      inventory
                  ).reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0).toLocaleString()}`
                }
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                {viewMode === "stores" ? "Store inventory value" :
                  viewMode === "lorries" ? "Lorry inventory value" :
                    "Current inventory value"
                }
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
                  (viewMode === "stores" ? storeInventory :
                    viewMode === "lorries" ? lorryInventory :
                      inventory
                  ).filter(item =>
                    viewMode === "lorries" ?
                      (item.status === "Low Stock" || item.status === "Empty") :
                      (item.status === "Low Stock" || item.status === "Out of Stock")
                  ).length
                }
              </div>
              <p className="text-xs text-muted-foreground leading-tight">Need attention</p>
            </CardContent>
          </Card>

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">
                {viewMode === "stores" ? "Total Stores" :
                  viewMode === "lorries" ? "Total Lorries" :
                    "Total Locations"
                }
              </CardTitle>
              <Thermometer className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> :
                  viewMode === "stores" ? new Set(storeInventory.map(item => item.storeId)).size :
                    viewMode === "lorries" ? new Set(lorryInventory.map(item => item.lorryId)).size :
                      stores.length
                }
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                {viewMode === "stores" ? "With stock" :
                  viewMode === "lorries" ? "With stock" :
                    "Active stores"
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              {/* <CardTitle>Inventory Items</CardTitle> */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={viewMode} onValueChange={(value: "combined" | "stores" | "lorries") => setViewMode(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="View mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="combined">Combined View</SelectItem>
                    <SelectItem value="stores">Store Stock</SelectItem>
                    <SelectItem value="lorries">Lorry Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {viewMode === "lorries" ? (
                      <>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Low Stock">Low Stock</SelectItem>
                        <SelectItem value="Empty">Empty</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="In Stock">In Stock</SelectItem>
                        <SelectItem value="Low Stock">Low Stock</SelectItem>
                        <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                        <SelectItem value="Overstock">Overstock</SelectItem>
                      </>
                    )}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    {viewMode === "stores" && <TableHead>Store</TableHead>}
                    {viewMode === "lorries" && <TableHead>Vehicle</TableHead>}
                    {viewMode === "lorries" && <TableHead>Driver</TableHead>}
                    {viewMode === "combined" && <TableHead>Locations</TableHead>}
                    {viewMode !== "lorries" && <TableHead>Reorder Level</TableHead>}
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'No items found matching your search.' : 'No inventory items found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">{item.barcode}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          <span className={item.quantity < 50 ? "text-red-600 font-medium" : ""}>
                            {item.quantity} {item.unit}
                          </span>
                        </TableCell>
                        {/* Store-specific columns */}
                        {viewMode === "stores" && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-blue-500" />
                              <div>
                                <div className="font-medium">{item.storeName}</div>
                                <div className="text-xs text-muted-foreground">
                                  Capacity: {item.storeCapacity?.toLocaleString()} kg
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {/* Lorry-specific columns */}
                        {viewMode === "lorries" && (
                          <>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <svg className="h-3 w-3 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                                  <path d="M15 18H9" />
                                  <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
                                  <circle cx="17" cy="18" r="2" />
                                  <circle cx="7" cy="18" r="2" />
                                </svg>
                                <div>
                                  <div className="font-medium">{item.vehicleNumber}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {item.vehicleType} - {item.capacity} kg
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.driverName}</div>
                                <div className="text-xs text-muted-foreground">{item.contactNumber}</div>
                              </div>
                            </TableCell>
                          </>
                        )}

                        {/* Combined view location column */}
                        {viewMode === "combined" && (
                          <TableCell>
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
                        )}

                        {/* Reorder level - not applicable for lorries */}
                        {viewMode !== "lorries" && (
                          <TableCell>
                            <div className="text-sm">
                              <div className={item.quantity < (item.reorderLevel || 0) ? "text-red-600 font-medium" : ""}>
                                {item.quantity}/{item.reorderLevel || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">{item.unit}</div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">LKR {(item.quantity * item.purchasePrice).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">@ {item.purchasePrice}/unit</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
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
                              {viewMode !== "lorries" && (
                                <DropdownMenuItem onClick={() => {
                                  setTransferData({ ...transferData, itemId: item.itemId.toString() })
                                  setShowStockTransfer(true)
                                }}>
                                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                                  Transfer Stock
                                </DropdownMenuItem>
                              )}
                              {/* <DropdownMenuItem>Edit Item</DropdownMenuItem> */}
                              {/* <DropdownMenuItem>Update Stock</DropdownMenuItem> */}
                              {/* <DropdownMenuItem>
                          <MapPin className="h-4 w-4 mr-2" />
                          Move Location
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Delete Item</DropdownMenuItem> */}
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
              <DialogTitle>Stock Details - {selectedItem?.name}</DialogTitle>
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

                    {/* Lorry Stock */}
                    {selectedItem.lorries && selectedItem.lorries.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                            <path d="M15 18H9" />
                            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
                            <circle cx="17" cy="18" r="2" />
                            <circle cx="7" cy="18" r="2" />
                          </svg>
                          Lorry Stock
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Vehicle</TableHead>
                              <TableHead>Driver</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Weight</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedItem.lorries.map((lorry: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{lorry.lorryNumber}</TableCell>
                                <TableCell>{lorry.driverName}</TableCell>
                                <TableCell>{lorry.quantity} {selectedItem.unit}</TableCell>
                                <TableCell>{lorry.weight} kg</TableCell>
                                <TableCell>
                                  <Badge variant={lorry.status === 'Active' ? 'default' : 'secondary'}>
                                    {lorry.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Fallback if no detailed stock info */}
                    {(!selectedItem.stores || selectedItem.stores.length === 0) &&
                      (!selectedItem.lorries || selectedItem.lorries.length === 0) && (
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
                <div className="grid grid-cols-4 gap-4 pt-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">
                        {selectedItem.quantity}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Quantity ({selectedItem.unit})</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">
                        {selectedItem.weight?.toFixed(1) || 0} kg
                      </div>
                      <p className="text-sm text-muted-foreground">Total Weight</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">
                        {((selectedItem.stores?.length || 0) + (selectedItem.lorries?.length || 0))}
                      </div>
                      <p className="text-sm text-muted-foreground">Locations</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">
                        LKR {(selectedItem.quantity * selectedItem.purchasePrice).toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Value</p>
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
