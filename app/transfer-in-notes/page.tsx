"use client"

import React, { useState, useEffect } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Textarea } from "@/components/ui/textarea"
import { Truck, Eye, Edit, CheckCircle, Send, Package2, Star } from "lucide-react"
import { 
    transferInNotesApi,
    locationsApi,
    storesApi,
    driversApi,
    vehiclesApi,
    type TransferInNote,
    type Location,
    type Store,
    type Driver,
    type Vehicle,
    type UpdateTransferInNoteRequest,
    type DispatchTransferInNoteRequest,
    type ReceiveTransferInNoteRequest,
    type ApproveTransferInNoteRequest
} from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { usePagination } from "@/hooks/use-pagination"
import { ERPLayout } from "@/components/layouts/erp-layout"

const statusColors = {
    "Pending": "bg-yellow-100 text-yellow-800",
    "Dispatched": "bg-blue-100 text-blue-800",
    "In Transit": "bg-purple-100 text-purple-800",
    "Received": "bg-green-100 text-green-800",
    "Completed": "bg-emerald-100 text-emerald-800",
}

export default function TransferInNotesPage() {
    const [transferNotes, setTransferNotes] = useState<TransferInNote[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [stores, setStores] = useState<Store[]>([])
    const [drivers, setDrivers] = useState<Driver[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedNote, setSelectedNote] = useState<TransferInNote | null>(null)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false)
    const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false)
    const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [locationFilter, setLocationFilter] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")

    // Edit form state
    const [editForm, setEditForm] = useState<UpdateTransferInNoteRequest>({
        vehicleId: 0,
        driverId: 0,
        expectedDeliveryDate: "",
        remarks: ""
    })

    // Dispatch form state
    const [dispatchForm, setDispatchForm] = useState<DispatchTransferInNoteRequest>({
        vehicleId: 0,
        driverId: 0,
        remarks: ""
    })

    // Receive form state
    const [receiveForm, setReceiveForm] = useState<ReceiveTransferInNoteRequest>({
        remarks: "",
        items: []
    })

    // Approval form state
    const [approvalForm, setApprovalForm] = useState<ApproveTransferInNoteRequest>({
        remarks: ""
    })

    // Filter function for pagination
    const filterFn = (note: TransferInNote): boolean => {
        const matchesSearch = searchTerm === "" ||
            Boolean(note.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.fromLocation?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.toLocation?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.vehicle?.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesStatus = statusFilter === "all" || note.status === statusFilter
        const matchesLocation = locationFilter === "all" || 
            note.fromLocationId.toString() === locationFilter ||
            note.toLocationId.toString() === locationFilter

        return Boolean(matchesSearch && matchesStatus && matchesLocation)
    }

    const { currentPage, itemsPerPage, totalPages, paginatedData, handlePageChange, handleItemsPerPageChange } = usePagination({
        data: transferNotes,
        filterFn
    })

    const fetchTransferNotes = async () => {
        try {
            setLoading(true)
            const data = await transferInNotesApi.getAll()
            setTransferNotes(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Error fetching transfer in notes:", error)
            setTransferNotes([])
            toast({
                title: "Error",
                description: "Failed to fetch transfer in notes",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchMasterData = async () => {
        try {
            const [locationsData, storesData, driversData, vehiclesData] = await Promise.all([
                locationsApi.getAll(),
                storesApi.getAll(),
                driversApi.getAll(),
                vehiclesApi.getAll(),
            ])

            setLocations(locationsData as Location[])
            setStores(storesData as Store[])
            setDrivers(driversData as Driver[])
            setVehicles(vehiclesData as Vehicle[])
        } catch (error) {
            console.error("Error fetching master data:", error)
            toast({
                title: "Error",
                description: "Failed to fetch master data",
                variant: "destructive",
            })
        }
    }

    const handleUpdateNote = async () => {
        try {
            if (!selectedNote?.id) return

            await transferInNotesApi.update(selectedNote.id, editForm)
            toast({
                title: "Success",
                description: "Transfer in note updated successfully",
            })
            fetchTransferNotes()
            setIsEditDialogOpen(false)
        } catch (error) {
            console.error("Error updating transfer in note:", error)
            toast({
                title: "Error",
                description: "Failed to update transfer in note",
                variant: "destructive",
            })
        }
    }

    const handleDispatchNote = async () => {
        try {
            if (!selectedNote?.id) return

            await transferInNotesApi.dispatch(selectedNote.id, dispatchForm)
            toast({
                title: "Success",
                description: "Transfer in note dispatched successfully",
            })
            fetchTransferNotes()
            setIsDispatchDialogOpen(false)
        } catch (error) {
            console.error("Error dispatching transfer in note:", error)
            toast({
                title: "Error",
                description: "Failed to dispatch transfer in note",
                variant: "destructive",
            })
        }
    }

    const handleReceiveNote = async () => {
        try {
            if (!selectedNote?.id) return

            await transferInNotesApi.receive(selectedNote.id, receiveForm)
            toast({
                title: "Success",
                description: "Transfer in note received successfully",
            })
            fetchTransferNotes()
            setIsReceiveDialogOpen(false)
        } catch (error) {
            console.error("Error receiving transfer in note:", error)
            toast({
                title: "Error",
                description: "Failed to receive transfer in note",
                variant: "destructive",
            })
        }
    }

    const handleApproveNote = async () => {
        try {
            if (!selectedNote?.id) return

            await transferInNotesApi.approve(selectedNote.id, approvalForm)
            toast({
                title: "Success",
                description: "Transfer completed successfully - Stock updated",
            })
            fetchTransferNotes()
            setIsApprovalDialogOpen(false)
        } catch (error) {
            console.error("Error approving transfer in note:", error)
            toast({
                title: "Error",
                description: "Failed to complete transfer",
                variant: "destructive",
            })
        }
    }

    const updateReceiveFormItem = (index: number, field: string, value: any) => {
        setReceiveForm(prev => ({
            ...prev,
            items: prev.items.map((item, i) => 
                i === index ? { ...item, [field]: value } : item
            )
        }))
    }

    useEffect(() => {
        fetchMasterData()
    }, [])

    useEffect(() => {
        fetchTransferNotes()
    }, [])

    useEffect(() => {
        // Initialize forms when selectedNote changes
        if (selectedNote) {
            setEditForm({
                vehicleId: selectedNote.vehicleId || 0,
                driverId: selectedNote.driverId || 0,
                expectedDeliveryDate: selectedNote.expectedDeliveryDate || "",
                remarks: selectedNote.remarks || ""
            })

            setDispatchForm({
                vehicleId: selectedNote.vehicleId || 0,
                driverId: selectedNote.driverId || 0,
                remarks: ""
            })

            setReceiveForm({
                remarks: "",
                items: selectedNote.items?.map(item => ({
                    itemId: item.itemId,
                    receivedQuantity: item.issuedQuantity,
                    acceptedQuantity: item.issuedQuantity,
                    rejectedQuantity: 0,
                    damagedQuantity: 0,
                    receivedWeight: item.actualWeight,
                    qualityGrade: "A",
                    inspectionNotes: "",
                    storageLocationId: selectedNote.toLocationId
                })) || []
            })
        }
    }, [selectedNote])

    if (loading && transferNotes.length === 0) {
        return (
            <ERPLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
                </div>
            </ERPLayout>
        )
    }

    return (
        <ERPLayout>
            <div className="container mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Transfer In Notes</h1>
                        <p className="text-muted-foreground">Manage goods transfer, dispatch and receipt</p>
                    </div>
                </div>

                <Tabs defaultValue="transfers" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="transfers">All Transfers</TabsTrigger>
                        <TabsTrigger value="stats">Statistics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="transfers" className="space-y-4">
                        {/* Filters */}
                        <Card>
                            <CardContent className="flex gap-4 mt-6">
                                <div className="flex-1">
                                    <Label htmlFor="search">Search</Label>
                                    <Input
                                        id="search"
                                        placeholder="Search by document number, location, vehicle, or driver..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="w-48">
                                    <Label htmlFor="status">Status</Label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Dispatched">Dispatched</SelectItem>
                                            <SelectItem value="In Transit">In Transit</SelectItem>
                                            <SelectItem value="Received">Received</SelectItem>
                                            <SelectItem value="Completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-48">
                                    <Label htmlFor="location">Location</Label>
                                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                                        <SelectTrigger>
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
                                </div>
                            </CardContent>
                        </Card>

                        {/* Transfers Table */}
                        <Card>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Transfer ID</TableHead>
                                            <TableHead>Document Number</TableHead>
                                            <TableHead>From → To</TableHead>
                                            <TableHead>Vehicle & Driver</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Transfer Date</TableHead>
                                            <TableHead>Expected Delivery</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedData.map((note) => (
                                            <TableRow key={note.id}>
                                                <TableCell className="font-medium">#{note.id}</TableCell>
                                                <TableCell>
                                                    <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                                                        {note.documentNumber || "N/A"}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {note.fromLocation?.name} → {note.toLocation?.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <div>{note.vehicle?.vehicleNumber || "Not assigned"}</div>
                                                        <div className="text-muted-foreground">{note.driver?.name || "No driver"}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={statusColors[note.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                                                        {note.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {note.transferDate ? new Date(note.transferDate).toLocaleDateString() : "N/A"}
                                                </TableCell>
                                                <TableCell>
                                                    {note.expectedDeliveryDate ? new Date(note.expectedDeliveryDate).toLocaleDateString() : "N/A"}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedNote(note)
                                                                setIsViewDialogOpen(true)
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {note.status === "Pending" && (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedNote(note)
                                                                        setIsEditDialogOpen(true)
                                                                    }}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedNote(note)
                                                                        setIsDispatchDialogOpen(true)
                                                                    }}
                                                                >
                                                                    <Send className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {(note.status === "Dispatched" || note.status === "In Transit") && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedNote(note)
                                                                    setIsReceiveDialogOpen(true)
                                                                }}
                                                            >
                                                                <Package2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {note.status === "Received" && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedNote(note)
                                                                    setIsApprovalDialogOpen(true)
                                                                }}
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="stats">
                        <Card>
                            <CardHeader>
                                <CardTitle>Transfer Statistics</CardTitle>
                                <CardDescription>Overview of transfer in notes</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{transferNotes.length}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Pending</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {transferNotes.filter(r => r.status === "Pending").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Dispatched</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {transferNotes.filter(r => r.status === "Dispatched").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Received</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {transferNotes.filter(r => r.status === "Received").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Completed</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {transferNotes.filter(r => r.status === "Completed").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* View Transfer Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Transfer In Note Details</DialogTitle>
                            <DialogDescription>View transfer information and items</DialogDescription>
                        </DialogHeader>
                        {selectedNote && (
                            <div className="grid gap-4 max-h-[60vh] overflow-y-auto">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>Transfer ID</Label>
                                        <p className="text-sm">#{selectedNote.id}</p>
                                    </div>
                                    <div>
                                        <Label>Document Number</Label>
                                        <p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                            {selectedNote.documentNumber || "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label>Status</Label>
                                        <Badge className={statusColors[selectedNote.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                                            {selectedNote.status}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>From Location & Store</Label>
                                        <p className="text-sm">{selectedNote.fromLocation?.name} - {selectedNote.fromStore?.name}</p>
                                    </div>
                                    <div>
                                        <Label>To Location & Store</Label>
                                        <p className="text-sm">{selectedNote.toLocation?.name} - {selectedNote.toStore?.name}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Vehicle</Label>
                                        <p className="text-sm">{selectedNote.vehicle?.vehicleNumber || "Not assigned"}</p>
                                        {selectedNote.vehicle?.vehicleType && (
                                            <p className="text-xs text-muted-foreground">{selectedNote.vehicle.vehicleType}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>Driver</Label>
                                        <p className="text-sm">{selectedNote.driver?.name || "Not assigned"}</p>
                                        {selectedNote.driver?.mobile && (
                                            <p className="text-xs text-muted-foreground">{selectedNote.driver.mobile}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>Transfer Date</Label>
                                        <p className="text-sm">
                                            {selectedNote.transferDate ? new Date(selectedNote.transferDate).toLocaleDateString() : "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label>Expected Delivery</Label>
                                        <p className="text-sm">
                                            {selectedNote.expectedDeliveryDate ? new Date(selectedNote.expectedDeliveryDate).toLocaleDateString() : "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label>Received Date</Label>
                                        <p className="text-sm">
                                            {selectedNote.receivedDate ? new Date(selectedNote.receivedDate).toLocaleDateString() : "Not received"}
                                        </p>
                                    </div>
                                </div>

                                {selectedNote.remarks && (
                                    <div>
                                        <Label>Remarks</Label>
                                        <p className="text-sm">{selectedNote.remarks}</p>
                                    </div>
                                )}

                                <div>
                                    <Label>Transfer Items</Label>
                                    {selectedNote.items && selectedNote.items.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Batch</TableHead>
                                                    <TableHead>Issued Qty</TableHead>
                                                    <TableHead>Received Qty</TableHead>
                                                    <TableHead>Accepted Qty</TableHead>
                                                    <TableHead>Quality Grade</TableHead>
                                                    <TableHead>Inspection Notes</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedNote.items.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{item.item?.name || "N/A"}</TableCell>
                                                        <TableCell>
                                                            {item.batch?.batchNumber || item.batchId || "N/A"}
                                                        </TableCell>
                                                        <TableCell>{item.issuedQuantity}</TableCell>
                                                        <TableCell>{item.receivedQuantity || "Not received"}</TableCell>
                                                        <TableCell>{item.acceptedQuantity || "Not inspected"}</TableCell>
                                                        <TableCell>
                                                            {item.qualityGrade && (
                                                                <Badge variant="outline">
                                                                    {item.qualityGrade}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="max-w-xs truncate">
                                                            {item.inspectionNotes || "N/A"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No items found</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Edit Transfer Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Transfer In Note</DialogTitle>
                            <DialogDescription>Update transfer details</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="editVehicle">Vehicle</Label>
                                    <Select value={editForm.vehicleId?.toString() || ""} onValueChange={(value) => setEditForm(prev => ({ ...prev, vehicleId: parseInt(value) }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Vehicle" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vehicles.map((vehicle) => (
                                                <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                                    {vehicle.vehicleNumber} - {vehicle.vehicleType}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="editDriver">Driver</Label>
                                    <Select value={editForm.driverId?.toString() || ""} onValueChange={(value) => setEditForm(prev => ({ ...prev, driverId: parseInt(value) }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Driver" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {drivers.map((driver) => (
                                                <SelectItem key={driver.id} value={driver.id.toString()}>
                                                    {driver.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                                <Input
                                    id="expectedDeliveryDate"
                                    type="date"
                                    value={editForm.expectedDeliveryDate}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label htmlFor="editRemarks">Remarks</Label>
                                <Textarea
                                    id="editRemarks"
                                    placeholder="Enter remarks..."
                                    value={editForm.remarks}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateNote}>
                                Update Transfer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dispatch Dialog */}
                <Dialog open={isDispatchDialogOpen} onOpenChange={setIsDispatchDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Dispatch Transfer</DialogTitle>
                            <DialogDescription>Assign vehicle and driver for dispatch</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="dispatchVehicle">Vehicle *</Label>
                                    <Select value={dispatchForm.vehicleId.toString()} onValueChange={(value) => setDispatchForm(prev => ({ ...prev, vehicleId: parseInt(value) }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Vehicle" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vehicles.map((vehicle) => (
                                                <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                                    {vehicle.vehicleNumber} - {vehicle.vehicleType}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="dispatchDriver">Driver *</Label>
                                    <Select value={dispatchForm.driverId.toString()} onValueChange={(value) => setDispatchForm(prev => ({ ...prev, driverId: parseInt(value) }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Driver" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {drivers.map((driver) => (
                                                <SelectItem key={driver.id} value={driver.id.toString()}>
                                                    {driver.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="dispatchRemarks">Dispatch Remarks</Label>
                                <Textarea
                                    id="dispatchRemarks"
                                    placeholder="Enter dispatch remarks..."
                                    value={dispatchForm.remarks}
                                    onChange={(e) => setDispatchForm(prev => ({ ...prev, remarks: e.target.value }))}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDispatchDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleDispatchNote} disabled={!dispatchForm.vehicleId || !dispatchForm.driverId}>
                                <Send className="mr-2 h-4 w-4" />
                                Dispatch
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Receive Dialog */}
                <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Receive Transfer</DialogTitle>
                            <DialogDescription>Record goods receipt and inspection details</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 max-h-[60vh] overflow-y-auto">
                            <div>
                                <Label htmlFor="receiveRemarks">Receipt Remarks</Label>
                                <Textarea
                                    id="receiveRemarks"
                                    placeholder="Enter receipt remarks..."
                                    value={receiveForm.remarks}
                                    onChange={(e) => setReceiveForm(prev => ({ ...prev, remarks: e.target.value }))}
                                />
                            </div>
                            
                            <div>
                                <Label>Item Inspection</Label>
                                {receiveForm.items.map((item, index) => {
                                    const originalItem = selectedNote?.items?.[index]
                                    return (
                                        <div key={index} className="p-4 border rounded-lg space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{originalItem?.item?.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Issued: {originalItem?.issuedQuantity} {originalItem?.unit?.name}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-4 gap-2">
                                                <div>
                                                    <Label className="text-xs">Received Qty</Label>
                                                    <Input
                                                        type="number"
                                                        value={item.receivedQuantity}
                                                        onChange={(e) => updateReceiveFormItem(index, 'receivedQuantity', parseFloat(e.target.value))}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Accepted Qty</Label>
                                                    <Input
                                                        type="number"
                                                        value={item.acceptedQuantity}
                                                        onChange={(e) => updateReceiveFormItem(index, 'acceptedQuantity', parseFloat(e.target.value))}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Rejected Qty</Label>
                                                    <Input
                                                        type="number"
                                                        value={item.rejectedQuantity}
                                                        onChange={(e) => updateReceiveFormItem(index, 'rejectedQuantity', parseFloat(e.target.value))}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Damaged Qty</Label>
                                                    <Input
                                                        type="number"
                                                        value={item.damagedQuantity}
                                                        onChange={(e) => updateReceiveFormItem(index, 'damagedQuantity', parseFloat(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <Label className="text-xs">Received Weight (kg)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        value={item.receivedWeight || ""}
                                                        onChange={(e) => updateReceiveFormItem(index, 'receivedWeight', parseFloat(e.target.value))}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Quality Grade</Label>
                                                    <Select 
                                                        value={item.qualityGrade || "A"} 
                                                        onValueChange={(value) => updateReceiveFormItem(index, 'qualityGrade', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="A">Grade A</SelectItem>
                                                            <SelectItem value="B">Grade B</SelectItem>
                                                            <SelectItem value="C">Grade C</SelectItem>
                                                            <SelectItem value="D">Grade D</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-end">
                                                    <div className="flex gap-1">
                                                        {[1,2,3,4,5].map(star => (
                                                            <Star 
                                                                key={star} 
                                                                className="h-4 w-4 cursor-pointer" 
                                                                fill={star <= (item.qualityGrade === 'A' ? 5 : item.qualityGrade === 'B' ? 4 : item.qualityGrade === 'C' ? 3 : 2) ? "currentColor" : "none"}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <Label className="text-xs">Inspection Notes</Label>
                                                <Textarea
                                                    placeholder="Enter inspection notes..."
                                                    className="text-xs"
                                                    rows={2}
                                                    value={item.inspectionNotes || ""}
                                                    onChange={(e) => updateReceiveFormItem(index, 'inspectionNotes', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleReceiveNote}>
                                <Package2 className="mr-2 h-4 w-4" />
                                Confirm Receipt
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Approval Dialog */}
                <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Complete Transfer</DialogTitle>
                            <DialogDescription>Approve transfer and update stock levels</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <CheckCircle className="inline h-4 w-4 mr-1" />
                                    Completing this transfer will update the destination store's stock levels with the accepted quantities.
                                </p>
                            </div>
                            <div>
                                <Label htmlFor="approvalRemarks">Completion Remarks</Label>
                                <Textarea
                                    id="approvalRemarks"
                                    placeholder="Enter completion remarks..."
                                    value={approvalForm.remarks}
                                    onChange={(e) => setApprovalForm(prev => ({ ...prev, remarks: e.target.value }))}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleApproveNote}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Complete Transfer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ERPLayout>
    )
}