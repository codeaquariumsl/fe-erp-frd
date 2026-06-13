"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Save, X, Trash2, Plus } from "lucide-react"
import {
  supplierPaymentsApi,
  suppliersApi,
  paymentTypesApi,
  ledgerAccountsApi,
  banksApi,
  bankBranchesApi,
  type Supplier,
  type CreateSupplierPaymentRequest,
  type OutstandingGRN,
  type PaymentType,
  type LedgerAccount,
  type Bank,
  type BankBranch,
} from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { LedgerSelect } from "@/components/accounting/ledger-select"

interface CreateSupplierPaymentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface SelectedGRN {
  grnId: number
  grnNumber: string
  grnAmount: number
  paidAmount: number
  grnNotes: string
}

interface PaymentEntry {
  id: string
  paymentTypeId: number
  paymentTypeName: string
  amount: number
  reference: string
  ledgerAccountId: number
  ledgerAccountName?: string
  cardType?: string
  bankId?: number
  bankName?: string
  bankBranchId?: number
  bankBranchName?: string
  chequeNo?: string
  chequeDate?: string
}

export function CreateSupplierPaymentForm({ open, onOpenChange, onSuccess }: CreateSupplierPaymentFormProps) {
  const [supplierId, setSelectedSupplierId] = useState<number>(0)
  const [dueDate, setDueDate] = useState<string>("")
  const [notes, setNotes] = useState<string>("")

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentType[]>([])
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankBranches, setBankBranches] = useState<BankBranch[]>([])

  const [outstandingGRNs, setOutstandingGRNs] = useState<OutstandingGRN[]>([])
  const [selectedGRNs, setSelectedGRNs] = useState<SelectedGRN[]>([])

  // Payment Entry State
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([])
  const [currentPaymentType, setCurrentPaymentType] = useState<PaymentType | null>(null)
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState("")
  const [currentPaymentReference, setCurrentPaymentReference] = useState("")
  const [currentLedgerAccountId, setCurrentLedgerAccountId] = useState<number | undefined>(undefined)
  const [currentCardType, setCurrentCardType] = useState("")
  const [currentBankId, setCurrentBankId] = useState<number | undefined>(undefined)
  const [currentBankBranchId, setCurrentBankBranchId] = useState<number | undefined>(undefined)
  const [currentChequeNo, setCurrentChequeNo] = useState("")
  const [currentChequeDate, setCurrentChequeDate] = useState("")
  const [filteredBranches, setFilteredBranches] = useState<BankBranch[]>([])

  const [loading, setLoading] = useState(false)
  const [grnLoading, setGrnLoading] = useState(false)
  const [summary, setSummary] = useState<{
    totalOutstandingGRNs: number
    incompletePaymentGRNs: number
    unpaidGRNs: number
    totalGRNAmount: number
    totalPaidAmount: number
    totalPendingAmount: number
  } | null>(null)

  useEffect(() => {
    if (open) {
      fetchMasterData()
    }
  }, [open])

  useEffect(() => {
    if (supplierId > 0 && open) {
      fetchSupplierPendingGRNs(supplierId)
      // Reset selections when supplier changes
      setSelectedGRNs([])
      setPaymentEntries([])
    } else {
      resetForm()
    }
  }, [supplierId, open])

  const fetchMasterData = async () => {
    try {
      const [suppliersData, paymentMethodsData, ledgerResponse, banksData, branchesData] = await Promise.all([
        suppliersApi.getAll(),
        paymentTypesApi.getAll(),
        ledgerAccountsApi.getPaymentAccounts(),
        banksApi.getAll({ status: 'Active' }),
        bankBranchesApi.getAll({ status: 'Active' })
      ])

      setSuppliers(suppliersData as Supplier[])
      setPaymentMethods((paymentMethodsData as PaymentType[]).filter(pt => pt.isActive))

      const ledgers = (ledgerResponse as any)?.data || []
      setLedgerAccounts(Array.isArray(ledgers) ? ledgers.filter((acc: any) => acc.status === 'Active') : [])

      setBanks(Array.isArray(banksData) ? banksData : [])
      setBankBranches(Array.isArray(branchesData) ? branchesData : [])

    } catch (error) {
      console.error("Error fetching master data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch master data",
        variant: "destructive",
      })
    }
  }

  const fetchSupplierPendingGRNs = async (sId: number) => {
    try {
      setGrnLoading(true)
      const response = await supplierPaymentsApi.getOutstandingGRNs(sId)

      setOutstandingGRNs(response.outstandingGRNs)
      setSummary(response.summary)
    } catch (error) {
      console.error("Error fetching outstanding GRNs:", error)
      toast({
        title: "Error",
        description: "Failed to fetch outstanding GRNs",
        variant: "destructive",
      })
    } finally {
      setGrnLoading(false)
    }
  }

  const handleAddPaymentEntry = () => {
    if (!currentPaymentType) {
      toast({
        title: "Validation Error",
        description: "Please select a payment type",
        variant: "destructive",
      })
      return
    }

    const amount = parseFloat(currentPaymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    if (!currentLedgerAccountId) {
      toast({
        title: "Error",
        description: "Please select a ledger account",
        variant: "destructive",
      })
      return
    }

    // Calculate remaining amount needed
    const totalGRNPayment = selectedGRNs.reduce((sum, grn) => sum + grn.paidAmount, 0)
    const currentPaid = paymentEntries.reduce((sum, p) => sum + p.amount, 0)
    const remaining = totalGRNPayment - currentPaid

    if (amount > remaining + 0.01) {
      toast({
        title: "Error",
        description: `Amount exceeds remaining balance of ${remaining.toFixed(2)}`,
        variant: "destructive",
      })
      return
    }

    // Cheque Validation
    if (currentPaymentType.paymentTypeName.toLowerCase().includes("cheque")) {
      if (!currentChequeNo) {
        toast({ title: "Error", description: "Cheque Number is required", variant: "destructive" })
        return
      }
      if (!currentChequeDate) {
        toast({ title: "Error", description: "Cheque Date is required", variant: "destructive" })
        return
      }
      if (!currentBankId) {
        toast({ title: "Error", description: "Bank is required for cheque payments", variant: "destructive" })
        return
      }
    }

    const newPayment: PaymentEntry = {
      id: Math.random().toString(36).substr(2, 9),
      paymentTypeId: currentPaymentType.id,
      paymentTypeName: currentPaymentType.paymentTypeName,
      amount: amount,
      reference: currentPaymentReference,
      ledgerAccountId: currentLedgerAccountId,
      ledgerAccountName: ledgerAccounts.find(la => la.id === currentLedgerAccountId)?.name,
      cardType: currentCardType || undefined,
      bankId: currentBankId,
      bankName: currentBankId
        ? banks.find(b => b.id === currentBankId)?.name
        : undefined,
      bankBranchId: currentBankBranchId,
      bankBranchName: currentBankBranchId
        ? bankBranches.find(bb => bb.id === currentBankBranchId)?.branchName
        : undefined,
      chequeNo: currentChequeNo || undefined,
      chequeDate: currentChequeDate || undefined,
    }

    setPaymentEntries([...paymentEntries, newPayment])

    // Reset inputs
    setCurrentPaymentType(null)
    setCurrentPaymentAmount("")
    setCurrentPaymentReference("")
    setCurrentLedgerAccountId(undefined)
    setCurrentCardType("")
    setCurrentBankId(undefined)
    setCurrentBankBranchId(undefined)
    setCurrentChequeNo("")
    setCurrentChequeDate("")
    setFilteredBranches([])
  }

  const handleRemovePaymentEntry = (id: string) => {
    setPaymentEntries(paymentEntries.filter(p => p.id !== id))
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      if (!supplierId) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      if (selectedGRNs.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one GRN for payment",
          variant: "destructive",
        })
        return
      }

      const totalAmount = selectedGRNs.reduce((sum, grn) => sum + grn.paidAmount, 0)
      const totalAllocated = paymentEntries.reduce((sum, p) => sum + p.amount, 0)

      if (paymentEntries.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one payment method",
          variant: "destructive",
        })
        return
      }

      if (Math.abs(totalAmount - totalAllocated) > 0.01) {
        toast({
          title: "Validation Error",
          description: `Total payment amount (${totalAllocated.toFixed(2)}) must match GRN payment total (${totalAmount.toFixed(2)})`,
          variant: "destructive",
        })
        return
      }

      const currentLocationId = typeof window !== "undefined" ? localStorage.getItem("selectedLocationId") : null;
      const locationId = currentLocationId ? parseInt(currentLocationId) : 0;

      const payload: CreateSupplierPaymentRequest = {
        supplierId: supplierId,
        locationId: locationId,
        amount: totalAmount,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        currency: "LKR",
        exchangeRate: 1.0,
        paymentGRNs: selectedGRNs.map(grn => ({
          grnId: grn.grnId,
          grnAmount: grn.grnAmount,
          paidAmount: grn.paidAmount,
          notes: grn.grnNotes || undefined
        })),
        paymentMethods: paymentEntries.map(entry => ({
          paymentTypeId: entry.paymentTypeId,
          paymentAmount: entry.amount,
          ledgerAccountId: entry.ledgerAccountId,
          referenceNumber: entry.reference,
          cardType: entry.cardType,
          bankId: entry.bankId,
          chequeNo: entry.chequeNo,
          chequeDate: entry.chequeDate
        }))
      }

      await supplierPaymentsApi.create(payload)

      toast({
        title: "Success",
        description: "Supplier payment created successfully",
      })

      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error("Error creating supplier payment:", error)
      toast({
        title: "Error",
        description: "Failed to create supplier payment",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedSupplierId(0)
    setDueDate("")
    setNotes("")
    setSelectedGRNs([])
    setPaymentEntries([])
    setOutstandingGRNs([])
    setSummary(null)
    setCurrentPaymentType(null)
    setCurrentPaymentAmount("")
  }

  const handleGRNSelection = (grn: OutstandingGRN, selected: boolean) => {
    if (selected) {
      const newSelected: SelectedGRN = {
        grnId: grn.GRN?.id || 0,
        grnNumber: grn.GRN?.grnNumber || `GRN-${grn.id}`,
        grnAmount: grn.grnAmount,
        paidAmount: grn.pendingAmount, // Default to pending amount
        grnNotes: grn.notes || ""
      }
      setSelectedGRNs([...selectedGRNs, newSelected])
    } else {
      setSelectedGRNs(selectedGRNs.filter(sg => sg.grnId !== (grn.GRN?.id || 0)))
    }
  }

  const handlePaidAmountChange = (grnId: number, paidAmount: number) => {
    setSelectedGRNs(selectedGRNs.map(sg =>
      sg.grnId === grnId ? { ...sg, paidAmount } : sg
    ))
  }

  const handleGRNNotesChange = (grnId: number, grnNotes: string) => {
    setSelectedGRNs(selectedGRNs.map(sg =>
      sg.grnId === grnId ? { ...sg, grnNotes } : sg
    ))
  }

  const totalGRNPaymentAmount = selectedGRNs.reduce((sum, grn) => sum + grn.paidAmount, 0)
  const totalAllocatedAmount = paymentEntries.reduce((sum, p) => sum + p.amount, 0)

  const isGRNSelected = (grnId: number) => selectedGRNs.some(sg => sg.grnId === grnId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Supplier Payment</DialogTitle>
          <DialogDescription>Select supplier, pending GRNs, and add payment methods</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {/* Supplier Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier">Supplier *</Label>
              <Select
                value={supplierId.toString() || ""}
                onValueChange={(value) => setSelectedSupplierId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id!.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


          {/* GRN Selection */}
          {supplierId > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Select Outstanding GRNs for Payment
                  {grnLoading && <span className="text-sm font-normal ml-2">Loading...</span>}
                </CardTitle>
                <CardDescription>
                  Select outstanding GRNs from the supplier and set payment amounts
                </CardDescription>
                {summary && !grnLoading && (
                  <div className="grid grid-cols-6 gap-4 mt-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-xs text-muted-foreground">Total Outstanding</div>
                      <div className="text-lg font-bold">{summary.totalOutstandingGRNs}</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <div className="text-xs text-muted-foreground">Incomplete Payments</div>
                      <div className="text-lg font-bold">{summary.incompletePaymentGRNs}</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded">
                      <div className="text-xs text-muted-foreground">Unpaid</div>
                      <div className="text-lg font-bold">{summary.unpaidGRNs}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-xs text-muted-foreground">Total Amount</div>
                      <div className="text-lg font-bold">LKR {summary.totalGRNAmount.toFixed(2)}</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded">
                      <div className="text-xs text-muted-foreground">Paid</div>
                      <div className="text-lg font-bold">LKR {summary.totalPaidAmount.toFixed(2)}</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded">
                      <div className="text-xs text-muted-foreground">Pending</div>
                      <div className="text-lg font-bold">LKR {summary.totalPendingAmount.toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {outstandingGRNs.length === 0 ? (
                  <p className="text-muted-foreground">No outstanding GRNs found for this supplier</p>
                ) : (
                  <div className="space-y-4">
                    {outstandingGRNs.map((grn) => (
                      <Card key={grn.GRN?.id || `unpaid-${grn.GRN?.grnNumber}`} className={`p-4 border ${grn.isUnpaid ? 'bg-red-50' : ''}`}>
                        <div className="grid gap-4">
                          <div className="flex items-start gap-4">
                            <Checkbox
                              id={`grn-${grn.GRN?.id}`}
                              checked={isGRNSelected(grn.GRN?.id || 0)}
                              onCheckedChange={(checked) => handleGRNSelection(grn, checked as boolean)}
                            />
                            <div className="flex-1">
                              <Label htmlFor={`grn-${grn.GRN?.id}`} className="cursor-pointer">
                                <div className="font-semibold flex items-center gap-2">
                                  GRN #{grn.GRN?.grnNumber || `GRN-${grn.id}`}
                                  {grn.isUnpaid && (
                                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">Unpaid</span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {grn.GRN?.grnDate && `Date: ${new Date(grn.GRN.grnDate).toLocaleDateString()}`}
                                  {grn.GRN?.status && ` | Status: ${grn.GRN.status}`}
                                </div>
                              </Label>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{grn.currency} {grn.grnAmount.toFixed(2)}</div>
                              <div className="text-sm text-muted-foreground">GRN Amount</div>
                              {!grn.isUnpaid && (
                                <>
                                  <div className="text-sm mt-1">Paid: {grn.currency} {grn.paidAmount.toFixed(2)}</div>
                                  <div className="text-sm font-semibold text-orange-600">Pending: {grn.currency} {grn.pendingAmount.toFixed(2)}</div>
                                </>
                              )}
                            </div>
                          </div>

                          {isGRNSelected(grn.GRN?.id || 0) && (
                            <div className="grid grid-cols-2 gap-4 pl-10 border-t pt-4">
                              <div>
                                <Label htmlFor={`paid-${grn.GRN?.id}`}>Amount to Pay * (Max: {grn.currency} {grn.pendingAmount.toFixed(2)})</Label>
                                <Input
                                  id={`paid-${grn.GRN?.id}`}
                                  type="number"
                                  step="0.01"
                                  value={selectedGRNs.find(sg => sg.grnId === (grn.GRN?.id || 0))?.paidAmount || 0}
                                  onChange={(e) => handlePaidAmountChange(grn.GRN?.id || 0, parseFloat(e.target.value) || 0)}
                                  max={grn.pendingAmount}
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`notes-${grn.GRN?.id}`}>Notes</Label>
                                <Input
                                  id={`notes-${grn.GRN?.id}`}
                                  value={selectedGRNs.find(sg => sg.grnId === (grn.GRN?.id || 0))?.grnNotes || ""}
                                  onChange={(e) => handleGRNNotesChange(grn.GRN?.id || 0, e.target.value)}
                                  placeholder="Optional notes"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Details */}
          {selectedGRNs.length > 0 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Methods</CardTitle>
                  <CardDescription>
                    Total to pay: <span className="font-bold text-lg text-primary">{totalGRNPaymentAmount.toFixed(2)}</span>
                    <br />
                    Allocated: <span className="font-bold">{totalAllocatedAmount.toFixed(2)}</span>
                    <br />
                    Remaining: <span className={totalGRNPaymentAmount - totalAllocatedAmount > 0.01 ? "text-red-500 font-bold" : "text-green-500"}>
                      {Number(totalGRNPaymentAmount - totalAllocatedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* List of Added Payments */}
                  {paymentEntries.length > 0 && (
                    <div className="border rounded-md overflow-hidden mb-4">
                      <Table className="text-xs">
                        <TableHeader className="bg-gray-200">
                          <TableRow>
                            <TableHead>Method</TableHead>
                            <TableHead>Ledger</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentEntries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="py-2 font-medium">{entry.paymentTypeName}</TableCell>
                              <TableCell className="py-2">{entry.ledgerAccountName}</TableCell>
                              <TableCell className="text-sm text-muted-foreground py-2">
                                {entry.reference && <div>Ref: {entry.reference}</div>}
                                {entry.bankName && <div>Bank: {entry.bankName}</div>}
                                {entry.chequeNo && <div>Cheque: {entry.chequeNo}</div>}
                              </TableCell>
                              <TableCell className="text-right font-bold py-2">{Number(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="py-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleRemovePaymentEntry(entry.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Add New Payment Section */}
                  {(totalGRNPaymentAmount - totalAllocatedAmount) > 0.01 && (
                    <div className="bg-muted/20 p-4 rounded-lg border space-y-4">
                      <Label className="font-semibold">Add Payment</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="payment-type">Payment Type</Label>
                          <Select
                            value={currentPaymentType?.id.toString() || ""}
                            onValueChange={(value) => {
                              const pt = paymentMethods.find(p => p.id === Number(value))
                              if (pt) setCurrentPaymentType(pt)
                            }}
                          >
                            <SelectTrigger id="payment-type">
                              <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethods.map((pt) => (
                                <SelectItem key={pt.id} value={pt.id.toString()}>
                                  {pt.paymentTypeName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="ledger-account">From Account</Label>
                          <LedgerSelect
                            value={currentLedgerAccountId?.toString() || ""}
                            onValueChange={(value) => setCurrentLedgerAccountId(Number(value))}
                            ledgers={ledgerAccounts.filter(acc => {
                              if (!currentPaymentType) return true;
                              const lowerMethod = currentPaymentType.paymentTypeName.toLowerCase();
                              if (lowerMethod.includes("cash")) {
                                return acc.ledgerType === "CASH" || acc.ledgerType === "PETTY_CASH" || acc.ledgerType === "CASH_BOOK";
                              }
                              if (lowerMethod.includes("bank") || lowerMethod.includes("transfer") || lowerMethod.includes("cheque") || lowerMethod.includes("card")) {
                                return acc.ledgerType === "BANK";
                              }
                              return true;
                            })}
                            placeholder="Select Account"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="payment-amount">Amount</Label>
                          <div className="flex gap-2">
                            <Input
                              id="payment-amount"
                              type="number"
                              placeholder="0.00"
                              value={currentPaymentAmount}
                              onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPaymentAmount((totalGRNPaymentAmount - totalAllocatedAmount).toFixed(2))}
                            >
                              Max
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Fields based on Payment Type */}
                      {currentPaymentType && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                          <div className="space-y-2">
                            <Label htmlFor="reference">Reference / Note</Label>
                            <Input
                              id="reference"
                              placeholder="Reference No"
                              value={currentPaymentReference}
                              onChange={(e) => setCurrentPaymentReference(e.target.value)}
                            />
                          </div>

                          {currentPaymentType.paymentTypeName.toLowerCase().includes("card") && (
                            <div className="space-y-2">
                              <Label htmlFor="card-type">Card Type</Label>
                              <Select value={currentCardType} onValueChange={setCurrentCardType}>
                                <SelectTrigger id="card-type">
                                  <SelectValue placeholder="Select Card" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Visa">Visa</SelectItem>
                                  <SelectItem value="MasterCard">MasterCard</SelectItem>
                                  <SelectItem value="Amex">American Express</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {(currentPaymentType.paymentTypeName.toLowerCase().includes("bank") ||
                            currentPaymentType.paymentTypeName.toLowerCase().includes("cheque")) && (
                              <>
                                <div className="space-y-2">
                                  <Label htmlFor="bank">Bank {currentPaymentType.paymentTypeName.toLowerCase().includes("cheque") && <span className="text-red-500">*</span>}</Label>
                                  <Select
                                    value={currentBankId?.toString() || ""}
                                    onValueChange={(value) => {
                                      const bid = Number(value)
                                      setCurrentBankId(bid)
                                    }}
                                  >
                                    <SelectTrigger id="bank">
                                      <SelectValue placeholder="Select Bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {banks.map(b => (
                                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            )}

                          {currentPaymentType.paymentTypeName.toLowerCase().includes("cheque") && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="cheque-no">Cheque No <span className="text-red-500">*</span></Label>
                                <Input
                                  id="cheque-no"
                                  value={currentChequeNo}
                                  onChange={(e) => setCurrentChequeNo(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="cheque-date">Cheque Date <span className="text-red-500">*</span></Label>
                                <Input
                                  id="cheque-date"
                                  type="date"
                                  value={currentChequeDate}
                                  onChange={(e) => setCurrentChequeDate(e.target.value)}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <Button onClick={handleAddPaymentEntry} type="button" size="sm" className="gap-2">
                          <Plus className="h-4 w-4" /> Add Payment Line
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes (optional)"
                        rows={1}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || selectedGRNs.length === 0 || paymentEntries.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Create Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}