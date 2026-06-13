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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
    productionOrdersApi,
    bomsApi,
    itemsApi,
    locationsApi,
    type ProductionOrder,
    type ProductionOrderItem,
    type ProductionOrderItemDetailed,
    type BOM,
    type Item,
    type Location,
} from "@/lib/api"
import { Plus, Search, Edit, Trash2, Eye, CalendarIcon, ListOrdered, Clock, AlertTriangle, MoreHorizontal, Play, Pause, CheckCircle, XCircle, Package } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Utility function to safely format dates
const safeFormatDate = (date: string | Date | null | undefined, formatString: string = "MMM dd, yyyy"): string => {
    if (!date) return "Not set"
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return "Invalid date"
    return format(dateObj, formatString)
}

export default function ProductionOrdersPage() {
    // State management
    const [orders, setOrders] = useState<ProductionOrder[]>([])
    const [boms, setBOMs] = useState<BOM[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [finishedGoods, setFinishedGoods] = useState<Item[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [priorityFilter, setPriorityFilter] = useState<string>("all")
    const [locationFilter, setLocationFilter] = useState<string>("all")
    const [itemFilter, setItemFilter] = useState<string>("all")

    // Modal state
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showViewDialog, setShowViewDialog] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)

    // Form state
    const [orderForm, setOrderForm] = useState({
        orderNumber: "",
        itemId: "",
        bomId: "",
        locationId: "",
        plannedQuantity: 1,
        actualQuantity: 0,
        plannedStartDate: new Date(),
        plannedEndDate: new Date(),
        actualStartDate: null as Date | null,
        actualEndDate: null as Date | null,
        priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        notes: "",
    })

    // BOM details state
    const [selectedBomDetails, setSelectedBomDetails] = useState<BOM | null>(null)
    const [bomCalculations, setBomCalculations] = useState<{
        itemId: number
        itemName: string
        bomQuantity: number
        calculatedQuantity: number
        cost: number
        unit: string
        wastagePercentage: number
        wastageQuantity: number
        sequence: number
        remark: string
    }[]>([])

    // Status management
    const [showStatusDialog, setShowStatusDialog] = useState(false)
    const [statusForm, setStatusForm] = useState({
        status: "PENDING" as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD",
        actualStartDate: null as Date | null,
        actualEndDate: null as Date | null,
        actualQuantity: 0,
    })

    // Priority colors
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "LOW": return "bg-gray-100 text-gray-800"
            case "MEDIUM": return "bg-blue-100 text-blue-800"
            case "HIGH": return "bg-orange-100 text-orange-800"
            case "URGENT": return "bg-red-100 text-red-800"
            default: return "bg-gray-100 text-gray-800"
        }
    }

    // Status colors
    const getStatusColor = (status: string) => {
        switch (status) {
            case "PENDING": return "bg-yellow-100 text-yellow-800"
            case "IN_PROGRESS": return "bg-blue-100 text-blue-800"
            case "COMPLETED": return "bg-green-100 text-green-800"
            case "CANCELLED": return "bg-red-100 text-red-800"
            case "ON_HOLD": return "bg-gray-100 text-gray-800"
            default: return "bg-gray-100 text-gray-800"
        }
    }

    // Filter orders based on search and filters
    const filteredOrders = useMemo(() => {
        if (!Array.isArray(orders)) {
            return []
        }

        return orders.filter((order) => {
            const matchesSearch = searchTerm === "" ||
                (order.code && order.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (order.orderNumber && order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                order.Item?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.notes?.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesStatus = statusFilter === "all" ||
                order.status === statusFilter ||
                order.status === statusFilter.toLowerCase() ||
                (statusFilter === "PENDING" && order.status === "planned") ||
                (statusFilter === "IN_PROGRESS" && order.status === "in_progress") ||
                (statusFilter === "COMPLETED" && order.status === "completed") ||
                (statusFilter === "CANCELLED" && order.status === "cancelled") ||
                (statusFilter === "ON_HOLD" && order.status === "on_hold")
            const matchesPriority = priorityFilter === "all" ||
                order.priority === priorityFilter ||
                order.priority === priorityFilter.toLowerCase()
            const matchesLocation = locationFilter === "all" || order.locationId.toString() === locationFilter
            const matchesItem = itemFilter === "all" || order.itemId.toString() === itemFilter

            return matchesSearch && matchesStatus && matchesPriority && matchesLocation && matchesItem
        })
    }, [orders, searchTerm, statusFilter, priorityFilter, locationFilter, itemFilter])  // Pagination
    const {
        currentPage,
        itemsPerPage,
        totalPages,
        paginatedData: paginatedOrders,
        handlePageChange,
        handleItemsPerPageChange,
        paginationProps,
    } = usePagination({
        data: filteredOrders,
        initialItemsPerPage: 10,
    })

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                const [ordersResponse, bomsResponse, itemsResponse, finishedGoodsResponse, locationsResponse] = await Promise.all([
                    productionOrdersApi.getAll(),
                    bomsApi.getAll(),
                    itemsApi.getAll(),
                    itemsApi.getFinishedGoods(),
                    locationsApi.getAll(),
                ])
                const ordersData = (ordersResponse as any)?.productionOrders || ordersResponse
                const bomsData = (bomsResponse as any)?.boms || bomsResponse
                setOrders(Array.isArray(ordersData) ? ordersData : [])
                setBOMs(Array.isArray(bomsData) ? bomsData : [])
                setItems(Array.isArray(itemsResponse) ? itemsResponse as Item[] : [])
                setFinishedGoods(Array.isArray(finishedGoodsResponse) ? finishedGoodsResponse as Item[] : [])
                setLocations(Array.isArray(locationsResponse) ? locationsResponse as Location[] : [])
            } catch (error) {
                console.error("Error loading data:", error)
                toast({
                    title: "Error",
                    description: "Failed to load data. Please try again.",
                    variant: "destructive",
                })
                // Ensure arrays are set even on error to prevent filter errors
                setOrders([])
                setBOMs([])
                setItems([])
                setFinishedGoods([])
                setLocations([])
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [])

    // Calculate summary statistics
    const summary = useMemo(() => {
        const total = orders.length
        const pending = orders.filter(o =>
            o.status === "PENDING" || o.status === "planned"
        ).length
        const inProgress = orders.filter(o =>
            o.status === "IN_PROGRESS" || o.status === "in_progress"
        ).length
        const completed = orders.filter(o =>
            o.status === "COMPLETED" || o.status === "completed"
        ).length
        const urgent = orders.filter(o =>
            o.priority === "URGENT" || o.priority === "urgent"
        ).length

        return {
            total,
            pending,
            inProgress,
            completed,
            urgent,
        }
    }, [orders])

    const resetForm = () => {
        setOrderForm({
            orderNumber: "",
            itemId: "",
            bomId: "",
            locationId: "",
            plannedQuantity: 1,
            actualQuantity: 0,
            plannedStartDate: new Date(),
            plannedEndDate: new Date(),
            actualStartDate: null,
            actualEndDate: null,
            priority: "MEDIUM",
            notes: "",
        })
        setSelectedBomDetails(null)
        setBomCalculations([])
    }

    // Load BOM details when BOM is selected
    const loadBomDetails = async (bomId: string) => {
        if (!bomId) {
            setSelectedBomDetails(null)
            setBomCalculations([])
            return
        }

        try {
            const bomDetails = await bomsApi.getById(bomId)
            setSelectedBomDetails(bomDetails)
            calculateBomQuantities(bomDetails, orderForm.plannedQuantity)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load BOM details.",
                variant: "destructive",
            })
        }
    }

    // Calculate BOM item quantities based on planned quantity
    const calculateBomQuantities = (bomDetails: BOM, plannedQuantity: number) => {
        if (!bomDetails.BOMItems || bomDetails.BOMItems.length === 0) {
            setBomCalculations([])
            return
        }

        const calculations = bomDetails.BOMItems.map((bomItem, index) => {
            const bomQuantity = typeof bomItem.quantity === 'string' ?
                parseFloat(bomItem.quantity) : bomItem.quantity
            const calculatedQuantity = bomQuantity * plannedQuantity
            const cost = typeof bomItem.cost === 'string' ?
                parseFloat(bomItem.cost) : bomItem.cost || 0
            const wastagePercentage = typeof bomItem.wastagePercentage === 'string' ?
                parseFloat(bomItem.wastagePercentage) : bomItem.wastagePercentage || 0
            const wastageQuantity = (calculatedQuantity * wastagePercentage) / 100

            return {
                itemId: bomItem.itemId,
                itemName: bomItem.Item?.name || `Item ${bomItem.itemId}`,
                bomQuantity,
                calculatedQuantity,
                cost,
                unit: bomItem.unit || 'kg',
                wastagePercentage,
                wastageQuantity,
                sequence: bomItem.sequence || index + 1,
                remark: bomItem.remark || `Required for production`,
            }
        })

        setBomCalculations(calculations)
    }

    const generateOrderNumber = () => {
        const today = new Date()
        const dateStr = format(today, "yyyyMMdd")
        const timeStr = format(today, "HHmmss")
        return `PO-${dateStr}-${timeStr}`
    }

    const handleCreate = async () => {
        try {
            const productionOrderItems = bomCalculations.map((calc) => ({
                itemId: calc.itemId,
                quantity: calc.calculatedQuantity,
                unit: calc.unit,
                cost: calc.cost,
                remark: calc.remark,
                sequence: calc.sequence,
                wastageQuantity: calc.wastageQuantity,
                status: "pending"
            }))

            const orderData = {
                itemId: parseInt(orderForm.itemId),
                bomId: parseInt(orderForm.bomId),
                plannedQuantity: orderForm.plannedQuantity,
                plannedStartDate: orderForm.plannedStartDate.toISOString(),
                locationId: parseInt(orderForm.locationId),
                productionOrderItems: productionOrderItems
            }

            const createdOrder = await productionOrdersApi.create(orderData)
            setOrders(prev => [...prev, createdOrder])
            setShowCreateDialog(false)
            resetForm()

            toast({
                title: "Success",
                description: "Production order created successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create production order.",
                variant: "destructive",
            })
        }
    }

    const handleEdit = async () => {
        if (!selectedOrder) return

        try {
            const updatedOrder = await productionOrdersApi.update(selectedOrder.id!, {
                code: orderForm.orderNumber,
                itemId: parseInt(orderForm.itemId),
                bomId: parseInt(orderForm.bomId),
                locationId: parseInt(orderForm.locationId),
                plannedQuantity: orderForm.plannedQuantity.toString(),
                produceQuantity: orderForm.actualQuantity?.toString(),
                startDate: orderForm.plannedStartDate.toISOString(),
                endDate: orderForm.plannedEndDate.toISOString(),
                actualStartDate: orderForm.actualStartDate?.toISOString(),
                actualEndDate: orderForm.actualEndDate?.toISOString(),
                priority: orderForm.priority.toLowerCase() as "low" | "medium" | "high" | "urgent",
                notes: orderForm.notes,
            })

            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
            setShowEditDialog(false)
            setSelectedOrder(null)
            resetForm()

            toast({
                title: "Success",
                description: "Production order updated successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update production order.",
                variant: "destructive",
            })
        }
    }

    const handleStatusUpdate = async () => {
        if (!selectedOrder) return

        try {
            const updatedOrder = await productionOrdersApi.updateStatus(selectedOrder.id!, {
                status: statusForm.status,
                actualStartDate: statusForm.actualStartDate?.toISOString(),
                actualEndDate: statusForm.actualEndDate?.toISOString(),
                actualQuantity: statusForm.actualQuantity,
            })

            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
            setShowStatusDialog(false)
            setSelectedOrder(null)

            toast({
                title: "Success",
                description: "Production order status updated successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update status.",
                variant: "destructive",
            })
        }
    }

    const handleDelete = async (order: ProductionOrder) => {
        try {
            await productionOrdersApi.remove(order.id!)
            setOrders(prev => prev.filter(o => o.id !== order.id))

            toast({
                title: "Success",
                description: "Production order deleted successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete production order.",
                variant: "destructive",
            })
        }
    }

    const openEditDialog = (order: ProductionOrder) => {
        setSelectedOrder(order)
        setOrderForm({
            orderNumber: (order.code || order.orderNumber) ?? "",
            itemId: order.itemId.toString(),
            bomId: order.bomId.toString(),
            locationId: order.locationId.toString(),
            plannedQuantity: typeof order.plannedQuantity === 'string' ? parseFloat(order.plannedQuantity) || 0 : order.plannedQuantity || 0,
            actualQuantity: (order.produceQuantity ? (typeof order.produceQuantity === 'string' ? parseFloat(order.produceQuantity) : order.produceQuantity) : order.actualQuantity) || 0,
            plannedStartDate: (() => {
                const dateStr = order.startDate || order.plannedStartDate;
                return dateStr && !isNaN(new Date(dateStr).getTime()) ? new Date(dateStr) : new Date();
            })(),
            plannedEndDate: (() => {
                const dateStr = order.endDate || order.plannedEndDate;
                return dateStr && !isNaN(new Date(dateStr).getTime()) ? new Date(dateStr) : new Date();
            })(),
            actualStartDate: order.actualStartDate && !isNaN(new Date(order.actualStartDate).getTime())
                ? new Date(order.actualStartDate)
                : null,
            actualEndDate: order.actualEndDate && !isNaN(new Date(order.actualEndDate).getTime())
                ? new Date(order.actualEndDate)
                : null,
            priority: (order.priority?.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "URGENT") || "MEDIUM",
            notes: order.notes || "",
        })
        // Load BOM details for editing
        if (order.bomId) {
            loadBomDetails(order.bomId.toString())
        }
        setShowEditDialog(true)
    }

    const openStatusDialog = (order: ProductionOrder) => {
        setSelectedOrder(order)
        setStatusForm({
            status: (order.status === "planned" ? "PENDING" :
                order.status === "in_progress" ? "IN_PROGRESS" :
                    order.status === "completed" ? "COMPLETED" :
                        order.status === "cancelled" ? "CANCELLED" :
                            order.status === "on_hold" ? "ON_HOLD" :
                                order.status as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD") || "PENDING",
            actualStartDate: order.actualStartDate && !isNaN(new Date(order.actualStartDate).getTime())
                ? new Date(order.actualStartDate)
                : null,
            actualEndDate: order.actualEndDate && !isNaN(new Date(order.actualEndDate).getTime())
                ? new Date(order.actualEndDate)
                : null,
            actualQuantity: (order.produceQuantity ? (typeof order.produceQuantity === 'string' ? parseFloat(order.produceQuantity) : order.produceQuantity) : order.actualQuantity) || 0,
        })
        setShowStatusDialog(true)
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
                        <h1 className="text-3xl font-bold">Production Orders</h1>
                        <p className="text-muted-foreground">Manage Production orders</p>
                    </div>
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-9">
                                <Plus className="h-4 w-4 mr-1" />
                                Add Order
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create Production Order</DialogTitle>
                                <DialogDescription>
                                    Create a new production order for manufacturing.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="orderNumber">Order Number</Label>
                                        <Input
                                            id="orderNumber"
                                            value={orderForm.orderNumber}
                                            onChange={(e) => setOrderForm(prev => ({ ...prev, orderNumber: e.target.value }))}
                                            placeholder="Auto-generated if empty"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="itemId">
                                            Product to Manufacture *
                                            <Badge variant="outline" className="ml-2 text-xs">
                                                <Package className="h-3 w-3 mr-1" />
                                                {finishedGoods.length} products
                                            </Badge>
                                        </Label>
                                        <Select
                                            value={orderForm.itemId}
                                            onValueChange={(value) => setOrderForm(prev => ({ ...prev, itemId: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select finished product" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {finishedGoods.map((item) => (
                                                    <SelectItem key={item.id} value={item.id.toString()}>
                                                        <div className="flex items-center space-x-2">
                                                            <Package className="h-4 w-4 text-green-600" />
                                                            {item.image && (
                                                                <img 
                                                                    src={item.image} 
                                                                    alt={item.name}
                                                                    className="w-6 h-6 rounded object-cover"
                                                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                                />
                                                            )}
                                                            <div className="flex-1">
                                                                <div className="font-medium">{item.name}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {item.barcode || 'N/A'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="bomId">BOM *</Label>
                                        <Select
                                            value={orderForm.bomId}
                                            onValueChange={(value) => {
                                                setOrderForm(prev => ({ ...prev, bomId: value }))
                                                loadBomDetails(value)
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select BOM" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {boms.filter(bom => bom.itemId.toString() === orderForm.itemId).map((bom) => (
                                                    <SelectItem key={bom.id} value={bom.id!.toString()}>
                                                        {bom.bomCode || `BOM ${bom.id}`} - v{bom.version}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="locationId">Location *</Label>
                                        <Select
                                            value={orderForm.locationId}
                                            onValueChange={(value) => setOrderForm(prev => ({ ...prev, locationId: value }))}
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
                                        <Label htmlFor="plannedQuantity">Planned Quantity *</Label>
                                        <Input
                                            id="plannedQuantity"
                                            type="number"
                                            min="1"
                                            value={orderForm.plannedQuantity}
                                            onChange={(e) => {
                                                const quantity = parseInt(e.target.value) || 1
                                                setOrderForm(prev => ({ ...prev, plannedQuantity: quantity }))
                                                if (selectedBomDetails) {
                                                    calculateBomQuantities(selectedBomDetails, quantity)
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="priority">Priority *</Label>
                                        <Select
                                            value={orderForm.priority}
                                            onValueChange={(value: "LOW" | "MEDIUM" | "HIGH" | "URGENT") => setOrderForm(prev => ({ ...prev, priority: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="LOW">Low</SelectItem>
                                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                                <SelectItem value="HIGH">High</SelectItem>
                                                <SelectItem value="URGENT">Urgent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Planned Start Date *</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "justify-start text-left font-normal",
                                                        !orderForm.plannedStartDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {orderForm.plannedStartDate ? (
                                                        safeFormatDate(orderForm.plannedStartDate, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={orderForm.plannedStartDate}
                                                    onSelect={(date) => date && setOrderForm(prev => ({ ...prev, plannedStartDate: date }))}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Planned End Date *</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "justify-start text-left font-normal",
                                                        !orderForm.plannedEndDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {orderForm.plannedEndDate ? (
                                                        safeFormatDate(orderForm.plannedEndDate, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={orderForm.plannedEndDate}
                                                    onSelect={(date) => date && setOrderForm(prev => ({ ...prev, plannedEndDate: date }))}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>


                                    <div className="col-span-full">
                                        <div className="grid gap-2">
                                            <Label htmlFor="notes">Notes</Label>
                                            <Textarea
                                                id="notes"
                                                value={orderForm.notes}
                                                onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                                                placeholder="Production notes..."
                                                rows={3}
                                            />
                                        </div>
                                    </div>

                                    {/* BOM Items Display */}
                                    {selectedBomDetails && bomCalculations.length > 0 && (
                                        <div className="col-span-full">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm font-medium">BOM Items Required</Label>
                                                    <Badge variant="outline">
                                                        {selectedBomDetails.bomCode || `BOM ${selectedBomDetails.id}`} v{selectedBomDetails.version}
                                                    </Badge>
                                                </div>
                                                <Card>
                                                    <CardContent className="p-4">
                                                        <div className="space-y-2">
                                                            <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                                                                <div>Item Name</div>
                                                                <div className="text-right">BOM Qty</div>
                                                                <div className="text-right">Unit</div>
                                                                <div className="text-right">Total Required</div>
                                                                <div className="text-right">Wastage</div>
                                                                <div className="text-right">Cost</div>
                                                            </div>
                                                            {bomCalculations.map((calc, index) => (
                                                                <div key={index} className="grid grid-cols-6 gap-2 text-sm py-2 border-b last:border-b-0">
                                                                    <div className="font-medium">{calc.itemName}</div>
                                                                    <div className="text-right text-muted-foreground">
                                                                        {calc.bomQuantity.toFixed(2)}
                                                                    </div>
                                                                    <div className="text-right text-muted-foreground">
                                                                        {calc.unit}
                                                                    </div>
                                                                    <div className="text-right font-medium">
                                                                        {calc.calculatedQuantity.toFixed(2)}
                                                                    </div>
                                                                    <div className="text-right text-orange-600">
                                                                        {calc.wastageQuantity.toFixed(2)}
                                                                    </div>
                                                                    <div className="text-right text-green-600">
                                                                        {calc.cost.toFixed(2)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    )}
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
                                <Button onClick={handleCreate}>Create Order</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                    <Card className="p-3">
                        <CardContent className="p-0">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-blue-100 rounded-md">
                                    <ListOrdered className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Total Orders</p>
                                    <p className="text-lg font-semibold">{summary.total}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-3">
                        <CardContent className="p-0">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-yellow-100 rounded-md">
                                    <Clock className="h-4 w-4 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Pending</p>
                                    <p className="text-lg font-semibold text-yellow-600">{summary.pending}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-3">
                        <CardContent className="p-0">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-blue-100 rounded-md">
                                    <Play className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">In Progress</p>
                                    <p className="text-lg font-semibold text-blue-600">{summary.inProgress}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-3">
                        <CardContent className="p-0">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-green-100 rounded-md">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Completed</p>
                                    <p className="text-lg font-semibold text-green-600">{summary.completed}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-3">
                        <CardContent className="p-0">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-red-100 rounded-md">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Urgent</p>
                                    <p className="text-lg font-semibold text-red-600">{summary.urgent}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters and Search */}
                <Card className="mb-4">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search orders..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 h-9"
                                />
                            </div>
                            {/* </div>

                        <div className="flex flex-wrap gap-2 mt-2"> */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-32 h-8">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger className="w-32 h-8">
                                    <SelectValue placeholder="All Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priority</SelectItem>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="URGENT">Urgent</SelectItem>
                                </SelectContent>
                            </Select>

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
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-10 px-3">Order Number</TableHead>
                                    <TableHead className="h-10 px-3">Item</TableHead>
                                    <TableHead className="h-10 px-3">Planned Qty</TableHead>
                                    <TableHead className="h-10 px-3">Actual Qty</TableHead>
                                    <TableHead className="h-10 px-3">Priority</TableHead>
                                    <TableHead className="h-10 px-3">Status</TableHead>
                                    <TableHead className="h-10 px-3">Start Date</TableHead>
                                    <TableHead className="h-10 px-3">End Date</TableHead>
                                    <TableHead className="h-10 px-3 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                            No production orders found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedOrders.map((order) => (
                                        <TableRow key={order.id} className="hover:bg-muted/50">
                                            <TableCell className="px-3 py-2">
                                                <div className="font-medium">{order.code || order.orderNumber}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {order.Location?.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <div className="font-medium">{order.Item?.name || "Unknown Item"}</div>
                                                <div className="text-xs text-muted-foreground">{order.Item?.barcode || 'N/A'}</div>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <div className="text-sm">{order.plannedQuantity}</div>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <div className="text-sm">{order.produceQuantity || order.actualQuantity || "-"}</div>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <Badge
                                                    variant="outline"
                                                    className={cn("text-xs", getPriorityColor(order.priority))}
                                                >
                                                    {order.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <Badge
                                                    variant="outline"
                                                    className={cn("text-xs", getStatusColor(order.status))}
                                                >
                                                    {order.status.replace("_", " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <div className="text-sm">
                                                    {safeFormatDate(order.startDate || order.plannedStartDate || order.date)}
                                                </div>
                                                {order.actualStartDate && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Actual: {safeFormatDate(order.actualStartDate)}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-3 py-2">
                                                <div className="text-sm">
                                                    {safeFormatDate(order.endDate || order.plannedEndDate)}
                                                </div>
                                                {order.actualEndDate && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Actual: {safeFormatDate(order.actualEndDate)}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-3 py-2 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => { setSelectedOrder(order); setShowViewDialog(true) }}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openStatusDialog(order)}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Update Status
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openEditDialog(order)}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit Order
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
                                                                        Are you sure you want to delete production order "{order.orderNumber}"? This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDelete(order)}
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
                        {filteredOrders.length > 0 && (
                            <div className="px-4 py-3 border-t">
                                <PaginationControls {...paginationProps} />
                            </div>
                        )}
                    </CardContent>
                </Card>



                {/* Status Update Dialog */}
                <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Production Order Status</DialogTitle>
                            <DialogDescription>
                                Update the status and progress of the production order.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status *</Label>
                                <Select
                                    value={statusForm.status}
                                    onValueChange={(value: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD") =>
                                        setStatusForm(prev => ({ ...prev, status: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                        <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {(statusForm.status === "IN_PROGRESS" || statusForm.status === "COMPLETED") && (
                                <div className="grid gap-2">
                                    <Label>Actual Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "justify-start text-left font-normal",
                                                    !statusForm.actualStartDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {statusForm.actualStartDate ? (
                                                    safeFormatDate(statusForm.actualStartDate, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={statusForm.actualStartDate || undefined}
                                                onSelect={(date) => setStatusForm(prev => ({ ...prev, actualStartDate: date || null }))}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}

                            {statusForm.status === "COMPLETED" && (
                                <>
                                    <div className="grid gap-2">
                                        <Label>Actual End Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "justify-start text-left font-normal",
                                                        !statusForm.actualEndDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {statusForm.actualEndDate ? (
                                                        safeFormatDate(statusForm.actualEndDate, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={statusForm.actualEndDate || undefined}
                                                    onSelect={(date) => setStatusForm(prev => ({ ...prev, actualEndDate: date || null }))}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="actualQuantity">Actual Quantity Produced</Label>
                                        <Input
                                            id="actualQuantity"
                                            type="number"
                                            min="0"
                                            value={statusForm.actualQuantity}
                                            onChange={(e) => setStatusForm(prev => ({ ...prev, actualQuantity: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowStatusDialog(false)
                                    setSelectedOrder(null)
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleStatusUpdate}>Update Status</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View Order Dialog - Add this if needed */}
                <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Production Order Details</DialogTitle>
                            <DialogDescription>
                                Complete production order information including required materials
                            </DialogDescription>
                        </DialogHeader>

                        {selectedOrder && (() => {
                            // Handle both ProductionOrderItems and productionOrderItems for backward compatibility
                            const orderItems = (selectedOrder.ProductionOrderItems || selectedOrder.productionOrderItems || []) as ProductionOrderItemDetailed[];

                            return (
                                <div className="space-y-2">
                                    {/* Basic Order Information */}
                                    <Card>
                                        <CardHeader className="p-3">
                                            <CardTitle className="text-lg">Order Information</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {/* <div>
                                                <Label className="text-sm font-medium">Order ID</Label>
                                                <p className="text-sm text-muted-foreground">{selectedOrder.id}</p>
                                            </div> */}
                                                <div>
                                                    <Label className="text-sm font-medium">Order Number</Label>
                                                    <p className="text-sm text-muted-foreground">{selectedOrder.code || selectedOrder.orderNumber}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium">Status</Label>
                                                    <p className="text-sm">
                                                        <Badge className={getStatusColor(selectedOrder.status)}>
                                                            {selectedOrder.status}
                                                        </Badge>
                                                    </p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium">Priority</Label>
                                                    <p className="text-sm">
                                                        <Badge className={getPriorityColor(selectedOrder.priority)}>
                                                            {selectedOrder.priority}
                                                        </Badge>
                                                    </p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium">Product</Label>
                                                    <p className="text-sm text-muted-foreground">{selectedOrder.Item?.name || `Item ID: ${selectedOrder.itemId}`}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium">BOM ID</Label>
                                                    <p className="text-sm text-muted-foreground">{selectedOrder.bomId}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium">Location ID</Label>
                                                    <p className="text-sm text-muted-foreground">{selectedOrder.locationId}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium">Planned Quantity</Label>
                                                    <p className="text-sm text-muted-foreground">{selectedOrder.plannedQuantity}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium">Created By User</Label>
                                                    <p className="text-sm text-muted-foreground">{selectedOrder.user?.id || "-"}</p>
                                                </div>

                                                <div>
                                                    <Label className="text-sm font-medium">Planned Start Date</Label>
                                                    <p className="text-sm text-muted-foreground">
                                                        {safeFormatDate(selectedOrder.startDate || selectedOrder.plannedStartDate, "PPP")}
                                                    </p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium">Planned End Date</Label>
                                                    <p className="text-sm text-muted-foreground">
                                                        {safeFormatDate(selectedOrder.endDate || selectedOrder.plannedEndDate, "PPP")}
                                                    </p>
                                                </div>
                                            </div>

                                            {selectedOrder.notes && (
                                                <div className="mt-4">
                                                    <Label className="text-sm font-medium">Notes</Label>
                                                    <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Production Order Items */}
                                    {orderItems.length > 0 && (
                                        <Card>
                                            <CardHeader className="p-3">
                                                <CardTitle className="text-lg">Production Order Items</CardTitle>
                                                {/* <CardDescription>
                                                    Detailed breakdown of materials and components required for this production order
                                                </CardDescription> */}
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {/* Header Row */}
                                                    <div className="grid grid-cols-10 gap-3 text-xs font-semibold text-muted-foreground border-b pb-3">
                                                        <div>Seq.</div>
                                                        <div className="col-span-2">Item Details</div>
                                                        <div className="text-right">Quantity</div>
                                                        <div>Unit</div>
                                                        <div className="text-right">Unit Cost</div>
                                                        <div className="text-right">Total Cost</div>
                                                        <div className="text-right">Wastage</div>
                                                        <div>Status</div>
                                                        <div>Remarks</div>
                                                    </div>

                                                    {/* Data Rows */}
                                                    {orderItems
                                                        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                                                        .map((item, index) => (
                                                            <div key={item.id || index} className="grid grid-cols-10 gap-3 text-sm py-3 border-b last:border-b-0 hover:bg-muted/30 rounded-md p-2">
                                                                {/* Sequence */}
                                                                <div className="font-medium text-center">
                                                                    <Badge variant="outline" className="px-2 py-1">
                                                                        #{item.sequence || index + 1}
                                                                    </Badge>
                                                                </div>

                                                                {/* Item Details */}
                                                                <div className="col-span-2">
                                                                    <div className="font-medium text-foreground">
                                                                        {item.Item?.name || `Item ${item.itemId}`}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {item.Item?.barcode || 'N/A'}
                                                                    </div>
                                                                    {/* <div className="text-xs text-muted-foreground">
                                                                    ID: {item.itemId}
                                                                </div> */}
                                                                </div>

                                                                {/* Quantity */}
                                                                <div className="text-right font-semibold">
                                                                    {typeof item.quantity === 'string' ?
                                                                        parseFloat(item.quantity).toFixed(3) :
                                                                        (item.quantity || 0).toFixed(3)}
                                                                </div>

                                                                {/* Unit */}
                                                                <div className="text-muted-foreground">
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {item.unit || 'kg'}
                                                                    </Badge>
                                                                </div>

                                                                {/* Unit Cost */}
                                                                <div className="text-right text-green-700 font-medium">
                                                                    {typeof item.cost === 'string' ?
                                                                        parseFloat(item.cost).toFixed(2) :
                                                                        (item.cost || 0).toFixed(2)}
                                                                </div>

                                                                {/* Total Cost */}
                                                                <div className="text-right text-green-800 font-semibold">
                                                                    {typeof item.totalCost === 'string' ?
                                                                        parseFloat(item.totalCost).toFixed(2) :
                                                                        (item.totalCost || 0).toFixed(2)}
                                                                </div>

                                                                {/* Wastage */}
                                                                <div className="text-right text-orange-600">
                                                                    {typeof item.wastageQuantity === 'string' ?
                                                                        parseFloat(item.wastageQuantity).toFixed(3) :
                                                                        (item.wastageQuantity || 0).toFixed(3)}
                                                                </div>

                                                                {/* Status */}
                                                                <div>
                                                                    <Badge
                                                                        variant={item.status === 'pending' ? 'secondary' :
                                                                            item.status === 'allocated' ? 'default' :
                                                                                item.status === 'completed' ? 'default' : 'outline'}
                                                                        className={cn(
                                                                            "text-xs",
                                                                            item.status === 'pending' && "bg-yellow-100 text-yellow-800",
                                                                            item.status === 'allocated' && "bg-blue-100 text-blue-800",
                                                                            item.status === 'completed' && "bg-green-100 text-green-800"
                                                                        )}
                                                                    >
                                                                        {item.status || 'pending'}
                                                                    </Badge>
                                                                </div>

                                                                {/* Remarks */}
                                                                <div className="text-xs text-muted-foreground">
                                                                    {item.remark || '-'}
                                                                </div>
                                                            </div>
                                                        ))}

                                                    {/* Summary Section */}
                                                    <div className="bg-muted/50 rounded-lg p-4 mt-4">
                                                        <div className="grid grid-cols-3 gap-6">
                                                            <div className="text-center">
                                                                <div className="text-sm font-medium text-muted-foreground">Total Items</div>
                                                                <div className="text-lg font-bold text-foreground">
                                                                    {orderItems.length}
                                                                </div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-sm font-medium text-muted-foreground">Total Cost</div>
                                                                <div className="text-lg font-bold text-green-600">
                                                                    {orderItems.reduce((sum, item) =>
                                                                        sum + (typeof item.totalCost === 'string' ?
                                                                            parseFloat(item.totalCost) : (item.totalCost || 0)), 0).toFixed(2)}
                                                                </div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-sm font-medium text-muted-foreground">Total Wastage</div>
                                                                <div className="text-lg font-bold text-orange-600">
                                                                    {orderItems.reduce((sum, item) =>
                                                                        sum + (typeof item.wastageQuantity === 'string' ?
                                                                            parseFloat(item.wastageQuantity) : (item.wastageQuantity || 0)), 0).toFixed(3)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Individual Item Cards for Better Mobile View */}
                                                    <div className="block md:hidden space-y-3 mt-4">
                                                        <div className="text-sm font-medium text-muted-foreground mb-3">Mobile View:</div>
                                                        {orderItems
                                                            .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                                                            .map((item, index) => (
                                                                <Card key={item.id || index} className="p-4">
                                                                    <div className="space-y-2">
                                                                        <div className="flex justify-between items-start">
                                                                            <div>
                                                                                <div className="font-medium">{item.Item?.name || `Item ${item.itemId}`}</div>
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    {item.Item?.barcode || 'N/A'}
                                                                                </div>
                                                                            </div>
                                                                            <Badge variant="outline">#{item.sequence || index + 1}</Badge>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                                                            <div>
                                                                                <span className="text-muted-foreground">Quantity:</span>
                                                                                <span className="ml-1 font-medium">
                                                                                    {typeof item.quantity === 'string' ?
                                                                                        parseFloat(item.quantity).toFixed(3) :
                                                                                        (item.quantity || 0).toFixed(3)} {item.unit || 'kg'}
                                                                                </span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-muted-foreground">Status:</span>
                                                                                <Badge variant="secondary" className="ml-1 text-xs">
                                                                                    {item.status || 'pending'}
                                                                                </Badge>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-muted-foreground">Unit Cost:</span>
                                                                                <span className="ml-1 text-green-600 font-medium">
                                                                                    {typeof item.cost === 'string' ?
                                                                                        parseFloat(item.cost).toFixed(2) :
                                                                                        (item.cost || 0).toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-muted-foreground">Total Cost:</span>
                                                                                <span className="ml-1 text-green-800 font-semibold">
                                                                                    {typeof item.totalCost === 'string' ?
                                                                                        parseFloat(item.totalCost).toFixed(2) :
                                                                                        (item.totalCost || 0).toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        {item.remark && (
                                                                            <div className="text-xs text-muted-foreground">
                                                                                <span className="font-medium">Remark:</span> {item.remark}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </Card>
                                                            ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Show message if no production order items */}
                                    {orderItems.length === 0 && (
                                        <Card>
                                            <CardContent className="p-6 text-center">
                                                <div className="text-muted-foreground">
                                                    <ListOrdered className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                    <p>No production order items found for this order.</p>
                                                    <p className="text-sm mt-2">Items will be generated based on the BOM when the order is processed.</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            );
                        })()}

                        <DialogFooter>
                            <Button onClick={() => setShowViewDialog(false)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Order Dialog - Similar structure to create dialog but with edit handler */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Production Order</DialogTitle>
                            <DialogDescription>
                                Update production order details.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Same form fields as create dialog */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                            {/* Reuse the same form structure from create dialog */}
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-orderNumber">Order Number</Label>
                                    <Input
                                        id="edit-orderNumber"
                                        value={orderForm.orderNumber}
                                        onChange={(e) => setOrderForm(prev => ({ ...prev, orderNumber: e.target.value }))}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-itemId">
                                        Product to Manufacture *
                                        <Badge variant="outline" className="ml-2 text-xs">
                                            <Package className="h-3 w-3 mr-1" />
                                            {finishedGoods.length} products
                                        </Badge>
                                    </Label>
                                    <Select
                                        value={orderForm.itemId}
                                        onValueChange={(value) => setOrderForm(prev => ({ ...prev, itemId: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select finished product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {finishedGoods.map((item) => (
                                                <SelectItem key={item.id} value={item.id.toString()}>
                                                    <div className="flex items-center space-x-2">
                                                        <Package className="h-4 w-4 text-green-600" />
                                                        {item.image && (
                                                            <img 
                                                                src={item.image} 
                                                                alt={item.name}
                                                                className="w-6 h-6 rounded object-cover"
                                                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                            />
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="font-medium">{item.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {item.barcode || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-bomId">BOM *</Label>
                                    <Select
                                        value={orderForm.bomId}
                                        onValueChange={(value) => {
                                            setOrderForm(prev => ({ ...prev, bomId: value }))
                                            loadBomDetails(value)
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select BOM" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {boms.filter(bom => bom.itemId.toString() === orderForm.itemId).map((bom) => (
                                                <SelectItem key={bom.id} value={bom.id!.toString()}>
                                                    {bom.bomCode || `BOM ${bom.id}`} - v{bom.version}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-plannedQuantity">Planned Quantity *</Label>
                                    <Input
                                        id="edit-plannedQuantity"
                                        type="number"
                                        min="1"
                                        value={orderForm.plannedQuantity}
                                        onChange={(e) => {
                                            const quantity = parseInt(e.target.value) || 1
                                            setOrderForm(prev => ({ ...prev, plannedQuantity: quantity }))
                                            if (selectedBomDetails) {
                                                calculateBomQuantities(selectedBomDetails, quantity)
                                            }
                                        }}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-actualQuantity">Actual Quantity</Label>
                                    <Input
                                        id="edit-actualQuantity"
                                        type="number"
                                        min="0"
                                        value={orderForm.actualQuantity}
                                        onChange={(e) => setOrderForm(prev => ({ ...prev, actualQuantity: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-priority">Priority *</Label>
                                    <Select
                                        value={orderForm.priority}
                                        onValueChange={(value: "LOW" | "MEDIUM" | "HIGH" | "URGENT") => setOrderForm(prev => ({ ...prev, priority: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Low</SelectItem>
                                            <SelectItem value="MEDIUM">Medium</SelectItem>
                                            <SelectItem value="HIGH">High</SelectItem>
                                            <SelectItem value="URGENT">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Planned Start Date *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "justify-start text-left font-normal",
                                                    !orderForm.plannedStartDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {orderForm.plannedStartDate ? (
                                                    safeFormatDate(orderForm.plannedStartDate, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={orderForm.plannedStartDate}
                                                onSelect={(date) => date && setOrderForm(prev => ({ ...prev, plannedStartDate: date }))}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Planned End Date *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "justify-start text-left font-normal",
                                                    !orderForm.plannedEndDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {orderForm.plannedEndDate ? (
                                                    safeFormatDate(orderForm.plannedEndDate, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={orderForm.plannedEndDate}
                                                onSelect={(date) => date && setOrderForm(prev => ({ ...prev, plannedEndDate: date }))}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="col-span-full">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-notes">Notes</Label>
                                    <Textarea
                                        id="edit-notes"
                                        value={orderForm.notes}
                                        onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Production notes..."
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* BOM Items Display for Edit Dialog */}
                            {selectedBomDetails && bomCalculations.length > 0 && (
                                <div className="col-span-full">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-medium">BOM Items Required</Label>
                                            <Badge variant="outline">
                                                {selectedBomDetails.bomCode || `BOM ${selectedBomDetails.id}`} v{selectedBomDetails.version}
                                            </Badge>
                                        </div>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="space-y-2">
                                                    <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                                                        <div>Item Name</div>
                                                        <div className="text-right">BOM Qty</div>
                                                        <div className="text-right">Unit</div>
                                                        <div className="text-right">Total Required</div>
                                                        <div className="text-right">Wastage</div>
                                                        <div className="text-right">Cost</div>
                                                    </div>
                                                    {bomCalculations.map((calc, index) => (
                                                        <div key={index} className="grid grid-cols-6 gap-2 text-sm py-2 border-b last:border-b-0">
                                                            <div className="font-medium">{calc.itemName}</div>
                                                            <div className="text-right text-muted-foreground">
                                                                {calc.bomQuantity.toFixed(2)}
                                                            </div>
                                                            <div className="text-right text-muted-foreground">
                                                                {calc.unit}
                                                            </div>
                                                            <div className="text-right font-medium">
                                                                {calc.calculatedQuantity.toFixed(2)}
                                                            </div>
                                                            <div className="text-right text-orange-600">
                                                                {calc.wastageQuantity.toFixed(2)}
                                                            </div>
                                                            <div className="text-right text-green-600">
                                                                {calc.cost.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowEditDialog(false)
                                    setSelectedOrder(null)
                                    resetForm()
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleEdit}>Update Order</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ERPLayout>
    )
}