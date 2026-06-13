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
import { Plus, RefreshCcw, Eye, Edit, Trash2, FileText, CheckCircle, XCircle } from "lucide-react"
import { supplierReturnsApi, suppliersApi, returnTypesApi, locationsApi, storesApi, type SupplierReturn, type Supplier, type ReturnType, type Location, type Store } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { usePagination } from "@/hooks/use-pagination"
import { CreateSupplierReturnForm } from "@/components/supplier-returns/create-supplier-return-form"
import { ERPLayout } from "@/components/layouts/erp-layout"
const statusColors = {
    "Pending": "bg-yellow-100 text-yellow-800",
    "Processing": "bg-blue-100 text-blue-800",
    "Approved": "bg-green-100 text-green-800",
    "Completed": "bg-emerald-100 text-emerald-800",
    "Cancelled": "bg-red-100 text-red-800",
}

export default function SupplierReturnsPage() {
    const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [returnTypes, setReturnTypes] = useState<ReturnType[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [stores, setStores] = useState<Store[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedReturn, setSelectedReturn] = useState<SupplierReturn | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [supplierFilter, setSupplierFilter] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")

    // Filter function for pagination
    const filterFn = (supplierReturn: SupplierReturn): boolean => {
        const matchesSearch = searchTerm === "" ||
            Boolean(supplierReturn.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                supplierReturn.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                supplierReturn.id?.toString().includes(searchTerm))

        const matchesStatus = statusFilter === "all" || supplierReturn.status === statusFilter
        const matchesSupplier = supplierFilter === "all" || supplierReturn.supplierId.toString() === supplierFilter

        return Boolean(matchesSearch && matchesStatus && matchesSupplier)
    }

    const { currentPage, itemsPerPage, totalPages, paginatedData, handlePageChange, handleItemsPerPageChange } = usePagination({
        data: supplierReturns,
        filterFn
    })

    const fetchSupplierReturns = async () => {
        try {
            setLoading(true)
            const data = await supplierReturnsApi.getAll()
            console.log("Supplier returns data received:", data)

            // Ensure data is always an array
            const returnsArray = Array.isArray(data) ? data : []
            setSupplierReturns(returnsArray)

            console.log("Set supplier returns array with length:", returnsArray.length)
        } catch (error) {
            console.error("Error fetching supplier returns:", error)
            // Ensure we set an empty array on error
            setSupplierReturns([])
            toast({
                title: "Error",
                description: "Failed to fetch supplier returns",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchMasterData = async () => {
        try {
            const [suppliersData, returnTypesData, locationsData, storesData] = await Promise.all([
                suppliersApi.getAll(),
                returnTypesApi.getActive(),
                locationsApi.getAll(),
                storesApi.getAll(),
            ])

            setSuppliers(suppliersData as Supplier[])
            setReturnTypes(returnTypesData as ReturnType[])
            setLocations(locationsData as Location[])
            setStores(storesData as Store[])
        } catch (error) {
            console.error("Error fetching master data:", error)
            toast({
                title: "Error",
                description: "Failed to fetch master data",
                variant: "destructive",
            })
        }
    }

    const handleApproveReturn = async (returnId: number, status: string, notes?: string) => {
        try {
            await supplierReturnsApi.approve(returnId, { status, notes })
            toast({
                title: "Success",
                description: `Supplier return ${status.toLowerCase()} successfully`,
            })
            fetchSupplierReturns()
            setIsApproveDialogOpen(false)
        } catch (error) {
            console.error("Error updating supplier return:", error)
            toast({
                title: "Error",
                description: "Failed to update supplier return",
                variant: "destructive",
            })
        }
    }

    const handleDeleteReturn = async (returnId: number) => {
        if (!confirm("Are you sure you want to delete this supplier return?")) return

        try {
            await supplierReturnsApi.remove(returnId)
            toast({
                title: "Success",
                description: "Supplier return deleted successfully",
            })
            fetchSupplierReturns()
        } catch (error) {
            console.error("Error deleting supplier return:", error)
            toast({
                title: "Error",
                description: "Failed to delete supplier return",
                variant: "destructive",
            })
        }
    }

    useEffect(() => {
        fetchMasterData()
    }, [])

    useEffect(() => {
        fetchSupplierReturns()
    }, [])

    if (loading && supplierReturns.length === 0) {
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
                        <h1 className="text-3xl font-bold">Supplier Returns</h1>
                        <p className="text-muted-foreground">Manage supplier returns and refunds</p>
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
                            <CardContent className="flex gap-4 mt-2">
                                <div className="flex-1">
                                    <Label htmlFor="search">Search</Label>
                                    <Input
                                        id="search"
                                        placeholder="Search by supplier, reason, or return ID..."
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
                            </CardContent>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Return ID</TableHead>
                                            <TableHead>Return Number</TableHead>
                                            <TableHead>Supplier</TableHead>
                                            <TableHead>Return Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Total Amount</TableHead>
                                            <TableHead>Return Date</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedData.map((supplierReturn) => (
                                            <TableRow key={supplierReturn.id}>
                                                <TableCell className="font-medium">#{supplierReturn.id}</TableCell>
                                                <TableCell>
                                                    <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                                                        {supplierReturn.returnNumber || "N/A"}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{supplierReturn.supplier?.name || "N/A"}</TableCell>
                                                <TableCell>{supplierReturn.returnType?.name || "N/A"}</TableCell>
                                                <TableCell>
                                                    <Badge className={statusColors[supplierReturn.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                                                        {supplierReturn.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {supplierReturn.totalAmount
                                                        ? `${supplierReturn.currency || "LKR"} ${typeof supplierReturn.totalAmount === 'number'
                                                            ? supplierReturn.totalAmount.toFixed(2)
                                                            : parseFloat(supplierReturn.totalAmount).toFixed(2)
                                                        }`
                                                        : "N/A"}
                                                </TableCell>
                                                <TableCell>
                                                    {supplierReturn.returnDate
                                                        ? new Date(supplierReturn.returnDate).toLocaleDateString()
                                                        : (supplierReturn.createdAt ? new Date(supplierReturn.createdAt).toLocaleDateString() : "N/A")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedReturn(supplierReturn)
                                                                setIsViewDialogOpen(true)
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {supplierReturn.status === "Pending" && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedReturn(supplierReturn)
                                                                    setIsApproveDialogOpen(true)
                                                                }}
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => supplierReturn.id && handleDeleteReturn(supplierReturn.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="stats">
                        <Card>
                            <CardHeader>
                                <CardTitle>Return Statistics</CardTitle>
                                <CardDescription>Overview of supplier returns and analytics</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{supplierReturns.length}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {supplierReturns.filter(r => r.status === "Pending").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Completed Returns</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {supplierReturns.filter(r => r.status === "Completed").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* View Return Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Supplier Return Details</DialogTitle>
                            <DialogDescription>View supplier return information</DialogDescription>
                        </DialogHeader>
                        {selectedReturn && (
                            <div className="grid gap-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>Return Number</Label>
                                        <p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                            {selectedReturn.returnNumber || "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label>Status</Label>
                                        <Badge className={statusColors[selectedReturn.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                                            {selectedReturn.status}
                                        </Badge>
                                    </div>
                                    <div>
                                        <Label>Supplier</Label>
                                        <p className="text-sm">{selectedReturn.supplier?.name || "N/A"}</p>
                                        {selectedReturn.supplier?.type && (
                                            <p className="text-xs text-muted-foreground">Type: {selectedReturn.supplier.type}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>Return Type</Label>
                                        <p className="text-sm">{selectedReturn.returnType?.name || "N/A"}</p>
                                        {selectedReturn.returnType?.code && (
                                            <p className="text-xs text-muted-foreground">Code: {selectedReturn.returnType.code}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label>Return Date</Label>
                                        <p className="text-sm">
                                            {selectedReturn.returnDate
                                                ? new Date(selectedReturn.returnDate).toLocaleDateString()
                                                : "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label>Currency</Label>
                                        <p className="text-sm">{selectedReturn.currency || "LKR"}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label>Reason</Label>
                                    <p className="text-sm">{selectedReturn.reason}</p>
                                </div>
                                {selectedReturn.notes && (
                                    <div>
                                        <Label>Notes</Label>
                                        <p className="text-sm">{selectedReturn.notes}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>Total Amount</Label>
                                        <p className="text-sm">
                                            {selectedReturn.currency || "LKR"} {
                                                selectedReturn.totalAmount
                                                    ? (typeof selectedReturn.totalAmount === 'number'
                                                        ? selectedReturn.totalAmount.toFixed(2)
                                                        : parseFloat(selectedReturn.totalAmount).toFixed(2))
                                                    : "0.00"
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <Label>Refund Amount</Label>
                                        <p className="text-sm">
                                            {selectedReturn.currency || "LKR"} {
                                                selectedReturn.refundAmount
                                                    ? (typeof selectedReturn.refundAmount === 'number'
                                                        ? selectedReturn.refundAmount.toFixed(2)
                                                        : parseFloat(selectedReturn.refundAmount).toFixed(2))
                                                    : "0.00"
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <Label>Refund Status</Label>
                                        <Badge variant="outline">
                                            {selectedReturn.refundStatus || "N/A"}
                                        </Badge>
                                    </div>
                                </div>
                                {(selectedReturn.approvedBy || selectedReturn.approvedDate) && (
                                    <div className="grid grid-cols-2 gap-4 p-3 bg-green-50 rounded-lg">
                                        <div>
                                            <Label>Approved By</Label>
                                            <p className="text-sm">{selectedReturn.approvedBy ? `User ID: ${selectedReturn.approvedBy}` : "N/A"}</p>
                                        </div>
                                        <div>
                                            <Label>Approved Date</Label>
                                            <p className="text-sm">
                                                {selectedReturn.approvedDate
                                                    ? new Date(selectedReturn.approvedDate).toLocaleDateString() + ' ' +
                                                    new Date(selectedReturn.approvedDate).toLocaleTimeString()
                                                    : "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                    <div>
                                        <Label>Created By</Label>
                                        <p>{selectedReturn.createdByUsername || `User ID: ${selectedReturn.createdBy}` || "N/A"}</p>
                                        <p>{selectedReturn.createdAt ? new Date(selectedReturn.createdAt).toLocaleString() : "N/A"}</p>
                                    </div>
                                    <div>
                                        <Label>Last Updated By</Label>
                                        <p>{selectedReturn.updatedByUsername || `User ID: ${selectedReturn.updatedBy}` || "N/A"}</p>
                                        <p>{selectedReturn.updatedAt ? new Date(selectedReturn.updatedAt).toLocaleString() : "N/A"}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label>Return Items</Label>
                                    {selectedReturn.items && selectedReturn.items.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>SKU</TableHead>
                                                    <TableHead>Quantity</TableHead>
                                                    <TableHead>Unit Price</TableHead>
                                                    <TableHead>Total Price</TableHead>
                                                    <TableHead>Condition</TableHead>
                                                    <TableHead>Disposition</TableHead>
                                                    <TableHead>Refundable</TableHead>
                                                    <TableHead>Refund Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedReturn.items.map((item, index) => (
                                                    <TableRow key={item.id || index}>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium">{item.item?.name || "N/A"}</p>
                                                                {item.item?.barcode && (
                                                                    <p className="text-xs text-muted-foreground">{item.item.barcode}</p>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-xs font-mono bg-gray-100 px-1 py-0.5 rounded">
                                                                {item.item?.sku || "N/A"}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>{item.quantity?.toFixed(2) || "0.00"}</TableCell>
                                                        <TableCell>{selectedReturn.currency || "LKR"} {item.unitPrice?.toFixed(2) || "0.00"}</TableCell>
                                                        <TableCell>{selectedReturn.currency || "LKR"} {item.totalPrice?.toFixed(2) || "0.00"}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs">
                                                                {item.condition || "N/A"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {item.disposition || "N/A"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.isRefundable ? (
                                                                <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                                                    Yes
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="default" className="bg-red-100 text-red-800 text-xs">
                                                                    No
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {selectedReturn.currency || "LKR"} {item.refundAmount?.toFixed(2) || "0.00"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No items found for this return.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Approve/Reject Dialog */}
                <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Return Status</DialogTitle>
                            <DialogDescription>Approve or reject this supplier return</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Textarea id="notes" placeholder="Add notes about this decision..." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
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
                <CreateSupplierReturnForm
                    open={isCreateDialogOpen}
                    onOpenChange={setIsCreateDialogOpen}
                    onSuccess={fetchSupplierReturns}
                />
            </div>
        </ERPLayout>
    )
}