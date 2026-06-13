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
import { Plus, Eye, Trash2, CheckCircle, XCircle, RefreshCcw, FileText, Package, Edit } from "lucide-react"
import {
    stockAdjustmentApi,
    locationsApi,
    storesApi,
    type StockAdjustment,
    type Location,
    type Store
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { usePagination } from "@/hooks/use-pagination"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { CreateStockAdjustmentForm } from "@/components/stock-adjustment/create-stock-adjustment-form"
import { format } from "date-fns"

const statusColors = {
    "Draft": "bg-gray-100 text-gray-800",
    "Approved": "bg-green-100 text-green-800",
    "Cancelled": "bg-red-100 text-red-800",
}

export default function StockAdjustmentPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [stores, setStores] = useState<Store[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null)
    const [editingAdjustment, setEditingAdjustment] = useState<StockAdjustment | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)

    const handleEditAdjustment = async (id: number) => {
        try {
            const data = await stockAdjustmentApi.getById(id)
            setEditingAdjustment(data)
            setIsCreateDialogOpen(true)
        } catch (error) {
            console.error("Error fetching adjustment for edit:", error)
            toast({
                title: "Error",
                description: "Failed to fetch adjustment for edit",
                variant: "destructive",
            })
        }
    }

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [locationFilter, setLocationFilter] = useState<string>("all")
    const [storeFilter, setStoreFilter] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")

    const fetchAdjustments = async () => {
        try {
            setLoading(true)
            const data = await stockAdjustmentApi.getAll({
                status: statusFilter === "all" ? undefined : statusFilter,
                locationId: locationFilter === "all" ? undefined : parseInt(locationFilter),
                storeId: storeFilter === "all" ? undefined : parseInt(storeFilter),
            })
            setAdjustments(data)
        } catch (error) {
            console.error("Error fetching stock adjustments:", error)
            setAdjustments([])
            toast({
                title: "Error",
                description: "Failed to fetch stock adjustments",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchMasterData = async () => {
        try {
            const [locationsData, storesData] = await Promise.all([
                locationsApi.getAll(),
                storesApi.getAll(),
            ])
            setLocations(locationsData as Location[])
            setStores(storesData as Store[])
        } catch (error) {
            console.error("Error fetching master data:", error)
        }
    }

    const handleApproveAdjustment = async (adjustmentId: number) => {
        try {
            // In a real app, approvedBy would come from the auth context
            const status = "Approved"
            await stockAdjustmentApi.approve(adjustmentId, status)
            toast({
                title: "Success",
                description: `Stock adjustment approved successfully`,
            })
            fetchAdjustments()
            setIsApproveDialogOpen(false)
            setIsViewDialogOpen(false)
        } catch (error: any) {
            console.error("Error approving stock adjustment:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to approve stock adjustment",
                variant: "destructive",
            })
        }
    }

    const filterFn = (item: StockAdjustment): boolean => {
        const matchesSearch = searchTerm === "" ||
            Boolean(item.adjustmentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.notes?.toLowerCase().includes(searchTerm.toLowerCase()))

        return matchesSearch
    }

    const { paginatedData, paginationProps } = usePagination({
        data: adjustments,
        filterFn,
        initialItemsPerPage: 10
    })

    const handleViewAdjustment = async (id: number) => {
        try {
            const data = await stockAdjustmentApi.getById(id)
            setSelectedAdjustment(data)
            setIsViewDialogOpen(true)
        } catch (error) {
            console.error("Error fetching adjustment details:", error)
            toast({
                title: "Error",
                description: "Failed to fetch adjustment details",
                variant: "destructive",
            })
        }
    }

    useEffect(() => {
        fetchMasterData()
        fetchAdjustments()
    }, [statusFilter, locationFilter, storeFilter])

    return (
        <ERPLayout>
            <div className="container mx-auto p-4 space-y-2">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Stock Adjustment</h1>
                        <p className="text-muted-foreground">Adjust stock levels for specific items and batches</p>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
                        <Plus className="mr-2 h-5 w-5" />
                        New Adjustment
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{adjustments.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Draft</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">
                                {adjustments.filter(a => a.status === "Draft").length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {adjustments.filter(a => a.status === "Approved").length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">This Month</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {adjustments.filter(a => {
                                    const date = new Date(a.adjustmentDate)
                                    const now = new Date()
                                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
                                }).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        {/* <CardTitle>Adjustments</CardTitle> */}
                        <CardDescription>Filter and view stock adjustments</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Search</Label>
                                <Input
                                    placeholder="Search by number, reason..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="Draft">Draft</SelectItem>
                                        <SelectItem value="Approved">Approved</SelectItem>
                                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Select value={locationFilter} onValueChange={setLocationFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Locations" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Locations</SelectItem>
                                        {locations.map(loc => (
                                            <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Store</Label>
                                <Select value={storeFilter} onValueChange={setStoreFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Stores" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Stores</SelectItem>
                                        {stores.map(store => (
                                            <SelectItem key={store.id} value={store.id.toString()}>{store.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Adj Number</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Location/Store</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                <RefreshCcw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                                <p className="mt-2 text-sm text-muted-foreground">Loading adjustments...</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : paginatedData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No stock adjustments found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedData.map((adj) => (
                                            <TableRow key={adj.id}>
                                                <TableCell className="font-mono text-xs font-bold">
                                                    {adj.adjustmentNumber}
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(adj.adjustmentDate), "MMM dd, yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium">{adj.Location?.name}</div>
                                                    <div className="text-xs text-muted-foreground">{adj.Store?.name}</div>
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate">
                                                    {adj.reason}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={statusColors[adj.status as keyof typeof statusColors]}>
                                                        {adj.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => adj.id && handleViewAdjustment(adj.id)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {adj.status === "Draft" && (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => adj.id && handleEditAdjustment(adj.id)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedAdjustment(adj)
                                                                        setIsApproveDialogOpen(true)
                                                                    }}
                                                                >
                                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* View Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Stock Adjustment Details</DialogTitle>
                            <DialogDescription>
                                Detailed view of stock adjustment {selectedAdjustment?.adjustmentNumber}
                            </DialogDescription>
                        </DialogHeader>
                        {selectedAdjustment && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground text-xs uppercase">Adjustment No</Label>
                                        <p className="font-mono font-bold">{selectedAdjustment.adjustmentNumber}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground text-xs uppercase">Date</Label>
                                        <p>{format(new Date(selectedAdjustment.adjustmentDate), "MMM dd, yyyy")}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground text-xs uppercase">Status</Label>
                                        <div>
                                            <Badge className={statusColors[selectedAdjustment.status as keyof typeof statusColors]}>
                                                {selectedAdjustment.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground text-xs uppercase">Location/Store</Label>
                                        <p className="text-sm font-medium">{selectedAdjustment.Location?.name} / {selectedAdjustment.Store?.name}</p>
                                    </div>
                                </div>

                                <Card className="bg-muted/30">
                                    <CardContent className="pt-4 space-y-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-muted-foreground text-xs">Reason</Label>
                                                <p className="text-sm">{selectedAdjustment.reason}</p>
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground text-xs">Notes</Label>
                                                <p className="text-sm">{selectedAdjustment.notes || "No notes provided"}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Package className="h-5 w-5" /> Adjusted Items
                                    </h3>
                                    <div className="border rounded-md overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Batch</TableHead>
                                                    <TableHead className="text-right">System Qty</TableHead>
                                                    <TableHead className="text-right">Adj Qty</TableHead>
                                                    <TableHead className="text-right">New Qty</TableHead>
                                                    <TableHead>Remark</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(selectedAdjustment.Items || selectedAdjustment.items)?.map((item, idx) => {
                                                    const sQty = typeof item.systemQty === 'string' ? parseFloat(item.systemQty) : item.systemQty;
                                                    const aQty = typeof item.adjustedQty === 'string' ? parseFloat(item.adjustedQty) : item.adjustedQty;
                                                    const nQty = typeof item.newQty === 'string' ? parseFloat(item.newQty) : item.newQty;

                                                    return (
                                                        <TableRow key={idx}>
                                                            <TableCell>
                                                                <div className="font-medium">{item.Item?.name}</div>
                                                                <div className="text-xs text-muted-foreground">{item.Item?.sku}</div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {item.Batch?.batchNumber || "No Batch"}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono">{sQty}</TableCell>
                                                            <TableCell className={`text-right font-mono font-bold ${aQty > 0 ? 'text-green-600' : aQty < 0 ? 'text-red-600' : ''}`}>
                                                                {aQty > 0 ? `+${aQty}` : aQty}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono font-bold">{nQty}</TableCell>
                                                            <TableCell className="text-sm max-w-[200px] truncate">{item.remark || "-"}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {selectedAdjustment.status === "Pending" && (
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                                        <Button onClick={() => setIsApproveDialogOpen(true)}>
                                            <CheckCircle className="mr-2 h-4 w-4" /> Approve Adjustment
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Approve Confirmation Dialog */}
                <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Approval</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to approve this stock adjustment? This will permanently update the inventory levels.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0 mt-4">
                            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => selectedAdjustment?.id && handleApproveAdjustment(selectedAdjustment.id)}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle className="mr-2 h-4 w-4" /> Confirm Approval
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Stock Adjustment Form */}
                <CreateStockAdjustmentForm
                    open={isCreateDialogOpen}
                    onOpenChange={(open) => {
                        setIsCreateDialogOpen(open)
                        if (!open) setEditingAdjustment(null)
                    }}
                    onSuccess={fetchAdjustments}
                    initialData={editingAdjustment}
                />
            </div>
        </ERPLayout>
    )
}
