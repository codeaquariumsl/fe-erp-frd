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
    productionConfigsApi,
    locationsApi,
    storesApi,
    type ProductionConfig,
    type Location,
    type Store,
} from "@/lib/api"
import { Plus, Search, Edit, Trash2, Eye, Cog, Building2, Package, Factory, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function ProductionConfigsPage() {
    // State management
    const [configs, setConfigs] = useState<ProductionConfig[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [stores, setStores] = useState<Store[]>([])
    const [loading, setLoading] = useState(true)

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState("")
    const [locationFilter, setLocationFilter] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<string>("all")

    // Modal state
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showViewDialog, setShowViewDialog] = useState(false)
    const [selectedConfig, setSelectedConfig] = useState<ProductionConfig | null>(null)

    // Form state
    const [configForm, setConfigForm] = useState({
        locationId: "",
        rawMaterialStoreId: "",
        outputStoreId: "",
        finishedGoodsStoreId: "",  // Keep for backward compatibility
        wasteStoreId: "",          // Keep for backward compatibility
        description: "",
        isActive: true,
    })

    // Filter configs based on search and filters
    const filteredConfigs = useMemo(() => {
        if (!Array.isArray(configs)) {
            return []
        }

        return configs.filter((config) => {
            const matchesSearch = searchTerm === "" ||
                config.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                config.Location?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                config.RawMaterialStore?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                config.OutputStore?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                config.FinishedGoodsStore?.name.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesLocation = locationFilter === "all" || config.locationId.toString() === locationFilter
            const matchesStatus = statusFilter === "all" ||
                (statusFilter === "active" && config.isActive) ||
                (statusFilter === "inactive" && !config.isActive)

            return matchesSearch && matchesLocation && matchesStatus
        })
    }, [configs, searchTerm, locationFilter, statusFilter])

    // Pagination
    const {
        currentPage,
        itemsPerPage,
        totalPages,
        paginatedData: paginatedConfigs,
        handlePageChange,
        handleItemsPerPageChange,
        paginationProps,
    } = usePagination({
        data: filteredConfigs,
        initialItemsPerPage: 10,
    })

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                const [configsResponse, locationsResponse, storesResponse] = await Promise.all([
                    productionConfigsApi.getAll(),
                    locationsApi.getAll(),
                    storesApi.getAll(),
                ])

                // Extract configs from wrapped response
                const configsData = (configsResponse as any)?.productionConfigs || configsResponse
                setConfigs(Array.isArray(configsData) ? configsData : [])
                setLocations(Array.isArray(locationsResponse) ? locationsResponse as Location[] : [])
                setStores(Array.isArray(storesResponse) ? storesResponse as Store[] : [])
            } catch (error) {
                console.error("Error loading data:", error)
                toast({
                    title: "Error",
                    description: "Failed to load data. Please try again.",
                    variant: "destructive",
                })
                // Ensure arrays are set even on error to prevent filter errors
                setConfigs([])
                setLocations([])
                setStores([])
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [])

    // Calculate summary statistics
    const summary = useMemo(() => {
        if (!Array.isArray(configs)) {
            return { total: 0, active: 0, inactive: 0, locations: 0 }
        }

        const total = configs.length
        const active = configs.filter(c => c.isActive).length
        const locations = [...new Set(configs.map(c => c.locationId))].length

        return {
            total,
            active,
            inactive: total - active,
            locations,
        }
    }, [configs])

    const resetForm = () => {
        setConfigForm({
            locationId: "",
            rawMaterialStoreId: "",
            outputStoreId: "",
            finishedGoodsStoreId: "",
            wasteStoreId: "",
            description: "",
            isActive: true,
        })
    }

    const handleCreate = async () => {
        try {
            const configData = {
                locationId: parseInt(configForm.locationId),
                rawMaterialStoreId: parseInt(configForm.rawMaterialStoreId),
                outputStoreId: parseInt(configForm.outputStoreId || configForm.finishedGoodsStoreId),
                description: configForm.description,
                isActive: configForm.isActive,
            }

            const createdConfig = await productionConfigsApi.create(configData)
            setConfigs(prev => [...prev, createdConfig])
            setShowCreateDialog(false)
            resetForm()

            toast({
                title: "Success",
                description: "Production config created successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create production config.",
                variant: "destructive",
            })
        }
    }

    const handleEdit = async () => {
        if (!selectedConfig) return

        try {
            const updatedConfig = await productionConfigsApi.update(selectedConfig.id!, {
                locationId: parseInt(configForm.locationId),
                rawMaterialStoreId: parseInt(configForm.rawMaterialStoreId),
                outputStoreId: parseInt(configForm.outputStoreId || configForm.finishedGoodsStoreId),
                description: configForm.description,
                isActive: configForm.isActive,
            })

            setConfigs(prev => prev.map(c => c.id === updatedConfig.id ? updatedConfig : c))
            setShowEditDialog(false)
            setSelectedConfig(null)
            resetForm()

            toast({
                title: "Success",
                description: "Production config updated successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update production config.",
                variant: "destructive",
            })
        }
    }

    const handleDelete = async (config: ProductionConfig) => {
        try {
            await productionConfigsApi.remove(config.id!)
            setConfigs(prev => prev.filter(c => c.id !== config.id))

            toast({
                title: "Success",
                description: "Production config deleted successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete production config.",
                variant: "destructive",
            })
        }
    }

    const openEditDialog = (config: ProductionConfig) => {
        setSelectedConfig(config)
        setConfigForm({
            locationId: config.locationId.toString(),
            rawMaterialStoreId: config.rawMaterialStoreId.toString(),
            outputStoreId: (config.outputStoreId || config.finishedGoodsStoreId)?.toString() || "",
            finishedGoodsStoreId: config.finishedGoodsStoreId?.toString() || "",
            wasteStoreId: config.wasteStoreId?.toString() || "",
            description: config.description || "",
            isActive: config.isActive,
        })
        setShowEditDialog(true)
    }

    const handleView = (config: ProductionConfig) => {
        setSelectedConfig(config)
        setShowViewDialog(true)
    }

    // Get stores by location for filtering
    const getStoresByLocation = (locationId: string) => {
        if (!Array.isArray(stores)) return []
        if (!locationId) return stores
        return stores.filter(store => store.locationId.toString() === locationId)
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
                        <h1 className="text-3xl font-bold">Production Configs</h1>
                        <p className="text-muted-foreground">Manage Production Configurations</p>
                    </div>
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-9">
                                <Plus className="h-4 w-4 mr-1" />
                                Add Config
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Production Config</DialogTitle>
                                <DialogDescription>
                                    Set up production configuration for a location with store assignments.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="locationId">Location *</Label>
                                    <Select
                                        value={configForm.locationId}
                                        onValueChange={(value) => {
                                            setConfigForm(prev => ({
                                                ...prev,
                                                locationId: value,
                                                // Reset store selections when location changes
                                                rawMaterialStoreId: "",
                                                outputStoreId: "",
                                                finishedGoodsStoreId: "",
                                                wasteStoreId: "",
                                            }))
                                        }}
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
                                    <Label htmlFor="rawMaterialStoreId">Raw Material Store *</Label>
                                    <Select
                                        value={configForm.rawMaterialStoreId}
                                        onValueChange={(value) => setConfigForm(prev => ({ ...prev, rawMaterialStoreId: value }))}
                                        disabled={!configForm.locationId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select raw material store" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getStoresByLocation(configForm.locationId).map((store) => (
                                                <SelectItem key={store.id} value={store.id.toString()}>
                                                    {store.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="outputStoreId">Output Store *</Label>
                                    <Select
                                        value={configForm.outputStoreId || configForm.finishedGoodsStoreId}
                                        onValueChange={(value) => setConfigForm(prev => ({
                                            ...prev,
                                            outputStoreId: value,
                                            finishedGoodsStoreId: value  // Keep for compatibility
                                        }))}
                                        disabled={!configForm.locationId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select output store" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getStoresByLocation(configForm.locationId).map((store) => (
                                                <SelectItem key={store.id} value={store.id.toString()}>
                                                    {store.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={configForm.description}
                                        onChange={(e) => setConfigForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Production configuration description..."
                                        rows={3}
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="isActive"
                                        checked={configForm.isActive}
                                        onCheckedChange={(checked) => setConfigForm(prev => ({ ...prev, isActive: checked }))}
                                    />
                                    <Label htmlFor="isActive">Active</Label>
                                </div>
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
                                <Button onClick={handleCreate}>Create Config</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Configs Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-10 px-3">Location</TableHead>
                                    <TableHead className="h-10 px-3">Raw Material Store</TableHead>
                                    <TableHead className="h-10 px-3">Output Store</TableHead>
                                    <TableHead className="h-10 px-3">Status</TableHead>
                                    <TableHead className="h-10 px-3">Description</TableHead>
                                    <TableHead className="h-10 px-3 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedConfigs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            No production configs found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedConfigs.map((config) => (
                                        <TableRow key={config.id} className="hover:bg-muted/50">
                                            <TableCell className="px-3 py-2">
                                                <div className="font-medium">{config.Location?.name || "Unknown Location"}</div>
                                                <div className="text-xs text-muted-foreground">ID: {config.locationId}</div>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <div className="text-sm">{config.RawMaterialStore?.name || "Unknown Store"}</div>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <div className="text-sm">{config.OutputStore?.name || config.FinishedGoodsStore?.name || "Unknown Store"}</div>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <Badge
                                                    variant={config.isActive ? "default" : "secondary"}
                                                    className="text-xs"
                                                >
                                                    {config.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <div className="text-sm text-muted-foreground max-w-48 truncate">
                                                    {config.description || "-"}
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
                                                        <DropdownMenuItem onClick={() => handleView(config)}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openEditDialog(config)}>
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
                                                                        Are you sure you want to delete this production config? This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDelete(config)}
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
                        {filteredConfigs.length > 0 && (
                            <div className="px-4 py-3 border-t">
                                <PaginationControls {...paginationProps} />
                            </div>
                        )}
                    </CardContent>
                </Card>



                {/* Edit Config Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Production Config</DialogTitle>
                            <DialogDescription>
                                Update production configuration settings.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-locationId">Location *</Label>
                                <Select
                                    value={configForm.locationId}
                                    onValueChange={(value) => {
                                        setConfigForm(prev => ({
                                            ...prev,
                                            locationId: value,
                                            // Reset store selections when location changes
                                            rawMaterialStoreId: "",
                                            outputStoreId: "",
                                            finishedGoodsStoreId: "",
                                            wasteStoreId: "",
                                        }))
                                    }}
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
                                <Label htmlFor="edit-rawMaterialStoreId">Raw Material Store *</Label>
                                <Select
                                    value={configForm.rawMaterialStoreId}
                                    onValueChange={(value) => setConfigForm(prev => ({ ...prev, rawMaterialStoreId: value }))}
                                    disabled={!configForm.locationId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select raw material store" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getStoresByLocation(configForm.locationId).map((store) => (
                                            <SelectItem key={store.id} value={store.id.toString()}>
                                                {store.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-outputStoreId">Output Store *</Label>
                                <Select
                                    value={configForm.outputStoreId || configForm.finishedGoodsStoreId}
                                    onValueChange={(value) => setConfigForm(prev => ({
                                        ...prev,
                                        outputStoreId: value,
                                        finishedGoodsStoreId: value  // Keep for compatibility
                                    }))}
                                    disabled={!configForm.locationId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select output store" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getStoresByLocation(configForm.locationId).map((store) => (
                                            <SelectItem key={store.id} value={store.id.toString()}>
                                                {store.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    value={configForm.description}
                                    onChange={(e) => setConfigForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Production configuration description..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="edit-isActive"
                                    checked={configForm.isActive}
                                    onCheckedChange={(checked) => setConfigForm(prev => ({ ...prev, isActive: checked }))}
                                />
                                <Label htmlFor="edit-isActive">Active</Label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowEditDialog(false)
                                    setSelectedConfig(null)
                                    resetForm()
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleEdit}>Update Config</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View Config Dialog */}
                <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Production Config Details</DialogTitle>
                            <DialogDescription>
                                View production configuration information.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedConfig && (
                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card className="p-4">
                                        <h4 className="font-medium mb-3">Location & Status</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Location:</span>
                                                <span className="font-medium">{selectedConfig.Location?.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Status:</span>
                                                <Badge variant={selectedConfig.isActive ? "default" : "secondary"}>
                                                    {selectedConfig.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Created:</span>
                                                <span className="text-xs">
                                                    {selectedConfig.createdAt ? new Date(selectedConfig.createdAt).toLocaleDateString() : "N/A"}
                                                </span>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="p-4">
                                        <h4 className="font-medium mb-3">Store Configuration</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Raw Material:</span>
                                                <span className="font-medium text-right max-w-32 truncate">
                                                    {selectedConfig.RawMaterialStore?.name}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Output Store:</span>
                                                <span className="font-medium text-right max-w-32 truncate">
                                                    {selectedConfig.OutputStore?.name || selectedConfig.FinishedGoodsStore?.name}
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                {/* Description */}
                                {selectedConfig.description && (
                                    <div>
                                        <h4 className="font-medium mb-2">Description</h4>
                                        <Card className="p-4">
                                            <p className="text-sm text-muted-foreground">
                                                {selectedConfig.description}
                                            </p>
                                        </Card>
                                    </div>
                                )}

                                {/* Store Details */}
                                <div>
                                    <h4 className="font-medium mb-3">Store Details</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {/* Raw Material Store */}
                                        <Card className="p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className="p-1.5 bg-orange-100 rounded-md">
                                                        <Package className="h-3 w-3 text-orange-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">Raw Material Store</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {selectedConfig.RawMaterialStore?.name}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Capacity</p>
                                                    <p className="text-sm">{selectedConfig.RawMaterialStore?.capacity || "-"}</p>
                                                </div>
                                            </div>
                                        </Card>

                                        {/* Output Store */}
                                        <Card className="p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className="p-1.5 bg-green-100 rounded-md">
                                                        <Package className="h-3 w-3 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">Output Store</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {selectedConfig.OutputStore?.name || selectedConfig.FinishedGoodsStore?.name}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Capacity</p>
                                                    <p className="text-sm">{(selectedConfig.OutputStore || selectedConfig.FinishedGoodsStore)?.capacity || "-"}</p>
                                                </div>
                                            </div>
                                        </Card>


                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowViewDialog(false)
                                    setSelectedConfig(null)
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