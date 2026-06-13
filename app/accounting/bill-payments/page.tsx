"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, AlertCircle, MoreHorizontal, Eye, Trash2, X, CreditCard, Printer, Check, ChevronsUpDown, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { billPaymentsApi, suppliersApi, billEntriesApi, paymentTypesApi, ledgerAccountsApi, banksApi, bankBranchesApi, BillPayment, Supplier, BillEntry, PaymentAllocation, PaymentType, LedgerAccount, Bank, BankBranch } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { generatePaymentVoucherPDF, generateChequePDF, type ChequePrintData } from "@/lib/pdf-generator"
import { SupplierSelect } from "@/components/supplier/supplier-select"
import { LedgerSelect } from "@/components/accounting/ledger-select"
import { useAuth } from "@/lib/auth"

export default function BillPaymentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BillPaymentsContent />
    </Suspense>
  )
}

function BillPaymentsContent() {
  const { hasPermission } = useAuth()
  const searchParams = useSearchParams()
  const initialActionHandled = useRef(false)
  const [billPayments, setBillPayments] = useState<BillPayment[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [approvedBills, setApprovedBills] = useState<BillEntry[]>([])
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentType[]>([])
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankBranches, setBankBranches] = useState<BankBranch[]>([])
  const [filteredBranches, setFilteredBranches] = useState<BankBranch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedBillPayment, setSelectedBillPayment] = useState<BillPayment | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [actionType, setActionType] = useState<"submit" | "approve" | "post" | "cancel" | null>(null)
  const [cancellationReason, setCancellationReason] = useState("")
  const [selectedBills, setSelectedBills] = useState<{ billId: number; amount: number; taxRate: number; taxAmount: number }[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

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
    bankBranchId?: number
    bankBranchName?: string
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
  const [currentBankBranchId, setCurrentBankBranchId] = useState<number | undefined>(undefined)
  const [currentChequeNo, setCurrentChequeNo] = useState("")
  const [currentChequeDate, setCurrentChequeDate] = useState("")

  const [formData, setFormData] = useState({
    supplierId: "",
    paymentDate: "",
    description: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadBillPayments()
    loadSuppliers()
    loadPaymentMethods()
    loadLedgerAccounts()
    loadBanks()
    loadBankBranches()
  }, [currentPage, pageSize])

  useEffect(() => {
    if (initialActionHandled.current) return

    const action = searchParams.get('action')
    if (action === 'new') {
      const supplierId = searchParams.get('supplierId')
      const billId = searchParams.get('billId')

      if (supplierId) {
        setIsCreateDialogOpen(true)
        setFormData(prev => ({
          ...prev,
          supplierId: supplierId,
          paymentDate: new Date().toISOString().split('T')[0]
        }))
        loadApprovedBills(supplierId, billId)
        initialActionHandled.current = true
      }
    }
  }, [searchParams])

  const loadBillPayments = async () => {
    try {
      setLoading(true)
      const response = await billPaymentsApi.getAll<BillPayment>()

      // Handle paginated response format
      if (response && typeof response === 'object' && 'data' in response) {
        const paginatedData = response as any
        setBillPayments(Array.isArray(paginatedData.data) ? paginatedData.data : [])
        if (paginatedData.pagination) {
          setCurrentPage(paginatedData.pagination.page || 1)
          setPageSize(paginatedData.pagination.limit || 10)
          setTotalPages(paginatedData.pagination.pages || 1)
          setTotalRecords(paginatedData.pagination.total || 0)
        }
      } else if (Array.isArray(response)) {
        // Handle array response format
        setBillPayments(response)
        setTotalPages(1)
        setTotalRecords(response.length)
      } else {
        setBillPayments([])
      }
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
      const data = await suppliersApi.getExpenseSuppliers<Supplier>()
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Failed to load suppliers:", error)
    }
  }

  const loadPaymentMethods = async () => {
    try {
      const data = await paymentTypesApi.getAll()
      setPaymentMethods(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Failed to load payment methods:", error)
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
      console.error("Failed to load ledger accounts:", error)
    }
  }

  const loadBanks = async () => {
    try {
      const data = await banksApi.getAll({ status: 'Active' })
      setBanks(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to load banks:", error)
    }
  }

  const loadBankBranches = async () => {
    try {
      const data = await bankBranchesApi.getAll({ status: 'Active' })
      setBankBranches(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to load bank branches:", error)
    }
  }

  const loadApprovedBills = async (supplierId: string, initialBillId?: string | null, existingBills: BillEntry[] = []) => {
    if (!supplierId) {
      setApprovedBills([])
      return
    }
    try {
      const data = await billEntriesApi.getOutstanding(parseInt(supplierId), { limit: 1000 })
      let bills = Array.isArray(data) ? data : []

      // Merge with existing bills that might not be outstanding anymore
      if (existingBills && existingBills.length > 0) {
        existingBills.forEach(eb => {
          if (!bills.some(b => b.id === eb.id)) {
            bills = [eb, ...bills]
          }
        })
      }

      setApprovedBills(bills)

      if (initialBillId) {
        const bId = parseInt(initialBillId)
        const targetBill = bills.find(b => b.id === bId)
        if (targetBill) {
          const balance = parseFloat((targetBill.totalAmount - (targetBill.paidAmount || 0))?.toString() || "0")
          setSelectedBills([{
            billId: targetBill.id,
            amount: balance,
            taxRate: targetBill.taxRate || 0,
            taxAmount: targetBill.taxAmount || 0
          }])
        } else {
          setSelectedBills([])
        }
      } else if (!initialBillId && existingBills.length === 0) {
        // Only reset if it's a fresh supplier selection (New Payment), not an Edit or Initial Bill
        setSelectedBills([])
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load outstanding bills",
        variant: "destructive",
      })
      setApprovedBills([])
    }
  }

  const loadAllocations = async (paymentId: number) => {
    try {
      const data = await billPaymentsApi.getAllocations(paymentId)
      setAllocations(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Failed to load allocations:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      supplierId: "",
      paymentDate: "",
      description: "",
    })
    setSelectedBills([])
    setApprovedBills([])
    setPaymentEntries([])
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

  const handleBillSelection = (bill: BillEntry, isChecked: boolean) => {
    if (isChecked) {
      const balance = parseFloat((bill.totalAmount - (bill.paidAmount || 0))?.toString() || "0")
      setSelectedBills([...selectedBills, {
        billId: bill.id,
        amount: balance,
        taxRate: bill.taxRate || 0,
        taxAmount: bill.taxAmount || 0
      }])
    } else {
      setSelectedBills(selectedBills.filter(b => b.billId !== bill.id))
    }
  }

  const handleAmountChange = (billId: number, amount: number) => {
    setSelectedBills(selectedBills.map(b => {
      if (b.billId === billId) {
        const taxAmount = (amount * b.taxRate) / 100
        return { ...b, amount, taxAmount }
      }
      return b
    }))
  }

  const handleTaxRateChange = (billId: number, taxRate: number) => {
    setSelectedBills(selectedBills.map(b => {
      if (b.billId === billId) {
        const taxAmount = (b.amount * taxRate) / 100
        return { ...b, taxRate, taxAmount }
      }
      return b
    }))
  }

  const handleTaxAmountChange = (billId: number, taxAmount: number) => {
    setSelectedBills(selectedBills.map(b => {
      if (b.billId === billId) {
        const taxRate = b.amount > 0 ? (taxAmount / b.amount) * 100 : 0
        return { ...b, taxRate, taxAmount }
      }
      return b
    }))
  }

  const getTotalAmount = () => {
    return selectedBills.reduce((sum, item) => sum + (parseFloat(item.amount?.toString() || "0")), 0)
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

    const totalToPay = getTotalAmount()
    const currentPaid = paymentEntries.reduce((sum, p) => sum + p.amount, 0)
    const remaining = totalToPay - currentPaid

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

    // Bank Transfer Validation
    if (currentPaymentType.paymentTypeName.toLowerCase().includes("bank")) {
      if (!currentBankId) {
        toast({ title: "Error", description: "Bank is required", variant: "destructive" })
        return
      }
      if (!currentBankBranchId) {
        toast({ title: "Error", description: "Branch is required", variant: "destructive" })
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

  const handlePrintVoucher = (payment: BillPayment) => {
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

  const handlePrintCheque = (data: ChequePrintData) => {
    try {
      generateChequePDF(data)
      toast({
        title: "Success",
        description: "Cheque PDF generated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate cheque PDF",
        variant: "destructive",
      })
    }
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

    const totalToPay = getTotalAmount()
    const totalPaid = paymentEntries.reduce((sum, p) => sum + p.amount, 0)

    if (Math.abs(totalToPay - totalPaid) > 0.01) {
      toast({
        title: "Validation Error",
        description: `Total payment amount (${totalPaid.toFixed(2)}) must match total bill amount (${totalToPay.toFixed(2)})`,
        variant: "destructive",
      })
      return
    }

    try {
      setIsProcessing(true)

      const payload = {
        supplierId: parseInt(formData.supplierId),
        paymentDate: formData.paymentDate,
        amount: totalToPay,
        description: formData.description,
        details: selectedBills.map(b => ({
          billEntryId: b.billId,
          amount: b.amount,
          taxRate: b.taxRate,
          taxAmount: b.taxAmount,
        })),
        payments: paymentEntries.map(p => ({
          paymentTypeId: p.paymentTypeId,
          paymentAmount: p.amount,
          referenceNo: p.reference,
          ledgerAccountId: p.ledgerAccountId,
          cardType: p.cardType || null,
          bankId: p.bankId || null,
          bankBranchId: p.bankBranchId || null,
          chequeNo: p.chequeNo || null,
          chequeDate: p.chequeDate || null,
        }))
      }

      if (selectedBillPayment) {
        await billPaymentsApi.update(selectedBillPayment.id, payload)
        // For updates, we might need to re-allocate if allocations changed
        // But the backend handle this now.
      } else {
        const response: any = await billPaymentsApi.create(payload)

        // Allocate bills to payment
        if (response && response.id) {
          await billPaymentsApi.allocate(response.id, {
            allocations: selectedBills.map(b => ({
              billEntryId: b.billId,
              allocatedAmount: b.amount,
              taxRate: b.taxRate,
              taxAmount: b.taxAmount,
            }))
          })
        }
      }

      toast({
        title: "Success",
        description: `Bill payment ${selectedBillPayment ? 'updated' : 'created'} successfully`,
      })
      setIsCreateDialogOpen(false)
      setSelectedBillPayment(null)
      resetForm()
      loadBillPayments()
    } catch (error: any) {
      toast({
        title: "Failed to create bill payment",
        description: error.message || "Failed to create bill payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleViewBillPayment = async (payment: BillPayment) => {
    setSelectedBillPayment(payment)

    // Use Entries (bill entries) if available, fallback to Allocations
    if (payment.Entries && Array.isArray(payment.Entries) && payment.Entries.length > 0) {
      setAllocations(payment.Entries.map(e => ({
        id: e.id,
        billEntryId: e.billEntryId,
        allocatedAmount: e.amount,
        taxRate: e.taxRate,
        taxAmount: e.taxAmount,
        BillEntry: e.BillEntry
      })))
    } else if (payment.Allocations && Array.isArray(payment.Allocations) && payment.Allocations.length > 0) {
      setAllocations(payment.Allocations)
    } else {
      await loadAllocations(payment.id)
    }

    setIsViewDialogOpen(true)
  }

  const handleEditBillPayment = async (payment: BillPayment) => {
    setSelectedBillPayment(payment)
    setFormData({
      supplierId: payment.supplierId.toString(),
      paymentDate: payment.paymentDate.split('T')[0],
      description: payment.description || "",
    })

    // Load allocations
    let currentAllocations: any[] = []
    if (payment.Entries && payment.Entries.length > 0) {
      currentAllocations = payment.Entries
    } else {
      const data = await billPaymentsApi.getAllocations(payment.id)
      currentAllocations = Array.isArray(data) ? data : []
    }

    setSelectedBills(currentAllocations.map(a => ({
      billId: a.billEntryId,
      amount: a.amount,
      taxRate: a.taxRate || 0,
      taxAmount: a.taxAmount || 0
    })))

    // Load payment details
    const entries: PaymentEntry[] = (payment.Details || []).map((d: any, idx: number) => ({
      id: `existing-${idx}`,
      paymentTypeId: d.paymentTypeId,
      paymentTypeName: d.PaymentType?.paymentTypeName || "",
      amount: parseFloat(d.amount.toString()),
      reference: d.referenceNo || "",
      ledgerAccountId: d.ledgerAccountId,
      bankId: d.bankId,
      bankBranchId: d.bankBranchId,
      chequeNo: d.chequeNo,
      chequeDate: d.chequeDate ? d.chequeDate.split('T')[0] : undefined,
    }))
    setPaymentEntries(entries)

    // Extract BillEntry objects from payment entries to preserve them in the list
    const existingBillEntries = (payment.Entries || []).map(e => e.BillEntry).filter(Boolean) as BillEntry[]

    // Load bills for this supplier, merging with existing ones
    await loadApprovedBills(payment.supplierId.toString(), null, existingBillEntries)

    setIsCreateDialogOpen(true)
  }

  const handleDeleteBillPayment = async (id: number) => {
    try {
      setIsProcessing(true)
      await billPaymentsApi.delete(id)
      toast({
        title: "Success",
        description: "Bill payment deleted successfully",
      })
      loadBillPayments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bill payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmitBillPayment = async (paymentId: number) => {
    try {
      setIsProcessing(true)
      await billPaymentsApi.submit(paymentId)
      toast({
        title: "Success",
        description: "Bill payment submitted successfully",
      })
      setIsViewDialogOpen(false)
      loadBillPayments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit bill payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setActionType(null)
    }
  }

  const handleApproveBillPayment = async (paymentId: number) => {
    try {
      setIsProcessing(true)
      await billPaymentsApi.approve(paymentId)
      toast({
        title: "Success",
        description: "Bill payment approved successfully",
      })
      setIsViewDialogOpen(false)
      loadBillPayments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve bill payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setActionType(null)
    }
  }

  const handlePostBillPayment = async (paymentId: number) => {
    try {
      setIsProcessing(true)
      await billPaymentsApi.post(paymentId)
      toast({
        title: "Success",
        description: "Bill payment posted successfully",
      })
      setIsViewDialogOpen(false)
      loadBillPayments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post bill payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setActionType(null)
    }
  }

  const handleCancelBillPayment = async (paymentId: number) => {
    try {
      setIsProcessing(true)
      await billPaymentsApi.cancel(paymentId, { cancellationReason })
      toast({
        title: "Success",
        description: "Bill payment cancelled successfully",
      })
      setIsViewDialogOpen(false)
      setCancellationReason("")
      loadBillPayments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel bill payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setActionType(null)
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
        payment.Supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
              <Button onClick={() => { resetForm(); setSelectedBillPayment(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Bill Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
              <DialogHeader className="pb-0">
                <DialogTitle className="text-xl">{selectedBillPayment ? 'Edit' : 'New'} Bill Payment</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Payment Information Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="supplier" className="text-xs font-medium">Supplier *</Label>
                    <SupplierSelect
                      suppliers={suppliers}
                      value={formData.supplierId}
                      onValueChange={(v) => {
                        setFormData({ ...formData, supplierId: v })
                        loadApprovedBills(v)
                      }}
                      placeholder="Select supplier"
                    />
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
                {/* <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-md">
                  <h3 className="text-sm font-semibold">Outstanding Bills ({selectedBills.length})</h3>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total to Pay</p>
                    <p className="text-sm font-bold">{getTotalAmount().toFixed(2)}</p>
                  </div>
                </div> */}

                {approvedBills.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <Table className="text-xs">
                        <TableHeader className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead className="font-semibold">Bill #</TableHead>
                            <TableHead className="font-semibold text-right">Bill Amount</TableHead>
                            <TableHead className="font-semibold text-right">Balance</TableHead>
                            <TableHead className="font-semibold text-right w-24">Tax (%)</TableHead>
                            <TableHead className="font-semibold text-right w-24">Tax Amt</TableHead>
                            <TableHead className="font-semibold text-right w-32">Amount to Pay</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {approvedBills.map((bill) => {
                            const isSelected = selectedBills.some(b => b.billId === bill.id)
                            const selectedBill = selectedBills.find(b => b.billId === bill.id)
                            const balance = parseFloat((bill.totalAmount - (bill.paidAmount || 0))?.toString() || "0")

                            return (
                              <TableRow key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                                <TableCell className="py-1">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleBillSelection(bill, checked as boolean)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium py-1 text-xs">{bill.billNumber}</TableCell>
                                <TableCell className="text-right font-mono py-1 text-xs">{parseFloat(bill.totalAmount?.toString() || "0").toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono py-1 text-xs">{balance.toFixed(2)}</TableCell>
                                <TableCell className="py-1">
                                  {isSelected ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={selectedBill?.taxRate || 0}
                                      onChange={(e) => handleTaxRateChange(bill.id, parseFloat(e.target.value) || 0)}
                                      className="h-7 text-xs text-right font-mono"
                                    />
                                  ) : (
                                    <span className="text-xs text-muted-foreground text-right block">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-1">
                                  {isSelected ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={selectedBill?.taxAmount || 0}
                                      onChange={(e) => handleTaxAmountChange(bill.id, parseFloat(e.target.value) || 0)}
                                      className="h-7 text-xs text-right font-mono"
                                    />
                                  ) : (
                                    <span className="text-xs text-muted-foreground text-right block">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-1">
                                  {isSelected ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={balance}
                                      value={selectedBill?.amount || 0}
                                      onChange={(e) => handleAmountChange(bill.id, parseFloat(e.target.value) || 0)}
                                      className="h-7 text-xs text-right font-mono"
                                    />
                                  ) : (
                                    <span className="text-xs text-muted-foreground text-right block">-</span>
                                  )}
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
                    {formData.supplierId ? "No outstanding bills found for this supplier" : "Select a supplier to view outstanding bills"}
                  </div>
                )}

                {/* Multi-Payment Section */}
                {selectedBills.length > 0 && (
                  <div className="space-y-4 pt-2 border-t">
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
                      <Label className="text-sm font-semibold mb-3 block">Add Payment Method</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="payment-type" className="text-xs">Method *</Label>
                          <Select
                            value={currentPaymentType?.id.toString() || ""}
                            onValueChange={(value) => {
                              const pt = paymentMethods.find(p => p.id === Number(value))
                              if (pt) {
                                setCurrentPaymentType(pt)
                                setCurrentLedgerAccountId(undefined)
                              }
                            }}
                          >
                            <SelectTrigger id="payment-type" className="h-8 text-xs">
                              <SelectValue placeholder="Select" />
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

                        <div className="space-y-1">
                          <Label htmlFor="amount" className="text-xs">Amount *</Label>
                          <div className="relative">
                            <Input
                              id="amount"
                              type="number"
                              placeholder="0.00"
                              value={currentPaymentAmount}
                              onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                              className="h-8 text-xs pr-12"
                            />
                            <div
                              className="absolute right-2 top-1.5 text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                              onClick={() => {
                                const total = getTotalAmount()
                                const paid = paymentEntries.reduce((sum, p) => sum + p.amount, 0)
                                setCurrentPaymentAmount(Math.max(0, total - paid).toFixed(2))
                              }}
                            >
                              MAX
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="ledger-account" className="text-xs">Ledger Account *</Label>
                          <LedgerSelect
                            ledgers={ledgerAccounts.filter(la => {
                              if (!currentPaymentType) return true
                              const ptName = currentPaymentType.paymentTypeName.toLowerCase()
                              if (ptName.includes("cash")) {
                                return (la.ledgerType === "CASH" || la.ledgerType === "CASH_BOOK") && la.ledgerCode !== "10100006"
                              } else if (ptName.includes("bank") || ptName.includes("card")) {
                                return la.ledgerType === "BANK" || la.isBankLedger
                              } else if (ptName.includes("cheque")) {
                                return la.ledgerCode === "10100006"
                              }
                              return true
                            })}
                            value={currentLedgerAccountId}
                            onValueChange={(v) => setCurrentLedgerAccountId(parseInt(v))}
                            placeholder="Select"
                            className="h-8 text-xs"
                          />
                        </div>

                        {/* Card Type */}
                        {currentPaymentType?.paymentTypeName.toLowerCase().includes("card") && (
                          <div className="space-y-1">
                            <Label htmlFor="card-type" className="text-xs">Card Type</Label>
                            <Select value={currentCardType} onValueChange={setCurrentCardType}>
                              <SelectTrigger id="card-type" className="h-8 text-xs">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Visa">Visa</SelectItem>
                                <SelectItem value="MasterCard">MasterCard</SelectItem>
                                <SelectItem value="Amex">Amex</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Bank Details */}
                        {currentPaymentType?.paymentTypeName.toLowerCase().includes("bank") && (
                          <>
                            <div className="space-y-1">
                              <Label htmlFor="bank" className="text-xs">Bank</Label>
                              <Select
                                value={currentBankId?.toString() || ""}
                                onValueChange={(value) => {
                                  const bid = Number(value)
                                  setCurrentBankId(bid)
                                  setCurrentBankBranchId(undefined)
                                  setFilteredBranches(bankBranches.filter(bb => bb.bankId === bid))
                                }}
                              >
                                <SelectTrigger id="bank" className="h-8 text-xs">
                                  <SelectValue placeholder="Select Bank" />
                                </SelectTrigger>
                                <SelectContent>
                                  {banks.map(b => (
                                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="branch" className="text-xs">Branch</Label>
                              <Select
                                value={currentBankBranchId?.toString() || ""}
                                onValueChange={(value) => setCurrentBankBranchId(Number(value))}
                                disabled={!currentBankId}
                              >
                                <SelectTrigger id="branch" className="h-8 text-xs">
                                  <SelectValue placeholder="Select Branch" />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredBranches.map(bb => (
                                    <SelectItem key={bb.id} value={bb.id.toString()}>{bb.branchName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}

                        {/* Cheque Details */}
                        {currentPaymentType?.paymentTypeName.toLowerCase().includes("cheque") && (
                          <>
                            <div className="space-y-1">
                              <Label htmlFor="chequeNo" className="text-xs">Cheque # <span className="text-red-500">*</span></Label>
                              <Input
                                id="chequeNo"
                                value={currentChequeNo}
                                onChange={(e) => setCurrentChequeNo(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="chequeDate" className="text-xs">Cheque Date <span className="text-red-500">*</span></Label>
                              <Input
                                id="chequeDate"
                                type="date"
                                value={currentChequeDate}
                                onChange={(e) => setCurrentChequeDate(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="bank" className="text-xs">Cheque Bank <span className="text-red-500">*</span></Label>
                              <Select
                                value={currentBankId?.toString() || ""}
                                onValueChange={(value) => {
                                  const bid = Number(value)
                                  setCurrentBankId(bid)
                                  setCurrentBankBranchId(undefined)
                                  setFilteredBranches(bankBranches.filter(bb => bb.bankId === bid))
                                }}
                              >
                                <SelectTrigger id="bank" className="h-8 text-xs">
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

                        <div className="space-y-1">
                          <Label htmlFor="reference" className="text-xs">Reference</Label>
                          <Input
                            id="reference"
                            value={currentPaymentReference}
                            onChange={(e) => setCurrentPaymentReference(e.target.value)}
                            placeholder="Ref #"
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="flex items-end">
                          <Button
                            type="button"
                            onClick={handleAddPaymentEntry}
                            size="sm"
                            className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
                            disabled={!currentPaymentType || !currentPaymentAmount || !currentLedgerAccountId}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Payment
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Payment Entries Table */}
                    {paymentEntries.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        <Table className="text-[10px]">
                          <TableHeader className="bg-slate-50 dark:bg-slate-900">
                            <TableRow>
                              <TableHead className="h-7 py-1 px-2">Method</TableHead>
                              <TableHead className="h-7 py-1 px-2">Amount</TableHead>
                              <TableHead className="h-7 py-1 px-2">Ledger</TableHead>
                              <TableHead className="h-7 py-1 px-2">Details</TableHead>
                              <TableHead className="h-7 py-1 px-2 text-right w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paymentEntries.map((entry) => (
                              <TableRow key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-950">
                                <TableCell className="py-1 px-2 font-medium">{entry.paymentTypeName}</TableCell>
                                <TableCell className="py-1 px-2 font-mono">{entry.amount.toFixed(2)}</TableCell>
                                <TableCell className="py-1 px-2 text-muted-foreground">{entry.ledgerAccountName}</TableCell>
                                <TableCell className="py-1 px-2 text-muted-foreground">
                                  {entry.bankName && `${entry.bankName} `}
                                  {entry.chequeNo && `(Chk: ${entry.chequeNo}) `}
                                  {entry.reference && `Ref: ${entry.reference}`}
                                </TableCell>
                                <TableCell className="py-1 px-2 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemovePaymentEntry(entry.id)}
                                    className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Summary Footer */}
                    <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-md border border-blue-100 dark:border-blue-900 flex justify-between items-center text-xs">
                      <div className="flex gap-4">
                        <div>
                          <span className="text-blue-700 dark:text-blue-300 mr-1">Total Bill:</span>
                          <span className="font-bold font-mono">LKR {Number(getTotalAmount()).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-blue-700 dark:text-blue-300 mr-1">Total Paid:</span>
                          <span className="font-bold font-mono">LKR {Number(paymentEntries.reduce((sum, p) => sum + (parseFloat(p.amount?.toString() || "0")), 0)).toFixed(2)}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-blue-700 dark:text-blue-300 mr-1">Balance:</span>
                        <span className={`font-bold font-mono ${Math.abs(Number(getTotalAmount()) - Number(paymentEntries.reduce((sum, p) => sum + (parseFloat(p.amount?.toString() || "0")), 0))) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                          LKR {Number(getTotalAmount() - paymentEntries.reduce((sum, p) => sum + (parseFloat(p.amount?.toString() || "0")), 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} size="sm" className="text-sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBillPayment}
                  disabled={
                    isProcessing ||
                    !formData.supplierId ||
                    !formData.paymentDate ||
                    selectedBills.length === 0 ||
                    paymentEntries.length === 0 ||
                    Math.abs(getTotalAmount() - paymentEntries.reduce((sum, p) => sum + p.amount, 0)) > 0.01
                  }
                  size="sm"
                  className="text-sm"
                >
                  {isProcessing ? (selectedBillPayment ? "Updating..." : "Creating...") : (selectedBillPayment ? "Update Payment" : "Create Payment")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
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
                  <Table className="text-xs">
                    <TableHeader className="bg-gray-100">
                      <TableRow>
                        <TableHead>Payment #</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approval</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Approved By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBillPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="py-2 font-mono text-sm">{payment.paymentNumber}</TableCell>
                          <TableCell className="py-2 text-sm">{payment.Supplier?.name || "-"}</TableCell>
                          <TableCell className="py-2 text-sm">{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                          <TableCell className="py-2 font-mono text-sm">{parseFloat(payment.amount?.toString() || "0").toFixed(2)}</TableCell>
                          <TableCell className="py-2">
                            <Badge className={`capitalize text-xs ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge className={`capitalize text-xs ${payment.approvalStatus === "Approved" ? "bg-green-100 text-green-800" : payment.approvalStatus === "Rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                              {payment.approvalStatus || "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-xs">{payment.Creator?.fullName || "-"}</TableCell>
                          <TableCell className="py-2 text-xs">{payment.ApprovedByUser?.fullName || "-"}</TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleViewBillPayment(payment)} title="View Payment">
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                              {((payment.status === "Draft") || (payment.status === "Posted" && hasPermission("bill-payment:edit"))) && (
                                <Button variant="ghost" size="sm" onClick={() => handleEditBillPayment(payment)} title="Edit Payment">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {(payment.status === "Draft") && (
                                <>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" title="Delete Payment">
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-red-600">Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action cannot be undone. This will permanently delete the Bill Payment and revert any bill allocations.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                          onClick={() => handleDeleteBillPayment(payment.id)}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                              {payment.status === "Posted" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePrintVoucher(payment)}
                                  className="text-green-600"
                                  title="Print Payment Voucher"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              )}
                              {/* Cheque print button: show if any payment detail is cheque (typeId=4) */}
                              {payment.Details?.some((d: any) => d.paymentTypeId === 4) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  title="Print Cheque"
                                  onClick={() => {
                                    const chqDetail = payment.Details?.find((d: any) => d.paymentTypeId === 4)
                                    if (chqDetail) {
                                      handlePrintCheque({
                                        payee: payment.Supplier?.name || "-",
                                        amount: parseFloat(chqDetail.amount?.toString() || "0"),
                                        chequeDate: chqDetail.chequeDate || payment.paymentDate,
                                        chequeNo: chqDetail.chequeNo,
                                        bankName: banks.find(b => b.id === chqDetail.bankId)?.name,
                                        bankBranch: bankBranches.find(bb => bb.id === chqDetail.bankBranchId)?.branchName,
                                        referenceNo: chqDetail.referenceNo,
                                        documentNo: payment.paymentNumber,
                                        documentType: "Bill Payment",
                                        preparedBy: payment.Creator?.fullName || undefined,
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
              )}

              {/* Pagination Controls */}
              {filteredBillPayments.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} bill payments
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(page)}
                          disabled={loading}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* View Bill Payment Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader className="pb-0">
              <DialogTitle className="text-xl">Bill Payment Details</DialogTitle>
            </DialogHeader>

            {selectedBillPayment && (
              <div className="space-y-4">
                {/* Payment Info Card */}
                <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Number</p>
                    <p className="font-mono font-bold text-sm">{selectedBillPayment.paymentNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={`capitalize text-xs ${getStatusColor(selectedBillPayment.status)}`}>
                      {selectedBillPayment.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Approval Status</p>
                    <Badge className={`capitalize text-xs ${selectedBillPayment.approvalStatus === "Approved" ? "bg-green-100 text-green-800" : selectedBillPayment.approvalStatus === "Rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {selectedBillPayment.approvalStatus || "Pending"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Supplier</p>
                    <p className="text-sm font-semibold">{selectedBillPayment.Supplier?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Date</p>
                    <p className="text-sm">{new Date(selectedBillPayment.paymentDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <p className="text-sm">{selectedBillPayment.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">LKR {parseFloat(selectedBillPayment.amount?.toString() || "0").toFixed(2)}</p>
                  </div>
                  {selectedBillPayment.journalEntryId && (
                    <div>
                      <p className="text-xs text-muted-foreground">Journal Entry ID</p>
                      <p className="font-mono text-sm">{selectedBillPayment.journalEntryId}</p>
                    </div>
                  )}
                </div>

                {/* Payment Breakdown (Details) Section */}
                {selectedBillPayment.Details && selectedBillPayment.Details.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Payment Breakdown</h3>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-600 border-blue-200">
                        {selectedBillPayment.Details.length} {selectedBillPayment.Details.length === 1 ? 'Method' : 'Methods'}
                      </Badge>
                    </div>
                    <div className="border rounded-md overflow-hidden bg-white dark:bg-slate-950">
                      <Table className="text-xs">
                        <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b">
                          <TableRow className="h-8">
                            <TableHead className="font-semibold py-1">Payment Method</TableHead>
                            <TableHead className="text-right font-semibold py-1">Amount</TableHead>
                            <TableHead className="font-semibold py-1">Ledger Account</TableHead>
                            <TableHead className="font-semibold py-1">Details / Reference</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedBillPayment.Details.map((detail) => {
                            // Find method name from paymentMethods state
                            const methodName = detail.PaymentType?.paymentTypeName ||
                              paymentMethods.find(pm => pm.id === detail.paymentTypeId)?.paymentTypeName ||
                              (detail.paymentTypeId === 1 ? 'Cash' : detail.paymentTypeId === 3 ? 'Bank Transfer' : 'Other')

                            return (
                              <TableRow key={detail.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 h-9">
                                <TableCell className="py-1 font-medium">{methodName}</TableCell>
                                <TableCell className="text-right font-mono font-bold py-1 text-blue-600 dark:text-blue-400">{parseFloat(detail.amount.toString()).toFixed(2)}</TableCell>
                                <TableCell className="py-1 text-muted-foreground">{detail.LedgerAccount?.name || '-'}</TableCell>
                                <TableCell className="py-1 text-muted-foreground text-[10px]">
                                  <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
                                    {detail.bankId && <Badge variant="secondary" className="text-[9px] h-4">{banks.find(b => b.id === detail.bankId)?.name || detail.bankId}</Badge>}
                                    {detail.bankBranchId && <Badge variant="secondary" className="text-[9px] h-4">{bankBranches.find(bb => bb.id === detail.bankBranchId)?.branchName || detail.bankBranchId}</Badge>}
                                    {detail.chequeNo && <Badge variant="outline" className="text-[9px] h-4 border-amber-200 bg-amber-50 text-amber-700">Cheque: {detail.chequeNo}</Badge>}
                                    {detail.chequeDate && <span className="italic leading-4">({new Date(detail.chequeDate).toLocaleDateString()})</span>}
                                    {detail.cardType && <Badge variant="outline" className="text-[9px] h-4">{detail.cardType}</Badge>}
                                    {detail.referenceNo && <span className="leading-4 underline decoration-dotted underline-offset-2">Ref: {detail.referenceNo}</span>}
                                    {detail.paymentTypeId === 4 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-[10px] text-amber-600 border-amber-300 hover:bg-amber-50 ml-1"
                                        title="Print Cheque"
                                        onClick={() => handlePrintCheque({
                                          payee: selectedBillPayment?.Supplier?.name || "-",
                                          amount: parseFloat(detail.amount.toString()),
                                          chequeDate: detail.chequeDate || selectedBillPayment?.paymentDate || "",
                                          chequeNo: detail.chequeNo,
                                          bankName: banks.find(b => b.id === detail.bankId)?.name,
                                          bankBranch: bankBranches.find(bb => bb.id === detail.bankBranchId)?.branchName,
                                          referenceNo: detail.referenceNo,
                                          documentNo: selectedBillPayment?.paymentNumber,
                                          documentType: "Bill Payment",
                                          preparedBy: selectedBillPayment?.Creator?.fullName || undefined,
                                        })}
                                      >
                                        <Printer className="h-3 w-3 mr-1" /> Cheque
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 h-9 font-bold">
                            <TableCell className="py-1">Total Paid</TableCell>
                            <TableCell className="text-right font-mono py-1 text-blue-700 dark:text-blue-300">
                              LKR {selectedBillPayment.Details.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0).toFixed(2)}
                            </TableCell>
                            <TableCell colSpan={2} className="py-1"></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Audit Trail Section */}
                <div className="grid grid-cols-2 gap-3 bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Created By</p>
                    <p className="text-sm font-semibold">{selectedBillPayment.Creator?.fullName || "-"}</p>
                    <p className="text-xs text-muted-foreground">{selectedBillPayment.Creator?.email || ""}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Created At</p>
                    <p className="text-sm">{selectedBillPayment.createdAt ? new Date(selectedBillPayment.createdAt).toLocaleString() : "-"}</p>
                  </div>
                  {selectedBillPayment.ApprovedByUser && (
                    <>
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Approved By</p>
                        <p className="text-sm font-semibold">{selectedBillPayment.ApprovedByUser.fullName}</p>
                        <p className="text-xs text-muted-foreground">{selectedBillPayment.ApprovedByUser.email || ""}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Approved At</p>
                        <p className="text-sm">{selectedBillPayment.approvedAt ? new Date(selectedBillPayment.approvedAt).toLocaleString() : "-"}</p>
                      </div>
                    </>
                  )}
                  {selectedBillPayment.PostedByUser && (
                    <>
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Posted By</p>
                        <p className="text-sm font-semibold">{selectedBillPayment.PostedByUser.fullName}</p>
                        <p className="text-xs text-muted-foreground">{selectedBillPayment.PostedByUser.email || ""}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Posted At</p>
                        <p className="text-sm">{selectedBillPayment.postedAt ? new Date(selectedBillPayment.postedAt).toLocaleString() : "-"}</p>
                      </div>
                    </>
                  )}
                  {selectedBillPayment.rejectionReason && (
                    <div className="col-span-2 bg-red-50 dark:bg-red-950 p-2 rounded border border-red-200 dark:border-red-800">
                      <p className="text-xs text-red-700 dark:text-red-300 font-medium">Rejection Reason</p>
                      <p className="text-sm text-red-900 dark:text-red-100">{selectedBillPayment.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {selectedBillPayment.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedBillPayment.description}</p>
                  </div>
                )}

                {selectedBillPayment.referenceNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Reference Number</p>
                    <p className="text-sm">{selectedBillPayment.referenceNumber}</p>
                  </div>
                )}

                {/* Allocations & Bill Entry Details */}
                {allocations.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold mb-2">Allocated Bills Summary</h3>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Bill Amount</p>
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                          {allocations.reduce((sum, alloc) => {
                            return sum + parseFloat(alloc.BillEntry?.totalAmount?.toString() || "0")
                          }, 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950 p-2 rounded border border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Total Paid</p>
                        <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                          {allocations.reduce((sum, alloc) => {
                            return sum + parseFloat(alloc.BillEntry?.paidAmount?.toString() || "0")
                          }, 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800">
                        <p className="text-xs text-green-700 dark:text-green-300 font-medium">Total Allocated</p>
                        <p className="text-sm font-bold text-green-900 dark:text-green-100">
                          {allocations.reduce((sum, alloc) => {
                            return sum + parseFloat(alloc.allocatedAmount?.toString() || "0")
                          }, 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-950 p-2 rounded border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Total Remaining</p>
                        <p className="text-sm font-bold text-purple-900 dark:text-purple-100">
                          {allocations.reduce((sum, alloc) => {
                            const billAmount = parseFloat(alloc.BillEntry?.totalAmount?.toString() || "0")
                            const paidAmount = parseFloat(alloc.BillEntry?.paidAmount?.toString() || "0")
                            const allocatedAmount = parseFloat(alloc.allocatedAmount?.toString() || "0")
                            return sum + (billAmount - paidAmount - allocatedAmount)
                          }, 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Detailed Allocations Table */}
                    <div className="border rounded-md overflow-hidden">
                      <Table className="text-xs">
                        <TableHeader className="bg-slate-100 dark:bg-slate-800">
                          <TableRow>
                            <TableHead className="font-semibold">Allocation #</TableHead>
                            <TableHead className="font-semibold">Bill #</TableHead>
                            <TableHead className="font-semibold">Bill Date</TableHead>
                            <TableHead className="font-semibold">Due Date</TableHead>
                            <TableHead className="text-right font-semibold">Bill Amount</TableHead>
                            <TableHead className="text-right font-semibold">Paid Amount</TableHead>
                            <TableHead className="text-right font-semibold">Allocated</TableHead>
                            <TableHead className="text-right font-semibold">Tax (%)</TableHead>
                            <TableHead className="text-right font-semibold">Tax Amt</TableHead>
                            <TableHead className="text-right font-semibold">Remaining</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allocations.map((alloc) => {
                            const billAmount = parseFloat(alloc.BillEntry?.totalAmount?.toString() || "0")
                            const paidAmount = parseFloat(alloc.BillEntry?.paidAmount?.toString() || "0")
                            const allocatedAmount = parseFloat(alloc.allocatedAmount?.toString() || "0")
                            const remaining = billAmount - paidAmount - allocatedAmount
                            const allocationPercentage = (allocatedAmount / billAmount * 100).toFixed(1)
                            return (
                              <TableRow key={alloc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                                <TableCell className="font-mono py-2 font-medium text-xs">{alloc.id || "-"}</TableCell>
                                <TableCell className="font-mono py-2 font-medium">{alloc.BillEntry?.billNumber || "-"}</TableCell>
                                <TableCell className="py-2">{alloc.BillEntry?.billDate ? new Date(alloc.BillEntry.billDate).toLocaleDateString() : "-"}</TableCell>
                                <TableCell className="py-2">{alloc.BillEntry?.dueDate ? new Date(alloc.BillEntry.dueDate).toLocaleDateString() : "-"}</TableCell>
                                <TableCell className="text-right font-mono py-2 font-semibold">{billAmount.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono py-2 text-amber-600 dark:text-amber-400">{paidAmount.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono py-2 font-semibold text-green-600 dark:text-green-400">{allocatedAmount.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono py-2">{alloc.taxRate?.toFixed(2) || "0.00"}</TableCell>
                                <TableCell className="text-right font-mono py-2">{parseFloat(alloc.taxAmount?.toString() || "0").toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono py-2 text-blue-600 dark:text-blue-400">{remaining.toFixed(2)}</TableCell>
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-1">
                                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-green-500 dark:bg-green-400 rounded-full"
                                        style={{ width: `${allocationPercentage}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8">{allocationPercentage}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Detailed Bill Entry Information */}
                    {/* <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Bill Entry Details</h4>
                      {allocations.map((alloc, index) => (
                        <div key={alloc.id} className="border rounded-md p-3 bg-slate-50 dark:bg-slate-900">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-mono font-bold text-sm">{alloc.BillEntry?.billNumber || "-"}</p>
                              <p className="text-xs text-muted-foreground">Bill #{index + 1} | Allocation ID: {alloc.id || "-"}</p>
                            </div>
                            <Badge className={`text-xs ${alloc.BillEntry?.status ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                              {alloc.BillEntry?.status || "Active"}
                            </Badge>
                          </div>

                          {alloc.description && (
                            <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-800">
                              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Description</p>
                              <p className="text-xs text-blue-900 dark:text-blue-100">{alloc.description}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Bill Date</p>
                              <p className="font-medium">{alloc.BillEntry?.billDate ? new Date(alloc.BillEntry.billDate).toLocaleDateString() : "-"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Due Date</p>
                              <p className="font-medium">{alloc.BillEntry?.dueDate ? new Date(alloc.BillEntry.dueDate).toLocaleDateString() : "-"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Currency</p>
                              <p className="font-medium">{alloc.currencyCode || "LKR"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Amount</p>
                              <p className="font-mono font-bold">{parseFloat(alloc.BillEntry?.totalAmount?.toString() || "0").toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Already Paid</p>
                              <p className="font-mono font-bold text-amber-600 dark:text-amber-400">{parseFloat(alloc.BillEntry?.paidAmount?.toString() || "0").toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">This Payment</p>
                              <p className="font-mono font-bold text-green-600 dark:text-green-400">{parseFloat(alloc.allocatedAmount?.toString() || "0").toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Still Due</p>
                              <p className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                {(
                                  parseFloat(alloc.BillEntry?.totalAmount?.toString() || "0") -
                                  parseFloat(alloc.BillEntry?.paidAmount?.toString() || "0") -
                                  parseFloat(alloc.allocatedAmount?.toString() || "0")
                                ).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div> */}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-semibold">Payment Workflow</p>
                  <div className="flex gap-2 flex-wrap">
                    {/* Edit/Delete Buttons for authorized users or draft */}
                    {((selectedBillPayment.status === "Draft") || (selectedBillPayment.status === "Posted" && hasPermission("bill-payment:edit"))) && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                          onClick={() => {
                            setIsViewDialogOpen(false)
                            handleEditBillPayment(selectedBillPayment)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200">
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-red-600">Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the Bill Payment and revert any bill allocations.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                onClick={async () => {
                                  await handleDeleteBillPayment(selectedBillPayment.id)
                                  setIsViewDialogOpen(false)
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}

                    {/* Draft -> Allocated: Allocate Button */}
                    {selectedBillPayment.status === "Draft" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200">
                            Allocate
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Allocate Bills to Payment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will mark the payment as Allocated. You can then submit it for approval.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleSubmitBillPayment(selectedBillPayment.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? "Processing..." : "Allocate"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Allocated/Draft -> Submitted: Submit Button */}
                    {(selectedBillPayment.status === "Draft" || selectedBillPayment.status === "Allocated") && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                            Submit
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Submit Bill Payment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Submit this payment for approval. Once submitted, it will require approval before posting.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleSubmitBillPayment(selectedBillPayment.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? "Processing..." : "Submit"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Submitted -> Approved: Approve Button */}
                    {selectedBillPayment.status === "Submitted" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                            Approve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve Bill Payment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Approve this payment. Once approved, it can be posted to the accounting system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleApproveBillPayment(selectedBillPayment.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? "Processing..." : "Approve"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Approved -> Posted: Post Button */}
                    {selectedBillPayment.status === "Approved" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white">
                            Post
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Post Bill Payment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Post this payment to the accounting system. This will record the payment in the ledger.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePostBillPayment(selectedBillPayment.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? "Processing..." : "Post"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Cancel Button for Draft/Allocated/Submitted/Approved */}
                    {["Draft", "Allocated", "Submitted", "Approved"].includes(selectedBillPayment.status) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                            Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Bill Payment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              <div className="space-y-2 mt-2">
                                <p>Are you sure you want to cancel this payment?</p>
                                <div>
                                  <Label htmlFor="cancellation-reason" className="text-xs font-medium">Cancellation Reason</Label>
                                  <Input
                                    id="cancellation-reason"
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    placeholder="Enter reason for cancellation"
                                    className="h-8 text-sm mt-1"
                                  />
                                </div>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep It</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancelBillPayment(selectedBillPayment.id)}
                              disabled={isProcessing}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {isProcessing ? "Cancelling..." : "Cancel Payment"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Posted Status: Show as Completed */}
                    {selectedBillPayment.status === "Posted" && (
                      <div className="flex items-center gap-2 w-full">
                        <Badge className="bg-purple-100 text-purple-800 text-xs">
                          ✓ Posted to Ledger
                        </Badge>
                        <p className="text-xs text-muted-foreground flex-1">
                          This payment has been successfully posted. Transaction ID: {selectedBillPayment.journalEntryId || "N/A"}
                        </p>
                      </div>
                    )}

                    {/* Cancelled Status: Show as Completed */}
                    {selectedBillPayment.status === "Cancelled" && (
                      <div className="flex items-center gap-2 w-full">
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          ✗ Cancelled
                        </Badge>
                        <p className="text-xs text-muted-foreground flex-1">
                          This payment has been cancelled.
                          {selectedBillPayment.rejectionReason && ` Reason: ${selectedBillPayment.rejectionReason}`}
                        </p>
                      </div>
                    )}

                    {/* Rejected Status: Show as Completed */}
                    {selectedBillPayment.status === "Rejected" && (
                      <div className="flex items-center gap-2 w-full">
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          ✗ Rejected
                        </Badge>
                        <p className="text-xs text-muted-foreground flex-1">
                          This payment has been rejected.
                          {selectedBillPayment.rejectionReason && ` Reason: ${selectedBillPayment.rejectionReason}`}
                        </p>
                      </div>
                    )}

                    {/* No actions available message */}
                    {!["Draft", "Allocated", "Submitted", "Approved", "Posted", "Cancelled", "Rejected"].includes(selectedBillPayment.status) && (
                      <div className="w-full">
                        <p className="text-xs text-muted-foreground">
                          No actions available for status: <span className="font-medium">{selectedBillPayment.status}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} size="sm" className="text-sm">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
