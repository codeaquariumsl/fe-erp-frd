"use client"

import { useState, useEffect } from "react"
import { Plus, Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { billEntriesApi, suppliersApi, ledgerAccountsApi, locationsApi, BillEntry, Supplier, LedgerAccount, BillEntryDetail, Location } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye, FileText, X, CreditCard } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { LedgerSelect } from "@/components/accounting/ledger-select"
import { useAuth } from "@/lib/auth"

export default function BillEntriesPage() {
  const { hasPermission } = useAuth()
  const [billEntries, setBillEntries] = useState<BillEntry[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([])
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<BillEntry | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddingLineItem, setIsAddingLineItem] = useState(false)
  const [lineItems, setLineItems] = useState<BillEntryDetail[]>([])
  const [lineItemForm, setLineItemForm] = useState({
    ledgerId: "",
    description: "",
    amount: "",
  })
  const [formData, setFormData] = useState({
    supplierInvoiceNumber: "",
    supplierId: "",
    billDate: "",
    dueDate: "",
    description: "",
    amount: "",
    taxRate: "0",
    taxAmount: "0",
    currencyCode: "LKR",
    paymentTerms: "Net 30",
  })
  const { toast } = useToast()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, statusFilter])

  useEffect(() => {
    loadData()
  }, [currentPage, pageSize, debouncedSearchTerm, statusFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      const [billsResponse, suppliersData, ledgersData, locationsData] = await Promise.all([
        billEntriesApi.getAll<BillEntry>({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearchTerm,
          status: statusFilter
        }),
        suppliersApi.getExpenseSuppliers<Supplier>(),
        ledgerAccountsApi.getExpenseAccounts<LedgerAccount>(),
        locationsApi.getAll<Location>()
      ])

      if (billsResponse && 'data' in billsResponse) {
        setBillEntries(billsResponse.data)
        setTotalCount(billsResponse.pagination.total)
        setTotalPages(billsResponse.pagination.totalPages)
      } else {
        setBillEntries(Array.isArray(billsResponse) ? billsResponse : [])
      }

      setSuppliers(Array.isArray(suppliersData) ? suppliersData : (suppliersData as any)?.data || [])
      setLedgers(Array.isArray(ledgersData) ? ledgersData : (ledgersData as any)?.data || [])

      const locations = Array.isArray(locationsData) ? locationsData : []
      const location = locations.find(l => l.isActive) || locations[0]
      setCurrentLocation(location || null)

      // Set default tax rate for new entries
      if (location && !selectedBill) {
        setFormData(prev => ({
          ...prev,
          taxRate: (parseFloat(location.taxRate) || 18).toString()
        }))
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load data",
        variant: "destructive",
      })
      setBillEntries([])
      setSuppliers([])
      setLedgers([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      supplierInvoiceNumber: "",
      supplierId: "",
      billDate: "",
      dueDate: "",
      description: "",
      amount: "",
      taxRate: (currentLocation?.taxRate || "18").toString(),
      taxAmount: "0",
      currencyCode: "LKR",
      paymentTerms: "Net 30",
    })
    setLineItems([])
    setLineItemForm({
      ledgerId: "",
      description: "",
      amount: "",
    })
    setIsAddingLineItem(false)
    setSelectedBill(null)
  }

  const calculateTotalAmount = () => {
    return lineItems.reduce((sum, item) => sum + (parseFloat(item.amount?.toString() || "0")), 0)
  }

  const handleAddLineItem = () => {
    if (!lineItemForm.ledgerId || !lineItemForm.amount) {
      toast({
        title: "Validation Error",
        description: "Please select ledger and enter amount",
        variant: "destructive",
      })
      return
    }

    const newLineItem: BillEntryDetail = {
      ledgerId: parseInt(lineItemForm.ledgerId),
      description: lineItemForm.description,
      amount: parseFloat(lineItemForm.amount),
      quantity: 1,
    }

    setLineItems([...lineItems, newLineItem])
    setLineItemForm({
      ledgerId: "",
      description: "",
      amount: "",
    })
    // toast({
    //   title: "Success",
    //   description: "Line item added",
    // })
  }

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
    // toast({
    //   title: "Success",
    //   description: "Line item removed",
    // })
  }

  useEffect(() => {
    const subtotal = calculateTotalAmount()
    const rate = parseFloat(formData.taxRate) || 0
    const calculatedTax = subtotal * (rate / 100)

    setFormData(prev => ({
      ...prev,
      taxAmount: calculatedTax.toFixed(2)
    }))
  }, [lineItems, formData.taxRate])

  const handleViewBill = (bill: BillEntry) => {
    setSelectedBill(bill)
    setLineItems(bill.Details || bill.details || [])
    setIsViewDialogOpen(true)
  }

  const handleEditBill = (bill: BillEntry) => {
    setSelectedBill(bill)
    setFormData({
      supplierInvoiceNumber: bill.supplierInvoiceNumber || "",
      supplierId: bill.supplierId.toString(),
      billDate: bill.billDate.split('T')[0],
      dueDate: bill.dueDate.split('T')[0],
      description: bill.description || "",
      amount: bill.amount.toString(),
      taxRate: bill.taxRate.toString(),
      taxAmount: (bill.taxAmount || 0).toString(),
      currencyCode: bill.currencyCode || "LKR",
      paymentTerms: bill.paymentTerms || "Net 30",
    })
    setLineItems(bill.Details || bill.details || [])
    setIsEditDialogOpen(true)
  }

  const handleUpdateBill = async () => {
    if (!selectedBill) return

    try {
      const totalAmount = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount?.toString() || "0")), 0)

      await billEntriesApi.update(selectedBill.id, {
        supplierInvoiceNumber: formData.supplierInvoiceNumber,
        description: formData.description,
        amount: totalAmount,
        taxRate: parseFloat(formData.taxRate) || 0,
        taxAmount: parseFloat(formData.taxAmount) || 0,
        dueDate: formData.dueDate,
        paymentTerms: formData.paymentTerms,
      })

      toast({
        title: "Success",
        description: "Bill entry updated successfully",
      })
      setIsEditDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update bill entry",
        variant: "destructive",
      })
    }
  }

  const handleCreateBillEntry = async () => {
    if (!formData.supplierId || !formData.supplierInvoiceNumber || !formData.billDate || !formData.dueDate) {
      toast({
        title: "Validation Error",
        description: "Please fill supplier, supplier invoice number, bill date, and due date",
        variant: "destructive",
      })
      return
    }

    if (lineItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one line item",
        variant: "destructive",
      })
      return
    }

    try {
      const totalAmount = calculateTotalAmount()

      await billEntriesApi.create({
        supplierId: parseInt(formData.supplierId),
        supplierInvoiceNumber: formData.supplierInvoiceNumber,
        billDate: formData.billDate,
        dueDate: formData.dueDate,
        description: formData.description,
        amount: totalAmount,
        taxRate: parseFloat(formData.taxRate) || 0,
        taxAmount: parseFloat(formData.taxAmount) || 0,
        currencyCode: formData.currencyCode,
        paymentTerms: formData.paymentTerms,
        details: lineItems,
      })
      toast({
        title: "Success",
        description: "Bill entry created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create bill entry",
        variant: "destructive",
      })
    }
  }

  const handleDeleteBillEntry = async (id: number) => {
    try {
      await billEntriesApi.remove(id)
      toast({
        title: "Success",
        description: "Bill entry deleted successfully",
      })
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bill entry",
        variant: "destructive",
      })
    }
  }

  const handleApproveBill = async (id: number) => {
    try {
      await billEntriesApi.approve(id)
      toast({
        title: "Success",
        description: "Bill entry approved successfully",
      })
      setIsViewDialogOpen(false)
      setIsEditDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve bill entry",
        variant: "destructive",
      })
    }
  }

  const handleSubmitBill = async (id: number) => {
    try {
      await billEntriesApi.submit(id)
      toast({
        title: "Success",
        description: "Bill entry submitted successfully",
      })
      setIsViewDialogOpen(false)
      setIsEditDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit bill entry",
        variant: "destructive",
      })
    }
  }

  const handlePostBill = async (id: number) => {
    try {
      await billEntriesApi.post(id)
      toast({
        title: "Success",
        description: "Bill entry posted successfully",
      })
      setIsViewDialogOpen(false)
      setIsEditDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: "Failed to post bill entry",
        description: error.message || "Failed to post bill entry",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      Draft: "bg-gray-100 text-gray-800",
      Submitted: "bg-blue-100 text-blue-800",
      Approved: "bg-green-100 text-green-800",
      Posted: "bg-purple-100 text-purple-800",
      Rejected: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }



  if (loading) {
    return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  return (
    <ERPLayout>
      {/* View Bill Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Bill Entry - {selectedBill?.billNumber}</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-6">
              {/* Bill Information Section */}
              <div className="bg-accent p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Bill Number</p>
                    <p className="font-mono font-semibold">{selectedBill.billNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Supplier</p>
                    <p className="font-semibold">{selectedBill.Supplier?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Supplier Invoice #</p>
                    <p className="font-semibold">{selectedBill.supplierInvoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bill Date</p>
                    <p className="font-semibold">{new Date(selectedBill.billDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-semibold">{new Date(selectedBill.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax Amount</p>
                    <p className="font-mono font-semibold">{parseFloat(selectedBill.taxAmount?.toString() || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-mono font-semibold">{parseFloat(selectedBill.totalAmount?.toString() || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={`capitalize ${getStatusColor(selectedBill.status)}`}>
                      {selectedBill.status}
                    </Badge>
                  </div>
                </div>
                {selectedBill.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{selectedBill.description}</p>
                  </div>
                )}
              </div>

              {/* Line Items Section */}
              <div className="space-y-3">
                <h3 className="font-semibold">Line Items</h3>
                {lineItems.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ledger Account</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          {/* <TableHead className="text-right">Tax</TableHead> */}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((item, index) => {
                          const ledger = ledgers.find(l => l.id === item.ledgerId)
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{ledger?.name || "Unknown"}</TableCell>
                              <TableCell className="text-sm">{item.description || "-"}</TableCell>
                              <TableCell className="text-right">{parseFloat(item.quantity?.toString() || "0").toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">{parseFloat(item.amount?.toString() || "0").toFixed(2)}</TableCell>
                              {/* <TableCell className="text-right font-mono">{parseFloat(item.taxAmount?.toString() || "0").toFixed(2)}</TableCell> */}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg">
                    No line items found
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedBill && selectedBill.status === "Draft" && (
              <Button onClick={() => handleSubmitBill(selectedBill.id)} className="bg-blue-600 hover:bg-blue-700">
                Submit Bill
              </Button>
            )}
            {selectedBill && selectedBill.status === "Submitted" && (
              <Button onClick={() => handleApproveBill(selectedBill.id)} className="bg-green-600 hover:bg-green-700">
                Approve Bill
              </Button>
            )}
            {selectedBill && selectedBill.status === "Approved" && (
              <Button onClick={() => handlePostBill(selectedBill.id)} className="bg-purple-600 hover:bg-purple-700">
                Post Bill
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bill Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bill Entry - {selectedBill?.billNumber}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="editBillDate">Bill Date</Label>
              <Input
                id="editBillDate"
                type="date"
                value={formData.billDate}
                onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editDueDate">Due Date</Label>
              <Input
                id="editDueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="editDescription">Description</Label>
              <Input
                id="editDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Bill description"
              />
            </div>
            <div>
              <Label htmlFor="editTaxRate">Tax Rate (%)</Label>
              <Input
                id="editTaxRate"
                type="number"
                step="0.01"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="editTaxAmount">Tax Amount</Label>
              <Input
                id="editTaxAmount"
                type="number"
                readOnly
                value={formData.taxAmount}
                placeholder="0.00"
                className="bg-slate-50"
              />
            </div>
            <div>
              <Label htmlFor="editPaymentTerms">Payment Terms</Label>
              <Input
                id="editPaymentTerms"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                placeholder="Net 30"
              />
            </div>
          </div>

          {/* Line Items Display in Edit Mode */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold">Line Items</h3>
            {lineItems.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ledger Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => {
                      const ledger = ledgers.find(l => l.id === item.ledgerId)
                      return (
                        <TableRow key={index}>
                          <TableCell className="py-2 font-medium">{ledger?.name || "Unknown"}</TableCell>
                          <TableCell className="py-2 text-sm">{item.description || "-"}</TableCell>
                          <TableCell className="py-2 text-right font-mono">{parseFloat(item.amount?.toString() || "0").toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg">
                No line items found
              </div>
            )}
            <div className="bg-accent p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Bill Amount:</span>
                <span className="font-mono text-lg font-bold">
                  {lineItems.reduce((sum, item) => sum + (parseFloat(item.amount?.toString() || "0")), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBill}>
              Update Bill Entry
            </Button>
            {selectedBill && selectedBill.status === "Submitted" && (
              <Button onClick={() => handleApproveBill(selectedBill.id)} className="bg-green-600 hover:bg-green-700">
                Approve Bill
              </Button>
            )}
            {selectedBill && selectedBill.status === "Approved" && (
              <Button onClick={() => handlePostBill(selectedBill.id)} className="bg-purple-600 hover:bg-purple-700">
                Post Bill
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Bill Entries</h1>
            <p className="text-muted-foreground mt-1">Manage supplier bills and invoices</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Bill Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
              <DialogHeader className="pb-0">
                <DialogTitle className="text-xl">New Bill Entry</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Quick Info Section */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <Label htmlFor="supplier" className="text-xs font-medium">Supplier *</Label>
                    <Select value={formData.supplierId} onValueChange={(value) => setFormData({ ...formData, supplierId: value })}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent className="max-h-40">
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Label htmlFor="supplierInvoiceNumber" className="text-xs font-medium">Supplier Invoice <span className="text-red-500">*</span></Label>
                    <Input
                      id="supplierInvoiceNumber"
                      value={formData.supplierInvoiceNumber}
                      onChange={(e) => setFormData({ ...formData, supplierInvoiceNumber: e.target.value })}
                      placeholder="Enter Invoice Number"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="col-span-1 grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="billDate" className="text-xs font-medium">Bill Date *</Label>
                      <Input
                        id="billDate"
                        type="date"
                        value={formData.billDate}
                        onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dueDate" className="text-xs font-medium">Due Date *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="description" className="text-xs font-medium">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Bill notes"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentTerms" className="text-xs font-medium">Payment Terms</Label>
                    <Input
                      id="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      placeholder="Net 30"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Line Items Header */}
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-md">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold">Line Items ({lineItems.length})</h3>
                  </div>
                  {/* <div className="flex gap-2">
                    {lineItems.length > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-sm font-bold">{calculateTotalAmount().toFixed(2)}</p>
                      </div>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs"
                      variant={isAddingLineItem ? "destructive" : "default"}
                      onClick={() => setIsAddingLineItem(!isAddingLineItem)}
                    >
                      {isAddingLineItem ? "Cancel" : "+ Add"}
                    </Button>
                  </div> */}
                </div>

                {/* Add Line Item Form */}
                {/* {isAddingLineItem && ( */}
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4">
                      <Label htmlFor="ledger" className="text-xs font-medium">Ledger <span className="text-red-500">*</span></Label>
                      <LedgerSelect
                        ledgers={ledgers}
                        value={lineItemForm.ledgerId}
                        onValueChange={(value) => setLineItemForm({ ...lineItemForm, ledgerId: value })}
                        placeholder="Select ledger"
                        className="h-8 text-xs font-normal"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label htmlFor="lineDescription" className="text-xs font-medium">Description</Label>
                      <Input
                        id="lineDescription"
                        value={lineItemForm.description}
                        onChange={(e) => setLineItemForm({ ...lineItemForm, description: e.target.value })}
                        placeholder="Item desc"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="lineAmount" className="text-xs font-medium">Amount <span className="text-red-500">*</span></Label>
                      <Input
                        id="lineAmount"
                        type="number"
                        step="0.01"
                        value={lineItemForm.amount}
                        onChange={(e) => setLineItemForm({ ...lineItemForm, amount: e.target.value })}
                        placeholder="0.00"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2 flex items-end">
                      <Button type="button" onClick={handleAddLineItem} size="sm" className="h-8 w-full text-xs">
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
                {/* )} */}

                {/* Line Items Table */}
                {lineItems.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <Table className="text-xs">
                        <TableHeader className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                          <TableRow>
                            <TableHead className="font-semibold h-8 py-2">Ledger</TableHead>
                            <TableHead className="font-semibold h-8 py-2">Description</TableHead>
                            <TableHead className="text-right font-semibold h-8 py-2 w-20">Amount</TableHead>
                            <TableHead className="text-center h-8 py-2 w-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineItems.map((item, index) => {
                            const ledger = ledgers.find(l => l.id === item.ledgerId)
                            return (
                              <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                                <TableCell className="font-medium py-1 text-xs">{ledger?.name} ({ledger?.ledgerCode})</TableCell>
                                <TableCell className="text-xs py-1 text-muted-foreground">{item.description || "-"}</TableCell>
                                <TableCell className="text-right font-mono font-semibold py-1 text-xs">{parseFloat(item.amount?.toString() || "0").toFixed(2)}</TableCell>
                                <TableCell className="text-center py-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => handleRemoveLineItem(index)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-md">
                    No items yet. Click "Add" to start.
                  </div>
                )}

                {/* Additional Info */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                  <div>
                    <Label htmlFor="taxRate" className="text-xs font-medium">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.01"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                      placeholder="18.00"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxAmount" className="text-xs font-medium">Tax Amount</Label>
                    <Input
                      id="taxAmount"
                      type="number"
                      step="0.01"
                      readOnly
                      value={formData.taxAmount}
                      placeholder="0.00"
                      className="h-9 text-sm bg-slate-50"
                    />
                  </div>
                  <div className="flex items-end pb-0">
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md w-full border border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-700 dark:text-green-300">Total</p>
                      <p className="font-bold text-sm text-green-900 dark:text-green-100">
                        {(calculateTotalAmount() + (parseFloat(formData.taxAmount) || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} size="sm" className="text-sm">
                  Cancel
                </Button>
                <Button onClick={handleCreateBillEntry} disabled={!formData.supplierId || !formData.billDate || !formData.dueDate || lineItems.length === 0} size="sm" className="text-sm">
                  Create Bill
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            {/* <CardTitle>Bill Entries List</CardTitle> */}
            <CardDescription>All supplier bill entries and invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search bills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Posted">Posted</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table className="text-xs">
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Bill Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billEntries.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="py-2 font-mono text-sm">{bill.billNumber}</TableCell>
                        <TableCell className="py-2">{bill.Supplier?.name || "-"}</TableCell>
                        <TableCell className="py-2 text-sm">{new Date(bill.billDate).toLocaleDateString()}</TableCell>
                        <TableCell className="py-2 text-sm">{new Date(bill.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell className="py-2 font-mono text-sm">{parseFloat(bill.totalAmount?.toString() || "0").toFixed(2)}</TableCell>
                        <TableCell className="py-2 font-mono text-sm">{parseFloat(bill.paidAmount?.toString() || "0").toFixed(2)}</TableCell>
                        <TableCell className="py-2">
                          <Badge className={`capitalize ${getStatusColor(bill.status)}`}>
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="View Bill" onClick={() => handleViewBill(bill)}>
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            {((bill.status === "Draft") || (bill.status === "Posted") && hasPermission("bill-entry:edit")) && (
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Edit Bill" onClick={() => handleEditBill(bill)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {(bill.status === "Draft") && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Delete Bill">
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-600">Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      <br />
                                      This action cannot be undone. This will permanently delete the Bill Entry.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                      onClick={() => handleDeleteBillEntry(bill.id!)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                            )}

                            {bill.status === "Posted" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/accounting/bill-payments?supplierId=${bill.supplierId}&billId=${bill.id}&action=new`)}
                                title="Pay Bill"
                                className="h-7 w-7 p-0 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {billEntries.length} of {totalCount} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                    <Select value={pageSize.toString()} onValueChange={(value) => {
                      setPageSize(parseInt(value))
                      setCurrentPage(1)
                    }}>
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  )
}
