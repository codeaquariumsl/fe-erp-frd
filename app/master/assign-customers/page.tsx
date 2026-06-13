"use client"

import { useState, useEffect, useMemo } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import {
    Users,
    Search,
    Plus,
    Trash2,
    UserCheck,
    Building2,
    ShoppingCart,
    User as UserIcon,
    Loader2
} from "lucide-react"
import { usersApi, customersApi, type User, type Customer, type AssignedCustomer } from "@/lib/api"

export default function AssignCustomersPage() {
    const { toast } = useToast()
    const [salesPersons, setSalesPersons] = useState<User[]>([])
    const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string | null>(null)

    const [assignedCustomers, setAssignedCustomers] = useState<AssignedCustomer[]>([])
    const [allCustomers, setAllCustomers] = useState<Customer[]>([])

    const [isLoadingSalesPersons, setIsLoadingSalesPersons] = useState(false)
    const [isLoadingAssigned, setIsLoadingAssigned] = useState(false)
    const [isLoadingAllCustomers, setIsLoadingAllCustomers] = useState(false)
    const [isAssigning, setIsAssigning] = useState(false)

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [customerSearchTerm, setCustomerSearchTerm] = useState("")
    const [assignedSearchTerm, setAssignedSearchTerm] = useState("")
    const [selectedCustomersToAssign, setSelectedCustomersToAssign] = useState<number[]>([])

    // Load Sales Persons on mount
    useEffect(() => {
        loadSalesPersons()
    }, [])

    // Load assigned customers when sales person is selected
    useEffect(() => {
        if (selectedSalesPersonId) {
            loadAssignedCustomers(Number(selectedSalesPersonId))
        } else {
            setAssignedCustomers([])
        }
        setAssignedSearchTerm("")
    }, [selectedSalesPersonId])

    // Load all customers when add dialog is opened
    useEffect(() => {
        if (isAddDialogOpen && allCustomers.length === 0) {
            loadAllCustomers()
        }
    }, [isAddDialogOpen])

    const loadSalesPersons = async () => {
        try {
            setIsLoadingSalesPersons(true)
            const data = await usersApi.getSalesPersons()
            setSalesPersons(data)
        } catch (error) {
            console.error("Failed to load sales persons:", error)
            toast({
                title: "Error",
                description: "Failed to load sales persons.",
                variant: "destructive"
            })
        } finally {
            setIsLoadingSalesPersons(false)
        }
    }

    const loadAssignedCustomers = async (userId: number) => {
        try {
            setIsLoadingAssigned(true)
            const data = await usersApi.getAssignedCustomers(userId)
            setAssignedCustomers(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Failed to load assigned customers:", error)
            toast({
                title: "Error",
                description: "Failed to load assigned customers.",
                variant: "destructive"
            })
            setAssignedCustomers([])
        } finally {
            setIsLoadingAssigned(false)
        }
    }

    const loadAllCustomers = async () => {
        try {
            setIsLoadingAllCustomers(true)
            const data = await customersApi.getAll()
            setAllCustomers(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Failed to load customers:", error)
            toast({
                title: "Error",
                description: "Failed to load customers list.",
                variant: "destructive"
            })
        } finally {
            setIsLoadingAllCustomers(false)
        }
    }

    const handleAssignCustomers = async () => {
        if (!selectedSalesPersonId || selectedCustomersToAssign.length === 0) return

        try {
            setIsAssigning(true)
            await usersApi.assignCustomers(Number(selectedSalesPersonId), selectedCustomersToAssign)

            toast({
                title: "Success",
                description: `Successfully assigned ${selectedCustomersToAssign.length} customers.`,
            })

            // Refresh assigned list
            await loadAssignedCustomers(Number(selectedSalesPersonId))

            // Close dialog and reset selection
            setIsAddDialogOpen(false)
            setSelectedCustomersToAssign([])
            setCustomerSearchTerm("")
        } catch (error) {
            console.error("Failed to assign customers:", error)
            toast({
                title: "Error",
                description: "Failed to assign customers.",
                variant: "destructive"
            })
        } finally {
            setIsAssigning(false)
        }
    }

    const handleRemoveAssignment = async (customerId: number) => {
        if (!selectedSalesPersonId) return

        try {
            await usersApi.removeCustomerAssignment(Number(selectedSalesPersonId), customerId)

            toast({
                title: "Success",
                description: "Customer assignment removed.",
            })

            // Optimistically update list
            setAssignedCustomers(prev => prev.filter(c => c.id !== customerId))
        } catch (error) {
            console.error("Failed to remove assignment:", error)
            toast({
                title: "Error",
                description: "Failed to remove assignment.",
                variant: "destructive"
            })
        }
    }

    const toggleCustomerSelection = (customerId: number) => {
        setSelectedCustomersToAssign(prev =>
            prev.includes(customerId)
                ? prev.filter(id => id !== customerId)
                : [...prev, customerId]
        )
    }

    // Filter out customers already assigned to the currently selected sales person
    // And filter by search term
    const availableCustomers = useMemo(() => {
        const assignedIds = new Set(assignedCustomers.map(c => c.id))

        return allCustomers.filter(c =>
            !assignedIds.has(c.id) &&
            (c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                c.contactPerson.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                (c.email && c.email.toLowerCase().includes(customerSearchTerm.toLowerCase())))
        )
    }, [allCustomers, assignedCustomers, customerSearchTerm])

    const filteredAssignedCustomers = useMemo(() => {
        return assignedCustomers.filter(c =>
            c.name.toLowerCase().includes(assignedSearchTerm.toLowerCase()) ||
            (c.contactPerson && c.contactPerson.toLowerCase().includes(assignedSearchTerm.toLowerCase())) ||
            (c.address && c.address.toLowerCase().includes(assignedSearchTerm.toLowerCase()))
        )
    }, [assignedCustomers, assignedSearchTerm])

    const getCustomerTypeIcon = (type: string) => {
        switch (type) {
            case "Supermarket":
                return <Building2 className="h-4 w-4" />
            case "Wholesaler":
            case "Distributor":
                return <ShoppingCart className="h-4 w-4" />
            default:
                return <UserIcon className="h-4 w-4" />
        }
    }

    return (
        <ERPLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <UserCheck className="h-6 w-6" />
                            Assign Customers
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Assign customers to sales persons for route management
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Sales Person Selection</CardTitle>
                        <CardDescription>Select a sales person to view and manage their assigned customers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-md">
                            <Select
                                value={selectedSalesPersonId || ""}
                                onValueChange={setSelectedSalesPersonId}
                                disabled={isLoadingSalesPersons}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoadingSalesPersons ? "Loading..." : "Select Sales Person"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {salesPersons.map((person) => (
                                        <SelectItem key={person.id} value={person.id.toString()}>
                                            {person.username}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {selectedSalesPersonId && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Assigned Customers</CardTitle>
                                <CardDescription>
                                    {isLoadingAssigned
                                        ? "Loading customers..."
                                        : `${assignedCustomers.length} customers assigned`}
                                </CardDescription>
                            </div>
                            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Assign New
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                                    <DialogHeader>
                                        <DialogTitle>Assign Customers to Sales Person</DialogTitle>
                                        <DialogDescription>
                                            Select customers to assign. Customers already assigned are hidden.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="relative mb-4">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search customers by name, contact or email..."
                                            className="pl-9"
                                            value={customerSearchTerm}
                                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex-1 overflow-auto border rounded-md">
                                        {isLoadingAllCustomers ? (
                                            <div className="flex items-center justify-center h-40">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                        ) : availableCustomers.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                                <p>No available customers found.</p>
                                                {customerSearchTerm && <p className="text-xs">Try a different search term.</p>}
                                            </div>
                                        ) : (
                                            <Table>
                                                <TableHeader className="bg-muted/50 sticky top-0">
                                                    <TableRow>
                                                        <TableHead className="w-[50px]">
                                                            <Checkbox
                                                                checked={
                                                                    availableCustomers.length > 0 &&
                                                                    availableCustomers.every(c => selectedCustomersToAssign.includes(c.id))
                                                                }
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        setSelectedCustomersToAssign(availableCustomers.map(c => c.id))
                                                                    } else {
                                                                        setSelectedCustomersToAssign([])
                                                                    }
                                                                }}
                                                            />
                                                        </TableHead>
                                                        <TableHead>Customer Name</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Location</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {availableCustomers.map((customer) => (
                                                        <TableRow key={customer.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => toggleCustomerSelection(customer.id)}>
                                                            <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                                                                <Checkbox
                                                                    checked={selectedCustomersToAssign.includes(customer.id)}
                                                                    onCheckedChange={() => toggleCustomerSelection(customer.id)}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="font-medium py-2">
                                                                <span className="flex items-center gap-2">
                                                                    {customer.name}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="py-2">
                                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                                    {getCustomerTypeIcon(customer.type)}
                                                                    <span className="text-xs">{customer.type}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground truncate max-w-[200px] py-2">
                                                                {customer.address}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </div>

                                    <DialogFooter className="mt-4 gap-2">
                                        <div className="flex-1 text-sm text-muted-foreground flex items-center">
                                            {selectedCustomersToAssign.length} customers selected
                                        </div>
                                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleAssignCustomers} disabled={selectedCustomersToAssign.length === 0 || isAssigning}>
                                            {isAssigning ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Assigning...
                                                </>
                                            ) : (
                                                "Assign Customers"
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <div className="relative mb-4">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search assigned customers..."
                                    className="pl-9"
                                    value={assignedSearchTerm}
                                    onChange={(e) => setAssignedSearchTerm(e.target.value)}
                                />
                            </div>
                            {isLoadingAssigned ? (
                                <div className="flex flex-col items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="mt-2 text-sm text-muted-foreground">Loading assigned customers...</p>
                                </div>
                            ) : assignedCustomers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg text-muted-foreground">
                                    <UserCheck className="h-10 w-10 mb-2 opacity-20" />
                                    <p>No customers assigned yet.</p>
                                    <p className="text-xs">Click "Assign New" to get started.</p>
                                </div>
                            ) : (
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Customer Name</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Address</TableHead>
                                                <TableHead>Contact</TableHead>
                                                <TableHead>Assigned Date</TableHead>
                                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredAssignedCustomers.map((customer) => (
                                                <TableRow key={customer.id}>
                                                    <TableCell className="font-medium py-2">{customer.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="flex w-fit items-center gap-1 font-normal">
                                                            {getCustomerTypeIcon(customer.type)}
                                                            {customer.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate py-2">
                                                        {customer.address}
                                                    </TableCell>
                                                    <TableCell className="text-sm py-2">
                                                        <div className="flex flex-col">
                                                            <span>{customer.contactPerson}</span>
                                                            <span className="text-xs text-muted-foreground">{customer.contactNumber}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground py-2">
                                                        {customer.assignedDate ? new Date(customer.assignedDate).toLocaleDateString() : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right py-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                            onClick={() => handleRemoveAssignment(customer.id)}
                                                            title="Remove Assignment"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </ERPLayout>
    )
}
