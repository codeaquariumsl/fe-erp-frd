"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Eye, Trash2, Search, Filter, X, Printer, ChevronsUpDown, Check } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { ReceiptForm } from "@/components/receipts/receipt-form"
import { receiptsApi, customersApi, type Receipt, type Customer } from "@/lib/api"
import { generateReceiptPDF, generateChequePDF, type ChequePrintData } from "@/lib/pdf-generator"
import { CustomerSelect } from "@/components/customer/customer-select"
import ReceiptsLoading from "./loading"

export default function ReceiptsPage() {
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([])
    const [loading, setLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null)

    // Search and Filter states
    const [searchTerm, setSearchTerm] = useState("")
    const [customerFilter, setCustomerFilter] = useState<string>("all")
    const [allCustomers, setAllCustomers] = useState<Customer[]>([])
    const [dateFromFilter, setDateFromFilter] = useState<string>("")
    const [dateToFilter, setDateToFilter] = useState<string>("")

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [paginatedReceipts, setPaginatedReceipts] = useState<Receipt[]>([])

    useEffect(() => {
        loadReceipts()
        loadCustomers()
    }, [])

    // Check for "view" query param on mount to open view dialog
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const viewId = queryParams.get("view")
        if (viewId) {
            const loadAndOpen = async () => {
                try {
                    const receipt = await receiptsApi.getById(viewId)
                    setViewingReceipt(receipt)
                } catch (err) {
                    console.error("Failed to load receipt from query param viewId:", viewId, err)
                }
            }
            loadAndOpen()
        }
    }, [])

    // Filter receipts whenever receipts or filter criteria change
    useEffect(() => {
        filterReceipts()
    }, [receipts, searchTerm, customerFilter, dateFromFilter, dateToFilter])

    // Paginate filtered receipts whenever filters or pagination settings change
    useEffect(() => {
        paginateReceipts()
    }, [filteredReceipts, currentPage, itemsPerPage])

    const loadReceipts = async () => {
        try {
            setLoading(true)
            const data = await receiptsApi.getAll()
            setReceipts(data as Receipt[])
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to load receipts",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const loadCustomers = async () => {
        try {
            const data = await customersApi.getAll()
            setAllCustomers(data as Customer[])
        } catch (error) {
            console.error("Failed to load customers:", error)
        }
    }

    const filterReceipts = () => {
        let filtered = [...receipts]

        // Search by receipt number or customer name
        if (searchTerm) {
            filtered = filtered.filter(receipt =>
                receipt.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                receipt.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        // Filter by customer
        if (customerFilter && customerFilter !== "all") {
            filtered = filtered.filter(receipt => receipt.customerId === Number(customerFilter))
        }

        // Filter by date range
        if (dateFromFilter) {
            filtered = filtered.filter(receipt => new Date(receipt.receiptDate) >= new Date(dateFromFilter))
        }

        if (dateToFilter) {
            filtered = filtered.filter(receipt => new Date(receipt.receiptDate) <= new Date(dateToFilter))
        }

        setFilteredReceipts(filtered)
        setCurrentPage(1) // Reset to first page when filters change
    }

    const paginateReceipts = () => {
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        setPaginatedReceipts(filteredReceipts.slice(startIndex, endIndex))
    }

    const handleDeleteReceipt = async (id: number) => {
        if (!confirm("Are you sure you want to delete this receipt?")) return

        try {
            await receiptsApi.remove(id)
            toast({
                title: "Success",
                description: "Receipt deleted successfully",
            })
            await loadReceipts()
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete receipt",
                variant: "destructive",
            })
        }
    }

    const handlePrintReceipt = (receipt: Receipt) => {
        try {
            generateReceiptPDF(receipt)
            toast({
                title: "Success",
                description: `Receipt ${receipt.receiptNo} PDF generated successfully`,
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate receipt PDF",
                variant: "destructive",
            })
        }
    }

    const clearFilters = () => {
        setSearchTerm("")
        setCustomerFilter("all")
        setDateFromFilter("")
        setDateToFilter("")
    }

    const uniqueCustomers = Array.from(
        new Map(
            receipts
                .filter(r => r.customer)
                .map(r => [r.customer?.id, r.customer])
        ).values()
    )

    const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage)

    if (loading) return <ERPLayout><ReceiptsLoading /></ERPLayout>

    return (
        <ERPLayout>
            <div className="space-y-2">
                {/* Header with Create Button */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Receipts</h1>
                        <p className="text-gray-600">Manage customer receipt payments</p>
                    </div>
                    <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Receipt
                    </Button>
                </div>

                {/* Filters Card */}
                <Card>
                    {/* <CardHeader>
                         <CardTitle className="text-lg">Filters</CardTitle> 
                    </CardHeader> */}
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5">
                            {/* Search */}
                            <div>
                                <Label htmlFor="search" className="text-xs">Search</Label>
                                <Input
                                    id="search"
                                    placeholder="Receipt # or Customer"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            {/* Searchable Customer Filter */}
                            <div>
                                <Label htmlFor="customer-filter" className="text-xs">Customer</Label>
                                <CustomerSelect
                                    customers={allCustomers}
                                    value={customerFilter === "all" ? 0 : Number(customerFilter)}
                                    onValueChange={(id) => setCustomerFilter(id === 0 ? "all" : String(id))}
                                    placeholder="All Customers"
                                    className="mt-1"
                                />
                            </div>

                            {/* Date From */}
                            <div>
                                <Label htmlFor="date-from" className="text-xs">From Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date-from"
                                            variant="outline"
                                            className="w-full mt-1 justify-start text-left font-normal"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateFromFilter ? format(new Date(dateFromFilter), "dd-MMM-yyyy") : "Pick date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent align="start" className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dateFromFilter ? new Date(dateFromFilter) : undefined}
                                            onSelect={(date) => setDateFromFilter(date ? format(date, "yyyy-MM-dd") : "")}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Date To */}
                            <div>
                                <Label htmlFor="date-to" className="text-xs">To Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date-to"
                                            variant="outline"
                                            className="w-full mt-1 justify-start text-left font-normal"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateToFilter ? format(new Date(dateToFilter), "dd-MMM-yyyy") : "Pick date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent align="start" className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dateToFilter ? new Date(dateToFilter) : undefined}
                                            onSelect={(date) => setDateToFilter(date ? format(date, "yyyy-MM-dd") : "")}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Clear Filters Button */}
                            <div className="flex items-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="w-full gap-1"
                                >
                                    <X className="h-4 w-4" />
                                    Clear
                                </Button>
                            </div>
                        </div>

                        {paginatedReceipts.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No receipts found
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden mt-6">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-gray-100">
                                            <TableHead>Receipt #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Invoices</TableHead>
                                            <TableHead className="text-right">Total Paid</TableHead>
                                            <TableHead className="text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedReceipts.map((receipt) => (
                                            <TableRow key={receipt.id}>
                                                <TableCell className="py-2 font-medium">{receipt.receiptNo}</TableCell>
                                                <TableCell className="py-2">{format(new Date(receipt.receiptDate), "dd-MMM-yyyy")}</TableCell>
                                                <TableCell className="py-2">{receipt.customer?.name || "-"}</TableCell>
                                                <TableCell className="py-2">
                                                    <Badge variant="outline" className="font-mono">
                                                        {receipt.receiptInvoices?.length || 0}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2 text-right font-semibold">
                                                    {receipt.totalPaid.toLocaleString("en-US", {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </TableCell>
                                                <TableCell className="py-2 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setViewingReceipt(receipt)}
                                                            title="View Receipt"
                                                            className="h-8 w-8 text-blue-600"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handlePrintReceipt(receipt)}
                                                            className="text-green-600 h-8 w-8"
                                                            title="Print Receipt PDF"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="flex items-center justify-between text-xs text-muted-foreground py-2 border-t">
                                    Showing {paginatedReceipts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
                                    {Math.min(currentPage * itemsPerPage, filteredReceipts.length)} of {filteredReceipts.length}
                                </div>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="items-per-page" className="text-sm">Items per page:</Label>
                                    <Select
                                        value={itemsPerPage.toString()}
                                        onValueChange={(value) => {
                                            setItemsPerPage(Number(value))
                                            setCurrentPage(1)
                                        }}
                                    >
                                        <SelectTrigger id="items-per-page" className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="25">25</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Receipt Form Dialog */}
            <ReceiptForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={loadReceipts}
            />

            {/* Receipt Details Dialog */}
            {viewingReceipt && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setViewingReceipt(null)}
                >
                    <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Receipt Details</CardTitle>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setViewingReceipt(null)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Receipt Header */}
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                                <div>
                                    <p className="text-xs text-gray-600">Receipt Number</p>
                                    <p className="font-semibold">{viewingReceipt.receiptNo}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Date</p>
                                    <p className="font-semibold">{format(new Date(viewingReceipt.receiptDate), "dd-MMM-yyyy")}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Customer</p>
                                    <p className="font-semibold">{viewingReceipt.customer?.name || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Created By</p>
                                    <p className="font-semibold">{viewingReceipt.createdByUsername || "-"}</p>
                                </div>
                            </div>

                            {/* Invoices */}
                            {viewingReceipt.invoices && viewingReceipt.invoices.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-3">Invoices Paid in This Receipt</h3>
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Invoice #</TableHead>
                                                    <TableHead className="text-right">Invoice Total</TableHead>
                                                    <TableHead className="text-right">Amount Received</TableHead>
                                                    <TableHead className="text-right">Balance Remaining</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {viewingReceipt.invoices.map((inv, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{inv.invoice?.invoiceNumber || `Invoice ${inv.invoiceId}`}</TableCell>
                                                        <TableCell className="text-right">
                                                            {inv.invoiceAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold text-green-600">
                                                            {inv.paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                        <TableCell className="text-right text-orange-600">
                                                            {inv.balanceAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            {/* Payment Methods */}
                            {viewingReceipt.payments && viewingReceipt.payments.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-3">Payment Methods</h3>
                                    <div className="space-y-2">
                                        {viewingReceipt.payments.map((payment, idx) => (
                                            <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded border">
                                                <div>
                                                    <p className="text-sm font-medium">{payment.PaymentType?.paymentTypeName || `Payment Type ${payment.paymentTypeId}`}</p>
                                                    {payment.referenceNo && <p className="text-xs text-gray-600 mt-1">Ref: {payment.referenceNo}</p>}
                                                    {payment.chequeNo && <p className="text-xs text-gray-600 mt-1">Cheque #: {payment.chequeNo}</p>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold">
                                                        {payment.paymentAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Set-offs (Credit Notes) */}
                            {viewingReceipt.creditNoteSetOffs && viewingReceipt.creditNoteSetOffs.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-3">Credit Note Set-offs</h3>
                                    <div className="space-y-2">
                                        {viewingReceipt.creditNoteSetOffs.map((setoff, idx) => (
                                            <div key={idx} className="flex justify-between items-start p-3 bg-purple-50 rounded border border-purple-200">
                                                <div>
                                                    <p className="text-sm font-medium">Credit Note #{setoff.creditNoteNumber || `CN ${setoff.creditNoteId}`}</p>
                                                </div>
                                                <p className="font-semibold text-purple-700">
                                                    {Number(setoff.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Settled Cheques */}
                            {viewingReceipt.settledCheques && viewingReceipt.settledCheques.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-3">Settled Returned/Cancelled Cheques</h3>
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-gray-50/50">
                                                    <TableHead>Cheque #</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Settled Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {viewingReceipt.settledCheques.map((settlement, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">
                                                            {settlement.cheque?.chequeNo || settlement.receiptPaymentId}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                                                                {settlement.cheque?.status || "N/A"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold text-orange-600">
                                                            {Number(settlement.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            {/* Set-offs (Customer Returns) */}
                            {/* {viewingReceipt.totalReturnAmount && viewingReceipt.totalReturnAmount > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-3">Customer Return Set-offs</h3>
                                    <div className="flex justify-between items-start p-3 bg-orange-50 rounded border border-orange-200">
                                        <div>
                                            <p className="text-sm font-medium">Customer Return Applied</p>
                                        </div>
                                        <p className="font-semibold text-orange-700">
                                            {viewingReceipt.totalReturnAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            )} */}

                            {/* Summary */}
                            <div className="bg-blue-50 p-4 rounded border border-blue-200 space-y-2">
                                {/* <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Total Receipt Amount</span>
                                    <span className="font-medium">
                                        {(viewingReceipt.totalPaid).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                </div> */}

                                <div className="flex justify-between items-center text-sm pt-2 border-t border-blue-100">
                                    <span className="text-gray-600 font-medium text-xs uppercase tracking-wider">Settlement Breakdown</span>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Cash/Bank Payments</span>
                                    <span>
                                        {(viewingReceipt.totalPaid - (viewingReceipt.settledCheques?.reduce((sum, s) => sum + Number(s.amount), 0) || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                {viewingReceipt.settledCheques && viewingReceipt.settledCheques.length > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Cheque Settlement</span>
                                        <span className="text-orange-600">
                                            {viewingReceipt.settledCheques.reduce((sum, s) => sum + Number(s.amount), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}

                                {(Number(viewingReceipt.totalCreditNoteAmount) || 0) > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Credit Note Set-off</span>
                                        <span className="text-purple-600">
                                            {Number(viewingReceipt.totalCreditNoteAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}

                                {(Number(viewingReceipt.totalReturnAmount) || 0) > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Return Set-off</span>
                                        <span className="text-red-600">
                                            {Number(viewingReceipt.totalReturnAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                                    <span className="font-bold">Total Settled</span>
                                    <span className="text-lg font-bold text-blue-600">
                                        {(Number(viewingReceipt.totalPaid) + (Number(viewingReceipt.totalCreditNoteAmount) || 0) + (Number(viewingReceipt.totalReturnAmount) || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Remarks */}
                            {viewingReceipt.remarks && (
                                <div>
                                    <p className="text-xs text-gray-600">Remarks</p>
                                    <p className="text-sm mt-1">{viewingReceipt.remarks}</p>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-3 border-t gap-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePrintReceipt(viewingReceipt)}
                                    className="text-purple-600"
                                >
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print PDF
                                </Button>

                                <div className="flex gap-2">
                                    {/* {(!viewingInvoice.status || viewingInvoice.status === "Pending") && (
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                handleApproveReject(viewingInvoice.id!, "Approved")
                                                setIsViewDialogOpen(false)
                                            }}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Approve
                                        </Button>
                                    )} */}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setViewingReceipt(null)}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </ERPLayout>
    )
}
