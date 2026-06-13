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
import { Plus, Eye, Edit, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"
import {
    goodRequestNotesApi,
    locationsApi,
    storesApi,
    itemsApi,
    unitsApi,
    type GoodRequestNote,
    type Location,
    type Store,
    type Item,
    type Unit,
    type CreateGoodRequestNoteRequest,
    type ApproveRejectGoodRequestNoteRequest
} from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { usePagination } from "@/hooks/use-pagination"
import { ERPLayout } from "@/components/layouts/erp-layout"

const statusColors = {
    "Pending": "bg-yellow-100 text-yellow-800",
    "Approved": "bg-green-100 text-green-800",
    "Rejected": "bg-red-100 text-red-800",
    "Processed": "bg-blue-100 text-blue-800",
}

const priorityColors = {
    "Urgent": "bg-red-100 text-red-800",
    "High": "bg-orange-100 text-orange-800",
    "Normal": "bg-blue-100 text-blue-800",
    "Low": "bg-gray-100 text-gray-800",
}

export default function GoodRequestNotesPage() {
    const [requestNotes, setRequestNotes] = useState<GoodRequestNote[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [stores, setStores] = useState<Store[]>([])
    const [fromStores, setFromStores] = useState<Store[]>([])
    const [toStores, setToStores] = useState<Store[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedNote, setSelectedNote] = useState<GoodRequestNote | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [priorityFilter, setPriorityFilter] = useState<string>("all")
    const [locationFilter, setLocationFilter] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")

    // Create form state
    const [createForm, setCreateForm] = useState<CreateGoodRequestNoteRequest>({
        requestDate: new Date().toISOString().split('T')[0],
        fromLocationId: 0,
        fromStoreId: 0,
        toLocationId: 0,
        toStoreId: 0,
        priority: "Normal",
        expectedDeliveryDate: "",
        remarks: "",
        items: []
    })

    // Approval form state
    const [approvalForm, setApprovalForm] = useState<ApproveRejectGoodRequestNoteRequest>({
        status: "Approved",
        remarks: "",
        itemApprovals: []
    })

    // Filter function for pagination
    const filterFn = (note: GoodRequestNote): boolean => {
        const matchesSearch = searchTerm === "" ||
            Boolean(note.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.fromLocation?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.toLocation?.name?.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesStatus = statusFilter === "all" || note.status === statusFilter
        const matchesPriority = priorityFilter === "all" || note.priority === priorityFilter
        const matchesLocation = locationFilter === "all" ||
            note.fromLocationId.toString() === locationFilter ||
            note.toLocationId.toString() === locationFilter

        return Boolean(matchesSearch && matchesStatus && matchesPriority && matchesLocation)
    }

    const { currentPage, itemsPerPage, totalPages, paginatedData, handlePageChange, handleItemsPerPageChange } = usePagination({
        data: requestNotes,
        filterFn
    })

    const fetchRequestNotes = async () => {
        try {
            setLoading(true)
            const data = await goodRequestNotesApi.getAll()
            console.log('Fetched request notes:', data) // Debug log
            setRequestNotes(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Error fetching good request notes:", error)
            setRequestNotes([])
            toast({
                title: "Error",
                description: "Failed to fetch good request notes",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchMasterData = async () => {
        try {
            const [locationsData, itemsData, unitsData] = await Promise.all([
                locationsApi.getAll(),
                itemsApi.getAll(),
                unitsApi.getActive(),
            ])

            setLocations(locationsData as Location[])
            setItems(itemsData as Item[])
            setUnits(unitsData as Unit[])
        } catch (error) {
            console.error("Error fetching master data:", error)
            toast({
                title: "Error",
                description: "Failed to fetch master data",
                variant: "destructive",
            })
        }
    }

    const handleCreateNote = async () => {
        try {
            if (!createForm.fromLocationId || !createForm.toLocationId) {
                toast({
                    title: "Error",
                    description: "Please select both from and to locations",
                    variant: "destructive",
                })
                return
            }

            await goodRequestNotesApi.create(createForm)
            toast({
                title: "Success",
                description: "Good request note created successfully",
            })
            fetchRequestNotes()
            setIsCreateDialogOpen(false)
            resetCreateForm()
        } catch (error) {
            console.error("Error creating good request note:", error)
            toast({
                title: "Error",
                description: "Failed to create good request note",
                variant: "destructive",
            })
        }
    }

    const handleApprovalAction = async (action: "Approved" | "Rejected") => {
        try {
            if (!selectedNote?.id) return

            const payload = {
                ...approvalForm,
                status: action,
            }

            const result = await goodRequestNotesApi.approveReject(selectedNote.id, payload)

            toast({
                title: "Success",
                description: `Good request note ${action.toLowerCase()} successfully${result.issueNoteId ? ` - Issue Note #${result.issueNoteId} created automatically` : ''
                    }`,
            })
            fetchRequestNotes()
            setIsApprovalDialogOpen(false)
            setApprovalForm({ status: "Approved", remarks: "", itemApprovals: [] })
        } catch (error) {
            console.error("Error updating good request note:", error)
            toast({
                title: "Error",
                description: "Failed to update good request note",
                variant: "destructive",
            })
        }
    }

    const handleDeleteNote = async (noteId: number) => {
        if (!confirm("Are you sure you want to delete this good request note?")) return

        try {
            await goodRequestNotesApi.remove(noteId)
            toast({
                title: "Success",
                description: "Good request note deleted successfully",
            })
            fetchRequestNotes()
        } catch (error) {
            console.error("Error deleting good request note:", error)
            toast({
                title: "Error",
                description: "Failed to delete good request note",
                variant: "destructive",
            })
        }
    }

    const resetCreateForm = () => {
        setCreateForm({
            requestDate: new Date().toISOString().split('T')[0],
            fromLocationId: 0,
            fromStoreId: 0,
            toLocationId: 0,
            toStoreId: 0,
            priority: "Normal",
            expectedDeliveryDate: "",
            remarks: "",
            items: []
        })
    }

    const addItemToCreateForm = () => {
        setCreateForm(prev => ({
            ...prev,
            items: [...prev.items, {
                itemId: 0,
                requestedQuantity: 0,
                unitId: 0,
                estimatedWeight: 0,
                urgency: "Normal",
                purpose: "",
                remarks: ""
            }]
        }))
    }

    const updateCreateFormItem = (index: number, field: string, value: any) => {
        setCreateForm(prev => ({
            ...prev,
            items: prev.items.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }))
    }

    const removeCreateFormItem = (index: number) => {
        setCreateForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }))
    }

    useEffect(() => {
        fetchMasterData()
    }, [])

    useEffect(() => {
        fetchRequestNotes()
    }, [])

    // Fetch stores when from location changes
    useEffect(() => {
        const fetchFromStores = async () => {
            if (createForm.fromLocationId > 0) {
                try {
                    const response = await storesApi.getByLocation(createForm.fromLocationId)
                    const storesData = response?.data || []
                    setFromStores(Array.isArray(storesData) ? storesData : [])
                } catch (error) {
                    console.error("Error fetching from stores:", error)
                    setFromStores([])
                }
            } else {
                setFromStores([])
            }
        }
        fetchFromStores()
    }, [createForm.fromLocationId])

    // Fetch stores when to location changes
    useEffect(() => {
        const fetchToStores = async () => {
            if (createForm.toLocationId > 0) {
                try {
                    const response = await storesApi.getByLocation(createForm.toLocationId)
                    const storesData = response?.data || []
                    setToStores(Array.isArray(storesData) ? storesData : [])
                } catch (error) {
                    console.error("Error fetching to stores:", error)
                    setToStores([])
                }
            } else {
                setToStores([])
            }
        }
        fetchToStores()
    }, [createForm.toLocationId])

    // Reset store selections when locations change
    useEffect(() => {
        setCreateForm(prev => ({ ...prev, fromStoreId: 0 }))
    }, [createForm.fromLocationId])

    useEffect(() => {
        setCreateForm(prev => ({ ...prev, toStoreId: 0 }))
    }, [createForm.toLocationId])

    useEffect(() => {
        // Initialize approval form when selectedNote changes
        if (selectedNote?.items) {
            setApprovalForm(prev => ({
                ...prev,
                itemApprovals: selectedNote.items?.map(item => ({
                    itemId: item.itemId,
                    approvedQuantity: item.requestedQuantity
                })) || []
            }))
        }
    }, [selectedNote])

    if (loading && requestNotes.length === 0) {
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
                        <h1 className="text-3xl font-bold">Good Request Notes</h1>
                        <p className="text-muted-foreground">Manage goods request and approval workflow</p>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Request
                    </Button>
                </div>

                <Tabs defaultValue="requests" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="requests">All Requests</TabsTrigger>
                        <TabsTrigger value="stats">Statistics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="requests" className="space-y-4">
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
                                            <SelectItem value="Approved">Approved</SelectItem>
                                            <SelectItem value="Rejected">Rejected</SelectItem>
                                            <SelectItem value="Processed">Processed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-48">
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Priorities" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Priorities</SelectItem>
                                            <SelectItem value="Urgent">Urgent</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Normal">Normal</SelectItem>
                                            <SelectItem value="Low">Low</SelectItem>
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

                            {/* Requests Table */}

                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Document Number</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>From → To</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Request Date</TableHead>
                                            <TableHead>Expected Delivery</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedData.map((note) => (
                                            <TableRow key={note.id}>
                                                {/* <TableCell className="font-medium">#{note.id}</TableCell> */}
                                                <TableCell>
                                                    <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                                                        {note.documentNumber || "N/A"}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={priorityColors[note.priority as keyof typeof priorityColors] || "bg-gray-100 text-gray-800"}>
                                                        {note.priority}
                                                    </Badge>
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
                                                    {note.requestDate ? new Date(note.requestDate).toLocaleDateString() : "N/A"}
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
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => note.id && handleDeleteNote(note.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
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
                                <CardTitle>Request Statistics</CardTitle>
                                <CardDescription>Overview of good request notes</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{requestNotes.length}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {requestNotes.filter(r => r.status === "Pending").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {requestNotes.filter(r => r.status === "Approved").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Urgent Requests</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {requestNotes.filter(r => r.priority === "Urgent").length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* View Request Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Good Request Note Details</DialogTitle>
                            <DialogDescription>View request information and items</DialogDescription>
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
                                        <Label>Request Date</Label>
                                        <p className="text-sm">
                                            {selectedNote.requestDate ? new Date(selectedNote.requestDate).toLocaleDateString() : "N/A"}
                                        </p>
                                    </div>
                                    {selectedNote.expectedDeliveryDate && (
                                        <div>
                                            <Label>Expected Delivery Date</Label>
                                            <p className="text-sm">{new Date(selectedNote.expectedDeliveryDate).toLocaleDateString()}</p>
                                        </div>
                                    )}
                                    <div>
                                        <Label>Priority</Label>
                                        <Badge className={priorityColors[selectedNote.priority as keyof typeof priorityColors] || "bg-gray-100 text-gray-800"}>
                                            {selectedNote.priority}
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
                                    <div>
                                        <Label>Status</Label>
                                        <Badge className={statusColors[selectedNote.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                                            {selectedNote.status}
                                        </Badge>
                                    </div>
                                </div>

                                {selectedNote.remarks && (
                                    <div>
                                        <Label>Remarks</Label>
                                        <p className="text-sm">{selectedNote.remarks}</p>
                                    </div>
                                )}

                                <div>
                                    <Label>Requested Items</Label>
                                    {selectedNote.items && selectedNote.items.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Requested Qty</TableHead>
                                                    <TableHead>Approved Qty</TableHead>
                                                    <TableHead>Unit</TableHead>
                                                    <TableHead>Urgency</TableHead>
                                                    <TableHead>Purpose</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedNote.items.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{item.item?.name || "N/A"}</TableCell>
                                                        <TableCell>{item.requestedQuantity}</TableCell>
                                                        <TableCell>{item.approvedQuantity || "Not set"}</TableCell>
                                                        <TableCell>{item.unit?.name || "N/A"}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs">
                                                                {item.urgency}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{item.purpose || "N/A"}</TableCell>
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

                {/* Create Request Dialog */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogContent className="max-w-5xl  max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create Good Request Note</DialogTitle>
                            <DialogDescription>Create a new goods request with items</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="requestDate">Request Date</Label>
                                    <Input
                                        id="requestDate"
                                        type="date"
                                        value={createForm.requestDate}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, requestDate: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="fromLocation">From Location</Label>
                                    <Select value={createForm.fromLocationId.toString()} onValueChange={(value) => setCreateForm(prev => ({ ...prev, fromLocationId: parseInt(value) }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Location" />
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
                                <div>
                                    <Label htmlFor="toLocation">To Location</Label>
                                    <Select value={createForm.toLocationId.toString()} onValueChange={(value) => setCreateForm(prev => ({ ...prev, toLocationId: parseInt(value) }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Location" />
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
                                <div>
                                    <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                                    <Input
                                        id="expectedDeliveryDate"
                                        type="date"
                                        value={createForm.expectedDeliveryDate}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="fromStore">From Store</Label>
                                    <Select value={createForm.fromStoreId.toString()} onValueChange={(value) => setCreateForm(prev => ({ ...prev, fromStoreId: parseInt(value) }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={createForm.fromLocationId ? "Select Store" : "Select From Location first"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fromStores.length > 0 ? (
                                                fromStores.map((store) => (
                                                    <SelectItem key={store.id} value={store.id.toString()}>
                                                        {store.name}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="0" disabled>
                                                    {createForm.fromLocationId ? "No stores available" : "Select location first"}
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="toStore">To Store</Label>
                                    <Select value={createForm.toStoreId.toString()} onValueChange={(value) => setCreateForm(prev => ({ ...prev, toStoreId: parseInt(value) }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={createForm.toLocationId ? "Select Store" : "Select To Location first"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {toStores.length > 0 ? (
                                                toStores.map((store) => (
                                                    <SelectItem key={store.id} value={store.id.toString()}>
                                                        {store.name}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="0" disabled>
                                                    {createForm.toLocationId ? "No stores available" : "Select location first"}
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select value={createForm.priority} onValueChange={(value) => setCreateForm(prev => ({ ...prev, priority: value as any }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Low">Low</SelectItem>
                                            <SelectItem value="Normal">Normal</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="remarks">Remarks</Label>
                                <Textarea
                                    id="remarks"
                                    placeholder="Enter any remarks..."
                                    value={createForm.remarks}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, remarks: e.target.value }))}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <Label className="text-lg font-semibold">Requested Items</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addItemToCreateForm}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Item
                                    </Button>
                                </div>

                                {createForm.items.length > 0 ? (
                                    <div className="border rounded-lg">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead className="w-[280px]">Item</TableHead>
                                                    <TableHead className="w-[120px]">Quantity</TableHead>
                                                    <TableHead className="w-[120px]">Unit</TableHead>
                                                    <TableHead className="w-[120px]">Urgency</TableHead>
                                                    <TableHead className="min-w-[200px]">Purpose</TableHead>
                                                    <TableHead className="w-[80px]">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {createForm.items.map((item, index) => (
                                                    <TableRow key={index} className="group hover:bg-muted/30">
                                                        <TableCell>
                                                            <Select
                                                                value={item.itemId.toString()}
                                                                onValueChange={(value) => updateCreateFormItem(index, 'itemId', parseInt(value))}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select Item" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {items.map((itemOption) => (
                                                                        <SelectItem key={itemOption.id} value={itemOption.id.toString()}>
                                                                            <div className="flex flex-col">
                                                                                <span className="font-medium">{itemOption.name}</span>
                                                                                {/* <span className="text-xs text-muted-foreground">
                                                                                    SKU: {itemOption.sku || 'N/A'}
                                                                                </span> */}
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                placeholder="0"
                                                                value={item.requestedQuantity || ''}
                                                                onChange={(e) => updateCreateFormItem(index, 'requestedQuantity', parseFloat(e.target.value) || 0)}
                                                                className="w-full"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={item.unitId.toString()}
                                                                onValueChange={(value) => updateCreateFormItem(index, 'unitId', parseInt(value))}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Unit" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {units.map((unit) => (
                                                                        <SelectItem key={unit.id} value={unit.id.toString()}>
                                                                            {unit.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={item.urgency}
                                                                onValueChange={(value) => updateCreateFormItem(index, 'urgency', value)}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Urgency" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Low">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                                                            Low
                                                                        </div>
                                                                    </SelectItem>
                                                                    <SelectItem value="Normal">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                                                            Normal
                                                                        </div>
                                                                    </SelectItem>
                                                                    <SelectItem value="High">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                                                            High
                                                                        </div>
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        {/* <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.1"
                                                                placeholder="0.0"
                                                                value={item.estimatedWeight || ''}
                                                                onChange={(e) => updateCreateFormItem(index, 'estimatedWeight', parseFloat(e.target.value) || 0)}
                                                                className="w-full"
                                                            />
                                                        </TableCell> */}
                                                        <TableCell>
                                                            <Input
                                                                placeholder="Purpose of request..."
                                                                value={item.purpose || ''}
                                                                onChange={(e) => updateCreateFormItem(index, 'purpose', e.target.value)}
                                                                className="w-full"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeCreateFormItem(index)}
                                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>

                                        {/* Summary Section */}
                                        <div className="border-t bg-muted/20 p-4">
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="flex gap-6">
                                                    <span className="font-medium">
                                                        Total Items: <span className="text-blue-600">{createForm.items.length}</span>
                                                    </span>
                                                    <span className="font-medium">
                                                        Total Quantity: <span className="text-purple-600">
                                                            {createForm.items.reduce((sum, item) => sum + (item.requestedQuantity || 0), 0).toFixed(2)}
                                                        </span>
                                                    </span>
                                                </div>
                                                {/* <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={addItemToCreateForm}
                                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                >
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Add Another Item
                                                </Button> */}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                                        <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
                                            <Plus className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <h3 className="font-medium text-muted-foreground mb-2">No items added yet</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Add items to your good request note to continue
                                        </p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={addItemToCreateForm}
                                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add First Item
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateNote}>
                                Create Request
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Approval Dialog */}
                <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Approve/Reject Request</DialogTitle>
                            <DialogDescription>Review and approve or reject this good request note</DialogDescription>
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

                            {selectedNote?.items && (
                                <div>
                                    <Label>Item Approvals</Label>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {selectedNote.items.map((item, index) => (
                                            <div key={index} className="flex items-center gap-4 p-2 border rounded">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{item.item?.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Requested: {item.requestedQuantity} {item.unit?.name}
                                                    </p>
                                                </div>
                                                <div className="w-32">
                                                    <Label className="text-xs">Approved Qty</Label>
                                                    <Input
                                                        type="number"
                                                        value={approvalForm.itemApprovals?.[index]?.approvedQuantity || 0}
                                                        onChange={(e) => {
                                                            const newApprovals = [...(approvalForm.itemApprovals || [])]
                                                            newApprovals[index] = {
                                                                itemId: item.itemId,
                                                                approvedQuantity: parseFloat(e.target.value)
                                                            }
                                                            setApprovalForm(prev => ({ ...prev, itemApprovals: newApprovals }))
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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