"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Eye, Trash2, CheckCircle, XCircle, RefreshCcw, FileText, X } from "lucide-react"
import { customerReturnsApi, customersApi, returnTypesApi, locationsApi, storesApi, creditNotesApi, type CustomerReturn, type Customer, type ReturnType, type Location, type Store, type PaginationMeta } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { CreateCustomerReturnForm } from "@/components/customer-returns/create-customer-return-form"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { cn } from "@/lib/utils"
import { CustomerSelect } from "@/components/customer/customer-select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

const statusColors = {
    "Pending": "bg-yellow-100 text-yellow-800",
    "Processing": "bg-blue-100 text-blue-800",
    "Approved": "bg-blue-100 text-blue-800",
    "Completed": "bg-green-100 text-green-800",
    "Cancelled": "bg-red-100 text-red-800",
    "Rejected": "bg-red-100 text-red-800",
}

export default function CustomerReturnsPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [customerReturns, setCustomerReturns] = useState<CustomerReturn[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [returnTypes, setReturnTypes] = useState<ReturnType[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [stores, setStores] = useState<Store[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedReturn, setSelectedReturn] = useState<CustomerReturn | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
    const [stats, setStats] = useState<any[]>([])

    const [pagination, setPagination] = useState<PaginationMeta | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [customerFilter, setCustomerFilter] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [statusFilter, customerFilter, searchTerm])

    const fetchCustomerReturns = async () => {
        try {
            setLoading(true)
            const result = await customerReturnsApi.getAll({
                page: currentPage,
                limit: itemsPerPage,
                status: statusFilter,
                customerId: customerFilter,
                search: searchTerm
            })
            setCustomerReturns(result.data)
            setPagination(result.pagination)
        } catch (error) {
            console.error("Error fetching customer returns:", error)
            setCustomerReturns([])
            toast({
                title: "Error",
                description: "Failed to fetch customer returns",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    // Since we are now using server-side filtering, filteredCustomerReturns is just customerReturns
    const filteredCustomerReturns = customerReturns;
    const paginatedCustomerReturns = customerReturns;

    useEffect(() => {
        // We set pagination in fetchCustomerReturns now
    }, [filteredCustomerReturns, currentPage, itemsPerPage])

    const fetchStats = async () => {
        try {
            const data = await customerReturnsApi.getStats({
                status: statusFilter,
                customerId: customerFilter
            })
            setStats(data)
        } catch (error) {
            console.error("Error fetching stats:", error)
        }
    }

    const fetchMasterData = async () => {
        try {
            const [customersData, returnTypesData, locationsData, storesData] = await Promise.all([
                customersApi.getAll(),
                returnTypesApi.getActive(),
                locationsApi.getAll(),
                storesApi.getAll(),
            ])

            setCustomers(customersData as Customer[])
            setReturnTypes(returnTypesData as ReturnType[])
            setLocations(locationsData as Location[])
            setStores(storesData as Store[])
        } catch (error) {
            console.error("Error fetching master data:", error)
        }
    }

    const handleApproveReturn = async (returnId: number, status: string, notes?: string) => {
        try {
            await customerReturnsApi.approve(returnId, { status, notes })
            toast({
                title: "Success",
                description: `Customer return ${status.toLowerCase()} successfully`,
            })
            fetchCustomerReturns()
            setIsApproveDialogOpen(false)
        } catch (error) {
            console.error("Error updating customer return:", error)
            toast({
                title: "Error",
                description: "Failed to update customer return",
                variant: "destructive",
            })
        }
    }

    const handleDeleteReturn = async (returnId: number) => {
        try {
            await customerReturnsApi.remove(returnId)
            toast({
                title: "Success",
                description: "Customer return deleted successfully",
            })
            fetchCustomerReturns()
        } catch (error) {
            console.error("Error deleting customer return:", error)
            toast({
                title: "Error",
                description: "Failed to delete customer return",
                variant: "destructive",
            })
        }
    }

    const handleCreateCreditNote = async (returnId: number) => {
        try {
            setLoading(true)
            const result = await creditNotesApi.createFromReturn(returnId)
            toast({
                title: "Success",
                description: "Credit note created successfully",
            })
            // Redirect to the view dialog of the Credit Notes Page
            if (result.creditNote && result.creditNote.id) {
                router.push(`/credit-notes?view=${result.creditNote.id}`)
            } else {
                fetchCustomerReturns()
            }
        } catch (error: any) {
            console.error("Error creating credit note:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to create credit note",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const clearFilters = () => {
        setSearchTerm("")
        setStatusFilter("all")
        setCustomerFilter("all")
    }

    useEffect(() => {
        fetchMasterData()
    }, [])

    // Check for "view" query param on mount to open view dialog
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const viewId = queryParams.get("view")
        if (viewId) {
            const loadAndOpen = async () => {
                try {
                    const customerReturn = await customerReturnsApi.getById(viewId)
                    setSelectedReturn(customerReturn)
                    setIsViewDialogOpen(true)
                } catch (err) {
                    console.error("Failed to load customer return from query param viewId:", viewId, err)
                }
            }
            loadAndOpen()
        }
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomerReturns()
            fetchStats()
        }, 300)
        return () => clearTimeout(timer)
    }, [currentPage, itemsPerPage, statusFilter, customerFilter, searchTerm])

    if (loading && customerReturns.length === 0) {
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
                        <h1 className="text-3xl font-bold">Customer Returns</h1>
                        <p className="text-muted-foreground">Manage customer returns and refunds</p>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Return
                    </Button>
                </div>

                <Tabs defaultValue="returns" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="returns">All Returns</TabsTrigger>
                        <TabsTrigger value="stats">Statistics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="returns" className="space-y-4">
                        {/* Filters */}
                        <Card>
                            <CardContent className="flex gap-4 pt-6">
                                <div className="flex-1">
                                    <Label htmlFor="search">Search</Label>
                                    <Input
                                        id="search"
                                        placeholder="Search by customer, reason, or return number..."
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
                                            <SelectItem value="Processing">Processing</SelectItem>
                                            <SelectItem value="Approved">Approved</SelectItem>
                                            <SelectItem value="Completed">Completed</SelectItem>
                                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                                            <SelectItem value="Rejected">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-64">
                                    <Label htmlFor="customer">Customer</Label>
                                    <CustomerSelect
                                        customers={customers}
                                        value={customerFilter}
                                        onValueChange={(id) => setCustomerFilter(String(id))}
                                        placeholder="All Customers"
                                        showMainBadge={true}
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
                                            <TableHead>Return Number</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Return Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Total Amount</TableHead>
                                            <TableHead className="text-right">Utilized</TableHead>
                                            <TableHead className="text-right">Available</TableHead>
                                            <TableHead>Return Date</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedCustomerReturns.map((customerReturn) => (
                                            <TableRow key={customerReturn.id}>
                                                <TableCell className="py-2">
                                                    <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                                                        {customerReturn.returnNumber || `CR-${customerReturn.id}`}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-2">{customerReturn.customer?.name || "N/A"}</TableCell>
                                                <TableCell className="py-2">{customerReturn.returnType?.name || "N/A"}</TableCell>
                                                <TableCell className="py-2">
                                                    <Badge className={statusColors[customerReturn.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                                                        {customerReturn.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2 text-right font-medium">
                                                    {customerReturn.totalAmount
                                                        ? `${Number(customerReturn.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                        : "N/A"}
                                                </TableCell>
                                                <TableCell className="py-2 text-right text-muted-foreground">
                                                    {customerReturn.utilizedAmount !== undefined
                                                        ? `${Number(customerReturn.utilizedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                        : "N/A"}
                                                </TableCell>
                                                <TableCell className="py-2 text-right font-bold text-green-600">
                                                    {customerReturn.totalAmount !== undefined && customerReturn.utilizedAmount !== undefined
                                                        ? `${(Number(customerReturn.totalAmount) - Number(customerReturn.utilizedAmount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                        : "N/A"}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    {customerReturn.returnDate
                                                        ? new Date(customerReturn.returnDate).toLocaleDateString()
                                                        : "N/A"}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            className="h-8 w-8"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedReturn(customerReturn)
                                                                setIsViewDialogOpen(true)
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4 text-blue-600" />
                                                        </Button>
                                                        {customerReturn.status === "Pending" && (
                                                            <Button
                                                                className="h-8 w-8"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedReturn(customerReturn)
                                                                    setIsApproveDialogOpen(true)
                                                                }}
                                                            >
                                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                            </Button>
                                                        )}
                                                        {customerReturn.status === "Approved" && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        className="h-8 w-8"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        title="Create Credit Note"
                                                                    >
                                                                        <FileText className="h-4 w-4 text-yellow-600" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Create Credit Note</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Create Credit Note for this return?
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => customerReturn.id && handleCreateCreditNote(customerReturn.id)}>Continue</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                        {customerReturn.status === "Pending" && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        className="h-8 w-8"
                                                                        variant="outline"
                                                                        size="sm"
                                                                    >
                                                                        <Trash2 className="h-4 w-4 text-red-600" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => customerReturn.id && handleDeleteReturn(customerReturn.id)}>Continue</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {customerReturns.length === 0 && !loading && (
                                    <div className="text-center py-10 text-muted-foreground">
                                        No customer returns found.
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
                                    <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{pagination?.total || 0}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {stats.filter(s => s.status === "Pending").reduce((sum, s) => sum + Number(s.count), 0)}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Approved Returns</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">
                                        {stats.filter(s => s.status === "Approved").reduce((sum, s) => sum + Number(s.count), 0)}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Total Amount (LKR)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {stats.reduce((sum, s) => sum + Number(s.totalAmount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* View Return Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Customer Return Details</DialogTitle>
                            <DialogDescription>View detailed information about the return note</DialogDescription>
                        </DialogHeader>
                        {selectedReturn && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Return Number</Label>
                                        <p className="font-mono text-sm font-bold">{selectedReturn.returnNumber}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Status</Label>
                                        <div>
                                            <Badge className={statusColors[selectedReturn.status as keyof typeof statusColors]}>
                                                {selectedReturn.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Return Date</Label>
                                        <p className="text-sm">{new Date(selectedReturn.returnDate).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Total Amount</Label>
                                        <p className="text-sm font-bold">{selectedReturn.currency || "LKR"} {parseFloat(selectedReturn.totalAmount.toString()).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Utilized Amount</Label>
                                        <p className="text-sm text-muted-foreground">{selectedReturn.currency || "LKR"} {parseFloat((selectedReturn.utilizedAmount || 0).toString()).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Available Amount</Label>
                                        <p className="text-sm font-bold text-green-600">
                                            {selectedReturn.currency || "LKR"} {(parseFloat(selectedReturn.totalAmount.toString()) - parseFloat((selectedReturn.utilizedAmount || 0).toString())).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader className="py-3">
                                            <CardTitle className="text-sm">Customer Information</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 py-0 pb-3">
                                            <p className="text-sm font-medium">{selectedReturn.customer?.name}</p>
                                            <p className="text-xs text-muted-foreground">{selectedReturn.customer?.address}</p>
                                            <p className="text-xs text-muted-foreground">{selectedReturn.customer?.contactNumber}</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="py-3">
                                            <CardTitle className="text-sm">Return Info</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 py-0 pb-3">
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Return Type:</span>
                                                <span className="text-xs font-medium">{selectedReturn.returnType?.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Reason:</span>
                                                <span className="text-xs font-medium">{selectedReturn.reason || "N/A"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Refund Status:</span>
                                                <Badge variant="outline" className="text-[10px]">{selectedReturn.refundStatus}</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold mb-3">Return Items</h3>
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Qty</TableHead>
                                                    <TableHead>Price</TableHead>
                                                    <TableHead>Total</TableHead>
                                                    <TableHead>Condition</TableHead>
                                                    <TableHead>Disposition</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedReturn.items?.map((item, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell>
                                                            <p className="text-sm font-medium">{item.item?.name}</p>
                                                            <p className="text-xs text-muted-foreground">{item.item?.sku}</p>
                                                        </TableCell>
                                                        <TableCell className="text-sm">{item.quantity}</TableCell>
                                                        <TableCell className="text-sm">{selectedReturn.currency} {parseFloat(item.unitPrice.toString()).toFixed(2)}</TableCell>
                                                        <TableCell className="text-sm">{selectedReturn.currency} {parseFloat(item.totalPrice.toString()).toFixed(2)}</TableCell>
                                                        <TableCell><Badge variant="outline" className="text-xs">{item.condition}</Badge></TableCell>
                                                        <TableCell><Badge variant="secondary" className="text-xs">{item.disposition}</Badge></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="flex flex-col items-end space-y-1 mt-4 border-t pt-4 pr-1">
                                        <div className="flex justify-between w-64 text-sm">
                                            <span className="text-muted-foreground">Subtotal (Excl. Tax):</span>
                                            <span>LKR {Number(selectedReturn.subTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between w-64 text-sm">
                                            <span className="text-muted-foreground">Discount (Excl. Tax):</span>
                                            <span>LKR {Number(selectedReturn.discountAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        {selectedReturn.isTaxReturn && (
                                            <div className="flex justify-between w-64 text-sm text-blue-600">
                                                <span>Tax ({selectedReturn.taxRate}%):</span>
                                                <span>LKR {Number(selectedReturn.taxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between w-64 pt-1 border-t mt-1">
                                            <span className="font-bold">Total (Incl. Tax):</span>
                                            <span className="font-bold text-lg text-emerald-600">
                                                LKR {Number(selectedReturn.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {selectedReturn.notes && (
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Notes</Label>
                                        <div className="mt-1 p-2 bg-muted rounded text-sm">
                                            {selectedReturn.notes}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Approve/Reject Dialog */}
                <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Approve/Reject Return</DialogTitle>
                            <DialogDescription>Review the return note and take action</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="notes">Approval/Rejection Notes</Label>
                                <Textarea id="notes" placeholder="Enter notes here..." />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    const notes = (document.getElementById("notes") as HTMLTextAreaElement)?.value
                                    selectedReturn?.id && handleApproveReturn(selectedReturn.id, "Rejected", notes)
                                }}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                            </Button>
                            <Button
                                onClick={() => {
                                    const notes = (document.getElementById("notes") as HTMLTextAreaElement)?.value
                                    selectedReturn?.id && handleApproveReturn(selectedReturn.id, "Approved", notes)
                                }}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Return Form */}
                <CreateCustomerReturnForm
                    open={isCreateDialogOpen}
                    onOpenChange={setIsCreateDialogOpen}
                    onSuccess={fetchCustomerReturns}
                />
            </div>
        </ERPLayout>
    )
}
