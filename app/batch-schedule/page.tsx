"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useEffect, useState, useMemo } from "react"
import { grnScheduleApi, grnApi, Customer, customersApi } from "@/lib/api"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { usePagination } from "@/hooks/use-pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Trash2, Plus, AlertCircle, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ERPLayout } from "@/components/layouts/erp-layout"

export default function BatchSchedulePage() {
    // ...existing code...
    const [schedules, setSchedules] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    // Create form state
    const [createLoading, setCreateLoading] = useState(false)
    const [createError, setCreateError] = useState("")
    const [createSuccess, setCreateSuccess] = useState("")
    const [scheduleDate, setScheduleDate] = useState("")
    const [items, setItems] = useState<any[]>([])
    const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | null>(null);
    const [itemRows, setItemRows] = useState<any[]>([]); // [{ itemId, price, grn1Id, grn2Id, grn3Id }]
    const [openDialog, setOpenDialog] = useState(false)
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    // Delete functionality state
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [customerType, setCustomerType] = useState<string>("Supermarket")
    const [customers, setCustomers] = useState<Customer[]>([])
    const [customer, setCustomer] = useState<Customer | null>(null)

    // Search state
    const [searchTerm, setSearchTerm] = useState("")

    // Pagination with custom hook
    const {
        paginatedData: paginatedSchedules,
        paginationProps
    } = usePagination({
        data: schedules,
        initialItemsPerPage: 10,
        filterFn: (schedule) => {
            const search = searchTerm.toLowerCase()
            return (
                schedule.item?.name?.toLowerCase().includes(search) ||
                schedule.grn?.grnNumber?.toLowerCase().includes(search) ||
                format(new Date(schedule.scheduleDate), "MMM dd, yyyy").toLowerCase().includes(search)
            )
        }
    })



    // Load batch schedules
    useEffect(() => {
        setLoading(true)
        grnScheduleApi.getAll()
            .then((data) => {
                setSchedules(data)
                setSelectedRows(new Set()) // Clear selection when data reloads
            })
            .catch(err => setError(err.message || "Failed to load batch schedules"))
            .finally(() => setLoading(false))
        fetchCustomers()
    }, [])
    // Load item-GRN availability using api.ts
    useEffect(() => {
        if (grnApi && grnApi.getItemGrnAvailability) {
            grnApi.getItemGrnAvailability()
                .then((data) => {
                    setItems(data);
                    setItemRows(data.map((row: any) => ({
                        itemId: row.item.id,
                        price: "",
                        grn1Id: "",
                        grn2Id: "",
                        grn3Id: ""
                    })));
                })
                .catch(() => {
                    setItems([]);
                    setItemRows([]);
                });
        }
    }, [])

    const fetchCustomers = async () => {
        try {
            const data = await customersApi.getAll<Customer>()
            const supermarkets = data.filter(c => c.type === "Supermarket")
            setCustomers(supermarkets)
        } catch (error) {
            console.error("Failed to fetch customers:", error)
        }
    }

    // Handle create schedule with improved validation and UX
    async function handleCreateSchedule(e: React.FormEvent) {
        e.preventDefault();

        // Reset previous states
        setCreateError("");
        setCreateSuccess("");
        setValidationErrors({});

        // Validation
        const errors: Record<string, string> = {};

        if (!selectedScheduleDate) {
            errors.scheduleDate = "Please select a schedule date.";
        }

        if (customerType === "Supermarket" && !customer) {
            errors.customer = "Please select a customer.";
        }

        const selectedItems = itemRows.filter(row => row.price > 0 && (row.grn1Id || row.grn2Id || row.grn3Id));
        if (selectedItems.length === 0) {
            errors.items = "Please add price and select at least one Batch for scheduling.";
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setCreateLoading(true);
        let successCount = 0;
        let errorCount = 0;
        const errorMessages: string[] = [];

        for (let i = 0; i < itemRows.length; i++) {
            const row = itemRows[i];
            // if (!row.grn1Id && !row.grn2Id && !row.grn3Id) continue; // skip if no GRN selected

            try {
                if (row.price > 0) {
                    const scheduleData: any = {
                        type: customerType,
                        scheduleDate: selectedScheduleDate!.toISOString(),
                        itemId: row.itemId,
                        grn1Id: row.grn1Id,
                        grn2Id: row.grn2Id,
                        grn3Id: row.grn3Id,
                        price: parseFloat(row.price)
                    };
                    // Add customer if Supermarket type
                    if (customerType === "Supermarket" && customer) {
                        scheduleData.customerId = customer.id;
                    }

                    await grnScheduleApi.create(scheduleData);
                    successCount++;
                }
            } catch (err: any) {
                errorCount++;
                errorMessages.push(`${items.find(item => item.item.id === row.itemId)?.item?.name || 'Item'} (${grn.type}): ${err.message}`);
            }

        }

        setCreateLoading(false);

        if (successCount > 0) {
            setCreateSuccess(`Successfully created ${successCount} batch schedule(s).`);

            // Reset form on success
            setTimeout(() => {
                setOpenDialog(false);
                setSelectedScheduleDate(null);
                setItemRows(items.map((row: any) => ({
                    itemId: row.item.id,
                    grn1Id: "",
                    grn2Id: "",
                    grn3Id: "",
                    price: ""
                })));
                setCreateSuccess("");
                setCustomerType("Supermarket");
                setCustomer(null);
            }, 2000);

            // Reload schedules
            setLoading(true);
            grnScheduleApi.getAll()
                .then(setSchedules)
                .catch(() => { })
                .finally(() => setLoading(false));
        }

        if (errorCount > 0) {
            setCreateError(`Failed to create ${errorCount} schedule(s). ${errorMessages.slice(0, 3).join(', ')}${errorMessages.length > 3 ? '...' : ''}`);
        }
    }

    // Get selected items count for better UX
    const getSelectedItemsCount = () => {
        return itemRows.filter(row => row.price > 0 && (row.grn1Id || row.grn2Id || row.grn3Id)).length;
    };

    // Check if a GRN is already selected in other columns for the same item
    const isGrnDisabled = (itemIndex: number, grnId: string, excludeColumn?: 'grn1Id' | 'grn2Id' | 'grn3Id') => {
        const row = itemRows[itemIndex];
        if (!row) return false;

        const selectedGrns = [
            excludeColumn !== 'grn1Id' ? row.grn1Id : null,
            excludeColumn !== 'grn2Id' ? row.grn2Id : null,
            excludeColumn !== 'grn3Id' ? row.grn3Id : null
        ].filter(Boolean);

        return selectedGrns.includes(grnId);
    };

    // Reset form function
    const resetForm = () => {
        setSelectedScheduleDate(null);
        setItemRows(items.map((row: any) => ({
            itemId: row.item.id,
            grn1Id: "",
            grn2Id: "",
            grn3Id: "",
            price: ""
        })));
        setCreateError("");
        setCreateSuccess("");
        setValidationErrors({});
        setCustomerType("Supermarket");
        setCustomer(null);
    };

    // Handle row selection
    const handleRowSelect = (rowId: string, isSelected: boolean) => {
        const newSelectedRows = new Set(selectedRows)
        if (isSelected) {
            newSelectedRows.add(rowId)
        } else {
            newSelectedRows.delete(rowId)
        }
        setSelectedRows(newSelectedRows)
    }

    // Handle select all
    const handleSelectAll = (isSelected: boolean) => {
        if (isSelected) {
            setSelectedRows(new Set(schedules.map(schedule => schedule.id)))
        } else {
            setSelectedRows(new Set())
        }
    }

    // Handle delete selected rows
    const handleDeleteSelected = async () => {
        if (selectedRows.size === 0) return
        setShowDeleteConfirm(true)
    }

    // Confirm delete action
    const confirmDelete = async () => {
        setShowDeleteConfirm(false)
        setDeleteLoading(true)
        let successCount = 0

        for (const rowId of selectedRows) {
            try {
                await grnScheduleApi.remove(rowId)
                successCount++
            } catch (err: any) {
                setError(err.message || "Failed to delete schedule")
            }
        }

        setDeleteLoading(false)
        setSelectedRows(new Set())

        if (successCount > 0) {
            // Reload schedules
            setLoading(true)
            grnScheduleApi.getAll()
                .then(setSchedules)
                .catch(err => setError(err.message || "Failed to reload batch schedules"))
                .finally(() => setLoading(false))
        }
    }

    return (
        <ERPLayout>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Batch Schedule</h1>
                        <p className="text-muted-foreground">View and manage batch schedules for Batches and inventory operations.</p>
                    </div>
                </div>

                <div className="mx-auto mb-4 flex justify-end gap-2">
                    {selectedRows.size > 0 && (
                        <Button
                            variant="destructive"
                            onClick={handleDeleteSelected}
                            disabled={deleteLoading}
                            className="flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            {deleteLoading ? "Deleting..." : `Delete Selected (${selectedRows.size})`}
                        </Button>
                    )}
                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                        <DialogTrigger asChild>
                            <Button onClick={() => resetForm()} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Create Batch Schedule
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5" />
                                    Create Batch Schedule
                                </DialogTitle>
                                <DialogDescription>
                                    Schedule items for batch processing. Set individual prices and assign up to 3 Batches per item. For Supermarket customer type, select a specific customer.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleCreateSchedule} className="space-y-1">
                                <div className="grid gap-4 py-2 grid-cols-3">
                                    <div className="col-span-2 flex flex-wrap gap-6 mt-1 text-sm">
                                        {[
                                            "Supermarket",
                                            "Wholesaler",
                                            "Distributor",
                                            "Own Shop",
                                            "Walking"
                                        ].map((type) => (
                                            <label key={type} className="flex items-center space-x-1 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="customerType"
                                                    value={type}
                                                    checked={customerType === type}
                                                    onChange={setCustomerType.bind(null, type)}
                                                    className="accent-primary"
                                                />
                                                <span className="text-muted-foreground">{type === "Walking" ? "Walk-in Customer" : type}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {/* Selected Items Counter */}
                                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                                        <span className="text-sm text-muted-foreground">
                                            Items available for scheduling: {items.length}
                                        </span>
                                        <Badge variant={getSelectedItemsCount() > 0 ? "default" : "secondary"}>
                                            {getSelectedItemsCount()} selected
                                        </Badge>
                                    </div>
                                </div>
                                <div className="grid gap-4 py-2 grid-cols-2">
                                    {customerType === "Supermarket" && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-customerId">Customer</Label>
                                            <Select
                                                value={customer ? customer.id.toString() : undefined}
                                                onValueChange={(value) => setCustomer(customers.find(c => c.id.toString() === value) || null)}
                                            >
                                                <SelectTrigger>
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
                                            {validationErrors.customer && (
                                                <p className="text-sm text-red-600">{validationErrors.customer}</p>
                                            )}
                                        </div>
                                    )}
                                    {/* Schedule Date Selection */}
                                    <div className="space-y-2">
                                        <Label htmlFor="scheduleDate" className="text-sm font-medium">
                                            Schedule Date *
                                        </Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !selectedScheduleDate && "text-muted-foreground",
                                                        validationErrors.scheduleDate && "border-red-300"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {selectedScheduleDate ? format(selectedScheduleDate, "PPP") : "Pick a date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={selectedScheduleDate || undefined}
                                                    onSelect={(date) => {
                                                        setSelectedScheduleDate(date || null);
                                                        if (validationErrors.scheduleDate) {
                                                            setValidationErrors(prev => {
                                                                const newErrors = { ...prev };
                                                                delete newErrors.scheduleDate;
                                                                return newErrors;
                                                            });
                                                        }
                                                    }}
                                                    initialFocus
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {validationErrors.scheduleDate && (
                                            <p className="text-sm text-red-600">{validationErrors.scheduleDate}</p>
                                        )}
                                    </div>
                                </div>



                                {/* Items Table */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Item Price & Batch Assignment</Label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Set individual prices and assign up to 3 Batches per item. Each Batch can only be selected once per item.
                                    </p>
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead className="w-[28%]">Item Details</TableHead>
                                                    <TableHead className="w-[12%]">Price (1kg)</TableHead>
                                                    <TableHead className="w-[20%]">Batch 1</TableHead>
                                                    <TableHead className="w-[20%]">Batch 2</TableHead>
                                                    <TableHead className="w-[20%]">Batch 3</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {items.map((row, idx) => (
                                                    <TableRow key={row.item.id} className="hover:bg-muted/30">
                                                        <TableCell className="font-medium">
                                                            <div className="space-y-1">
                                                                <div className="font-semibold">
                                                                    {row.item?.color} {row.item?.name} {row.item?.country}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {row.grns?.length || 0} Batch(es) available
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                placeholder="0.00"
                                                                step="0.01"
                                                                min="0"
                                                                value={itemRows[idx]?.price || ""}
                                                                onChange={(e) => {
                                                                    const newRows = [...itemRows];
                                                                    newRows[idx].price = e.target.value;
                                                                    setItemRows(newRows);
                                                                }}
                                                                className="w-full"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={itemRows[idx]?.grn1Id || ""}
                                                                onValueChange={(val: string) => {
                                                                    const newRows = [...itemRows];
                                                                    newRows[idx].grn1Id = val;
                                                                    setItemRows(newRows);
                                                                    if (validationErrors.items) {
                                                                        setValidationErrors(prev => {
                                                                            const newErrors = { ...prev };
                                                                            delete newErrors.items;
                                                                            return newErrors;
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                <SelectTrigger className={cn(
                                                                    "w-full",
                                                                    !row.grns?.length && "opacity-50"
                                                                )}>
                                                                    <SelectValue placeholder={
                                                                        row.grns?.length ? "Select Batch 1" : "No Batches available"
                                                                    } />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {row.grns?.map((grn: any) => (
                                                                        <SelectItem
                                                                            key={grn.grnId}
                                                                            value={String(grn.grnId)}
                                                                            disabled={isGrnDisabled(idx, String(grn.grnId), 'grn1Id')}
                                                                        >
                                                                            <div className="flex flex-col">
                                                                                <span className="font-medium">{grn.grnNumber}</span>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    Available: {grn.availableQty}
                                                                                </span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={itemRows[idx]?.grn2Id || ""}
                                                                onValueChange={(val: string) => {
                                                                    const newRows = [...itemRows];
                                                                    newRows[idx].grn2Id = val;
                                                                    setItemRows(newRows);
                                                                    if (validationErrors.items) {
                                                                        setValidationErrors(prev => {
                                                                            const newErrors = { ...prev };
                                                                            delete newErrors.items;
                                                                            return newErrors;
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                <SelectTrigger className={cn(
                                                                    "w-full",
                                                                    !row.grns?.length && "opacity-50"
                                                                )}>
                                                                    <SelectValue placeholder={
                                                                        row.grns?.length ? "Select Batch 2" : "No Batches available"
                                                                    } />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {row.grns?.map((grn: any) => (
                                                                        <SelectItem
                                                                            key={grn.grnId}
                                                                            value={String(grn.grnId)}
                                                                            disabled={isGrnDisabled(idx, String(grn.grnId), 'grn2Id')}
                                                                        >
                                                                            <div className="flex flex-col">
                                                                                <span className="font-medium">{grn.grnNumber}</span>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    Available: {grn.availableQty}
                                                                                </span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={itemRows[idx]?.grn3Id || ""}
                                                                onValueChange={(val: string) => {
                                                                    const newRows = [...itemRows];
                                                                    newRows[idx].grn3Id = val;
                                                                    setItemRows(newRows);
                                                                    if (validationErrors.items) {
                                                                        setValidationErrors(prev => {
                                                                            const newErrors = { ...prev };
                                                                            delete newErrors.items;
                                                                            return newErrors;
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                <SelectTrigger className={cn(
                                                                    "w-full",
                                                                    !row.grns?.length && "opacity-50"
                                                                )}>
                                                                    <SelectValue placeholder={
                                                                        row.grns?.length ? "Select Batch 3" : "No Batches available"
                                                                    } />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {row.grns?.map((grn: any) => (
                                                                        <SelectItem
                                                                            key={grn.grnId}
                                                                            value={String(grn.grnId)}
                                                                            disabled={isGrnDisabled(idx, String(grn.grnId), 'grn3Id')}
                                                                        >
                                                                            <div className="flex flex-col">
                                                                                <span className="font-medium">{grn.grnNumber}</span>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    Available: {grn.availableQty}
                                                                                </span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {items.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                                            No items available for scheduling
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {validationErrors.items && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{validationErrors.items}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                {/* Success Message */}
                                {createSuccess && (
                                    <Alert>
                                        <CheckCircle2 className="h-4 w-4" />
                                        <AlertDescription>{createSuccess}</AlertDescription>
                                    </Alert>
                                )}

                                {/* Error Message */}
                                {createError && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{createError}</AlertDescription>
                                    </Alert>
                                )}

                                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setOpenDialog(false)}
                                        className="w-full sm:w-auto"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={createLoading || getSelectedItemsCount() === 0}
                                        className="w-full sm:w-auto"
                                    >
                                        {createLoading ? (
                                            <>
                                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                                Creating...
                                            </>
                                        ) : (
                                            `Create Schedule (${getSelectedItemsCount()} items)`
                                        )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
                {/* Delete Confirmation Dialog */}
                <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                Confirm Delete
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete {selectedRows.size} selected batch schedule{selectedRows.size > 1 ? 's' : ''}? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete"
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Card>
                    {/* <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5" />
                            Batch Schedules
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Manage and track batch schedules for GRN processing and inventory operations.
                        </p>
                    </CardHeader> */}
                    <CardContent className="mt-4">
                        {loading ? (
                            <div className="py-12 text-center">
                                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                                <p className="text-muted-foreground">Loading batch schedules...</p>
                            </div>
                        ) : error ? (
                            <Alert variant="destructive" className="my-6">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : schedules.length === 0 ? (
                            <div className="py-12 text-center">
                                <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No batch schedules found</h3>
                                <p className="text-muted-foreground mb-4">Get started by creating your first batch schedule.</p>
                                <Button onClick={() => setOpenDialog(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Batch Schedule
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Search Bar */}
                                <div className="flex items-center justify-between mb-4">
                                    <Input
                                        placeholder="Search schedules..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="max-w-xs"
                                    />
                                    {selectedRows.size > 0 && (
                                        <Badge variant="secondary">
                                            {selectedRows.size} selected
                                        </Badge>
                                    )}
                                </div>
                                <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-12">
                                                    <Checkbox
                                                        checked={schedules.length > 0 && selectedRows.size === schedules.length}
                                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                                    />
                                                </TableHead>
                                                <TableHead>Customer</TableHead>
                                                <TableHead>Scheduled Date</TableHead>
                                                <TableHead>Item Details</TableHead>
                                                <TableHead>Price (1kg)</TableHead>
                                                <TableHead>Batch Numbers</TableHead>
                                                {/* <TableHead>Created By</TableHead> */}
                                                <TableHead>Created At</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedSchedules.map((batch: any) => (
                                                <TableRow key={batch.id} className="hover:bg-muted/30">
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedRows.has(batch.id)}
                                                            onCheckedChange={(checked) => handleRowSelect(batch.id, checked as boolean)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        <div>
                                                            <div className="font-medium">{batch.Customer ? batch.Customer.name : batch.type}</div>
                                                            <div className="text-xs text-muted-foreground">{batch.Customer?.type}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {format(new Date(batch.scheduleDate), "MMM dd, yyyy")}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="font-medium">
                                                                {batch.itemName || (batch.Item ? `${batch.Item.color} ${batch.Item.name} ${batch.Item.country} (${batch.Item.weight}kg)` : 'Unknown Item')}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-semibold text-green-700">{(batch.price).toFixed(2)}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {batch.grn1Id ? batch.GRN1.grnNumber : 'Unknown Batch'}
                                                        </Badge>
                                                        {batch.grn2Id && (
                                                            <Badge variant="outline">
                                                                {batch.grn2Id ? batch.GRN2.grnNumber : 'Unknown Batch'}
                                                            </Badge>
                                                        )}
                                                        {batch.grn3Id && (
                                                            <Badge variant="outline">
                                                                {batch.grn3Id ? batch.GRN3.grnNumber : 'Unknown Batch'}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    {/* <TableCell className="text-muted-foreground">
                                                        {batch.createdBy || 'System'}
                                                    </TableCell> */}
                                                    <TableCell className="text-muted-foreground">
                                                        <div>
                                                            <div className="font-medium">{format(new Date(batch.createdAt), "MMM dd, yyyy")}</div>
                                                            <div className="text-xs text-muted-foreground">{batch.createdUserFullName ? batch.createdUserFullName : 'Unknown User'}</div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <PaginationControls {...paginationProps} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ERPLayout>
    )


}
