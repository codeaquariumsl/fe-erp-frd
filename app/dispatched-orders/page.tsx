"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { deliveryOrdersApi } from "@/lib/api"
import { toastr } from "@/lib/toastr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
    Eye,
    Download,
    Printer,
    Truck,
    Search,
    Filter,
    Calendar,
    CheckCircle2,
    Clock,
    Package
} from "lucide-react"
import { format } from "date-fns"
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Delivery {
    isDelivery: boolean
    timeslot: string
    dispatchDate: string
    deliveryDate: string
    customer: {
        id: number
        name: string
    }
}

interface SummaryItem {
    id: number
    deliveryOrderId: number
    itemId: number
    batchId: number
    qty: number
    canFulfillFromBay: boolean
    delivery: Delivery
    DeliveryOrder: {
        id: number
        doNumber: string
    }
    Item: {
        weight: string
        name: string
        sku: string
        barcode: string
        unit: string
    }
    Batch: {
        id: number
        batchNumber: string
    }
    ReleaseStore: {
        id: number
        name: string
    }
    mergeInfo?: {
        originalItemsCount: number
        mergedQty: number
        summaryItemIds: number[]
        deliveryOrdersCount: number
    }
}

interface DeliveryOrderSummary {
    id: number
    code: string
    dateTime: string
    isDispatched: boolean
    SummaryItems: SummaryItem[]
}

interface SummaryResponse {
    summaries: DeliveryOrderSummary[]
    pagination: {
        currentPage: number
        totalPages: number
        totalItems: number
        itemsPerPage: number
    }
    summary?: {
        total: number
        dispatched: number
        pending: number
    }
}

export default function DispatchedOrdersPage() {
    const [loading, setLoading] = useState<boolean>(false)
    const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [selectedSummary, setSelectedSummary] = useState<DeliveryOrderSummary | null>(null)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [barcode, setBarcode] = useState<string>("")
    const [scannedQuantities, setScannedQuantities] = useState<Record<number, number>>({})
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<'all' | 'dispatched' | 'pending'>('all')
    const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false)
    const [scannedItem, setScannedItem] = useState<SummaryItem | null>(null)
    const [itemQuantity, setItemQuantity] = useState<string>("")
    const [dispatching, setDispatching] = useState(false)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    useEffect(() => {
        if (selectedSummary) {
            setScannedQuantities({})
            setBarcode("")
        }
    }, [selectedSummary])

    useEffect(() => {
        fetchSummaries()
    }, [page, pageSize, searchTerm, statusFilter])

    useEffect(() => {
        setPage(1)
    }, [searchTerm, statusFilter])

    const fetchSummaries = async () => {
        setLoading(true)
        try {
            const response = await deliveryOrdersApi.getSummaryItems({
                page,
                limit: pageSize,
                search: searchTerm,
                isDispatched: statusFilter === 'all' ? undefined : (statusFilter === 'dispatched')
            }) as any
            
            setSummaryData({
                summaries: response.summaries || [],
                pagination: response.pagination || {
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: 0,
                    itemsPerPage: 10
                },
                summary: response.statusCounts
            } as any)
            setError(null)
        } catch (err) {
            setError("Failed to fetch delivery order summaries")
            toastr.error("Failed to fetch delivery order summaries", { title: "Error" })
        } finally {
            setLoading(false)
        }
    }

    const handlePageChange = (newPage: number) => {
        setPage(newPage)
    }

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize)
        setPage(1)
    }

    const totalPages = summaryData?.pagination.totalPages || 0

    // Pagination Component
    const PaginationControls = () => {
        if (totalPages <= 1) return null

        const getVisiblePages = () => {
            const delta = 2
            const range = []
            const rangeWithDots = []

            for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
                range.push(i)
            }

            if (page - delta > 2) {
                rangeWithDots.push(1, '...')
            } else {
                rangeWithDots.push(1)
            }

            rangeWithDots.push(...range)

            if (page + delta < totalPages - 1) {
                rangeWithDots.push('...', totalPages)
            } else {
                rangeWithDots.push(totalPages)
            }

            return rangeWithDots
        }

        return (
            <div className="flex items-center justify-between py-4 px-4 border-t bg-muted/20">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Show</span>
                    <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                        <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-700">entries</span>
                    <span className="text-sm text-muted-foreground ml-4">
                        Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, summaryData?.pagination.totalItems || 0)} of {summaryData?.pagination.totalItems || 0} entries
                    </span>
                </div>

                <div className="flex items-center space-x-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={page === 1}
                        className="h-8 w-8 p-0"
                    >
                        {'<<'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="h-8 w-8 p-0"
                    >
                        {'<'}
                    </Button>

                    {getVisiblePages().map((p, index) => (
                        <Button
                            key={index}
                            variant={p === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => typeof p === 'number' && handlePageChange(p)}
                            disabled={typeof p !== 'number'}
                            className="h-8 w-8 p-0"
                        >
                            {p}
                        </Button>
                    ))}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className="h-8 w-8 p-0"
                    >
                        {'>'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={page === totalPages}
                        className="h-8 w-8 p-0"
                    >
                        {'>>'}
                    </Button>
                </div>
            </div>
        )
    }

    const filteredSummaries = summaryData?.summaries || []

    const stats = {
        total: summaryData?.summary?.total || 0,
        dispatched: summaryData?.summary?.dispatched || 0,
        pending: summaryData?.summary?.pending || 0
    }

    const handleDispatch = async (summaryId: number, items: { id: number; batchId: number }[]) => {
        setDispatching(true)
        try {
            const response = await deliveryOrdersApi.updateSummaryItems({
                summaryId,
                items,
                user: { id: 1 } // TODO: Get actual user ID from auth context
            }) as any

            console.log("handleDispatch response: ", response);

            // Check if response contains an error (API returns errors in response body)
            if (response && response.error) {
                const error: any = new Error(response)
                throw error
            }

            toastr.success("Order dispatched successfully", { title: "Success" })
            fetchSummaries() // Refresh the list
            setIsDetailsOpen(false)
        } catch (err: any) {
            // Extract error details from the error object
            const errorMessage = err?.error || "Failed to dispatch order"
            const errorDetails = err?.message || ""

            toastr.error(errorDetails, { title: errorMessage })
            console.error("Dispatch error:", err)
        } finally {
            setDispatching(false)
        }
    }

    const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const code = barcode.trim()
            if (!code || !selectedSummary) return

            const matchedItem = selectedSummary.SummaryItems.find(item => item.Item.barcode === code)

            if (matchedItem) {
                // Open quantity dialog
                setScannedItem(matchedItem)
                setItemQuantity("")
                setIsQuantityDialogOpen(true)
                setBarcode("")
            } else {
                toastr.error("Invalid barcode")
                setBarcode("")
            }
        }
    }

    const handleQuantitySubmit = () => {
        if (!scannedItem) return

        const qty = parseInt(itemQuantity)
        if (isNaN(qty) || qty <= 0) {
            toastr.error("Please enter a valid quantity")
            return
        }

        const currentScanned = scannedQuantities[scannedItem.id] || 0
        const remainingQty = scannedItem.qty - currentScanned

        if (qty > remainingQty) {
            toastr.error(`Cannot add ${qty}. Only ${remainingQty} remaining.`)
            return
        }

        setScannedQuantities(prev => ({
            ...prev,
            [scannedItem.id]: currentScanned + qty
        }))

        toastr.success(`Added ${qty} ${scannedItem.Item.unit || 'units'} of ${scannedItem.Item.name}`)
        setIsQuantityDialogOpen(false)
        setScannedItem(null)
        setItemQuantity("")
    }

    const handleDispatchSingleItem = async () => {
        if (!scannedItem || !selectedSummary) return

        const scannedQty = scannedQuantities[scannedItem.id] || 0
        if (scannedQty !== scannedItem.qty) {
            toastr.error(`Please scan all ${scannedItem.qty} items before dispatching`)
            return
        }

        try {
            await handleDispatch(selectedSummary.id, [{
                id: scannedItem.id,
                batchId: scannedItem.batchId
            }])
            setIsQuantityDialogOpen(false)
            setScannedItem(null)
        } catch (error) {
            console.error("Failed to dispatch item:", error)
        }
    }

    const generatePDF = (summary: DeliveryOrderSummary) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;

        // Helper: Right align text
        const rightText = (text: string, y: number, x: number = pageWidth - margin) => {
            doc.text(text, x, y, { align: "right" });
        };

        let yPos = 20;

        // 1. Header Section (Logo + Company Details)
        // Logo
        try {
            doc.addImage("/assets/codeaqua_logo.png", "PNG", margin, yPos - 5, 40, 35);
        } catch (e) {
            console.error("Failed to add logo:", e);
            doc.setTextColor(76, 175, 80);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("Code Aqua", margin, yPos + 10);
        }

        // Company Details
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        const companyX = margin + 50;
        doc.text("Code Aqua ERP Solutions", companyX, yPos);

        yPos += 5;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("B03, Crescat Boulevard, No 77 Colombo 03", companyX, yPos);
        yPos += 4;
        doc.text("VAT, 102861841 7000", companyX, yPos);
        yPos += 4;
        doc.text("+9471672564", companyX, yPos);
        yPos += 4;
        doc.text("info@bhlanka.com", companyX, yPos);
        yPos += 4;
        doc.text("www.bhlanka.com", companyX, yPos);

        yPos += 20;

        // 2. Title "Delivery Summary"
        doc.setFontSize(24);
        doc.setTextColor(70, 130, 180); // Steel Blue style color
        doc.setFont("helvetica", "normal");
        doc.text("Delivery Summary", margin, yPos);

        yPos += 15;

        // 3. Summary Details (Report Info)
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        const leftColX = margin;

        doc.setFont("helvetica", "bold");
        doc.text("SUMMARY DETAILS", leftColX, yPos);
        yPos += 5;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Summary Code: ${summary.code}`, leftColX, yPos);
        yPos += 5;
        doc.text(`Generated Date: ${format(new Date(summary.dateTime), 'dd/MM/yyyy')}`, leftColX, yPos);
        yPos += 5;
        doc.text(`Generated Time: ${format(new Date(summary.dateTime), 'HH:mm:ss')}`, leftColX, yPos);
        yPos += 5;
        if (summary.isDispatched !== undefined) {
            doc.text(`Status: ${summary.isDispatched ? 'Dispatched' : 'Pending'}`, leftColX, yPos);
            yPos += 5;
        }

        // Stats
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const itemsCount = summary.SummaryItems ? summary.SummaryItems.length : 0;
        doc.text(`TOTAL ITEMS: ${itemsCount}`, leftColX, yPos);

        yPos += 15;

        // 4. Items Table
        const tableCols = [
            { label: "NO", x: margin, w: 15 },
            { label: "ITEM CODE", x: margin + 15, w: 30 },
            { label: "DESCRIPTION", x: margin + 45, w: 90 },
            { label: "QTY", x: pageWidth - margin, w: 20, align: "right" }
        ];

        // Header Background
        doc.setFillColor(225, 240, 255); // Light blue
        doc.rect(margin, yPos - 4, pageWidth - (margin * 2), 8, 'F');

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 149, 237); // Cornflower Blue equivalent
        doc.setFontSize(9);

        // Header Text
        doc.text("NO", tableCols[0].x, yPos + 1);
        doc.text("ITEM CODE", tableCols[1].x, yPos + 1);
        doc.text("DESCRIPTION", tableCols[2].x, yPos + 1);
        doc.text("QTY", tableCols[3].x, yPos + 1, { align: "right" });

        yPos += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);

        // Items Loop
        if (summary.SummaryItems && summary.SummaryItems.length > 0) {
            summary.SummaryItems.forEach((item, idx) => {
                // Check Page Break
                if (yPos > pageHeight - 20) {
                    doc.addPage();
                    yPos = 20;
                }

                const itemNo = (idx + 1).toString();
                const itemCode = item.Item.barcode || item.Item.sku || "-";
                const itemName = item.Item.name;
                const quantity = `${item.qty} ${item.Item.unit || ''}`;

                // Extra info for description
                const doInfo = item.DeliveryOrder?.doNumber ? `DO: ${item.DeliveryOrder.doNumber}` : "";
                const batchInfo = item.Batch?.batchNumber ? `Batch: ${item.Batch.batchNumber}` : "";
                const extraInfo = [doInfo, batchInfo].filter(Boolean).join(" | ");

                const fullDescription = extraInfo ? `${itemName}\n(${extraInfo})` : itemName;

                doc.setFont("helvetica", "normal");
                doc.text(itemNo, tableCols[0].x, yPos);

                doc.setFont("helvetica", "bold");
                doc.text(itemCode, tableCols[1].x, yPos);

                doc.setFont("helvetica", "normal");
                const descLines = doc.splitTextToSize(fullDescription, tableCols[2].w);
                doc.text(descLines, tableCols[2].x, yPos);

                doc.text(quantity, tableCols[3].x, yPos, { align: "right" });

                const lineHeight = 6;
                // Calculate height based on description lines
                const rowHeight = Math.max(descLines.length * 5, lineHeight);
                yPos += (rowHeight + 3);
            });
        }

        // Footer (Page x of y, Generated by...)
        const footerY = pageHeight - 10;
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated by Code Aqua ERP Solutions - Page 1 of ${doc.getNumberOfPages()}`, margin, footerY);

        doc.save(`${summary.code || 'Summary'}.pdf`)
    }

    return (
        <ERPLayout>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dispatched Orders</h1>
                        <p className="text-muted-foreground mt-1">Manage delivery orders and dispatch status</p>
                    </div>
                </div>

                {/* Summary Statistics */}
                {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-2 flex items-center justify-between space-y-0">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                                <div className="text-2xl font-bold">{stats.total}</div>
                            </div>
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Package className="h-5 w-5 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 flex items-center justify-between space-y-0">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Dispatched</p>
                                <div className="text-2xl font-bold">{summaryData?.summaries.filter(s => s.isDispatched).length}</div>
                            </div>
                            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 flex items-center justify-between space-y-0">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                                <div className="text-2xl font-bold">{summaryData?.summaries.filter(s => !s.isDispatched).length}</div>
                            </div>
                            <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Clock className="h-5 w-5 text-yellow-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div> */}

                <Card>
                    <CardContent className="p-0">
                        <div className="p-4 border-b flex items-center gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by code or customer..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={statusFilter === 'all' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter('all')}
                                >
                                    All
                                </Button>
                                <Button
                                    variant={statusFilter === 'dispatched' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter('dispatched')}
                                    className={statusFilter === 'dispatched' ? "bg-green-600 hover:bg-green-700" : ""}
                                >
                                    Dispatched
                                </Button>
                                <Button
                                    variant={statusFilter === 'pending' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter('pending')}
                                    className={statusFilter === 'pending' ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                                >
                                    Pending
                                </Button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                <p className="text-muted-foreground">Loading dispatched orders...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-600">{error}</div>
                        ) : (
                            <>
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-[150px]">Code</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Dispatch Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSummaries.map((summary) => {
                                            const deliveryInfo = summary.SummaryItems[0]?.delivery;
                                            return (
                                                <TableRow key={summary.id}>
                                                    <TableCell className="py-2">
                                                        <span className="font-medium text-foreground">{summary.code}</span>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {format(new Date(summary.dateTime), 'dd/MM/yyyy')}
                                                            <span className="text-xs text-muted-foreground/60">{format(new Date(summary.dateTime), 'HH:mm')}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-muted-foreground">
                                                        {deliveryInfo?.dispatchDate ? format(new Date(deliveryInfo.dispatchDate), 'dd/MM/yyyy') : '-'}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${summary.isDispatched
                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                            }`}>
                                                            {summary.isDispatched ? (
                                                                <>
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Dispatched
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Clock className="h-3 w-3" />
                                                                    Pending
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex items-center gap-1"
                                                                onClick={() => {
                                                                    setSelectedSummary(summary)
                                                                    setIsDetailsOpen(true)
                                                                }}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex items-center gap-1"
                                                                onClick={() => generatePDF(summary)}
                                                            >
                                                                <Printer className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>

                                 <PaginationControls />
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Details Dialog */}
                <Dialog open={isDetailsOpen} onOpenChange={(open) => {
                    setIsDetailsOpen(open)
                    if (!open) setSelectedSummary(null)
                }}>
                    <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Order Summary Details - {selectedSummary?.code}</DialogTitle>
                        </DialogHeader>
                        <div className="mt-2">
                            {/* Add delivery information section */}
                            {selectedSummary?.SummaryItems[0]?.delivery && (
                                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Dispatch Date</p>
                                            <p className="font-medium">
                                                {format(new Date(selectedSummary.SummaryItems[0].delivery.dispatchDate), 'dd/MM/yyyy')}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Delivery Date</p>
                                            <p className="font-medium">
                                                {selectedSummary.SummaryItems[0].delivery.deliveryDate ? format(new Date(selectedSummary.SummaryItems[0].delivery.deliveryDate), 'dd/MM/yyyy') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Table className="text-xs">
                                <TableHeader className="bg-slate-100 dark:bg-slate-800">
                                    <TableRow>
                                        <TableHead className="font-semibold">DO Number</TableHead>
                                        <TableHead className="font-semibold">Item</TableHead>
                                        <TableHead className="font-semibold">Quantity</TableHead>
                                        <TableHead className="font-semibold">Batch</TableHead>
                                        <TableHead className="font-semibold">Store</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedSummary?.SummaryItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="py-2">{item.DeliveryOrder.doNumber}</TableCell>
                                            <TableCell className="py-2">
                                                <div>
                                                    <div>{item.Item.name}</div>
                                                    <div className="text-muted-foreground">
                                                        {item.Item.barcode}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="flex items-center gap-1">
                                                    {!selectedSummary?.isDispatched && <span>{scannedQuantities[item.id] || 0}</span>}
                                                    {!selectedSummary?.isDispatched && <span className="text-muted-foreground">/</span>}
                                                    <span>{item.qty} {item.Item.unit || ""}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">{item.Batch?.batchNumber}</TableCell>
                                            <TableCell className="py-2">{item.ReleaseStore?.name}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <DialogFooter>
                            {!selectedSummary?.isDispatched && (
                                <div className="flex-1 mr-4">
                                    <Input
                                        placeholder="Scan barcode (Press Enter)"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        onKeyDown={handleBarcodeScan}
                                        autoFocus
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Scan items to enable dispatch.
                                    </p>
                                </div>
                            )}
                            {!selectedSummary?.isDispatched && selectedSummary?.SummaryItems.every(item => item.canFulfillFromBay) && (
                                <div className="mb-4 flex justify-end">
                                    <Button
                                        variant="default"
                                        disabled={dispatching || !selectedSummary?.SummaryItems.every(item => (scannedQuantities[item.id] || 0) === item.qty)}
                                        onClick={() => handleDispatch(
                                            selectedSummary.id,
                                            selectedSummary.SummaryItems.flatMap(item =>
                                                (item.mergeInfo?.summaryItemIds || [item.id]).map(summaryItemId => ({
                                                    id: summaryItemId,
                                                    batchId: item.batchId
                                                }))
                                            )
                                        )}
                                        className="flex items-center gap-2"
                                    >
                                        {dispatching ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Dispatching...
                                            </>
                                        ) : (
                                            <>
                                                <Truck className="h-4 w-4" />
                                                Dispatch All Items
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Quantity Input Dialog */}
                <Dialog open={isQuantityDialogOpen} onOpenChange={setIsQuantityDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Enter Item Quantity</DialogTitle>
                        </DialogHeader>
                        {scannedItem && (
                            <div className="space-y-4">
                                <div className="p-4 bg-muted rounded-lg space-y-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Item Name</p>
                                        <p className="font-semibold">{scannedItem.Item.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Barcode</p>
                                        <p className="font-mono">{scannedItem.Item.barcode}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Required Qty</p>
                                            <p className="font-semibold">{scannedItem.qty} {scannedItem.Item.unit}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Scanned Qty</p>
                                            <p className="font-semibold">{scannedQuantities[scannedItem.id] || 0} {scannedItem.Item.unit}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Batch Number</p>
                                        <p className="font-semibold">{scannedItem.Batch?.batchNumber}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="quantity" className="text-sm font-medium">
                                        Enter Quantity
                                    </label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        min="1"
                                        max={scannedItem.qty - (scannedQuantities[scannedItem.id] || 0)}
                                        placeholder="Enter quantity"
                                        value={itemQuantity}
                                        onChange={(e) => setItemQuantity(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleQuantitySubmit()
                                            }
                                        }}
                                        autoFocus
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Remaining: {scannedItem.qty - (scannedQuantities[scannedItem.id] || 0)} {scannedItem.Item.unit}
                                    </p>
                                </div>
                            </div>
                        )}
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsQuantityDialogOpen(false)
                                    setScannedItem(null)
                                    setItemQuantity("")
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleQuantitySubmit}
                                disabled={!itemQuantity || parseInt(itemQuantity) <= 0}
                            >
                                Add Quantity
                            </Button>
                            {scannedItem && (scannedQuantities[scannedItem.id] || 0) === scannedItem.qty && (
                                <Button
                                    onClick={handleDispatchSingleItem}
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={dispatching}
                                >
                                    {dispatching ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Dispatching...
                                        </>
                                    ) : (
                                        <>
                                            <Truck className="h-4 w-4 mr-2" />
                                            Dispatch Item
                                        </>
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ERPLayout>
    )
}
