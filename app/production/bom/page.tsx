"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { usePagination } from "@/hooks/use-pagination"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ERPLayout } from "@/components/layouts/erp-layout"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
    bomsApi,
    bomItemsApi,
    itemsApi,
    locationsApi,
    type BOM,
    type BOMItem,
    type Item,
    type Location,
} from "@/lib/api"
import { Plus, Search, Edit, Trash2, Eye, Component, Package, Factory, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function BOMPage() {
    // State management
    const [boms, setBOMs] = useState<BOM[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [finishedGoods, setFinishedGoods] = useState<Item[]>([])
    const [rawMaterials, setRawMaterials] = useState<Item[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [bomItems, setBOMItems] = useState<BOMItem[]>([])
    const [loading, setLoading] = useState(true)

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState("")
    const [locationFilter, setLocationFilter] = useState<string>("all")
    const [itemFilter, setItemFilter] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<string>("all")

    // Modal state
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showViewDialog, setShowViewDialog] = useState(false)
    const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null)

    // Form state
    const [bomForm, setBOMForm] = useState({
        bomCode: "",
        itemId: "",
        locationId: "",
        qty: 1,
        version: "1.0",
        isActive: true,
    })

    // BOM Items management
    const [tempBOMItems, setTempBOMItems] = useState<BOMItem[]>([])
    const [newBOMItem, setNewBOMItem] = useState({
        itemId: "",
        quantity: 0,
        cost: 0,
        wastagePercentage: 0,
        sequence: 1,
        remark: "",
    })

    // Filter BOMs based on search and filters
    const filteredBOMs = useMemo(() => {
        if (!Array.isArray(boms)) {
            return []
        }

        return boms.filter((bom) => {
            const matchesSearch = searchTerm === "" ||
                bom.bomCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                bom.Item?.name.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesLocation = locationFilter === "all" || bom.locationId.toString() === locationFilter
            const matchesItem = itemFilter === "all" || bom.itemId.toString() === itemFilter
            const matchesStatus = statusFilter === "all" ||
                (statusFilter === "active" && bom.isActive) ||
                (statusFilter === "inactive" && !bom.isActive)

            return matchesSearch && matchesLocation && matchesItem && matchesStatus
        })
    }, [boms, searchTerm, locationFilter, itemFilter, statusFilter])

    // Pagination
    const {
        currentPage,
        itemsPerPage,
        totalPages,
        paginatedData: paginatedBOMs,
        handlePageChange,
        handleItemsPerPageChange,
        paginationProps,
    } = usePagination({
        data: filteredBOMs,
        initialItemsPerPage: 10,
    })

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                const [bomsResponse, itemsResponse, finishedGoodsResponse, rawMaterialsResponse, locationsResponse] = await Promise.all([
                    bomsApi.getAll(),
                    itemsApi.getAll(),
                    itemsApi.getFinishedGoods(),
                    itemsApi.getRawMaterials(),
                    locationsApi.getAll(),
                ])

                // Extract BOMs from wrapped response
                const bomsData = (bomsResponse as any)?.boms || bomsResponse
                setBOMs(Array.isArray(bomsData) ? bomsData : [])
                setItems(Array.isArray(itemsResponse) ? itemsResponse as Item[] : [])
                setFinishedGoods(Array.isArray(finishedGoodsResponse) ? finishedGoodsResponse as Item[] : [])
                setRawMaterials(Array.isArray(rawMaterialsResponse) ? rawMaterialsResponse as Item[] : [])
                setLocations(Array.isArray(locationsResponse) ? locationsResponse as Location[] : [])
            } catch (error) {
                console.error("Error loading data:", error)
                // Set empty arrays on error to prevent filter issues
                setBOMs([])
                setItems([])
                setFinishedGoods([])
                setRawMaterials([])
                setLocations([])
                toast({
                    title: "Error",
                    description: "Failed to load data. Please try again.",
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [])

    // Calculate summary statistics
    const summary = useMemo(() => {
        if (!Array.isArray(boms)) {
            return {
                total: 0,
                active: 0,
                inactive: 0,
                locations: 0,
                items: 0,
            }
        }

        const total = boms.length
        const active = boms.filter(b => b.isActive).length
        const locations = [...new Set(boms.map(b => b.locationId))].length
        const items = [...new Set(boms.map(b => b.itemId))].length

        return {
            total,
            active,
            inactive: total - active,
            locations,
            items,
        }
    }, [boms])

    const resetForm = () => {
        setBOMForm({
            bomCode: "",
            itemId: "",
            locationId: "",
            qty: 1,
            version: "1.0",
            isActive: true,
        })
        setTempBOMItems([])
    }

    const handleCreate = async () => {
        try {
            const bomData = {
                bomCode: bomForm.bomCode,
                itemId: parseInt(bomForm.itemId),
                locationId: parseInt(bomForm.locationId),
                qty: Number(bomForm.qty),
                version: bomForm.version,
                isActive: bomForm.isActive,
                items: tempBOMItems.map(item => ({
                    itemId: parseInt(item.itemId.toString()),
                    quantity: Number(item.quantity),
                    cost: Number(item.cost),
                    wastagePercentage: Number(item.wastagePercentage || 0),
                    sequence: item.sequence,
                    remark: item.remark,
                }))
            }

            const createdBOM = await bomsApi.create(bomData)
            setBOMs(prev => [...prev, createdBOM])
            setShowCreateDialog(false)
            resetForm()

            toast({
                title: "Success",
                description: "BOM created successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create BOM.",
                variant: "destructive",
            })
        }
    }

    const handleEdit = async () => {
        if (!selectedBOM) return

        try {
            const updatedBOM = await bomsApi.update(selectedBOM.id!, {
                bomCode: bomForm.bomCode,
                itemId: parseInt(bomForm.itemId),
                locationId: parseInt(bomForm.locationId),
                qty: bomForm.qty,
                version: bomForm.version,
                isActive: bomForm.isActive,
            })

            setBOMs(prev => prev.map(b => b.id === updatedBOM.id ? updatedBOM : b))
            setShowEditDialog(false)
            setSelectedBOM(null)
            resetForm()

            toast({
                title: "Success",
                description: "BOM updated successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update BOM.",
                variant: "destructive",
            })
        }
    }

    const handleDelete = async (bom: BOM) => {
        try {
            await bomsApi.remove(bom.id!)
            setBOMs(prev => prev.filter(b => b.id !== bom.id))

            toast({
                title: "Success",
                description: "BOM deleted successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete BOM.",
                variant: "destructive",
            })
        }
    }

    const handleView = async (bom: BOM) => {
        try {
            // Load BOM items
            const items = await bomItemsApi.getByBom(bom.id!)
            setBOMItems(items)
            setSelectedBOM(bom)
            setShowViewDialog(true)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load BOM details.",
                variant: "destructive",
            })
        }
    }

    const openEditDialog = (bom: BOM) => {
        setSelectedBOM(bom)
        setBOMForm({
            bomCode: bom.bomCode || "",
            itemId: bom.itemId.toString(),
            locationId: bom.locationId.toString(),
            qty: typeof bom.qty === 'string' ? parseFloat(bom.qty) : bom.qty,
            version: bom.version,
            isActive: bom.isActive,
        })
        setShowEditDialog(true)
    }

    const addBOMItem = () => {
        if (!newBOMItem.itemId || newBOMItem.quantity <= 0) {
            toast({
                title: "Error",
                description: "Please select a raw material and enter a valid quantity.",
                variant: "destructive",
            })
            return
        }

        const item = rawMaterials.find(i => i.id.toString() === newBOMItem.itemId)
        if (!item) return

        const bomItem: BOMItem = {
            id: Date.now(), // Temporary ID
            itemId: parseInt(newBOMItem.itemId),
            quantity: newBOMItem.quantity,
            cost: newBOMItem.cost,
            wastagePercentage: newBOMItem.wastagePercentage,
            sequence: newBOMItem.sequence,
            remark: newBOMItem.remark,
            Item: item,
        }

        setTempBOMItems(prev => [...prev, bomItem])
        setNewBOMItem({
            itemId: "",
            quantity: 0,
            cost: 0,
            wastagePercentage: 0,
            sequence: tempBOMItems.length + 2,
            remark: "",
        })
    }

    const removeBOMItem = (index: number) => {
        setTempBOMItems(prev => prev.filter((_, i) => i !== index))
    }

    if (loading) {
        return (
            <ERPLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">Loading...</div>
                </div>
            </ERPLayout>
        )
    }

    return (
        <ERPLayout>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">BOM</h1>
                        <p className="text-muted-foreground">Manage Bill of Materials</p>
                    </div>
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-9">
                                <Plus className="h-4 w-4 mr-1" />
                                Add BOM
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create New BOM</DialogTitle>
                                <DialogDescription>
                                    Create a new Bill of Materials with items and specifications.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">BOM Name *</Label>
                                        <Input
                                            id="name"
                                            value={bomForm.bomCode}
                                            onChange={(e) => setBOMForm(prev => ({ ...prev, bomCode: e.target.value }))}
                                            placeholder="e.g., Basic BOM for Product X"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="itemId">
                                            Finished Product * 
                                            <Badge variant="outline" className="ml-2 text-xs">
                                                <Package className="h-3 w-3 mr-1" />
                                                {finishedGoods.length} items
                                            </Badge>
                                        </Label>
                                        <Select
                                            value={bomForm.itemId}
                                            onValueChange={(value) => setBOMForm(prev => ({ ...prev, itemId: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select finished product" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {finishedGoods.map((item) => (
                                                    <SelectItem key={item.id} value={item.id.toString()}>
                                                        <div className="flex items-center space-x-2">
                                                            <Package className="h-4 w-4 text-green-600" />
                                                            <div className="flex-1">
                                                                <div className="font-medium">{item.name}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {item.barcode || 'N/A'} | Category: {item.Category?.name || 'N/A'}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {item.sellingPrice}
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="locationId">Location *</Label>
                                        <Select
                                            value={bomForm.locationId}
                                            onValueChange={(value) => setBOMForm(prev => ({ ...prev, locationId: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select location" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {locations.map((location) => (
                                                    <SelectItem key={location.id} value={location.id.toString()}>
                                                        {location.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="qty">Production Quantity *</Label>
                                        <Input
                                            id="qty"
                                            type="number"
                                            min="1"
                                            value={bomForm.qty}
                                            onChange={(e) => setBOMForm(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="version">Version</Label>
                                        <Input
                                            id="version"
                                            value={bomForm.version}
                                            onChange={(e) => setBOMForm(prev => ({ ...prev, version: e.target.value }))}
                                            placeholder="e.g., 1.0"
                                        />
                                    </div>

                                </div>
                            </div>

                            {/* BOM Items Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-medium">BOM Items</Label>
                                </div>

                                {/* Add BOM Item Form */}
                                <Card className="p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                                        <div>
                                            <Label className="text-xs flex items-center">
                                                Raw Material
                                                <Badge variant="secondary" className="ml-2 text-xs">
                                                    <Component className="h-3 w-3 mr-1" />
                                                    {rawMaterials.length}
                                                </Badge>
                                            </Label>
                                            <Select
                                                value={newBOMItem.itemId}
                                                onValueChange={(value) => setNewBOMItem(prev => ({ ...prev, itemId: value }))}
                                            >
                                                <SelectTrigger className="h-8">
                                                    <SelectValue placeholder="Select raw material" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {rawMaterials.map((item) => (
                                                        <SelectItem key={item.id} value={item.id.toString()}>
                                                            <div className="flex items-center space-x-2">
                                                                <Component className="h-4 w-4 text-orange-600" />
                                                                {item.image && (
                                                                    <img 
                                                                        src={item.image} 
                                                                        alt={item.name}
                                                                        className="w-6 h-6 rounded object-cover"
                                                                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                                    />
                                                                )}
                                                                <div className="flex-1">
                                                                    <div className="font-medium flex items-center space-x-1">
                                                                        <span>{item.name}</span>
                                                                        {item.allowsMinus && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                Minus OK
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {item.barcode || 'N/A'} | Unit: {item.unit} | {item.Category?.name || 'N/A'}
                                                                    </div>
                                                                </div>
                                                                {item.sellingPrice > 0 && (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {item.sellingPrice}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label className="text-xs">Qty Required</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={newBOMItem.quantity}
                                                onChange={(e) => setNewBOMItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                                                className="h-8"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs">Cost</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={newBOMItem.cost}
                                                onChange={(e) => setNewBOMItem(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                                                className="h-8"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs">Wastage %</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={newBOMItem.wastagePercentage}
                                                onChange={(e) => setNewBOMItem(prev => ({ ...prev, wastagePercentage: parseFloat(e.target.value) || 0 }))}
                                                className="h-8"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs">Sequence</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={newBOMItem.sequence}
                                                onChange={(e) => setNewBOMItem(prev => ({ ...prev, sequence: parseInt(e.target.value) || 1 }))}
                                                className="h-8"
                                            />
                                        </div>

                                        <Button
                                            onClick={addBOMItem}
                                            size="sm"
                                            className="h-8"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </Card>

                                {/* BOM Items List */}
                                {tempBOMItems.length > 0 && (
                                    <Card>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="h-8 px-3 text-xs">Item</TableHead>
                                                        <TableHead className="h-8 px-3 text-xs">Qty Required</TableHead>
                                                        <TableHead className="h-8 px-3 text-xs">Cost</TableHead>
                                                        <TableHead className="h-8 px-3 text-xs">Wastage %</TableHead>
                                                        <TableHead className="h-8 px-3 text-xs">Sequence</TableHead>
                                                        <TableHead className="h-8 px-3 text-xs text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {tempBOMItems.map((item, index) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="px-3 py-2">
                                                                <div className="flex items-center space-x-2">
                                                                    {item.Item?.image && (
                                                                        <img 
                                                                            src={item.Item.image} 
                                                                            alt={item.Item.name}
                                                                            className="w-6 h-6 rounded object-cover"
                                                                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                                        />
                                                                    )}
                                                                    <div>
                                                                        <div className="text-sm font-medium">{item.Item?.name}</div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {item.Item?.barcode || 'N/A'} | {item.Item?.Category?.name || 'N/A'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-3 py-2">
                                                                <div className="text-sm">{item.quantity}</div>
                                                            </TableCell>
                                                            <TableCell className="px-3 py-2">
                                                                <div className="text-sm">{Number(item.cost).toFixed(2)}</div>
                                                            </TableCell>
                                                            <TableCell className="px-3 py-2">
                                                                <div className="text-sm">{item.wastagePercentage}%</div>
                                                            </TableCell>
                                                            <TableCell className="px-3 py-2">
                                                                <div className="text-sm">{item.sequence}</div>
                                                            </TableCell>
                                                            <TableCell className="px-3 py-2 text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeBOMItem(index)}
                                                                    className="h-6 w-6 p-0 text-destructive"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowCreateDialog(false)
                                        resetForm()
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleCreate}>Create BOM</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 mb-4">
                    <Card className="p-3">
                        <CardContent className="p-0">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-blue-100 rounded-md">
                                    <Component className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Total BOMs</p>
                                    <p className="text-lg font-semibold">{summary.total}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-3">
                        <CardContent className="p-0">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-green-100 rounded-md">
                                    <Package className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Active</p>
                                    <p className="text-lg font-semibold text-green-600">{summary.active}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-3">
                        <CardContent className="p-0">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-gray-100 rounded-md">
                                    <Package className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Inactive</p>
                                    <p className="text-lg font-semibold text-gray-600">{summary.inactive}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-3">
                        <CardContent className="p-0">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-purple-100 rounded-md">
                                    <Factory className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Locations</p>
                                    <p className="text-lg font-semibold">{summary.locations}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-3">
                        <CardContent className="p-0">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-orange-100 rounded-md">
                                    <Package className="h-4 w-4 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">All Items</p>
                                    <p className="text-lg font-semibold">{items.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-3">
                        <CardContent className="p-0">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-emerald-100 rounded-md">
                                    <Package className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Finished Goods</p>
                                    <p className="text-lg font-semibold text-emerald-600">{finishedGoods.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-3">
                        <CardContent className="p-0">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-amber-100 rounded-md">
                                    <Component className="h-4 w-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Raw Materials</p>
                                    <p className="text-lg font-semibold text-amber-600">{rawMaterials.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters and Search */}
                <Card className="mb-4">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search BOMs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 h-9"
                                />
                            </div>

                            <Select value={locationFilter} onValueChange={setLocationFilter}>
                                <SelectTrigger className="w-40 h-8">
                                    <SelectValue placeholder="All Locations" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Locations</SelectItem>
                                    {locations.map((location) => (
                                        <SelectItem key={location.id} value={location.id.toString()}>
                                            {location.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={itemFilter} onValueChange={setItemFilter}>
                                <SelectTrigger className="w-40 h-8">
                                    <SelectValue placeholder="All Items" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Items</SelectItem>
                                    {items.map((item) => (
                                        <SelectItem key={item.id} value={item.id.toString()}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-32 h-8">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
   
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-10 px-3">BOM Name</TableHead>
                                    <TableHead className="h-10 px-3">Item</TableHead>
                                    <TableHead className="h-10 px-3">Location</TableHead>
                                    <TableHead className="h-10 px-3">Quantity</TableHead>
                                    <TableHead className="h-10 px-3">Version</TableHead>
                                    <TableHead className="h-10 px-3">Status</TableHead>
                                    <TableHead className="h-10 px-3">Description</TableHead>
                                    <TableHead className="h-10 px-3 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedBOMs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                            No BOMs found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedBOMs.map((bom) => (
                                        <TableRow key={bom.id} className="hover:bg-muted/50">
                                            <TableCell className="px-3 py-2">
                                                <div className="font-medium">{bom.bomCode}</div>
                                                {/* <div className="text-xs text-muted-foreground">{bom.bomCode}</div> */}
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <div className="flex items-center space-x-2">
                                                    {bom.Item?.image && (
                                                        <img 
                                                            src={bom.Item.image} 
                                                            alt={bom.Item.name}
                                                            className="w-8 h-8 rounded object-cover"
                                                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="font-medium">{bom.Item?.name || "Unknown Item"}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {bom.Item?.barcode || "N/A"} | {bom.Item?.Category?.name || "N/A"}
                                                        </div>
                                                        {bom.Item && (
                                                            <div className="flex items-center space-x-1 mt-1">
                                                                {!bom.Item.doNotAllowDirectSale && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        Direct Sale
                                                                    </Badge>
                                                                )}
                                                                {bom.Item.allowsMinus && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        Minus OK
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <div className="text-sm">{bom.Location?.name || "Unknown Location"}</div>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <div className="text-sm">{bom.qty}</div>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <Badge variant="outline" className="text-xs">
                                                    v{bom.version}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <Badge
                                                    variant={bom.isActive ? "default" : "secondary"}
                                                    className="text-xs"
                                                >
                                                    {bom.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <div className="text-sm text-muted-foreground max-w-48 truncate">
                                                    -
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-3 py-2 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleView(bom)}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openEditDialog(bom)}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem
                                                                    onSelect={(e) => e.preventDefault()}
                                                                    className="text-destructive"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Are you sure you want to delete BOM "{bom.bomCode || `BOM ${bom.id}`}"? This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDelete(bom)}
                                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                    >
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {filteredBOMs.length > 0 && (
                            <div className="px-4 py-3 border-t">
                                <PaginationControls {...paginationProps} />
                            </div>
                        )}
                    </CardContent>
                </Card>



                {/* Edit BOM Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit BOM</DialogTitle>
                            <DialogDescription>
                                Update BOM information.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">BOM Name *</Label>
                                <Input
                                    id="edit-name"
                                    value={bomForm.bomCode}
                                    onChange={(e) => setBOMForm(prev => ({ ...prev, bomCode: e.target.value }))}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-itemId">
                                    Finished Product *
                                    <Badge variant="outline" className="ml-2 text-xs">
                                        <Package className="h-3 w-3 mr-1" />
                                        {finishedGoods.length} items
                                    </Badge>
                                </Label>
                                <Select
                                    value={bomForm.itemId}
                                    onValueChange={(value) => setBOMForm(prev => ({ ...prev, itemId: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select finished product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {finishedGoods.map((item) => (
                                            <SelectItem key={item.id} value={item.id.toString()}>
                                                <div className="flex items-center space-x-2">
                                                    <Package className="h-4 w-4 text-green-600" />
                                                    <div className="flex-1">
                                                        <div className="font-medium">{item.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.barcode || 'N/A'} | Category: {item.Category?.name || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.sellingPrice}
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-locationId">Location *</Label>
                                <Select
                                    value={bomForm.locationId}
                                    onValueChange={(value) => setBOMForm(prev => ({ ...prev, locationId: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map((location) => (
                                            <SelectItem key={location.id} value={location.id.toString()}>
                                                {location.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-qty">Production Quantity *</Label>
                                <Input
                                    id="edit-qty"
                                    type="number"
                                    min="1"
                                    value={bomForm.qty}
                                    onChange={(e) => setBOMForm(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-version">Version</Label>
                                <Input
                                    id="edit-version"
                                    value={bomForm.version}
                                    onChange={(e) => setBOMForm(prev => ({ ...prev, version: e.target.value }))}
                                />
                            </div>



                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="edit-isActive"
                                    checked={bomForm.isActive}
                                    onCheckedChange={(checked) => setBOMForm(prev => ({ ...prev, isActive: checked }))}
                                />
                                <Label htmlFor="edit-isActive">Active</Label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowEditDialog(false)
                                    setSelectedBOM(null)
                                    resetForm()
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleEdit}>Update BOM</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View BOM Dialog */}
                <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>BOM Details</DialogTitle>
                            <DialogDescription>
                                View BOM information and items.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedBOM && (
                            <div className="space-y-6">
                                {/* BOM Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card className="p-4">
                                        <h4 className="font-medium mb-3">Basic Information</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">BOM Name:</span>
                                                <span className="font-medium">{selectedBOM.bomCode || `BOM ${selectedBOM.id}`}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Version:</span>
                                                <Badge variant="outline">v{selectedBOM.version}</Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Production Qty:</span>
                                                <span className="font-medium">{selectedBOM.qty}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Status:</span>
                                                <Badge variant={selectedBOM.isActive ? "default" : "secondary"}>
                                                    {selectedBOM.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="p-4">
                                        <h4 className="font-medium mb-3">Product & Location</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Finished Product:</span>
                                                <span className="font-medium">{selectedBOM.Item?.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Location:</span>
                                                <span className="font-medium">{selectedBOM.Location?.name}</span>
                                            </div>

                                        </div>
                                    </Card>
                                </div>

                                {/* BOM Items */}
                                <div>
                                    <h4 className="font-medium mb-3">BOM Items ({bomItems.length})</h4>
                                    {bomItems.length > 0 ? (
                                        <Card>
                                            <CardContent className="p-0">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="h-10 px-3">Item</TableHead>
                                                            <TableHead className="h-10 px-3">Required Qty</TableHead>
                                                            <TableHead className="h-10 px-3">Unit Cost</TableHead>
                                                            <TableHead className="h-10 px-3">Total Cost</TableHead>
                                                            <TableHead className="h-10 px-3">Wastage %</TableHead>
                                                            <TableHead className="h-10 px-3">Sequence</TableHead>
                                                            <TableHead className="h-10 px-3">Remark</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {bomItems.map((item) => (
                                                            <TableRow key={item.id}>
                                                                <TableCell className="px-3 py-2">
                                                                    <div className="flex items-center space-x-2">
                                                                        {item.Item?.image && (
                                                                            <img 
                                                                                src={item.Item.image} 
                                                                                alt={item.Item.name}
                                                                                className="w-8 h-8 rounded object-cover"
                                                                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                                            />
                                                                        )}
                                                                        <div>
                                                                            <div className="font-medium">{item.Item?.name}</div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {item.Item?.barcode || 'N/A'} | {item.Item?.Category?.name || 'N/A'}
                                                                            </div>
                                                                            {/* {item.Item?.barcode && (
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    Barcode: {item.Item.barcode}
                                                                                </div>
                                                                            )} */}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="px-3 py-2">
                                                                    <div className="text-sm">{item.quantity}</div>
                                                                </TableCell>
                                                                <TableCell className="px-3 py-2">
                                                                    <div className="text-sm">{Number(item.cost).toFixed(2)}</div>
                                                                </TableCell>
                                                                <TableCell className="px-3 py-2">
                                                                    <div className="text-sm font-medium">
                                                                        {(Number(item.quantity) * Number(item.cost)).toFixed(2)}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="px-3 py-2">
                                                                    <div className="text-sm">{item.wastagePercentage}%</div>
                                                                </TableCell>
                                                                <TableCell className="px-3 py-2">
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {item.sequence}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="px-3 py-2">
                                                                    <div className="text-sm text-muted-foreground max-w-32 truncate">
                                                                        {item.remark || "-"}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <Card className="p-8">
                                            <div className="text-center text-muted-foreground">
                                                No items found for this BOM
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowViewDialog(false)
                                    setSelectedBOM(null)
                                    setBOMItems([])
                                }}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ERPLayout>
    )
}