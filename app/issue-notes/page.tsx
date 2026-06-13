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
import { Package, Eye, Edit, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import {
    issueNotesApi,
    locationsApi,
    storesApi,
    type IssueNote,
    type AvailableBatch,
    type Location,
    type Store,
    type UpdateIssueNoteRequest,
    type ApproveRejectIssueNoteRequest
} from "@/lib/api"
import { toastr } from "@/lib/toastr"
import { usePagination } from "@/hooks/use-pagination"
import { ERPLayout } from "@/components/layouts/erp-layout"

const statusColors = {
    "Pending": "bg-yellow-100 text-yellow-800",
    "Processing": "bg-blue-100 text-blue-800",
    "Approved": "bg-green-100 text-green-800",
    "Rejected": "bg-red-100 text-red-800",
    "Completed": "bg-emerald-100 text-emerald-800",
}

export default function IssueNotesPage() {
    const [issueNotes, setIssueNotes] = useState<IssueNote[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [stores, setStores] = useState<Store[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedNote, setSelectedNote] = useState<IssueNote | null>(null)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
    const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false)

    // Available batches state
    const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([])
    const [selectedItemForBatch, setSelectedItemForBatch] = useState<any>(null)

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [locationFilter, setLocationFilter] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")

    // Edit form state
    const [editForm, setEditForm] = useState<UpdateIssueNoteRequest>({
        deliveryExpectedDate: "",
        remarks: "",
        items: []
    })

    // Approval form state
    const [approvalForm, setApprovalForm] = useState<ApproveRejectIssueNoteRequest>({
        status: "Approved",
        remarks: ""
    })

    // Filter function for pagination
    const filterFn = (note: IssueNote): boolean => {
        const matchesSearch = searchTerm === "" ||
            Boolean(note.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.fromLocation?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.toLocation?.name?.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesStatus = statusFilter === "all" || note.status === statusFilter
        const matchesLocation = locationFilter === "all" ||
            note.fromLocationId.toString() === locationFilter ||
            note.toLocationId.toString() === locationFilter

        return Boolean(matchesSearch && matchesStatus && matchesLocation)
    }

    const { currentPage, itemsPerPage, totalPages, paginatedData, handlePageChange, handleItemsPerPageChange } = usePagination({
        data: issueNotes,
        filterFn
    })

    const fetchIssueNotes = async () => {
        try {
            setLoading(true)
            const data = await issueNotesApi.getAll()
            console.log('Fetched issue notes:', data) // Debug log
            setIssueNotes(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Error fetching issue notes:", error)
            setIssueNotes([])
            toastr.error("Failed to fetch issue notes")
        } finally {
            setLoading(false)
        }
    }

    const fetchMasterData = async () => {
        try {
            const [locationsData, storesData] = await Promise.all([
                locationsApi.getAll(),
                storesApi.getAll(),
            ])

            setLocations(locationsData as Location[])
            setStores(storesData as Store[])
        } catch (error) {
            console.error("Error fetching master data:", error)
            toastr.error("Failed to fetch master data")
        }
    }

    const fetchAvailableBatches = async (itemId: number, locationId: number, storeId: number) => {
        try {
            const batches = await issueNotesApi.getAvailableBatches({
                itemId,
                locationId,
                storeId
            })
            setAvailableBatches(batches)
        } catch (error) {
            console.error("Error fetching available batches:", error)
            toastr.error("Failed to fetch available batches")
        }
    }

    const handleUpdateNote = async () => {
        try {
            if (!selectedNote?.id) return

            await issueNotesApi.update(selectedNote.id, editForm)
            toastr.success("Issue note updated successfully")
            fetchIssueNotes()
            setIsEditDialogOpen(false)
        } catch (error) {
            console.error("Error updating issue note:", error)
            toastr.error("Failed to update issue note")
        }
    }

    const handleApprovalAction = async (action: "Approved" | "Rejected") => {
        try {
            if (!selectedNote?.id) return

            // Only check for batch assignments when approving
            if (action === "Approved") {
                // Check if all items have batch assignments
                const missingBatchItems = selectedNote.items?.filter(item => !item.batchId)
                if (missingBatchItems && missingBatchItems.length > 0) {
                    toastr.error("All items must have batch assignments before approval. Please assign batches to the following items: " + 
                        missingBatchItems.map(item => item.item?.name).join(", "))
                    return
                }
            }

            const payload = {
                ...approvalForm,
                status: action,
            }

            await issueNotesApi.approveReject(selectedNote.id, payload)

            toastr.success(`Issue note ${action.toLowerCase()} successfully`)
            fetchIssueNotes()
            setIsApprovalDialogOpen(false)
            setApprovalForm({ status: "Approved", remarks: "" })
        } catch (error: any) {
            console.error("Error updating issue note:", error)
            // Check for API error response
            const errorMessage = error.response?.data?.error || 
                               error.response?.data?.message || 
                               (typeof error.response?.data === 'string' ? error.response.data : null) ||
                               "Failed to update issue note"

            toastr.error(errorMessage)

            // If it's a validation error (missing batch assignments), keep the dialog open
            if (errorMessage.includes("batch assignments")) {
                return
            }

            // Otherwise close the dialog
            setIsApprovalDialogOpen(false)
        }
    }

    const handleShowBatches = async (item: any) => {
        if (!selectedNote) return

        setSelectedItemForBatch(item)
        await fetchAvailableBatches(item.itemId, selectedNote.fromLocationId, selectedNote.fromStoreId)
        setIsBatchDialogOpen(true)
    }

    const handleAssignBatch = (batchId: number, costPrice: number) => {
        if (!selectedItemForBatch) return

        const itemIndex = editForm.items?.findIndex(item => item.itemId === selectedItemForBatch.itemId) ?? -1

        if (itemIndex >= 0) {
            // Update existing item
            const updatedItems = [...(editForm.items || [])]
            updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                batchId,
                costPrice,
            }
            setEditForm(prev => ({ ...prev, items: updatedItems }))
        } else {
            // Add new item
            const newItem = {
                itemId: selectedItemForBatch.itemId,
                batchId,
                issuedQuantity: selectedItemForBatch.requestedQuantity,
                costPrice,
                actualWeight: selectedItemForBatch.estimatedWeight,
                remarks: ""
            }
            setEditForm(prev => ({
                ...prev,
                items: [...(prev.items || []), newItem]
            }))
        }

        setIsBatchDialogOpen(false)
        toastr.success("Batch assigned successfully")
    }

    useEffect(() => {
        fetchMasterData()
    }, [])

    useEffect(() => {
        fetchIssueNotes()
    }, [])

    useEffect(() => {
        // Initialize edit form when selectedNote changes
        if (selectedNote) {
            setEditForm({
                deliveryExpectedDate: selectedNote.deliveryExpectedDate || "",
                remarks: selectedNote.remarks || "",
                items: selectedNote.items?.map(item => ({
                    itemId: item.itemId,
                    batchId: item.batchId,
                    issuedQuantity: item.issuedQuantity || item.requestedQuantity,
                    costPrice: item.costPrice,
                    actualWeight: item.actualWeight,
                    remarks: item.remarks || ""
                })) || []
            })
        }
    }, [selectedNote])

    if (loading && issueNotes.length === 0) {
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
            <div className="container mx-auto p-2">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Issue Notes</h1>
                        <p className="text-muted-foreground">Manage goods issue and batch assignment</p>
                    </div>
                </div>

                <Tabs defaultValue="issues" className="space-y-2">
                    <TabsList>
                        <TabsTrigger value="issues">All Issues</TabsTrigger>
                        <TabsTrigger value="stats">Statistics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="issues" className="space-y-2">
                        {/* Filters */}
                        <Card>
                            <CardContent className="flex gap-4 mt-6">
                                <div className="flex-1">
                                    <Label htmlFor="search">Search</Label>
                                    <Input
                                        id="search"
                                        placeholder="Search by document number, location, or remarks..."
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
                                            <SelectItem value="Processing">Processing</SelectItem>
                                            <SelectItem value="Approved">Approved</SelectItem>
                                            <SelectItem value="Rejected">Rejected</SelectItem>
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

                            {/* Issues Table */}

                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Document Number</TableHead>
                                            <TableHead>From → To</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Issue Date</TableHead>
                                            <TableHead>Expected Delivery</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedData.map((note) => (
                                            <TableRow key={note.id}>

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
                                                    <Badge className={statusColors[note.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                                                        {note.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {note.issueDate ? new Date(note.issueDate).toLocaleDateString() : "N/A"}
                                                </TableCell>
                                                <TableCell>
                                                    {note.deliveryExpectedDate ? new Date(note.deliveryExpectedDate).toLocaleDateString() : "N/A"}
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
                                                        {(note.status === "Pending" || note.status === "Processing") && (
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
                                                                        setIsApprovalDialogOpen(true)
                                                                    }}
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
                                                                </Button>
                                                            </>
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
                                <CardTitle>Issue Statistics</CardTitle>
                                <CardDescription>Overview of issue notes</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{issueNotes.length}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Pending Issues</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {issueNotes.filter(r => r.status === "Pending").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Approved Issues</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {issueNotes.filter(r => r.status === "Approved").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Processing Issues</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {issueNotes.filter(r => r.status === "Processing").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* View Issue Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Issue Note Details</DialogTitle>
                            <DialogDescription>View issue information and items</DialogDescription>
                        </DialogHeader>
                        {selectedNote && (
                            <div className="grid gap-4">
                                <div className="grid grid-cols-4 gap-4">

                                    <div>
                                        <Label>Document Number</Label>
                                        <p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                            {selectedNote.documentNumber || "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label>Issue Date</Label>
                                        <p className="text-sm">
                                            {selectedNote.issueDate ? new Date(selectedNote.issueDate).toLocaleDateString() : "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label>Expected Delivery Date</Label>
                                        <p className="text-sm">
                                            {selectedNote.deliveryExpectedDate ? new Date(selectedNote.deliveryExpectedDate).toLocaleDateString() : "N/A"}
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

                                {selectedNote.remarks && (
                                    <div>
                                        <Label>Remarks</Label>
                                        <p className="text-sm">{selectedNote.remarks}</p>
                                    </div>
                                )}

                                <div>
                                    <Label>Issue Items</Label>
                                    {selectedNote.items && selectedNote.items.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Batch</TableHead>
                                                    <TableHead>Requested Qty</TableHead>
                                                    <TableHead>Issued Qty</TableHead>
                                                    <TableHead>Cost Price</TableHead>
                                                    <TableHead>Weight</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedNote.items.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{item.item?.name || "N/A"}</TableCell>
                                                        <TableCell>
                                                            {item.batch?.batchNumber || item.batchId || "Not assigned"}
                                                        </TableCell>
                                                        <TableCell>{item.requestedQuantity}</TableCell>
                                                        <TableCell>{item.issuedQuantity || "Not set"}</TableCell>
                                                        <TableCell>
                                                            {item.costPrice ? `LKR ${item.costPrice.toFixed(2)}` : "Not set"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.actualWeight ? `${item.actualWeight} kg` : "Not set"}
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

                {/* Edit Issue Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Edit Issue Note</DialogTitle>
                            <DialogDescription>Update issue details and assign batches</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="deliveryExpectedDate">Expected Delivery Date</Label>
                                    <Input
                                        id="deliveryExpectedDate"
                                        type="date"
                                        value={editForm.deliveryExpectedDate}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, deliveryExpectedDate: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="editRemarks">Remarks</Label>
                                    <Input
                                        id="editRemarks"
                                        placeholder="Enter remarks..."
                                        value={editForm.remarks}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Items & Batch Assignment</Label>
                                {selectedNote?.items && selectedNote.items.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedNote.items.map((item, index) => (
                                            <div key={index} className="p-4 border rounded-lg">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-medium">{item.item?.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Requested: {item.requestedQuantity} {item.unit?.name}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleShowBatches(item)}
                                                    >
                                                        <Package className="h-4 w-4 mr-1" />
                                                        Assign Batch
                                                    </Button>
                                                </div>

                                                <div className="grid grid-cols-4 gap-2 mt-2">
                                                    <div>
                                                        <Label className="text-xs">Issued Quantity</Label>
                                                        <Input
                                                            type="number"
                                                            size="sm"
                                                            value={editForm.items?.find(ei => ei.itemId === item.itemId)?.issuedQuantity || item.requestedQuantity}
                                                            onChange={(e) => {
                                                                const itemIndex = editForm.items?.findIndex(ei => ei.itemId === item.itemId) ?? -1
                                                                if (itemIndex >= 0) {
                                                                    const updatedItems = [...(editForm.items || [])]
                                                                    updatedItems[itemIndex].issuedQuantity = parseFloat(e.target.value)
                                                                    setEditForm(prev => ({ ...prev, items: updatedItems }))
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Cost Price</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            size="sm"
                                                            value={editForm.items?.find(ei => ei.itemId === item.itemId)?.costPrice || ""}
                                                            onChange={(e) => {
                                                                const itemIndex = editForm.items?.findIndex(ei => ei.itemId === item.itemId) ?? -1
                                                                if (itemIndex >= 0) {
                                                                    const updatedItems = [...(editForm.items || [])]
                                                                    updatedItems[itemIndex].costPrice = parseFloat(e.target.value)
                                                                    setEditForm(prev => ({ ...prev, items: updatedItems }))
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Weight (kg)</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.1"
                                                            size="sm"
                                                            value={editForm.items?.find(ei => ei.itemId === item.itemId)?.actualWeight || ""}
                                                            onChange={(e) => {
                                                                const itemIndex = editForm.items?.findIndex(ei => ei.itemId === item.itemId) ?? -1
                                                                if (itemIndex >= 0) {
                                                                    const updatedItems = [...(editForm.items || [])]
                                                                    updatedItems[itemIndex].actualWeight = parseFloat(e.target.value)
                                                                    setEditForm(prev => ({ ...prev, items: updatedItems }))
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Batch</Label>
                                                        <p className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                            {editForm.items?.find(ei => ei.itemId === item.itemId)?.batchId || "Not assigned"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No items found</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateNote}>
                                Update Issue Note
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Available Batches Dialog */}
                <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Available Batches</DialogTitle>
                            <DialogDescription>
                                Select a batch for {selectedItemForBatch?.item?.name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[50vh] overflow-y-auto">
                            {availableBatches.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Batch Number</TableHead>
                                            <TableHead>Available Qty</TableHead>
                                            <TableHead>Cost Price</TableHead>
                                            <TableHead>Expiry Date</TableHead>
                                            <TableHead>Quality Grade</TableHead>
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {availableBatches.map((batch) => (
                                            <TableRow key={batch.id}>
                                                <TableCell className="font-mono text-sm">{batch.batchNumber}</TableCell>
                                                <TableCell>{batch.availableQuantity}</TableCell>
                                                <TableCell>LKR {batch.costPrice.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : "N/A"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{batch.qualityGrade || "N/A"}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAssignBatch(batch.id, batch.costPrice)}
                                                        disabled={batch.availableQuantity < (selectedItemForBatch?.requestedQuantity || 0)}
                                                    >
                                                        Assign
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8">
                                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">No available batches found</p>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Approval Dialog */}
                <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Approve/Reject Issue Note</DialogTitle>
                            <DialogDescription>Review and approve or reject this issue note</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4">
                            <div>
                                <Label htmlFor="approvalRemarks">Remarks</Label>
                                <Textarea
                                    id="approvalRemarks"
                                    placeholder="Add approval/rejection remarks..."
                                    value={approvalForm.remarks}
                                    onChange={(e) => setApprovalForm(prev => ({ ...prev, remarks: e.target.value }))}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => handleApprovalAction("Rejected")}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                            </Button>
                            <Button onClick={() => handleApprovalAction("Approved")}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ERPLayout>
    )
}