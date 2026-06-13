"use client";
import { useEffect, useState, useMemo } from "react";
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
import { ginApi, storesApi, itemsApi, deliveryOrdersApi, GIN, GINItem, Store, Item, ItemWithSchedule, ReverseStockGINRequest } from "@/lib/api";
import { format } from "date-fns";
import { Eye, Edit, Trash2, Printer, Package, CheckCircle2, AlertCircle, Plus, RotateCcw, ArrowLeft, Loader2, Search, Filter } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DialogFooter } from "@/components/ui/dialog";
import { AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
    // State variables (same as before - keeping all existing state)
    const [gins, setGins] = useState<GIN[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [stores, setStores] = useState<Store[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [scheduledItems, setScheduledItems] = useState<ItemWithSchedule[]>([]);

    // Timeslot related states
    const [selectedTimeslot, setSelectedTimeslot] = useState<string>("");
    const [availableTimeslots, setAvailableTimeslots] = useState<string[]>([]);
    const [timeslotItems, setTimeslotItems] = useState<any[]>([]);
    const [loadingTimeslots, setLoadingTimeslots] = useState(false);

    const [form, setForm] = useState({
        issueStoreId: "",
        transferStoreId: "",
        ginDate: new Date().toISOString().split('T')[0],
        timeslot: "",
        remarks: "",
        items: [] as {
            palletRackId: any; itemId: string; selectedGrnId: string; grnItemId: string; qty: string; deliveryOrderSummaryCode?: string
        }[],
    });

    // Other state variables (keeping all existing ones)
    const [formError, setFormError] = useState<string | null>(null);
    const [viewGin, setViewGin] = useState<GIN | null>(null);
    const [editGin, setEditGin] = useState<GIN | null>(null);
    const [deleteGinId, setDeleteGinId] = useState<number | null>(null);
    const [printGin, setPrintGin] = useState<GIN | null>(null);
    const [approveError, setApproveError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isReverseStockDialogOpen, setIsReverseStockDialogOpen] = useState(false);
    const [reverseStockGin, setReverseStockGin] = useState<GIN | null>(null);
    const [reverseStockItems, setReverseStockItems] = useState<any[]>([]);
    const [reverseStockLoading, setReverseStockLoading] = useState(false);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");

    // Filtered and paginated data
    const filteredGins = useMemo(() => {
        return gins.filter((gin) => {
            const search = searchTerm.toLowerCase();
            return (
                gin.ginNumber.toLowerCase().includes(search) ||
                (gin.IssueStore?.name || gin.issueStore?.name || "").toLowerCase().includes(search) ||
                (gin.TransferStore?.name || gin.transferStore?.name || "").toLowerCase().includes(search) ||
                (gin.status || "").toLowerCase().includes(search)
            );
        });
    }, [gins, searchTerm]);

    const paginatedGins = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredGins.slice(startIndex, endIndex);
    }, [filteredGins, currentPage, itemsPerPage]);

    const getTotalPages = useMemo(() => {
        return Math.ceil(filteredGins.length / itemsPerPage);
    }, [filteredGins.length, itemsPerPage]);

    // Load initial data
    useEffect(() => {
        setLoading(true);
        Promise.all([ginApi.getAll(), storesApi.getAll<Store>(), itemsApi.getAll<Item>()])
            .then(([gins, stores, items]) => {
                setGins(gins);
                setStores(stores);
                setItems(items);
            })
            .finally(() => setLoading(false));
    }, []);

    // Check for "view" query param on mount to open view dialog
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const viewId = queryParams.get("view")
        if (viewId) {
            const loadAndOpen = async () => {
                try {
                    const gin = await ginApi.getById(parseInt(viewId))
                    setHandleViewGin(gin)
                } catch (err) {
                    console.error("Failed to load GIN from query param viewId:", viewId, err)
                }
            }
            loadAndOpen()
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load timeslots when date changes
    const loadTimeslots = async (date: string) => {
        if (!date) {
            setAvailableTimeslots([]);
            setTimeslotItems([]);
            return;
        }

        setLoadingTimeslots(true);
        try {
            const response = await deliveryOrdersApi.getSummaryItemsTimeslot({
                date: date,
                currentTime: new Date().toTimeString().slice(0, 5)
            }) as any;

            if (response.timeslotGroups && response.timeslotGroups.length > 0) {
                const timeslots = response.timeslotGroups.map((group: any) => group.timeslot);
                setAvailableTimeslots(timeslots);
            } else {
                setAvailableTimeslots([]);
            }
        } catch (error) {
            console.error('Failed to load timeslots:', error);
            setAvailableTimeslots([]);
        } finally {
            setLoadingTimeslots(false);
        }
    };

    // Load items for selected timeslot
    const loadTimeslotItems = async (date: string, timeslot: string) => {
        if (!date || !timeslot) {
            setTimeslotItems([]);
            setForm(prev => ({ ...prev, items: [] }));
            return;
        }

        setLoadingTimeslots(true);
        try {
            const response = await deliveryOrdersApi.getSummaryItemsTimeslot({
                date: date,
                currentTime: new Date().toTimeString().slice(0, 5)
            }) as any;

            if (response.timeslotGroups) {
                const selectedTimeslotGroup = response.timeslotGroups.find((group: any) => group.timeslot === timeslot);
                if (selectedTimeslotGroup && selectedTimeslotGroup.items) {
                    // Group items by itemId and GRN
                    const groupedItems = selectedTimeslotGroup.items.reduce((acc: any, item: any) => {
                        if (!item || !item.itemId) return acc;
                        const itemKey = String(item.itemId);
                        if (!acc[itemKey]) {
                            acc[itemKey] = {
                                item: item.item || {},
                                totalQty: 0,
                                grnGroups: {},
                                deliveryOrders: new Set()
                            };
                        }
                        acc[itemKey].totalQty += Number(item.qty || 0);

                        // Group by GRN
                        if (item.grn && item.grn.id) {
                            const grnKey = String(item.grn.id);
                            if (!acc[itemKey].grnGroups[grnKey]) {
                                acc[itemKey].grnGroups[grnKey] = {
                                    grn: item.grn,
                                    items: [],
                                    totalQty: 0
                                };
                            }
                            acc[itemKey].grnGroups[grnKey].items.push(item);
                            acc[itemKey].grnGroups[grnKey].totalQty += Number(item.qty || 0);
                        }

                        // Track delivery orders
                        if (item.deliveryOrderSummary) {
                            acc[itemKey].deliveryOrders.add(item.deliveryOrderSummary.code);
                        }

                        return acc;
                    }, {});

                    setTimeslotItems(Object.values(groupedItems));

                    // Initialize form items
                    const initialFormItems = Object.values(groupedItems).flatMap((group: any) =>
                        Object.entries(group.grnGroups).map(([grnId, grnGroup]: [string, any]) => ({
                            itemId: group.item.id.toString(),
                            selectedGrnId: grnId,
                            grnItemId: "",
                            palletRackId: "",
                            qty: grnGroup.totalQty.toString(),
                            remarks: "",
                            deliveryOrderSummaryCode: Array.from(group.deliveryOrders).join(", ")
                        }))
                    );

                    setForm(prevForm => ({
                        ...prevForm,
                        items: initialFormItems
                    }));
                } else {
                    setTimeslotItems([]);
                }
            }
        } catch (error) {
            console.error('Failed to load timeslot items:', error);
            setTimeslotItems([]);
        } finally {
            setLoadingTimeslots(false);
        }
    };

    // Load scheduled items for a store
    const loadScheduledItems = async (storeId: string) => {
        if (!storeId) {
            setScheduledItems([]);
            return;
        }

        try {
            // For now, we'll use the current date and call the proper API
            const today = new Date().toISOString().split('T')[0];
            const items = await itemsApi.getWithSchedule(today, storeId);
            setScheduledItems(items);
        } catch (error) {
            console.error('Failed to load scheduled items:', error);
            // Fallback to regular items if scheduled items not available
            try {
                const regularItems = await itemsApi.getAll<Item>();
                const fallbackItems: ItemWithSchedule[] = regularItems.map(item => ({
                    ...item,
                    stockQty: 0,
                    Category: {
                        id: item.categoryId,
                        name: 'Unknown Category',
                        code: 'UNK'
                    },
                    scheduledGrnId: 1,
                    scheduledGrn: {
                        id: 1,
                        grnNumber: `GRN-${item.id}`
                    },
                    grnItemList: [
                        {
                            id: 1,
                            grnId: 1,
                            itemId: item.id,
                            grnQty: 100,
                            availableQty: 100,
                            weight: item.weight,
                            palletRackId: 1,
                            PalletRack: {
                                id: 1,
                                code: `Rack-A${item.id}`,
                                availableQty: 100,
                                weight: item.weight,
                                location: 1
                            },
                            grn: {
                                id: 1,
                                grnNumber: `GRN-001-${item.id}`,
                                grnDate: new Date().toISOString().split('T')[0],
                                status: 'Active'
                            }
                        }
                    ]
                }));
                setScheduledItems(fallbackItems);
            } catch (fallbackError) {
                console.error('Failed to load fallback items:', fallbackError);
                setScheduledItems([]);
            }
        }
    };

    // Load timeslots when date changes
    useEffect(() => {
        if (form.ginDate) {
            loadTimeslots(form.ginDate);
        }
    }, [form.ginDate]);

    // Load timeslot items when timeslot changes
    useEffect(() => {
        if (form.ginDate && form.timeslot) {
            loadTimeslotItems(form.ginDate, form.timeslot);
        }
    }, [form.ginDate, form.timeslot]);

    // Form handling functions
    const handleFormChange = (field: string, value: string) => {
        setForm((f) => ({ ...f, [field]: value }));

        // Load scheduled items when issue store changes
        if (field === "issueStoreId") {
            loadScheduledItems(value);
        }
    };

    const handleAddItem = () => {
        setForm((f) => ({
            ...f,
            items: [...f.items, { palletRackId: "", itemId: "", selectedGrnId: "", grnItemId: "", qty: "", deliveryOrderSummaryCode: "" }],
        }));
    };

    const handleRemoveItem = (index: number) => {
        setForm((f) => ({
            ...f,
            items: f.items.filter((_, i) => i !== index),
        }));
    };

    const handleItemChange = (index: number, field: string, value: string) => {
        setForm((f) => {
            let updatedItems = [...f.items];
            if (field === "grnItemId") {
                // When selecting a rack/position, also set the palletRackId
                const selectedItem = scheduledItems.find(si => String(si.id) === updatedItems[index].itemId);
                const selectedGrnItem = selectedItem?.grnItemList.find(gi => String(gi.id) === value);

                updatedItems[index] = {
                    ...updatedItems[index],
                    grnItemId: value,
                    palletRackId: selectedGrnItem?.palletRackId?.toString() || ""
                };
            } else {
                updatedItems[index] = { ...updatedItems[index], [field]: value };
            }
            return { ...f, items: updatedItems };
        });
    };

    const handleRackQuantityChange = (itemId: string, rackId: string, qty: number) => {
        setSelectedQuantities(prev => ({
            ...prev,
            [`${itemId}-${rackId}`]: qty
        }));

        // Update form items based on selected quantities
        const updatedItems = Object.entries(selectedQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([key, qty]) => {
                const [itemId, rackId] = key.split('-');
                const scheduledItem = scheduledItems.find(si => String(si.id) === itemId);
                const grnItem = scheduledItem?.grnItemList.find(gi => String(gi.id) === rackId);

                if (!scheduledItem || !grnItem) return null;

                return {
                    itemId: itemId,
                    selectedGrnId: grnItem.grn.id.toString(),
                    grnItemId: rackId,
                    qty: qty.toString(),
                    palletRackId: grnItem.palletRackId.toString(),
                    remarks: "",
                    deliveryOrderSummaryCode: ""  // This will be filled from timeslot items
                };
            })
            .filter(Boolean);

        setForm(prev => ({
            ...prev,
            items: updatedItems as any[]
        }));
    };

    // Submit handler
    const handleSubmit = async () => {
        setFormError(null);

        // Basic form validation
        if (!form.issueStoreId || !form.transferStoreId || !form.ginDate || form.items.length === 0) {
            setFormError("All fields including timeslot and at least one item are required.");
            return;
        }

        // Validate items
        let hasValidationError = false;
        const validationErrors: string[] = [];

        form.items.forEach((item, index) => {
            if (!item.itemId) {
                validationErrors.push(`Item ${index + 1}: Please select an item`);
                hasValidationError = true;
            }
            if (!item.selectedGrnId) {
                validationErrors.push(`Item ${index + 1}: Please select a GRN`);
                hasValidationError = true;
            }
            if (!item.grnItemId) {
                validationErrors.push(`Item ${index + 1}: Please select a specific rack/position`);
                hasValidationError = true;
            }
            if (!item.qty || Number(item.qty) <= 0) {
                validationErrors.push(`Item ${index + 1}: Please enter a valid quantity`);
                hasValidationError = true;
            }
        });

        if (hasValidationError) {
            setFormError(validationErrors.join("; "));
            return;
        }

        setLoading(true);
        try {
            await ginApi.create({
                issueStoreId: parseInt(form.issueStoreId),
                transferStoreId: parseInt(form.transferStoreId),
                ginDate: form.ginDate,
                remarks: form.remarks,
                items: form.items.map((item) => {
                    // Find the selected GRN from scheduledItems
                    const scheduledItem = scheduledItems.find(si => String(si.id) === item.itemId);
                    const grnItem = scheduledItem?.grnItemList.find(gi => String(gi.id) === item.grnItemId);
                    return {
                        itemId: parseInt(item.itemId),
                        grnItemId: parseInt(item.grnItemId),
                        grnId: grnItem ? grnItem.grnId : (item.selectedGrnId ? parseInt(item.selectedGrnId) : undefined),
                        qty: parseInt(item.qty),
                        palletRackId: item.palletRackId ? parseInt(item.palletRackId) : undefined,
                        item: scheduledItem ? {
                            id: scheduledItem.id,
                            name: scheduledItem.name,
                            color: scheduledItem.color,
                            country: scheduledItem.country,
                            weight: scheduledItem.weight,
                            categoryId: scheduledItem.categoryId,
                        } : undefined,
                    };
                }),
            });
            setOpen(false);
            setForm({
                issueStoreId: "",
                transferStoreId: "",
                ginDate: new Date().toISOString().split('T')[0],
                timeslot: "",
                remarks: "",
                items: []
            });
            setScheduledItems([]);
            setTimeslotItems([]);
            setAvailableTimeslots([]);
            setSelectedTimeslot("");
            setGins(await ginApi.getAll());
        } catch (e: any) {
            setFormError(e.message || "Failed to create GIN");
        } finally {
            setLoading(false);
        }
    };

    // Handler for viewing GIN with reverse quantity calculation
    const setHandleViewGin = (gin: GIN) => {
        // Create a new GIN object with calculated reverseQty for each item
        const ginWithReverseQty = {
            ...gin,
            items: (gin.items || []).map(item => ({
                ...item,
                reverseQty: Math.max(0, (item.qty || 0) - (item.dispatchedQty || 0))
            }))
        };
        setViewGin(ginWithReverseQty);
        setIsViewDialogOpen(true);
    };

    const handleReverseStock = async (gin: GIN) => {
        try {
            const response = await ginApi.getById(gin.id!);
            setViewGin(response);
            setIsViewDialogOpen(true);
        } catch (error) {
            console.error('Failed to fetch GIN details:', error);
        }
    };

    const handlePrintGin = (gin: GIN) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFontSize(20);
        doc.text('Goods Issue Note', 20, 30);

        // Basic details
        doc.setFontSize(12);
        doc.text(`GIN Number: ${gin.ginNumber}`, 20, 50);
        doc.text(`Date: ${format(new Date(gin.ginDate), 'dd/MM/yyyy')}`, 20, 60);
        doc.text(`Issue Store: ${gin.issueStore?.name || gin.IssueStore?.name}`, 20, 70);
        doc.text(`Transfer Store: ${gin.transferStore?.name || gin.TransferStore?.name}`, 20, 80);
        doc.text(`Status: ${gin.status}`, 20, 90);

        const fileName = `GIN_${gin.ginNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`;
        doc.save(fileName);
    };

    // Pagination Controls Component
    const PaginationControls = () => {
        const totalPages = getTotalPages;

        if (totalPages <= 1) return null;

        return (
            <div className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Show</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                        <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-700">entries</span>
                </div>

                <div className="flex items-center space-x-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <ERPLayout>
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow-sm border mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Goods Issue Notes Management</h2>
                        <p className="text-gray-600">Create and manage goods issue notes with timeslot integration</p>
                    </div>
                    <Button
                        onClick={() => setOpen(true)}
                        className=" text-white shadow-lg"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New GIN
                    </Button>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Search by GIN number, issue store, transfer store, or status..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Filters
                    </Button>
                </div>
            </div>

            {/* GIN Table */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="font-semibold">GIN Number</TableHead>
                                <TableHead className="font-semibold">Date</TableHead>
                                <TableHead className="font-semibold">Issue Store</TableHead>
                                <TableHead className="font-semibold">Transfer Store</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold">Items</TableHead>
                                <TableHead className="font-semibold text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                    </TableRow>
                                ))
                            ) : paginatedGins.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <Package className="h-12 w-12 mb-4 text-gray-300" />
                                            <p className="text-lg font-medium mb-2">No GINs found</p>
                                            <p className="text-sm">Create your first GIN to get started</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedGins.map((gin) => (
                                    <TableRow key={gin.id} className="hover:bg-gray-50">
                                        <TableCell className="font-medium">{gin.ginNumber}</TableCell>
                                        <TableCell>{new Date(gin.ginDate).toLocaleDateString()}</TableCell>
                                        <TableCell>{gin.IssueStore?.name || gin.issueStore?.name}</TableCell>
                                        <TableCell>{gin.TransferStore?.name || gin.transferStore?.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={gin.status === "Approved" ? "default" : "secondary"}>
                                                {gin.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{gin.items ? gin.items.length : 0}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setHandleViewGin(gin)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePrintGin(gin)}
                                                    className="text-green-600 hover:text-green-800"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                {/* <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleReverseStock(gin)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <ArrowLeft className="h-4 w-4" />
                                                </Button> */}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <PaginationControls />
            </div>

            {/* Create GIN Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Create New Goods Issue Note</DialogTitle>
                        <DialogDescription>
                            Fill in the details below to create a new GIN with timeslot integration
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        {/* Basic Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="issueStore" className="text-sm font-medium">Issue Store *</Label>
                                <Select
                                    value={form.issueStoreId}
                                    onValueChange={(value) => handleFormChange("issueStoreId", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select issue store" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stores.map((store) => (
                                            <SelectItem key={store.id} value={store.id.toString()}>
                                                {store.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="transferStore" className="text-sm font-medium">Transfer Store *</Label>
                                <Select
                                    value={form.transferStoreId}
                                    onValueChange={(value) => handleFormChange("transferStoreId", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select transfer store" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stores.map((store) => (
                                            <SelectItem key={store.id} value={store.id.toString()}>
                                                {store.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ginDate" className="text-sm font-medium">GIN Date *</Label>
                                <Input
                                    id="ginDate"
                                    type="date"
                                    value={form.ginDate}
                                    onChange={(e) => handleFormChange("ginDate", e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="timeslot" className="text-sm font-medium">Timeslot *</Label>
                                <Select
                                    value={form.timeslot}
                                    onValueChange={(value) => {
                                        handleFormChange("timeslot", value);
                                        setSelectedTimeslot(value);
                                    }}
                                    disabled={!form.ginDate || loadingTimeslots}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            loadingTimeslots ? "Loading timeslots..." :
                                                !form.ginDate ? "Select date first" :
                                                    "Select timeslot"
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTimeslots.map((slot) => (
                                            <SelectItem key={slot} value={slot}>
                                                {slot}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="remarks" className="text-sm font-medium">Remarks</Label>
                            <Textarea
                                id="remarks"
                                placeholder="Enter any additional remarks..."
                                value={form.remarks}
                                onChange={(e) => handleFormChange("remarks", e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* Items Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-lg font-medium">Items *</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleAddItem}
                                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Item
                                </Button>
                            </div>

                            {form.items.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>No items added yet</p>
                                    <p className="text-sm">Click "Add Item" to start adding items to this GIN</p>
                                </div>
                            ) : (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {/* <TableHead className="w-[50px]">#</TableHead> */}
                                                <TableHead>Item</TableHead>
                                                <TableHead>GRN</TableHead>
                                                <TableHead>Rack/Position</TableHead>
                                                <TableHead className="w-[120px]">Quantity</TableHead>
                                                <TableHead className="w-[80px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {form.items.map((item, index) => {
                                                // Get available GRNs for selected item
                                                const availableGrns = item.itemId ?
                                                    scheduledItems.find(si => String(si.id) === item.itemId)?.grnItemList
                                                        .map(gi => gi.grn)
                                                        .filter((grn, idx, arr) => arr.findIndex(g => g.id === grn.id) === idx) || []
                                                    : [];

                                                // Get available racks for selected GRN
                                                const availableRacks = item.selectedGrnId ?
                                                    scheduledItems.find(si => String(si.id) === item.itemId)?.grnItemList
                                                        .filter(gi => String(gi.grn.id) === item.selectedGrnId) || []
                                                    : [];

                                                return (
                                                    <TableRow key={index}>
                                                        {/* <TableCell className="font-medium">{index + 1}</TableCell> */}
                                                        <TableCell>
                                                            <Select
                                                                value={item.itemId}
                                                                onValueChange={(value) => handleItemChange(index, "itemId", value)}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select item" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {scheduledItems.map((itm) => (
                                                                        <SelectItem key={itm.id} value={itm.id.toString()}>
                                                                            {itm.color + ' ' + itm.name + ' ' + itm.country + ' (' + itm.weight + 'kg)'}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={item.selectedGrnId}
                                                                onValueChange={(value) => handleItemChange(index, "selectedGrnId", value)}
                                                                disabled={!item.itemId}
                                                            >
                                                                <SelectTrigger className="w-[150px]">
                                                                    <SelectValue placeholder="Select GRN" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {availableGrns.map((grn: any) => (
                                                                        <SelectItem key={grn.id} value={grn.id.toString()}>
                                                                            {grn.grnNumber}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={item.grnItemId}
                                                                onValueChange={(value) => handleItemChange(index, "grnItemId", value)}
                                                                disabled={!item.selectedGrnId}
                                                            >
                                                                <SelectTrigger className="w-[150px]">
                                                                    <SelectValue placeholder="Select position" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {availableRacks.map((grnItem: any) => (
                                                                        <SelectItem key={grnItem.id} value={grnItem.id.toString()}>
                                                                            {grnItem.PalletRack?.code} - Qty: {grnItem.PalletRack?.availableQty}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                placeholder="Qty"
                                                                value={item.qty}
                                                                onChange={(e) => handleItemChange(index, "qty", e.target.value)}
                                                                min="1"
                                                                className="w-[100px]"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {form.items.length > 1 && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleRemoveItem(index)}
                                                                    className="text-red-600 hover:text-red-700"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>

                        {/* Error Display */}
                        {formError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Validation Error</AlertTitle>
                                <AlertDescription>{formError}</AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create GIN"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View GIN Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
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
                                    <Badge variant={viewGin.status === 'Approved' ? 'default' : 'secondary'}>
                                        {viewGin.status}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Items</div>
                                    <div className="font-semibold">{viewGin.items?.length || 0}</div>
                                </div>
                            </div>

                            {/* <div>
                                <Label className="text-sm font-medium text-gray-600 mb-3 block">Items</Label>
                                <div className="space-y-2">
                                    {viewGin.items && viewGin.items.length > 0 ? (
                                        viewGin.items.map((item, index) => (
                                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                                <span>{item.item?.name || 'Unknown Item'}</span>
                                                <span className="font-medium">Qty: {item.qty}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500">No items found</p>
                                    )}
                                </div>
                            </div> */}
                            {viewGin.status === 'Pending' && (
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
                                                    } catch (e) {
                                                        setApproveError(e.message || 'Failed to approve GIN');
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
                            {/* Items Section */}
                            {viewGin.items && viewGin.items.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold mb-4">Items</h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item</TableHead>
                                                <TableHead>Quantity</TableHead>
                                                <TableHead>GRN</TableHead>
                                                <TableHead>Pallet Rack</TableHead>
                                                {viewGin.status === 'Approved' && <TableHead>Reverse Quantity</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {viewGin.items.map((item: any, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.item?.color + ' ' + item.item?.name + ' ' + item.item?.country + ' (' + item.item?.weight + 'kg)'}</TableCell>
                                                    <TableCell>{item.qty} boxes</TableCell>
                                                    <TableCell>{item.grn?.grnNumber || '-'}</TableCell>
                                                    <TableCell>{item.palletRack?.code || '-'}</TableCell>
                                                    {viewGin.status === 'Approved' && (
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                placeholder="Qty to reverse"
                                                                min="0"
                                                                disabled={item.reverseQty === 0}
                                                                value={item.reverseQty}
                                                                max={item.reverseQty}
                                                                onChange={(e) => {
                                                                    const items = [...viewGin.items];
                                                                    items[index] = {
                                                                        ...items[index],
                                                                        reverseQty: parseInt(e.target.value) <= items[index].qty - items[index].dispatchedQty ? parseInt(e.target.value) : items[index].qty - items[index].dispatchedQty
                                                                    };
                                                                    setViewGin({ ...viewGin, items });
                                                                }}
                                                                className="w-[100px]"
                                                            />
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {/* Reverse button for approved GINs */}
                                    {viewGin.status === 'Approved' && (
                                        <div className="flex justify-end gap-4 pt-4">
                                            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                                                Close
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                disabled={viewGin.items.every((item: any) => !item.reverseQty || item.reverseQty <= 0) || actionLoading}
                                                onClick={async () => {
                                                    setActionLoading(true);
                                                    try {
                                                        // Filter items with reverseQty
                                                        const itemsToReverse = viewGin.items
                                                            .filter((item: any) => item.reverseQty > 0)
                                                            .map((item: any) => ({
                                                                ginItemId: item.ginItemId || item.id,
                                                                reverseQty: item.reverseQty,
                                                                palletRackId: item.palletRackId
                                                            }));

                                                        if (itemsToReverse.length === 0) {
                                                            throw new Error('Please specify quantity to reverse for at least one item');
                                                        }

                                                        await ginApi.reverseStock(viewGin.id!, {
                                                            ginId: viewGin.id!,
                                                            items: itemsToReverse
                                                        });

                                                        setIsViewDialogOpen(false);
                                                        const updatedGins = await ginApi.getAll();
                                                        setGins(updatedGins);
                                                    } catch (e: any) {
                                                        alert(e.message || 'Failed to reverse GIN');
                                                    } finally {
                                                        setActionLoading(false);
                                                    }
                                                }}
                                            // disabled={actionLoading}
                                            >
                                                {actionLoading ? (
                                                    <>
                                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                                        Reversing...
                                                    </>
                                                ) : 'Reverse Selected Items'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-12">
                            <span className="text-muted-foreground">No GIN data available</span>
                        </div>
                    )}
                    {/* <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter> */}
                </DialogContent>
            </Dialog>
        </ERPLayout>
    );
}
