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
import { Plus, Eye, Trash2, CheckCircle, XCircle, RefreshCcw, FileText, Package, Edit, ClipboardCheck } from "lucide-react"
import {
    stockReconciliationApi,
    locationsApi,
    storesApi,
    type StockReconciliation,
    type Location,
    type Store
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { usePagination } from "@/hooks/use-pagination"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { CreateStockReconciliationForm } from "@/components/stock-reconciliation/create-stock-reconciliation-form"
import { format } from "date-fns"

const statusColors = {
    "Pending": "bg-yellow-100 text-yellow-800",
    "Approved": "bg-green-100 text-green-800",
    "Rejected": "bg-red-100 text-red-800",
}

export default function StockReconciliationPage() {
    const { toast } = useToast()
    const [reconciliations, setReconciliations] = useState<StockReconciliation[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [stores, setStores] = useState<Store[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedRecon, setSelectedRecon] = useState<StockReconciliation | null>(null)
    const [editingRecon, setEditingRecon] = useState<StockReconciliation | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [locationFilter, setLocationFilter] = useState<string>("all")
    const [storeFilter, setStoreFilter] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")

    const fetchReconciliations = async () => {
        try {
            setLoading(true)
            const data = await stockReconciliationApi.getAll({
                status: statusFilter === "all" ? undefined : statusFilter,
                locationId: locationFilter === "all" ? undefined : parseInt(locationFilter),
                storeId: storeFilter === "all" ? undefined : parseInt(storeFilter),
            })
            setReconciliations(data)
        } catch (error: any) {
            console.error("Error fetching reconciliations:", error)
            setReconciliations([])
            toast({
                title: "Error",
                description: "Failed to fetch reconciliations",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchMasterData = async () => {
        try {
            const [locs, sts] = await Promise.all([
                locationsApi.getAll(),
                storesApi.getAll(),
            ])
            setLocations(locs as Location[])
            setStores(sts as Store[])
        } catch (error) {
            console.error("Error fetching master data:", error)
        }
    }

    const handleAction = async (id: number, status: 'Approved' | 'Rejected') => {
        try {
            await stockReconciliationApi.approve(id, status)
            toast({
                title: "Success",
                description: `Stock reconciliation ${status.toLowerCase()} successfully`,
            })
            fetchReconciliations()
            setIsApproveDialogOpen(false)
            setIsRejectDialogOpen(false)
            setIsViewDialogOpen(false)
        } catch (error: any) {
            console.error(`Error performing action ${status}:`, error)
            toast({
                title: "Error",
                description: error.message || `Failed to ${status.toLowerCase()} reconciliation`,
                variant: "destructive",
            })
        }
    }

    const filterFn = (item: StockReconciliation): boolean => {
        const matchesSearch = searchTerm === "" ||
            Boolean(item.reconciliationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.notes?.toLowerCase().includes(searchTerm.toLowerCase()))

        return matchesSearch
    }

    const { paginatedData, paginationProps } = usePagination({
        data: reconciliations,
        filterFn,
        initialItemsPerPage: 10
    })

    const handleView = async (id: number) => {
        try {
            const data = await stockReconciliationApi.getById(id)
            setSelectedRecon(data)
            setIsViewDialogOpen(true)
        } catch (error) {
            console.error("Error fetching reconciliation details:", error)
            toast({
                title: "Error",
                description: "Failed to fetch reconciliation details",
                variant: "destructive",
            })
        }
    }

    const handleEdit = async (id: number) => {
        try {
            const data = await stockReconciliationApi.getById(id)
            setEditingRecon(data)
            setIsCreateDialogOpen(true)
        } catch (error) {
            console.error("Error fetching for edit:", error)
        }
    }

    useEffect(() => {
        fetchMasterData()
    }, [])

    useEffect(() => {
        fetchReconciliations()
    }, [statusFilter, locationFilter, storeFilter])

    return (
        <ERPLayout>
            <div className="container mx-auto p-4 space-y-2">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Stock Reconciliation</h1>
                        <p className="text-muted-foreground">Manage and track inventory reconciliation records</p>
                    </div>
                    <Button onClick={() => {
                        setEditingRecon(null)
                        setIsCreateDialogOpen(true)
                    }} size="lg">
                        <Plus className="mr-2 h-5 w-5" />
                        New Reconciliation
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase font-semibold">Total</div><div className="text-2xl font-bold">{reconciliations.length}</div></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase font-semibold">Pending</div><div className="text-2xl font-bold text-yellow-600">{reconciliations.filter(r => r.status === "Pending").length}</div></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase font-semibold">Approved</div><div className="text-2xl font-bold text-green-600">{reconciliations.filter(r => r.status === "Approved").length}</div></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase font-semibold">Rejected</div><div className="text-2xl font-bold text-red-600">{reconciliations.filter(r => r.status === "Rejected").length}</div></CardContent></Card>
                </div>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Filter and track stock reconciliation status across locations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Search</Label>
                                <Input placeholder="Search records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Approved">Approved</SelectItem>
                                        <SelectItem value="Rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Select value={locationFilter} onValueChange={setLocationFilter}>
                                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {locations.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Store</Label>
                                <Select value={storeFilter} onValueChange={setStoreFilter}>
                                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {stores.filter(s => locationFilter === 'all' || s.locationId === parseInt(locationFilter)).map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Number</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Location / Store</TableHead>
                                        <TableHead>System vs Actual</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-10"><RefreshCcw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                                    ) : paginatedData.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No records found</TableCell></TableRow>
                                    ) : (
                                        paginatedData.map((recon) => (
                                            <TableRow key={recon.id}>
                                                <TableCell className="font-mono text-sm font-bold">{recon.reconciliationNumber}</TableCell>
                                                <TableCell>{format(new Date(recon.reconciliationDate), "MMM dd, yyyy")}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium">{recon.Location?.name}</div>
                                                    <div className="text-xs text-muted-foreground">{recon.Store?.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs uppercase text-muted-foreground font-semibold">Items: {recon.Items?.length || 0}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={statusColors[recon.status as keyof typeof statusColors]}>{recon.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => recon.id && handleView(recon.id)}><Eye className="h-4 w-4" /></Button>
                                                        {recon.status === "Pending" && (
                                                            <>
                                                                <Button variant="outline" size="sm" onClick={() => recon.id && handleEdit(recon.id)}><Edit className="h-4 w-4" /></Button>
                                                                <Button variant="outline" size="sm" onClick={() => { setSelectedRecon(recon); setIsApproveDialogOpen(true); }}><CheckCircle className="h-4 w-4 text-green-600" /></Button>
                                                                <Button variant="outline" size="sm" onClick={() => { setSelectedRecon(recon); setIsRejectDialogOpen(true); }}><XCircle className="h-4 w-4 text-red-600" /></Button>
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
                            <DialogTitle>Reconciliation Details</DialogTitle>
                            <DialogDescription>{selectedRecon?.reconciliationNumber}</DialogDescription>
                        </DialogHeader>
                        {selectedRecon && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1"><Label className="text-xs text-muted-foreground uppercase">Number</Label><p className="font-mono font-bold">{selectedRecon.reconciliationNumber}</p></div>
                                    <div className="space-y-1"><Label className="text-xs text-muted-foreground uppercase">Date</Label><p>{format(new Date(selectedRecon.reconciliationDate), "MMM dd, yyyy")}</p></div>
                                    <div className="space-y-1"><Label className="text-xs text-muted-foreground uppercase">Status</Label><div><Badge className={statusColors[selectedRecon.status as keyof typeof statusColors]}>{selectedRecon.status}</Badge></div></div>
                                    <div className="space-y-1"><Label className="text-xs text-muted-foreground uppercase">Location/Store</Label><p className="text-sm font-medium">{selectedRecon.Location?.name} / {selectedRecon.Store?.name}</p></div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-md"><Label className="text-xs text-muted-foreground">Notes</Label><p className="text-sm">{selectedRecon.notes || "None"}</p></div>
                                <div className="space-y-3">
                                    <h3 className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Item Details</h3>
                                    <div className="border rounded-md overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead>Item / Batch</TableHead>
                                                    <TableHead className="text-right">System</TableHead>
                                                    <TableHead className="text-right">Adjustment</TableHead>
                                                    <TableHead className="text-right">Actual</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedRecon.Items?.map((item, idx) => {
                                                    const sQty = parseFloat(item.systemQty as string) || 0
                                                    const pQty = parseFloat(item.physicalQty as string) || 0
                                                    const aQty = pQty - sQty
                                                    return (
                                                        <TableRow key={idx}>
                                                            <TableCell>
                                                                <div className="font-medium">{item.Item?.name}</div>
                                                                <div className="text-xs text-muted-foreground">{item.Item?.sku}</div>
                                                                {item.Batch && <Badge variant="secondary" className="text-[10px] mt-1">Batch: {item.Batch.batchNumber}</Badge>}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono">{sQty}</TableCell>
                                                            <TableCell className={`text-right font-mono font-bold ${aQty > 0 ? 'text-green-600' : aQty < 0 ? 'text-red-600' : ''}`}>
                                                                {aQty > 0 ? `+${aQty}` : aQty}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono font-bold">{pQty}</TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                                {selectedRecon.status === "Pending" && (
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(true)}>Reject</Button>
                                        <Button onClick={() => setIsApproveDialogOpen(true)}>Approve</Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Approve Confirmation */}
                <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Approve Reconciliation</DialogTitle><DialogDescription>Are you sure you want to approve this? This will update stock levels.</DialogDescription></DialogHeader>
                        <DialogFooter><Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button><Button onClick={() => selectedRecon?.id && handleAction(selectedRecon.id, "Approved")} className="bg-green-600 hover:bg-green-700 font-bold">Approve</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Reject Confirmation */}
                <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Reject Reconciliation</DialogTitle><DialogDescription>Are you sure you want to reject this request?</DialogDescription></DialogHeader>
                        <DialogFooter><Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button><Button onClick={() => selectedRecon?.id && handleAction(selectedRecon.id, "Rejected")} variant="destructive">Reject</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <CreateStockReconciliationForm
                    open={isCreateDialogOpen}
                    onOpenChange={(v) => { setIsCreateDialogOpen(v); if (!v) setEditingRecon(null); }}
                    onSuccess={fetchReconciliations}
                    initialData={editingRecon}
                />
            </div>
        </ERPLayout>
    )
}
