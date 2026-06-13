"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Save, X, ShoppingCart } from "lucide-react"
import {
  supplierReturnsApi,
  suppliersApi,
  returnTypesApi,
  locationsApi,
  storesApi,
  itemsApi,
  unitsApi,
  unitsCrudApi,
  type SupplierReturn,
  type Supplier,
  type ReturnType,
  type Location,
  type Store,
  type Item,
  type Unit,
  type SupplierReturnItem,
  type CreateSupplierReturnRequest,
  grnApi,
  type GRN,
  type GRNItem,
} from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { SupplierSelect } from "@/components/supplier/supplier-select"
import { ItemSelect } from "@/components/items/item-select"

interface CreateSupplierReturnFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateSupplierReturnForm({ open, onOpenChange, onSuccess }: CreateSupplierReturnFormProps) {
  const [formData, setFormData] = useState<Partial<CreateSupplierReturnRequest>>({
    supplierId: 0,
    returnTypeId: 0,
    reason: "",
    notes: "",
    locationId: 0,
    storeId: 0,
    items: []
  })

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [returnTypes, setReturnTypes] = useState<ReturnType[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [grns, setGrns] = useState<GRN[]>([])
  const [totalGRNs, setTotalGRNs] = useState<GRN[]>([])
  const [selectedGRNId, setSelectedGRNId] = useState<number | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)

  // New item form state
  const [newItem, setNewItem] = useState<Partial<SupplierReturnItem>>({
    itemId: 0,
    quantity: 0,
    unitPrice: 0,
    totalPrice: 0,
    unitId: 0,
    condition: "",
    reason: "",
    disposition: "",
    isRefundable: true
  })

  useEffect(() => {
    fetchMasterData()
  }, [])

  const fetchUnits = async () => {
    try {
      console.log("Fetching units data...")

      // Try the main units API first
      let unitsData = await unitsApi.getActive()
      console.log("Units from unitsApi.getActive():", unitsData)

      // If no data, try the CRUD API approach
      if (!unitsData || (Array.isArray(unitsData) && unitsData.length === 0)) {
        console.log("No units from main API, trying CRUD API...")
        const crudData = await unitsCrudApi.getAll<Unit>()
        unitsData = Array.isArray(crudData) ? crudData.filter((unit: Unit) => unit.isActive) : []
        console.log("Units from CRUD API (filtered for active):", unitsData)
      }

      // If still no data, provide fallback sample units (for development/testing)
      if (!unitsData || (Array.isArray(unitsData) && unitsData.length === 0)) {
        console.log("No units from any API, using fallback sample data...")
        unitsData = [
          {
            id: 1,
            name: "Kilogram",
            code: "KG",
            symbol: "kg",
            unitType: "WEIGHT",
            isDecimalAllowed: true,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdByUsername: "System",
            updatedByUsername: "System"
          },
          {
            id: 2,
            name: "Pieces",
            code: "PCS",
            symbol: "pcs",
            unitType: "COUNT",
            isDecimalAllowed: false,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdByUsername: "System",
            updatedByUsername: "System"
          },
          {
            id: 3,
            name: "Liters",
            code: "L",
            symbol: "L",
            unitType: "VOLUME",
            isDecimalAllowed: true,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdByUsername: "System",
            updatedByUsername: "System"
          }
        ] as Unit[]
      }

      return Array.isArray(unitsData) ? unitsData : []
    } catch (error) {
      console.error("Error fetching units:", error)
      // Return fallback units on error
      return [
        {
          id: 1,
          name: "Kilogram",
          code: "KG",
          symbol: "kg",
          unitType: "WEIGHT",
          isDecimalAllowed: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdByUsername: "System",
          updatedByUsername: "System"
        }
      ] as Unit[]
    }
  }

  const fetchMasterData = async () => {
    try {
      console.log("Fetching master data...")
      const [suppliersData, returnTypesData, locationsData, storesData, itemsData, unitsData] = await Promise.all([
        suppliersApi.getAll(),
        returnTypesApi.getActive(),
        locationsApi.getAll(),
        storesApi.getAll(),
        itemsApi.getAll(),
        fetchUnits(), // Use the robust units fetch
      ])

      console.log("All master data received:")
      console.log("- Suppliers:", (suppliersData as any[])?.length || 0)
      console.log("- Return Types:", (returnTypesData as any[])?.length || 0)
      console.log("- Locations:", (locationsData as any[])?.length || 0)
      console.log("- Stores:", (storesData as any[])?.length || 0)
      console.log("- Items:", (itemsData as any[])?.length || 0)
      console.log("- Units:", (unitsData as any[])?.length || 0)

      setSuppliers(suppliersData as Supplier[])
      setReturnTypes(returnTypesData as ReturnType[])
      setLocations(locationsData as Location[])
      setStores(storesData as Store[])
      setItems(itemsData as Item[])
      setUnits(unitsData as Unit[])

      // Fetch all GRNs for filtering later
      try {
        const grnData = await grnApi.getAll()
        setTotalGRNs(grnData)
      } catch (err) {
        console.error("Error fetching GRNs:", err)
      }

    } catch (error) {
      console.error("Error fetching master data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch master data. Please check console for details.",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      if (!formData.supplierId || !formData.returnTypeId || !formData.reason || !formData.locationId || !formData.storeId) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      if (!formData.items || formData.items.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one item to return",
          variant: "destructive",
        })
        return
      }

      const payload: CreateSupplierReturnRequest = {
        supplierId: formData.supplierId,
        returnTypeId: formData.returnTypeId,
        reason: formData.reason,
        notes: formData.notes,
        locationId: formData.locationId,
        storeId: formData.storeId,
        items: formData.items
      }

      await supplierReturnsApi.create(payload)
      toast({
        title: "Success",
        description: "Supplier return created successfully",
      })

      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error("Error creating supplier return:", error)
      toast({
        title: "Error",
        description: "Failed to create supplier return",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      supplierId: 0,
      returnTypeId: 0,
      reason: "",
      notes: "",
      locationId: 0,
      storeId: 0,
      items: []
    })
    resetNewItemForm()
    setShowItemForm(false)
    setSelectedGRNId(null)
    setGrns([])
  }

  const handleAddItem = () => {
    if (!newItem.itemId || !newItem.quantity || !newItem.unitPrice) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required item fields",
        variant: "destructive",
      })
      return
    }

    // Check if item already added
    if (formData.items?.some(item => item.itemId === newItem.itemId)) {
      toast({
        title: "Validation Error",
        description: "This item has already been added to the return list.",
        variant: "destructive",
      })
      return
    }

    // Validation: If GRN is selected, check quantity
    if (selectedGRNId) {
      const selectedGRN = totalGRNs.find(g => g.id === selectedGRNId)
      const grnItem = selectedGRN?.items.find(gi => gi.itemId === newItem.itemId)
      if (grnItem && (newItem.quantity || 0) > grnItem.grnQty) {
        toast({
          title: "Validation Error",
          description: `Return quantity (${newItem.quantity}) exceeds GRN quantity (${grnItem.grnQty})`,
          variant: "destructive",
        })
        return
      }
    }

    const totalPrice = (newItem.quantity || 0) * (newItem.unitPrice || 0)
    const itemToAdd: SupplierReturnItem = {
      itemId: newItem.itemId!,
      quantity: newItem.quantity!,
      unitPrice: newItem.unitPrice!,
      totalPrice,
      unitId: newItem.unitId!,
      condition: newItem.condition || "",
      reason: newItem.reason || "",
      disposition: newItem.disposition || "",
      isRefundable: newItem.isRefundable || false,
      item: items.find(item => item.id === newItem.itemId)
    }

    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), itemToAdd]
    }))

    resetNewItemForm()
    setShowItemForm(false)

    toast({
      title: "Success",
      description: "Item added to return successfully",
    })
  }

  const resetNewItemForm = () => {
    setNewItem({
      itemId: 0,
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      unitId: 0,
      condition: "",
      reason: "",
      disposition: "",
      isRefundable: true
    })
  }

  const handleCancelAddItem = () => {
    resetNewItemForm()
    setShowItemForm(false)
  }

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== index) || []
    }))
  }

  const calculateTotal = () => {
    return (formData.items || []).reduce((sum, item) => sum + item.totalPrice, 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Supplier Return</DialogTitle>
          <DialogDescription>Create a new supplier return request</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Basic Information */}
          <Card className="pt-2">
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="supplier" className="mb-1 block">Supplier *</Label>
                  <SupplierSelect
                    suppliers={suppliers}
                    value={formData.supplierId}
                    onValueChange={(value) => {
                      const sId = parseInt(value)
                      setFormData(prev => ({ ...prev, supplierId: sId }))
                      // Filter GRNs for this supplier
                      const filteredGRNs = totalGRNs.filter(g => g.supplierId === sId && g.status === "Approved")
                      setGrns(filteredGRNs)
                      setSelectedGRNId(null)
                    }}
                    placeholder="Search and select supplier"
                  />
                </div>
                <div>
                  <Label htmlFor="grn">GRN (Optional)</Label>
                  <Select
                    value={selectedGRNId?.toString() || "none"}
                    onValueChange={(value) => {
                      const grnId = value === "none" ? null : parseInt(value)
                      setSelectedGRNId(grnId)
                      resetNewItemForm()
                    }}
                    disabled={!formData.supplierId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.supplierId ? "Select GRN" : "Select supplier first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Individual Item Return)</SelectItem>
                      {grns.map((g) => (
                        <SelectItem key={g.id} value={g.id?.toString() || ""}>
                          {g.grnNumber} ({new Date(g.grnDate).toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="returnType">Return Type *</Label>
                  <Select
                    value={formData.returnTypeId?.toString() || ""}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, returnTypeId: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select return type" />
                    </SelectTrigger>
                    <SelectContent>
                      {returnTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Select
                    value={formData.locationId?.toString() || ""}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, locationId: parseInt(value) }))}
                  >
                    <SelectTrigger>
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
                <div>
                  <Label htmlFor="store">Store *</Label>
                  <Select
                    value={formData.storeId?.toString() || ""}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, storeId: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.filter(store => !formData.locationId || store.locationId === formData.locationId).map((store) => (
                        <SelectItem key={store.id} value={store.id.toString()}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


                <div>
                  <Label htmlFor="reason">Reason *</Label>
                  <Input
                    id="reason"
                    value={formData.reason || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Enter reason for return"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes (optional)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Return Items</CardTitle>
              {!showItemForm && (
                <Button onClick={() => setShowItemForm(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Item Form - Inline */}
              {showItemForm && (
                <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add New Return Item
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Item Selection */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="itemSelect">Select Item *</Label>
                        <ItemSelect
                          items={selectedGRNId ?
                            (totalGRNs.find(g => g.id === selectedGRNId)?.items
                              .map(gi => gi.item)
                              .filter((item): item is Item => !!item) || [])
                            : items
                          }
                          value={newItem.itemId}
                          onValueChange={(value) => {
                            const itemId = parseInt(value)

                            // If GRN is selected, we can auto-fill price from GRN item
                            if (selectedGRNId) {
                              const selectedGRN = totalGRNs.find(g => g.id === selectedGRNId)
                              const grnItem = selectedGRN?.items.find(gi => gi.itemId === itemId)
                              if (grnItem) {
                                setNewItem(prev => ({
                                  ...prev,
                                  itemId,
                                  quantity: grnItem.grnQty,
                                  unitPrice: grnItem.costPrice,
                                  totalPrice: (prev.quantity || 0) * grnItem.costPrice
                                }))
                                return
                              }
                            }

                            setNewItem(prev => ({ ...prev, itemId }))
                          }}
                          placeholder={selectedGRNId ? "Select item from GRN" : "Search for an item to return"}
                        />
                      </div>

                      {/* Quantity and Pricing */}

                      <div>
                        <Label htmlFor="quantity">Quantity *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={newItem.quantity || ""}
                          onChange={(e) => {
                            const quantity = parseFloat(e.target.value) || 0
                            setNewItem(prev => ({
                              ...prev,
                              quantity,
                              totalPrice: quantity * (prev.unitPrice || 0)
                            }))
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unitPrice">Unit Price *</Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          step="0.01"
                          value={newItem.unitPrice || ""}
                          onChange={(e) => {
                            const unitPrice = parseFloat(e.target.value) || 0
                            setNewItem(prev => ({
                              ...prev,
                              unitPrice,
                              totalPrice: (prev.quantity || 0) * unitPrice
                            }))
                          }}
                          placeholder="0.00"
                        />
                      </div>

                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="condition">Item Condition</Label>
                        <Input
                          id="condition"
                          value={newItem.condition || ""}
                          onChange={(e) => setNewItem(prev => ({ ...prev, condition: e.target.value }))}
                          placeholder="e.g., Damaged, Expired, Defective"
                        />
                      </div>
                      <div>
                        <Label htmlFor="disposition">Disposition</Label>
                        <Input
                          id="disposition"
                          value={newItem.disposition || ""}
                          onChange={(e) => setNewItem(prev => ({ ...prev, disposition: e.target.value }))}
                          placeholder="e.g., Return to Supplier, Dispose"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="itemReason">Specific Item Reason</Label>
                      <Textarea
                        id="itemReason"
                        value={newItem.reason || ""}
                        onChange={(e) => setNewItem(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Specific reason for returning this item..."
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isRefundable"
                          checked={newItem.isRefundable || false}
                          onCheckedChange={(checked) => setNewItem(prev => ({ ...prev, isRefundable: checked as boolean }))}
                        />
                        <Label htmlFor="isRefundable">This item is refundable</Label>
                      </div>
                      <div className="text-right">
                        <Label className="text-sm text-muted-foreground">Total Price</Label>
                        <p className="text-lg font-semibold text-green-600">
                          {((newItem.quantity || 0) * (newItem.unitPrice || 0)).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={handleCancelAddItem}
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddItem}
                        className="flex-1"
                        disabled={!newItem.itemId || !newItem.quantity || !newItem.unitPrice}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items List */}
              {formData.items && formData.items.length > 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.item?.name || "Unknown Item"}</p>
                                <p className="text-xs text-muted-foreground">{item.item?.sku}</p>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="font-semibold">{item.totalPrice.toFixed(2)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${item.condition ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                {item.condition || 'Good'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={3} className="font-semibold text-right">
                            Total Return Amount:
                          </TableCell>
                          <TableCell className="font-bold text-lg text-green-600">
                            {calculateTotal().toFixed(2)}
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : !showItemForm ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    {/* <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" /> */}
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No items added yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Start by adding items that need to be returned</p>
                    {/*<Button onClick={() => setShowItemForm(true)} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Item
                    </Button> */}
                  </CardContent>
                </Card>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Create Return"}
          </Button>
        </DialogFooter>
      </DialogContent>


    </Dialog>
  )
}