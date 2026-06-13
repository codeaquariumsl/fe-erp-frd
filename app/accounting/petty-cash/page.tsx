"use client"

import { useState, useEffect } from "react"
import { Plus, Eye, Check, Send, Trash2, Coins, BookOpen, Layers, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { pettyCashApi, ledgerAccountsApi, PettyCashBook, PettyCashCategory, PettyCashPayment, PettyCashReimbursement, LedgerAccount } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { format } from "date-fns"
import { LedgerSelect } from "@/components/accounting/ledger-select"

export default function PettyCashPage() {
    const [activeTab, setActiveTab] = useState("payments")
    const [payments, setPayments] = useState<PettyCashPayment[]>([])
    const [books, setBooks] = useState<PettyCashBook[]>([])
    const [categories, setCategories] = useState<PettyCashCategory[]>([])
    const [reimbursements, setReimbursements] = useState<PettyCashReimbursement[]>([])
    const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([])
    const [expenseAccounts, setExpenseAccounts] = useState<LedgerAccount[]>([])
    const [sourceAccounts, setSourceAccounts] = useState<LedgerAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const { toast } = useToast()

    // Payment Form State
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
    const [paymentFormData, setPaymentFormData] = useState<Partial<PettyCashPayment>>({
        paymentDate: format(new Date(), "yyyy-MM-dd"),
        pettyCashBookId: undefined,
        description: "",
        lines: [{ categoryId: 0, amount: 0, description: "", ledgerAccountId: 0 }]
    })

    // Book Form State
    const [isBookDialogOpen, setIsBookDialogOpen] = useState(false)
    const [bookFormData, setBookFormData] = useState<Partial<PettyCashBook>>({
        pettyCashCode: "",
        name: "",
        location: "",
        custodian: "",
        initialAmount: 0,
        ledgerAccountId: 0,
        status: "Active"
    })

    // Category Form State
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
    const [categoryFormData, setCategoryFormData] = useState<Partial<PettyCashCategory>>({
        name: "",
        description: "",
        ledgerAccountId: 0,
        status: "Active"
    })

    // Reimbursement Form State
    const [isReimbursementDialogOpen, setIsReimbursementDialogOpen] = useState(false)
    const [reimbursementFormData, setReimbursementFormData] = useState<Partial<PettyCashReimbursement>>({
        reimbursementDate: format(new Date(), "yyyy-MM-dd"),
        pettyCashBookId: undefined,
        sourceLedgerAccountId: undefined,
        amount: 0,
        description: ""
    })

    const [selectedPayment, setSelectedPayment] = useState<PettyCashPayment | null>(null)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

    const [selectedReimbursement, setSelectedReimbursement] = useState<PettyCashReimbursement | null>(null)
    const [isViewReimbursementDialogOpen, setIsViewReimbursementDialogOpen] = useState(false)

    useEffect(() => {
        loadAll()
    }, [])

    // Check for "view" query param on mount to open view dialog
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const viewId = queryParams.get("view")
        if (viewId) {
            const loadAndOpen = async () => {
                try {
                    const payment = await pettyCashApi.getPaymentById(viewId)
                    setSelectedPayment(payment)
                    setIsViewDialogOpen(true)
                } catch (err) {
                    console.error("Failed to load petty cash payment from query param viewId:", viewId, err)
                }
            }
            loadAndOpen()
        }
    }, [])

    const loadAll = async () => {
        setLoading(true)
        try {
            const [pRes, bRes, cRes, lRes, eRes, rRes, payRes, bankRes] = await Promise.all([
                pettyCashApi.getAllPayments(),
                pettyCashApi.getAllBooks(),
                pettyCashApi.getAllCategories(),
                ledgerAccountsApi.getAllAccounts<LedgerAccount>(),
                ledgerAccountsApi.getExpenseAccounts<LedgerAccount>(),
                pettyCashApi.getAllReimbursements(),
                ledgerAccountsApi.getPaymentAccounts<LedgerAccount>(),
                ledgerAccountsApi.getBankAccounts<LedgerAccount>()
            ])

            const p = (pRes as any)?.data || pRes || []
            const b = (bRes as any)?.data || bRes || []
            const c = (cRes as any)?.data || cRes || []
            const l = (lRes as any)?.data || lRes || []
            const e = (eRes as any)?.data || eRes || []
            const r = (rRes as any)?.data || rRes || []
            const pay = (payRes as any)?.data || payRes || []
            const bank = (bankRes as any)?.data || bankRes || []

            setPayments(Array.isArray(p) ? p : [])
            setBooks(Array.isArray(b) ? b : [])
            setCategories(Array.isArray(c) ? c : [])
            setLedgerAccounts(Array.isArray(l) ? l : [])
            setExpenseAccounts(Array.isArray(e) ? e : [])
            setReimbursements(Array.isArray(r) ? r : [])

            // Combine payment and bank accounts for reimbursement source
            const combinedSource = [...pay, ...bank]
            const uniqueSource = combinedSource.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
            setSourceAccounts(uniqueSource)

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

    // --- Payment Functions ---
    const handleCreatePayment = async () => {
        if (!paymentFormData.pettyCashBookId) {
            toast({ title: "Validation Error", description: "Please select a Petty Cash Book", variant: "destructive" })
            return
        }
        if (paymentFormData.lines?.some(l => !l.categoryId || l.amount <= 0)) {
            toast({ title: "Validation Error", description: "All lines must have a category and amount", variant: "destructive" })
            return
        }

        try {
            setIsProcessing(true)
            await pettyCashApi.createPayment(paymentFormData)
            toast({ title: "Success", description: "Payment created successfully" })
            setIsPaymentDialogOpen(false)
            loadAll()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to create payment", variant: "destructive" })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleApprovePayment = async (id: number) => {
        try {
            setIsProcessing(true)
            await pettyCashApi.approvePayment(id)
            toast({ title: "Success", description: "Payment approved successfully" })
            setIsViewDialogOpen(false)
            loadAll()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to approve payment", variant: "destructive" })
        } finally {
            setIsProcessing(false)
        }
    }

    const handlePostPayment = async (id: number) => {
        try {
            setIsProcessing(true)
            await pettyCashApi.postPayment(id)
            toast({ title: "Success", description: "Payment posted successfully" })
            setIsViewDialogOpen(false)
            loadAll()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to post payment", variant: "destructive" })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleDeletePayment = async (id: number) => {
        try {
            setIsProcessing(true)
            await pettyCashApi.deletePayment(id)
            toast({ title: "Success", description: "Payment deleted successfully" })
            loadAll()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to delete payment", variant: "destructive" })
        } finally {
            setIsProcessing(false)
        }
    }

    // --- Book Functions ---
    const handleCreateBook = async () => {
        try {
            setIsProcessing(true)
            await pettyCashApi.createBook(bookFormData)
            toast({ title: "Success", description: "Book created successfully" })
            setIsBookDialogOpen(false)
            loadAll()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to create book", variant: "destructive" })
        } finally {
            setIsProcessing(false)
        }
    }

    // --- Category Functions ---
    const handleCreateCategory = async () => {
        try {
            setIsProcessing(true)
            await pettyCashApi.createCategory(categoryFormData)
            toast({ title: "Success", description: "Category created successfully" })
            setIsCategoryDialogOpen(false)
            loadAll()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to create category", variant: "destructive" })
        } finally {
            setIsProcessing(false)
        }
    }

    // --- Reimbursement Functions ---
    const handleCreateReimbursement = async () => {
        if (!reimbursementFormData.pettyCashBookId || !reimbursementFormData.sourceLedgerAccountId || !reimbursementFormData.amount) {
            toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" })
            return
        }

        try {
            setIsProcessing(true)
            await pettyCashApi.createReimbursement(reimbursementFormData)
            toast({ title: "Success", description: "Reimbursement created successfully" })
            setIsReimbursementDialogOpen(false)
            loadAll()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to create reimbursement", variant: "destructive" })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleApproveReimbursement = async (id: number) => {
        try {
            setIsProcessing(true)
            await pettyCashApi.approveReimbursement(id)
            toast({ title: "Success", description: "Reimbursement approved successfully" })
            setIsViewReimbursementDialogOpen(false)
            loadAll()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to approve reimbursement", variant: "destructive" })
        } finally {
            setIsProcessing(false)
        }
    }

    const handlePostReimbursement = async (id: number) => {
        try {
            setIsProcessing(true)
            await pettyCashApi.postReimbursement(id)
            toast({ title: "Success", description: "Reimbursement posted successfully" })
            setIsViewReimbursementDialogOpen(false)
            loadAll()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to post reimbursement", variant: "destructive" })
        } finally {
            setIsProcessing(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Draft": return "bg-gray-100 text-gray-800"
            case "Approved": return "bg-blue-100 text-blue-800"
            case "Posted": return "bg-green-100 text-green-800"
            case "Cancelled": return "bg-red-100 text-red-800"
            case "Active": return "bg-green-100 text-green-800"
            case "Inactive": return "bg-red-100 text-red-800"
            default: return "bg-gray-100 text-gray-800"
        }
    }

    if (loading) {
        return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
    }

    return (
        <ERPLayout>
            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Petty Cash Management</h1>
                        <p className="text-muted-foreground mt-2">Manage petty cash books, categories, track payments and reimbursements.</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="payments" className="gap-2">
                            <Coins className="h-4 w-4" />
                            Payments
                        </TabsTrigger>
                        <TabsTrigger value="reimbursements" className="gap-2">
                            <RefreshCcw className="h-4 w-4" />
                            Reimbursements
                        </TabsTrigger>
                        <TabsTrigger value="books" className="gap-2">
                            <BookOpen className="h-4 w-4" />
                            Cash Books
                        </TabsTrigger>
                        <TabsTrigger value="categories" className="gap-2">
                            <Layers className="h-4 w-4" />
                            Categories
                        </TabsTrigger>
                    </TabsList>

                    {/* --- Payments Tab --- */}
                    <TabsContent value="payments" className="space-y-4">
                        <div className="flex justify-end">
                            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => setPaymentFormData({ ...paymentFormData, lines: [{ categoryId: 0, amount: 0, description: "", ledgerAccountId: 0 }] })}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        New Petty Cash Payment
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                        <DialogTitle>Create Petty Cash Payment</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Date</Label>
                                                <Input type="date" value={paymentFormData.paymentDate} onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Petty Cash Book</Label>
                                                <Select onValueChange={(v) => setPaymentFormData({ ...paymentFormData, pettyCashBookId: parseInt(v) })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Book" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {books.map(b => <SelectItem key={b.id} value={b.id!.toString()}>{b.name} ({b.pettyCashCode})</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Input placeholder="General description" value={paymentFormData.description} onChange={(e) => setPaymentFormData({ ...paymentFormData, description: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>Payment Lines</Label>
                                                <Button variant="outline" size="sm" onClick={() => setPaymentFormData({
                                                    ...paymentFormData,
                                                    lines: [...(paymentFormData.lines || []), { categoryId: 0, amount: 0, description: "", ledgerAccountId: 0 }]
                                                })}>
                                                    Add Line
                                                </Button>
                                            </div>
                                            {paymentFormData.lines?.map((line, idx) => (
                                                <div key={idx} className="grid grid-cols-4 gap-2 items-end border p-2 rounded-md">
                                                    <div className="col-span-1">
                                                        <Label className="text-[10px]">Category</Label>
                                                        <Select onValueChange={(v) => {
                                                            const cat = categories.find(c => c.id === parseInt(v))
                                                            const newLines = [...(paymentFormData.lines || [])]
                                                            newLines[idx] = { ...newLines[idx], categoryId: parseInt(v), ledgerAccountId: cat?.ledgerAccountId || 0 }
                                                            setPaymentFormData({ ...paymentFormData, lines: newLines })
                                                        }}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Cat" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {categories.map(c => <SelectItem key={c.id} value={c.id!.toString()}>{c.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <Label className="text-[10px]">Amount</Label>
                                                        <Input type="number" value={line.amount} onChange={(e) => {
                                                            const newLines = [...(paymentFormData.lines || [])]
                                                            newLines[idx] = { ...newLines[idx], amount: parseFloat(e.target.value) || 0 }
                                                            setPaymentFormData({ ...paymentFormData, lines: newLines })
                                                        }} />
                                                    </div>
                                                    <div className="col-span-1">
                                                        <Label className="text-[10px]">Description</Label>
                                                        <Input value={line.description} onChange={(e) => {
                                                            const newLines = [...(paymentFormData.lines || [])]
                                                            newLines[idx] = { ...newLines[idx], description: e.target.value }
                                                            setPaymentFormData({ ...paymentFormData, lines: newLines })
                                                        }} />
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {
                                                        const newLines = (paymentFormData.lines || []).filter((_, i) => i !== idx)
                                                        setPaymentFormData({ ...paymentFormData, lines: newLines })
                                                    }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleCreatePayment} disabled={isProcessing}>
                                            {isProcessing ? "Saving..." : "Create Payment"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Payment #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Book</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payments.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payments found</TableCell></TableRow>
                                        ) : (
                                            payments.map((p) => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium font-mono">{p.paymentNumber}</TableCell>
                                                    <TableCell>{format(new Date(p.paymentDate), "yyyy-MM-dd")}</TableCell>
                                                    <TableCell>{p.PettyCashBook?.name}</TableCell>
                                                    <TableCell className="font-mono">{Number(p.totalAmount).toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Badge className={getStatusColor(p.status)}>{p.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => { setSelectedPayment(p); setIsViewDialogOpen(true); }}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            {p.status === "Draft" && (
                                                                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeletePayment(p.id!)}>
                                                                    <Trash2 className="h-4 w-4" />
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
                    </TabsContent>

                    {/* --- Reimbursements Tab --- */}
                    <TabsContent value="reimbursements" className="space-y-4">
                        <div className="flex justify-end">
                            <Dialog open={isReimbursementDialogOpen} onOpenChange={setIsReimbursementDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => setReimbursementFormData({ reimbursementDate: format(new Date(), "yyyy-MM-dd"), amount: 0, description: "" })}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        New Reimbursement
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Create Petty Cash Reimbursement</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Date</Label>
                                                <Input type="date" value={reimbursementFormData.reimbursementDate} onChange={(e) => setReimbursementFormData({ ...reimbursementFormData, reimbursementDate: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Petty Cash Book (Target)</Label>
                                                <Select onValueChange={(v) => {
                                                    const bookId = parseInt(v)
                                                    const book = books.find(b => b.id === bookId)
                                                    setReimbursementFormData({
                                                        ...reimbursementFormData,
                                                        pettyCashBookId: bookId,
                                                        amount: Number((book as any)?.initialAmount || 0) - Number((book as any)?.currentBalance || 0)
                                                    })
                                                }}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Book" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {books.map(b => <SelectItem key={b.id} value={b.id!.toString()}>{b.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Amount</Label>
                                                <Input type="number" value={reimbursementFormData.amount} onChange={(e) => setReimbursementFormData({ ...reimbursementFormData, amount: parseFloat(e.target.value) || 0 })} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <LedgerSelect
                                                value={reimbursementFormData.sourceLedgerAccountId?.toString() || ""}
                                                onValueChange={(v) => setReimbursementFormData({ ...reimbursementFormData, sourceLedgerAccountId: parseInt(v) })}
                                                ledgers={sourceAccounts}
                                                placeholder="Select Source Account"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Input placeholder="Description" value={reimbursementFormData.description} onChange={(e) => setReimbursementFormData({ ...reimbursementFormData, description: e.target.value })} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsReimbursementDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleCreateReimbursement} disabled={isProcessing}>Create Reimbursement</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Number</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Book</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reimbursements.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No reimbursements found</TableCell></TableRow>
                                        ) : (
                                            reimbursements.map((r) => (
                                                <TableRow key={r.id}>
                                                    <TableCell className="font-mono">{r.reimbursementNumber}</TableCell>
                                                    <TableCell>{format(new Date(r.reimbursementDate), "yyyy-MM-dd")}</TableCell>
                                                    <TableCell>{r.PettyCashBook?.name}</TableCell>
                                                    <TableCell className="font-mono">{Number(r.amount).toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => { setSelectedReimbursement(r); setIsViewReimbursementDialogOpen(true); }}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* --- Books Tab --- */}
                    <TabsContent value="books" className="space-y-4">
                        <div className="flex justify-end">
                            <Dialog open={isBookDialogOpen} onOpenChange={setIsBookDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        New Book
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create Petty Cash Book</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Code</Label>
                                                <Input value={bookFormData.pettyCashCode} onChange={(e) => setBookFormData({ ...bookFormData, pettyCashCode: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Name</Label>
                                                <Input value={bookFormData.name} onChange={(e) => setBookFormData({ ...bookFormData, name: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Location</Label>
                                                <Input value={bookFormData.location} onChange={(e) => setBookFormData({ ...bookFormData, location: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Custodian</Label>
                                                <Input value={bookFormData.custodian} onChange={(e) => setBookFormData({ ...bookFormData, custodian: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Initial Amount</Label>
                                                <Input type="number" value={bookFormData.initialAmount} onChange={(e) => setBookFormData({ ...bookFormData, initialAmount: parseFloat(e.target.value) || 0 })} />
                                            </div>
                                            <div className="space-y-2">
                                                <LedgerSelect
                                                    value={bookFormData.ledgerAccountId?.toString() || ""}
                                                    onValueChange={(v) => setBookFormData({ ...bookFormData, ledgerAccountId: parseInt(v) })}
                                                    ledgers={ledgerAccounts}
                                                    placeholder="Select Account"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsBookDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleCreateBook} disabled={isProcessing}>Save Book</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Custodian</TableHead>
                                            <TableHead>Initial</TableHead>
                                            <TableHead>Balance</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {books.map((b) => (
                                            <TableRow key={b.id}>
                                                <TableCell className="font-mono">{b.pettyCashCode}</TableCell>
                                                <TableCell>{b.name}</TableCell>
                                                <TableCell>{b.location}</TableCell>
                                                <TableCell>{b.custodian}</TableCell>
                                                <TableCell className="font-mono">{Number(b.initialAmount).toFixed(2)}</TableCell>
                                                <TableCell className="font-mono font-bold text-primary">{Number((b as any).currentBalance || 0).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusColor(b.status)}>{b.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* --- Categories Tab --- */}
                    <TabsContent value="categories" className="space-y-4">
                        <div className="flex justify-end">
                            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        New Category
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create Petty Cash Category</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Category Name</Label>
                                            <Input value={categoryFormData.name} onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Input value={categoryFormData.description} onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <LedgerSelect
                                                value={categoryFormData.ledgerAccountId?.toString() || ""}
                                                onValueChange={(v) => setCategoryFormData({ ...categoryFormData, ledgerAccountId: parseInt(v) })}
                                                ledgers={expenseAccounts}
                                                placeholder="Select Account"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleCreateCategory} disabled={isProcessing}>Save Category</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Ledger Account</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {categories.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium">{c.name}</TableCell>
                                                <TableCell>{c.description}</TableCell>
                                                <TableCell>{(c as any).LedgerAccount?.name || c.ledgerAccountId} {(c as any).LedgerAccount?.ledgerCode}</TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* --- View Payment Detail Modal --- */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Payment Details - {selectedPayment?.paymentNumber}</DialogTitle>
                        </DialogHeader>
                        {selectedPayment && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-lg">
                                    <div>
                                        <Label className="text-muted-foreground text-[10px] uppercase">Date</Label>
                                        <p className="font-medium">{format(new Date(selectedPayment.paymentDate), "yyyy-MM-dd")}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-[10px] uppercase">Book</Label>
                                        <p className="font-medium">{selectedPayment.PettyCashBook?.name}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-[10px] uppercase">Status</Label>
                                        <div><Badge className={getStatusColor(selectedPayment.status)}>{selectedPayment.status}</Badge></div>
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-muted-foreground text-[10px] uppercase">Description</Label>
                                        <p className="font-medium">{selectedPayment.description || "N/A"}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="font-semibold text-sm">Line Items</h3>
                                    <div className="border rounded-md overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead>Category</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedPayment.lines?.map((line, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell>{(line as any).category?.name || "Cat #" + line.categoryId}</TableCell>
                                                        <TableCell>{line.description}</TableCell>
                                                        <TableCell className="text-right font-mono">{Number(line.amount).toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow className="font-bold bg-muted/30">
                                                    <TableCell colSpan={2}>Total Amount</TableCell>
                                                    <TableCell className="text-right font-mono">{Number(selectedPayment.totalAmount).toFixed(2)}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                <DialogFooter className="gap-2">
                                    {selectedPayment.status === "Draft" && (
                                        <Button variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleApprovePayment(selectedPayment.id!)} disabled={isProcessing}>
                                            <Check className="h-4 w-4 mr-2" />
                                            Approve
                                        </Button>
                                    )}
                                    {selectedPayment.status === "Approved" && (
                                        <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handlePostPayment(selectedPayment.id!)} disabled={isProcessing}>
                                            <Send className="h-4 w-4 mr-2" />
                                            Post to Ledger
                                        </Button>
                                    )}
                                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* --- View Reimbursement Detail Modal --- */}
                <Dialog open={isViewReimbursementDialogOpen} onOpenChange={setIsViewReimbursementDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Reimbursement Details - {selectedReimbursement?.reimbursementNumber}</DialogTitle>
                        </DialogHeader>
                        {selectedReimbursement && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                                    <div>
                                        <Label className="text-muted-foreground text-[10px] uppercase">Date</Label>
                                        <p className="font-medium">{format(new Date(selectedReimbursement.reimbursementDate), "yyyy-MM-dd")}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-[10px] uppercase">Status</Label>
                                        <div><Badge className={getStatusColor(selectedReimbursement.status)}>{selectedReimbursement.status}</Badge></div>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-[10px] uppercase">Petty Cash Book</Label>
                                        <p className="font-medium">{selectedReimbursement.PettyCashBook?.name}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-[10px] uppercase">Amount</Label>
                                        <p className="font-medium font-mono">LKR {Number(selectedReimbursement.amount).toFixed(2)}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-muted-foreground text-[10px] uppercase">Source Ledger Account</Label>
                                        <p className="font-medium">{selectedReimbursement.SourceLedgerAccount?.name || selectedReimbursement.sourceLedgerAccountId}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-muted-foreground text-[10px] uppercase">Description</Label>
                                        <p className="font-medium">{selectedReimbursement.description || "N/A"}</p>
                                    </div>
                                </div>

                                <DialogFooter className="gap-2">
                                    {selectedReimbursement.status === "Draft" && (
                                        <Button variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleApproveReimbursement(selectedReimbursement.id!)} disabled={isProcessing}>
                                            <Check className="h-4 w-4 mr-2" />
                                            Approve
                                        </Button>
                                    )}
                                    {selectedReimbursement.status === "Approved" && (
                                        <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handlePostReimbursement(selectedReimbursement.id!)} disabled={isProcessing}>
                                            <Send className="h-4 w-4 mr-2" />
                                            Post to Ledger
                                        </Button>
                                    )}
                                    <Button variant="outline" onClick={() => setIsViewReimbursementDialogOpen(false)}>Close</Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </ERPLayout>
    )
}
