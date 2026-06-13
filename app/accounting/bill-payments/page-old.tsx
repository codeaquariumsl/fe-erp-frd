"use client"

import { useState, useEffect } from "react"
import { Plus, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { billPaymentsApi, suppliersApi, billEntriesApi, BillPayment, Supplier, BillEntry } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"

export default function BillPaymentsPage() {
  const [billPayments, setBillPayments] = useState<BillPayment[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [approvedBills, setApprovedBills] = useState<BillEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedBillPayment, setSelectedBillPayment] = useState<BillPayment | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedBills, setSelectedBills] = useState<{ billId: number; amount: number }[]>([])
  const [formData, setFormData] = useState({
    supplierId: "",
    paymentDate: "",
    paymentMethod: "Bank Transfer",
    bankAccountId: "",
    description: "",
    referenceNumber: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadBillPayments()
    loadSuppliers()
  }, [])

  const loadBillPayments = async () => {
    try {
      setLoading(true)
      const data = await billPaymentsApi.getAll<BillPayment>()
      setBillPayments(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load bill payments",
        variant: "destructive",
      })
      setBillPayments([])
    } finally {
      setLoading(false)
    }
  }

  const loadSuppliers = async () => {
    try {
      const data = await suppliersApi.getAll<Supplier>()
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Failed to load suppliers:", error)
    }
  }

  const loadApprovedBills = async (supplierId: string) => {
    if (!supplierId) {
      setApprovedBills([])
      return
    }
    try {
      const data = await billEntriesApi.getOutstanding(parseInt(supplierId))
      setApprovedBills(Array.isArray(data) ? data : [])
      setSelectedBills([])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load outstanding bills",
        variant: "destructive",
      })
      setApprovedBills([])
    }
  }

  const resetForm = () => {
    setFormData({
      supplierId: "",
      paymentDate: "",
      paymentMethod: "Bank Transfer",
      bankAccountId: "",
      description: "",
      referenceNumber: "",
    })
    setSelectedBills([])
    setApprovedBills([])
  }

  const handleBillSelection = (billId: number, billAmount: number, isChecked: boolean) => {
    if (isChecked) {
      setSelectedBills([...selectedBills, { billId, amount: billAmount }])
    } else {
      setSelectedBills(selectedBills.filter(b => b.billId !== billId))
    }
  }

  const getTotalAmount = () => {
    return selectedBills.reduce((sum, item) => {
      const bill = approvedBills.find(b => b.id === item.billId)
      return sum + (parseFloat(bill?.totalAmount?.toString() || "0") || 0)
    }, 0)
  }

  const handleCreateBillPayment = async () => {
    if (!formData.supplierId || !formData.paymentDate || selectedBills.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select supplier, payment date, and at least one bill",
        variant: "destructive",
      })
      return
    }

    try {
      const totalAmount = getTotalAmount()
      const payment = await billPaymentsApi.create({
        supplierId: parseInt(formData.supplierId),
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod as any,
        bankAccountId: formData.bankAccountId ? parseInt(formData.bankAccountId) : undefined,
        amount: totalAmount,
        description: formData.description,
        referenceNumber: formData.referenceNumber,
      })

      // Allocate bills to payment
      if (payment.id) {
        await billPaymentsApi.allocate(payment.id, {
          allocations: selectedBills.map(b => ({
            billEntryId: b.billId,
            allocatedAmount: approvedBills.find(bill => bill.id === b.billId)?.totalAmount || 0,
          }))
        })
      }

      toast({
        title: "Success",
        description: "Bill payment created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadBillPayments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create bill payment",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      Draft: "bg-gray-100 text-gray-800",
      Allocated: "bg-yellow-100 text-yellow-800",
      Submitted: "bg-blue-100 text-blue-800",
      Approved: "bg-green-100 text-green-800",
      Posted: "bg-purple-100 text-purple-800",
      Cancelled: "bg-orange-100 text-orange-800",
      Rejected: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const filteredBillPayments = billPayments.filter(
    (payment) =>
      (statusFilter === "All" || payment.status === statusFilter) &&
      (payment.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  return (
    <ERPLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bill Payments</h1>
            <p className="text-muted-foreground mt-1">Manage payments to suppliers</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Bill Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
              <DialogHeader className="pb-0">
                <DialogTitle className="text-xl">New Bill Payment</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Payment Information Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="supplier" className="text-xs font-medium">Supplier *</Label>
                    <Select value={formData.supplierId} onValueChange={(value) => {
                      setFormData({ ...formData, supplierId: value })
                      loadApprovedBills(value)
                    }}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentDate" className="text-xs font-medium">Payment Date *</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="paymentMethod" className="text-xs font-medium">Payment Method</Label>
                    <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="LC">LC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="referenceNumber" className="text-xs font-medium">Reference Number</Label>
                    <Input
                      id="referenceNumber"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="Cheque/Transfer ref"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs font-medium">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Payment description"
                    className="h-9 text-sm"
                  />
                </div>

                {/* Outstanding Bills Section */}
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-md">
                  <h3 className="text-sm font-semibold">Outstanding Bills ({selectedBills.length})</h3>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total to Pay</p>
                    <p className="text-sm font-bold">{getTotalAmount().toFixed(2)}</p>
                  </div>
                </div>

                {approvedBills.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <Table className="text-xs">
                        <TableHeader className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead className="font-semibold">Bill #</TableHead>
                            <TableHead className="font-semibold">Amount</TableHead>
                            <TableHead className="text-right font-semibold">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {approvedBills.map((bill) => (
                            <TableRow key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                              <TableCell className="py-1">
                                <Checkbox
                                  checked={selectedBills.some(b => b.billId === bill.id)}
                                  onCheckedChange={(checked) => handleBillSelection(bill.id, bill.totalAmount || 0, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell className="font-medium py-1 text-xs">{bill.billNumber}</TableCell>
                              <TableCell className="text-right font-mono py-1 text-xs">{parseFloat(bill.totalAmount?.toString() || "0").toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono py-1 text-xs">{parseFloat((bill.totalAmount - (bill.paidAmount || 0))?.toString() || "0").toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-md">
                    {formData.supplierId ? "No outstanding bills found for this supplier" : "Select a supplier to view outstanding bills"}
                  </div>
                )}

                {/* Summary Section */}
                {selectedBills.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md border border-green-200 dark:border-green-800">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-green-700 dark:text-green-300">Bills Selected</p>
                        <p className="font-bold text-sm text-green-900 dark:text-green-100">{selectedBills.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-700 dark:text-green-300">Total Amount</p>
                        <p className="font-bold text-sm text-green-900 dark:text-green-100">{getTotalAmount().toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-700 dark:text-green-300">Payment Method</p>
                        <p className="font-bold text-sm text-green-900 dark:text-green-100">{formData.paymentMethod}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} size="sm" className="text-sm">
                  Cancel
                </Button>
                <Button onClick={handleCreateBillPayment} disabled={!formData.supplierId || !formData.paymentDate || selectedBills.length === 0} size="sm" className="text-sm">
                  Create Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            {/* <CardTitle>Bill Payments List</CardTitle> */}
            <CardDescription>All supplier bill payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search payments..."
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
                    <SelectItem value="Allocated">Allocated</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Posted">Posted</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredBillPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bill payments found
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment #</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBillPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">{payment.paymentNumber}</TableCell>
                          <TableCell>{payment.supplier?.name || "-"}</TableCell>
                          <TableCell className="text-sm">{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm">{payment.paymentMethod}</TableCell>
                          <TableCell className="font-mono text-sm">{parseFloat(payment.amount?.toString() || "0").toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={`capitalize ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/accounting/bill-payments/${payment.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  )
}
