"use client"

import { useState, useEffect } from "react"
import { Plus, Eye, CheckCircle, XCircle, FileText, Download, Search, Filter, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    bankReconciliationsApi,
    BankReconciliation,
    BankReconciliationItem,
    UnreconciledTransaction,
    ledgerAccountsApi,
    LedgerAccount,
    BankReconciliationSummary
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Checkbox } from "@/components/ui/checkbox"

interface PaginationData {
    total: number
    page: number
    limit: number
    totalPages: number
}

export default function BankReconciliationsPage() {
    const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([])
    const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 10, totalPages: 1 })
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("All")

    // Create/Edit Dialog States
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [creationStep, setCreationStep] = useState(0)
    const [bankAccounts, setBankAccounts] = useState<LedgerAccount[]>([])
    const [selectedBankAccountId, setSelectedBankAccountId] = useState<number>(0)
    const [reconciliationNumber, setReconciliationNumber] = useState("")
    const [reconciliationDate, setReconciliationDate] = useState(new Date().toISOString().split('T')[0])
    const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0])
    const [openingBalance, setOpeningBalance] = useState<number>(0)
    const [statementBalance, setStatementBalance] = useState<number>(0)
    const [remarks, setRemarks] = useState("")
    const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0])
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

    // Categorized transactions for dialog
    const [checksAndPayments, setChecksAndPayments] = useState<UnreconciledTransaction[]>([])
    const [depositsAndCredits, setDepositsAndCredits] = useState<UnreconciledTransaction[]>([])
    const [selectedChecksAndPayments, setSelectedChecksAndPayments] = useState<number[]>([])
    const [selectedDepositsAndCredits, setSelectedDepositsAndCredits] = useState<number[]>([])

    // View/Reconcile Dialog States
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [selectedReconciliation, setSelectedReconciliation] = useState<BankReconciliation | null>(null)
    const [unreconciledTransactions, setUnreconciledTransactions] = useState<UnreconciledTransaction[]>([])
    const [bookItems, setBookItems] = useState<BankReconciliationItem[]>([])
    const [statementItems, setStatementItems] = useState<BankReconciliationItem[]>([])
    const [selectedBookItems, setSelectedBookItems] = useState<number[]>([])
    const [selectedStatementItems, setSelectedStatementItems] = useState<number[]>([])
    const [reconciliationSummary, setReconciliationSummary] = useState<BankReconciliationSummary | null>(null)

    // Statement Entry States
    const [statementLines, setStatementLines] = useState<Array<{
        transactionDate: string
        description: string
        referenceNumber: string
        debitAmount: number
        creditAmount: number
    }>>([])

    const { toast } = useToast()

    useEffect(() => {
        loadReconciliations(1)
        loadBankAccounts()
    }, [])

    useEffect(() => {
        if (isCreateDialogOpen && selectedBankAccountId && dateFrom && dateTo) {
            loadUnreconciledTransactionDetails()
        }
    }, [selectedBankAccountId, dateFrom, dateTo, isCreateDialogOpen])

    const loadUnreconciledTransactionDetails = async () => {
        try {
            const response = await bankReconciliationsApi.getUnreconciledTransactionDetails(selectedBankAccountId, {
                dateFrom,
                dateTo
            })

            const checks = response.checksAndPayments || []
            const deposits = response.depositsAndCredits || []

            setChecksAndPayments(checks)
            setDepositsAndCredits(deposits)
            setOpeningBalance(response.openingBalance || 0)

            // Clear selections when data reloads
            setSelectedChecksAndPayments([])
            setSelectedDepositsAndCredits([])
        } catch (error: any) {
            console.error("Failed to load unreconciled transaction details:", error)
            setChecksAndPayments([])
            setDepositsAndCredits([])
        }
    }

    const loadReconciliations = async (page: number = 1) => {
        try {
            setLoading(true)
            const response = await bankReconciliationsApi.getAll({ page, limit: 10 })
            setReconciliations(response.data || [])
            setPagination(response.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load bank reconciliations",
                variant: "destructive",
            })
            setReconciliations([])
        } finally {
            setLoading(false)
        }
    }

    const loadBankAccounts = async () => {
        try {
            const response = await ledgerAccountsApi.getBankAccounts()
            const accounts = (response as any)?.data || response
            setBankAccounts(Array.isArray(accounts) ? accounts : [])
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load bank accounts",
                variant: "destructive",
            })
        }
    }

    const loadUnreconciledTransactions = async (bankAccountId: number, asOfDate?: string) => {
        try {
            const transactions = await bankReconciliationsApi.getUnreconciledTransactions(bankAccountId, asOfDate)
            setUnreconciledTransactions(transactions)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load unreconciled transactions",
                variant: "destructive",
            })
        }
    }

    const loadReconciliationDetails = async (id: number) => {
        try {
            const reconciliation = await bankReconciliationsApi.getById(id)
            setSelectedReconciliation(reconciliation)

            // Separate book and statement items
            const items = reconciliation.items || []
            setBookItems(items.filter(item => item.transactionType === 'Book'))
            setStatementItems(items.filter(item => item.transactionType === 'Statement'))

            // Load summary
            const summary = await bankReconciliationsApi.getSummary(id)
            setReconciliationSummary(summary)

            // Load unreconciled transactions
            await loadUnreconciledTransactions(reconciliation.bankAccountId, reconciliation.reconciliationDate)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load reconciliation details",
                variant: "destructive",
            })
        }
    }

    const handleCreateReconciliation = async () => {
        try {
            if (!selectedBankAccountId) {
                toast({
                    title: "Validation Error",
                    description: "Please select a bank account",
                    variant: "destructive",
                })
                return
            }

            setIsProcessing(true)

            // Collect selected items
            const selectedItems = [
                ...checksAndPayments.filter(t => selectedChecksAndPayments.includes(t.id)),
                ...depositsAndCredits.filter(t => selectedDepositsAndCredits.includes(t.id))
            ]

            const payload = {
                bankAccountId: selectedBankAccountId,
                reconciliationNumber,
                reconciliationDate,
                statementDate,
                statementPeriodFrom: dateFrom,
                statementPeriodTo: dateTo,
                openingBalance,
                closingBalance: statementBalance,
                remarks,
                items: selectedItems
            }

            await bankReconciliationsApi.create(payload)

            toast({
                title: "Success",
                description: "Bank reconciliation created successfully",
            })

            setIsCreateDialogOpen(false)
            resetCreateForm()
            loadReconciliations(pagination.page)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create bank reconciliation",
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            const lines = text.split('\n')
            // Simple CSV parser assuming header: Date,Description,Debit,Credit
            const parsedLines = lines.slice(1).filter(line => line.trim()).map(line => {
                const parts = line.split(',')
                return {
                    transactionDate: parts[0]?.trim() || new Date().toISOString().split('T')[0],
                    description: parts[1]?.trim() || "",
                    referenceNumber: "",
                    debitAmount: parseFloat(parts[2]) || 0,
                    creditAmount: parseFloat(parts[3]) || 0,
                }
            })
            setStatementLines([...statementLines, ...parsedLines])

            toast({
                title: "File Uploaded",
                description: `Loaded ${parsedLines.length} lines from CSV. Review and save.`,
            })
        }
        reader.readAsText(file)
    }

    const handleAddStatementLine = () => {
        setStatementLines([...statementLines, {
            transactionDate: statementDate,
            description: "",
            referenceNumber: "",
            debitAmount: 0,
            creditAmount: 0,
        }])
    }

    const handleRemoveStatementLine = (index: number) => {
        setStatementLines(statementLines.filter((_, i) => i !== index))
    }

    const handleAddStatementItems = async () => {
        if (!selectedReconciliation) return

        try {
            setIsProcessing(true)

            const items = statementLines.map(line => ({
                transactionType: 'Statement' as const,
                transactionDate: line.transactionDate,
                description: line.description,
                referenceNumber: line.referenceNumber,
                debitAmount: line.debitAmount,
                creditAmount: line.creditAmount,
                isMatched: false,
            }))

            await bankReconciliationsApi.addItems(selectedReconciliation.id!, items)

            toast({
                title: "Success",
                description: "Statement items added successfully",
            })

            setStatementLines([])
            await loadReconciliationDetails(selectedReconciliation.id!)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to add statement items",
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleAddBookTransactions = async () => {
        if (!selectedReconciliation || selectedBookItems.length === 0) return

        try {
            setIsProcessing(true)

            const items = unreconciledTransactions
                .filter(t => selectedBookItems.includes(t.id))
                .map(t => ({
                    transactionType: 'Book' as const,
                    transactionDate: t.transactionDate || new Date().toISOString().split('T')[0],
                    description: t.description,
                    referenceNumber: t.referenceNumber || '',
                    debitAmount: t.debitAmount,
                    creditAmount: t.creditAmount,
                    isMatched: false,
                    journalEntryId: t.transactionType === 'Journal' ? t.referenceId : undefined,
                    receiptId: t.transactionType === 'Receipt' ? t.referenceId : undefined,
                    paymentId: t.transactionType === 'Payment' ? t.referenceId : undefined,
                    transferId: t.transactionType === 'Transfer' ? t.referenceId : undefined,
                }))

            await bankReconciliationsApi.addItems(selectedReconciliation.id!, items)

            toast({
                title: "Success",
                description: "Book transactions added successfully",
            })

            setSelectedBookItems([])
            await loadReconciliationDetails(selectedReconciliation.id!)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to add book transactions",
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleMatchItems = async () => {
        if (!selectedReconciliation || selectedBookItems.length !== 1 || selectedStatementItems.length !== 1) {
            toast({
                title: "Validation Error",
                description: "Please select exactly one book item and one statement item to match",
                variant: "destructive",
            })
            return
        }

        try {
            setIsProcessing(true)

            await bankReconciliationsApi.matchItems(selectedReconciliation.id!, {
                bookItemId: selectedBookItems[0],
                statementItemId: selectedStatementItems[0],
            })

            toast({
                title: "Success",
                description: "Items matched successfully",
            })

            setSelectedBookItems([])
            setSelectedStatementItems([])
            await loadReconciliationDetails(selectedReconciliation.id!)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to match items",
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleCompleteReconciliation = async (id: number) => {
        try {
            setIsProcessing(true)
            await bankReconciliationsApi.complete(id)

            toast({
                title: "Success",
                description: "Reconciliation completed successfully",
            })

            setIsViewDialogOpen(false)
            loadReconciliations(pagination.page)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to complete reconciliation",
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleApproveReconciliation = async (id: number) => {
        try {
            setIsProcessing(true)
            await bankReconciliationsApi.approve(id)

            toast({
                title: "Success",
                description: "Reconciliation approved successfully",
            })

            setIsViewDialogOpen(false)
            loadReconciliations(pagination.page)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to approve reconciliation",
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const resetCreateForm = () => {
        setCreationStep(0)
        setSelectedBankAccountId(0)
        setReconciliationNumber("")
        setReconciliationDate(new Date().toISOString().split('T')[0])
        setStatementDate(new Date().toISOString().split('T')[0])
        setOpeningBalance(0)
        setStatementBalance(0)
        setRemarks("")
        setDateFrom(new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0])
        setDateTo(new Date().toISOString().split('T')[0])
        setChecksAndPayments([])
        setDepositsAndCredits([])
        setSelectedChecksAndPayments([])
        setSelectedDepositsAndCredits([])
    }

    const handleViewReconciliation = async (reconciliation: BankReconciliation) => {
        await loadReconciliationDetails(reconciliation.id!)
        setIsViewDialogOpen(true)
    }

    const filteredReconciliations = reconciliations.filter((recon) => {
        const matchesSearch =
            (recon.reconciliationNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (recon.bankAccount?.name || "").toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "All" || recon.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            Draft: "bg-gray-100 text-gray-800",
            "In Progress": "bg-blue-100 text-blue-800",
            Reconciled: "bg-green-100 text-green-800",
            Approved: "bg-purple-100 text-purple-800",
        }
        return colors[status] || "bg-gray-100 text-gray-800"
    }

    if (loading) {
        return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
    }

    return (
        <ERPLayout>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Bank Reconciliation</h1>
                        <p className="text-muted-foreground mt-1">Reconcile bank accounts with statements</p>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Reconciliation
                        </Button>

                        <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
                            <DialogHeader className="p-4 border-b">
                                <DialogTitle className="text-xl font-bold tracking-tight">Create Bank Reconciliation</DialogTitle>
                            </DialogHeader>

                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="px-6 py-2 border-b bg-white">
                                    <div className="flex gap-8">
                                        <button
                                            className={`pb-2 text-sm font-semibold transition-all border-b-2 ${creationStep === 0 ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                                            onClick={() => setCreationStep(0)}
                                        >
                                            Bank Reconciliation Details
                                        </button>
                                        <button
                                            className={`pb-2 text-sm font-semibold transition-all border-b-2 ${creationStep === 1 ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                                            onClick={() => {
                                                if (selectedBankAccountId) setCreationStep(1)
                                            }}
                                            disabled={!selectedBankAccountId}
                                        >
                                            Bank Transaction Details
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    {creationStep === 0 ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-4 gap-6 items-end">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                                        <span className="text-destructive">*</span> Transaction Date
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={reconciliationDate}
                                                        onChange={(e) => setReconciliationDate(e.target.value)}
                                                        className="h-10 border-blue-100 focus:border-blue-500 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                                        <span className="text-destructive">*</span> Reference Number
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. March"
                                                        value={reconciliationNumber}
                                                        onChange={(e) => setReconciliationNumber(e.target.value)}
                                                        className="h-10 border-blue-100 focus:border-blue-500 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                                        <span className="text-destructive">*</span> Bank Account Name
                                                    </Label>
                                                    <Select
                                                        value={selectedBankAccountId.toString()}
                                                        onValueChange={(value) => setSelectedBankAccountId(parseInt(value))}
                                                    >
                                                        <SelectTrigger className="h-10 border-blue-100 focus:border-blue-500">
                                                            <SelectValue placeholder="Select bank account" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {bankAccounts.map((account) => (
                                                                <SelectItem key={account.id} value={account.id.toString()}>
                                                                    {account.ledgerCode}-{account.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                                        <span className="text-destructive">*</span> Date Range
                                                    </Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="date"
                                                            value={dateFrom}
                                                            onChange={(e) => setDateFrom(e.target.value)}
                                                            className="h-10 border-blue-100"
                                                        />
                                                        <span className="text-gray-400">~</span>
                                                        <Input
                                                            type="date"
                                                            value={dateTo}
                                                            onChange={(e) => setDateTo(e.target.value)}
                                                            className="h-10 border-blue-100"
                                                        />
                                                        <Button
                                                            variant="default"
                                                            className="h-10 px-6 uppercase font-bold text-xs"
                                                            onClick={loadUnreconciledTransactionDetails}
                                                            disabled={!selectedBankAccountId}
                                                        >
                                                            SEARCH
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-4 gap-6">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold uppercase tracking-wider">Opening Balance</Label>
                                                    <Input
                                                        type="number"
                                                        value={openingBalance}
                                                        readOnly
                                                        className="h-10 bg-muted font-mono text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold uppercase tracking-wider">Statement Balance</Label>
                                                    <Input
                                                        type="number"
                                                        value={statementBalance}
                                                        onChange={(e) => setStatementBalance(parseFloat(e.target.value) || 0)}
                                                        className="h-10 font-mono text-sm border-blue-100 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div className="col-span-2 space-y-1.5">
                                                    <Label className="text-xs font-bold uppercase tracking-wider">Remarks</Label>
                                                    <Input
                                                        placeholder="Enter remarks..."
                                                        value={remarks}
                                                        onChange={(e) => setRemarks(e.target.value)}
                                                        className="h-10 border-blue-100"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <Button
                                                    className="px-8 uppercase font-bold text-xs h-10"
                                                    onClick={() => setCreationStep(1)}
                                                    disabled={!selectedBankAccountId}
                                                >
                                                    NEXT
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Checks and Payments */}
                                            <div className="space-y-2">
                                                <div className="bg-muted/50 p-2 border-l-4 border-muted-foreground">
                                                    <h3 className="text-xs font-bold uppercase tracking-widest">Checks and Payments</h3>
                                                </div>
                                                <div className="border rounded-md overflow-hidden bg-white shadow-sm">
                                                    <Table>
                                                        <TableHeader className="bg-blue-50/30">
                                                            <TableRow className="h-9 hover:bg-transparent">
                                                                <TableHead className="w-[80px] text-xs font-bold text-blue-900 uppercase py-0 px-4">Released</TableHead>
                                                                <TableHead className="text-xs font-bold text-blue-900 uppercase py-0">Transaction Date</TableHead>
                                                                <TableHead className="text-xs font-bold text-blue-900 uppercase py-0">Cheque Number</TableHead>
                                                                <TableHead className="text-xs font-bold text-blue-900 uppercase py-0">Description</TableHead>
                                                                <TableHead className="text-xs font-bold text-blue-900 uppercase py-0 text-right">Amount</TableHead>
                                                                <TableHead className="text-xs font-bold text-blue-900 uppercase py-0 text-right">Return</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {checksAndPayments.length > 0 ? (
                                                                checksAndPayments.map((trans) => (
                                                                    <TableRow key={trans.id} className="h-10 hover:bg-slate-50 transition-colors">
                                                                        <TableCell className="py-2 px-4">
                                                                            <Checkbox
                                                                                checked={selectedChecksAndPayments.includes(trans.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) setSelectedChecksAndPayments([...selectedChecksAndPayments, trans.id])
                                                                                    else setSelectedChecksAndPayments(selectedChecksAndPayments.filter(id => id !== trans.id))
                                                                                }}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell className="py-2 text-xs">
                                                                            {new Date(trans.transactionDate || trans.TransactionHeader?.transactionDate || "").toLocaleDateString()}
                                                                        </TableCell>
                                                                        <TableCell className="py-2 text-xs font-medium text-slate-600">
                                                                            {trans.chequeNumber || "-"}
                                                                        </TableCell>
                                                                        <TableCell className="py-2 text-xs italic text-slate-500">
                                                                            {trans.description || trans.TransactionHeader?.description}
                                                                        </TableCell>
                                                                        <TableCell className="py-2 text-right font-mono text-xs font-bold">
                                                                            {parseFloat(trans.creditAmount?.toString() || "0").toFixed(2)}
                                                                        </TableCell>
                                                                        <TableCell className="py-2 text-right text-xs">-</TableCell>
                                                                    </TableRow>
                                                                ))
                                                            ) : (
                                                                <TableRow>
                                                                    <TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground italic bg-slate-50/50">No Data</TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>

                                            {/* Deposits and Credits */}
                                            <div className="space-y-2">
                                                <div className="bg-muted/50 p-2 border-l-4 border-muted-foreground">
                                                    <h3 className="text-xs font-bold uppercase tracking-widest">Deposits and Credits</h3>
                                                </div>
                                                <div className="border rounded-md overflow-hidden bg-white shadow-sm">
                                                    <Table>
                                                        <TableHeader className="bg-muted/30">
                                                            <TableRow className="h-9 hover:bg-transparent">
                                                                <TableHead className="w-[80px] text-xs font-bold uppercase py-0 px-4">Released</TableHead>
                                                                <TableHead className="text-xs font-bold uppercase py-0">Transaction Date</TableHead>
                                                                <TableHead className="text-xs font-bold uppercase py-0">Cheque Number</TableHead>
                                                                <TableHead className="text-xs font-bold uppercase py-0">Description</TableHead>
                                                                <TableHead className="text-xs font-bold uppercase py-0 text-right">Amount</TableHead>
                                                                <TableHead className="text-xs font-bold uppercase py-0 text-right">Return</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {depositsAndCredits.length > 0 ? (
                                                                depositsAndCredits.map((trans) => (
                                                                    <TableRow key={trans.id} className="h-10 hover:bg-slate-50 transition-colors">
                                                                        <TableCell className="py-2 px-4">
                                                                            <Checkbox
                                                                                checked={selectedDepositsAndCredits.includes(trans.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) setSelectedDepositsAndCredits([...selectedDepositsAndCredits, trans.id])
                                                                                    else setSelectedDepositsAndCredits(selectedDepositsAndCredits.filter(id => id !== trans.id))
                                                                                }}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell className="py-2 text-xs">
                                                                            {new Date(trans.transactionDate || trans.TransactionHeader?.transactionDate || "").toLocaleDateString()}
                                                                        </TableCell>
                                                                        <TableCell className="py-2 text-xs font-medium text-slate-600">
                                                                            {trans.chequeNumber || "-"}
                                                                        </TableCell>
                                                                        <TableCell className="py-2 text-xs italic text-slate-500">
                                                                            {trans.description || trans.TransactionHeader?.description}
                                                                        </TableCell>
                                                                        <TableCell className="py-2 text-right font-mono text-xs font-bold">
                                                                            {parseFloat(trans.debitAmount?.toString() || "0").toFixed(2)}
                                                                        </TableCell>
                                                                        <TableCell className="py-2 text-right text-xs">-</TableCell>
                                                                    </TableRow>
                                                                ))
                                                            ) : (
                                                                <TableRow>
                                                                    <TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground italic bg-slate-50/50">No Data</TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-4 gap-4 items-end bg-card p-4 rounded-lg border shadow-sm">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Opening Balance</p>
                                                    <div className="p-2 border rounded bg-muted font-mono text-sm">{openingBalance.toFixed(2)}</div>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Marked Balance</p>
                                                    <div className="p-2 border rounded bg-muted font-mono text-sm font-bold">
                                                        {(() => {
                                                            const totalChecks = checksAndPayments
                                                                .filter(t => selectedChecksAndPayments.includes(t.id))
                                                                .reduce((sum, t) => sum + parseFloat(t.creditAmount?.toString() || "0"), 0);
                                                            const totalDeposits = depositsAndCredits
                                                                .filter(t => selectedDepositsAndCredits.includes(t.id))
                                                                .reduce((sum, t) => sum + parseFloat(t.debitAmount?.toString() || "0"), 0);
                                                            return (totalDeposits - totalChecks).toFixed(2);
                                                        })()}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Difference</p>
                                                    <div className="p-2 border rounded bg-slate-50 font-mono text-sm text-red-600 font-bold">
                                                        {(() => {
                                                            const totalChecks = checksAndPayments
                                                                .filter(t => selectedChecksAndPayments.includes(t.id))
                                                                .reduce((sum, t) => sum + parseFloat(t.creditAmount?.toString() || "0"), 0);
                                                            const totalDeposits = depositsAndCredits
                                                                .filter(t => selectedDepositsAndCredits.includes(t.id))
                                                                .reduce((sum, t) => sum + parseFloat(t.debitAmount?.toString() || "0"), 0);
                                                            const markedNet = totalDeposits - totalChecks;
                                                            return (statementBalance - (openingBalance + markedNet)).toFixed(2);
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-start">
                                                <Button
                                                    variant="outline"
                                                    className="px-8 uppercase font-bold text-xs h-10 border-slate-300"
                                                    onClick={() => setCreationStep(0)}
                                                >
                                                    BACK
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="p-4 border-t gap-3">
                                <Button
                                    className="px-8 uppercase font-bold text-xs h-10 min-w-[100px]"
                                    onClick={handleCreateReconciliation}
                                    disabled={isProcessing || !selectedBankAccountId}
                                >
                                    {isProcessing ? "SAVING..." : "SAVE"}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="px-8 uppercase font-bold text-xs h-10"
                                    onClick={() => {
                                        setIsCreateDialogOpen(false)
                                        resetCreateForm()
                                    }}
                                    disabled={isProcessing}
                                >
                                    CLOSE
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardContent className="p-4">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search reconciliations..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Status</SelectItem>
                                        <SelectItem value="Draft">Draft</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Reconciled">Reconciled</SelectItem>
                                        <SelectItem value="Approved">Approved</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {filteredReconciliations.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No bank reconciliations found
                                </div>
                            ) : (
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Reconciliation #</TableHead>
                                                <TableHead>Bank Account</TableHead>
                                                <TableHead>Reconciliation Date</TableHead>
                                                <TableHead>Statement Date</TableHead>
                                                <TableHead className="text-right">Difference</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredReconciliations.map((recon) => (
                                                <TableRow key={recon.id}>
                                                    <TableCell className="font-mono font-medium">
                                                        {recon.reconciliationNumber}
                                                    </TableCell>
                                                    <TableCell>{recon.bankAccount?.name || "-"}</TableCell>
                                                    <TableCell>
                                                        {new Date(recon.reconciliationDate).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(recon.statementDate).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {recon.difference?.toFixed(2) || "0.00"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`capitalize ${getStatusColor(recon.status)}`}>
                                                            {recon.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleViewReconciliation(recon)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
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

                {/* View/Reconcile Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Bank Reconciliation Details</DialogTitle>
                        </DialogHeader>

                        {selectedReconciliation && (
                            <Tabs defaultValue="reconcile" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="reconcile">Reconcile</TabsTrigger>
                                    <TabsTrigger value="summary">Summary</TabsTrigger>
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                </TabsList>

                                <TabsContent value="reconcile" className="space-y-4">
                                    {/* Reconciliation Progress Summary */}
                                    {reconciliationSummary && (
                                        <div className="grid grid-cols-4 gap-4 items-center bg-card p-4 rounded-lg border shadow-sm mb-4">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Statement Balance</p>
                                                <div className="font-mono text-sm font-bold">{selectedReconciliation.closingBalance.toFixed(2)}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Calculated Balance</p>
                                                <div className="font-mono text-sm font-bold">{reconciliationSummary.calculatedBalance.toFixed(2)}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Difference</p>
                                                <div className={`font-mono text-sm font-bold ${reconciliationSummary.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {reconciliationSummary.difference.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <Badge className={reconciliationSummary.isBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                    {reconciliationSummary.isBalanced ? 'Balanced' : 'Not Balanced'}
                                                </Badge>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Book Transactions */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between bg-muted/50 p-2 border-l-4 border-muted-foreground rounded-r">
                                                <h3 className="text-xs font-bold uppercase tracking-widest">Book Transactions</h3>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 text-xs hover:bg-muted"
                                                    onClick={handleAddBookTransactions}
                                                    disabled={selectedBookItems.length === 0 || isProcessing}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Add Selected ({selectedBookItems.length})
                                                </Button>
                                            </div>

                                            <div className="border rounded-md max-h-[400px] overflow-y-auto bg-card">
                                                <Table>
                                                    <TableHeader className="bg-muted/50 sticky top-0">
                                                        <TableRow className="h-8">
                                                            <TableHead className="w-[40px]"></TableHead>
                                                            <TableHead className="text-xs uppercase font-bold py-2">Date</TableHead>
                                                            <TableHead className="text-xs uppercase font-bold py-2">Account/Desc</TableHead>
                                                            <TableHead className="text-xs uppercase font-bold py-2 text-right">Amount</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {unreconciledTransactions.map((trans) => (
                                                            <TableRow key={trans.id} className="h-9 hover:bg-slate-50">
                                                                <TableCell className="py-1">
                                                                    <Checkbox
                                                                        checked={selectedBookItems.includes(trans.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            if (checked) setSelectedBookItems([...selectedBookItems, trans.id])
                                                                            else setSelectedBookItems(selectedBookItems.filter(id => id !== trans.id))
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-xs py-1">
                                                                    {new Date(trans.transactionDate || "").toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="text-xs py-1 truncate max-w-[150px]">{trans.description}</TableCell>
                                                                <TableCell className="text-right text-xs font-mono py-1">
                                                                    {parseFloat(trans.debitAmount?.toString() || "0") > 0
                                                                        ? parseFloat(trans.debitAmount?.toString() || "0").toFixed(2)
                                                                        : `(${parseFloat(trans.creditAmount?.toString() || "0").toFixed(2)})`}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {unreconciledTransactions.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs italic">
                                                                    No additional book transactions found
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>

                                            {/* Existing/Added Book Items */}
                                            <div className="border rounded-md max-h-[300px] overflow-y-auto mt-4">
                                                <Table>
                                                    <TableHeader className="bg-muted/50 sticky top-0">
                                                        <TableRow className="h-8">
                                                            <TableHead className="w-[40px]"></TableHead>
                                                            <TableHead className="text-xs uppercase font-bold py-2">Matched</TableHead>
                                                            <TableHead className="text-xs uppercase font-bold py-2">Description</TableHead>
                                                            <TableHead className="text-xs uppercase font-bold py-2 text-right">Amount</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {bookItems.map((item) => (
                                                            <TableRow key={item.id} className={`h-9 ${item.isMatched ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}>
                                                                <TableCell className="py-1">
                                                                    {!item.isMatched && (
                                                                        <Checkbox
                                                                            checked={selectedBookItems.includes(item.id!)}
                                                                            onCheckedChange={(checked) => {
                                                                                if (checked) setSelectedBookItems([...selectedBookItems, item.id!])
                                                                                else setSelectedBookItems(selectedBookItems.filter(id => id !== item.id))
                                                                            }}
                                                                        />
                                                                    )}
                                                                    {item.isMatched && <CheckCircle className="h-4 w-4 text-green-500" />}
                                                                </TableCell>
                                                                <TableCell className="text-xs py-1">
                                                                    {new Date(item.transactionDate).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="text-xs py-1 truncate max-w-[150px]" title={item.description}>{item.description}</TableCell>
                                                                <TableCell className="text-right text-xs font-mono py-1">
                                                                    {item.debitAmount > 0 ? item.debitAmount.toFixed(2) : `(${item.creditAmount.toFixed(2)})`}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>

                                        {/* Statement Transactions */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between bg-muted/50 p-2 border-l-4 border-muted-foreground rounded-r">
                                                <h3 className="text-xs font-bold uppercase tracking-widest">Statement Transactions</h3>
                                                <div className="flex gap-2">
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            accept=".csv"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            onChange={handleFileUpload}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 text-xs hover:bg-muted"
                                                        >
                                                            <Upload className="h-3 w-3 mr-1" />
                                                            Upload CSV
                                                        </Button>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 text-xs hover:bg-muted"
                                                        onClick={handleAddStatementLine}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Add Line
                                                    </Button>
                                                </div>
                                            </div>

                                            {statementLines.length > 0 && (
                                                <div className="bg-muted/30 p-2 rounded border space-y-2 mb-4">
                                                    {statementLines.map((line, index) => (
                                                        <div key={index} className="grid grid-cols-12 gap-1 items-center bg-white p-1 rounded border shadow-sm">
                                                            <div className="col-span-3">
                                                                <Input type="date" value={line.transactionDate} onChange={(e) => { const u = [...statementLines]; u[index].transactionDate = e.target.value; setStatementLines(u); }} className="h-7 text-xs px-1" />
                                                            </div>
                                                            <div className="col-span-4">
                                                                <Input placeholder="Desc" value={line.description} onChange={(e) => { const u = [...statementLines]; u[index].description = e.target.value; setStatementLines(u); }} className="h-7 text-xs px-1" />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <Input type="number" placeholder="Dr" value={line.debitAmount || ''} onChange={(e) => { const u = [...statementLines]; u[index].debitAmount = parseFloat(e.target.value) || 0; setStatementLines(u); }} className="h-7 text-xs px-1" />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <Input type="number" placeholder="Cr" value={line.creditAmount || ''} onChange={(e) => { const u = [...statementLines]; u[index].creditAmount = parseFloat(e.target.value) || 0; setStatementLines(u); }} className="h-7 text-xs px-1" />
                                                            </div>
                                                            <div className="col-span-1 flex justify-end">
                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveStatementLine(index)}>
                                                                    <XCircle className="h-3 w-3 text-red-500" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <Button size="sm" onClick={handleAddStatementItems} disabled={isProcessing} className="w-full h-7 text-xs bg-slate-800 hover:bg-slate-700">Save Statement Lines</Button>
                                                </div>
                                            )}

                                            <div className="border rounded-lg max-h-[600px] overflow-y-auto">
                                                <Table>
                                                    <TableHeader className="bg-slate-50 sticky top-0">
                                                        <TableRow className="h-8">
                                                            <TableHead className="w-[40px]"></TableHead>
                                                            <TableHead className="text-xs uppercase font-bold py-2">Date</TableHead>
                                                            <TableHead className="text-xs uppercase font-bold py-2">Description</TableHead>
                                                            <TableHead className="text-xs uppercase font-bold py-2 text-right">Amount</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {statementItems.map((item) => (
                                                            <TableRow key={item.id} className={`h-9 ${item.isMatched ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}>
                                                                <TableCell className="py-1">
                                                                    {!item.isMatched && (
                                                                        <Checkbox
                                                                            checked={selectedStatementItems.includes(item.id!)}
                                                                            onCheckedChange={(checked) => {
                                                                                if (checked) setSelectedStatementItems([...selectedStatementItems, item.id!])
                                                                                else setSelectedStatementItems(selectedStatementItems.filter(id => id !== item.id))
                                                                            }}
                                                                        />
                                                                    )}
                                                                    {item.isMatched && <CheckCircle className="h-4 w-4 text-green-500" />}
                                                                </TableCell>
                                                                <TableCell className="text-xs py-1">
                                                                    {new Date(item.transactionDate).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="text-xs py-1 truncate max-w-[150px]">{item.description}</TableCell>
                                                                <TableCell className="text-right text-xs font-mono py-1">
                                                                    {item.debitAmount > 0 ? item.debitAmount.toFixed(2) : `(${item.creditAmount.toFixed(2)})`}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {statementItems.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs italic">
                                                                    No statement items added
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center pt-4 border-t gap-4">
                                        <Button
                                            onClick={handleMatchItems}
                                            disabled={selectedBookItems.length === 0 || selectedStatementItems.length === 0 || isProcessing}
                                            className="bg-purple-600 hover:bg-purple-700 min-w-[200px]"
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Match Selected Items
                                        </Button>
                                    </div>
                                </TabsContent>

                                <TabsContent value="summary" className="space-y-4">
                                    {reconciliationSummary && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <Card>
                                                    <CardContent className="p-4">
                                                        <h3 className="font-semibold mb-2">Book Transactions</h3>
                                                        <div className="space-y-1 text-sm">
                                                            <div className="flex justify-between">
                                                                <span>Total:</span>
                                                                <span className="font-mono">{reconciliationSummary.bookTransactions.total}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Matched:</span>
                                                                <span className="font-mono text-green-600">{reconciliationSummary.bookTransactions.matched}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Unmatched:</span>
                                                                <span className="font-mono text-orange-600">{reconciliationSummary.bookTransactions.unmatched}</span>
                                                            </div>
                                                            <div className="flex justify-between pt-2 border-t">
                                                                <span>Total Debits:</span>
                                                                <span className="font-mono">{reconciliationSummary.bookTransactions.totalDebits.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Total Credits:</span>
                                                                <span className="font-mono">{reconciliationSummary.bookTransactions.totalCredits.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card>
                                                    <CardContent className="p-4">
                                                        <h3 className="font-semibold mb-2">Statement Transactions</h3>
                                                        <div className="space-y-1 text-sm">
                                                            <div className="flex justify-between">
                                                                <span>Total:</span>
                                                                <span className="font-mono">{reconciliationSummary.statementTransactions.total}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Matched:</span>
                                                                <span className="font-mono text-green-600">{reconciliationSummary.statementTransactions.matched}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Unmatched:</span>
                                                                <span className="font-mono text-orange-600">{reconciliationSummary.statementTransactions.unmatched}</span>
                                                            </div>
                                                            <div className="flex justify-between pt-2 border-t">
                                                                <span>Total Debits:</span>
                                                                <span className="font-mono">{reconciliationSummary.statementTransactions.totalDebits.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Total Credits:</span>
                                                                <span className="font-mono">{reconciliationSummary.statementTransactions.totalCredits.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            <Card>
                                                <CardContent className="p-4">
                                                    <h3 className="font-semibold mb-2">Reconciliation Status</h3>
                                                    <div className="space-y-1 text-sm">
                                                        <div className="flex justify-between">
                                                            <span>Calculated Balance:</span>
                                                            <span className="font-mono">{reconciliationSummary.calculatedBalance.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Difference:</span>
                                                            <span className={`font-mono ${reconciliationSummary.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                                                                {reconciliationSummary.difference.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Status:</span>
                                                            <Badge className={reconciliationSummary.isBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                                {reconciliationSummary.isBalanced ? 'Balanced' : 'Not Balanced'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="details" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Reconciliation Number</p>
                                            <p className="font-mono font-bold">{selectedReconciliation.reconciliationNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Status</p>
                                            <Badge className={`capitalize ${getStatusColor(selectedReconciliation.status)}`}>
                                                {selectedReconciliation.status}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Bank Account</p>
                                            <p className="text-sm">{selectedReconciliation.bankAccount?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Reconciliation Date</p>
                                            <p className="text-sm">{new Date(selectedReconciliation.reconciliationDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        )}

                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                                Close
                            </Button>
                            {selectedReconciliation?.status === 'In Progress' && (
                                <Button
                                    onClick={() => handleCompleteReconciliation(selectedReconciliation.id!)}
                                    disabled={isProcessing}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Complete Reconciliation
                                </Button>
                            )}
                            {selectedReconciliation?.status === 'Reconciled' && (
                                <Button
                                    onClick={() => handleApproveReconciliation(selectedReconciliation.id!)}
                                    disabled={isProcessing}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ERPLayout>
    )
}
