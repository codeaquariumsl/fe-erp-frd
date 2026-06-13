"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { usePagination } from "@/hooks/use-pagination"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ERPLayout } from "@/components/layouts/erp-layout"
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
import { Switch } from "@/components/ui/switch"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  batchesApi,
  grnApi,
  storesApi,
  locationsApi,
  itemsApi,
  type Batch,
  type Store,
  type Location,
  type Item,
  type GRN,
} from "@/lib/api"
import { Plus, Search, Edit, Trash2, Eye, CalendarIcon, Package, Clock, AlertTriangle, MoreHorizontal, FileBarChart, Layers } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BatchItemsManagement } from "@/components/batches/batch-items-management"
import { getBatchExpiryStatus, calculateBatchSummary, validateBatchData, generateBatchNumber as generateBatchNum } from "@/lib/batch-utils"

export default function BatchesPage() {
  const router = useRouter()

  // State management
  const [batches, setBatches] = useState<Batch[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [grns, setGrns] = useState<GRN[]>([])
  const [loading, setLoading] = useState(true)

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [storeFilter, setStoreFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expiryFilter, setExpiryFilter] = useState<string>("all")

  // Modal state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showBatchItemsDialog, setShowBatchItemsDialog] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [selectedGrnItems, setSelectedGrnItems] = useState<any[]>([])
  const [loadingGrnItems, setLoadingGrnItems] = useState(false)
  const [viewBatchItems, setViewBatchItems] = useState<any[]>([])

  // Form state
  const [batchForm, setBatchForm] = useState({
    batchNumber: "",
    batchDate: new Date(),
    expireDate: new Date(),
    reference: "",
    grnId: "",
    locationId: "",
    storeId: "",
    isActive: true,
  })



  // Filter batches based on search and filters
  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchesSearch = searchTerm === "" ||
        batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.GRN?.grnNumber.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStore = storeFilter === "all" || batch.storeId.toString() === storeFilter
      const matchesLocation = locationFilter === "all" || batch.locationId.toString() === locationFilter
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && batch.isActive) ||
        (statusFilter === "inactive" && !batch.isActive)

      const matchesExpiry = expiryFilter === "all" || (() => {
        const today = new Date()
        const expireDate = new Date(batch.expireDate)
        const daysDiff = Math.ceil((expireDate.getTime() - today.getTime()) / (1000 * 3600 * 24))

        switch (expiryFilter) {
          case "expired":
            return daysDiff < 0
          case "expiring_soon":
            return daysDiff >= 0 && daysDiff <= 30
          case "valid":
            return daysDiff > 30
          default:
            return true
        }
      })()

      return matchesSearch && matchesStore && matchesLocation && matchesStatus && matchesExpiry
    })
  }, [batches, searchTerm, storeFilter, locationFilter, statusFilter, expiryFilter])

  // Pagination
  const {
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedData: paginatedBatches,
    handlePageChange,
    handleItemsPerPageChange,
    paginationProps,
  } = usePagination({
    data: filteredBatches,
    initialItemsPerPage: 10,
  })

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [batchesResponse, storesResponse, locationsResponse, itemsResponse, grnsResponse] = await Promise.all([
          batchesApi.getAll({ page: 1, limit: 1000 }),
          storesApi.getAll<Store>(),
          locationsApi.getAll<Location>(),
          itemsApi.getAll<Item>(),
          grnApi.getAll(),
        ])

        setBatches(batchesResponse.batches || [])
        setStores(storesResponse || [])
        setLocations(locationsResponse || [])
        setItems(itemsResponse || [])
        setGrns(grnsResponse || [])
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "Failed to load batch data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate summary statistics
  const batchSummary = useMemo(() => {
    return calculateBatchSummary(batches)
  }, [batches])

  const resetBatchForm = () => {
    setBatchForm({
      batchNumber: "",
      batchDate: new Date(),
      expireDate: new Date(),
      reference: "",
      grnId: "",
      locationId: "",
      storeId: "",
      isActive: true,
    })
    setSelectedGrnItems([])
  }

  // Load GRN items when GRN is selected
  const handleGrnSelect = async (grnId: string) => {
    setBatchForm({ ...batchForm, grnId })

    if (!grnId) {
      setSelectedGrnItems([])
      return
    }

    setLoadingGrnItems(true)
    try {
      const grn = await grnApi.getById(grnId)
      setSelectedGrnItems(grn.items || [])
    } catch (error) {
      console.error("Error loading GRN items:", error)
      toast({
        title: "Error",
        description: "Failed to load GRN items",
        variant: "destructive",
      })
      setSelectedGrnItems([])
    } finally {
      setLoadingGrnItems(false)
    }
  }



  // CRUD operations
  const handleCreateBatch = async () => {
    try {
      const formData = {
        batchNumber: batchForm.batchNumber,
        batchDate: batchForm.batchDate,
        expireDate: batchForm.expireDate,
        grnId: parseInt(batchForm.grnId),
        locationId: parseInt(batchForm.locationId),
        storeId: parseInt(batchForm.storeId),
      }

      // Validate batch data
      const validation = validateBatchData(formData)
      if (!validation.isValid) {
        toast({
          title: "Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive",
        })
        return
      }

      let batchNumber = batchForm.batchNumber
      if (!batchNumber) {
        try {
          const generated = await batchesApi.generateBatchNumber({ grnId: parseInt(batchForm.grnId) })
          batchNumber = generated.batchNumber
        } catch (error) {
          // Fallback to local generation if API fails
          const selectedGrn = grns.find(g => g.id === parseInt(batchForm.grnId))
          batchNumber = generateBatchNum(
            parseInt(batchForm.grnId),
            selectedGrn?.grnNumber,
            batchForm.batchDate
          )
        }
      }

      const payload = {
        batchNumber,
        batchDate: format(batchForm.batchDate, "yyyy-MM-dd"),
        expireDate: format(batchForm.expireDate, "yyyy-MM-dd"),
        reference: batchForm.reference,
        grnId: parseInt(batchForm.grnId),
        locationId: parseInt(batchForm.locationId),
        storeId: parseInt(batchForm.storeId),
        isActive: batchForm.isActive,
        items: selectedGrnItems.map(item => ({
          itemId: item.itemId,
          batchQuantity: item.grnQty || 0,
          availableQuantity: item.availableQty || 0,
        })),
      }

      await batchesApi.create(payload)

      toast({
        title: "Success",
        description: "Batch created successfully",
      })

      setShowCreateDialog(false)
      resetBatchForm()

      // Reload batches
      const batchesResponse = await batchesApi.getAll({ page: 1, limit: 1000 })
      setBatches(batchesResponse.batches || [])

    } catch (error) {
      console.error("Error creating batch:", error)
      toast({
        title: "Error",
        description: "Failed to create batch",
        variant: "destructive",
      })
    }
  }

  const handleUpdateBatch = async () => {
    if (!selectedBatch) return

    try {
      const payload = {
        expireDate: format(batchForm.expireDate, "yyyy-MM-dd"),
        reference: batchForm.reference,
        isActive: batchForm.isActive,
      }

      await batchesApi.update(selectedBatch.id!, payload)

      toast({
        title: "Success",
        description: "Batch updated successfully",
      })

      setShowEditDialog(false)
      setSelectedBatch(null)
      resetBatchForm()

      // Reload batches
      const batchesResponse = await batchesApi.getAll({ page: 1, limit: 1000 })
      setBatches(batchesResponse.batches || [])

    } catch (error) {
      console.error("Error updating batch:", error)
      toast({
        title: "Error",
        description: "Failed to update batch",
        variant: "destructive",
      })
    }
  }

  const handleDeleteBatch = async (batch: Batch) => {
    try {
      await batchesApi.remove(batch.id!)

      toast({
        title: "Success",
        description: "Batch deleted successfully",
      })

      // Reload batches
      const batchesResponse = await batchesApi.getAll({ page: 1, limit: 1000 })
      setBatches(batchesResponse.batches || [])

    } catch (error) {
      console.error("Error deleting batch:", error)
      toast({
        title: "Error",
        description: "Failed to delete batch",
        variant: "destructive",
      })
    }
  }

  const handleViewBatchItems = async (batch: Batch) => {
    setSelectedBatch(batch)
    setViewBatchItems(batch.BatchItems || [])
    setShowBatchItemsDialog(true)
  }

  const handleEditBatch = (batch: Batch) => {
    setSelectedBatch(batch)
    setBatchForm({
      batchNumber: batch.batchNumber,
      batchDate: new Date(batch.batchDate),
      expireDate: new Date(batch.expireDate),
      reference: batch.reference || "",
      grnId: batch.grnId.toString(),
      locationId: batch.locationId.toString(),
      storeId: batch.storeId.toString(),
      isActive: batch.isActive,
    })
    setShowEditDialog(true)
  }

  if (loading) {
    return (
      <ERPLayout>
        <div className="flex-1 space-y-3 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold">Batch Management</h2>
              <p className="text-sm text-muted-foreground">Manage inventory batches and batch items</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </div>
      </ERPLayout>
    )
  }

  return (
    <ERPLayout>
      <div className="flex-1 space-y-3 p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold">Batch Management</h2>
            <p className="text-sm text-muted-foreground">Manage inventory batches and batch items</p>
          </div>
          <div className="flex items-end">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setShowCreateDialog(true)} className="h-8">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Batch
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg">Create New Batch</DialogTitle>
                  <DialogDescription className="text-sm">
                    Create a new batch for inventory management
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="batchNumber" className="text-xs">Batch Number (Optional)</Label>
                    <Input
                      id="batchNumber"
                      placeholder="Auto-generated if empty"
                      value={batchForm.batchNumber}
                      onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="grnId" className="text-xs">GRN *</Label>
                    <Select value={batchForm.grnId} onValueChange={handleGrnSelect}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select GRN" />
                      </SelectTrigger>
                      <SelectContent>
                        {grns.map((grn) => (
                          <SelectItem key={grn.id} value={grn.id!.toString()}>
                            {grn.grnNumber} - {format(new Date(grn.grnDate), "MMM dd, yyyy")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="batchDate" className="text-xs">Batch Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs">
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {format(batchForm.batchDate, "MMM dd, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={batchForm.batchDate}
                          onSelect={(date) => date && setBatchForm({ ...batchForm, batchDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="locationId" className="text-xs">Location *</Label>
                    <Select value={batchForm.locationId} onValueChange={(value) => setBatchForm({ ...batchForm, locationId: value })}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="storeId" className="text-xs">Store *</Label>
                    <Select value={batchForm.storeId} onValueChange={(value) => setBatchForm({ ...batchForm, storeId: value })}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select store" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id.toString()}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="expireDate" className="text-xs">Expire Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs">
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {format(batchForm.expireDate, "MMM dd, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={batchForm.expireDate}
                          onSelect={(date) => date && setBatchForm({ ...batchForm, expireDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reference" className="text-xs">Reference</Label>
                  <Textarea
                    id="reference"
                    placeholder="Batch reference notes"
                    value={batchForm.reference}
                    onChange={(e) => setBatchForm({ ...batchForm, reference: e.target.value })}
                    className="min-h-[60px] resize-none"
                  />
                </div>

                {/* GRN Items Table */}
                {batchForm.grnId && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">GRN Items</Label>
                    {loadingGrnItems ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">Loading items...</div>
                    ) : selectedGrnItems.length > 0 ? (
                      <div className="border rounded-md overflow-hidden">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="py-2 px-3">Item</TableHead>
                              <TableHead className="py-2 px-3 text-right">GRN Qty</TableHead>
                              <TableHead className="py-2 px-3 text-right">Available Qty</TableHead>
                              <TableHead className="py-2 px-3 text-right">Cost Price</TableHead>
                              <TableHead className="py-2 px-3">Expire Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedGrnItems.map((item, idx) => (
                              <TableRow key={idx} className="hover:bg-gray-50">
                                <TableCell className="py-2 px-3">
                                  <div>
                                    <p className="font-medium">{item.item?.name || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">{item.item?.sku || ''}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right">{item.grnQty || 0}</TableCell>
                                <TableCell className="py-2 px-3 text-right font-medium">{item.availableQty || 0}</TableCell>
                                <TableCell className="py-2 px-3 text-right">LKR {(item.costPrice || 0).toFixed(2)}</TableCell>
                                <TableCell className="py-2 px-3">
                                  {item.expireDate ? format(new Date(item.expireDate), "MMM dd, yyyy") : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">No items in this GRN</div>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={batchForm.isActive}
                    onCheckedChange={(checked) => setBatchForm({ ...batchForm, isActive: checked })}
                  />
                  <Label htmlFor="isActive" className="text-sm">Active</Label>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)} size="sm">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateBatch} size="sm">
                    Create Batch
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-3">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Batches</p>
                  <div className="text-xl font-bold">{batchSummary.totalBatches}</div>
                </div>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Active Batches</p>
                  <div className="text-xl font-bold">{batchSummary.activeBatches}</div>
                </div>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Expiring Soon</p>
                  <div className="text-xl font-bold">{batchSummary.expiringSoonBatches}</div>
                  <p className="text-xs text-muted-foreground">Within 30 days</p>
                </div>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Expired</p>
                  <div className="text-xl font-bold text-red-600">{batchSummary.expiredBatches}</div>
                  {batchSummary.totalValue > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ${batchSummary.totalValue.toFixed(2)} total value
                    </p>
                  )}
                </div>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="search" className="text-xs">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search batches..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-8"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Store</Label>
                  <Select value={storeFilter} onValueChange={setStoreFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All stores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All stores</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id.toString()}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Location</Label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All locations</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Expiry</Label>
                  <Select value={expiryFilter} onValueChange={setExpiryFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All batches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All batches</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="expiring_soon">Expiring Soon (30 days)</SelectItem>
                      <SelectItem value="valid">Valid (&gt;30 days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>

            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 text-xs">Batch Number</TableHead>
                    <TableHead className="py-2 text-xs">GRN</TableHead>
                    <TableHead className="py-2 text-xs">Batch Date</TableHead>
                    <TableHead className="py-2 text-xs">Expire Date</TableHead>
                    <TableHead className="py-2 text-xs">Expiry Status</TableHead>
                    <TableHead className="py-2 text-xs">Store</TableHead>
                    <TableHead className="py-2 text-xs">Status</TableHead>
                    <TableHead className="py-2 text-xs w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 text-muted-foreground text-sm">
                        No batches found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedBatches.map((batch: Batch) => {
                      const expiryStatus = getBatchExpiryStatus(batch.expireDate)
                      const store = stores.find(s => s.id === batch.storeId)
                      const location = locations.find(l => l.id === batch.locationId)

                      return (
                        <TableRow key={batch.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium py-2 text-sm">{batch.batchNumber}</TableCell>
                          <TableCell className="py-2 text-sm">
                            {batch.GRN?.grnNumber || `GRN-${batch.grnId}`}
                          </TableCell>
                          <TableCell className="py-2 text-sm">{format(new Date(batch.batchDate), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="py-2 text-sm">{format(new Date(batch.expireDate), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant={expiryStatus.variant} className={`${expiryStatus.className} text-xs`}>
                              {expiryStatus.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-sm">
                            <div>
                              {store?.name || "Unknown"}<br />
                              <span className="text-xs text-muted-foreground">{location?.name || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant={batch.isActive ? "default" : "secondary"} className="text-xs">
                              {batch.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleViewBatchItems(batch)}>
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button variant="outline" size="sm" onClick={() => handleEditBatch(batch)}>
                                <Edit className="h-4 w-4" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Batch</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete batch "{batch.batchNumber}"?
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteBatch(batch)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>

              {filteredBatches.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <PaginationControls
                    {...paginationProps}
                  />
                </div>
              )}
              <div className="ml-4 flex justify-between items-center">
                <div>
                  <CardDescription className="text-xs">
                    Showing {paginatedBatches.length} of {filteredBatches.length} batches
                  </CardDescription>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Batch Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">Edit Batch</DialogTitle>
                <DialogDescription className="text-sm">
                  Update batch information and view items
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editBatchNumber" className="text-xs">Batch Number</Label>
                  <Input
                    id="editBatchNumber"
                    value={batchForm.batchNumber}
                    disabled
                    className="h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="editExpireDate" className="text-xs">Expire Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {format(batchForm.expireDate, "MMM dd, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={batchForm.expireDate}
                        onSelect={(date) => date && setBatchForm({ ...batchForm, expireDate: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="editReference" className="text-xs">Reference</Label>
                <Textarea
                  id="editReference"
                  placeholder="Batch reference notes"
                  value={batchForm.reference}
                  onChange={(e) => setBatchForm({ ...batchForm, reference: e.target.value })}
                  className="min-h-[60px] resize-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="editIsActive"
                  checked={batchForm.isActive}
                  onCheckedChange={(checked) => setBatchForm({ ...batchForm, isActive: checked })}
                />
                <Label htmlFor="editIsActive" className="text-sm">Active</Label>
              </div>

              {/* Batch Items */}
              {selectedBatch?.BatchItems && selectedBatch.BatchItems.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Batch Items</Label>
                  <div className="border rounded-md overflow-hidden">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="py-2 px-3">Item</TableHead>
                          <TableHead className="py-2 px-3 text-right">Batch Qty</TableHead>
                          <TableHead className="py-2 px-3 text-right">Available Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBatch.BatchItems.map((item: any, idx: number) => (
                          <TableRow key={idx} className="hover:bg-gray-50">
                            <TableCell className="py-2 px-3">
                              <div>
                                <p className="font-medium">{item.Item?.name || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">{item.Item?.sku || ''}</p>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right">{parseFloat(item.batchQuantity) || 0}</TableCell>
                            <TableCell className="py-2 px-3 text-right font-medium">{parseFloat(item.availableQuantity) || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)} size="sm">
                  Cancel
                </Button>
                <Button onClick={handleUpdateBatch} size="sm">
                  Update Batch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Batch Items Management */}
          {selectedBatch && (
            <BatchItemsManagement
              batch={selectedBatch}
              open={showBatchItemsDialog}
              onOpenChange={setShowBatchItemsDialog}
              onUpdate={() => {
                // Reload batches when items are updated
                const loadBatches = async () => {
                  try {
                    const batchesResponse = await batchesApi.getAll({ page: 1, limit: 1000 })
                    setBatches(batchesResponse.batches || [])
                    // Update selected batch with new items
                    const updatedBatch = (batchesResponse.batches || []).find(b => b.id === selectedBatch.id)
                    if (updatedBatch) {
                      setSelectedBatch(updatedBatch)
                      setViewBatchItems(updatedBatch.BatchItems || [])
                    }
                  } catch (error) {
                    console.error("Error reloading batches:", error)
                  }
                }
                loadBatches()
              }}
            />
          )}
        </div>
      </div>
    </ERPLayout>
  )
}