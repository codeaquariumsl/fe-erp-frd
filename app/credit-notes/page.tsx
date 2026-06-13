"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { creditNotesApi, customersApi, itemsApi, CreditNote, Customer, Item, PaginationMeta } from "@/lib/api"
import { CreditNoteForm } from "@/components/credit-notes/credit-note-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Plus, Eye, Edit, Trash2, CheckCircle, XCircle, DollarSign, Printer, X, Check, ChevronsUpDown } from "lucide-react"
import { format } from "date-fns"
import jsPDF from "jspdf"
import { cn } from "@/lib/utils"
import { CustomerSelect } from "@/components/customer/customer-select"

const statusColors: Record<string, string> = {
    "Draft": "bg-gray-100 text-gray-800",
    "Pending": "bg-yellow-100 text-yellow-800",
    "Approved": "bg-green-100 text-green-800",
    "Rejected": "bg-red-100 text-red-800",
    "Applied": "bg-blue-100 text-blue-800",
    "Cancelled": "bg-gray-700 text-gray-100",
}

export default function CreditNotesPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const viewId = searchParams.get('view')
    const { toast } = useToast()
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)

    const [pagination, setPagination] = useState<PaginationMeta | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // UI State
    const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
    const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false)

    // Application State
    const [applyInvoiceId, setApplyInvoiceId] = useState("")
    const [applyAmount, setApplyAmount] = useState("")

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [customerFilter, setCustomerFilter] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [statusFilter, customerFilter, searchTerm])

    useEffect(() => {
        fetchMasterData()
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCreditNotes()
        }, 300)
        return () => clearTimeout(timer)
    }, [currentPage, itemsPerPage, statusFilter, customerFilter, searchTerm])

    useEffect(() => {
        if (viewId) {
            const handleViewId = async () => {
                try {
                    const id = parseInt(viewId)
                    if (!isNaN(id)) {
                        const data = await creditNotesApi.getById(id)
                        setSelectedCreditNote(data)
                        setIsViewDialogOpen(true)

                        // Clear the view parameter from the URL to avoid re-opening on refresh
                        const newParams = new URLSearchParams(searchParams.toString())
                        newParams.delete('view')
                        const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`
                        window.history.replaceState({}, '', newUrl)
                    }
                } catch (error) {
                    console.error("Error fetching credit note for viewing:", error)
                }
            }
            handleViewId()
        }
    }, [viewId, searchParams])

    const fetchCreditNotes = async () => {
        try {
            setLoading(true)
            // Fetch everything to allow client-side filtering for parent/child logic
            const result = await creditNotesApi.getAll({
                page: 1,
                limit: 1000,
            })
            setCreditNotes(result.data)
        } catch (error) {
            console.error("Error fetching credit notes:", error)
            setCreditNotes([])
            toast({
                title: "Error",
                description: "Failed to fetch credit notes",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const filteredCreditNotes = React.useMemo(() => {
        // Parent-child customer matching logic
        let matchingCustomerIds = new Set<number>();
        if (customerFilter !== "all") {
            const selectedId = Number(customerFilter);
            matchingCustomerIds.add(selectedId);
            const selectedCustomer = customers.find(c => c.id === selectedId);

            // If it's a parent, add all its child customer IDs
            if (selectedCustomer && selectedCustomer.parentId === null) {
                customers.forEach(c => {
                    if (c.parentId === selectedId) {
                        matchingCustomerIds.add(c.id);
                    }
                });
            }
        }

        return creditNotes.filter((cn) => {
            const matchesSearch = searchTerm === "" ||
                Boolean(cn.creditNoteNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cn.Customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cn.reason?.toLowerCase().includes(searchTerm.toLowerCase()))

            const matchesStatus = statusFilter === "all" || cn.status === statusFilter
            const matchesCustomer = customerFilter === "all" || matchingCustomerIds.has(cn.customerId)

            return Boolean(matchesSearch && matchesStatus && matchesCustomer)
        })
    }, [creditNotes, searchTerm, statusFilter, customerFilter, customers])

    const paginatedCreditNotes = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredCreditNotes.slice(start, start + itemsPerPage)
    }, [filteredCreditNotes, currentPage, itemsPerPage])

    useEffect(() => {
        setPagination({
            page: currentPage,
            limit: itemsPerPage,
            total: filteredCreditNotes.length,
            totalPages: Math.ceil(filteredCreditNotes.length / itemsPerPage),
            hasNextPage: currentPage < Math.ceil(filteredCreditNotes.length / itemsPerPage),
            hasPrevPage: currentPage > 1
        })
    }, [filteredCreditNotes, currentPage, itemsPerPage])

    const clearFilters = () => {
        setSearchTerm("")
        setStatusFilter("all")
        setCustomerFilter("all")
    }



    const fetchMasterData = async () => {
        try {
            const [customersData, itemsData] = await Promise.all([
                customersApi.getAll(),
                itemsApi.getAll()
            ])
            setCustomers(Array.isArray(customersData) ? (customersData as Customer[]) : [])
            setItems(Array.isArray(itemsData) ? (itemsData as Item[]) : [])
        } catch (error) {
            console.error("Error fetching master data:", error)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this credit note?")) return

        try {
            await creditNotesApi.remove(id)
            toast({
                title: "Success",
                description: "Credit note deleted successfully",
            })
            fetchCreditNotes()
        } catch (error: any) {
            console.error("Error deleting credit note:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to delete credit note",
                variant: "destructive",
            })
        }
    }

    const handleApproveReject = async (action: 'approve' | 'reject', reason?: string) => {
        if (!selectedCreditNote?.id) return

        try {
            await creditNotesApi.approveOrReject(selectedCreditNote.id, action, reason)
            toast({
                title: "Success",
                description: `Credit note ${action}ed successfully`,
            })
            setIsApproveDialogOpen(false)
            fetchCreditNotes()
        } catch (error: any) {
            console.error(`Error ${action}ing credit note:`, error)
            toast({
                title: "Error",
                description: error.message || `Failed to ${action} credit note`,
                variant: "destructive",
            })
        }
    }

    const handleApplyToInvoice = async () => {
        if (!selectedCreditNote?.id || !applyInvoiceId || !applyAmount) {
            toast({
                title: "Error",
                description: "Please provide invoice ID and amount",
                variant: "destructive",
            })
            return
        }

        try {
            await creditNotesApi.applyToInvoice(selectedCreditNote.id, {
                invoiceId: parseInt(applyInvoiceId),
                amount: parseFloat(applyAmount)
            })
            toast({
                title: "Success",
                description: "Credit note applied to invoice successfully",
            })
            setIsApplyDialogOpen(false)
            setApplyInvoiceId("")
            setApplyAmount("")
            fetchCreditNotes()
        } catch (error: any) {
            console.error("Error applying credit note:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to apply credit note to invoice",
                variant: "destructive",
            })
        }
    }

    const handleEditClick = async (id: number) => {
        try {
            setLoading(true)
            const data = await creditNotesApi.getById(id)
            setSelectedCreditNote(data)
            setIsEditDialogOpen(true)
        } catch (error) {
            console.error("Error fetching credit note details:", error)
            toast({
                title: "Error",
                description: "Failed to fetch credit note details",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const handleCreateSubmit = async (data: any) => {
        try {
            await creditNotesApi.create(data)
            toast({
                title: "Success",
                description: "Credit note created successfully",
            })
            setIsCreateDialogOpen(false)
            fetchCreditNotes()
        } catch (error: any) {
            console.error("Error creating credit note:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to create credit note",
                variant: "destructive",
            })
        }
    }

    const handleUpdateSubmit = async (data: any) => {
        if (!selectedCreditNote?.id) return

        try {
            await creditNotesApi.update(selectedCreditNote.id, data)
            toast({
                title: "Success",
                description: "Credit note updated successfully",
            })
            setIsEditDialogOpen(false)
            fetchCreditNotes()
        } catch (error: any) {
            console.error("Error updating credit note:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to update credit note",
                variant: "destructive",
            })
        }
    }

    const calculateAvailableAmount = (creditNote: CreditNote) => {
        return Number(creditNote.total || 0) - Number(creditNote.appliedAmount || 0)
    }

    const formatCurrency = (amount: string | number | undefined) => {
        return Number(amount || 0).toFixed(2)
    }

    const printCreditNote = (creditNote: CreditNote) => {
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.width
        const pageHeight = doc.internal.pageSize.height
        const margin = 15

        // Helper: Right align text
        const rightText = (text: string, y: number, x: number = pageWidth - margin) => {
            doc.text(text, x, y, { align: "right" })
        }

        // 1. Header Section
        let yPos = 20

        // Logo - Code Aqua ERP
        try {
            doc.addImage("/assets/codeaqua_logo.png", "PNG", margin, yPos - 5, 40, 35)
        } catch (e) {
            console.error("Failed to add logo to PDF:", e)
            doc.setTextColor(76, 175, 80)
            doc.setFontSize(22)
            doc.setFont("helvetica", "bold")
            doc.text("Code Aqua", margin, yPos + 10)
        }

        // Company Details
        doc.setTextColor(60, 60, 60)
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        const companyX = margin + 50
        doc.text("Code Aqua ERP Solutions", companyX, yPos)

        yPos += 5
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.text("4th Floor, Forbes & Walkers Building,", companyX, yPos)
        yPos += 4
        doc.text("38/46 Nawam Mawatha,", companyX, yPos)
        yPos += 4
        doc.text("Colombo 00200", companyX, yPos)
        yPos += 4
        doc.text("VAT, 102861841 7000", companyX, yPos)
        yPos += 4
        doc.text("072 796 6966", companyX, yPos)

        // Title (Right)
        doc.setFontSize(18)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(80, 80, 80)
        const title = creditNote.isTaxCreditNote ? "Tax Credit Note" : "Credit Note"
        rightText(title, 25)

        yPos += 15

        // 2. Customer Info
        const boxTop = yPos
        doc.setFillColor(240, 245, 250)
        doc.rect(margin, yPos, 85, 6, 'F')

        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(100, 100, 100)
        doc.text("CREDIT TO", margin + 2, yPos + 4)

        yPos += 10
        doc.setTextColor(0, 0, 0)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)

        if (creditNote.Customer) {
            doc.text(creditNote.Customer.name, margin, yPos)
            yPos += 5
            const addressLines = doc.splitTextToSize(creditNote.Customer.address || "", 80)
            doc.text(addressLines, margin, yPos)
            yPos += (addressLines.length * 4)
            if (creditNote.Customer.taxNumber) {
                doc.setFontSize(8)
                doc.setFont("helvetica", "normal")
                doc.text("Tax Number: " + creditNote.Customer.taxNumber, margin, yPos)
                yPos += 4
            }
            if (creditNote.Customer.contactNumber) {
                doc.setFontSize(8)
                doc.setFont("helvetica", "normal")
                doc.text(creditNote.Customer.contactNumber, margin, yPos)
            }
        }

        // 3. Info Strip
        yPos = boxTop + 40
        doc.setFillColor(235, 240, 245)
        doc.rect(margin, yPos, pageWidth - (margin * 2), 12, 'F')

        const infoHeaders = ["CREDIT NOTE NO.", "DATE", "TOTAL", "STATUS", "REASON"]
        const startX = margin + 5
        const gap = (pageWidth - (margin * 2)) / 5

        doc.setFontSize(7)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(100, 100, 100)

        infoHeaders.forEach((h, i) => {
            doc.text(h, startX + (i * gap), yPos + 4)
        })

        // Values
        const infoValues = [
            creditNote.creditNoteNumber,
            format(new Date(creditNote.creditNoteDate), "dd/MM/yyyy"),
            `LKR ${Number(creditNote.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            creditNote.status,
            creditNote.reason || "-"
        ]

        doc.setFont("helvetica", "normal")
        doc.setTextColor(0, 0, 0)
        infoValues.forEach((v, i) => {
            if (v) doc.text(v, startX + (i * gap), yPos + 9)
        })

        yPos += 20

        // 4. Items Table
        doc.setFillColor(235, 240, 245)
        doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F')

        const cols = [
            { label: "CODE", x: margin + 5, w: 25, align: "left" },
            { label: "DESCRIPTION", x: margin + 40, w: 80, align: "left" },
            { label: "QTY", x: pageWidth - margin - 80, w: 15, align: "right" },
            { label: "RATE", x: pageWidth - margin - 45, w: 20, align: "right" },
            { label: "AMOUNT", x: pageWidth - margin - 5, w: 25, align: "right" },
        ]

        doc.setFontSize(7)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(100, 100, 100)

        cols.forEach(c => {
            doc.text(c.label, c.x, yPos + 5, { align: c.align as "left" | "right" })
        })

        yPos += 12
        doc.setTextColor(0, 0, 0)
        doc.setFont("helvetica", "normal")

        const creditNoteItems = creditNote.CreditNoteItems || creditNote.items || []

        creditNoteItems.forEach((item) => {
            const itemCode = item.code || item.Item?.sku || "-"
            const itemName = item.Item?.name || "Unknown Item"

            const qty = item.qty
            const price = item.unitPrice || 0
            const amount = item.total || 0

            doc.text(itemCode, cols[0].x, yPos)

            const itemLines = doc.splitTextToSize(itemName, cols[1].w)
            doc.text(itemLines[0], cols[1].x, yPos)

            doc.text(qty.toString(), cols[2].x, yPos, { align: "right" })
            doc.text(Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), cols[3].x, yPos, { align: "right" })
            doc.text(Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), cols[4].x, yPos, { align: "right" })

            yPos += 8

            if (yPos > pageHeight - 60) {
                doc.addPage()
                yPos = 20
            }
        })

        // 5. Summary Footer
        yPos += 5
        const summaryX = pageWidth - margin - 80
        const valueX = pageWidth - margin - 5

        doc.setFontSize(8)
        doc.text("SUBTOTAL", summaryX, yPos)
        rightText(Number(creditNote.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), yPos, valueX)
        yPos += 6

        if (creditNote.isTaxCreditNote && (creditNote.taxAmount || 0) > 0) {
            doc.text(`TAX (${creditNote.taxRate}%)`, summaryX, yPos)
            rightText(Number(creditNote.taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), yPos, valueX)
            yPos += 6
        }

        yPos += 2
        doc.setFontSize(9)
        doc.setFont("helvetica", "bold")
        doc.text("TOTAL", summaryX, yPos)
        rightText(`LKR ${Number(creditNote.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, yPos, valueX)

        if (creditNote.notes) {
            yPos += 15
            doc.setFontSize(8)
            doc.setFont("helvetica", "bold")
            doc.text("NOTES:", margin, yPos)
            yPos += 5
            doc.setFont("helvetica", "normal")
            const noteLines = doc.splitTextToSize(creditNote.notes, pageWidth - (margin * 2))
            doc.text(noteLines, margin, yPos)
        }

        doc.save(`CreditNote-${creditNote.creditNoteNumber}.pdf`)
        toast({
            title: "Success",
            description: "Credit note PDF generated successfully."
        })
    }

    if (loading && creditNotes.length === 0) {
        return (
            <ERPLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
                </div>
            </ERPLayout>
        )
    }

    return (
        <ERPLayout>
            <div className="mx-auto p-2">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Credit Notes</h1>
                        <p className="text-muted-foreground">Manage customer credit notes and applications</p>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Credit Note
                    </Button>
                </div>

                <Tabs defaultValue="list" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="list">All Credit Notes</TabsTrigger>
                        <TabsTrigger value="stats">Statistics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="space-y-4">
                        <Card>
                            <CardContent className="flex gap-4 pt-6">
                                <div className="flex-1 w-48">
                                    <Label htmlFor="search">Search</Label>
                                    <Input
                                        id="search"
                                        placeholder="Search by number, customer, or reason..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="w-48">
                                    <Label htmlFor="status">Status</Label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="Draft">Draft</SelectItem>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Approved">Approved</SelectItem>
                                            <SelectItem value="Rejected">Rejected</SelectItem>
                                            <SelectItem value="Applied">Applied</SelectItem>
                                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-64">
                                    <Label htmlFor="customer">Customer</Label>
                                    <CustomerSelect
                                        customers={customers}
                                        value={customerFilter}
                                        onValueChange={(value) => setCustomerFilter(value ? String(value) : "all")}
                                        placeholder="All Customers"
                                        showMainBadge={true}
                                        className="w-full font-normal"
                                    />
                                </div>
                                {(searchTerm || statusFilter !== "all" || customerFilter !== "all") && (
                                    <div className="flex items-end h-full">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearFilters}
                                            className="h-9 px-2 text-gray-400 hover:text-red-600 mb-0"
                                        >
                                            <X className="h-4 w-4 mr-1" />
                                            Clear Filters
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                            <CardContent>
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-gray-100">
                                            <TableHead>Credit Note #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Applied</TableHead>
                                            <TableHead className="text-right">Available</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedCreditNotes.map((creditNote) => (
                                            <TableRow key={creditNote.id}>
                                                <TableCell className="py-2">
                                                    <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                                                        {creditNote.creditNoteNumber}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-2">{format(new Date(creditNote.creditNoteDate), "MMM dd, yyyy")}</TableCell>
                                                <TableCell className="py-2">{creditNote.Customer?.name || "N/A"}</TableCell>
                                                <TableCell className="py-2 text-right">{Number(creditNote.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                <TableCell className="py-2 text-right">{Number(creditNote.appliedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                <TableCell className="py-2 text-right">{Number(calculateAvailableAmount(creditNote)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                <TableCell className="py-2">
                                                    <Badge className={statusColors[creditNote.status] || "bg-gray-100 text-gray-800"}>
                                                        {creditNote.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedCreditNote(creditNote)
                                                                setIsViewDialogOpen(true)
                                                            }}
                                                            className="h-8 w-8"
                                                            title="View Credit Note"
                                                        >
                                                            <Eye className="h-4 w-4 text-blue-600" />
                                                        </Button>
                                                        {creditNote.status === "Draft" && (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleEditClick(creditNote.id!)}
                                                                    className="h-8 w-8"
                                                                    title="Edit Credit Note"
                                                                >
                                                                    <Edit className="h-4 w-4 text-blue-600" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => creditNote.id && handleDelete(creditNote.id)}
                                                                    className="h-8 w-8"
                                                                    title="Delete Credit Note"
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {(creditNote.status === "Draft" || creditNote.status === "Pending") && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedCreditNote(creditNote)
                                                                    setIsApproveDialogOpen(true)
                                                                }}
                                                                className="h-8 w-8"
                                                                title="Approve Credit Note"
                                                            >
                                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                            </Button>
                                                        )}
                                                        {creditNote.status === "Approved" && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => printCreditNote(creditNote)}
                                                                className="h-8 w-8"
                                                                title="Print Credit Note"
                                                            >
                                                                <Printer className="h-4 w-4 text-green-600" />
                                                            </Button>
                                                        )}
                                                        {/* {creditNote.status === "Approved" && calculateAvailableAmount(creditNote) > 0 && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedCreditNote(creditNote)
                                                                    setIsApplyDialogOpen(true)
                                                                }}
                                                            >
                                                                <DollarSign className="h-4 w-4" />
                                                            </Button>
                                                        )} */}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {creditNotes.length === 0 && !loading && (
                                    <div className="text-center py-10 text-muted-foreground">
                                        No credit notes found.
                                    </div>
                                )}
                                {pagination && (
                                    <PaginationControls
                                        currentPage={currentPage}
                                        totalItems={pagination.total}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={setCurrentPage}
                                        onItemsPerPageChange={setItemsPerPage}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="stats">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Total Credit Notes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{pagination?.total || 0}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {creditNotes.filter(cn => cn.status === "Pending").length}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Available Credit</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">
                                        LKR {creditNotes.reduce((sum, cn) => sum + calculateAvailableAmount(cn), 0).toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Total Issued Amount</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        LKR {creditNotes.reduce((sum, cn) => sum + Number(cn.total || 0), 0).toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* View Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="flex flex-row items-center justify-between">
                            <div>
                                <DialogTitle>Credit Note Details</DialogTitle>
                                <DialogDescription>View detailed information about the credit note</DialogDescription>
                            </div>
                            {selectedCreditNote?.status === "Approved" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => printCreditNote(selectedCreditNote)}
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print
                                </Button>
                            )}
                        </DialogHeader>
                        {selectedCreditNote && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Number</Label>
                                        <p className="font-mono text-sm font-bold">{selectedCreditNote.creditNoteNumber}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Status</Label>
                                        <div>
                                            <Badge className={statusColors[selectedCreditNote.status]}>
                                                {selectedCreditNote.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Date</Label>
                                        <p className="text-sm">{new Date(selectedCreditNote.creditNoteDate).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Total Available</Label>
                                        <p className="text-sm font-bold text-green-600">
                                            LKR {calculateAvailableAmount(selectedCreditNote).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader className="py-3">
                                            <CardTitle className="text-sm">Customer Information</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 py-0 pb-3">
                                            <p className="text-sm font-medium">{selectedCreditNote.Customer?.name}</p>
                                            <p className="text-xs text-muted-foreground">{selectedCreditNote.Customer?.address}</p>
                                            <p className="text-xs text-muted-foreground">{selectedCreditNote.Customer?.contactNumber}</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="py-3">
                                            <CardTitle className="text-sm">Amounts</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 py-0 pb-3">
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Subtotal:</span>
                                                <span className="text-xs font-medium">LKR {formatCurrency(selectedCreditNote.subtotal)}</span>
                                            </div>
                                            {selectedCreditNote.isTaxCreditNote && (
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Tax ({selectedCreditNote.taxRate}%):</span>
                                                    <span className="text-xs font-medium">LKR {formatCurrency(selectedCreditNote.taxAmount)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between border-t pt-1 mt-1">
                                                <span className="text-sm font-semibold">Total:</span>
                                                <span className="text-sm font-bold">LKR {formatCurrency(selectedCreditNote.total)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Applied:</span>
                                                <span className="text-xs font-medium">LKR {formatCurrency(selectedCreditNote.appliedAmount)}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {selectedCreditNote.Invoice && (
                                        <Card>
                                            <CardHeader className="py-3">
                                                <CardTitle className="text-sm">Invoice Information</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2 py-0 pb-3">
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Invoice Number:</span>
                                                    <span className="text-xs font-medium">{selectedCreditNote.Invoice.invoiceNumber}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Invoice Date:</span>
                                                    <span className="text-xs font-medium">{new Date(selectedCreditNote.Invoice.invoiceDate).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Total:</span>
                                                    <span className="text-xs font-medium">LKR {formatCurrency(selectedCreditNote.Invoice.total)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Status:</span>
                                                    <Badge variant="outline" className="text-[10px]">{selectedCreditNote.Invoice.status}</Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {selectedCreditNote.CustomerReturn && (
                                        <Card>
                                            <CardHeader className="py-3">
                                                <CardTitle className="text-sm">Return Information</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2 py-0 pb-3">
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Return Number:</span>
                                                    <span className="text-xs font-medium">{selectedCreditNote.CustomerReturn.returnNumber}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Return Date:</span>
                                                    <span className="text-xs font-medium">{new Date(selectedCreditNote.CustomerReturn.returnDate).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Amount:</span>
                                                    <span className="text-xs font-medium">LKR {formatCurrency(selectedCreditNote.CustomerReturn.totalAmount)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Status:</span>
                                                    <Badge variant="outline" className="text-[10px]">{selectedCreditNote.CustomerReturn.status}</Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold mb-3">Items</h3>
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Qty</TableHead>
                                                    <TableHead>Unit Price</TableHead>
                                                    <TableHead>Discount</TableHead>
                                                    <TableHead>Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(selectedCreditNote.CreditNoteItems || selectedCreditNote.items || []).map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <p className="text-sm font-medium">{item.Item?.name || "N/A"}</p>
                                                            {item.code && <p className="text-xs text-muted-foreground">{item.code}</p>}
                                                        </TableCell>
                                                        <TableCell className="text-sm">{item.qty}</TableCell>
                                                        <TableCell className="text-sm">LKR {formatCurrency(item.unitPrice)}</TableCell>
                                                        <TableCell className="text-sm">{item.discount}%</TableCell>
                                                        <TableCell className="text-sm">LKR {formatCurrency(item.total)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {selectedCreditNote.reason && (
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Reason</Label>
                                        <div className="mt-1 p-2 bg-muted rounded text-sm">
                                            {selectedCreditNote.reason}
                                        </div>
                                    </div>
                                )}

                                {selectedCreditNote.notes && (
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Notes</Label>
                                        <div className="mt-1 p-2 bg-muted rounded text-sm">
                                            {selectedCreditNote.notes}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Create Dialog */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create Credit Note</DialogTitle>
                            <DialogDescription>Create a new credit note for a customer</DialogDescription>
                        </DialogHeader>
                        <CreditNoteForm
                            customers={customers}
                            items={items}
                            onSubmit={handleCreateSubmit}
                            onCancel={() => setIsCreateDialogOpen(false)}
                        />
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Credit Note</DialogTitle>
                            <DialogDescription>Edit credit note details</DialogDescription>
                        </DialogHeader>
                        {selectedCreditNote && (
                            <CreditNoteForm
                                customers={customers}
                                items={items}
                                initialData={selectedCreditNote}
                                onSubmit={handleUpdateSubmit}
                                onCancel={() => setIsEditDialogOpen(false)}
                            />
                        )}
                    </DialogContent>
                </Dialog>

                {/* Approve/Reject Dialog */}
                <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Approve/Reject Credit Note</DialogTitle>
                            <DialogDescription>Review credit note {selectedCreditNote?.creditNoteNumber} and take action</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="notes">Rejection Reason (Required for rejection)</Label>
                                <Textarea id="rejection-reason" placeholder="Enter reason for rejection..." />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    const reason = (document.getElementById("rejection-reason") as HTMLTextAreaElement)?.value
                                    if (!reason) {
                                        toast({ title: "Error", description: "Rejection reason is required", variant: "destructive" })
                                        return
                                    }
                                    handleApproveReject("reject", reason)
                                }}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                            </Button>
                            <Button
                                onClick={() => handleApproveReject("approve")}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Apply to Invoice Dialog */}
                <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Apply Credit Note to Invoice</DialogTitle>
                            <DialogDescription>
                                Apply credit note {selectedCreditNote?.creditNoteNumber} to an invoice
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Invoice ID</Label>
                                <Input
                                    type="number"
                                    value={applyInvoiceId}
                                    onChange={(e) => setApplyInvoiceId(e.target.value)}
                                    placeholder="Enter invoice ID..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={applyAmount}
                                    onChange={(e) => setApplyAmount(e.target.value)}
                                    placeholder="Enter amount to apply..."
                                />
                                <p className="text-sm text-muted-foreground">
                                    Available: LKR {selectedCreditNote ? calculateAvailableAmount(selectedCreditNote).toFixed(2) : "0.00"}
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleApplyToInvoice}>
                                Apply
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ERPLayout>
    )
}
