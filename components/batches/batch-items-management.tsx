"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
import { toast } from "@/hooks/use-toast"
import {
  batchItemsApi,
  itemsApi,
  storesApi,
  locationsApi,
  type BatchItem,
  type Item,
  type Store,
  type Location,
  type Batch,
} from "@/lib/api"
import { Plus, Edit, Trash2, Minus } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

interface BatchItemsManagementProps {
  batch: Batch
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

export function BatchItemsManagement({ 
  batch, 
  open, 
  onOpenChange, 
  onUpdate 
}: BatchItemsManagementProps) {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  
  // Form states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showQuantityDialog, setShowQuantityDialog] = useState(false)
  const [selectedBatchItem, setSelectedBatchItem] = useState<BatchItem | null>(null)
  
  const [batchItemForm, setBatchItemForm] = useState({
    itemId: "",
    batchQuantity: "",
    availableQuantity: "",
    locationId: batch.locationId?.toString() || "",
    storeId: batch.storeId?.toString() || "",
    isActive: true,
  })

  const [quantityForm, setQuantityForm] = useState({
    quantityChange: "",
    operation: "subtract" as "add" | "subtract",
  })

  // Load data when dialog opens
  useEffect(() => {
    if (open && batch.id) {
      loadData()
    }
  }, [open, batch.id])

  const loadData = async () => {
    setLoading(true)
    try {
      // Use BatchItems from batch if available, otherwise fetch via API
      let batchItemsData: BatchItem[] = []
      
      if (batch.BatchItems && batch.BatchItems.length > 0) {
        batchItemsData = batch.BatchItems as BatchItem[]
      } else {
        batchItemsData = await batchItemsApi.getByBatchId(batch.id!)
      }

      const [itemsResponse, storesResponse, locationsResponse] = await Promise.all([
        itemsApi.getAll<Item>(),
        storesApi.getAll<Store>(),
        locationsApi.getAll<Location>(),
      ])
      
      setBatchItems(batchItemsData)
      setItems(itemsResponse)
      setStores(storesResponse)
      setLocations(locationsResponse)
    } catch (error) {
      console.error("Error loading batch items data:", error)
      toast({
        title: "Error",
        description: "Failed to load batch items data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetBatchItemForm = () => {
    setBatchItemForm({
      itemId: "",
      batchQuantity: "",
      availableQuantity: "",
      locationId: batch.locationId?.toString() || "",
      storeId: batch.storeId?.toString() || "",
      isActive: true,
    })
  }

  const resetQuantityForm = () => {
    setQuantityForm({
      quantityChange: "",
      operation: "subtract",
    })
  }

  const handleCreateBatchItem = async () => {
    try {
      if (!batchItemForm.itemId || !batchItemForm.batchQuantity || !batchItemForm.availableQuantity) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        })
        return
      }

      const payload = {
        batchId: batch.id!,
        itemId: parseInt(batchItemForm.itemId),
        batchQuantity: parseFloat(batchItemForm.batchQuantity),
        availableQuantity: parseFloat(batchItemForm.availableQuantity),
        locationId: parseInt(batchItemForm.locationId),
        storeId: parseInt(batchItemForm.storeId),
        isActive: batchItemForm.isActive,
      }

      await batchItemsApi.create(payload)
      
      toast({
        title: "Success",
        description: "Batch item created successfully",
      })
      
      setShowCreateDialog(false)
      resetBatchItemForm()
      await loadData()
      onUpdate?.()
      
    } catch (error) {
      console.error("Error creating batch item:", error)
      toast({
        title: "Error",
        description: "Failed to create batch item",
        variant: "destructive",
      })
    }
  }

  const handleUpdateBatchItem = async () => {
    if (!selectedBatchItem) return
    
    try {
      const payload = {
        availableQuantity: parseFloat(batchItemForm.availableQuantity),
        isActive: batchItemForm.isActive,
      }

      await batchItemsApi.update(selectedBatchItem.id!, payload)
      
      toast({
        title: "Success",
        description: "Batch item updated successfully",
      })
      
      setShowEditDialog(false)
      setSelectedBatchItem(null)
      resetBatchItemForm()
      await loadData()
      onUpdate?.()
      
    } catch (error) {
      console.error("Error updating batch item:", error)
      toast({
        title: "Error",
        description: "Failed to update batch item",
        variant: "destructive",
      })
    }
  }

  const handleUpdateQuantity = async () => {
    if (!selectedBatchItem) return
    
    try {
      const payload = {
        quantityChange: parseFloat(quantityForm.quantityChange),
        operation: quantityForm.operation,
      }

      await batchItemsApi.updateQuantity(selectedBatchItem.id!, payload)
      
      toast({
        title: "Success",
        description: `Quantity ${quantityForm.operation === "add" ? "added" : "subtracted"} successfully`,
      })
      
      setShowQuantityDialog(false)
      setSelectedBatchItem(null)
      resetQuantityForm()
      await loadData()
      onUpdate?.()
      
    } catch (error) {
      console.error("Error updating quantity:", error)
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      })
    }
  }

  const handleDeleteBatchItem = async (batchItem: BatchItem) => {
    try {
      await batchItemsApi.remove(batchItem.id!)
      
      toast({
        title: "Success",
        description: "Batch item deleted successfully",
      })
      
      await loadData()
      onUpdate?.()
      
    } catch (error) {
      console.error("Error deleting batch item:", error)
      toast({
        title: "Error",
        description: "Failed to delete batch item",
        variant: "destructive",
      })
    }
  }

  const handleEditBatchItem = (batchItem: BatchItem) => {
    setSelectedBatchItem(batchItem)
    setBatchItemForm({
      itemId: batchItem.itemId.toString(),
      batchQuantity: batchItem.batchQuantity.toString(),
      availableQuantity: batchItem.availableQuantity.toString(),
      locationId: batchItem.locationId.toString(),
      storeId: batchItem.storeId.toString(),
      isActive: batchItem.isActive,
    })
    setShowEditDialog(true)
  }

  const handleQuantityAdjustment = (batchItem: BatchItem, operation: "add" | "subtract") => {
    setSelectedBatchItem(batchItem)
    setQuantityForm({
      quantityChange: "",
      operation,
    })
    setShowQuantityDialog(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Batch Items - {batch.batchNumber}
            </DialogTitle>
            <DialogDescription>
              Manage items in this batch. Total items: {batchItems.length}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Batch Information */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Batch Number</Label>
                  <p className="font-medium">{batch.batchNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Batch Date</Label>
                  <p className="font-medium">{format(batch.batchDate, "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Expire Date</Label>
                  <p className="font-medium">{format(batch.expireDate, "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status </Label>
                  <Badge variant={batch.isActive ? "default" : "secondary"} className="text-xs">
                    {batch.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {batch.reference && (
                  <div className="col-span-2 md:col-span-4">
                    <Label className="text-xs text-muted-foreground">Reference</Label>
                    <p className="font-medium text-sm">{batch.reference}</p>
                  </div>
                )}
              </div>

              {/* Creator and Updater Information */}
              <div className="border-t pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* Creator Information */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Created By</Label>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {(batch as any).Creator?.username || `User ID: ${batch.createdBy}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(batch.createdAt!), "MMM dd, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Updater Information */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Last Updated By</Label>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {(batch as any).Updater?.username || `User ID: ${batch.updatedBy}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(batch.updatedAt!), "MMM dd, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location and Store Information */}
                {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t">
                  <div>
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <p className="font-medium">
                      {(batch as any).Location?.name || `Location ID: ${batch.locationId}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Store</Label>
                    <p className="font-medium">
                      {(batch as any).Store?.name || `Store ID: ${batch.storeId}`}
                    </p>
                  </div>
                </div> */}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Managing items | Total items: {batchItems.length}
              </div>
              {/* <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button> */}
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Details</TableHead>
                    <TableHead>Quantities</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Expire Date</TableHead>
                    <TableHead>Location & Store</TableHead>
                    {/* <TableHead>Status</TableHead> */}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No items in this batch
                      </TableCell>
                    </TableRow>
                  ) : (
                    batchItems.map((item) => {
                      const itemData = item.Item || items.find(i => i.id === item.itemId)
                      const store = item.Store || stores.find(s => s.id === item.storeId)
                      const location = item.Location || locations.find(l => l.id === item.locationId)
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{itemData?.name || "Unknown Item"}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-mono">{itemData?.sku}</span>
                                <span>•</span>
                                <span>{itemData?.barcode}</span>
                              </div>
                              {/* {itemData?.Category && (
                                <Badge variant="outline" className="text-xs">
                                  {itemData.Category.name}
                                </Badge>
                              )} */}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Batch:</span>
                                <span className="font-medium">{Number(item.batchQuantity).toFixed(2)}</span>
                                <span className="text-muted-foreground">{itemData?.unit}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Available:</span>
                                <span className={`font-medium ${Number(item.availableQuantity) <= 0 ? "text-red-600" : "text-green-600"}`}>
                                  {Number(item.availableQuantity).toFixed(2)}
                                </span>
                                <span className="text-muted-foreground">{itemData?.unit}</span>
                              </div>
                              {Number(item.reservedQuantity) > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Reserved:</span>
                                  <span className="font-medium text-orange-600">{Number(item.reservedQuantity).toFixed(2)}</span>
                                  <span className="text-muted-foreground">{itemData?.unit}</span>
                                </div>
                              )}
                              {Number(item.availableQuantity) < Number(item.batchQuantity) && (
                                <Badge variant="secondary" className="text-xs">
                                  {((Number(item.availableQuantity) / Number(item.batchQuantity)) * 100).toFixed(1)}% left
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Cost:</span>
                                <span className="font-medium">LKR {Number(item.costPrice).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Selling:</span>
                                <span className="font-medium text-green-600">LKR {Number(item.sellingPrice).toLocaleString()}</span>
                              </div>
                              {Number(item.sellingPrice) > Number(item.costPrice) && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Margin:</span>
                                  <span className="text-xs font-medium text-blue-600">
                                    {(((Number(item.sellingPrice) - Number(item.costPrice)) / Number(item.costPrice)) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {item.expireDate ? (
                                <>
                                  <div className="font-medium">{format(new Date(item.expireDate), "MMM dd, yyyy")}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {(() => {
                                      const expireDate = new Date(item.expireDate)
                                      const today = new Date()
                                      const diffTime = expireDate.getTime() - today.getTime()
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                                      
                                      if (diffDays < 0) {
                                        return <span className="text-red-600 font-medium">Expired {Math.abs(diffDays)} days ago</span>
                                      } else if (diffDays <= 7) {
                                        return <span className="text-orange-600 font-medium">Expires in {diffDays} days</span>
                                      } else if (diffDays <= 30) {
                                        return <span className="text-yellow-600 font-medium">Expires in {diffDays} days</span>
                                      } else {
                                        return <span className="text-green-600">Expires in {diffDays} days</span>
                                      }
                                    })()}
                                  </div>
                                </>
                              ) : (
                                <span className="text-muted-foreground">No expiry date</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="font-medium">{location?.name || "Unknown Location"}</span>
                              </div>
                              <div className="text-muted-foreground">
                                {store?.name || "Unknown Store"}
                              </div>
                            </div>
                          </TableCell>
                          {/* <TableCell>
                            <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs">
                              {item.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell> */}
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditBatchItem(item)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuantityAdjustment(item, "add")}>
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Quantity
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuantityAdjustment(item, "subtract")}>
                                  <Minus className="mr-2 h-4 w-4" />
                                  Subtract Quantity
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Batch Item</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this batch item? 
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteBatchItem(item)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Batch Item Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Item to Batch</DialogTitle>
            <DialogDescription>
              Add a new item to batch {batch.batchNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemId">Item *</Label>
              <Select value={batchItemForm.itemId} onValueChange={(value) => setBatchItemForm({ ...batchItemForm, itemId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name} ({item.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storeId">Store *</Label>
              <Select value={batchItemForm.storeId} onValueChange={(value) => setBatchItemForm({ ...batchItemForm, storeId: value })}>
                <SelectTrigger>
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
            
            <div className="space-y-2">
              <Label htmlFor="batchQuantity">Batch Quantity *</Label>
              <Input
                id="batchQuantity"
                type="number"
                placeholder="Enter batch quantity"
                value={batchItemForm.batchQuantity}
                onChange={(e) => setBatchItemForm({ ...batchItemForm, batchQuantity: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="availableQuantity">Available Quantity *</Label>
              <Input
                id="availableQuantity"
                type="number"
                placeholder="Enter available quantity"
                value={batchItemForm.availableQuantity}
                onChange={(e) => setBatchItemForm({ ...batchItemForm, availableQuantity: e.target.value })}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={batchItemForm.isActive}
              onCheckedChange={(checked) => setBatchItemForm({ ...batchItemForm, isActive: checked })}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBatchItem}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Batch Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Batch Item</DialogTitle>
            <DialogDescription>
              Update batch item information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editAvailableQuantity">Available Quantity *</Label>
              <Input
                id="editAvailableQuantity"
                type="number"
                placeholder="Enter available quantity"
                value={batchItemForm.availableQuantity}
                onChange={(e) => setBatchItemForm({ ...batchItemForm, availableQuantity: e.target.value })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="editIsActive"
                checked={batchItemForm.isActive}
                onCheckedChange={(checked) => setBatchItemForm({ ...batchItemForm, isActive: checked })}
              />
              <Label htmlFor="editIsActive">Active</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBatchItem}>
              Update Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quantity Adjustment Dialog */}
      <Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quantityForm.operation === "add" ? "Add" : "Subtract"} Quantity
            </DialogTitle>
            <DialogDescription>
              {quantityForm.operation === "add" 
                ? "Add quantity to the available stock" 
                : "Subtract quantity from the available stock"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantityChange">
                Quantity to {quantityForm.operation === "add" ? "Add" : "Subtract"} *
              </Label>
              <Input
                id="quantityChange"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter quantity"
                value={quantityForm.quantityChange}
                onChange={(e) => setQuantityForm({ ...quantityForm, quantityChange: e.target.value })}
              />
            </div>
            
            {selectedBatchItem && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <div>Current Available: {selectedBatchItem.availableQuantity}</div>
                  <div>
                    New Available: {
                      quantityForm.operation === "add" 
                        ? selectedBatchItem.availableQuantity + (parseFloat(quantityForm.quantityChange) || 0)
                        : selectedBatchItem.availableQuantity - (parseFloat(quantityForm.quantityChange) || 0)
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuantityDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateQuantity}>
              {quantityForm.operation === "add" ? "Add" : "Subtract"} Quantity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}