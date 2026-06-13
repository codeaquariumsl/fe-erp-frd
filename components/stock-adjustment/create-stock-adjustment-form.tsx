"use client"

import React, { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Plus, Trash2, Search, Package, Save, X, Info, RefreshCcw } from "lucide-react"
import {
    locationsApi,
    storesApi,
    itemsApi,
    batchesApi,
    stockAdjustmentApi,
    stockApi,
    type Location,
    type Store,
    type Item,
    type Batch,
    type StockAdjustment
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface CreateStockAdjustmentFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    initialData?: StockAdjustment | null
}

interface AdjustmentItemLine {
    itemId: number
    batchId?: number
    itemName: string
    sku: string
    batchNumber?: string
    systemQty: number
    adjustedQty: number
    newQty: number
    remark: string
}

export function CreateStockAdjustmentForm({ open, onOpenChange, onSuccess, initialData }: CreateStockAdjustmentFormProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [locations, setLocations] = useState<Location[]>([])
    const [stores, setStores] = useState<Store[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [availableBatches, setAvailableBatches] = useState<Batch[]>([])

    // Form State
    const [locationId, setLocationId] = useState<string>("")
    const [storeId, setStoreId] = useState<string>("")
    const [adjustmentDate, setAdjustmentDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
    const [reason, setReason] = useState<string>("")
    const [notes, setNotes] = useState<string>("")
    const [adjustmentLines, setAdjustmentLines] = useState<AdjustmentItemLine[]>([])

    // Item Selection State
    const [selectedItemId, setSelectedItemId] = useState<string>("")
    const [selectedBatchId, setSelectedBatchId] = useState<string>("none")
    const [searchItemTerm, setSearchItemTerm] = useState("")

    useEffect(() => {
        if (open) {
            fetchMasterData()
            if (initialData) {
                populateForm(initialData)
            } else {
                resetForm()
            }
        }
    }, [open, initialData])

    const populateForm = (data: StockAdjustment) => {
        setLocationId(data.locationId.toString())
        setStoreId(data.storeId.toString())
        setAdjustmentDate(format(new Date(data.adjustmentDate), "yyyy-MM-dd"))
        setReason(data.reason)
        setNotes(data.notes || "")
        const apiItems = initialData?.Items || initialData?.items || []
        setAdjustmentLines(apiItems.map(item => ({
            itemId: item.itemId,
            batchId: item.batchId,
            itemName: item.Item?.name || "Unknown",
            sku: item.Item?.sku || "N/A",
            batchNumber: item.Batch?.batchNumber,
            systemQty: typeof item.systemQty === 'string' ? parseFloat(item.systemQty) : item.systemQty,
            adjustedQty: typeof item.adjustedQty === 'string' ? parseFloat(item.adjustedQty) : item.adjustedQty,
            newQty: typeof item.newQty === 'string' ? parseFloat(item.newQty) : item.newQty,
            remark: item.remark || ""
        })))
    }

    const fetchMasterData = async () => {
        try {
            const [locs, sts, theItems] = await Promise.all([
                locationsApi.getAll(),
                storesApi.getAll(),
                itemsApi.getAll()
            ])
            setLocations(locs as Location[])
            setStores(sts as Store[])

            // Handle paginated or raw item response
            if (Array.isArray(theItems)) {
                setItems(theItems)
            } else if (theItems && 'data' in theItems) {
                setItems(theItems.data)
            }
        } catch (error) {
            console.error("Error fetching master data:", error)
        }
    }

    const fetchBatches = async (itemId: number) => {
        try {
            // For now, let's just get all batches for this item. 
            // Ideally we should filter by store/location but batchesApi might not have it yet.
            const response = await batchesApi.getAll({ page: 1, limit: 100 })
            // Filtering in frontend for simplicity if backend filter isn't robust
            const filtered = (response.batches || []).filter((b: any) =>
                b.BatchItems?.some((bi: any) => bi.itemId === itemId)
            )
            setAvailableBatches(filtered)
        } catch (error) {
            console.error("Error fetching batches:", error)
        }
    }

    const resetForm = () => {
        setLocationId("")
        setStoreId("")
        setAdjustmentDate(format(new Date(), "yyyy-MM-dd"))
        setReason("")
        setNotes("")
        setAdjustmentLines([])
        setSelectedItemId("")
        setSelectedBatchId("none")
        setSearchItemTerm("")
    }

    const handleItemSelect = (val: string) => {
        setSelectedItemId(val)
        setSelectedBatchId("none")
        if (val) {
            fetchBatches(parseInt(val))
        } else {
            setAvailableBatches([])
        }
    }

    const addAdjustmentLine = async () => {
        if (!selectedItemId || !storeId) {
            toast({
                title: "Error",
                description: "Please select an item and a store first",
                variant: "destructive"
            })
            return
        }

        const itemId = parseInt(selectedItemId)
        const item = items.find(i => i.id === itemId)
        if (!item) return

        // Check if item already exists in lines with same batch
        const existing = adjustmentLines.find(line =>
            line.itemId === itemId &&
            (selectedBatchId === "none" ? !line.batchId : line.batchId === parseInt(selectedBatchId))
        )

        if (existing) {
            toast({
                title: "Warning",
                description: "This item/batch combination is already added",
                variant: "destructive"
            })
            return
        }

        try {
            setLoading(true)
            let systemQty = 0

            // Fetch Current Stock
            // Note: We need a way to get system qty for itemId + storeId + batchId
            // Using stockApi.getByItem for now to find the right store
            const stockData = await stockApi.getByItem(itemId)
            const storeStock = stockData.find(s => s.storeId === parseInt(storeId))

            if (selectedBatchId === "none") {
                systemQty = storeStock?.availableQty || 0
            } else {
                // If batch selected, finding qty in that batch in that store
                const batchId = parseInt(selectedBatchId)
                const batch = availableBatches.find(b => b.id === batchId)
                const batchItem = batch?.BatchItems?.find((bi: any) => bi.itemId === itemId)
                systemQty = batchItem?.availableQuantity || 0
            }

            const newLine: AdjustmentItemLine = {
                itemId,
                batchId: selectedBatchId === "none" ? undefined : parseInt(selectedBatchId),
                itemName: item.name,
                sku: item.sku,
                batchNumber: selectedBatchId === "none" ? undefined : availableBatches.find(b => b.id === parseInt(selectedBatchId))?.batchNumber,
                systemQty,
                adjustedQty: 0,
                newQty: systemQty,
                remark: ""
            }

            setAdjustmentLines([...adjustmentLines, newLine])
            setSelectedItemId("")
            setSelectedBatchId("none")
            setSearchItemTerm("")
        } catch (error) {
            console.error("Error adding adjustment line:", error)
            toast({
                title: "Error",
                description: "Failed to fetch current stock level",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const removeLine = (index: number) => {
        setAdjustmentLines(adjustmentLines.filter((_, i) => i !== index))
    }

    const updateLine = (index: number, field: keyof AdjustmentItemLine, value: any) => {
        const newLines = [...adjustmentLines]
        const line = newLines[index]

        if (field === "adjustedQty") {
            const adj = parseFloat(value) || 0
            line.adjustedQty = adj
            line.newQty = line.systemQty + adj
        } else if (field === "newQty") {
            const nQty = parseFloat(value) || 0
            line.newQty = nQty
            line.adjustedQty = nQty - line.systemQty
        } else {
            (line as any)[field] = value
        }

        setAdjustmentLines(newLines)
    }

    const handleSubmit = async () => {
        if (!locationId || !storeId || !reason || adjustmentLines.length === 0) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields and add at least one item",
                variant: "destructive"
            })
            return
        }

        try {
            setLoading(true)
            const payload = {
                locationId: parseInt(locationId),
                storeId: parseInt(storeId),
                adjustmentDate,
                reason,
                notes,
                items: adjustmentLines.map(line => ({
                    itemId: line.itemId,
                    batchId: line.batchId,
                    systemQty: line.systemQty,
                    adjustedQty: line.adjustedQty,
                    newQty: line.newQty,
                    remark: line.remark
                }))
            }

            if (initialData?.id) {
                await stockAdjustmentApi.update(initialData.id, {
                    reason,
                    notes,
                    items: payload.items
                })
                toast({
                    title: "Success",
                    description: "Stock adjustment updated successfully"
                })
            } else {
                await stockAdjustmentApi.create(payload)
                toast({
                    title: "Success",
                    description: "Stock adjustment created successfully"
                })
            }

            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error("Error creating stock adjustment:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to create stock adjustment",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    // Filter items based on search
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchItemTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchItemTerm.toLowerCase())
    ).slice(0, 50) // Limit to 50 for performance

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <Package className="h-6 w-6 text-primary" /> Create Stock Adjustment
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Location *</Label>
                            <Select value={locationId} onValueChange={setLocationId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Location" />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations.map(loc => (
                                        <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Store *</Label>
                            <Select value={storeId} onValueChange={setStoreId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Store" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stores.filter(s => s.locationId === parseInt(locationId)).map(store => (
                                        <SelectItem key={store.id} value={store.id.toString()}>{store.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Date *</Label>
                            <Input
                                type="date"
                                value={adjustmentDate}
                                onChange={(e) => setAdjustmentDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Reason *</Label>
                            <Input
                                placeholder="E.g. Damaged during move, Found in shelf"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            placeholder="Additional details about this adjustment..."
                            className="resize-none h-20"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Item Selector */}
                    <div className="bg-muted/50 p-4 rounded-lg border space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add Item to Adjust
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-5 space-y-1">
                                <Label className="text-xs">Select Item</Label>
                                <Select value={selectedItemId} onValueChange={handleItemSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Search or select item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <div className="px-2 py-1 sticky top-0 bg-background z-10">
                                            <Input
                                                placeholder="Search name/sku..."
                                                className="h-8"
                                                value={searchItemTerm}
                                                onChange={(e) => setSearchItemTerm(e.target.value)}
                                            />
                                        </div>
                                        {filteredItems.map(item => (
                                            <SelectItem key={item.id} value={item.id.toString()}>
                                                {item.name} ({item.sku})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-4 space-y-1">
                                <Label className="text-xs">Select Batch (Optional)</Label>
                                <Select value={selectedBatchId} onValueChange={setSelectedBatchId} disabled={!selectedItemId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="No Batch (Global Stock)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Batch (Global Stock)</SelectItem>
                                        {availableBatches.map(batch => (
                                            <SelectItem key={batch.id} value={batch.id!.toString()}>
                                                {batch.batchNumber} (Exp: {format(new Date(batch.expireDate), "yyyy-MM-dd")})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-3">
                                <Button
                                    className="w-full"
                                    onClick={addAdjustmentLine}
                                    disabled={!selectedItemId || loading}
                                >
                                    {loading ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                    Add Line
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            Selected Items ({adjustmentLines.length})
                        </h3>
                        <div className="border rounded-md overflow-hidden bg-background">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[300px]">Item / Batch</TableHead>
                                        <TableHead className="text-right w-[100px]">System</TableHead>
                                        <TableHead className="text-right w-[120px]">Adj Qty</TableHead>
                                        <TableHead className="text-right w-[120px]">New Qty</TableHead>
                                        <TableHead>Remark</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {adjustmentLines.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground h-32">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Info className="h-8 w-8 opacity-20" />
                                                    <p>No items added to adjustment yet.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        adjustmentLines.map((line, idx) => (
                                            <TableRow key={idx} className="group transition-colors hover:bg-muted/30">
                                                <TableCell className="align-top">
                                                    <div className="font-medium">{line.itemName}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{line.sku}</div>
                                                    {line.batchNumber && (
                                                        <Badge variant="outline" className="mt-1 text-[10px] font-mono">
                                                            Batch: {line.batchNumber}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right align-top pt-4">
                                                    <span className="font-mono bg-muted px-2 py-1 rounded text-sm">
                                                        {line.systemQty}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right align-top">
                                                    <Input
                                                        type="number"
                                                        className="h-9 text-right font-mono"
                                                        value={line.adjustedQty}
                                                        onChange={(e) => updateLine(idx, "adjustedQty", e.target.value)}
                                                    />
                                                    <div className={`text-[10px] mt-1 ${line.adjustedQty > 0 ? 'text-green-600' : line.adjustedQty < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                        {line.adjustedQty > 0 ? `Increases stock by ${line.adjustedQty}` : line.adjustedQty < 0 ? `Decreases stock by ${Math.abs(line.adjustedQty)}` : 'No change'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right align-top">
                                                    <Input
                                                        type="number"
                                                        className="h-9 text-right font-mono font-bold"
                                                        value={line.newQty}
                                                        onChange={(e) => updateLine(idx, "newQty", e.target.value)}
                                                    />
                                                    <div className="text-[10px] mt-1 text-muted-foreground uppercase tracking-tighter">
                                                        Final Balance
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <Textarea
                                                        placeholder="Item specific remark..."
                                                        className="h-9 min-h-[36px] resize-none text-sm"
                                                        value={line.remark}
                                                        onChange={(e) => updateLine(idx, "remark", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="align-top pt-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => removeLine(idx)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 border-t gap-3 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} className="px-8 shadow-lg shadow-primary/20">
                        {loading ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Stock Adjustment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
