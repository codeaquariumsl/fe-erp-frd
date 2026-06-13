"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Trash2, Eye, Printer, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { onePaymentsApi, ledgerAccountsApi, paymentTypesApi, OnePayment, LedgerAccount, OnePaymentLine, OnePaymentMethod, PaymentType, PaginatedResponse } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { generatePaymentVoucherPDF, generateChequePDF, type ChequePrintData } from "@/lib/pdf-generator"
import { LedgerSelect } from "@/components/accounting/ledger-select"

export default function OnePaymentsPage() {
  const [payments, setPayments] = useState<OnePayment[]>([])
  const [expenseAccounts, setExpenseAccounts] = useState<LedgerAccount[]>([])
  const [paymentAccounts, setPaymentAccounts] = useState<LedgerAccount[]>([])
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<OnePayment | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [reversalReason, setReversalReason] = useState("")
  const [searchInput, setSearchInput] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const isProcessingRef = useRef(false)

  const [formData, setFormData] = useState({
    paymentDate: "",
    referenceNumber: "",
    description: "",
    currencyCode: "LKR",
  })

  const [lines, setLines] = useState<OnePaymentLine[]>([
    { lineType: "Debit" as const, ledgerAccountId: 0, amount: 0, description: "" },
  ])

  const [methods, setMethods] = useState<OnePaymentMethod[]>([
    { paymentMethod: "Bank Transfer", amount: 0, referenceNumber: "" },
  ])

  const { toast } = useToast()

  useEffect(() => {
    loadLedgerAccounts()
    loadPaymentTypes()
  }, [])

  useEffect(() => {
    loadPayments()
  }, [currentPage, searchTerm, statusFilter])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
      setCurrentPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const response = await onePaymentsApi.getAll<OnePayment>({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        status: statusFilter
      })

      const paymentsArray = response.data || []

      const normalizedPayments = paymentsArray.map((payment: any) => ({
        ...payment,
        totalAmount: parseFloat(payment.totalPaymentAmount || payment.totalAmount || 0),
        lines: (payment.Lines || payment.lines || []).map((line: any) => ({
          ...line,
          amount: parseFloat(line.amount || 0),
          ledgerAccount: line.LedgerAccount || line.ledgerAccount
        })),
        paymentMethods: (payment.PaymentMethods || payment.paymentMethods || []).map((method: any) => ({
          ...method,
          amount: parseFloat(method.amount || 0),
          ledgerAccount: method.LedgerAccount || method.ledgerAccount
        }))
      }))

      setPayments(normalizedPayments)
      setTotalItems(response.pagination?.total || 0)
      setTotalPages(response.pagination?.pages || response.pagination?.totalPages || 0)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load payments",
        variant: "destructive",
      })
      setPayments([])
      setTotalItems(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  const loadLedgerAccounts = async () => {
    try {
      const [expenseRes, paymentRes] = await Promise.all([
        ledgerAccountsApi.getAllAccounts<LedgerAccount>(),
        ledgerAccountsApi.getPaymentAccounts<LedgerAccount>()
      ])

      setExpenseAccounts((expenseRes as any)?.data || expenseRes || [])
      setPaymentAccounts((paymentRes as any)?.data || paymentRes || [])
    } catch (error: any) {
      console.error("Failed to load ledger accounts:", error)
    }
  }

  const loadPaymentTypes = async () => {
    try {
      const data = await paymentTypesApi.getAll()
      setPaymentTypes(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Failed to load payment types:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      paymentDate: "",
      referenceNumber: "",
      description: "",
      currencyCode: "LKR",
    })
    setLines([
      { lineType: "Debit", ledgerAccountId: 0, amount: 0, description: "" },
    ])
    setMethods([
      { paymentMethod: "Bank Transfer", amount: 0, referenceNumber: "", ledgerAccountId: 0 },
    ])
  }

  const addLine = () => {
    setLines([...lines, { lineType: "Debit", ledgerAccountId: 0, amount: 0, description: "" }])
  }

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index))
    }
  }

  const updateLine = (index: number, field: keyof OnePaymentLine, value: any) => {
    setLines(prev => {
      const newLines = [...prev]
      newLines[index] = { ...newLines[index], [field]: value }
      return newLines
    })
  }

  const addPaymentMethod = () => {
    setMethods([...methods, { paymentMethod: "Bank Transfer", amount: 0, referenceNumber: "", ledgerAccountId: 0 }])
  }

  const removePaymentMethod = (index: number) => {
    if (methods.length > 1) {
      setMethods(methods.filter((_, i) => i !== index))
    }
  }

  const updatePaymentMethod = (index: number, field: keyof OnePaymentMethod, value: any) => {
    setMethods(prev => {
      const newMethods = [...prev]
      newMethods[index] = { ...newMethods[index], [field]: value }
      return newMethods
    })
  }

  // Helper for batch updating payment method
  const batchUpdatePaymentMethod = (index: number, updates: Partial<OnePaymentMethod>) => {
    setMethods(prev => {
      const newMethods = [...prev]
      newMethods[index] = { ...newMethods[index], ...updates }
      return newMethods
    })
  }

  const calculateTotals = () => {
    const debitTotal = lines.reduce((sum, l) => sum + Number(l.amount || 0), 0)
    const creditTotal = methods.reduce((sum, m) => sum + Number(m.amount || 0), 0)
    return { debitTotal, creditTotal, paymentTotal: creditTotal, balanced: Math.abs(debitTotal - creditTotal) < 0.01 }
  }

  const handleCreatePayment = async () => {
    if (isProcessing || isProcessingRef.current) return
    isProcessingRef.current = true
    setIsProcessing(true)

    const totals = calculateTotals()

    if (!formData.paymentDate) {
      toast({
        title: "Validation Error",
        description: "Payment date is required",
        variant: "destructive",
      })
      return
    }

    if (!totals.balanced) {
      toast({
        title: "Validation Error",
        description: `Total payment lines (${totals.debitTotal.toFixed(2)}) must equal total payment methods (${totals.creditTotal.toFixed(2)})`,
        variant: "destructive",
      })
      return
    }

    if (lines.some(l => !l.ledgerAccountId || l.amount <= 0)) {
      toast({
        title: "Validation Error",
        description: "All payment lines must have a ledger account and amount",
        variant: "destructive",
      })
      return
    }

    if (methods.some(m => !m.ledgerAccountId || m.amount <= 0)) {
      toast({
        title: "Validation Error",
        description: "All payment methods must have an account and amount",
        variant: "destructive",
      })
      isProcessingRef.current = false
      setIsProcessing(false)
      return
    }

    // Cheque-specific validation
    const chequeMethod = methods.find(m => m.paymentMethod.toLowerCase().includes('cheque'))
    if (chequeMethod) {
      if (!chequeMethod.chequeNo?.trim()) {
        toast({ title: "Validation Error", description: "Cheque Number is required for cheque payments", variant: "destructive" })
        isProcessingRef.current = false
        setIsProcessing(false)
        return
      }
      if (!chequeMethod.chequeDate?.trim()) {
        toast({ title: "Validation Error", description: "Cheque Date is required for cheque payments", variant: "destructive" })
        isProcessingRef.current = false
        setIsProcessing(false)
        return
      }
      if (!chequeMethod.bankName?.trim()) {
        toast({ title: "Validation Error", description: "Bank Name is required for cheque payments", variant: "destructive" })
        isProcessingRef.current = false
        setIsProcessing(false)
        return
      }
    }

    try {
      await onePaymentsApi.create({
        paymentDate: formData.paymentDate,
        referenceNumber: formData.referenceNumber,
        description: formData.description,
        currencyCode: formData.currencyCode,
        lines: lines.map(l => ({
          lineType: l.lineType,
          ledgerAccountId: l.ledgerAccountId,
          amount: l.amount,
          description: l.description,
          referenceType: l.referenceType,
          referenceId: l.referenceId,
        })),
        paymentMethods: methods.map(m => ({
          paymentMethod: m.paymentMethod,
          bankAccountId: m.bankAccountId,
          ledgerAccountId: m.ledgerAccountId,
          amount: m.amount,
          referenceNumber: m.referenceNumber,
          ...(m.paymentMethod.toLowerCase().includes('cheque') ? {
            chequeNo: m.chequeNo,
            chequeDate: m.chequeDate,
            bankName: m.bankName,
          } : {}),
        })),
      })
      toast({
        title: "Success",
        description: "Payment created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadPayments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      isProcessingRef.current = false
    }
  }

  const handlePrintVoucher = (payment: OnePayment) => {
    try {
      generatePaymentVoucherPDF(payment)
      toast({
        title: "Success",
        description: "Payment voucher generated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate payment voucher",
        variant: "destructive",
      })
    }
  }

  const handleViewPayment = (payment: OnePayment) => {
    setSelectedPayment(payment)
    setIsViewDialogOpen(true)
  }

  const handleSubmit = async (paymentId: number) => {
    try {
      setIsProcessing(true)
      await onePaymentsApi.submit(paymentId)
      toast({ title: "Success", description: "Payment submitted successfully" })
      setIsViewDialogOpen(false)
      loadPayments()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit payment", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApprove = async (paymentId: number) => {
    try {
      setIsProcessing(true)
      await onePaymentsApi.approve(paymentId)
      toast({ title: "Success", description: "Payment approved successfully" })
      setIsViewDialogOpen(false)
      loadPayments()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to approve payment", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApproveAndPost = async (paymentId: number) => {
    try {
      setIsProcessing(true)
      await onePaymentsApi.approveAndPost(paymentId)
      toast({ title: "Success", description: "Payment approved and posted successfully" })
      setIsViewDialogOpen(false)
      loadPayments()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to approve and post payment", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePost = async (paymentId: number) => {
    try {
      setIsProcessing(true)
      await onePaymentsApi.post(paymentId)
      toast({ title: "Success", description: "Payment posted successfully" })
      setIsViewDialogOpen(false)
      loadPayments()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to post payment", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (paymentId: number) => {
    if (!rejectionReason.trim()) {
      toast({ title: "Validation Error", description: "Rejection reason is required", variant: "destructive" })
      return
    }
    try {
      setIsProcessing(true)
      await onePaymentsApi.reject(paymentId, { rejectionReason })
      toast({ title: "Success", description: "Payment rejected successfully" })
      setIsViewDialogOpen(false)
      setRejectionReason("")
      loadPayments()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reject payment", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReverse = async (paymentId: number) => {
    if (!reversalReason.trim()) {
      toast({ title: "Validation Error", description: "Reversal reason is required", variant: "destructive" })
      return
    }
    try {
      setIsProcessing(true)
      await onePaymentsApi.reverse(paymentId, { reversalReason })
      toast({ title: "Success", description: "Payment reversed successfully" })
      setIsViewDialogOpen(false)
      setReversalReason("")
      loadPayments()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reverse payment", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = async (paymentId: number) => {
    try {
      setIsProcessing(true)
      await onePaymentsApi.cancel(paymentId)
      toast({ title: "Success", description: "Payment cancelled successfully" })
      setIsViewDialogOpen(false)
      loadPayments()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to cancel payment", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrintCheque = (data: ChequePrintData) => {
    try {
      generateChequePDF(data)
      toast({ title: "Success", description: "Cheque PDF generated successfully" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate cheque PDF", variant: "destructive" })
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      Draft: "bg-gray-100 text-gray-800",
      Submitted: "bg-blue-100 text-blue-800",
      Approved: "bg-green-100 text-green-800",
      Posted: "bg-purple-100 text-purple-800",
      Rejected: "bg-red-100 text-red-800",
      Reversed: "bg-orange-100 text-orange-800",
      Cancelled: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  // Client-side filtering is now handled server-side
  const filteredPayments = payments

  const totals = calculateTotals()

  if (loading) {
    return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  return (
    <ERPLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">One-Time Payments</h1>
            <p className="text-muted-foreground mt-1">Manage general payments with flexible accounting entries</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create One-Time Payment</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Payment Header */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="paymentDate">Payment Date *</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="referenceNumber">Reference Number</Label>
                    <Input
                      id="referenceNumber"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="Enter Reference Number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currencyCode">Currency</Label>
                    <Select value={formData.currencyCode} onValueChange={(value) => setFormData({ ...formData, currencyCode: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LKR">LKR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Payment description"
                    />
                  </div>
                </div>

                {/* Payment Lines */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold">Payment Lines</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Line
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table className="text-xs">
                      <TableHeader className="bg-gray-100">
                        <TableRow>
                          <TableHead className="w-24">Type</TableHead>
                          <TableHead>Ledger Account</TableHead>
                          <TableHead className="w-32">Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-semibold text-blue-600 py-2">
                              Debit
                            </TableCell>
                            <TableCell className="py-2">
                              <LedgerSelect
                                value={line.ledgerAccountId?.toString() || ""}
                                onValueChange={(value) => updateLine(index, "ledgerAccountId", parseInt(value))}
                                ledgers={expenseAccounts}
                                placeholder="Select account"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={line.amount || ""}
                                onChange={(e) => updateLine(index, "amount", parseFloat(e.target.value) || 0)}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                value={line.description || ""}
                                onChange={(e) => updateLine(index, "description", e.target.value)}
                                className="h-8"
                                placeholder="Line description"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              {lines.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLine(index)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end gap-4 mt-2 text-sm">
                    <div className={`font-semibold ${totals.balanced ? "text-green-600" : "text-red-600"}`}>
                      Total Lines: {totals.debitTotal.toFixed(2)}
                      {!totals.balanced && " - Does not match Payment Methods!"}
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold">Payment Methods</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addPaymentMethod}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Method
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {methods.map((method, index) => {
                      const isCheque = method.paymentMethod.toLowerCase().includes('cheque')
                      return (
                        <div key={index} className={`border rounded-lg p-3 ${isCheque ? 'border-amber-200 bg-amber-50/40' : 'bg-gray-50/50'}`}>
                          <div className="grid grid-cols-12 gap-2 items-end">
                            {/* Payment Method selector */}
                            <div className={isCheque ? 'col-span-3' : 'col-span-4'}>
                              <Label className="text-xs text-muted-foreground mb-1 block">Method *</Label>
                              <Select
                                value={method.paymentMethod}
                                onValueChange={(value) => {
                                  batchUpdatePaymentMethod(index, {
                                    paymentMethod: value,
                                    ledgerAccountId: 0,
                                    bankAccountId: undefined,
                                    chequeNo: undefined,
                                    chequeDate: undefined,
                                    bankName: undefined,
                                  })
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {paymentTypes.filter(type => type.isActive).map((type) => (
                                    <SelectItem key={type.id} value={type.paymentTypeName}>
                                      {type.paymentTypeName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Ledger Account */}
                            <div className={isCheque ? 'col-span-3' : 'col-span-4'}>
                              <Label className="text-xs text-muted-foreground mb-1 block">Ledger Account *</Label>
                              <LedgerSelect
                                value={method.ledgerAccountId?.toString() || ""}
                                onValueChange={(value) => {
                                  const accountId = parseInt(value);
                                  const account = paymentAccounts.find(a => a.id === accountId);
                                  batchUpdatePaymentMethod(index, {
                                    ledgerAccountId: accountId,
                                    bankAccountId: account?.bankAccountId
                                  })
                                }}
                                ledgers={paymentAccounts.filter(acc => {
                                  const lowerMethod = method.paymentMethod.toLowerCase()
                                  if (lowerMethod.includes("cash")) return acc.ledgerType === "CASH" || acc.ledgerType === "PETTY_CASH" || acc.ledgerType === "CASH_BOOK"
                                  if (lowerMethod.includes("bank") || lowerMethod.includes("transfer") || lowerMethod.includes("cheque") || lowerMethod.includes("card")) return acc.ledgerType === "BANK"
                                  return true
                                })}
                                placeholder="Select account"
                              />
                            </div>

                            {/* Amount */}
                            <div className={isCheque ? 'col-span-2' : 'col-span-3'}>
                              <Label className="text-xs text-muted-foreground mb-1 block">Amount *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={method.amount || ""}
                                onChange={(e) => updatePaymentMethod(index, "amount", parseFloat(e.target.value) || 0)}
                                className="h-8"
                                placeholder="0.00"
                              />
                            </div>

                            {/* Reference (always shown) */}
                            <div className={isCheque ? 'col-span-3' : 'col-span-0 hidden'}>
                              {/* for non-cheque: show reference in a wider slot */}
                            </div>

                            {!isCheque && (
                              <div className="col-span-3">
                                <Label className="text-xs text-muted-foreground mb-1 block">Reference (Optional)</Label>
                                <Input
                                  value={method.referenceNumber || ""}
                                  onChange={(e) => updatePaymentMethod(index, "referenceNumber", e.target.value)}
                                  className="h-8"
                                  placeholder="Reference number"
                                />
                              </div>
                            )}

                            {/* Remove */}
                            <div className="col-span-1 flex justify-end pb-0.5">
                              {methods.length > 1 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => removePaymentMethod(index)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Cheque-specific fields — shown only when method is Cheque */}
                          {isCheque && (
                            <div className="mt-2 pt-2 border-t border-amber-200 grid grid-cols-4 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">
                                  Cheque No <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  value={method.chequeNo || ""}
                                  onChange={(e) => updatePaymentMethod(index, "chequeNo" as any, e.target.value)}
                                  className="h-8 font-mono"
                                  placeholder="e.g. 001234"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">
                                  Cheque Date <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  type="date"
                                  value={method.chequeDate || ""}
                                  onChange={(e) => updatePaymentMethod(index, "chequeDate" as any, e.target.value)}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">
                                  Bank Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  value={method.bankName || ""}
                                  onChange={(e) => updatePaymentMethod(index, "bankName" as any, e.target.value)}
                                  className="h-8"
                                  placeholder="e.g. Bank of Ceylon"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Reference (Optional)</Label>
                                <Input
                                  value={method.referenceNumber || ""}
                                  onChange={(e) => updatePaymentMethod(index, "referenceNumber", e.target.value)}
                                  className="h-8"
                                  placeholder="e.g. RTF-001"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-end mt-2 text-sm font-semibold">
                    Total Methods: {totals.creditTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePayment} disabled={isProcessing || !totals.balanced}>
                  {isProcessing ? "Creating..." : "Create Payment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardDescription>All one-time payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search payments..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value)
                  setCurrentPage(1)
                }}>
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
                    <SelectItem value="Reversed">Reversed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payments found
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <Table className="text-xs">
                      <TableHeader className="bg-gray-100">
                        <TableRow>
                          <TableHead>Payment #</TableHead>
                          <TableHead>Payment Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="py-2 font-mono">{payment.paymentNumber}</TableCell>
                            <TableCell className="py-2">{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                            <TableCell className="py-2">{payment.description || "-"}</TableCell>
                            <TableCell className="py-2 font-mono">{payment.totalAmount?.toFixed(2)}</TableCell>
                            <TableCell className="py-2">
                              <Badge className={`capitalize ${getStatusColor(payment.status)}`}>
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleViewPayment(payment)} title="View Payment">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {payment.status === "Posted" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePrintVoucher(payment)}
                                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                    title="Print Payment Voucher"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                )}
                                {/* Cheque print: show if any method name includes 'cheque' */}
                                {(payment.paymentMethods || payment.PaymentMethods || []).some((m: any) =>
                                  m.paymentMethod?.toLowerCase().includes('cheque')
                                ) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    title="Print Cheque"
                                    onClick={() => {
                                      const methods = payment.paymentMethods || payment.PaymentMethods || []
                                      const chqMethod = methods.find((m: any) => m.paymentMethod?.toLowerCase().includes('cheque'))
                                      if (chqMethod) {
                                        handlePrintCheque({
                                          payee: payment.description || "-",
                                          amount: parseFloat(chqMethod.amount?.toString() || "0"),
                                          chequeDate: chqMethod.chequeDate || payment.paymentDate,
                                          chequeNo: chqMethod.chequeNo,
                                          bankName: chqMethod.bankName,
                                          referenceNo: chqMethod.referenceNumber,
                                          documentNo: payment.paymentNumber,
                                          documentType: "One-Time Payment",
                                          preparedBy: payment.Creator?.fullName || payment.createdByUsername || undefined,
                                        })
                                      }
                                    }}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination UI */}
                  <div className="flex items-center justify-between px-2 py-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} payments
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
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
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* View Payment Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-4">
                {/* Payment Info */}
                <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Number</p>
                    <p className="font-mono font-bold">{selectedPayment.paymentNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reference Number</p>
                    <p className="font-mono font-bold">{selectedPayment.referenceNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Date</p>
                    <p>{new Date(selectedPayment.paymentDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="font-mono font-bold">{selectedPayment.totalAmount?.toFixed(2)} {selectedPayment.currencyCode}</p>
                  </div>
                  {selectedPayment.description && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p>{selectedPayment.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Created By</p>
                    <p>{selectedPayment.Creator?.fullName || selectedPayment.createdByUsername || "System"}</p>
                  </div>
                  {((selectedPayment as any).ApprovedByUser || selectedPayment.approvedByUsername) && (
                    <div>
                      <p className="text-xs text-muted-foreground">Approved By</p>
                      <p>{(selectedPayment as any).ApprovedByUser?.fullName || selectedPayment.approvedByUsername}</p>
                    </div>
                  )}
                  {((selectedPayment as any).PostedByUser || selectedPayment.postedByUsername) && (
                    <div>
                      <p className="text-xs text-muted-foreground">Posted By</p>
                      <p>{(selectedPayment as any).PostedByUser?.fullName || selectedPayment.postedByUsername}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={`capitalize ${getStatusColor(selectedPayment.status)}`}>
                      {selectedPayment.status}
                    </Badge>
                  </div>
                </div>

                {/* Payment Lines */}
                {selectedPayment.lines && selectedPayment.lines.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold mb-2 block">Payment Lines</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <Table className="text-xs">
                        <TableHeader className="bg-gray-100">
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Ledger Account</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPayment.lines.map((line, index) => (
                            <TableRow key={index}>
                              <TableCell className="py-2">
                                <Badge variant={line.lineType === "Debit" ? "default" : "secondary"}>
                                  {line.lineType}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2">{line.ledgerAccount?.name || `Account #${line.ledgerAccountId}`}</TableCell>
                              <TableCell className="py-2 font-mono">{line.amount.toFixed(2)}</TableCell>
                              <TableCell className="py-2">{line.description || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Payment Methods */}
                {selectedPayment.paymentMethods && selectedPayment.paymentMethods.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold mb-2 block">Payment Methods</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <Table className="text-xs">
                        <TableHeader className="bg-gray-100">
                          <TableRow>
                            <TableHead>Method</TableHead>                             <TableHead>Account</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Reference / Details</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPayment.paymentMethods.map((method, index) => {
                            const isChq = method.paymentMethod?.toLowerCase().includes('cheque')
                            return (
                              <TableRow key={index}>
                                <TableCell className="py-2">
                                  {method.paymentMethod}
                                  {isChq && <Badge variant="outline" className="ml-2 text-[8px] bg-amber-50 text-amber-700 border-amber-200">CHEQUE</Badge>}
                                </TableCell>
                                <TableCell className="py-2">{method.LedgerAccount?.name || `Account #${method.ledgerAccountId}`}</TableCell>
                                <TableCell className="py-2 font-mono">{Number(method.amount).toFixed(2)}</TableCell>
                                <TableCell className="py-2">
                                  <div className="flex flex-col gap-0.5">
                                    {method.referenceNumber && <span className="text-[10px]"><span className="text-muted-foreground mr-1">Ref:</span> {method.referenceNumber}</span>}
                                    {isChq && (
                                      <>
                                        {method.chequeNo && <span className="text-[10px]"><span className="text-muted-foreground mr-1">Chq#:</span> {method.chequeNo}</span>}
                                        {method.chequeDate && <span className="text-[10px] text-amber-700 italic">({new Date(method.chequeDate).toLocaleDateString()})</span>}
                                        {method.bankName && <span className="text-[10px] uppercase font-semibold text-blue-700">{method.bankName}</span>}
                                      </>
                                    )}
                                    {!method.referenceNumber && !isChq && <span className="text-muted-foreground">-</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  {isChq && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-[10px] text-amber-600 border-amber-300 hover:bg-amber-50"
                                      title="Print Cheque"
                                      onClick={() => handlePrintCheque({
                                        payee: selectedPayment.description || "-",
                                        amount: parseFloat(method.amount?.toString() || "0"),
                                        chequeDate: method.chequeDate || selectedPayment.paymentDate,
                                        chequeNo: method.chequeNo,
                                        bankName: method.bankName,
                                        referenceNo: method.referenceNumber,
                                        documentNo: selectedPayment.paymentNumber,
                                        documentType: "One-Time Payment",
                                        preparedBy: selectedPayment.Creator?.fullName || selectedPayment.createdByUsername || undefined,
                                      })}
                                    >
                                      <Printer className="h-3 w-3 mr-1" /> Cheque
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-semibold">Payment Workflow</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedPayment.status === "Draft" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="bg-blue-500 hover:bg-blue-600">Submit</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Submit Payment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Submit this payment for approval.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleSubmit(selectedPayment.id)} disabled={isProcessing}>
                              {isProcessing ? "Processing..." : "Submit"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {selectedPayment.status === "Submitted" && (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-green-500 hover:bg-green-600">Approve</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve Payment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Approve this payment. Once approved, it can be posted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleApprove(selectedPayment.id)} disabled={isProcessing}>
                                {isProcessing ? "Processing..." : "Approve"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="border-red-200 text-red-600">Reject</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reject Payment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                <div className="space-y-2 mt-2">
                                  <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                                  <Input
                                    id="rejection-reason"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Enter reason for rejection"
                                  />
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleReject(selectedPayment.id)} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
                                {isProcessing ? "Processing..." : "Reject"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}

                    {selectedPayment.status === "Submitted" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                            Approve & Post
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve & Post Payment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Approve this payment. Once approved, it will be posted to the accounting system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleApproveAndPost(selectedPayment.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? "Processing..." : "Approve & Post"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {selectedPayment.status === "Approved" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="bg-purple-500 hover:bg-purple-600">Post</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Post Payment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Post this payment to the accounting system. This will create journal entries.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handlePost(selectedPayment.id)} disabled={isProcessing}>
                              {isProcessing ? "Processing..." : "Post"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {selectedPayment.status === "Posted" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="border-orange-200 text-orange-600">Reverse</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reverse Payment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              <div className="space-y-2 mt-2">
                                <Label htmlFor="reversal-reason">Reversal Reason *</Label>
                                <Input
                                  id="reversal-reason"
                                  value={reversalReason}
                                  onChange={(e) => setReversalReason(e.target.value)}
                                  placeholder="Enter reason for reversal"
                                />
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleReverse(selectedPayment.id)} disabled={isProcessing} className="bg-orange-600 hover:bg-orange-700">
                              {isProcessing ? "Reversing..." : "Reverse"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {selectedPayment.status === "Draft" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-600">Cancel</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Payment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel this payment?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>No</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancel(selectedPayment.id)} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
                              {isProcessing ? "Processing..." : "Yes, Cancel"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
