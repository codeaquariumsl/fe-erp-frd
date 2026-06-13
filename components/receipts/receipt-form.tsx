"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { X, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { CustomerSelect } from "@/components/customer/customer-select"
import {
  customersApi,
  invoicesApi,
  paymentTypesApi,
  receiptsApi,
  ledgerAccountsApi,
  banksApi,
  customerReturnsApi,
  creditNotesApi,
  chequesApi,
  type Customer,
  type Invoice,
  type PaymentType,
  type LedgerAccount,
  type Bank,
  type ReceiptInvoice,
  type ReceiptPayment,
  type CreateReceiptRequest,
  type CustomerReturn,
  type CreditNote,
} from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { LedgerSelect } from "@/components/accounting/ledger-select"

interface ReceiptFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ReceiptForm({ isOpen, onClose, onSuccess }: ReceiptFormProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<"customer" | "invoices" | "payment">("customer")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([])
  const [customerReturns, setCustomerReturns] = useState<CustomerReturn[]>([])
  const [selectedReturns, setSelectedReturns] = useState<Map<number, number>>(new Map()) // ID to amount
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [selectedCreditNotes, setSelectedCreditNotes] = useState<Map<number, number>>(new Map()) // ID to amount
  const [settlementCheques, setSettlementCheques] = useState<any[]>([])
  const [selectedSettlementCheques, setSelectedSettlementCheques] = useState<Map<number, number>>(new Map()) // ID to amount
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([])
  const [banks, setBanks] = useState<Bank[]>([])

  // Selected invoices and payments
  const [selectedInvoices, setSelectedInvoices] = useState<Map<number, ReceiptInvoice>>(new Map())
  const [advanceAmount, setAdvanceAmount] = useState("")

  // Payment entries state
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
    chequeNo?: string
    chequeDate?: string
  }
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([])
  const [currentPaymentType, setCurrentPaymentType] = useState<PaymentType | null>(null)
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState("")
  const [currentPaymentReference, setCurrentPaymentReference] = useState("")
  const [currentLedgerAccountId, setCurrentLedgerAccountId] = useState<number | undefined>(undefined)
  const [currentCardType, setCurrentCardType] = useState("")
  const [currentBankId, setCurrentBankId] = useState<number | undefined>(undefined)
  const [currentChequeNo, setCurrentChequeNo] = useState("")
  const [currentChequeDate, setCurrentChequeDate] = useState("")

  const [paymentAmounts, setPaymentAmounts] = useState<Map<number, string>>(new Map())
  const [remarks, setRemarks] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const isSubmittingRef = useRef(false)

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadCustomers()
      loadPaymentTypes()
      loadLedgerAccounts()
      loadBanks()
    }
  }, [isOpen])

  const loadCustomers = async () => {
    try {
      setIsLoading(true)
      const data = await customersApi.getAll()
      setCustomers(data as Customer[])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadPaymentTypes = async () => {
    try {
      const data = await paymentTypesApi.getAll()
      setPaymentTypes(data.filter(pt => pt.isActive))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load payment types",
        variant: "destructive",
      })
    }
  }

  const loadLedgerAccounts = async () => {
    try {
      const response = await ledgerAccountsApi.getPaymentAccounts()
      // Extract data from the structured response
      const data = (response as any)?.data || []
      // Filter for active accounts
      const activeAccounts = Array.isArray(data)
        ? (data as LedgerAccount[]).filter((acc) => acc.status === 'Active')
        : []
      setLedgerAccounts(activeAccounts)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load ledger accounts",
        variant: "destructive",
      })
    }
  }

  const loadBanks = async () => {
    try {
      const data = await banksApi.getAll({ status: 'Active' })
      setBanks(Array.isArray(data) ? data : [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load banks",
        variant: "destructive",
      })
    }
  }

  const loadOutstandingInvoices = async (customerId: number) => {
    try {
      setIsLoading(true)
      // Get invoices for the customer with status "Approved" or "Pending"
      // Filter for invoices with outstanding balance
      const allInvoices = await invoicesApi.getByCustomerId(customerId)
      const outstanding = allInvoices.filter(
        inv => inv.customerId === customerId &&
          (inv.status === "Approved" || inv.status === "Pending") &&
          (parseFloat(inv.totalAmount?.toString() || "0")) > ((parseFloat(inv.paidAmount?.toString() || "0")) + (parseFloat(inv.setoffAmount?.toString() || "0")))
      )
      setOutstandingInvoices(outstanding)

      // Load customer returns
      // const returns = await customerReturnsApi.getByCustomerId(customerId, "Approved")
      // setCustomerReturns(returns)

      // Load credit notes
      const notes = await creditNotesApi.getByCustomer(customerId, "Approved")
      setCreditNotes(notes)

      // Load settlement cheques
      const cheques = await chequesApi.getForSettlement(customerId)
      setSettlementCheques(cheques)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load outstanding invoices and returns",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectCustomer = async (customerId: string) => {
    const customer = customers.find(c => c.id === Number(customerId))
    if (customer) {
      setSelectedCustomer(customer)
      await loadOutstandingInvoices(customer.id)
      setStep("invoices")
    }
  }

  const handleToggleInvoice = (invoice: Invoice) => {
    if (!invoice.id) return
    const newSelected = new Map(selectedInvoices)
    if (newSelected.has(invoice.id)) {
      newSelected.delete(invoice.id)
    } else {
      // Calculate outstanding amount: total - already paid
      const totalAmount = parseFloat(invoice.totalAmount?.toString() || "0")
      const alreadyPaid = parseFloat(invoice.paidAmount?.toString() || "0") + parseFloat(invoice.setoffAmount?.toString() || "0")
      const outstandingAmount = Math.max(0, totalAmount - alreadyPaid)

      newSelected.set(invoice.id, {
        invoiceId: invoice.id,
        invoiceAmount: outstandingAmount,
        paidAmount: outstandingAmount,
        balanceAmount: 0,
      })
      // Initialize payment amount for this invoice
      setPaymentAmounts(prev => new Map(prev).set(invoice.id || 0, outstandingAmount.toString()))
    }
    setSelectedInvoices(newSelected)
  }

  const handleInvoiceAmountChange = (invoiceId: number, amount: string) => {
    const numAmount = parseFloat(amount) || 0
    const newSelected = new Map(selectedInvoices)
    const invoice = newSelected.get(invoiceId)
    if (invoice) {
      const outstandingAmount = invoice.invoiceAmount
      const paidAmount = Math.min(numAmount, outstandingAmount)
      newSelected.set(invoiceId, {
        ...invoice,
        paidAmount: paidAmount,
        balanceAmount: outstandingAmount - paidAmount,
      })
      setSelectedInvoices(newSelected)
    }
    setPaymentAmounts(prev => new Map(prev).set(invoiceId, amount))
  }

  const calculateTotalSetOff = (): number => {
    let total = 0
    selectedReturns.forEach(amount => {
      total += amount
    })
    selectedCreditNotes.forEach(amount => {
      total += amount
    })
    return total
  }

  const calculateTotalOutstanding = (): number => {
    let total = 0
    selectedInvoices.forEach(inv => {
      total += inv.paidAmount || 0
    })

    selectedSettlementCheques.forEach(amount => {
      total += amount
    })

    // Subtract selected returns and credit notes
    let totalSetOff = calculateTotalSetOff()

    // Add advance amount
    const advance = parseFloat(advanceAmount) || 0
    return total + advance - totalSetOff
  }

  const calculateTotalReturns = (): number => {
    let total = 0
    selectedReturns.forEach(amount => {
      total += amount
    })
    return total
  }

  const calculateTotalCreditNotes = (): number => {
    let total = 0
    selectedCreditNotes.forEach(amount => {
      total += amount
    })
    return total
  }

  const handleToggleReturn = (ret: CustomerReturn) => {
    if (!ret.id) return
    const newSelected = new Map(selectedReturns)
    if (newSelected.has(ret.id)) {
      newSelected.delete(ret.id)
    } else {
      // Default to the remaining amount of the return
      const available = (ret.totalAmount || 0) - (ret.utilizedAmount || 0)
      newSelected.set(ret.id, available)
    }
    setSelectedReturns(newSelected)
  }

  const handleReturnAmountChange = (returnId: number, value: string) => {
    const amount = parseFloat(value) || 0
    const ret = customerReturns.find(r => r.id === returnId)
    if (!ret) return

    const newSelected = new Map(selectedReturns)
    // Cap at the return's remaining amount
    const available = (ret.totalAmount || 0) - (ret.utilizedAmount || 0)
    const cappedAmount = Math.min(amount, available)
    newSelected.set(returnId, cappedAmount)
    setSelectedReturns(newSelected)
  }

  const handleToggleCreditNote = (note: CreditNote) => {
    if (!note.id) return
    const newSelected = new Map(selectedCreditNotes)
    if (newSelected.has(note.id)) {
      newSelected.delete(note.id)
    } else {
      // Default to the remaining amount of the credit note
      const available = (note.total || 0) - (note.appliedAmount || 0)
      newSelected.set(note.id, available)
    }
    setSelectedCreditNotes(newSelected)
  }

  const handleCreditNoteAmountChange = (noteId: number, value: string) => {
    const amount = parseFloat(value) || 0
    const note = creditNotes.find(n => n.id === noteId)
    if (!note) return

    const newSelected = new Map(selectedCreditNotes)
    // Cap at the credit note's remaining amount
    const available = (note.total || 0) - (note.appliedAmount || 0)
    const cappedAmount = Math.min(amount, available)
    newSelected.set(noteId, cappedAmount)
    setSelectedCreditNotes(newSelected)
  }

  const handleToggleSettlementCheque = (cheque: any) => {
    if (!cheque.id) return
    const newSelected = new Map(selectedSettlementCheques)
    if (newSelected.has(cheque.id)) {
      newSelected.delete(cheque.id)
    } else {
      newSelected.set(cheque.id, cheque.outstandingAmount || 0)
    }
    setSelectedSettlementCheques(newSelected)
  }

  const handleSettlementChequeAmountChange = (id: number, value: string) => {
    const amount = parseFloat(value) || 0
    const cheque = settlementCheques.find(c => c.id === id)
    if (!cheque) return

    const newSelected = new Map(selectedSettlementCheques)
    const cappedAmount = Math.min(amount, cheque.outstandingAmount || 0)
    newSelected.set(id, cappedAmount)
    setSelectedSettlementCheques(newSelected)
  }

  const handleAddPaymentEntry = () => {
    if (!currentPaymentType) return

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

    const totalToPay = calculateTotalOutstanding()
    const currentPaid = paymentEntries.reduce((sum, p) => sum + p.amount, 0)
    const remaining = totalToPay - currentPaid

    if (amount > remaining + 0.01) { // 0.01 for floating point tolerance
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
    setCurrentChequeNo("")
    setCurrentChequeDate("")
  }

  const handleRemovePaymentEntry = (id: string) => {
    setPaymentEntries(paymentEntries.filter(p => p.id !== id))
  }

  const handleSubmit = async () => {
    if (isSubmitting || isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
      if (!selectedCustomer || !user) {
        toast({
          title: "Error",
          description: "Please select a customer",
          variant: "destructive",
        })
        return
      }

      if (selectedInvoices.size === 0 && selectedSettlementCheques.size === 0 && !advanceAmount) {
        toast({
          title: "Error",
          description: "Please select at least one invoice, returned cheque, or enter an advance amount",
          variant: "destructive",
        })
        return
      }

      if (paymentEntries.length === 0 && calculateTotalOutstanding() > 0.01) {
        toast({
          title: "Error",
          description: "Please add at least one payment",
          variant: "destructive",
        })
        return
      }

      const totalPaid = calculateTotalOutstanding()
      const totalAllocated = paymentEntries.reduce((sum, p) => sum + p.amount, 0)

      if (Math.abs(totalPaid - totalAllocated) > 0.01) {
        toast({
          title: "Error",
          description: `Payment amount (${totalAllocated.toFixed(2)}) must match receipt total (${totalPaid.toFixed(2)})`,
          variant: "destructive",
        })
        return
      }

      // Generate receipt number
      const receiptNo = `RCP-${Date.now()}`

      // Prepare receipt invoices
      const receiptInvoices: ReceiptInvoice[] = Array.from(selectedInvoices.values())

      // Prepare receipt payments
      const receiptPayments: ReceiptPayment[] = paymentEntries.map(entry => ({
        paymentTypeId: entry.paymentTypeId,
        paymentAmount: entry.amount,
        referenceNo: entry.reference,
        ledgerAccountId: entry.ledgerAccountId,
        cardType: entry.cardType || null,
        bankId: entry.bankId || null,
        chequeNo: entry.chequeNo || null,
        chequeDate: entry.chequeDate || null,
      }))

      const payload: CreateReceiptRequest = {
        receiptNo,
        receiptDate: date,
        userId: user.id,
        customerId: selectedCustomer.id,
        totalPaid,
        remarks,
        printedCount: 0,
        receiptInvoices,
        receiptPayments,
        customerReturnSetOffs: Array.from(selectedReturns.entries()).map(([id, amount]) => ({ id, amount })),
        totalReturnAmount: calculateTotalReturns(),
        creditNoteSetOffs: Array.from(selectedCreditNotes.entries()).map(([id, amount]) => ({ id, amount })),
        totalCreditNoteAmount: calculateTotalCreditNotes(),
        returnedChequeSettlements: Array.from(selectedSettlementCheques.entries()).map(([id, amount]) => ({ id, amount })),
      }

      await receiptsApi.create(payload)

      toast({
        title: "Success",
        description: `Receipt ${receiptNo} created successfully`,
      })

      // Reset form
      handleReset()
      onSuccess()
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create receipt",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      isSubmittingRef.current = false
    }
  }

  const handleReset = () => {
    setStep("customer")
    setSelectedCustomer(null)
    setOutstandingInvoices([])
    setSelectedInvoices(new Map())
    setAdvanceAmount("")
    setPaymentEntries([])
    setCurrentPaymentType(null)
    setCurrentPaymentAmount("")
    setCurrentPaymentReference("")
    setCurrentLedgerAccountId(undefined)
    setCurrentCardType("")
    setCurrentBankId(undefined)
    setCurrentChequeNo("")
    setCurrentChequeDate("")
    setPaymentAmounts(new Map())
    setSelectedReturns(new Map())
    setCreditNotes([])
    setSelectedCreditNotes(new Map())
    setSettlementCheques([])
    setSelectedSettlementCheques(new Map())
    setRemarks("")
    setDate(format(new Date(), "yyyy-MM-dd"))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Receipt</DialogTitle>
          <DialogDescription>
            {step === "customer" && "Select a customer"}
            {step === "invoices" && "Select invoices and amount to pay"}
            {step === "payment" && "Select payment method and complete"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Customer Selection */}
          {step === "customer" && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Receipt Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Enter date"
                />
              </div>
              <div className="flex flex-col gap-2 col-span-2">
                <Label htmlFor="customer">Customer *</Label>
                <CustomerSelect
                  customers={customers}
                  value={selectedCustomer?.id || 0}
                  onValueChange={(id) => handleSelectCustomer(id.toString())}
                  placeholder="Select a customer..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Invoice Selection */}
          {step === "invoices" && selectedCustomer && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm font-medium">Selected Customer: {selectedCustomer.name}</p>
              </div>

              {outstandingInvoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No outstanding invoices found for this customer
                </div>
              ) : (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Outstanding Invoices</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table className="text-xs">
                      <TableHeader className="bg-gray-100">
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead className="text-right w-32">To Pay</TableHead>
                          <TableHead className="text-right w-32">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outstandingInvoices.map((invoice) => {
                          if (!invoice.id) return null
                          const totalAmt = parseFloat(invoice.totalAmount?.toString() || "0")
                          const paidAmt = parseFloat(invoice.paidAmount?.toString() || "0")
                          const setoffAmt = parseFloat(invoice.setoffAmount?.toString() || "0")
                          const outstanding = totalAmt - paidAmt - setoffAmt
                          const isSelected = selectedInvoices.has(invoice.id)
                          return (
                            <TableRow key={invoice.id} className={isSelected ? "bg-blue-50" : ""}>
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleInvoice(invoice)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                              <TableCell>{format(new Date(invoice.invoiceDate), "dd-MMM-yyyy")}</TableCell>
                              <TableCell className="text-right">{(totalAmt).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right">{(paidAmt + setoffAmt).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">{outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell>
                                {isSelected && (
                                  <Input
                                    type="number"
                                    className="h-8 text-right font-medium"
                                    value={paymentAmounts.get(invoice.id) || ""}
                                    onChange={(e) => handleInvoiceAmountChange(invoice.id!, e.target.value)}
                                    max={outstanding}
                                    min={0}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium text-blue-600">
                                {isSelected ? (selectedInvoices.get(invoice.id)?.balanceAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end items-center">
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      Total Invoice Amount: {Array.from(selectedInvoices.values()).reduce((sum, invoice) => sum + (invoice.paidAmount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Settlement Cheques Section */}
              {settlementCheques.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base font-semibold">Returned & Cancelled Cheques</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table className="text-xs">
                      <TableHeader className="bg-gray-100">
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          <TableHead>Cheque #</TableHead>
                          <TableHead>Bank</TableHead>
                          <TableHead>Return Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Settled</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead className="text-right w-32">To Pay</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settlementCheques.map((cheque) => {
                          const isSelected = selectedSettlementCheques.has(cheque.id)
                          return (
                            <TableRow key={cheque.id} className={isSelected ? "bg-orange-50" : ""}>
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleSettlementCheque(cheque)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{cheque.chequeNo}</TableCell>
                              <TableCell>{cheque.bankName}</TableCell>
                              <TableCell>{cheque.returnDate ? format(new Date(cheque.returnDate), "dd-MMM-yyyy") : "-"}</TableCell>
                              <TableCell className="text-right">{cheque.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right">{cheque.settledAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">{cheque.outstandingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell>
                                {isSelected && (
                                  <Input
                                    type="number"
                                    className="h-8 text-right font-medium"
                                    value={selectedSettlementCheques.get(cheque.id) || ""}
                                    onChange={(e) => handleSettlementChequeAmountChange(cheque.id, e.target.value)}
                                    max={cheque.outstandingAmount}
                                    min={0}
                                  />
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

              {/* Customer Returns Section */}
              {/* Returns and Credit Notes Section */}
              {(customerReturns.length > 0 || creditNotes.length > 0) && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Credit Notes (Set-off)</Label>
                    {/* <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      Total Set-off: {calculateTotalSetOff().toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </Badge> */}
                  </div>

                  {/* Customer Returns Table */}
                  {/* {customerReturns.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">Customer Returns</Label>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/50">
                              <TableHead className="w-12">Select</TableHead>
                              <TableHead>Return #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Available</TableHead>
                              <TableHead className="text-right">To Set-off</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerReturns.map((ret) => {
                              if (!ret.id) return null
                              const isSelected = selectedReturns.has(ret.id)
                              const available = (ret.totalAmount || 0) - (ret.utilizedAmount || 0)
                              return (
                                <TableRow key={ret.id} className={isSelected ? "bg-green-50" : ""}>
                                  <TableCell>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleToggleReturn(ret)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">{ret.returnNumber}</TableCell>
                                  <TableCell>{ret.createdAt ? format(new Date(ret.createdAt), "dd-MMM-yyyy") : "-"}</TableCell>
                                  <TableCell>{ret.reason || "-"}</TableCell>
                                  <TableCell className="text-right">{(ret.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right font-semibold text-green-600">
                                    {available.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell className="w-32">
                                    {isSelected && (
                                      <Input
                                        type="number"
                                        size={1}
                                        className="h-8 text-right font-medium"
                                        value={selectedReturns.get(ret.id) || ""}
                                        onChange={(e) => handleReturnAmountChange(ret.id!, e.target.value)}
                                        max={available}
                                        min={0}
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )} */}

                  {/* Credit Notes Table */}
                  {creditNotes.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-sm font-medium text-gray-600">Credit Notes</Label>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/50">
                              <TableHead className="w-12">Select</TableHead>
                              <TableHead>CN #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Available</TableHead>
                              <TableHead className="text-right">To Set-off</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {creditNotes.map((note) => {
                              if (!note.id) return null
                              const isSelected = selectedCreditNotes.has(note.id)
                              const available = (note.total || 0) - (note.appliedAmount || 0)
                              return (
                                <TableRow key={note.id} className={isSelected ? "bg-green-50" : ""}>
                                  <TableCell>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleToggleCreditNote(note)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">{note.creditNoteNumber}</TableCell>
                                  <TableCell>{note.creditNoteDate ? format(new Date(note.creditNoteDate), "dd-MMM-yyyy") : "-"}</TableCell>
                                  <TableCell>{note.reason || "-"}</TableCell>
                                  <TableCell className="text-right">{(note.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right font-semibold text-green-600">
                                    {available.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell className="w-32">
                                    {isSelected && (
                                      <Input
                                        type="number"
                                        size={1}
                                        className="h-8 text-right font-medium"
                                        value={selectedCreditNotes.get(note.id) || ""}
                                        onChange={(e) => handleCreditNoteAmountChange(note.id!, e.target.value)}
                                        max={available}
                                        min={0}
                                      />
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
                </div>
              )}

              <div className="flex justify-between items-center bg-gray-50 p-4 rounded border">
                <div>
                  <p className="text-sm text-gray-600">Total Selected: {selectedInvoices.size} Invoices{selectedSettlementCheques.size > 0 ? `, ${selectedSettlementCheques.size} Cheques` : ""}</p>
                  <p className="text-sm text-gray-600">Total Set-off: {calculateTotalSetOff().toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-blue-700">Total to be Paid: {calculateTotalOutstanding().toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment Selection */}
          {step === "payment" && selectedCustomer && (
            <div className="space-y-2">
              <div className="bg-blue-50 p-2 rounded border border-blue-200">
                <p className="text-sm font-medium">Receipt Summary</p>
                <p className="text-xs text-gray-600 mt-1">Customer: {selectedCustomer.name}</p>
                <p className="text-xs text-gray-600">Selected Items: {selectedInvoices.size} Invoices{selectedSettlementCheques.size > 0 ? `, ${selectedSettlementCheques.size} Cheques` : ""}</p>
                <p className="text-sm font-semibold mt-2">Total Amount: {calculateTotalOutstanding().toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-2">
                  <div className="bg-gray-50 p-2 rounded-lg border">
                    <Label className="text-base font-semibold mb-2 block">Add Payment</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="payment-type">Payment Method</Label>
                        <Select
                          value={currentPaymentType?.id.toString() || ""}
                          onValueChange={(value) => {
                            const pt = paymentTypes.find(p => p.id === Number(value))
                            if (pt) setCurrentPaymentType(pt)
                          }}
                        >
                          <SelectTrigger id="payment-type">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentTypes.map((pt) => (
                              <SelectItem key={pt.id} value={pt.id.toString()}>
                                {pt.paymentTypeName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0.00"
                          value={currentPaymentAmount}
                          onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                          min="0"
                        />
                        <div className="text-xs text-muted-foreground mt-1 text-right cursor-pointer hover:underline"
                          onClick={() => {
                            const total = calculateTotalOutstanding()
                            const paid = paymentEntries.reduce((sum, p) => sum + p.amount, 0)
                            setCurrentPaymentAmount((total - paid).toFixed(2))
                          }}>
                          Max: {(calculateTotalOutstanding() - paymentEntries.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}
                        </div>
                      </div>

                      {/* Card Type - Show for Card payments */}
                      {currentPaymentType?.paymentTypeName.toLowerCase().includes("card") && (
                        <div>
                          <Label htmlFor="card-type">Card Type</Label>
                          <Select
                            value={currentCardType}
                            onValueChange={setCurrentCardType}
                          >
                            <SelectTrigger id="card-type">
                              <SelectValue placeholder="Select card type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Visa">Visa</SelectItem>
                              <SelectItem value="MasterCard">MasterCard</SelectItem>
                              <SelectItem value="Amex">American Express</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Bank Details - Show for Bank Transfer */}
                      {currentPaymentType?.paymentTypeName.toLowerCase().includes("bank") && (
                        <>
                          <div>
                            <Label htmlFor="bank-name">Bank Name</Label>
                            <Select
                              value={currentBankId?.toString() || ""}
                              onValueChange={(value) => {
                                const bankId = Number(value)
                                setCurrentBankId(bankId)
                              }}
                            >
                              <SelectTrigger id="bank-name">
                                <SelectValue placeholder="Select bank" />
                              </SelectTrigger>
                              <SelectContent>
                                {banks.map((bank) => (
                                  <SelectItem key={bank.id} value={bank.id.toString()}>
                                    {bank.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                        </>
                      )}

                      {/* Cheque Details - Show for Cheque payments */}
                      {currentPaymentType?.paymentTypeName.toLowerCase().includes("cheque") && (
                        <>
                          <div>
                            <Label htmlFor="cheque-no">Cheque Number <span className="text-red-500">*</span></Label>
                            <Input
                              id="cheque-no"
                              placeholder="Enter cheque number"
                              value={currentChequeNo}
                              onChange={(e) => setCurrentChequeNo(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="cheque-date">Cheque Date <span className="text-red-500">*</span></Label>
                            <Input
                              id="cheque-date"
                              type="date"
                              value={currentChequeDate}
                              onChange={(e) => setCurrentChequeDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="bank-name">Bank Name <span className="text-red-500">*</span></Label>
                            <Select
                              value={currentBankId?.toString() || ""}
                              onValueChange={(value) => {
                                const bankId = Number(value)
                                setCurrentBankId(bankId)
                              }}
                            >
                              <SelectTrigger id="bank-name">
                                <SelectValue placeholder="Select bank" />
                              </SelectTrigger>
                              <SelectContent>
                                {banks.map((bank) => (
                                  <SelectItem key={bank.id} value={bank.id.toString()}>
                                    {bank.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      <div>
                        <Label htmlFor="reference">Reference (Optional)</Label>
                        <Input
                          id="reference"
                          placeholder="Check #, Transfer ID, etc."
                          value={currentPaymentReference}
                          onChange={(e) => setCurrentPaymentReference(e.target.value)}
                        />
                      </div>

                      {/* Ledger Account Selection */}
                      <div>
                        <Label htmlFor="ledger-account">Ledger Account <span className="text-red-500">*</span></Label>
                        <LedgerSelect
                          value={currentLedgerAccountId?.toString() || ""}
                          onValueChange={(value) => setCurrentLedgerAccountId(Number(value))}
                          ledgers={ledgerAccounts.filter(la => {
                            // Filter based on payment type
                            const paymentTypeName = currentPaymentType?.paymentTypeName.toLowerCase() || ""
                            if (paymentTypeName.includes("cash")) {
                              return (la.ledgerType === "CASH" || la.ledgerType === "CASH_BOOK") && la.ledgerCode !== "10100006"
                            } else if (paymentTypeName.includes("bank")) {
                              return la.ledgerType === "BANK" || la.isBankLedger
                            } else if (paymentTypeName.includes("card")) {
                              return la.ledgerType === "BANK" || la.isBankLedger
                            } else if (paymentTypeName.includes("cheque")) {
                              return la.ledgerCode === "10100006"
                            }
                            return true // Show all for other payment types
                          })}
                          placeholder="Select ledger account *"
                          disabled={!currentPaymentType}
                        />
                      </div>

                    </div>
                    <Button
                      onClick={handleAddPaymentEntry}
                      className="mt-2 w-full"
                      disabled={!currentPaymentType || !currentPaymentAmount || !currentLedgerAccountId}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Payment
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="bg-white rounded-lg border">
                    <div className="p-2 border-b bg-gray-50">
                      <h3 className="font-semibold">Payments Added</h3>
                    </div>
                    <div className="p-0">
                      {paymentEntries.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground text-sm">
                          No payments added yet.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Method</TableHead>
                              <TableHead>Ref</TableHead>
                              <TableHead>Bank / Branch</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paymentEntries.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell className="font-medium">{entry.paymentTypeName}</TableCell>
                                <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]">{entry.reference || "-"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {entry.bankName ? (
                                    <span>
                                      {entry.bankName}
                                    </span>
                                  ) : "-"}
                                </TableCell>
                                <TableCell className="text-right">{entry.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700"
                                    onClick={() => handleRemovePaymentEntry(entry.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                    <div className="p-4 border-t bg-gray-50 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Required:</span>
                        <span className="font-medium">{calculateTotalOutstanding().toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Added:</span>
                        <span className="font-medium text-blue-600">{paymentEntries.reduce((sum, p) => sum + p.amount, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="font-semibold">Remaining:</span>
                        <span className={`font-bold ${(calculateTotalOutstanding() - paymentEntries.reduce((sum, p) => sum + p.amount, 0)) > 0.01 ? "text-red-600" : "text-green-600"}`}>
                          {(calculateTotalOutstanding() - paymentEntries.reduce((sum, p) => sum + p.amount, 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step !== "customer" && (
            <div className="pt-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="Add any notes about this receipt"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 pt-4 border-t">
            {step !== "customer" && (
              <Button
                variant="outline"
                onClick={() => {
                  if (step === "payment") setStep("invoices")
                  else if (step === "invoices") setStep("customer")
                }}
              >
                Back
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {step === "invoices" && (
                <>
                  {calculateTotalOutstanding() <= 0.01 && (selectedInvoices.size > 0 || selectedSettlementCheques.size > 0 || calculateTotalSetOff() > 0) ? (
                    <Button onClick={handleSubmit} disabled={isSubmitting || calculateTotalOutstanding() != 0}>
                      {isSubmitting ? "Creating..." : "Create Receipt"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setStep("payment")}
                      disabled={selectedInvoices.size === 0 && selectedSettlementCheques.size === 0 && calculateTotalSetOff() === 0}
                    >
                      Next
                    </Button>
                  )}
                </>
              )}
              {step === "payment" && (
                <Button
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    (calculateTotalOutstanding() > 0.01 && paymentEntries.length === 0) ||
                    Math.abs(calculateTotalOutstanding() - paymentEntries.reduce((sum, p) => sum + p.amount, 0)) > 0.01
                  }
                >
                  {isSubmitting ? "Creating..." : "Create Receipt"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
