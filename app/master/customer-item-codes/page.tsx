"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Plus, Search, Edit, Trash2, Eye, Users, Package, MapPin, Check, ChevronsUpDown, FileText } from "lucide-react"
import {
  customerItemCodesApi,
  customersApi,
  itemsApi,
  type CustomerItemCode,
  type Customer,
  type Item,
  type CreateCustomerItemCodeRequest,
  type UpdateCustomerItemCodeRequest
} from "@/lib/api"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { CustomerSelect } from "@/components/customer/customer-select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useLocation } from "@/hooks/use-location"

interface CustomerItemCodeFormData {
  customerId: number | null
  itemId: number | null
  code: string
}

export default function CustomerItemCodesPage() {
  const { selectedLocation } = useLocation()
  const [customerItemCodes, setCustomerItemCodes] = useState<CustomerItemCode[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [editingCustomerItemCode, setEditingCustomerItemCode] = useState<CustomerItemCode | null>(null)
  const [viewCustomerItemCode, setViewCustomerItemCode] = useState<CustomerItemCode | null>(null)

  // Form state
  const [formData, setFormData] = useState<CustomerItemCodeFormData>({
    customerId: null,
    itemId: null,
    code: "",
  })
  // For bulk entry
  const [itemCodeRows, setItemCodeRows] = useState<{ itemId: number; code: string }[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  // Dropdown states
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(10)

  // Load data on component mount
  useEffect(() => {
    Promise.all([
      loadCustomerItemCodes(),
      loadCustomers(),
      loadItems(),
    ])
  }, [currentPage, searchTerm])

  const loadCustomerItemCodes = async () => {
    try {
      setLoading(true)
      const response = await customerItemCodesApi.getAll({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      }) as any
      setCustomerItemCodes(response.data || [])
      setTotalPages(response.pagination?.totalPages || 1)
      setTotalCount(response.pagination?.totalCount || 0)
    } catch (error) {
      console.error("Failed to load customer item codes:", error)
      toast({
        title: "Error",
        description: "Failed to load customer item codes. Please try again.",
        variant: "destructive",
      })
      setCustomerItemCodes([])
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const data = await customersApi.getAll()
      setCustomers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to load customers:", error)
      setCustomers([])
    }
  }

  const loadItems = async () => {
    try {
      const data = await itemsApi.getAll()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to load items:", error)
      setItems([])
    }
  }

  const handleCreateCustomerItemCode = async () => {
    try {
      if (!formData.customerId) {
        toast({
          title: "Validation Error",
          description: "Please select a customer.",
          variant: "destructive",
        })
        return
      }
      if (!selectedLocation) {
        toast({
          title: "Error",
          description: "No location selected. Please select a location first.",
          variant: "destructive",
        })
        return
      }
      // Only submit non-empty codes
      const codesToSubmit = itemCodeRows
        .filter(row => row.code && row.code.trim())
        .map(row => ({
          customerId: formData.customerId!,
          itemId: row.itemId,
          code: row.code.trim(),
          locationId: selectedLocation.id,
          isActive: true,
        }))
      if (codesToSubmit.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please enter at least one item code.",
          variant: "destructive",
        })
        return
      }
      await customerItemCodesApi.bulkCreateUpdate({ customerItemCodes: codesToSubmit })
      toast({
        title: "Success",
        description: `Customer item codes saved successfully (${codesToSubmit.length} records)`
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadCustomerItemCodes()
    } catch (error) {
      console.error("Failed to create customer item codes:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create customer item codes",
        variant: "destructive",
      })
    }
  }

  const handleEditCustomerItemCode = async () => {
    if (!editingCustomerItemCode) return

    try {
      if (!formData.code.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid code.",
          variant: "destructive",
        })
        return
      }

      const updateData: UpdateCustomerItemCodeRequest = {
        code: formData.code.trim(),
        isActive: editingCustomerItemCode.isActive, // Keep existing status
      }

      await customerItemCodesApi.update(editingCustomerItemCode.id!, updateData)
      toast({
        title: "Success",
        description: "Customer item code updated successfully",
      })
      setIsEditDialogOpen(false)
      setEditingCustomerItemCode(null)
      resetForm()
      loadCustomerItemCodes()
    } catch (error) {
      console.error("Failed to update customer item code:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update customer item code",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCustomerItemCode = async (customerItemCode: CustomerItemCode) => {
    try {
      await customerItemCodesApi.remove(customerItemCode.id!)
      toast({
        title: "Success",
        description: "Customer item code deleted successfully",
      })
      loadCustomerItemCodes()
    } catch (error) {
      console.error("Failed to delete customer item code:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete customer item code",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (customerItemCode: CustomerItemCode) => {
    setEditingCustomerItemCode(customerItemCode)
    setFormData({
      customerId: customerItemCode.customerId,
      itemId: customerItemCode.itemId,
      code: customerItemCode.code,
    })
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (customerItemCode: CustomerItemCode) => {
    setViewCustomerItemCode(customerItemCode)
    setIsViewDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      customerId: null,
      itemId: null,
      code: "",
    })
    setItemDropdownOpen(false)
    setItemCodeRows([])
    setItemsLoading(false)
  }

  const getSelectedCustomer = (customerId: number | null) => {
    return customers.find(c => c.id === customerId)
  }

  const getSelectedItem = (itemId: number | null) => {
    return items.find(i => i.id === itemId)
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    )
  }

  // Calculate analytics
  const totalCustomerItemCodes = totalCount
  const activeCustomerItemCodes = customerItemCodes.filter(code => code.isActive).length
  const uniqueCustomers = new Set(customerItemCodes.map(code => code.customerId)).size
  const uniqueItems = new Set(customerItemCodes.map(code => code.itemId)).size
  const activityRate = customerItemCodes.length > 0 ? Math.round((activeCustomerItemCodes / customerItemCodes.length) * 100) : 0

  if (loading && currentPage === 1) {
    return (
      <ERPLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    )
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Customer Item Codes</h1>
            <p className="text-sm text-muted-foreground">
              Manage customer-specific item codes and mappings across locations
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer Item Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl font-semibold">Add Customer Item Codes</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Select a customer and enter codes for items. Only non-empty codes will be saved.
                </p>
              </DialogHeader>
              <div className="space-y-6 overflow-y-auto">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Customer *</Label>
                  <CustomerSelect
                    customers={customers}
                    value={formData.customerId || 0}
                    onValueChange={async (value) => {
                      setFormData({ ...formData, customerId: value })
                      setItemsLoading(true)
                      try {
                        const response = await itemsApi.getAll()
                        const allItems = Array.isArray(response) ? response : (response as any).data || []
                        setItems(allItems)
                        setItemCodeRows(allItems.map((item: Item) => ({ itemId: item.id, code: "" })))
                      } catch {
                        setItems([])
                        setItemCodeRows([])
                      } finally {
                        setItemsLoading(false)
                      }
                    }}
                    placeholder="Select customer..."
                    disabled={itemsLoading}
                  />
                </div>

                {/* Step 2: Items Table */}
                {formData.customerId && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Item Codes</Label>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{itemCodeRows.filter(row => row.code.trim()).length} of {items.length} items have codes</span>
                      </div>
                    </div>
                    {itemsLoading ? (
                      <div className="flex items-center justify-center py-8 border rounded-lg">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
                        <span className="text-sm text-muted-foreground">Loading items...</span>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-[400px] overflow-y-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                              <TableRow className="border-b">
                                <TableHead className="w-[45%] font-medium">Item Name</TableHead>
                                <TableHead className="w-[25%] font-medium">SKU</TableHead>
                                <TableHead className="w-[30%] font-medium">Customer Code</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    No items available
                                  </TableCell>
                                </TableRow>
                              ) : (
                                items.map((item, idx) => (
                                  <TableRow key={item.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">
                                      <div>
                                        <div className="font-medium">{item.name}</div>
                                        {item.Category && (
                                          <div className="text-xs text-muted-foreground">
                                            Category: {item.Category.name}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                        {item.sku}
                                      </code>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={itemCodeRows[idx]?.code || ""}
                                        onChange={e => {
                                          const newRows = [...itemCodeRows]
                                          newRows[idx] = { ...newRows[idx], code: e.target.value }
                                          setItemCodeRows(newRows)
                                        }}
                                        placeholder="Enter customer code"
                                        className="h-8 text-sm"
                                        disabled={itemsLoading}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Location & Status Info */}
                {formData.customerId && (
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Location: {selectedLocation?.name || 'No location selected'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          All codes will be set as Active by default
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCustomerItemCode}
                    disabled={!formData.customerId || itemsLoading || itemCodeRows.filter(row => row.code.trim()).length === 0}
                    className="flex-1"
                  >
                    {itemsLoading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Loading...
                      </>
                    ) : (
                      `Save ${itemCodeRows.filter(row => row.code.trim()).length} Code${itemCodeRows.filter(row => row.code.trim()).length !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Analytics Cards */}
        {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Codes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomerItemCodes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeCustomerItemCodes} active • {totalCustomerItemCodes - activeCustomerItemCodes} inactive
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueCustomers}</div>
              <p className="text-xs text-muted-foreground mt-1">Have custom codes</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueItems}</div>
              <p className="text-xs text-muted-foreground mt-1">With custom codes</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Rate</CardTitle>
              <div className={cn(
                "h-4 w-4 rounded-full",
                activityRate >= 80 ? "bg-green-500" : activityRate >= 60 ? "bg-yellow-500" : "bg-red-500"
              )} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activityRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">Codes are active</p>
            </CardContent>
          </Card>
        </div> */}

        {/* Customer Item Codes Table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-semibold">Customer Item Codes</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalCustomerItemCodes} total codes across {uniqueCustomers} customers
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search codes, customers, or items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-72"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/50">
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Item</TableHead>
                    <TableHead className="font-semibold">Customer Code</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerItemCodes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <FileText className="h-12 w-12 text-muted-foreground/50" />
                          <div>
                            <p className="font-medium">No customer item codes found</p>
                            <p className="text-sm text-muted-foreground">
                              {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first customer item code'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    customerItemCodes.map((customerItemCode) => (
                      <TableRow key={customerItemCode.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{customerItemCode.Customer?.name || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">
                              {customerItemCode.Customer?.type || 'Unknown type'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{customerItemCode.Item?.name || 'N/A'}</div>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {customerItemCode.Item?.sku || 'N/A'}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                            {customerItemCode.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{customerItemCode.Location?.name || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(customerItemCode.isActive)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewDialog(customerItemCode)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(customerItemCode)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Customer Item Code</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this customer item code? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteCustomerItemCode(customerItemCode)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-t bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                  <span className="font-medium">{totalCount}</span> results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">Page</span>
                    <span className="text-sm font-medium">{currentPage}</span>
                    <span className="text-sm text-muted-foreground">of {totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Edit Customer Item Code</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Update the customer item code for this mapping
              </p>
            </DialogHeader>
            <div className="space-y-6">
              {/* Read-only Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Customer</Label>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <p className="font-medium">{getSelectedCustomer(formData.customerId)?.name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">
                        {getSelectedCustomer(formData.customerId)?.type || 'Unknown type'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Item</Label>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <p className="font-medium">{getSelectedItem(formData.itemId)?.name || 'N/A'}</p>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {getSelectedItem(formData.itemId)?.sku || 'N/A'}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Location</Label>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{editingCustomerItemCode?.Location?.name || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      {getStatusBadge(editingCustomerItemCode?.isActive || false)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Code */}
              <div className="space-y-2">
                <Label htmlFor="editCode" className="text-sm font-medium">Customer Item Code *</Label>
                <Input
                  id="editCode"
                  placeholder="Enter customer item code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="text-base"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditCustomerItemCode}
                  disabled={!formData.code.trim()}
                  className="flex-1"
                >
                  Update Code
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Customer Item Code Details</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Complete information about this customer item code mapping
              </p>
            </DialogHeader>
            {viewCustomerItemCode && (
              <div className="space-y-6">
                {/* Main Information */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="font-medium">{viewCustomerItemCode.Customer?.name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">
                          {viewCustomerItemCode.Customer?.type || 'Unknown type'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="font-medium">{viewCustomerItemCode.Item?.name || 'N/A'}</p>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {viewCustomerItemCode.Item?.sku || 'N/A'}
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Code</Label>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <code className="text-lg font-mono font-semibold text-primary">
                        {viewCustomerItemCode.code}
                      </code>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{viewCustomerItemCode.Location?.name || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        {getStatusBadge(viewCustomerItemCode.isActive)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
                    Metadata
                  </Label>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">
                        {viewCustomerItemCode.createdAt
                          ? new Date(viewCustomerItemCode.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="font-medium">
                        {viewCustomerItemCode.updatedAt
                          ? new Date(viewCustomerItemCode.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'N/A'
                        }
                      </span>
                    </div>
                    {viewCustomerItemCode.createdByUsername && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created By:</span>
                        <span className="font-medium">{viewCustomerItemCode.createdByUsername}</span>
                      </div>
                    )}
                    {viewCustomerItemCode.updatedByUsername && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated By:</span>
                        <span className="font-medium">{viewCustomerItemCode.updatedByUsername}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}