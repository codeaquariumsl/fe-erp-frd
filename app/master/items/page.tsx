"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import toastr from "@/lib/toastr"
import { itemsApi, categoriesApi, type Item, type Category, type PaginatedResponse, type PaginationMeta } from "@/lib/api"
import { Plus, Search, Edit, Trash2, Package, TrendingUp, AlertTriangle, DollarSign, MoreHorizontal, Eye, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import ItemsLoading from "./loading"

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [totalItemsCount, setTotalItemsCount] = useState(0)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [viewItem, setViewItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    categoryId: "",
    unit: "",
    sellingPrice: "0",
    reorderLevelQty: "0",
    itemsPerBox: "1",
    leadTimeDays: "0",
    image: "",
    doNotAllowDirectSale: false,
    allowsMinus: false,
    isProductionRawMaterial: false,
    isTaxInclusive: false,
  })

  const [validationErrors, setValidationErrors] = useState<{
    name?: string
    barcode?: string
  }>({})

  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchItems()
    fetchCategories()
  }, [currentPage, itemsPerPage])

  // Real-time validation functions
  const validateItemName = (name: string, excludeItemId?: number) => {
    if (!name.trim()) return ""

    const existingItem = items.find(item =>
      item.id !== excludeItemId &&
      item.name.toLowerCase().trim() === name.toLowerCase().trim()
    )

    return existingItem ? `Item name "${name}" already exists.` : ""
  }

  const validateBarcode = (barcode: string, excludeItemId?: number) => {
    if (!barcode.trim()) return ""

    const existingItem = items.find(item =>
      item.id !== excludeItemId &&
      (item as any).barcode &&
      (item as any).barcode.toLowerCase().trim() === barcode.toLowerCase().trim()
    )

    return existingItem ? `Barcode "${barcode}" already exists.` : ""
  }

  // Handle form data changes with real-time validation
  const handleFormDataChange = (field: string, value: string | boolean) => {
    const newFormData = { ...formData, [field]: value }
    setFormData(newFormData)

    // Real-time validation
    const errors = { ...validationErrors }

    if (field === 'name' && typeof value === 'string') {
      const nameError = validateItemName(value, selectedItem?.id)
      if (nameError) {
        errors.name = nameError
      } else {
        delete errors.name
      }
    }

    if (field === 'barcode' && typeof value === 'string') {
      const barcodeError = validateBarcode(value, selectedItem?.id)
      if (barcodeError) {
        errors.barcode = barcodeError
      } else {
        delete errors.barcode
      }
    }

    setValidationErrors(errors)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault()
        document.getElementById('search-input')?.focus()
      }
      if (event.ctrlKey && event.key === 'r') {
        event.preventDefault()
        setSearchTerm("")
        setCategoryFilter("all")
        setStatusFilter("all")
        setStockFilter("all")
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchItems = async () => {
    try {
      const data = await itemsApi.getAll(currentPage, itemsPerPage)
      
      // Check if response has pagination structure
      if (data && typeof data === 'object' && 'pagination' in data) {
        const paginatedData = data as PaginatedResponse<Item>
        setItems(paginatedData.data)
        setPagination(paginatedData.pagination)
        setTotalItemsCount(paginatedData.pagination.total)
      } else {
        // Fallback for non-paginated responses
        const itemsArray = Array.isArray(data) ? data : (data as any)?.data || []
        setItems(itemsArray)
        setTotalItemsCount(itemsArray.length)
        setPagination(null)
      }
    } catch (error) {
      toastr.error("Failed to fetch items")
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await categoriesApi.getAll<Category>()
      setCategories(data)
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  const handleCreate = async () => {
    // Validate mandatory fields
    const errors = []
    if (!formData.name.trim()) {
      errors.push("Name is required.")
    }
    // if (!formData.barcode.trim()) {
    //   errors.push("Barcode is required.")
    // }
    if (formData.categoryId === "") {
      errors.push("Category is required.")
    }
    if (!formData.sellingPrice.trim() || Number.parseFloat(formData.sellingPrice) <= 0) {
      errors.push("Valid selling price is required.")
    }
    if (!formData.reorderLevelQty.trim() || Number.parseInt(formData.reorderLevelQty) < 0) {
      errors.push("Valid reorder level quantity is required.")
    }
    if (!formData.itemsPerBox.trim() || Number.parseInt(formData.itemsPerBox) <= 0) {
      errors.push("Valid number of items per box is required (must be greater than 0).")
    }
    if (!formData.leadTimeDays.trim() || Number.parseInt(formData.leadTimeDays) < 0) {
      errors.push("Valid lead time is required (must be 0 or greater).")
    }

    // Validate uniqueness
    const existingItemWithName = items.find(item =>
      item.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
    )
    if (existingItemWithName) {
      errors.push(`Item name "${formData.name}" already exists.`)
    }

    if (formData.barcode.trim()) {
      const existingItemWithBarcode = items.find(item =>
        (item as any).barcode &&
        (item as any).barcode.toLowerCase().trim() === formData.barcode.toLowerCase().trim()
      )
      if (existingItemWithBarcode) {
        errors.push(`Barcode "${formData.barcode}" already exists.`)
      }
    }

    if (errors.length > 0) {
      toastr.error(`Please fix the following errors:\n${errors.join('\n')}`)
      return
    }

    setIsCreating(true)
    try {
      const payload = {
        ...formData,
        categoryId: Number.parseInt(formData.categoryId),
        sellingPrice: Number.parseFloat(formData.sellingPrice),
        reorderLevelQty: Number.parseInt(formData.reorderLevelQty),
        itemsPerBox: Number.parseInt(formData.itemsPerBox),
        leadTimeDays: Number.parseInt(formData.leadTimeDays),
      }

      await itemsApi.create(payload)
      toastr.success("Item created successfully")
      setIsCreateDialogOpen(false)
      resetForm()
      fetchItems()
    } catch (error) {
      toastr.error("Failed to create item")
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedItem) return

    // Validate mandatory fields
    const errors = []
    if (!formData.name.trim()) {
      errors.push("Name is required")
    }
    // if (!formData.barcode.trim()) {
    //   errors.push("Barcode is required")
    // }
    if (!formData.sellingPrice.trim() || Number.parseFloat(formData.sellingPrice) <= 0) {
      errors.push("Valid selling price is required")
    }
    if (!formData.reorderLevelQty.trim() || Number.parseInt(formData.reorderLevelQty) < 0) {
      errors.push("Valid reorder level quantity is required")
    }
    if (!formData.itemsPerBox.trim() || Number.parseInt(formData.itemsPerBox) <= 0) {
      errors.push("Valid number of items per box is required (must be greater than 0)")
    }
    if (!formData.leadTimeDays.trim() || Number.parseInt(formData.leadTimeDays) < 0) {
      errors.push("Valid lead time is required (must be 0 or greater)")
    }

    // Validate uniqueness (excluding the current item being edited)
    const existingItemWithName = items.find(item =>
      item.id !== selectedItem.id &&
      item.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
    )
    if (existingItemWithName) {
      errors.push(`Item name "${formData.name}" already exists.`)
    }

    if (formData.barcode.trim()) {
      const existingItemWithBarcode = items.find(item =>
        item.id !== selectedItem.id &&
        (item as any).barcode &&
        (item as any).barcode.toLowerCase().trim() === formData.barcode.toLowerCase().trim()
      )
      if (existingItemWithBarcode) {
        errors.push(`Barcode "${formData.barcode}" already exists.`)
      }
    }

    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fix the following errors:\n${errors.join('\n')}`,
        variant: "destructive",
      })
      return
    }

    try {
      const payload = {
        ...formData,
        categoryId: Number.parseInt(formData.categoryId),
        sellingPrice: Number.parseFloat(formData.sellingPrice),
        reorderLevelQty: Number.parseInt(formData.reorderLevelQty),
        itemsPerBox: Number.parseInt(formData.itemsPerBox),
        leadTimeDays: Number.parseInt(formData.leadTimeDays),
      }

      await itemsApi.update(selectedItem.id, payload)
      toast({
        title: "Success",
        description: "Item updated successfully",
      })
      setIsEditDialogOpen(false)
      resetForm()
      fetchItems()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await itemsApi.remove(id)
      toast({
        title: "Success",
        description: "Item deleted successfully",
      })
      fetchItems()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      barcode: "",
      categoryId: "",
      unit: "",
      sellingPrice: "0",
      reorderLevelQty: "0",
      itemsPerBox: "1",
      leadTimeDays: "0",
      image: "",
      doNotAllowDirectSale: false,
      allowsMinus: false,
      isProductionRawMaterial: false,
      isTaxInclusive: false,
    })
    setValidationErrors({})
    setSelectedItem(null)
    setIsCreating(false)
  }

  const openEditDialog = (item: Item) => {
    setSelectedItem(item)
    setValidationErrors({}) // Clear validation errors when opening edit dialog
    setFormData({
      name: item.name,
      barcode: (item as any).barcode || "",
      categoryId: item.categoryId.toString(),
      unit: item.unit,
      sellingPrice: item.sellingPrice.toString(),
      reorderLevelQty: item.reorderLevelQty.toString(),
      itemsPerBox: (item as any).itemsPerBox?.toString() || "1",
      leadTimeDays: (item as any).leadTimeDays?.toString() || "0",
      image: (item as any).image || "",
      doNotAllowDirectSale: (item as any).doNotAllowDirectSale || false,
      allowsMinus: (item as any).allowsMinus || false,
      isProductionRawMaterial: (item as any).isProductionRawMaterial || false,
      isTaxInclusive: (item as any).isTaxInclusive || false,
    })
    setIsEditDialogOpen(true)
  }

  const handleViewItem = (item: Item) => {
    setViewItem(item)
    setIsViewDialogOpen(true)
  }

  const handleEditItem = (item: Item) => {
    openEditDialog(item)
  }

  const handleDeleteItem = (id: number) => {
    handleDelete(id)
  }

  const getStockStatus = (item: Item) => {
    const availability = (item as any).availability
    if (!availability) {
      return { status: "No Data", variant: "secondary" as const }
    }

    const totalQty = availability.totalAvailableQuantity || 0

    if (!availability.hasStock || totalQty === 0) {
      return { status: "Out of Stock", variant: "destructive" as const }
    }

    if (totalQty <= item.reorderLevelQty) {
      return { status: "Low", variant: "destructive" as const }
    } else if (item.overstockLevelQty && totalQty >= item.overstockLevelQty) {
      return { status: "Overstock", variant: "secondary" as const }
    }
    return { status: "Normal", variant: "default" as const }
  }

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || "Unknown"
  }

  const getCategoryCode = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.code || "Unknown"
  }

  const filteredItems = items.filter((item) => {
    // Text search filter
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((item as any).barcode && (item as any).barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      getCategoryName(item.categoryId).toLowerCase().includes(searchTerm.toLowerCase())

    // Category filter
    const matchesCategory = categoryFilter === "all" || item.categoryId.toString() === categoryFilter

    // Status filter
    const matchesStatus = statusFilter === "all" || item.status === statusFilter

    // Stock filter
    const availability = (item as any).availability
    const totalQty = availability?.totalAvailableQuantity || 0
    const matchesStock = stockFilter === "all" ||
      (stockFilter === "low" && totalQty <= item.reorderLevelQty) ||
      (stockFilter === "overstock" && item.overstockLevelQty && totalQty >= item.overstockLevelQty) ||
      (stockFilter === "normal" && totalQty > item.reorderLevelQty && (!item.overstockLevelQty || totalQty < item.overstockLevelQty))

    return matchesSearch && matchesCategory && matchesStatus && matchesStock
  })

  // Analytics calculations
  const totalItems = items.length
  const filteredTotalItems = filteredItems.length
  const activeItems = items.filter((item) => item.status === "active").length
  const filteredActiveItems = filteredItems.filter((item) => item.status === "active").length
  const lowStockItems = items.filter((item) => {
    const availability = (item as any).availability
    const totalQty = availability?.totalAvailableQuantity || 0
    return totalQty <= item.reorderLevelQty
  }).length
  const filteredLowStockItems = filteredItems.filter((item) => {
    const availability = (item as any).availability
    const totalQty = availability?.totalAvailableQuantity || 0
    return totalQty <= item.reorderLevelQty
  }).length
  const totalValue = items.reduce((sum, item) => {
    const availability = (item as any).availability
    const totalQty = availability?.totalAvailableQuantity || 0
    return sum + totalQty * item.sellingPrice
  }, 0)
  const filteredTotalValue = filteredItems.reduce((sum, item) => {
    const availability = (item as any).availability
    const totalQty = availability?.totalAvailableQuantity || 0
    return sum + totalQty * item.sellingPrice
  }, 0)



  // Count active filters
  const activeFiltersCount = [
    searchTerm !== "",
    categoryFilter !== "all",
    statusFilter !== "all",
    stockFilter !== "all"
  ].filter(Boolean).length

  if (loading) {
    return <ItemsLoading />;
  }

  return (
    <ERPLayout>
      <div className="flex-1 space-y-2 p-1">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold">Items Management</h2>
            <p className="text-sm text-muted-foreground">Manage your inventory items</p>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg">Create New Item</DialogTitle>
                  <DialogDescription className="text-sm">Add a new item to your inventory.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label htmlFor="name" className="text-xs">Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleFormDataChange('name', e.target.value)}
                        placeholder="Item name"
                        className={`h-8 ${validationErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                      />
                      {validationErrors.name && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.name}</p>
                      )}
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="barcode" className="text-xs">Barcode</Label>
                      <Input
                        id="barcode"
                        value={formData.barcode}
                        onChange={(e) => handleFormDataChange('barcode', e.target.value)}
                        placeholder="Item barcode"
                        className={`h-8 ${validationErrors.barcode ? 'border-red-500 focus:border-red-500' : ''}`}
                      />
                      {validationErrors.barcode && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.barcode}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label htmlFor="categoryId" className="text-xs">Category <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.categoryId}
                        onValueChange={(value) => handleFormDataChange('categoryId', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="unit" className="text-xs">Unit <span className="text-red-500">*</span></Label>
                      <Select value={formData.unit} onValueChange={(value) => handleFormDataChange('unit', value)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pcs">Pieces</SelectItem>
                          <SelectItem value="kg">Kilograms</SelectItem>
                          <SelectItem value="box">Box</SelectItem>
                          <SelectItem value="lbs">Pounds</SelectItem>
                          <SelectItem value="liters">Liters</SelectItem>
                          <SelectItem value="grams">Grams</SelectItem>
                          <SelectItem value="dozen">Dozen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label htmlFor="sellingPrice" className="text-xs">Selling Price <span className="text-red-500">*</span></Label>
                      <Input
                        id="sellingPrice"
                        type="number"
                        step="0.01"
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                        placeholder="Selling price"
                        className="h-8"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="reorderLevelQty" className="text-xs">Reorder Level Qty <span className="text-red-500">*</span></Label>
                      <Input
                        id="reorderLevelQty"
                        type="number"
                        value={formData.reorderLevelQty}
                        onChange={(e) => setFormData({ ...formData, reorderLevelQty: e.target.value })}
                        placeholder="Reorder level quantity"
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label htmlFor="itemsPerBox" className="text-xs">Items per Box</Label>
                      <Input
                        id="itemsPerBox"
                        type="number"
                        min="1"
                        value={formData.itemsPerBox}
                        onChange={(e) => setFormData({ ...formData, itemsPerBox: e.target.value })}
                        placeholder="Items per box"
                        className="h-8"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="leadTimeDays" className="text-xs">Lead Time (Days)</Label>
                      <Input
                        id="leadTimeDays"
                        type="number"
                        min="0"
                        value={formData.leadTimeDays}
                        onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                        placeholder="Lead time in days"
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="image" className="text-xs">Image URL</Label>
                    <Input
                      id="image"
                      type="url"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="Image URL (optional)"
                      className="h-8"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="doNotAllowDirectSale"
                        checked={formData.doNotAllowDirectSale}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, doNotAllowDirectSale: checked as boolean })
                        }
                      />
                      <Label htmlFor="doNotAllowDirectSale" className="text-sm">Do not allow direct sale</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allowsMinus"
                        checked={formData.allowsMinus}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, allowsMinus: checked as boolean })
                        }
                      />
                      <Label htmlFor="allowsMinus" className="text-sm">Allows Minus</Label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isProductionRawMaterial"
                        checked={formData.isProductionRawMaterial}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isProductionRawMaterial: checked as boolean })
                        }
                      />
                      <Label htmlFor="isProductionRawMaterial" className="text-sm">Is Production Raw Material</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isTaxInclusive"
                        checked={formData.isTaxInclusive}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isTaxInclusive: checked as boolean })
                        }
                      />
                      <Label htmlFor="isTaxInclusive" className="text-sm">Is Tax Inclusive</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={handleCreate}
                    size="sm"
                    disabled={Object.keys(validationErrors).length > 0 || isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Item
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex flex-row items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Items</p>
                <div className="text-xl font-bold">
                  {pagination?.total ? pagination.total : (activeFiltersCount > 0 ? filteredTotalItems : totalItems)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active
                  {/* {pagination?.total ? `${pagination.total} total` : (activeFiltersCount > 0 ? `${filteredActiveItems} active` : `${activeItems} active`)} */}
                </p>
              </div>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex flex-row items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Low Stock</p>
                <div className="text-xl font-bold">
                  {activeFiltersCount > 0 ? filteredLowStockItems : lowStockItems}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeFiltersCount > 0 ? `Filtered` : "Need reorder"}
                </p>
              </div>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex flex-row items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Value</p>
                <div className="text-xl font-bold">
                  {activeFiltersCount > 0 ? filteredTotalValue.toLocaleString() : totalValue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeFiltersCount > 0 ? "Filtered" : "Selling price"}
                </p>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex flex-row items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Categories</p>
                <div className="text-xl font-bold">{categories.length}</div>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col space-y-2">
              {/* Filter Options */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-input"
                    placeholder="Search items... (Ctrl+K)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm h-8"
                  />
                </div>

                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36 h-8">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                {/* <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select> */}

                {/* Stock Filter */}
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="All Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="overstock">Overstock</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setCategoryFilter("all")
                    setStatusFilter("all")
                    setStockFilter("all")
                  }}
                  className="whitespace-nowrap h-8"
                  title="Clear all filters (Ctrl+R)"
                >
                  Clear Filters
                </Button>
              </div>

            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2 text-xs">Name</TableHead>
                  <TableHead className="py-2 text-xs">Barcode</TableHead>
                  <TableHead className="py-2 text-xs">Category</TableHead>
                  <TableHead className="py-2 text-xs">Unit</TableHead>
                  {/* <TableHead className="py-2 text-xs">Items/Box</TableHead> */}
                  <TableHead className="py-2 text-xs">Lead Time</TableHead>
                  <TableHead className="py-2 text-xs">Selling Price</TableHead>
                  <TableHead className="py-2 text-xs w-32">Stock Status</TableHead>
                  <TableHead className="py-2 text-xs">Flags</TableHead>
                  <TableHead className="py-2 text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const stockStatus = getStockStatus(item)
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="py-2">
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="font-mono text-xs">{(item as any).barcode || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div>
                          <div className="font-medium text-sm"> {getCategoryName(item.categoryId)}</div>
                          <div className="text-xs text-muted-foreground"> {getCategoryCode(item.categoryId)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-xs">{item.unit}</Badge>
                      </TableCell>
                      {/* <TableCell className="py-2">
                        <div className="text-center text-sm">{(item as any).itemsPerBox || 'N/A'}</div>
                      </TableCell> */}
                      <TableCell className="py-2">
                        <div className="text-center text-sm">
                          {(item as any).leadTimeDays ? `${(item as any).leadTimeDays}d` : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="font-medium text-sm">{item.sellingPrice.toFixed(2)}</div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant={stockStatus.variant} className="text-xs">{stockStatus.status}</Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex gap-1 flex-wrap">
                          {(item as any).doNotAllowDirectSale && (
                            <Badge variant="destructive" className="text-xs">No Sale</Badge>
                          )}
                          {(item as any).allowsMinus && (
                            <Badge variant="secondary" className="text-xs">Minus</Badge>
                          )}
                          {(item as any).isProductionRawMaterial && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Raw</Badge>
                          )}
                          {(item as any).isTaxInclusive && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Tax Inclusive</Badge>
                          )}
                        </div>
                      </TableCell>
                      {/* <TableCell>
                      <Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge>
                    </TableCell> */}
                      <TableCell className="py-2">
                        <div className="flex items-center space-x-1">
                          <Button variant="outline" size="sm" onClick={() => handleViewItem(item)} className="h-7 w-7 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>

                          <Button variant="outline" size="sm" onClick={() => handleEditItem(item)} className="h-7 w-7 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the Item.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {pagination && (
              <div className="flex flex-col space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Items per page:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!pagination.hasPrevPage || loading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                      disabled={!pagination.hasNextPage || loading}
                    >
                      Next
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Total: {pagination.total} items
                  </div>
                </div>
              </div>
            )}

            {/* Active Filters Summary */}
            {activeFiltersCount > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    Search: "{searchTerm}"
                  </Badge>
                )}
                {categoryFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Category: {categories.find(c => c.id.toString() === categoryFilter)?.name}
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {statusFilter}
                  </Badge>
                )}
                {stockFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Stock: {stockFilter}
                  </Badge>
                )}

                <Badge variant="outline" className="text-xs">
                  {filteredTotalItems} of {totalItems} items
                </Badge>
              </div>
            ) :
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {totalItems} items
              </Badge>
            }
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>Update item information.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => handleFormDataChange('name', e.target.value)}
                    placeholder="Item name"
                    className={validationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.name && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.name}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-barcode">Barcode</Label>
                  <Input
                    id="edit-barcode"
                    value={formData.barcode}
                    onChange={(e) => handleFormDataChange('barcode', e.target.value)}
                    placeholder="Item barcode"
                    className={validationErrors.barcode ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.barcode && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.barcode}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-categoryId">Category <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-unit">Unit <span className="text-red-500">*</span></Label>
                  <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="lbs">Pounds</SelectItem>
                      <SelectItem value="liters">Liters</SelectItem>
                      <SelectItem value="grams">Grams</SelectItem>
                      <SelectItem value="dozen">Dozen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-sellingPrice">Selling Price <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-sellingPrice"
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="Selling price"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-reorderLevelQty">Reorder Level Quantity <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-reorderLevelQty"
                    type="number"
                    value={formData.reorderLevelQty}
                    onChange={(e) => setFormData({ ...formData, reorderLevelQty: e.target.value })}
                    placeholder="Reorder level quantity"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-itemsPerBox">No of Items per Box</Label>
                  <Input
                    id="edit-itemsPerBox"
                    type="number"
                    min="1"
                    value={formData.itemsPerBox}
                    onChange={(e) => setFormData({ ...formData, itemsPerBox: e.target.value })}
                    placeholder="Number of items per box"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-leadTimeDays">Lead Time (Days)</Label>
                  <Input
                    id="edit-leadTimeDays"
                    type="number"
                    min="0"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                    placeholder="Lead time in days"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-image">Image URL</Label>
                <Input
                  id="edit-image"
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="Image URL (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-doNotAllowDirectSale"
                    checked={formData.doNotAllowDirectSale}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, doNotAllowDirectSale: checked as boolean })
                    }
                  />
                  <Label htmlFor="edit-doNotAllowDirectSale">Do not allow direct sale</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-allowsMinus"
                    checked={formData.allowsMinus}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, allowsMinus: checked as boolean })
                    }
                  />
                  <Label htmlFor="edit-allowsMinus">Allows Minus</Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-isProductionRawMaterial"
                    checked={formData.isProductionRawMaterial}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isProductionRawMaterial: checked as boolean })
                    }
                  />
                  <Label htmlFor="edit-isProductionRawMaterial">Is Production Raw Material</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-isTaxInclusive"
                    checked={formData.isTaxInclusive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isTaxInclusive: checked as boolean })
                    }
                  />
                  <Label htmlFor="edit-isTaxInclusive">Is Tax Inclusive</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={handleEdit}
                disabled={Object.keys(validationErrors).length > 0}
              >
                Update Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Item Details</DialogTitle>
            </DialogHeader>
            {viewItem && (
              <div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Basic Information */}
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-muted-foreground">{viewItem.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Barcode</Label>
                    <p className="text-sm text-muted-foreground font-mono">{(viewItem as any).barcode || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">SKU</Label>
                    <p className="text-sm text-muted-foreground">{viewItem.sku}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <p className="text-sm text-muted-foreground">{getCategoryName(viewItem.categoryId)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Unit</Label>
                    <p className="text-sm text-muted-foreground">{viewItem.unit}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Selling Price</Label>
                    <p className="text-sm text-muted-foreground">{viewItem.sellingPrice.toFixed(2)}</p>
                  </div>

                  <hr className="col-span-3 border-gray-200 dark:border-gray-700" />

                  {/* Stock Information */}
                  <div>
                    <Label className="text-sm font-medium">Current Stock</Label>
                    <p className="text-sm text-muted-foreground">{(viewItem as any).availability?.totalAvailableQuantity || 0} {viewItem.unit}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Reorder Level</Label>
                    <p className="text-sm text-muted-foreground">{viewItem.reorderLevelQty} {viewItem.unit}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Stock Status</Label><br />
                    {(() => {
                      const stockStatus = getStockStatus(viewItem)
                      return <Badge variant={stockStatus.variant} className="text-xs">{stockStatus.status}</Badge>
                    })()}
                  </div>

                  <hr className="col-span-3 border-gray-200 dark:border-gray-700" />

                  {/* Availability Details */}
                  <div>
                    <Label className="text-sm font-medium">Total Weight</Label>
                    <p className="text-sm text-muted-foreground">{(viewItem as any).availability?.totalWeight || 0} {viewItem.unit}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Stock Records</Label>
                    <p className="text-sm text-muted-foreground">{(viewItem as any).availability?.totalStockRecords || 0}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Negative Stock</Label><br />
                    <Badge variant={(viewItem as any).availability?.allowsNegativeStock ? "default" : "secondary"} className="text-xs">
                      {(viewItem as any).availability?.allowsNegativeStock ? "Allowed" : "Not Allowed"}
                    </Badge>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <Label className="text-sm font-medium">Items per Box</Label>
                    <p className="text-sm text-muted-foreground">
                      {(viewItem as any).itemsPerBox || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Lead Time</Label>
                    <p className="text-sm text-muted-foreground">
                      {(viewItem as any).leadTimeDays ? `${(viewItem as any).leadTimeDays} days` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Image</Label>
                    <div className="text-sm text-muted-foreground">
                      {(viewItem as any).image ? (
                        <div className="space-y-2">
                          <img
                            src={(viewItem as any).image}
                            alt={viewItem.name}
                            className="w-20 h-20 object-cover rounded border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                          {/* <p className="text-xs break-all">{(viewItem as any).image}</p> */}
                        </div>
                      ) : (
                        'No image'
                      )}
                    </div>
                  </div>
                </div>
                <hr className="my-4 border-gray-200 dark:border-gray-700" />
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Direct Sale</Label><br />
                    <Badge variant={(viewItem as any).doNotAllowDirectSale ? "destructive" : "default"} className="text-xs">
                      {(viewItem as any).doNotAllowDirectSale ? "Not Allowed" : "Allowed"}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Minus Stock</Label><br />
                    <Badge variant={(viewItem as any).allowsMinus ? "default" : "secondary"} className="text-xs">
                      {(viewItem as any).allowsMinus ? "Allowed" : "Not Allowed"}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Production Raw Material</Label><br />
                    <Badge variant={(viewItem as any).isProductionRawMaterial ? "outline" : "secondary"}
                      className={`text-xs ${(viewItem as any).isProductionRawMaterial ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}>
                      {(viewItem as any).isProductionRawMaterial ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Tax Inclusive</Label><br />
                    <Badge variant={(viewItem as any).isTaxInclusive ? "outline" : "secondary"}
                      className={`text-xs ${(viewItem as any).isTaxInclusive ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}>
                      {(viewItem as any).isTaxInclusive ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div >
    </ERPLayout>
  )
}
