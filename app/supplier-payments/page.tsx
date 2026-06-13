"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, DollarSign, Eye, Edit, Trash2, CheckCircle, XCircle, Clock, CreditCard, Printer, Check } from "lucide-react"
import {
    supplierPaymentsApi,
    suppliersApi,
    locationsApi,
    paymentTypesApi,
    type SupplierPayment,
    type Supplier,
    type Location,
    type PaymentType,
} from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { usePagination } from "@/hooks/use-pagination"
import { CreateSupplierPaymentForm } from "@/components/supplier-payments/create-supplier-payment-form"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { generateChequePDF, type ChequePrintData } from "@/lib/pdf-generator"

const statusColors = {
    "Pending": "bg-yellow-100 text-yellow-800",
    "Approved": "bg-blue-100 text-blue-800",
    "Processed": "bg-green-100 text-green-800",
    "Cancelled": "bg-red-100 text-red-800",
    "Rejected": "bg-red-100 text-red-800",
}

export default function SupplierPaymentsPage() {
    const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [paymentMethods, setPaymentMethods] = useState<PaymentType[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPayment, setSelectedPayment] = useState<SupplierPayment | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
    const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false)

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [supplierFilter, setSupplierFilter] = useState<string>("all")
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")

    // Filter function for pagination
    const filterFn = (payment: SupplierPayment): boolean => {
        const matchesSearch = searchTerm === "" ||
            Boolean(payment.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.id?.toString().includes(searchTerm))

        const matchesStatus = statusFilter === "all" || payment.status === statusFilter
        const matchesSupplier = supplierFilter === "all" || payment.supplierId.toString() === supplierFilter
        const matchesPaymentMethod = paymentMethodFilter === "all" || payment.paymentMethod === paymentMethodFilter

        return Boolean(matchesSearch && matchesStatus && matchesSupplier && matchesPaymentMethod)
    }

    const { currentPage, itemsPerPage, totalPages, paginatedData, handlePageChange, handleItemsPerPageChange } = usePagination({
        data: supplierPayments,
        filterFn
    })

    const fetchSupplierPayments = async () => {
        try {
            setLoading(true)
            const response = await supplierPaymentsApi.getAll()
            console.log("Supplier payments data received:", response)

            // Handle { payments: [], pagination: {} } structure or direct array
            let paymentsArray: SupplierPayment[] = []
            if (response && (response as any).payments && Array.isArray((response as any).payments)) {
                paymentsArray = (response as any).payments
            } else if (Array.isArray(response)) {
                paymentsArray = response
            }

            setSupplierPayments(paymentsArray)

            console.log("Set supplier payments array with length:", paymentsArray.length)
        } catch (error) {
            console.error("Error fetching supplier payments:", error)
            // Ensure we set an empty array on error
            setSupplierPayments([])
            toast({
                title: "Error",
                description: "Failed to fetch supplier payments",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchMasterData = async () => {
        try {
            const [suppliersData, locationsData, paymentMethodsData] = await Promise.all([
                suppliersApi.getAll(),
                locationsApi.getAll(),
                paymentTypesApi.getAll(),
            ])

            setSuppliers(suppliersData as Supplier[])
            setLocations(locationsData as Location[])
            setPaymentMethods(paymentMethodsData as PaymentType[])
        } catch (error) {
            console.error("Error fetching master data:", error)
            toast({
                title: "Error",
                description: "Failed to fetch master data",
                variant: "destructive",
            })
        }
    }

    const handleApprovePayment = async (paymentId: number, notes?: string) => {
        try {
            await supplierPaymentsApi.approve(paymentId, { notes })
            toast({
                title: "Success",
                description: "Payment approved successfully",
            })
            fetchSupplierPayments()
            setIsApproveDialogOpen(false)
        } catch (error) {
            console.error("Error approving payment:", error)
            toast({
                title: "Error",
                description: "Failed to approve payment",
                variant: "destructive",
            })
        }
    }

    const handleProcessPayment = async (paymentId: number, paidDate: string, referenceNumber: string, notes?: string) => {
        try {
            await supplierPaymentsApi.process(paymentId, { paidDate, referenceNumber, notes })
            toast({
                title: "Success",
                description: "Payment processed successfully",
            })
            fetchSupplierPayments()
            setIsProcessDialogOpen(false)
        } catch (error) {
            console.error("Error processing payment:", error)
            toast({
                title: "Error",
                description: "Failed to process payment",
                variant: "destructive",
            })
        }
    }

    const handleCancelPayment = async (paymentId: number, reason: string) => {
        try {
            await supplierPaymentsApi.cancel(paymentId, { reason })
            toast({
                title: "Success",
                description: "Payment cancelled successfully",
            })
            fetchSupplierPayments()
        } catch (error) {
            console.error("Error cancelling payment:", error)
            toast({
                title: "Error",
                description: "Failed to cancel payment",
                variant: "destructive",
            })
        }
    }

    const handleDeletePayment = async (paymentId: number) => {
        if (!confirm("Are you sure you want to delete this payment?")) return

        try {
            await supplierPaymentsApi.remove(paymentId)
            toast({
                title: "Success",
                description: "Payment deleted successfully",
            })
            fetchSupplierPayments()
        } catch (error) {
            console.error("Error deleting payment:", error)
            toast({
                title: "Error",
                description: "Failed to delete payment",
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

    useEffect(() => {
        fetchMasterData()
    }, [])

    useEffect(() => {
        fetchSupplierPayments()
    }, [])

    // Check for "view" query param on mount to open view dialog
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const viewId = queryParams.get("view")
        if (viewId) {
            const loadAndOpen = async () => {
                try {
                    const payment = await supplierPaymentsApi.getById(viewId)
                    setSelectedPayment(payment)
                    setIsViewDialogOpen(true)
                } catch (err) {
                    console.error("Failed to load supplier payment from query param viewId:", viewId, err)
                }
            }
            loadAndOpen()
        }
    }, [])

    if (loading && supplierPayments.length === 0) {
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
            <div className="container mx-auto p-2">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Supplier Payments</h1>
                        <p className="text-muted-foreground">Manage supplier payments and transactions</p>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Payment
                    </Button>
                </div>

                <Tabs defaultValue="payments" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="payments">All Payments</TabsTrigger>
                        <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
                        <TabsTrigger value="stats">Statistics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="payments" className="space-y-4">
                        {/* Filters */}
                        <Card>
                            <CardContent className="flex gap-4 mt-2">
                                <div className="flex-1">
                                    <Label htmlFor="search">Search</Label>
                                    <Input
                                        id="search"
                                        placeholder="Search by supplier, reference number, or payment ID..."
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
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Approved">Approved</SelectItem>
                                            <SelectItem value="Processed">Processed</SelectItem>
                                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-48">
                                    <Label htmlFor="supplier">Supplier</Label>
                                    <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Suppliers" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Suppliers</SelectItem>
                                            {suppliers.map((supplier) => (
                                                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                                    {supplier.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-48">
                                    <Label htmlFor="paymentMethod">Payment Method</Label>
                                    <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Methods" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Methods</SelectItem>
                                            {paymentMethods.map((method) => (
                                                <SelectItem key={method.id} value={method.paymentTypeName}>
                                                    {method.paymentTypeName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Payment ID</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>GRNs</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedData.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell className="font-medium">#{payment.id}</TableCell>
                                            <TableCell>{payment.supplier?.name || "N/A"}</TableCell>
                                            <TableCell>
                                                {payment.PaymentGRNs && payment.PaymentGRNs.length > 0 ? (
                                                    <div className="text-sm space-y-1">
                                                        {payment.PaymentGRNs.map((pg) => (
                                                            <div key={pg.id} className="text-xs">
                                                                {pg.GRN?.grnNumber} - LKR {pg.grnAmount.toFixed(2)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    "N/A"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {payment.PaymentMethods && payment.PaymentMethods.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {payment.PaymentMethods.map((pm: any, idx: number) => (
                                                            <div key={idx} className="text-xs">
                                                                <span className="font-semibold">{pm.PaymentType?.paymentTypeName || "Method"}:</span> {payment.currency} {Number(pm.paymentAmount).toFixed(2)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    payment.paymentMethod
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {payment.currency} {Number(payment.amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[payment.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                                                    {payment.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedPayment(payment)
                                                            setIsViewDialogOpen(true)
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {payment.status === "Pending" && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedPayment(payment)
                                                                setIsApproveDialogOpen(true)
                                                            }}
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {payment.status === "Approved" && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedPayment(payment)
                                                                setIsProcessDialogOpen(true)
                                                            }}
                                                        >
                                                            <CreditCard className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {payment.PaymentMethods?.some((pm: any) => pm.paymentTypeId === 4 || pm.PaymentType?.paymentTypeName?.toLowerCase().includes('cheque')) && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            title="Print Cheque"
                                                            className="text-amber-600 border-amber-300 hover:bg-amber-50"
                                                            onClick={() => {
                                                                const chqMethod = payment.PaymentMethods?.find((pm: any) => pm.paymentTypeId === 4 || pm.PaymentType?.paymentTypeName?.toLowerCase().includes('cheque'))
                                                                if (chqMethod) {
                                                                    handlePrintCheque({
                                                                        payee: payment.supplier?.name || "-",
                                                                        amount: parseFloat(chqMethod.paymentAmount?.toString() || "0"),
                                                                        chequeDate: chqMethod.chequeDate || new Date().toISOString(),
                                                                        chequeNo: chqMethod.chequeNo,
                                                                        documentNo: payment.id?.toString(),
                                                                        documentType: "Supplier Payment",
                                                                    })
                                                                }
                                                            }}
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => payment.id && handleDeletePayment(payment.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                        </Card>
                    </TabsContent>

                    <TabsContent value="outstanding">
                        <Card>
                            <CardHeader>
                                <CardTitle>Outstanding Payments</CardTitle>
                                <CardDescription>View overdue and pending payments</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Outstanding payments functionality will be implemented here.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="stats">
                        <Card>
                            <CardHeader>
                                <CardTitle>Payment Statistics</CardTitle>
                                <CardDescription>Overview of supplier payments and analytics</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{supplierPayments.length}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {supplierPayments.filter(p => p.status === "Pending").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Processed Payments</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {supplierPayments.filter(p => p.status === "Processed").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                ${supplierPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* View Payment Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Payment Details</DialogTitle>
                            <DialogDescription>View payment information</DialogDescription>
                        </DialogHeader>
                        {selectedPayment && (
                            <div className="grid gap-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>Payment ID</Label>
                                        <p className="text-sm font-semibold">#{selectedPayment.id}</p>
                                    </div>
                                    <div>
                                        <Label>Payment Number</Label>
                                        <p className="text-sm font-semibold">{selectedPayment.paymentNumber || "N/A"}</p>
                                    </div>
                                    <div>
                                        <Label>Status</Label>
                                        <Badge className={statusColors[selectedPayment.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                                            {selectedPayment.status}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                                    <div>
                                        <Label>Supplier</Label>
                                        <p className="text-sm">{selectedPayment.supplier?.name}</p>
                                    </div>
                                    <div>
                                        <Label>Payment Method{selectedPayment.PaymentMethods && selectedPayment.PaymentMethods.length > 1 ? 's' : ''}</Label>
                                        {selectedPayment.PaymentMethods && selectedPayment.PaymentMethods.length > 0 ? (
                                            <div className="space-y-2 mt-1">
                                                {selectedPayment.PaymentMethods.map((pm: any, idx: number) => (
                                                    <div key={idx} className="bg-muted p-2 rounded text-sm border">
                                                        <div className="flex justify-between font-semibold">
                                                            <span>{pm.PaymentType?.paymentTypeName || "Unknown"}</span>
                                                            <span>{selectedPayment.currency} {Number(pm.paymentAmount).toFixed(2)}</span>
                                                        </div>
                                                        {(pm.referenceNo || pm.chequeNo || pm.bankId || pm.cardType) && (
                                                            <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-1">
                                                                {pm.referenceNo && <span>Ref: {pm.referenceNo} </span>}
                                                                {pm.chequeNo && <span>Chq: {pm.chequeNo} </span>}
                                                                {pm.cardType && <span>Card: {pm.cardType} </span>}
                                                            </div>
                                                        )}
                                                        {(pm.paymentTypeId === 4 || pm.PaymentType?.paymentTypeName?.toLowerCase().includes('cheque')) && (
                                                            <div className="mt-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-6 px-2 text-[10px] text-amber-600 border-amber-300 hover:bg-amber-50"
                                                                    title="Print Cheque"
                                                                    onClick={() => handlePrintCheque({
                                                                        payee: selectedPayment.supplier?.name || "-",
                                                                        amount: parseFloat(pm.paymentAmount?.toString() || "0"),
                                                                        chequeDate: pm.chequeDate || new Date().toISOString(),
                                                                        chequeNo: pm.chequeNo,
                                                                        referenceNo: pm.referenceNo,
                                                                        documentNo: selectedPayment.id?.toString(),
                                                                        documentType: "Supplier Payment",
                                                                    })}
                                                                >
                                                                    <Printer className="h-3 w-3 mr-1" /> Print Cheque
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm">{selectedPayment.paymentMethod}</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label>GRNs</Label>
                                    {selectedPayment.PaymentGRNs && selectedPayment.PaymentGRNs.length > 0 ? (
                                        <div className="text-sm space-y-3 mt-2">
                                            {selectedPayment.PaymentGRNs.map((pg) => (
                                                <Card key={pg.id} className="p-4 border-l-4 border-l-blue-500">
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-xs text-muted-foreground font-semibold">GRN Number</p>
                                                                <p className="font-semibold text-base">{pg.GRN?.grnNumber}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground font-semibold">GRN Status</p>
                                                                <Badge className="bg-green-100 text-green-800">{pg.GRN?.status}</Badge>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-3 pt-2 border-t">
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Total GRN Amount</p>
                                                                <p className="font-semibold">LKR {pg.grnAmount.toFixed(2)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Paid Amount</p>
                                                                <p className="font-semibold text-blue-600">LKR {pg.paidAmount.toFixed(2)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Pending Amount</p>
                                                                <p className="font-semibold text-orange-600">LKR {pg.pendingAmount.toFixed(2)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">GRN Date</p>
                                                                <p className="font-semibold">{pg.GRN?.grnDate ? new Date(pg.GRN.grnDate).toLocaleDateString() : "N/A"}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No GRNs associated</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>Reference Number</Label>
                                        <p className="text-sm">{selectedPayment.referenceNumber || "N/A"}</p>
                                    </div>
                                    <div>
                                        <Label>Amount</Label>
                                        <p className="text-sm font-semibold text-lg">{selectedPayment.currency} {selectedPayment.amount.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <Label>Exchange Rate</Label>
                                        <p className="text-sm">{selectedPayment.exchangeRate}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 border-b pb-4">
                                    <div>
                                        <Label>Due Date</Label>
                                        <p className="text-sm">{selectedPayment.dueDate ? new Date(selectedPayment.dueDate).toLocaleDateString() : "N/A"}</p>
                                    </div>
                                    <div>
                                        <Label>Paid Date</Label>
                                        <p className="text-sm">{selectedPayment.paidDate ? new Date(selectedPayment.paidDate).toLocaleDateString() : "N/A"}</p>
                                    </div>
                                    <div>
                                        <Label>Created Date</Label>
                                        <p className="text-sm">{selectedPayment.createdAt ? new Date(selectedPayment.createdAt).toLocaleDateString() : "N/A"}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Created By</Label>
                                        <p className="text-sm">{selectedPayment.createdByUsername || "N/A"}</p>
                                    </div>
                                    <div>
                                        <Label>Reconciled</Label>
                                        <p className="text-sm">{selectedPayment.reconciled ? "Yes" : "No"}</p>
                                    </div>
                                </div>
                                {selectedPayment.bankDetails && (
                                    <div>
                                        <Label>Bank Details</Label>
                                        <div className="text-sm">
                                            <p>Bank: {selectedPayment.bankDetails.bankName}</p>
                                            <p>Account: {selectedPayment.bankDetails.accountNumber}</p>
                                            {selectedPayment.bankDetails.branchCode && (
                                                <p>Branch Code: {selectedPayment.bankDetails.branchCode}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {selectedPayment.notes && (
                                    <div>
                                        <Label>Notes</Label>
                                        <p className="text-sm">{selectedPayment.notes}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Approve Payment Dialog */}
                <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Approve Payment</DialogTitle>
                            <DialogDescription>Approve this payment for processing</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="approve-notes">Notes (Optional)</Label>
                                <Textarea id="approve-notes" placeholder="Add notes about this approval..." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    const notes = (document.getElementById("approve-notes") as HTMLTextAreaElement)?.value
                                    selectedPayment?.id && handleApprovePayment(selectedPayment.id, notes)
                                }}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Process Payment Dialog */}
                <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Process Payment</DialogTitle>
                            <DialogDescription>Mark this payment as processed</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="paid-date">Paid Date</Label>
                                <Input
                                    id="paid-date"
                                    type="date"
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="process-reference">Reference Number</Label>
                                <Input
                                    id="process-reference"
                                    placeholder="Transaction reference number..."
                                    defaultValue={selectedPayment?.referenceNumber || ""}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="process-notes">Notes (Optional)</Label>
                                <Textarea id="process-notes" placeholder="Add notes about this payment..." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    const paidDate = (document.getElementById("paid-date") as HTMLInputElement)?.value
                                    const referenceNumber = (document.getElementById("process-reference") as HTMLInputElement)?.value
                                    const notes = (document.getElementById("process-notes") as HTMLTextAreaElement)?.value

                                    if (paidDate && referenceNumber && selectedPayment?.id) {
                                        handleProcessPayment(selectedPayment.id, paidDate, referenceNumber, notes)
                                    }
                                }}
                            >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Process
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Payment Form */}
                <CreateSupplierPaymentForm
                    open={isCreateDialogOpen}
                    onOpenChange={setIsCreateDialogOpen}
                    onSuccess={fetchSupplierPayments}
                />
            </div>
        </ERPLayout>
    )
}