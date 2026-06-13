"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Eye, FileText, CheckCircle2, XCircle, Trash2, Printer, Landmark, Calendar, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { format } from "date-fns"
import { bankDepositsApi, ledgerAccountsApi, locationsApi, accountingReportsApi, BankDeposit, LedgerAccount, Location, ReceiptPayment, LedgerDetailsReport } from "@/lib/api"

export default function BankDepositsPage() {
    const [bankDeposits, setBankDeposits] = useState<BankDeposit[]>([])
    const [bankAccounts, setBankAccounts] = useState<LedgerAccount[]>([])
    const [allLedgerAccounts, setAllLedgerAccounts] = useState<LedgerAccount[]>([])
    const [pendingPayments, setPendingPayments] = useState<ReceiptPayment[]>([])
    const [selectedPayments, setSelectedPayments] = useState<number[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("All")
    const [depositType, setDepositType] = useState<"1" | "4">("1") // 1: Cash, 4: Cheque
    const [ledgerAccountIdFilter, setLedgerAccountIdFilter] = useState<string>("All")

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [selectedDeposit, setSelectedDeposit] = useState<BankDeposit | null>(null)

    // AlertDialog states
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isPostDialogOpen, setIsPostDialogOpen] = useState(false)
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
    const [actionId, setActionId] = useState<number | null>(null)

    const [formData, setFormData] = useState({
        depositDate: format(new Date(), "yyyy-MM-dd"),
        bankAccountId: "",
        description: "",
        referenceNumber: "",
        cashLedgerAccountId: "",
        cashTotalAmount: "",
    })

    const { toast } = useToast()

    useEffect(() => {
        loadData()
    }, [])

    // Check for "view" query param on mount to open view dialog
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const viewId = queryParams.get("view")
        if (viewId) {
            handleViewDeposit(parseInt(viewId))
        }
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [depositsData, banksData, locationsData, allAccountsData] = await Promise.all([
                bankDepositsApi.getAll<BankDeposit>(),
                ledgerAccountsApi.getBankAccounts<LedgerAccount>(),
                locationsApi.getAll<Location>(),
                ledgerAccountsApi.getAllAccounts<LedgerAccount>()
            ])

            setBankDeposits(Array.isArray(depositsData) ? depositsData : (depositsData as any)?.data || [])
            setBankAccounts(Array.isArray(banksData) ? banksData : (banksData as any)?.data || [])
            setAllLedgerAccounts(Array.isArray(allAccountsData) ? allAccountsData : (allAccountsData as any)?.data || [])
            setLocations(Array.isArray(locationsData) ? locationsData : [])
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load data",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const loadPendingPayments = async (typeToAutoSelect: string | null = null, depositDate?: string, paymentTypeId?: string) => {
        try {
            // Find current active location
            const activeLocation = locations.find(l => l.isActive) || locations[0]
            if (!activeLocation) return

            const params: any = { locationId: activeLocation.id }
            if (depositDate) params.depositDate = depositDate
            if (paymentTypeId) params.paymentTypeId = parseInt(paymentTypeId)

            const payments = await bankDepositsApi.getPendingPayments(params)
            setPendingPayments(payments)

            if (typeToAutoSelect === "1") {
                // Server already filtered by paymentTypeId=1, so select all returned payments
                setSelectedPayments(payments.map((p: any) => p.id as number))
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load pending payments",
                variant: "destructive",
            })
        }
    }

    const fetchLedgerBalance = async (ledgerId: string, date: string) => {
        if (!ledgerId || !date) return
        try {
            const response = await accountingReportsApi.getLedgerDetails({
                ledgerAccountId: parseInt(ledgerId),
                startDate: date,
                endDate: date
            })
            if (response.success && response.balances) {
                if (response.balances.closingBalanceType === 'CR') {
                    toast({
                        title: "Account Negative Balance",
                        description: "Selected cash account has a negative (Credit) balance on this date. You cannot deposit from a negative balance account.",
                        variant: "destructive",
                    })
                    setFormData(prev => ({
                        ...prev,
                        cashTotalAmount: "0.00"
                    }))
                } else {
                    setFormData(prev => ({
                        ...prev,
                        cashTotalAmount: response.balances.closingBalance.toString()
                    }))
                }
            }
        } catch (error) {
            console.error("Error fetching ledger balance:", error)
        }
    }

    const handleOpenCreateDialog = () => {
        resetForm()
        loadPendingPayments("1", undefined, "1") // Cash: server-filter by paymentTypeId=1 and auto-select all
        setIsCreateDialogOpen(true)
    }

    const resetForm = () => {
        setFormData({
            depositDate: format(new Date(), "yyyy-MM-dd"),
            bankAccountId: "",
            description: "",
            referenceNumber: "",
            cashLedgerAccountId: "",
            cashTotalAmount: "",
        })
        setDepositType("1")
        setLedgerAccountIdFilter("All")
        setSelectedPayments([])
    }

    const handleCreateDeposit = async () => {
        if (!formData.bankAccountId) {
            toast({
                title: "Validation Error",
                description: "Please select a bank account",
                variant: "destructive",
            })
            return
        }

        if (depositType === "1") {
            if (!formData.cashLedgerAccountId) {
                toast({
                    title: "Validation Error",
                    description: "Please select a cash ledger account",
                    variant: "destructive",
                })
                return
            }
            if (!formData.cashTotalAmount || isNaN(parseFloat(formData.cashTotalAmount)) || parseFloat(formData.cashTotalAmount) <= 0) {
                toast({
                    title: "Validation Error",
                    description: "Please enter a valid amount",
                    variant: "destructive",
                })
                return
            }
        } else {
            if (selectedPayments.length === 0) {
                toast({
                    title: "Validation Error",
                    description: "Please select at least one payment to deposit",
                    variant: "destructive",
                })
                return
            }
        }

        try {
            let depositItems: any[] = []
            if (depositType === "1") {
                const totalEntered = parseFloat(formData.cashTotalAmount)
                const matchingPayments = pendingPayments.filter(p => p.ledgerAccountId?.toString() === formData.cashLedgerAccountId)
                const theoreticalTotal = matchingPayments.reduce((sum, p) => sum + parseFloat(p.paymentAmount?.toString() || p.amount?.toString() || "0"), 0)

                if (Math.abs(totalEntered - theoreticalTotal) < 0.01 && matchingPayments.length > 0) {
                    depositItems = matchingPayments.map(p => ({
                        ledgerAccountId: parseInt(formData.cashLedgerAccountId),
                        receiptPaymentId: p.id as number,
                        amount: parseFloat(p.paymentAmount?.toString() || p.amount?.toString() || "0"),
                        description: `Deposit for Receipt #${(p as any).receipt?.receiptNo || "Walk-in"}`
                    }))
                } else {
                    depositItems = [{
                        ledgerAccountId: parseInt(formData.cashLedgerAccountId),
                        amount: totalEntered,
                        description: "Cash Deposit"
                    }]
                }
            } else {
                depositItems = selectedPayments.map(paymentId => {
                    const payment = pendingPayments.find(p => p.id === paymentId)
                    return {
                        receiptPaymentId: paymentId,
                        amount: parseFloat(payment?.paymentAmount?.toString() || payment?.amount?.toString() || "0"),
                        description: `Deposit for Receipt #${payment?.Receipt?.receiptNo || payment?.receiptId || "Walk-in"}`
                    }
                })
            }

            const payload = {
                depositDate: formData.depositDate,
                bankAccountId: parseInt(formData.bankAccountId),
                depositItems,
                description: formData.description,
                referenceNumber: formData.referenceNumber,
            }

            await bankDepositsApi.create(payload)

            toast({
                title: "Success",
                description: "Bank deposit created successfully as Draft",
            })

            setIsCreateDialogOpen(false)
            loadData()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create bank deposit",
                variant: "destructive",
            })
        }
    }

    const handleViewDeposit = async (id: number) => {
        try {
            const deposit = await bankDepositsApi.getById(id)
            setSelectedDeposit(deposit)
            setIsViewDialogOpen(true)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to fetch deposit details",
                variant: "destructive",
            })
        }
    }

    const handlePostDeposit = async () => {
        if (!actionId) return
        try {
            await bankDepositsApi.post(actionId)
            toast({
                title: "Success",
                description: "Bank deposit posted successfully",
            })
            setIsPostDialogOpen(false)
            loadData()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to post deposit",
                variant: "destructive",
            })
        }
    }

    const handleCancelDeposit = async () => {
        if (!actionId) return
        try {
            await bankDepositsApi.cancel(actionId)
            toast({
                title: "Success",
                description: "Bank deposit cancelled successfully",
            })
            setIsCancelDialogOpen(false)
            loadData()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to cancel deposit",
                variant: "destructive",
            })
        }
    }

    const handleDeleteDeposit = async () => {
        if (!actionId) return
        try {
            await bankDepositsApi.remove(actionId)
            toast({
                title: "Success",
                description: "Bank deposit deleted successfully",
            })
            setIsDeleteDialogOpen(false)
            loadData()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete deposit",
                variant: "destructive",
            })
        }
    }

    const togglePaymentSelection = (id: number) => {
        setSelectedPayments(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        )
    }

    const totalSelectedAmount = depositType === "1"
        ? (parseFloat(formData.cashTotalAmount) || 0)
        : selectedPayments.reduce((sum, id) => {
            const payment = pendingPayments.find(p => p.id === id)
            return sum + parseFloat((payment?.paymentAmount || payment?.amount || 0).toString())
        }, 0)

    const selectedBankAccount = bankAccounts.find(ba => ba.id.toString() === formData.bankAccountId)

    // Get unique ledger accounts from pending payments for filtering
    const sourceLedgerAccounts = Array.from(new Set(
        pendingPayments
            .filter(p => p.paymentTypeId === parseInt(depositType))
            .map(p => p.ledgerAccountId || (p as any).ledger_account_id)
            .filter((id): id is number => id !== undefined && id !== null)
    )).map(id => {
        const la = allLedgerAccounts.find(a => a.id === id)
        return { id: id, name: la?.name || `Account #${id}` }
    })

    const filteredPendingPayments = pendingPayments.filter(p => {
        // paymentTypeId is already filtered server-side; apply remaining client filters

        // Filter by Source Ledger Account
        const pLedgerAccountId = p.ledgerAccountId || (p as any).ledger_account_id
        if (ledgerAccountIdFilter !== "All" && pLedgerAccountId?.toString() !== ledgerAccountIdFilter) {
            return false
        }

        // Filter by Bank ID if account selected
        if (selectedBankAccount?.bankId) {
            return !p.bankId || p.bankId === selectedBankAccount.bankId
        }
        return true
    })

    const filteredDeposits = bankDeposits.filter(deposit => {
        const matchesSearch = deposit.depositNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            deposit.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            deposit.description?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === "All" || deposit.status === statusFilter
        return matchesSearch && matchesStatus
    })

    return (
        <ERPLayout>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Bank Deposits</h1>
                        <p className="text-gray-600">Manage bank deposits</p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex gap-2 items-center flex-1 w-full md:w-auto">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search deposits..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Statuses</SelectItem>
                                <SelectItem value="Draft">Draft</SelectItem>
                                <SelectItem value="Posted">Posted</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleOpenCreateDialog} className="w-full md:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        New Bank Deposit
                    </Button>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Deposit #</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Bank Account</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10">
                                            Loading bank deposits...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredDeposits.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10">
                                            No bank deposits found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDeposits.map((deposit) => (
                                        <TableRow key={deposit.id}>
                                            <TableCell className="font-medium">{deposit.depositNumber}</TableCell>
                                            <TableCell>{format(new Date(deposit.depositDate), "dd MMM yyyy")}</TableCell>
                                            <TableCell>{deposit.BankAccount?.name || "N/A"}</TableCell>
                                            <TableCell>{deposit.referenceNumber || "-"}</TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {parseFloat(deposit.totalAmount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    deposit.status === "Posted" ? "outline" :
                                                        deposit.status === "Draft" ? "secondary" :
                                                            "destructive"
                                                }>
                                                    {deposit.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="icon" title="View" onClick={() => handleViewDeposit(deposit.id)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {deposit.status === "Draft" && (
                                                        <>
                                                            <Button variant="outline" size="icon" title="Post" onClick={() => { setActionId(deposit.id); setIsPostDialogOpen(true); }}>
                                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                            </Button>
                                                            <Button variant="outline" size="icon" title="Delete" onClick={() => { setActionId(deposit.id); setIsDeleteDialogOpen(true); }} className="text-destructive">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {deposit.status === "Posted" && (
                                                        <Button variant="outline" size="icon" title="Cancel" onClick={() => { setActionId(deposit.id); setIsCancelDialogOpen(true); }} className="text-destructive">
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Create Dialog */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>New Bank Deposit</DialogTitle>
                            <DialogDescription>
                                Create a new bank deposit by selecting payments and a destination bank account.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex justify-center bg-muted/30 rounded-lg">
                            <RadioGroup
                                value={depositType}
                                onValueChange={(val) => {
                                    setDepositType(val as "1" | "4")
                                    setLedgerAccountIdFilter("All")
                                    if (val === "1") {
                                        // Switch to cash: server-filter by paymentTypeId=1 and auto-select all
                                        loadPendingPayments("1", undefined, "1")
                                    } else {
                                        // Switch to cheque: server-filter by paymentTypeId=4 and depositDate
                                        loadPendingPayments(null, formData.depositDate, "4")
                                        setSelectedPayments([])
                                    }
                                }}
                                className="flex gap-8"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="1" id="cash" />
                                    <Label htmlFor="cash" className="font-semibold cursor-pointer">Cash Deposits</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="4" id="cheque" />
                                    <Label htmlFor="cheque" className="font-semibold cursor-pointer">Cheque Deposits</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">

                            <div className="space-y-2">
                                <div className="space-y-2">
                                    <Label htmlFor="depositDate">Deposit Date <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="depositDate"
                                        type="date"
                                        value={formData.depositDate}
                                        onChange={(e) => {
                                            const newDate = e.target.value
                                            setFormData({ ...formData, depositDate: newDate })
                                            if (depositType === "1" && formData.cashLedgerAccountId) {
                                                fetchLedgerBalance(formData.cashLedgerAccountId, newDate)
                                            }
                                            if (depositType === "4") {
                                                // Re-fetch cheques server-filtered by new deposit date
                                                loadPendingPayments(null, newDate, "4")
                                                setSelectedPayments([])
                                            }
                                        }}
                                    />
                                </div>
                                {depositType === "1" ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center bg-muted/80 p-2 rounded-t-md">
                                            <Label className="font-semibold px-2">Cash Deposit Details</Label>
                                        </div>
                                        <div className="border rounded-md p-4 space-y-4 border-t-0 rounded-t-none -mt-4">
                                            <div className="space-y-2 mt-2">
                                                <Label htmlFor="cashLedgerAccountId">Source Cash Account <span className="text-red-500">*</span></Label>
                                                <Select
                                                    value={formData.cashLedgerAccountId}
                                                    onValueChange={(val) => {
                                                        setFormData({
                                                            ...formData,
                                                            cashLedgerAccountId: val
                                                        });
                                                        fetchLedgerBalance(val, formData.depositDate);
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select cash ledger account" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {allLedgerAccounts
                                                            .filter(l => l.ledgerType === 'CASH' || l.ledgerType === 'PETTY_CASH' || l.ledgerType === 'CASH_BOOK' || l.name.toLowerCase().includes('cash'))
                                                            .map(la => (
                                                                <SelectItem key={la.id} value={la.id.toString()}>
                                                                    {la.name} {la.ledgerCode ? `(${la.ledgerCode})` : ''}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="cashTotalAmount">Total Cash Amount <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="cashTotalAmount"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.cashTotalAmount}
                                                    onChange={(e) => setFormData({ ...formData, cashTotalAmount: e.target.value })}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <Label>Select Pending Payments</Label>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    {/* <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Filter Account:</span> */}
                                                    <Select
                                                        value={ledgerAccountIdFilter}
                                                        onValueChange={(val) => setLedgerAccountIdFilter(val)}
                                                    >
                                                        <SelectTrigger className="h-8 w-[180px] text-xs">
                                                            <SelectValue placeholder="All Accounts" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="All">All Accounts</SelectItem>
                                                            {sourceLedgerAccounts.map(la => (
                                                                <SelectItem key={la.id} value={la.id.toString()}>
                                                                    {la.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-center gap-2 px-2 py-1 bg-accent rounded-md cursor-pointer"
                                                    onClick={() => {
                                                        if (selectedPayments.length === filteredPendingPayments.length) {
                                                            setSelectedPayments([])
                                                        } else {
                                                            setSelectedPayments(filteredPendingPayments.map(p => p.id as number))
                                                        }
                                                    }}>
                                                    <Checkbox
                                                        checked={selectedPayments.length > 0 && selectedPayments.length === filteredPendingPayments.length}
                                                        onCheckedChange={() => { }} // Handled by div onClick
                                                    />
                                                    <span className="text-xs font-medium">Select All</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="border rounded-md overflow-hidden min-h-[300px] max-h-[320px] flex flex-col">
                                            <div className="bg-muted p-2 text-xs font-semibold flex justify-between border-b px-4">
                                                <span>Payment Details</span>
                                                <span>Amount</span>
                                            </div>
                                            <div className="overflow-y-auto flex-1 h-full">
                                                {filteredPendingPayments.length === 0 ? (
                                                    <div className="text-center py-10 text-muted-foreground text-sm">
                                                        {formData.bankAccountId ? "No pending payments matching this bank" : depositType === "4" ? `No cheques with cheque date on or before ${formData.depositDate}` : "No pending payments to deposit"}
                                                    </div>
                                                ) : (
                                                    filteredPendingPayments.map(payment => (
                                                        <div
                                                            key={payment.id}
                                                            className="flex items-center gap-3 p-2 border-b hover:bg-accent cursor-pointer"
                                                            onClick={() => togglePaymentSelection(payment.id as number)}
                                                        >
                                                            <Checkbox checked={selectedPayments.includes(payment.id as number)} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">
                                                                    {payment.receipt?.Customer?.name || "Walk-in Customer"}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {payment.chequeNo ? `Cheque: ${payment.chequeNo}` : `Ref: ${payment.referenceNo || "N/A"}`}
                                                                    {payment.bankName ? ` (${payment.bankName})` : ""}
                                                                    {(payment as any).chequeDate ? (
                                                                        <span className="ml-2 font-semibold text-blue-600">
                                                                            · Cheque Date: {format(new Date((payment as any).chequeDate), "dd/MM/yy")}
                                                                        </span>
                                                                    ) : null}
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground">
                                                                    Receipt: {payment.receipt?.receiptNo} | {format(new Date(payment.Receipt?.receiptDate || new Date()), "dd/MM/yy")}
                                                                </p>
                                                            </div>
                                                            <div className="text-sm font-semibold tabular-nums">
                                                                {parseFloat((payment.paymentAmount || payment.amount || 0).toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bankAccountId">Destination Bank Account <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={formData.bankAccountId}
                                        onValueChange={(val) => setFormData({ ...formData, bankAccountId: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select bank account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankAccounts.map(bank => (
                                                <SelectItem key={bank.id} value={bank.id.toString()}>
                                                    {bank.name} - {bank.accountNumber || "No Account #"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="referenceNumber">Reference Number (e.g. Slip #)</Label>
                                    <Input
                                        id="referenceNumber"
                                        value={formData.referenceNumber}
                                        onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                        placeholder="Enter bank reference"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Enter description"
                                    />
                                </div>

                                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">Selected Payments:</span>
                                        <span className="text-sm">{selectedPayments.length} items</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-lg font-bold">Total Deposit:</span>
                                        <span className="text-lg font-bold">
                                            {totalSelectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateDeposit} disabled={depositType === "1" ? (!formData.cashLedgerAccountId || !formData.cashTotalAmount) : selectedPayments.length === 0}>Create Deposit</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Bank Deposit Details - {selectedDeposit?.depositNumber}</DialogTitle>
                        </DialogHeader>
                        {selectedDeposit && (
                            <div className="space-y-6 py-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                                    <div>
                                        <Label className="text-muted-foreground">Deposit Date</Label>
                                        <p className="font-medium">{format(new Date(selectedDeposit.depositDate), "dd MMM yyyy")}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Bank Account</Label>
                                        <p className="font-medium">{selectedDeposit.BankAccount?.name || "N/A"}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Total Amount</Label>
                                        <p className="font-bold text-lg">
                                            {parseFloat(selectedDeposit.totalAmount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Status</Label>
                                        <div className="mt-1">
                                            <Badge variant={selectedDeposit.status === "Posted" ? "outline" : "secondary"}>{selectedDeposit.status}</Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Reference</Label>
                                        <p className="font-medium">{selectedDeposit.referenceNumber || "-"}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Created By</Label>
                                        <p className="font-medium">{selectedDeposit.Creator?.fullName || "System"}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold border-b pb-2">Deposit Items</h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Receipt #</TableHead>
                                                <TableHead>Payment Info</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedDeposit.Items?.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.ReceiptPayment?.receipt?.receiptNo || "N/A"}</TableCell>
                                                    <TableCell>
                                                        <p className="text-xs">
                                                            {item.ReceiptPayment?.chequeNo ? `Cheque: ${item.ReceiptPayment.chequeNo}` : `Ref: ${item.ReceiptPayment?.referenceNo || "N/A"}`}
                                                            {item.ReceiptPayment?.bankName ? ` (${item.ReceiptPayment.bankName})` : ""}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {parseFloat(item.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {selectedDeposit.description && (
                                    <div className="p-3 bg-muted rounded-md text-sm">
                                        <Label className="text-muted-foreground mb-1 block">Description</Label>
                                        <p>{selectedDeposit.description}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                            {selectedDeposit?.status === "Draft" && (
                                <Button onClick={() => { setActionId(selectedDeposit.id); setIsPostDialogOpen(true); setIsViewDialogOpen(false); }}>
                                    Post Deposit
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Confirmation Dialogs */}
                <AlertDialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Post Bank Deposit?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will finalize the deposit and create a journal entry in the GL. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handlePostDeposit}>Confirm Post</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Bank Deposit?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to cancel this deposit? The linked payments will be marked as "Not Deposited" again.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>No, Keep it</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCancelDeposit} className="bg-destructive text-destructive-foreground">Yes, Cancel Deposit</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Draft Deposit?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete this draft deposit record.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteDeposit} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </ERPLayout>
    )
}
