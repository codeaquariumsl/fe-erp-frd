"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { CalendarIcon, Plus, Edit, Trash2, FileText, CheckCircle, XCircle, Eye, Printer, Search, Filter, X, Package, ChevronsUpDown, Check } from "lucide-react"
import { format, addDays } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import jsPDF from "jspdf"
import {
    invoicesApi,
    customersApi,
    salesOrdersApi,
    deliveryOrdersApi,
    itemsApi,
    documentSequenceApi,
    usersApi,
    type Invoice,
    type Customer,
    type SalesOrder,
    type Item,
    type InvoiceItem,
    type CreateInvoiceRequest,
    type UpdateInvoiceRequest,
    type User,
} from "@/lib/api"
import InvoicesLoading from "./loading"

const initialFormData: Omit<Invoice, 'id'> = {
    DeliveryOrder: null,
    SalesOrder: null,
    invoiceNumber: "",
    customerId: 0,
    salesOrderId: undefined,
    deliveryOrderId: undefined,
    invoiceDate: format(new Date(), "yyyy-MM-dd"),
    items: [],
}

export default function InvoicesPage() {
    // Page data – only the current page's rows + static lookup data
    const [invoices, setInvoices] = useState<Invoice[]>([])        // current page rows
    const [totalInvoices, setTotalInvoices] = useState(0)           // total count from server
    const [totalPages, setTotalPages] = useState(1)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
    const [deliveryOrders, setDeliveryOrders] = useState<any[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [salesPersons, setSalesPersons] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
    const [formData, setFormData] = useState<Omit<Invoice, 'id'>>(initialFormData)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

    // Search and Filter states
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [customerFilter, setCustomerFilter] = useState<string>("all")
    const [salesPersonFilter, setSalesPersonFilter] = useState<string>("all")
    const [dateFromFilter, setDateFromFilter] = useState<string>("")
    const [dateToFilter, setDateToFilter] = useState<string>("")
    const [customerFilterOpen, setCustomerFilterOpen] = useState(false)

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Load invoices whenever page / filters change
    useEffect(() => {
        fetchInvoices()
    }, [currentPage, itemsPerPage, searchTerm, statusFilter, customerFilter, salesPersonFilter, dateFromFilter, dateToFilter])

    // Load static lookup data once on mount
    useEffect(() => {
        loadLookups()
    }, [])

    // Check for "view" query param on mount to open view dialog
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const viewId = queryParams.get("view")
        if (viewId) {
            const loadAndOpen = async () => {
                try {
                    const invoice = await invoicesApi.getById(viewId)
                    setViewingInvoice(invoice)
                    setIsViewDialogOpen(true)
                } catch (err) {
                    console.error("Failed to load invoice from query param viewId:", viewId, err)
                }
            }
            loadAndOpen()
        }
    }, [])

    // ── Server-side fetch ───────────────────────────────────────────────────
    const fetchInvoices = async () => {
        try {
            setLoading(true)
            const result = await invoicesApi.getAll({
                page: currentPage,
                limit: itemsPerPage,
                search: searchTerm || undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
                customerId: customerFilter !== "all" ? customerFilter : undefined,
                salesPersonId: salesPersonFilter !== "all" ? salesPersonFilter : undefined,
                dateFrom: dateFromFilter || undefined,
                dateTo: dateToFilter || undefined,
            })
            setInvoices(result.data)
            setTotalInvoices(result.pagination.total)
            setTotalPages(result.pagination.totalPages)
        } catch (error) {
            console.error("Failed to load invoices:", error)
            toast({
                title: "Failed to load invoices",
                description: "Could not fetch invoices from server.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    // ── Static lookups (load once) ─────────────────────────────────────────
    const loadLookups = async () => {
        try {
            const [
                customersData,
                // salesOrdersData  ,
                // deliveryOrdersData,
                itemsData,
                salesPersonsData
            ] = await Promise.all([
                customersApi.getAll<Customer>(),
                // salesOrdersApi.getAll(),
                // deliveryOrdersApi.getAll(),
                itemsApi.getAll(),
                usersApi.getSalesPersons()
            ])
            setCustomers(customersData)
            // setSalesOrders(salesOrdersData)
            // setDeliveryOrders(deliveryOrdersData)
            setItems(Array.isArray(itemsData) ? itemsData : (itemsData as any).data || [])
            setSalesPersons(salesPersonsData || [])
        } catch (error) {
            console.error("Failed to load lookup data:", error)
            toast({
                title: "Failed to load data",
                description: "Failed to load lookup data from server.",
                variant: "destructive"
            })
        }
    }

    const getTotalPages = () => totalPages

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    const handleItemsPerPageChange = (value: string) => {
        setItemsPerPage(parseInt(value))
        setCurrentPage(1)
    }

    const clearFilters = () => {
        setSearchTerm("")
        setStatusFilter("all")
        setCustomerFilter("all")
        setSalesPersonFilter("all")
        setDateFromFilter("")
        setDateToFilter("")
        setCurrentPage(1)
    }

    // Status Filter Component
    const StatusFilter = () => (
        <div className="space-y-1 w-full">
            <Label className="text-xs font-medium text-gray-500">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8">
                    <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )

    // Customer Filter Component - Searchable Combobox
    const CustomerFilter = () => {
        const selectedCustomer = customers.find(c => c.id.toString() === customerFilter)
        return (
            <div className="space-y-1 w-full">
                <Label className="text-xs font-medium text-gray-500">Customer</Label>
                <Popover open={customerFilterOpen} onOpenChange={setCustomerFilterOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={customerFilterOpen}
                            className="h-8 w-full justify-between text-xs font-normal truncate"
                        >
                            <span className="truncate">
                                {selectedCustomer ? selectedCustomer.name : "All Customers"}
                            </span>
                            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-max p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Search customer..." className="h-8 text-xs" />
                            <CommandList>
                                <CommandEmpty>No customer found.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        value="all"
                                        onSelect={() => {
                                            setCustomerFilter("all")
                                            setCustomerFilterOpen(false)
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-3 w-3", customerFilter === "all" ? "opacity-100" : "opacity-0")} />
                                        All Customers
                                    </CommandItem>
                                    {customers.map((customer) => (
                                        <CommandItem
                                            key={customer.id}
                                            value={customer.name}
                                            onSelect={() => {
                                                setCustomerFilter(customer.id.toString())
                                                setCustomerFilterOpen(false)
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-3 w-3", customerFilter === customer.id.toString() ? "opacity-100" : "opacity-0")} />
                                            {customer.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        )
    }

    // Sales Person Filter Component
    const SalesPersonFilter = () => (
        <div className="space-y-1 w-full">
            <Label className="text-xs font-medium text-gray-500">Sales Person</Label>
            <Select value={salesPersonFilter} onValueChange={setSalesPersonFilter}>
                <SelectTrigger className="h-8">
                    <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {salesPersons.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id.toString()}>
                            {sp.fullName || sp.username}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )

    // Date Filter Component
    const DateFilter = ({ label, value, onChange }: { label: string, value: string, onChange: (date: string) => void }) => (
        <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-500">{label}</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "h-8 w-full justify-start text-left font-normal text-xs",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {value ? format(new Date(value), "MMM dd") : "Select"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={value ? new Date(value) : undefined}
                        onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    )

    // Results Summary Component
    const ResultsSummary = () => {
        const startIndex = totalInvoices === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
        const endIndex = Math.min(currentPage * itemsPerPage, totalInvoices)

        return (
            <div className="flex items-center justify-between text-xs text-muted-foreground py-2 border-t m-4">
                <span>
                    Showing {startIndex}-{endIndex} of {totalInvoices} invoices
                </span>
                {(searchTerm || statusFilter !== "all" || customerFilter !== "all" || salesPersonFilter !== "all" || dateFromFilter || dateToFilter) && (
                    <span className="flex items-center">
                        <Filter className="mr-1 h-3 w-3" />
                        Filters active
                    </span>
                )}
            </div>
        )
    }

    // Pagination Component
    const PaginationControls = () => {
        const totalPages = getTotalPages()

        if (totalPages <= 1) return null

        const getVisiblePages = () => {
            const delta = 2
            const range = []
            const rangeWithDots = []

            for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
                range.push(i)
            }

            if (currentPage - delta > 2) {
                rangeWithDots.push(1, '...')
            } else {
                rangeWithDots.push(1)
            }

            rangeWithDots.push(...range)

            if (currentPage + delta < totalPages - 1) {
                rangeWithDots.push('...', totalPages)
            } else {
                rangeWithDots.push(totalPages)
            }

            return rangeWithDots
        }

        return (
            <div className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Show</span>
                    <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                        <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-700">entries</span>
                </div>

                <div className="flex items-center space-x-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                    >
                        {'<<'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                    >
                        {'<'}
                    </Button>

                    {getVisiblePages().map((page, index) => (
                        <Button
                            key={index}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => typeof page === 'number' && handlePageChange(page)}
                            disabled={typeof page !== 'number'}
                            className="h-8 w-8 p-0"
                        >
                            {page}
                        </Button>
                    ))}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                    >
                        {'>'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                    >
                        {'>>'}
                    </Button>
                </div>
            </div>
        )
    }

    // loadData is now split into fetchInvoices() + loadLookups() above
    const loadData = () => {
        fetchInvoices()
        loadLookups()
    }

    const handleEdit = (invoice: Invoice) => {
        setEditingInvoice(invoice)
        setFormData({
            DeliveryOrder: invoice.DeliveryOrder,
            SalesOrder: invoice.SalesOrder,
            invoiceNumber: invoice.invoiceNumber,
            customerId: invoice.customerId,
            salesOrderId: invoice.salesOrderId,
            deliveryOrderId: invoice.deliveryOrderId,
            invoiceDate: invoice.invoiceDate,
            items: invoice.items,
        })
        setIsDialogOpen(true)
    }

    const handleView = (invoice: Invoice) => {
        setViewingInvoice(invoice)
        setIsViewDialogOpen(true)
    }

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this invoice?")) {
            try {
                await invoicesApi.remove(id)
                toast({
                    title: "Invoice deleted successfully",
                    description: "Invoice deleted successfully.",
                });
                loadData()
            } catch (error) {
                console.error("Failed to delete invoice:", error)
                toast({
                    title: "Error",
                    description: "Failed to delete invoice.",
                    variant: "destructive"
                });
            }
        }
    }

    const handleApproveReject = async (id: number, status: "Approved" | "Rejected") => {
        try {
            await invoicesApi.approveReject(id, { status })
            toast({
                title: "Success",
                description: `Invoice ${status.toLowerCase()} successfully.`
            });
            loadData()
        } catch (error) {
            console.error(`Failed to ${status.toLowerCase()} invoice:`, error)
            toast({
                title: `Failed to ${status.toLowerCase()} invoice.`,
                description: error instanceof Error ? error.message : "An unexpected error occurred.",
                variant: "destructive"
            });
        }
    }

    const printInvoice = (invoice: Invoice) => {
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
            // Using the logo from the public assets folder
            // Dimensions: approx 40mm wide, 35mm high
            doc.addImage("/assets/codeaqua_logo.png", "PNG", margin, yPos - 10, 40, 35)
        } catch (e) {
            console.error("Failed to add logo to PDF:", e)
            // Fallback to stylized text if logo fails to load
            doc.setTextColor(76, 175, 80)
            doc.setFontSize(22)
            doc.setFont("helvetica", "bold")
            doc.text("Code Aqua", margin, yPos + 10)
        }

        // Company Details (Positioned next to the logo)
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
        // yPos += 4

        // Invoice Title (Right)
        doc.setFontSize(18)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(80, 80, 80)
        const title = invoice.isTaxInvoice ? "Tax Invoice" : "Invoice"
        rightText(title, 25)

        yPos += 15

        // 2. Bill To & Ship To
        const boxTop = yPos

        // Bill To
        doc.setFillColor(240, 245, 250)
        doc.rect(margin, yPos, 85, 6, 'F')

        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(100, 100, 100)
        doc.text("BILL TO", margin + 2, yPos + 4)

        yPos += 10
        doc.setTextColor(0, 0, 0)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)

        if (invoice.customer) {
            doc.text(invoice.customer.name, margin, yPos)
            yPos += 5
            const addressLines = doc.splitTextToSize(invoice.customer.address || "", 80)
            doc.text(addressLines, margin, yPos)
            yPos += (addressLines.length * 4)
            if (invoice.customer.taxNumber) {
                doc.setFontSize(8)
                doc.setFont("helvetica", "normal")
                doc.text("Tax Number: " + invoice.customer.taxNumber, margin, yPos)
                yPos += 4
            }
            if (invoice.customer.contactNumber) {
                doc.setFontSize(8)
                doc.setFont("helvetica", "normal")
                doc.text(invoice.customer.contactNumber, margin, yPos)
            }
        }

        // Ship To
        let yPosRight = boxTop
        const rightColX = pageWidth / 2 + 10

        doc.setFillColor(240, 245, 250)
        doc.rect(rightColX, yPosRight, 85, 6, 'F')

        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(100, 100, 100)
        doc.text("SHIP TO", rightColX + 2, yPosRight + 4)

        yPosRight += 10
        doc.setTextColor(0, 0, 0)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)

        const shipName = invoice.DeliveryOrder?.customerName || invoice.customer?.name || ""
        const shipAddress = invoice.DeliveryOrder?.shippingAddress || invoice.customer?.address || ""
        const shipContact = invoice.DeliveryOrder?.contactNumber || invoice.customer?.contactNumber || ""

        if (shipName) {
            doc.text(shipName, rightColX, yPosRight)
            yPosRight += 5
            const shipAddressLines = doc.splitTextToSize(shipAddress, 80)
            doc.text(shipAddressLines, rightColX, yPosRight)
            yPosRight += (shipAddressLines.length * 4) + 1
            if (shipContact) {
                doc.text(shipContact, rightColX, yPosRight)
            }
        }

        yPos = Math.max(yPos, yPosRight) + 10

        // 3. Info Strip
        doc.setFillColor(235, 240, 245)
        doc.rect(margin, yPos, pageWidth - (margin * 2), 12, 'F')

        const infoHeaders = ["INVOICE NO.", "DATE", "TOTAL DUE", "DUE DATE", "TERMS", "PO NUMBER"]
        const startX = margin + 5
        const gap = (pageWidth - (margin * 2)) / 6

        doc.setFontSize(7)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(100, 100, 100)

        infoHeaders.forEach((h, i) => {
            doc.text(h, startX + (i * gap), yPos + 4)
        })

        // Values
        const totalAmount = invoice.totalAmount || 0
        const infoValues = [
            invoice.invoiceNumber,
            format(new Date(invoice.invoiceDate), "dd/MM/yyyy"),
            `LKR ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            format(addDays(new Date(invoice.DeliveryOrder?.deliveryDate || invoice.invoiceDate), Number(invoice.customer?.creditPeriod || 0)), "dd/MM/yyyy"),
            "Net " + (invoice.customer?.creditPeriod || "0"),
            invoice.SalesOrder?.poNumber || "-"
        ]

        doc.setFont("helvetica", "normal")
        doc.setTextColor(0, 0, 0)
        infoValues.forEach((v, i) => {
            if (v) doc.text(v, startX + (i * gap), yPos + 9)
        })

        yPos += 18

        // Sales Rep
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.text("SALES REP", margin, yPos)
        yPos += 5
        doc.setFont("helvetica", "normal")
        doc.text(invoice.SalesPerson?.fullName || "-", margin, yPos)

        yPos += 10

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
        let nonTaxSubTotal = 0;

        invoice.items.forEach((item) => {
            const itemCode = item.code || item.item?.sku || "-"
            const itemName = item.item?.name || "Unknown Item"

            const qty = item.qty
            const price = invoice.isTaxInvoice ? item.excludingTaxAmount : item.discountedAmount
            const amount = invoice.isTaxInvoice ? Number(item.total) : (Number(item.discountedAmount) * Number(item.qty))
            if (!invoice.isTaxInvoice) {
                nonTaxSubTotal += amount
            }

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

        // Bank Details (Left side)
        const bankY = yPos
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(100, 100, 100)
        doc.text("BANK DETAILS", margin, bankY)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(0, 0, 0)
        doc.text("CODE AQUA lanka PVT LTD", margin, bankY + 4)
        doc.text("Acc No. 111000133104", margin, bankY + 8)
        doc.text("National Development Bank PLC ( NDB )", margin, bankY + 12)
        doc.text("Branch - Main street, Pettah.", margin, bankY + 16)

        doc.setFontSize(8)
        const subtotal = invoice.isTaxInvoice ? Number(invoice.subTotal) : nonTaxSubTotal
        doc.text("SUBTOTAL", summaryX, yPos)
        rightText(subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), yPos, valueX)
        yPos += 6

        const taxVal = invoice.taxAmount || 0
        if (invoice.isTaxInvoice && taxVal > 0) {
            doc.text("TAX", summaryX, yPos)
            rightText(taxVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), yPos, valueX)
            yPos += 6
        }

        yPos += 2
        doc.setFontSize(9)
        doc.setFont("helvetica", "bold")
        doc.text("TOTAL", summaryX, yPos)
        const finalTotal = invoice.totalAmount || ((invoice.subTotal ?? 0) + (invoice.isTaxInvoice ? taxVal : 0))
        rightText(`LKR ${finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, yPos, valueX)

        yPos += 8
        const paidAmount = invoice.paidAmount || 0
        const setoffAmount = invoice.setoffAmount || 0
        const dueAmount = finalTotal - paidAmount - setoffAmount
        doc.text("PAID AMOUNT", summaryX, yPos)
        doc.setFontSize(11)
        rightText(`LKR ${paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, yPos, valueX)

        if (setoffAmount > 0) {
            yPos += 8
            doc.text("SET-OFF AMOUNT", summaryX, yPos)
            doc.setFontSize(11)
            rightText(`LKR ${setoffAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, yPos, valueX)
        }

        if (dueAmount > 0) {
            yPos += 8
            doc.text("BALANCE DUE", summaryX, yPos)
            doc.setFontSize(11)
            rightText(`LKR ${dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, yPos, valueX)
        }

        doc.save(`Invoice-${invoice.invoiceNumber}.pdf`)
        toast({
            title: "Success",
            description: "Invoice PDF generated successfully."
        })
    }

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { itemId: 0, qty: 0, price: 0, code: "" }],
        })
    }

    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const updatedItems = [...formData.items]
        updatedItems[index] = { ...updatedItems[index], [field]: value }
        setFormData({ ...formData, items: updatedItems })
    }

    const removeItem = (index: number) => {
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index),
        })
    }

    const resetForm = () => {
        setFormData(initialFormData)
        setEditingInvoice(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        const errors = []
        if (!formData.customerId) errors.push("Customer is required")
        if (!formData.invoiceDate) errors.push("Invoice date is required")
        if (formData.items.length === 0) errors.push("At least one item is required")

        // Validate items
        formData.items.forEach((item, index) => {
            if (!item.itemId) errors.push(`Item ${index + 1}: Please select an item`)
            if (!item.qty || item.qty <= 0) errors.push(`Item ${index + 1}: Quantity must be greater than 0`)
            if (!item.price || item.price <= 0) errors.push(`Item ${index + 1}: Price must be greater than 0`)
        })

        if (errors.length > 0) {
            toast({
                title: "Error",
                description: `Please fix the following errors:\n${errors.join('\n')}`,
                variant: "destructive"
            })
            return
        }

        setIsSubmitting(true)
        try {
            const payload: CreateInvoiceRequest | UpdateInvoiceRequest = {
                invoiceNumber: formData.invoiceNumber,
                customerId: formData.customerId,
                salesOrderId: formData.salesOrderId,
                deliveryOrderId: formData.deliveryOrderId,
                invoiceDate: formData.invoiceDate,
                items: formData.items,
            }

            if (editingInvoice) {
                await invoicesApi.update(editingInvoice.id!, payload as UpdateInvoiceRequest)
                toast({
                    title: "Success",
                    description: "Invoice updated successfully."
                })
            } else {
                await invoicesApi.create(payload as CreateInvoiceRequest)
                toast({
                    title: "Success",
                    description: "Invoice created successfully."
                })
            }

            setIsDialogOpen(false)
            resetForm()
            loadData()
        } catch (error) {
            console.error("Failed to save invoice:", error)
            toast({
                title: "Error",
                description: "Failed to save invoice",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const getTotalAmount = () => {
        return formData.items.reduce((total, item) => total + (item.qty * item.price), 0)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Pending":
                return (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        Pending
                    </Badge>
                )
            case "Approved":
                return (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Approved
                    </Badge>
                )
            case "Dispatched":
                return (
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                        Dispatched
                    </Badge>
                )
            case "Scheduled":
                return (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Scheduled
                    </Badge>
                )
            case "In Transit":
                return (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        In Transit
                    </Badge>
                )
            case "Finalized":
                return (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        Finalized
                    </Badge>
                )
            case "Delivered":
                return (
                    <Badge variant="default" className="bg-green-600 text-white">
                        Delivered
                    </Badge>
                )
            case "Failed":
                return <Badge variant="destructive">Failed</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    // if (loading) {
    //     return <ERPLayout><InvoicesLoading /></ERPLayout>
    // }

    return (
        <ERPLayout>
            <div className="p-2">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h1 className="text-3xl font-bold">Invoices</h1>
                        <p className="text-gray-600">Manage customer invoices</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            {/* <Button
                                onClick={() => {
                                    resetForm()
                                    // generateInvoiceNumber()
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create Invoice
                            </Button> */}
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
                                </DialogTitle>
                                <DialogDescription>
                                    {editingInvoice ? "Update invoice details" : "Create a new invoice for a customer"}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="invoiceDate">Invoice Date *</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !formData.invoiceDate && "text-muted-foreground border-red-300"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {formData.invoiceDate ? (
                                                        format(new Date(formData.invoiceDate), "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.invoiceDate ? new Date(formData.invoiceDate) : undefined}
                                                    onSelect={(date) =>
                                                        setFormData({
                                                            ...formData,
                                                            invoiceDate: date ? format(date, "yyyy-MM-dd") : "",
                                                        })
                                                    }
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="customer">Customer *</Label>
                                        <Select
                                            value={formData.customerId?.toString() || ""}
                                            onValueChange={(value) => setFormData({ ...formData, customerId: parseInt(value) })}
                                        >
                                            <SelectTrigger className={!formData.customerId ? "border-red-300" : ""}>
                                                <SelectValue placeholder="Select customer" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {customers.map((customer) => (
                                                    <SelectItem key={customer.id} value={customer.id.toString()}>
                                                        {customer.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="salesOrder">Sales Order (Optional)</Label>
                                        <Select
                                            value={formData.salesOrderId?.toString() || ""}
                                            onValueChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    salesOrderId: value ? parseInt(value) : undefined
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select sales order" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {/* <SelectItem value="">No Sales Order</SelectItem> */}
                                                {/* {salesOrders.map((order) => (
                                                    <SelectItem key={order.id} value={order.id.toString()}>
                                                        {order.orderNumber}
                                                    </SelectItem>
                                                ))} */}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="deliveryOrder">Delivery Order (Optional)</Label>
                                        <Select
                                            value={formData.deliveryOrderId?.toString() || ""}
                                            onValueChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    deliveryOrderId: value ? parseInt(value) : undefined
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select delivery order" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {/* <SelectItem value="">No Delivery Order</SelectItem> */}
                                                {/* {deliveryOrders.map((order) => (
                                                    <SelectItem key={order.id} value={order.id.toString()}>
                                                        {order.orderNumber || `DO-${order.id}`}
                                                    </SelectItem>
                                                ))} */}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label>Items *</Label>
                                        <Button type="button" variant="outline" onClick={addItem}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Item
                                        </Button>
                                    </div>

                                    {formData.items.length > 0 && (
                                        <div className="border rounded-lg">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Item</TableHead>
                                                        <TableHead>Quantity (Box)</TableHead>
                                                        <TableHead>Price (LKR)</TableHead>
                                                        <TableHead>Total (LKR)</TableHead>
                                                        <TableHead>Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {formData.items.map((item, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>
                                                                <Select
                                                                    value={item.itemId.toString()}
                                                                    onValueChange={(value) => updateItem(index, "itemId", parseInt(value))}
                                                                >
                                                                    <SelectTrigger className="w-[200px]">
                                                                        <SelectValue placeholder="Select item" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {items.map((availableItem) => (
                                                                            <SelectItem key={availableItem.id} value={availableItem.id.toString()}>
                                                                                {availableItem.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    value={item.qty}
                                                                    onChange={(e) => updateItem(index, "qty", parseFloat(e.target.value) || 0)}
                                                                    className="w-24"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={item.price}
                                                                    onChange={(e) => updateItem(index, "price", parseFloat(e.target.value) || 0)}
                                                                    className="w-28"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="font-medium">
                                                                    LKR {(item.qty * item.price).toFixed(2)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => removeItem(index)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-right font-semibold">
                                                            Total Amount:
                                                        </TableCell>
                                                        <TableCell className="font-bold">
                                                            LKR {getTotalAmount().toFixed(2)}
                                                        </TableCell>
                                                        <TableCell></TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end space-x-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsDialogOpen(false)
                                            resetForm()
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? "Saving..." : editingInvoice ? "Update" : "Create"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* View Invoice Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-4">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="text-2xl">Invoice {viewingInvoice?.invoiceNumber}</DialogTitle>
                        </DialogHeader>

                        {viewingInvoice && (
                            <div className="space-y-3">
                                {/* Invoice Header Info - Compact Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-gray-50 p-3 rounded-lg">
                                    <div className="flex flex-col">
                                        <Label className="text-xs font-medium text-gray-500 mb-1">Invoice No.</Label>
                                        <p className="text-sm font-semibold">{viewingInvoice.invoiceNumber}</p>
                                    </div>
                                    <div className="flex flex-col">
                                        <Label className="text-xs font-medium text-gray-500 mb-1">Date</Label>
                                        <p className="text-sm">{format(new Date(viewingInvoice.invoiceDate), "MMM dd, yyyy")}</p>
                                    </div>
                                    <div className="flex flex-col">
                                        <Label className="text-xs font-medium text-gray-500 mb-1">Sales Order</Label>
                                        <p className="text-sm">
                                            {viewingInvoice.SalesOrder?.orderNumber ||
                                                (viewingInvoice.salesOrderId ? `${viewingInvoice.SalesOrder?.orderNumber}` : "-")}
                                        </p>
                                    </div>
                                    <div className="flex flex-col">
                                        <Label className="text-xs font-medium text-gray-500 mb-1">Delivery Order</Label>
                                        <p className="text-sm">
                                            {viewingInvoice.DeliveryOrder?.doNumber || "-"}
                                        </p>
                                    </div>
                                    <div className="flex flex-col">
                                        <Label className="text-xs font-medium text-gray-500 mb-1">PO Number</Label>
                                        <div className="mt-0">{viewingInvoice.SalesOrder?.poNumber || "-"}</div>
                                    </div>
                                    <div className="flex flex-col">
                                        <Label className="text-xs font-medium text-gray-500 mb-1">Type</Label>
                                        <p className="text-sm font-medium truncate">{viewingInvoice.isTaxInvoice ? "Tax Invoice" : "Regular Invoice"}</p>
                                    </div>
                                </div>

                                {/* Customer Details - Compact */}
                                {viewingInvoice.customer && (
                                    <div className="border rounded-lg p-3 bg-blue-50">
                                        <h4 className="font-semibold text-sm mb-2 text-blue-900">Customer Information</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div>
                                                <Label className="text-xs font-medium text-gray-600">Name</Label>
                                                <p className="text-sm">{viewingInvoice.customer.name}</p>
                                            </div>
                                            {viewingInvoice.customer.contactNumber && (
                                                <div>
                                                    <Label className="text-xs font-medium text-gray-600">Contact</Label>
                                                    <p className="text-sm">{viewingInvoice.customer.contactNumber}</p>
                                                </div>
                                            )}
                                            {viewingInvoice.customer.address && (
                                                <div>
                                                    <Label className="text-xs font-medium text-gray-600">Address</Label>
                                                    <p className="text-sm">{viewingInvoice.customer.address}</p>
                                                </div>
                                            )}
                                            {viewingInvoice.customer.taxNumber && (
                                                <div>
                                                    <Label className="text-xs font-medium text-gray-600">Tax Number</Label>
                                                    <p className="text-sm font-mono">{viewingInvoice.customer.taxNumber}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {viewingInvoice.SalesPerson && (
                                    <div className="bg-amber-50 p-3 rounded col-span-3">
                                        <b className="block mb-2">Sales Person Details</b>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div><b>Name:</b> {viewingInvoice.SalesPerson.fullName || 'N/A'}</div>
                                            <div><b>Mobile:</b> {viewingInvoice.SalesPerson.mobile || 'N/A'}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Items Table - Compact */}
                                <div>
                                    <Label className="text-sm font-semibold">Items</Label>
                                    <div className="border rounded-lg mt-2 overflow-hidden">
                                        <Table className="text-sm">
                                            <TableHeader>
                                                <TableRow className="bg-gray-100">
                                                    <TableHead className="py-2 px-3 text-xs">Item</TableHead>
                                                    <TableHead className="py-2 px-3 text-xs">Code</TableHead>
                                                    <TableHead className="py-2 px-3 text-xs text-right">Qty</TableHead>
                                                    <TableHead className="py-2 px-3 text-xs text-right">Price</TableHead>
                                                    <TableHead className="py-2 px-3 text-xs text-right">Discount</TableHead>
                                                    <TableHead className="py-2 px-3 text-xs text-right">Discounted Price</TableHead>
                                                    <TableHead className="py-2 px-3 text-xs text-right">Rate</TableHead>
                                                    <TableHead className="py-2 px-3 text-xs text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {viewingInvoice.items.map((item, index) => {
                                                    const unitPrice = item.price;
                                                    const discountAmount = unitPrice * ((item.discount || 0) / 100);

                                                    return (
                                                        <TableRow key={index} className="hover:bg-gray-50">
                                                            <TableCell className="py-2 px-3">
                                                                <div className="font-medium text-xs">{item.item?.name}</div>
                                                            </TableCell>
                                                            <TableCell className="py-2 px-3">
                                                                {item.code && (
                                                                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono text-xs inline-block mt-1">
                                                                        {item.code}
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="py-2 px-3 text-right text-xs">{item.qty} {item.item?.unit}</TableCell>
                                                            <TableCell className="py-2 px-3 text-right text-xs">LKR {Number(item.price).toFixed(2)}</TableCell>
                                                            <TableCell className="py-2 px-3 text-right">
                                                                {item.discount && item.discount > 0 ? (
                                                                    <div className="text-red-600 text-xs">
                                                                        <div>{item.discount}%</div>
                                                                        <div className="font-medium">-LKR {Number(discountAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground text-xs">-</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="py-2 px-3 text-right text-xs">LKR {Number(item.discountedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>

                                                            <TableCell className="py-2 px-3 text-right">
                                                                {item.isTaxItem && item.excludingTaxAmount !== null ? (
                                                                    <div className="text-blue-600 text-xs font-medium">LKR {Number(item.excludingTaxAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                ) : (
                                                                    <span className="text-muted-foreground text-xs">-</span>
                                                                )}
                                                            </TableCell>

                                                            <TableCell className="py-2 px-3 text-right font-semibold text-xs">LKR {Number(item.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="flex justify-end mt-4">
                                        <div className="space-y-2 text-right">
                                            {(() => {


                                                return (
                                                    <>
                                                        <div className="text-sm font-medium">
                                                            Subtotal: <span className="font-bold">{Number((viewingInvoice.subTotal ?? 0)).toLocaleString('en-US', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}</span>
                                                        </div>

                                                        {viewingInvoice.taxAmount !== undefined && viewingInvoice.taxAmount > 0 && (
                                                            <div className="text-sm font-medium text-blue-600">
                                                                Tax ({viewingInvoice.taxRate}%): <span className="font-bold">+ {Number(viewingInvoice.taxAmount).toLocaleString('en-US', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2
                                                                })}</span>
                                                            </div>
                                                        )}
                                                        <div className="text-lg font-bold">
                                                            Total Amount: <span className="text-green-700">{Number(viewingInvoice.totalAmount ?? 0).toLocaleString('en-US', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}</span>
                                                        </div>
                                                        {(!viewingInvoice.status || viewingInvoice.status === "Approved") && (
                                                            <div className="text-sm font-medium text-amber-600">
                                                                Paid Amount: <span className="font-bold text-amber-700">{Number(viewingInvoice.paidAmount ?? 0).toLocaleString('en-US', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2
                                                                })}</span>
                                                            </div>
                                                        )}
                                                        {(!viewingInvoice.status || viewingInvoice.status === "Approved") && (
                                                            <div className="text-sm font-medium text-amber-600">
                                                                Setoff Amount: <span className="font-bold text-amber-700">{Number(viewingInvoice.setoffAmount ?? 0).toLocaleString('en-US', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2
                                                                })}</span>
                                                            </div>
                                                        )}
                                                        {(!viewingInvoice.status || viewingInvoice.status === "Approved") && (
                                                            <div className="text-lg font-bold border-t pt-1 mt-1">
                                                                Balance Due: <span className="text-red-700">{Math.max(0, (viewingInvoice.totalAmount ?? 0) - (viewingInvoice.paidAmount ?? 0) - (viewingInvoice.setoffAmount ?? 0)).toLocaleString('en-US', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2
                                                                })}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Settlement Details */}
                                {viewingInvoice.ReceiptInvoices && viewingInvoice.ReceiptInvoices.length > 0 && (
                                    <div className="mt-6">
                                        <Label className="text-sm font-semibold">Settlement Details</Label>
                                        <div className="border rounded-lg mt-2 overflow-hidden bg-gray-50/30">
                                            <Table className="text-sm">
                                                <TableHeader>
                                                    <TableRow className="bg-gray-100/50">
                                                        <TableHead className="py-2 px-3 text-xs">Receipt No</TableHead>
                                                        <TableHead className="py-2 px-3 text-xs">Date</TableHead>
                                                        <TableHead className="py-2 px-3 text-xs">Payment Methods</TableHead>
                                                        <TableHead className="py-2 px-3 text-xs">Set-offs</TableHead>
                                                        <TableHead className="py-2 px-3 text-xs text-right">Applied</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {viewingInvoice.ReceiptInvoices.map((ri, idx) => (
                                                        <TableRow key={idx} className="bg-white hover:bg-gray-50">
                                                            <TableCell className="py-2 px-3 text-xs font-medium">{ri.receipt?.receiptNo}</TableCell>
                                                            <TableCell className="py-2 px-3 text-xs whitespace-nowrap">
                                                                {ri.receipt?.receiptDate ? format(new Date(ri.receipt.receiptDate), "yyyy-MM-dd") : "-"}
                                                            </TableCell>
                                                            <TableCell className="py-2 px-3 text-xs">
                                                                <div className="space-y-1 min-w-[120px]">
                                                                    {ri.receipt?.receiptPayments?.map((p, pidx) => (
                                                                        <div key={pidx} className="flex justify-between gap-2">
                                                                            <span className="text-gray-500">{p.paymentTypeId === 1 ? "Cash" : p.paymentTypeId === 4 ? "Cheque" : "Bank"}</span>
                                                                            {/* <span className="font-medium">{Number(p.paymentAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> */}
                                                                        </div>
                                                                    ))}
                                                                    {(!ri.receipt?.receiptPayments || ri.receipt.receiptPayments.length === 0) && <span className="text-gray-400 italic">None</span>}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-2 px-3 text-xs">
                                                                <div className="space-y-1 min-w-[120px]">
                                                                    {ri.receipt?.creditNoteSetOffs?.map((cn, cnidx) => (
                                                                        <div key={cnidx} className="flex justify-between gap-2 text-blue-600">
                                                                            <span>{cn.creditNoteNumber}</span>
                                                                            {/* <span className="font-medium">{Number(cn.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> */}
                                                                        </div>
                                                                    ))}
                                                                    {/* {ri.receipt?.totalReturnAmount && Number(ri.receipt.totalReturnAmount) > 0 && (
                                                                        <div className="flex justify-between gap-2 text-amber-600">
                                                                            <span>Returns</span>
                                                                            <span className="font-medium">LKR {Number(ri.receipt.totalReturnAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                        </div>
                                                                    )} */}
                                                                    {(!ri.receipt?.creditNoteSetOffs || (ri.receipt.creditNoteSetOffs.length === 0 && !ri.receipt.totalReturnAmount)) && <span className="text-gray-400">-</span>}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-2 px-3 text-right text-xs font-bold text-green-700">
                                                                {Number(ri.paidAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons - Compact */}
                                <div className="flex justify-between items-center pt-3 border-t gap-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => printInvoice(viewingInvoice)}
                                        className="text-purple-600"
                                    >
                                        <Printer className="mr-2 h-4 w-4" />
                                        Print PDF
                                    </Button>

                                    <div className="flex gap-2">
                                        {(!viewingInvoice.status || viewingInvoice.status === "Pending") && (
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
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setIsViewDialogOpen(false)}
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <Card>
                    <CardHeader className="pb-3 pt-2">
                        {/* Compact Search and Filter Controls */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 w-full justify-between">
                                <div className="relative w-full">
                                    {/* Direct search input - no SearchBar wrapper component */}
                                    <div className="flex items-center space-x-2 mt-6">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search by invoice or customer..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <StatusFilter />
                                <CustomerFilter />
                                <SalesPersonFilter />
                                <DateFilter
                                    label="From Date"
                                    value={dateFromFilter}
                                    onChange={setDateFromFilter}
                                />
                                <DateFilter
                                    label="To Date"
                                    value={dateToFilter}
                                    onChange={setDateToFilter}
                                />
                                {(searchTerm || statusFilter !== "all" || customerFilter !== "all" || salesPersonFilter !== "all" || dateFromFilter || dateToFilter) && (
                                    <div className="flex items-end h-full">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearFilters}
                                            className="h-8 px-2 text-gray-500 hover:text-red-600 mb-1"
                                        >
                                            <X className="h-4 w-4 mr-1" />
                                            Clear Filters
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow className="bg-gray-100">
                                    <TableHead>Invoice Number</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Sales Order</TableHead>
                                    <TableHead>Delivery Order</TableHead>
                                    <TableHead>Amount (LKR)</TableHead>
                                    <TableHead>DO Status</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="py-2">
                                            <div>
                                                <div className="font-medium">{invoice.invoiceNumber}</div>
                                                <div className="text-xs text-muted-foreground">{invoice.isTaxInvoice ? " (Tax Invoice)" : ""}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2">{format(new Date(invoice.invoiceDate), "yyyy-MM-dd")}</TableCell>
                                        <TableCell className="py-2">
                                            <div className="">{invoice.customer?.name}
                                                <span> • </span>
                                                <span className={`px-2 py-1 rounded text-xs font-xs ${invoice.SalesOrder?.isDelivery
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {invoice.SalesOrder?.isDelivery ? 'Delivery' : 'Pickup'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {invoice.SalesOrder?.orderNumber ||
                                                (invoice.salesOrderId ? invoice.salesOrderId : "-")}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {invoice.deliveryOrderId ? invoice.DeliveryOrder?.doNumber : "-"}
                                        </TableCell>
                                        <TableCell className="py-2 text-right">
                                            {Number(invoice.totalAmount || 0.00).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="py-2">{getStatusBadge(invoice.DeliveryOrder?.status ? invoice.DeliveryOrder.status : "Pending")}</TableCell>
                                        <TableCell className="py-2">{getStatusBadge(invoice.status || "Pending")}</TableCell>
                                        <TableCell className="py-2">
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleView(invoice)}
                                                    className="text-blue-600 h-7 w-7 p-0"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {/* <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEdit(invoice)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button> */}
                                                {(!invoice.status || invoice.status === "Approved") && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => printInvoice(invoice)}
                                                        className="text-purple-600 h-7 w-7 p-0"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {invoices.length === 0 && (
                                    <TableRow>
                                        {loading ?
                                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                                {"Loading Invoices..."}
                                            </TableCell>
                                            :
                                            <TableCell colSpan={8} className="text-center py-8">
                                                {totalInvoices === 0 ? (
                                                    <div className="flex flex-col items-center space-y-2">
                                                        <FileText className="h-8 w-8 text-muted-foreground" />
                                                        <p className="text-muted-foreground">
                                                            {(searchTerm || statusFilter !== "all" || customerFilter !== "all" || dateFromFilter || dateToFilter)
                                                                ? "No invoices match your search criteria"
                                                                : "No invoices found"
                                                            }
                                                        </p>
                                                        {(searchTerm || statusFilter !== "all" || customerFilter !== "all" || dateFromFilter || dateToFilter) && (
                                                            <Button variant="outline" onClick={clearFilters} className="mt-2">
                                                                Clear filters
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-muted-foreground">
                                                        <p>No invoices on this page</p>
                                                    </div>
                                                )}
                                            </TableCell>
                                        }
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <ResultsSummary />
                        <PaginationControls />
                    </CardContent>
                </Card>
            </div>
        </ERPLayout>
    )
}
