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
import { Plus, Trash2, Search, Package, Save, X, Info, RefreshCcw, ClipboardCheck } from "lucide-react"
import {
    locationsApi,
    storesApi,
    itemsApi,
    batchesApi,
    stockReconciliationApi,
    stockApi,
    type Location,
    type Store,
    type Item,
    type Batch,
    type StockReconciliation
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface CreateStockReconciliationFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    initialData?: StockReconciliation | null
}

interface ReconciliationItemLine {
    itemId: number
    batchId?: number
    itemName: string
    sku: string
    batchNumber?: string
    systemQty: number
    physicalQty: number
    adjustedQty: number
    remark: string
}

export function CreateStockReconciliationForm({ open, onOpenChange, onSuccess, initialData }: CreateStockReconciliationFormProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [locations, setLocations] = useState<Location[]>([])
    const [stores, setStores] = useState<Store[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [availableBatches, setAvailableBatches] = useState<Batch[]>([])

    // Form State
    const [locationId, setLocationId] = useState<string>("")
    const [storeId, setStoreId] = useState<string>("")
    const [reconciliationDate, setReconciliationDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
    const [notes, setNotes] = useState<string>("")
    const [lines, setLines] = useState<ReconciliationItemLine[]>([])

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

    const populateForm = (data: StockReconciliation) => {
        setLocationId(data.locationId.toString())
        setStoreId(data.storeId.toString())
        setReconciliationDate(format(new Date(data.reconciliationDate), "yyyy-MM-dd"))
        setNotes(data.notes || "")
        const apiItems = data.Items || []
        setLines(apiItems.map(item => {
            const sQty = typeof item.systemQty === 'string' ? parseFloat(item.systemQty) : item.systemQty
            const pQty = typeof item.physicalQty === 'string' ? parseFloat(item.physicalQty) : item.physicalQty
            return {
                itemId: item.itemId,
                batchId: item.batchId,
                itemName: item.Item?.name || "Unknown",
                sku: item.Item?.sku || "N/A",
                batchNumber: item.Batch?.batchNumber,
                systemQty: sQty,
                physicalQty: pQty,
                adjustedQty: pQty - sQty,
                remark: item.remark || ""
            }
        }))
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
            const response = await batchesApi.getAll({ page: 1, limit: 100 })
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
        setReconciliationDate(format(new Date(), "yyyy-MM-dd"))
        setNotes("")
        setLines([])
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

    const addLine = async () => {
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

        const existing = lines.find(line =>
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

            const stockData = await stockApi.getByItem(itemId)
            const storeStock = stockData.find(s => s.storeId === parseInt(storeId))

            if (selectedBatchId === "none") {
                systemQty = storeStock?.availableQty || 0
            } else {
                const batchId = parseInt(selectedBatchId)
                const batch = availableBatches.find(b => b.id === batchId)
                const batchItem = batch?.BatchItems?.find((bi: any) => bi.itemId === itemId)
                systemQty = batchItem?.availableQuantity || 0
            }

            const newLine: ReconciliationItemLine = {
                itemId,
                batchId: selectedBatchId === "none" ? undefined : parseInt(selectedBatchId),
                itemName: item.name,
                sku: item.sku,
                batchNumber: selectedBatchId === "none" ? undefined : availableBatches.find(b => b.id === parseInt(selectedBatchId))?.batchNumber,
                systemQty,
                physicalQty: systemQty,
                adjustedQty: 0,
                remark: ""
            }

            setLines([...lines, newLine])
            setSelectedItemId("")
            setSelectedBatchId("none")
            setSearchItemTerm("")
        } catch (error) {
            console.error("Error adding line:", error)
        } finally {
            setLoading(false)
        }
    }

    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index))
    }

    const updateLine = (index: number, field: keyof ReconciliationItemLine, value: any) => {
        const newLines = [...lines]
        const line = newLines[index]

        if (field === "physicalQty") {
            const pQty = parseFloat(value) || 0
            line.physicalQty = pQty
            line.adjustedQty = pQty - line.systemQty
        } else if (field === "adjustedQty") {
            const adj = parseFloat(value) || 0
            line.adjustedQty = adj
            line.physicalQty = line.systemQty + adj
        } else {
            (line as any)[field] = value
        }

        setLines(newLines)
    }

    const handleSubmit = async () => {
        if (!locationId || !storeId || lines.length === 0) {
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
                reconciliationDate: new Date(reconciliationDate).toISOString(),
                notes,
                items: lines.map(line => ({
                    itemId: line.itemId,
                    batchId: line.batchId || null,
                    systemQty: line.systemQty,
                    physicalQty: line.physicalQty,
                    remark: line.remark
                }))
            }

            if (initialData?.id) {
                await stockReconciliationApi.update(initialData.id, {
                    notes,
                    items: payload.items
                })
                toast({ title: "Success", description: "Reconciliation updated successfully" })
            } else {
                await stockReconciliationApi.create(payload)
                toast({ title: "Success", description: "Reconciliation created successfully" })
            }

            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error("Error submitting reconciliation:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to submit reconciliation",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchItemTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchItemTerm.toLowerCase())
    ).slice(0, 50)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <ClipboardCheck className="h-6 w-6 text-primary" /> {initialData ? "Edit" : "New"} Stock Reconciliation
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Location *</Label>
                            <Select value={locationId} onValueChange={setLocationId} disabled={!!initialData}>
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
                            <Select value={storeId} onValueChange={setStoreId} disabled={!!initialData}>
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
                                value={reconciliationDate}
                                onChange={(e) => setReconciliationDate(e.target.value)}
                                disabled={!!initialData}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            placeholder="Reason for reconciliation or other notes..."
                            className="resize-none h-20"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg border space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add Item
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
                                <Label className="text-xs">Select Batch</Label>
                                <Select value={selectedBatchId} onValueChange={setSelectedBatchId} disabled={!selectedItemId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="No Batch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Batch</SelectItem>
                                        {availableBatches.map(batch => (
                                            <SelectItem key={batch.id} value={batch.id!.toString()}>
                                                {batch.batchNumber}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-3">
                                <Button
                                    className="w-full"
                                    onClick={addLine}
                                    disabled={!selectedItemId || loading}
                                >
                                    {loading ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                    Add Line
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="border rounded-md overflow-hidden bg-background">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[300px]">Item / Batch</TableHead>
                                        <TableHead className="text-right w-[100px]">System</TableHead>
                                        <TableHead className="text-right w-[120px]">Adj Qty</TableHead>
                                        <TableHead className="text-right w-[120px]">Physical Qty</TableHead>
                                        <TableHead>Remark</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lines.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground h-32">
                                                No items added yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        lines.map((line, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <div className="font-medium">{line.itemName}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{line.sku}</div>
                                                    {line.batchNumber && (
                                                        <Badge variant="outline" className="mt-1 text-[10px]">Batch: {line.batchNumber}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{line.systemQty}</TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-right font-mono"
                                                        value={line.adjustedQty}
                                                        onChange={(e) => updateLine(idx, "adjustedQty", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-right font-mono font-bold"
                                                        value={line.physicalQty}
                                                        onChange={(e) => updateLine(idx, "physicalQty", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        placeholder="Remark"
                                                        className="h-8"
                                                        value={line.remark}
                                                        onChange={(e) => updateLine(idx, "remark", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLine(idx)}>
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
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        {initialData ? "Update" : "Save"} Stock Reconciliation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
