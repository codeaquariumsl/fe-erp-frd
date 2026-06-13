"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ginApi, storesApi, itemsApi, GIN, GINItem, Store, Item, ItemWithSchedule } from "@/lib/api";
import { format } from "date-fns";
import { 
    Eye, Edit, Trash2, Printer, Package, CheckCircle2, AlertCircle, Plus, 
    Search, Filter, RefreshCw, FileText, Calendar, Building2 
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import jsPDF from "jspdf";
import { ERPLayout } from "@/components/layouts/erp-layout";

// Validation helper functions
const isRackAlreadySelected = (items: any[], currentIndex: number, grnItemId: string) => {
    return items.some((item, index) =>
        index !== currentIndex &&
        item.grnItemId === grnItemId &&
        grnItemId !== ""
    );
};

const calculateTotalRequestedQty = (items: any[], itemId: string, grnId: string, currentIndex: number) => {
    return items.reduce((total, item, index) => {
        if (index !== currentIndex &&
            item.itemId === itemId &&
            item.selectedGrnId === grnId &&
            item.qty) {
            return total + parseFloat(item.qty);
        }
        return total;
    }, 0);
};

const getAvailableQtyForGrn = (scheduledItems: ItemWithSchedule[], itemId: string, grnId: string) => {
    const item = scheduledItems.find(si => String(si.id) === itemId);
    if (!item) return 0;
    const totalAvailableQty = item.grnItemList
        .filter(gi => gi.grn.id === parseInt(grnId))
        .reduce((sum, gi) => sum + gi.availableQty, 0);
    return totalAvailableQty;
};

const getQuantityStatus = (items: any[], itemId: string, grnId: string, scheduledItems: ItemWithSchedule[]) => {
    const totalRequested = items.reduce((total, item) => {
        if (item.itemId === itemId && item.selectedGrnId === grnId && item.qty) {
            return total + parseFloat(item.qty);
        }
        return total;
    }, 0);

    const availableForGrn = getAvailableQtyForGrn(scheduledItems, itemId, grnId);
    const remaining = availableForGrn - totalRequested;

    return {
        totalRequested,
        availableForGrn,
        remaining,
        isExceeded: remaining < 0
    };
};

export default function GINPage() {
    const [gins, setGins] = useState<GIN[]>([]);
    const [filteredGins, setFilteredGins] = useState<GIN[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [stores, setStores] = useState<Store[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [scheduledItems, setScheduledItems] = useState<ItemWithSchedule[]>([]);
    
    // Search and filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [storeFilter, setStoreFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all");
    
    const [form, setForm] = useState({
        issueStoreId: "",
        transferStoreId: "",
        ginDate: new Date().toISOString().split('T')[0],
        remarks: "",
        items: [] as { itemId: string; selectedGrnId: string; grnItemId: string; qty: string; remarks: string }[],
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [viewGin, setViewGin] = useState<GIN | null>(null);
    const [editGin, setEditGin] = useState<GIN | null>(null);
    const [approveError, setApproveError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    useEffect(() => {
        setLoading(true);
        Promise.all([ginApi.getAll(), storesApi.getAll<Store>(), itemsApi.getAll<Item>()])
            .then(([gins, stores, items]) => {
                setGins(gins);
                setFilteredGins(gins);
                setStores(stores);
                setItems(items);
            })
            .finally(() => setLoading(false));
    }, []);

    // Filter and search functionality
    useEffect(() => {
        let filtered = [...gins];

        if (searchTerm) {
            filtered = filtered.filter(gin =>
                gin.ginNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                gin.IssueStore?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                gin.issueStore?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                gin.TransferStore?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                gin.transferStore?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter(gin => gin.status === statusFilter);
        }

        if (storeFilter !== "all") {
            filtered = filtered.filter(gin => 
                String(gin.issueStoreId) === storeFilter || 
                String(gin.transferStoreId) === storeFilter
            );
        }

        if (dateFilter !== "all") {
            const today = new Date();
            switch (dateFilter) {
                case "today":
                    filtered = filtered.filter(gin => {
                        const date = new Date(gin.ginDate);
                        return date.toDateString() === today.toDateString();
                    });
                    break;
                case "week":
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    filtered = filtered.filter(gin => {
                        const date = new Date(gin.ginDate);
                        return date >= weekAgo;
                    });
                    break;
                case "month":
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    filtered = filtered.filter(gin => {
                        const date = new Date(gin.ginDate);
                        return date >= monthAgo;
                    });
                    break;
            }
        }

        setFilteredGins(filtered);
    }, [gins, searchTerm, statusFilter, storeFilter, dateFilter]);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const updatedGins = await ginApi.getAll();
            setGins(updatedGins);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setStoreFilter("all");
        setDateFilter("all");
    };

    const setHandleViewGin = (gin: GIN) => {
        setActionLoading(true);
        ginApi.getById(gin.id!)
            .then((fullGin) => {
                setViewGin(fullGin);
                setIsViewDialogOpen(true);
            })
            .catch((error) => {
                console.error('Failed to fetch GIN details:', error);
                setViewGin(gin);
                setIsViewDialogOpen(true);
            })
            .finally(() => {
                setActionLoading(false);
            });
    };

    const handlePrintGin = (gin: GIN) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        // Simple PDF generation
        doc.setFontSize(20);
        doc.text('Goods Issue Note', 20, 30);
        
        doc.setFontSize(12);
        doc.text(`GIN Number: ${gin.ginNumber}`, 20, 50);
        doc.text(`Date: ${format(new Date(gin.ginDate), 'dd/MM/yyyy')}`, 20, 60);
        doc.text(`Issue Store: ${gin.issueStore?.name || gin.IssueStore?.name}`, 20, 70);
        doc.text(`Transfer Store: ${gin.transferStore?.name || gin.TransferStore?.name}`, 20, 80);
        doc.text(`Status: ${gin.status}`, 20, 90);
        
        const fileName = `GIN_${gin.ginNumber || gin.id}_${format(new Date(), 'yyyyMMdd')}.pdf`;
        doc.save(fileName);
    };

    return (
        <ERPLayout>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Goods Issue Notes</h1>
                        <p className="text-muted-foreground">Manage and track goods issue transactions</p>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={handleRefresh}
                            disabled={loading}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Create GIN
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Create Goods Issue Note</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-sm font-medium">GIN Date *</label>
                                            <Input
                                                type="date"
                                                value={form.ginDate}
                                                onChange={(e) => setForm(f => ({ ...f, ginDate: e.target.value }))}
                                                className={!form.ginDate ? "border-red-300" : ""}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Issue Store *</label>
                                            <Select
                                                value={form.issueStoreId}
                                                onValueChange={(v) => setForm(f => ({ ...f, issueStoreId: v }))}
                                                required
                                            >
                                                <SelectTrigger className={!form.issueStoreId ? "border-red-300" : ""}>
                                                    <SelectValue placeholder="Select Issue Store" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {stores.map((s) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Transfer Store *</label>
                                            <Select
                                                value={form.transferStoreId}
                                                onValueChange={(v) => setForm(f => ({ ...f, transferStoreId: v }))}
                                                required
                                            >
                                                <SelectTrigger className={!form.transferStoreId ? "border-red-300" : ""}>
                                                    <SelectValue placeholder="Select Transfer Store" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {stores.map((s) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-3">
                                            <label className="text-sm font-medium">Remarks</label>
                                            <Textarea 
                                                value={form.remarks} 
                                                onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))} 
                                            />
                                        </div>
                                    </div>
                                    
                                    {formError && <div className="text-red-500 text-sm">{formError}</div>}
                                    
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={() => console.log('Submit')} disabled={loading}>
                                            {loading ? "Creating..." : "Create GIN"}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Search and Filters Section */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                    <Input
                                        placeholder="Search by GIN number, store name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Approved">Approved</SelectItem>
                                        <SelectItem value="Rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={storeFilter} onValueChange={setStoreFilter}>
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue placeholder="Store" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Stores</SelectItem>
                                        {stores.map((store) => (
                                            <SelectItem key={store.id} value={String(store.id)}>
                                                {store.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={dateFilter} onValueChange={setDateFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Date" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Time</SelectItem>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="week">This Week</SelectItem>
                                        <SelectItem value="month">This Month</SelectItem>
                                    </SelectContent>
                                </Select>

                                {(searchTerm || statusFilter !== "all" || storeFilter !== "all" || dateFilter !== "all") && (
                                    <Button variant="outline" size="sm" onClick={clearFilters}>
                                        Clear Filters
                                    </Button>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <div className="text-sm text-muted-foreground">
                                Showing {filteredGins.length} of {gins.length} GINs
                            </div>
                            <div className="flex gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    <span>Pending ({gins.filter(g => g.status === 'Pending').length})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Approved ({gins.filter(g => g.status === 'Approved').length})</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content */}
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="space-y-3 p-6">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center space-x-4">
                                        <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                                        <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                                        <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                                        <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                                        <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                                        <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredGins.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-6">
                                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No GINs Found</h3>
                                <p className="text-muted-foreground text-center max-w-md">
                                    {gins.length === 0 
                                        ? "No Goods Issue Notes have been created yet. Create your first GIN to get started."
                                        : "No GINs match your current filters. Try adjusting your search criteria."
                                    }
                                </p>
                                {gins.length === 0 && (
                                    <Button 
                                        className="mt-4" 
                                        onClick={() => setOpen(true)}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create First GIN
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                GIN Number
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                Issue Store
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                Transfer Store
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Date
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="font-semibold">Items</TableHead>
                                        <TableHead className="font-semibold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredGins.map((gin) => (
                                        <TableRow key={gin.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{gin.ginNumber}</span>
                                                    <span className="text-xs text-muted-foreground">ID: {gin.id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    {gin.IssueStore?.name || gin.issueStore?.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    {gin.TransferStore?.name || gin.transferStore?.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{format(new Date(gin.ginDate), "MMM dd, yyyy")}</span>
                                                    <span className="text-xs text-muted-foreground">{format(new Date(gin.ginDate), "EEEE")}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={
                                                        gin.status === 'Pending' ? 'secondary' : 
                                                        gin.status === 'Approved' ? 'default' : 
                                                        'destructive'
                                                    }
                                                    className="font-medium"
                                                >
                                                    {gin.status || "Unknown"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{gin.items?.length || gin.GINItems?.length || 0}</span>
                                                    <span className="text-xs text-muted-foreground">items</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 justify-end">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => setHandleViewGin(gin)} 
                                                        title="View Details"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {gin.status === "Pending" && (
                                                        <>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => setEditGin(gin)} 
                                                                title="Edit"
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        title="Delete"
                                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete GIN</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Are you sure you want to delete GIN "{gin.ginNumber}"? This action cannot be undone.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={async () => {
                                                                                try {
                                                                                    await ginApi.remove(gin.id!);
                                                                                    const updatedGins = await ginApi.getAll();
                                                                                    setGins(updatedGins);
                                                                                } catch (error) {
                                                                                    console.error('Delete failed:', error);
                                                                                }
                                                                            }}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        >
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </>
                                                    )}
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handlePrintGin(gin)} 
                                                        title="Print"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* View GIN Dialog */}
                {isViewDialogOpen && (
                    <Dialog open={isViewDialogOpen} onOpenChange={() => setIsViewDialogOpen(false)}>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Eye className="w-5 h-5" />
                                    GIN Details {viewGin ? `- ${viewGin.ginNumber}` : ''}
                                </DialogTitle>
                            </DialogHeader>

                            {actionLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex items-center gap-3">
                                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                                        <span className="text-muted-foreground">Loading GIN details...</span>
                                    </div>
                                </div>
                            ) : viewGin ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                                        <div>
                                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">GIN Number</div>
                                            <div className="font-semibold text-lg">{viewGin.ginNumber}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</div>
                                            <div className="font-semibold">{format(new Date(viewGin.ginDate), "MMM dd, yyyy")}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</div>
                                            <Badge variant={viewGin.status === 'Pending' ? 'secondary' : viewGin.status === 'Approved' ? 'default' : 'destructive'}>
                                                {viewGin.status}
                                            </Badge>
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Items</div>
                                            <div className="font-semibold">{viewGin.items?.length || 0}</div>
                                        </div>
                                    </div>

                                    {viewGin && viewGin.status === 'Pending' && (
                                        <Card className="border-amber-200 bg-amber-50">
                                            <CardContent className="pt-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-semibold">Action Required</h4>
                                                        <p className="text-sm text-muted-foreground">This GIN is pending approval</p>
                                                    </div>
                                                    <Button
                                                        onClick={async () => {
                                                            setApproveError(null);
                                                            setActionLoading(true);
                                                            try {
                                                                await ginApi.approveReject(viewGin.id!, { status: "Approved" });
                                                                setIsViewDialogOpen(false);
                                                                setTimeout(async () => {
                                                                    const updatedGins = await ginApi.getAll();
                                                                    setGins(updatedGins);
                                                                }, 300);
                                                            } catch (e: any) {
                                                                setApproveError(e.message || "Failed to approve GIN");
                                                            } finally {
                                                                setActionLoading(false);
                                                            }
                                                        }}
                                                        disabled={actionLoading}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        {actionLoading ? (
                                                            <>
                                                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                                                Approving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                                Approve GIN
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                                {approveError && (
                                                    <Alert variant="destructive" className="mt-3">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription>{approveError}</AlertDescription>
                                                    </Alert>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-12">
                                    <span className="text-muted-foreground">No GIN data available</span>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </ERPLayout>
    );
}
