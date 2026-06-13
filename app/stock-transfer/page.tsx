"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ginApi, storesApi, itemsApi, coldRoomsApi, palletRacksApi, palletsApi, GIN, GINItem, Store, Item, ItemWithSchedule, deliveryOrderSummaryItemsApi } from "@/lib/api";
import { toastr } from "@/lib/toastr";
import { format } from "date-fns";
import { Eye, Edit, Trash2, Printer, Snowflake, Package, ArrowRight, Box } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import jsPDF from "jspdf";
import { ERPLayout } from "@/components/layouts/erp-layout";

// Types for enhanced stock transfer
interface MergedTransferItem {
    itemId: number
    itemName: string
    itemColor: string
    itemCountry: string
    totalQuantity: number
    availableQuantity: number
    selectedColdRoom?: string
    selectedRack?: string
    selectedGrnId?: string
    grnNumbers: string[]
    doNumbers: string[]
    summaryIds: number[]
    items: any[]
    availableGrns: Array<{
        grnId: number
        grnNumber: string
        availableQty: number
        summaryId: number
    }>
}

// Updated interface to handle new API response structure
interface DeliveryOrderSummaryApiResponse {
    filter: {
        summaryDate: string
    }
    totalItems: number
    originalSummaryItems: number
    additionalDeliveryOrderItems: number
    totalPages: number
    currentPage: number
    items: DeliveryOrderSummaryItemExtended[]
    summary: {
        existingSummaryItems: number
        newDeliveryOrderItems: number
        scheduledOrdersWithoutRoutes: number
        scheduledOrdersWithIsDeliveryFalse: number
    }
}

interface DeliveryOrderSummaryItemExtended {
    id: number | null
    summaryDate: string
    routeId: number | null
    deliveryOrderId: number
    deliveryOrderItemId: number
    itemId: number
    grnId: number | null
    releaseStoreId: number | null
    qty: number
    isReleased: boolean
    isReady?: boolean
    isActive: boolean
    createdAt: string
    createdBy: number
    updatedAt: string
    updatedBy: number
    isPseudoSummaryItem?: boolean
    needsGrnAssignment?: boolean
    salesOrderInfo?: {
        id: number
        isDelivery: boolean
    }
    DeliveryOrder: {
        id: number
        doNumber: string
        status?: string
        routeId?: number | null
    }
    DeliveryOrderItem: {
        id: number
        qty: number
    }
    Item: {
        id: number
        name: string
        unit: string
        categoryId: number
        color: string
        country: string
    }
    GRN: {
        id: number
        grnNumber: string
    } | null
    Route: {
        id: number
        routeName: string
    } | null
    ReleaseStore: any | null
}

interface DeliveryOrderSummaryItem {
    id: number
    summaryDate: string
    routeId: number
    deliveryOrderId: number
    deliveryOrderItemId: number
    itemId: number
    grnId: number
    releaseStoreId: number | null
    qty: number
    isReleased: boolean
    isActive: boolean
    createdAt: string
    createdBy: number
    updatedAt: string
    updatedBy: number
    DeliveryOrder: {
        id: number
        doNumber: string
    }
    DeliveryOrderItem: {
        id: number
        qty: number
    }
    Item: {
        id: number
        name: string
        unit: string
        categoryId: number
        color: string
        country: string
    }
    GRN: {
        id: number
        grnNumber: string
    }
    Route: {
        id: number
        routeName: string
    }
    ReleaseStore: {
        id: number
        name: string
    } | null
}

export default function StockTransferPage() {
    const [gins, setGins] = useState<GIN[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [stores, setStores] = useState<Store[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [scheduledItems, setScheduledItems] = useState<DeliveryOrderSummaryItemExtended[]>([]);
    const [form, setForm] = useState({
        issueStoreId: "",
        transferStoreId: "",
        ginDate: new Date().toISOString().split('T')[0],
        remarks: "",
        items: [] as {
            summaryId?: number;
            itemId: string;
            qty: string;
            remarks: string;
            selectedGrnId?: string;
            coldRoomId?: number;
            palletRackId?: string;
        }[],
    });
    const [formError, setFormError] = useState<string | null>(null);

    // New state for cold storage functionality
    const [coldRooms, setColdRooms] = useState<any[]>([])
    const [palletRacks, setPalletRacks] = useState<any[]>([])
    const [pallets, setPallets] = useState<any[]>([])
    const [mergedItems, setMergedItems] = useState<MergedTransferItem[]>([])
    const [commonTransferStore, setCommonTransferStore] = useState("")
    const [transferDialog, setTransferDialog] = useState(false)
    const [viewDialog, setViewDialog] = useState(false)
    const [editDialog, setEditDialog] = useState(false)
    const [selectedGin, setSelectedGin] = useState<GIN | null>(null)

    useEffect(() => {
        setLoading(true);
        Promise.all([
            ginApi.getAll(),
            storesApi.getAll<Store>(),
            itemsApi.getAll<Item>(),
            coldRoomsApi.getAll(),
            palletRacksApi.getAll(),
            palletsApi.getAll()
        ])
            .then(([gins, stores, items, coldRoomsData, racksData, palletsData]) => {
                setGins(gins);
                setStores(stores);
                setItems(items);
                setColdRooms(coldRoomsData);
                setPalletRacks(racksData);
                setPallets(palletsData);
            })
            .finally(() => setLoading(false));
    }, []);

    // Merge delivery order items by item type
    const mergeDeliveryOrderItems = (items: any[]): MergedTransferItem[] => {
        const itemMap = new Map<number, MergedTransferItem>();

        console.log('Starting merge process with items:', items);

        items.forEach(item => {
            // Ensure we have all required data
            if (!item.itemId || !item.Item || !item.grnId || !item.GRN || !item.DeliveryOrder) {
                console.warn('Skipping incomplete item:', item);
                return;
            }

            const key = item.itemId;
            if (itemMap.has(key)) {
                const existing = itemMap.get(key)!;
                existing.totalQuantity += item.qty;
                existing.availableQuantity += item.qty;
                existing.grnNumbers = [...new Set([...existing.grnNumbers, item.GRN.grnNumber])];
                existing.doNumbers = [...new Set([...existing.doNumbers, item.DeliveryOrder.doNumber])];
                existing.summaryIds.push(item.id);
                existing.items.push(item);

                // Add GRN to available GRNs if not already present
                const existingGrn = existing.availableGrns.find(grn => grn.grnId === item.grnId);
                if (existingGrn) {
                    existingGrn.availableQty += item.qty;
                } else {
                    existing.availableGrns.push({
                        grnId: item.grnId,
                        grnNumber: item.GRN.grnNumber,
                        availableQty: item.qty,
                        summaryId: item.id
                    });
                }
            } else {
                itemMap.set(key, {
                    itemId: item.itemId,
                    itemName: item.Item.name,
                    itemColor: item.Item.color || '',
                    itemCountry: item.Item.country || '',
                    totalQuantity: item.qty,
                    availableQuantity: item.qty,
                    grnNumbers: [item.GRN.grnNumber],
                    doNumbers: [item.DeliveryOrder.doNumber],
                    summaryIds: [item.id],
                    items: [item],
                    availableGrns: [{
                        grnId: item.grnId,
                        grnNumber: item.GRN.grnNumber,
                        availableQty: item.qty,
                        summaryId: item.id
                    }]
                });
            }
        });

        const result = Array.from(itemMap.values());
        console.log('Merge result:', result);
        return result;
    };

    // Load scheduled items when store changes
    const loadScheduledItems = async (storeId: string, ginDate: string) => {
        if (!storeId || ginDate === "") {
            setScheduledItems([]);
            setMergedItems([]);
            return;
        }

        try {
            const response = await deliveryOrderSummaryItemsApi.getByFilter({
                summaryDate: ginDate,
            });

            console.log('API Response:', response);

            // Handle the new response structure
            const data = response as any;
            const allItems = data.items || [];

            // Separate items into categories
            const itemsWithGrn = allItems.filter((item: any) =>
                item.id !== null &&
                item.grnId !== null &&
                item.GRN !== null &&
                !item.isPseudoSummaryItem &&
                item.GRN.grnNumber
            );

            const itemsWithoutGrn = allItems.filter((item: any) =>
                item.isPseudoSummaryItem === true ||
                item.grnId === null ||
                item.GRN === null
            );

            console.log(`Found ${allItems.length} total items:`);
            console.log(`- ${itemsWithGrn.length} items with GRN assignments (available for transfer)`);
            console.log(`- ${itemsWithoutGrn.length} items without GRN assignments (need GRN assignment first)`);
            console.log('Items with GRN:', itemsWithGrn);
            console.log('Items without GRN:', itemsWithoutGrn);

            // Show toast notification if there are items without GRN
            if (itemsWithoutGrn.length > 0) {
                toastr.info(
                    `Found ${itemsWithoutGrn.length} delivery order items that need GRN assignments before they can be transferred.`,
                    {
                        title: "GRN Assignment Required",
                        duration: 6000
                    }
                );
            }

            setScheduledItems(itemsWithGrn);

            // Merge items by type after loading
            if (itemsWithGrn && itemsWithGrn.length > 0) {
                const merged = mergeDeliveryOrderItems(itemsWithGrn);
                setMergedItems(merged);
                console.log('Merged items:', merged);

                toastr.success(
                    `Loaded ${itemsWithGrn.length} items available for transfer from ${merged.length} different item types.`,
                    { duration: 4000 }
                );
            } else {
                setMergedItems([]);
                console.log('No valid items found for merging');

                if (allItems.length > 0) {
                    toastr.warning(
                        "All delivery order items for this date require GRN assignments before transfer.",
                        { duration: 5000 }
                    );
                }
            }
        } catch (error) {
            console.error('Failed to load scheduled items:', error);
            setScheduledItems([]);
            setMergedItems([]);
            toastr.error("Failed to load scheduled items", { duration: 4000 });
        }
    };

    const handleFormChange = (field: string, value: string) => {
        setForm((f) => ({ ...f, [field]: value }));
        if (field === "issueStoreId") {
            // loadScheduledItems(value);
        }
        if (field === "ginDate") {
            handleInitiateColdStorageTransfer(value);
        }
    };

    const handleColdRoomSelect = (itemId: number, coldRoomId: string) => {
        setMergedItems(prev => prev.map(item =>
            item.itemId === itemId
                ? { ...item, selectedColdRoom: coldRoomId, selectedRack: "" }
                : item
        ));
    };

    const handleRackSelect = (itemId: number, rackId: string) => {
        setMergedItems(prev => prev.map(item =>
            item.itemId === itemId
                ? { ...item, selectedRack: rackId }
                : item
        ));
    };

    const handleGrnSelect = (itemId: number, grnId: string) => {
        setMergedItems(prev => prev.map(item =>
            item.itemId === itemId
                ? { ...item, selectedGrnId: grnId }
                : item
        ));
    };

    const getRacksForColdRoom = (coldRoomId: number) => {
        return palletRacks.filter(rack => rack.coldRoomId === coldRoomId);
    };

    // Convert merged items to individual GRN records for selection
    const getIndividualGrnRecords = (mergedItems: MergedTransferItem[]) => {
        const records: Array<{
            itemId: number;
            itemName: string;
            itemColor: string;
            itemCountry: string;
            grnId: number;
            grnNumber: string;
            availableQty: number;
            summaryId: number;
            selectedColdRoom?: string;
            selectedRack?: string;
            doNumbers: string[];
        }> = [];

        mergedItems.forEach(item => {
            item.availableGrns.forEach(grn => {
                records.push({
                    itemId: item.itemId,
                    itemName: item.itemName,
                    itemColor: item.itemColor,
                    itemCountry: item.itemCountry,
                    grnId: grn.grnId,
                    grnNumber: grn.grnNumber,
                    availableQty: grn.availableQty,
                    summaryId: grn.summaryId,
                    doNumbers: item.doNumbers
                });
            });
        });

        return records;
    };

    const handleGrnRecordColdRoomSelect = (recordIndex: number, coldRoomId: string) => {
        setMergedItems(prev => {
            const grnRecords = getIndividualGrnRecords(prev);
            const record = grnRecords[recordIndex];

            return prev.map(item =>
                item.itemId === record.itemId
                    ? {
                        ...item,
                        selectedColdRoom: coldRoomId,
                        selectedRack: "",
                        selectedGrnId: String(record.grnId)
                    }
                    : item
            );
        });
    };

    const handleGrnRecordRackSelect = (recordIndex: number, rackId: string) => {
        setMergedItems(prev => {
            const grnRecords = getIndividualGrnRecords(prev);
            const record = grnRecords[recordIndex];

            return prev.map(item =>
                item.itemId === record.itemId
                    ? { ...item, selectedRack: rackId }
                    : item
            );
        });
    };

    const handleCloseTransferDialog = () => {
        setTransferDialog(false);
        setMergedItems([]);
        setCommonTransferStore("");
        setFormError(null);
        setForm({
            issueStoreId: "",
            transferStoreId: "",
            ginDate: new Date().toISOString().split('T')[0],
            remarks: "",
            items: []
        });
    };

    const handleInitiateColdStorageTransfer = (ginDate: string) => {
        loadScheduledItems(form.issueStoreId, ginDate);
    };

    const handleViewGin = (gin: GIN) => {
        setSelectedGin(gin);
        setViewDialog(true);
    };

    const handleEditGin = (gin: GIN) => {
        setSelectedGin(gin);
        setForm({
            issueStoreId: String(gin.issueStoreId),
            transferStoreId: String(gin.transferStoreId),
            ginDate: gin.ginDate,
            remarks: gin.remarks || "",
            items: gin.items?.map(item => ({
                summaryId: item.summaryId,
                itemId: String(item.itemId),
                qty: String(item.qty),
                remarks: item.remarks || "",
                selectedGrnId: String(item.grnId),
                coldRoomId: item.coldRoomId,
                palletRackId: item.palletRackId ? String(item.palletRackId) : ""
            })) || []
        });

        // Load scheduled items for the issue store and date to populate GRN options
        if (gin.issueStoreId && gin.ginDate) {
            loadScheduledItems(String(gin.issueStoreId), gin.ginDate);
        }

        setEditDialog(true);
    };

    const handleEditFormChange = (field: string, value: string) => {
        setForm((f) => ({ ...f, [field]: value }));
    };

    const handleUpdateGin = async () => {
        setFormError(null);

        if (!selectedGin || form.items.length === 0) {
            setFormError("At least one item is required.");
            return;
        }

        try {
            setLoading(true);
            await ginApi.update(selectedGin.id!, {
                issueStoreId: Number(form.issueStoreId),
                transferStoreId: Number(form.transferStoreId),
                ginDate: form.ginDate,
                remarks: form.remarks,
                items: form.items.map((item) => ({
                    itemId: Number(item.itemId),
                    qty: Number(item.qty),
                    remarks: item.remarks,
                    grnId: Number(item.selectedGrnId),
                    coldRoomId: item.coldRoomId ? Number(item.coldRoomId) : undefined,
                    palletRackId: item.palletRackId ? Number(item.palletRackId) : undefined,
                    summaryId: item.summaryId,
                    item: undefined,
                })),
            });

            toastr.success(`GIN ${selectedGin.ginNumber} updated successfully!`);

            setEditDialog(false);
            setSelectedGin(null);
            setForm({
                issueStoreId: "",
                transferStoreId: "",
                ginDate: new Date().toISOString().split('T')[0],
                remarks: "",
                items: []
            });
            setGins(await ginApi.getAll());
        } catch (e: any) {
            const errorMessage = e.response?.data?.error || e.message || "Failed to update GIN";
            setFormError(errorMessage);
            toastr.error(errorMessage, {
                title: "Update Failed",
                duration: 8000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmColdStorageTransfer = async () => {
        if (!commonTransferStore) {
            setFormError("Please select a transfer store.");
            return;
        }

        const itemsWithColdStorage = mergedItems.filter(item =>
            item.selectedColdRoom && item.selectedRack && item.selectedGrnId
        );

        if (itemsWithColdStorage.length === 0) {
            setFormError("Please select cold room, rack, and GRN source for at least one item.");
            return;
        }

        try {
            setLoading(true);

            // Create separate transfer items for each selected GRN
            const transferItems: any[] = [];

            itemsWithColdStorage.forEach(item => {
                // Find the specific GRN record that was selected
                const selectedGrn = item.availableGrns.find(grn => String(grn.grnId) === item.selectedGrnId);

                if (selectedGrn) {
                    // Find all summary items that belong to this specific GRN
                    const grnSummaryItems = item.items.filter(summaryItem =>
                        summaryItem.grnId === selectedGrn.grnId
                    );

                    console.log(`Processing item ${item.itemId} with GRN ${selectedGrn.grnId}:`, {
                        selectedGrn,
                        grnSummaryItems,
                        totalSummaryItems: grnSummaryItems.length
                    });

                    // Create separate transfer item for each summary record of this GRN
                    grnSummaryItems.forEach(summaryItem => {
                        const transferItem = {
                            itemId: Number(item.itemId),
                            qty: Number(summaryItem.qty), // Use individual summary item quantity
                            coldRoomId: item.selectedColdRoom ? Number(item.selectedColdRoom) : undefined,
                            palletRackId: item.selectedRack ? Number(item.selectedRack) : undefined,
                            remarks: `Cold Room: ${coldRooms.find(cr => String(cr.id) === item.selectedColdRoom)?.name}, Rack: ${palletRacks.find(pr => String(pr.id) === item.selectedRack)?.code}`,
                            grnId: Number(selectedGrn.grnId),
                            summaryId: summaryItem.id, // Individual summaryId for each record
                            item: undefined
                        };

                        console.log('Adding transfer item:', transferItem);
                        transferItems.push(transferItem);
                    });
                }
            });

            console.log('Final transfer items to be sent:', transferItems);
            console.log(`Total items to transfer: ${transferItems.length}`);

            if (transferItems.length === 0) {
                throw new Error('No valid transfer items found. Please ensure GRN summary data is available.');
            }

            await ginApi.create({
                issueStoreId: Number(form.issueStoreId),
                transferStoreId: Number(commonTransferStore),
                ginDate: form.ginDate,
                remarks: `Cold Storage Transfer - ${form.remarks}`,
                items: transferItems,
            });

            toastr.success(`Cold storage transfer created successfully with ${transferItems.length} individual GRN items!`);

            handleCloseTransferDialog();
            setGins(await ginApi.getAll());
        } catch (e: any) {
            const errorMessage = e.response?.data?.error || e.message || "Failed to create cold storage transfer";
            setFormError(errorMessage);
            toastr.error(errorMessage, {
                title: "Transfer Creation Failed",
                duration: 8000
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ERPLayout>
            <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Stock Transfer</h1>
                        <p className="text-muted-foreground">Manage stock transfers between stores and cold storage</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setTransferDialog(true)}
                            className="flex items-center gap-2"
                        >
                            <Package className="h-4 w-4" />
                            Cold Storage Transfer
                        </Button>

                    </div>
                </div>

                {/* Cold Storage Transfer Dialog */}
                <Dialog open={transferDialog} onOpenChange={handleCloseTransferDialog}>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Snowflake className="h-5 w-5" />
                                Cold Storage Transfer
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg border">
                            <div>
                                <label className="text-sm font-medium">Issue Store *</label>
                                <Select
                                    value={form.issueStoreId}
                                    onValueChange={(v) => handleFormChange("issueStoreId", v)}
                                    required
                                >
                                    <SelectTrigger>
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
                                <label className="text-sm font-medium">Common Transfer Store *</label>
                                <Select
                                    value={commonTransferStore}
                                    onValueChange={setCommonTransferStore}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Transfer Store" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stores.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Transfer Date</label>
                                <Input
                                    type="date"
                                    value={form.ginDate}
                                    onChange={(e) => handleFormChange("ginDate", e.target.value)}
                                />
                            </div>
                            <Button className="mt-6" onClick={() => handleFormChange("ginDate", form.ginDate)}>
                                Find
                            </Button>
                        </div>

                        {mergedItems?.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Items Available for Transfer</h3>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item Details</TableHead>
                                                <TableHead>Available Qty</TableHead>
                                                <TableHead>GRN Source</TableHead>
                                                <TableHead>Cold Room</TableHead>
                                                <TableHead>Rack</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {getIndividualGrnRecords(mergedItems).map((record, index) => {
                                                const mergedItem = mergedItems.find(item => item.itemId === record.itemId);
                                                const availableRacks = getRacksForColdRoom(Number(mergedItem?.selectedColdRoom) || 0);
                                                const isSelected = mergedItem?.selectedGrnId === String(record.grnId);

                                                return (
                                                    <TableRow
                                                        key={`${record.itemId}-${record.grnId}`}
                                                        className={isSelected ? "bg-blue-50 border-blue-200" : ""}
                                                    >
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <div className="font-medium">
                                                                    {record.itemColor} {record.itemName} {record.itemCountry}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    DOs: {record.doNumbers?.join(", ")}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Summary ID: {record.summaryId}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="font-semibold">
                                                                {record.availableQty}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="radio"
                                                                    name={`grn-${record.itemId}`}
                                                                    checked={isSelected}
                                                                    onChange={() => {
                                                                        setMergedItems(prev => prev.map(item =>
                                                                            item.itemId === record.itemId
                                                                                ? { ...item, selectedGrnId: String(record.grnId) }
                                                                                : item
                                                                        ));
                                                                    }}
                                                                    className="h-4 w-4"
                                                                />
                                                                <div className="flex items-center gap-2">
                                                                    <Box className="h-4 w-4" />
                                                                    <div>
                                                                        <div className="font-medium">{record.grnNumber}</div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            Available: {record.availableQty}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={mergedItem?.selectedColdRoom || ""}
                                                                onValueChange={(value) => handleGrnRecordColdRoomSelect(index, value)}
                                                                disabled={!isSelected}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select Cold Room" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {coldRooms.map((room) => (
                                                                        <SelectItem key={room.id} value={String(room.id)}>
                                                                            <div className="flex items-center gap-2">
                                                                                <Snowflake className="h-4 w-4" />
                                                                                {room.name} ({room.temperature}°C)
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={mergedItem?.selectedRack || ""}
                                                                onValueChange={(value) => handleGrnRecordRackSelect(index, value)}
                                                                disabled={!isSelected || !mergedItem?.selectedColdRoom}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select Rack" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {availableRacks.map((rack) => (
                                                                        <SelectItem key={rack.id} value={String(rack.id)}>
                                                                            <div className="flex items-center gap-2">
                                                                                <Package className="h-4 w-4" />
                                                                                {rack.code || rack.name} (Cap: {rack.capacity})
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            {isSelected ? (
                                                                mergedItem?.selectedColdRoom && mergedItem?.selectedRack ? (
                                                                    <Badge className="bg-green-100 text-green-800">
                                                                        Ready
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge className="bg-blue-100 text-blue-800">
                                                                        Selected
                                                                    </Badge>
                                                                )
                                                            ) : (
                                                                <Badge variant="outline">
                                                                    Available
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Summary of Selected Items */}
                                {mergedItems.some(item => item.selectedGrnId) && (
                                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <h4 className="text-sm font-medium text-green-800 mb-2">Selected Items Summary:</h4>
                                        <div className="space-y-1">
                                            {mergedItems
                                                .filter(item => item.selectedGrnId)
                                                .map(item => {
                                                    const selectedGrn = item.availableGrns.find(grn => String(grn.grnId) === item.selectedGrnId);
                                                    return (
                                                        <div key={item.itemId} className="text-sm text-green-700">
                                                            • {item.itemColor} {item.itemName} {item.itemCountry} -
                                                            Qty: {selectedGrn?.availableQty} from GRN: {selectedGrn?.grnNumber}
                                                            {item.selectedColdRoom && item.selectedRack && (
                                                                <span className="text-green-600"> ✓ Ready for transfer</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}

                                {/* {formError && <div className="text-red-500 text-sm">{formError}</div>} */}

                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={handleCloseTransferDialog}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleConfirmColdStorageTransfer}
                                        disabled={loading || !commonTransferStore}
                                        className="flex items-center gap-2"
                                    >
                                        {loading ? "Processing..." : (
                                            <>
                                                <ArrowRight className="h-4 w-4" />
                                                Confirm Transfer
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {mergedItems?.length === 0 && (
                            <div className="text-center py-8">
                                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                <div className="space-y-2">
                                    <p className="text-muted-foreground">
                                        {!form.ginDate
                                            ? "Select a transfer date to load available items"
                                            : !form.issueStoreId
                                                ? "Select an issue store first"
                                                : "No items with GRN assignments available for transfer on this date"
                                        }
                                    </p>
                                    {form.ginDate && form.issueStoreId && (
                                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                            <div className="flex items-center gap-2 text-amber-800">
                                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                <h4 className="text-sm font-medium">Information</h4>
                                            </div>
                                            <p className="text-xs text-amber-700 mt-1">
                                                There may be scheduled delivery orders for this date that don't have GRN assignments yet.
                                                Please ensure GRN assignments are completed before creating stock transfers.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* View GIN Dialog */}
                <Dialog open={viewDialog} onOpenChange={setViewDialog}>
                    <DialogContent className="max-w-6xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Eye className="h-5 w-5" />
                                View Stock Transfer - {selectedGin?.ginNumber}
                            </DialogTitle>
                        </DialogHeader>

                        {selectedGin && (
                            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                                {/* Header Information */}
                                <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border">
                                    <div>
                                        <label className="text-sm font-medium">GIN Number</label>
                                        <p className="font-semibold text-blue-900">{selectedGin.ginNumber}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">GIN Date</label>
                                        <p className="font-semibold text-blue-900">{format(new Date(selectedGin.ginDate), "yyyy-MM-dd")}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Status</label>
                                        <Badge variant={selectedGin.status === "Completed" ? "default" : "secondary"}>
                                            {selectedGin.status || "Pending"}
                                        </Badge>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Issue Store</label>
                                        <p className="font-semibold text-blue-900">{selectedGin.IssueStore?.name || selectedGin.issueStore?.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Transfer Store</label>
                                        <p className="font-semibold text-blue-900">{selectedGin.TransferStore?.name || selectedGin.transferStore?.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Created Date</label>
                                        <p className="font-semibold text-blue-900">{selectedGin.createdAt ? format(new Date(selectedGin.createdAt), "yyyy-MM-dd") : "-"}</p>
                                    </div>
                                </div>

                                {/* Remarks Section */}
                                {selectedGin.remarks && (
                                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                        <label className="text-sm font-medium text-green-800">Remarks</label>
                                        <p className="mt-1 text-green-700">{selectedGin.remarks}</p>
                                    </div>
                                )}

                                {/* Transfer Items Section */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">Transfer Items</h3>
                                        <Badge variant="outline" className="px-3 py-1">
                                            {selectedGin.items?.length || 0} Items
                                        </Badge>
                                    </div>
                                    <div className="border rounded-lg overflow-hidden bg-white">
                                        <Table>
                                            <TableHeader className="bg-gray-50">
                                                <TableRow>
                                                    <TableHead className="font-semibold">Item Details</TableHead>
                                                    <TableHead className="font-semibold">Quantity</TableHead>
                                                    <TableHead className="font-semibold">GRN Source</TableHead>
                                                    <TableHead className="font-semibold">Cold Room</TableHead>
                                                    <TableHead className="font-semibold">Rack</TableHead>
                                                    <TableHead className="font-semibold">Remarks</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedGin.items?.map((item, index) => (
                                                    <TableRow key={index} className="hover:bg-gray-50">
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <div className="font-medium">
                                                                    {item.item ? (
                                                                        `${item.item.color} ${item.item.name} ${item.item.country}`
                                                                    ) : (
                                                                        `Item ID: ${item.itemId}`
                                                                    )}
                                                                </div>
                                                                {item.summaryId && (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Summary ID: {item.summaryId}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="font-semibold bg-blue-50 text-blue-700">
                                                                {item.qty}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <div className="text-sm font-medium flex items-center gap-2">
                                                                    <Box className="h-4 w-4 text-blue-500" />
                                                                    {item.grn?.grnNumber || `GRN ID: ${item.grnId}`}
                                                                </div>
                                                                {item.grn?.grnDate && (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Date: {format(new Date(item.grn.grnDate), "yyyy-MM-dd")}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.coldRoom ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Snowflake className="h-4 w-4 text-blue-500" />
                                                                    <div>
                                                                        <div className="font-medium text-blue-700">{item.coldRoom.name}</div>
                                                                        <div className="text-xs text-blue-600">
                                                                            {item.coldRoom.temperature}°C
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.palletRack ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Package className="h-4 w-4 text-green-500" />
                                                                    <div>
                                                                        <div className="font-medium text-green-700">{item.palletRack.code}</div>
                                                                        <div className="text-xs text-green-600">
                                                                            Capacity: {item.palletRack.capacity}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">
                                                                {item.remarks || "-"}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Approval Section */}
                        {selectedGin && selectedGin.status === 'Pending' && (
                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                        <div>
                                            <h4 className="text-sm font-medium text-yellow-800">Pending Approval</h4>
                                            <p className="text-xs text-yellow-700">This transfer requires approval to proceed</p>
                                        </div>
                                    </div>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={async () => {
                                            try {
                                                await ginApi.approveReject(selectedGin.id!, { status: "Approved" });
                                                toastr.success(`GIN ${selectedGin.ginNumber} has been approved successfully!`);
                                                setViewDialog(false);
                                                setTimeout(async () => setGins(await ginApi.getAll()), 300);
                                            } catch (e: any) {
                                                console.error("Failed to approve GIN:", e);

                                                // Parse error message from response
                                                let errorMessage = "Failed to approve GIN";

                                                if (e.response?.data?.error) {
                                                    errorMessage = e.response.data.error;
                                                } else if (e.message) {
                                                    errorMessage = e.message;
                                                }

                                                // Show toast error
                                                toastr.error(errorMessage, {
                                                    title: "Approval Failed",
                                                    duration: 8000
                                                });

                                                // Also set form error for display in dialog
                                                setFormError(errorMessage);
                                            }
                                        }}
                                    >
                                        Approve Transfer
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Edit GIN Dialog */}
                <Dialog open={editDialog} onOpenChange={setEditDialog}>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Edit className="h-5 w-5" />
                                Edit Stock Transfer - {selectedGin?.ginNumber}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                            {selectedGin && (
                                <>
                                    {/* Header Information */}
                                    <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border">
                                        <div>
                                            <label className="text-sm font-medium">GIN Number</label>
                                            <p className="font-semibold text-blue-900">{selectedGin.ginNumber}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">GIN Date</label>
                                            <p className="font-semibold text-blue-900">{format(new Date(selectedGin.ginDate), "yyyy-MM-dd")}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Status</label>
                                            <Badge variant={selectedGin.status === "Completed" ? "default" : "secondary"}>
                                                {selectedGin.status || "Pending"}
                                            </Badge>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Issue Store</label>
                                            <p className="font-semibold text-blue-900">{selectedGin.IssueStore?.name || selectedGin.issueStore?.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Transfer Store</label>
                                            <p className="font-semibold text-blue-900">{selectedGin.TransferStore?.name || selectedGin.transferStore?.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Created Date</label>
                                            <p className="font-semibold text-blue-900">{selectedGin.createdAt ? format(new Date(selectedGin.createdAt), "yyyy-MM-dd") : "-"}</p>
                                        </div>
                                    </div>

                                    {/* Remarks Section */}
                                    {selectedGin.remarks && (
                                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                            <label className="text-sm font-medium text-green-800">Current Remarks</label>
                                            <p className="mt-1 text-green-700">{selectedGin.remarks}</p>
                                        </div>
                                    )}

                                    {/* Edit Transfer Items Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold">Edit Transfer Items</h3>
                                            <Badge variant="outline" className="px-3 py-1">
                                                {form.items?.length || 0} Items
                                            </Badge>
                                        </div>
                                        <div className="border rounded-lg overflow-hidden bg-white">
                                            <Table>
                                                <TableHeader className="bg-gray-50">
                                                    <TableRow>
                                                        <TableHead className="font-semibold">Item Details</TableHead>
                                                        <TableHead className="font-semibold">Quantity</TableHead>
                                                        <TableHead className="font-semibold">GRN Source</TableHead>
                                                        <TableHead className="font-semibold">Cold Room</TableHead>
                                                        <TableHead className="font-semibold">Rack</TableHead>
                                                        <TableHead className="font-semibold">Remarks</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {form.items?.map((item, index) => {
                                                        const availableRacks = getRacksForColdRoom(item.coldRoomId || 0);
                                                        return (
                                                            <TableRow key={index} className="hover:bg-gray-50">
                                                                <TableCell>
                                                                    <div className="space-y-1">
                                                                        <div className="font-medium">
                                                                            {(() => {
                                                                                const itemDetails = items.find(i => String(i.id) === String(item.itemId));
                                                                                return itemDetails ? (
                                                                                    `${itemDetails.color} ${itemDetails.name} ${itemDetails.country}`
                                                                                ) : (
                                                                                    `Item ID: ${item.itemId}`
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        {item.summaryId && (
                                                                            <div className="text-xs text-muted-foreground">
                                                                                Summary ID: {item.summaryId}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline" className="font-semibold bg-blue-50 text-blue-700">
                                                                        {item.qty}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {(() => {
                                                                        const mergedItem = mergedItems.find(merged => String(merged.itemId) === String(item.itemId));
                                                                        if (!form.issueStoreId) {
                                                                            return (
                                                                                <div className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                                                                    Select issue store first
                                                                                </div>
                                                                            );
                                                                        }
                                                                        if (!mergedItem || mergedItem.availableGrns.length === 0) {
                                                                            return (
                                                                                <div className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded">
                                                                                    No GRN items available
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <Select
                                                                                value={item.selectedGrnId || ""}
                                                                                onValueChange={(v) => {
                                                                                    const newItems = [...form.items];
                                                                                    newItems[index].selectedGrnId = v;
                                                                                    // Find the summaryId for the selected GRN
                                                                                    const selectedGrn = mergedItem.availableGrns.find(grn => String(grn.grnId) === v);
                                                                                    newItems[index].summaryId = selectedGrn?.summaryId;
                                                                                    setForm(f => ({ ...f, items: newItems }));
                                                                                }}
                                                                            >
                                                                                <SelectTrigger className="min-w-[200px]">
                                                                                    <SelectValue placeholder="Select GRN Source" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {mergedItem.availableGrns.map((grn) => (
                                                                                        <SelectItem key={grn.grnId} value={String(grn.grnId)}>
                                                                                            <div className="flex items-center gap-2">
                                                                                                <Box className="h-4 w-4 text-blue-500" />
                                                                                                <div>
                                                                                                    <div className="font-medium">{grn.grnNumber}</div>
                                                                                                    <div className="text-xs text-muted-foreground">
                                                                                                        Qty: {grn.availableQty}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        );
                                                                    })()}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Select
                                                                        value={String(item.coldRoomId || "")}
                                                                        onValueChange={(v) => {
                                                                            const newItems = [...form.items];
                                                                            newItems[index].coldRoomId = v ? Number(v) : undefined;
                                                                            newItems[index].palletRackId = ""; // Reset rack when room changes
                                                                            setForm(f => ({ ...f, items: newItems }));
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="min-w-[180px]">
                                                                            <SelectValue placeholder="Select Cold Room" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {coldRooms.map((room) => (
                                                                                <SelectItem key={room.id} value={String(room.id)}>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Snowflake className="h-4 w-4 text-blue-500" />
                                                                                        <div>
                                                                                            <div className="font-medium">{room.name}</div>
                                                                                            <div className="text-xs text-blue-600">
                                                                                                {room.temperature}°C
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Select
                                                                        value={item.palletRackId || ""}
                                                                        onValueChange={(v) => {
                                                                            const newItems = [...form.items];
                                                                            newItems[index].palletRackId = v;
                                                                            setForm(f => ({ ...f, items: newItems }));
                                                                        }}
                                                                        disabled={!item.coldRoomId}
                                                                    >
                                                                        <SelectTrigger className="min-w-[150px]">
                                                                            <SelectValue placeholder="Select Rack" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {availableRacks.map((rack) => (
                                                                                <SelectItem key={rack.id} value={String(rack.id)}>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Package className="h-4 w-4 text-green-500" />
                                                                                        <div>
                                                                                            <div className="font-medium">{rack.code || rack.name}</div>
                                                                                            <div className="text-xs text-green-600">
                                                                                                Cap: {rack.capacity}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        value={item.remarks}
                                                                        onChange={(e) => {
                                                                            const newItems = [...form.items];
                                                                            newItems[index].remarks = e.target.value;
                                                                            setForm(f => ({ ...f, items: newItems }));
                                                                        }}
                                                                        placeholder="Enter remarks..."
                                                                        className="min-w-[150px]"
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}

                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button variant="outline" onClick={() => setEditDialog(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleUpdateGin} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                    {loading ? "Updating..." : "Update Transfer"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Stock Transfer Table */}
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>GIN #</TableHead>
                                <TableHead>Issue Store</TableHead>
                                <TableHead>Transfer Store</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {gins.map((gin) => (
                                <TableRow key={gin.id}>
                                    <TableCell className="w-1/3">
                                        <div className="font-medium">{gin.ginNumber}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {gin.deliveryOrderNumbers?.join(", ")}
                                        </div>
                                    </TableCell>
                                    <TableCell>{gin.IssueStore?.name || gin.issueStore?.name}</TableCell>
                                    <TableCell>{gin.TransferStore?.name || gin.transferStore?.name}</TableCell>
                                    <TableCell>{format(new Date(gin.ginDate), "yyyy-MM-dd")}</TableCell>
                                    <TableCell>{gin.status || "-"}</TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button variant="outline" size="sm" title="View" onClick={() => handleViewGin(gin)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        {gin.status === "Pending" && (
                                            <>
                                                <Button variant="outline" size="sm" title="Edit" onClick={() => handleEditGin(gin)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" size="sm" title="Delete">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete GIN</AlertDialogTitle>
                                                        </AlertDialogHeader>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete this GIN?
                                                        </AlertDialogDescription>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={async () => {
                                                                    try {
                                                                        await ginApi.remove(gin.id!);
                                                                        toastr.success(`GIN ${gin.ginNumber} deleted successfully!`);
                                                                        setGins(await ginApi.getAll());
                                                                    } catch (e: any) {
                                                                        console.error("Failed to delete GIN:", e);
                                                                        const errorMessage = e.response?.data?.error || e.message || "Failed to delete GIN";
                                                                        toastr.error(errorMessage, {
                                                                            title: "Delete Failed",
                                                                            duration: 8000
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        )}
                                        <Button variant="outline" size="sm" title="Print">
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </ERPLayout>
    );
}
