"use client"

import { useState, useEffect, useMemo } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
    Users,
    Search,
    ArrowRightLeft,
    Building2,
    ShoppingCart,
    User as UserIcon,
    Loader2,
    ArrowRight,
    CheckCircle2,
    UserCheck,
    FilterX
} from "lucide-react"
import { usersApi, type User, type AssignedCustomer } from "@/lib/api"

export default function TransferCustomersPage() {
    const { toast } = useToast()

    const [salesPersons, setSalesPersons] = useState<User[]>([])
    const [fromSalesPersonId, setFromSalesPersonId] = useState<string | null>(null)
    const [toSalesPersonId, setToSalesPersonId] = useState<string | null>(null)

    const [assignedCustomers, setAssignedCustomers] = useState<AssignedCustomer[]>([])
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([])

    const [isLoadingSalesPersons, setIsLoadingSalesPersons] = useState(false)
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
    const [isTransferring, setIsTransferring] = useState(false)

    const [searchTerm, setSearchTerm] = useState("")

    // Load Sales Persons on component mount
    useEffect(() => {
        loadSalesPersons()
    }, [])

    // Load customers whenever source sales person changes
    useEffect(() => {
        if (fromSalesPersonId) {
            loadAssignedCustomers(Number(fromSalesPersonId))
        } else {
            setAssignedCustomers([])
        }
        setSelectedCustomerIds([])
        setSearchTerm("")
    }, [fromSalesPersonId])

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
            setIsLoadingCustomers(true)
            const data = await usersApi.getAssignedCustomers(userId)
            setAssignedCustomers(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Failed to load assigned customers:", error)
            toast({
                title: "Error",
                description: "Failed to load customers for the selected sales person.",
                variant: "destructive"
            })
            setAssignedCustomers([])
        } finally {
            setIsLoadingCustomers(false)
        }
    }

    // Filter customers based on search query
    const filteredCustomers = useMemo(() => {
        if (!searchTerm.trim()) return assignedCustomers
        const query = searchTerm.toLowerCase()
        return assignedCustomers.filter(c =>
            c.name?.toLowerCase().includes(query) ||
            c.contactPerson?.toLowerCase().includes(query) ||
            c.address?.toLowerCase().includes(query) ||
            c.type?.toLowerCase().includes(query) ||
            c.contactNumber?.toLowerCase().includes(query)
        )
    }, [assignedCustomers, searchTerm])

    // Toggle individual selection
    const toggleSelectCustomer = (customerId: number) => {
        setSelectedCustomerIds(prev =>
            prev.includes(customerId)
                ? prev.filter(id => id !== customerId)
                : [...prev, customerId]
        )
    }

    // Toggle Select All filtered customers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allFilteredIds = filteredCustomers.map(c => c.id)
            // Combine with previously selected that are not in current filter
            const newSelection = Array.from(new Set([...selectedCustomerIds, ...allFilteredIds]))
            setSelectedCustomerIds(newSelection)
        } else {
            const filteredIdsSet = new Set(filteredCustomers.map(c => c.id))
            setSelectedCustomerIds(prev => prev.filter(id => !filteredIdsSet.has(id)))
        }
    }

    const isAllFilteredSelected = useMemo(() => {
        if (filteredCustomers.length === 0) return false
        return filteredCustomers.every(c => selectedCustomerIds.includes(c.id))
    }, [filteredCustomers, selectedCustomerIds])

    const isSomeFilteredSelected = useMemo(() => {
        if (filteredCustomers.length === 0) return false
        const filteredSelectedCount = filteredCustomers.filter(c => selectedCustomerIds.includes(c.id)).length
        return filteredSelectedCount > 0 && filteredSelectedCount < filteredCustomers.length
    }, [filteredCustomers, selectedCustomerIds])

    // Handle Transfer execution
    const handleTransfer = async () => {
        if (!fromSalesPersonId || !toSalesPersonId || selectedCustomerIds.length === 0) {
            toast({
                title: "Validation Error",
                description: "Please select source sales person, target sales person, and at least one customer.",
                variant: "destructive"
            })
            return
        }

        if (fromSalesPersonId === toSalesPersonId) {
            toast({
                title: "Invalid Target",
                description: "Source and Target sales persons must be different.",
                variant: "destructive"
            })
            return
        }

        try {
            setIsTransferring(true)
            await usersApi.transferCustomers(
                Number(fromSalesPersonId),
                Number(toSalesPersonId),
                selectedCustomerIds
            )

            const targetUser = salesPersons.find(sp => sp.id.toString() === toSalesPersonId)
            toast({
                title: "Transfer Successful",
                description: `Successfully transferred ${selectedCustomerIds.length} customer(s) to ${targetUser?.username || 'target sales person'}.`,
            })

            // Refresh assigned list for current source sales person
            await loadAssignedCustomers(Number(fromSalesPersonId))
            setSelectedCustomerIds([])
        } catch (error: any) {
            console.error("Failed to transfer customers:", error)
            toast({
                title: "Transfer Failed",
                description: error.message || "An error occurred while transferring customers.",
                variant: "destructive"
            })
        } finally {
            setIsTransferring(false)
        }
    }

    const getCustomerTypeIcon = (type: string) => {
        switch (type) {
            case "Supermarket":
                return <Building2 className="h-3.5 w-3.5" />
            case "Wholesaler":
            case "Distributor":
                return <ShoppingCart className="h-3.5 w-3.5" />
            default:
                return <UserIcon className="h-3.5 w-3.5" />
        }
    }

    const sourceSalesPerson = salesPersons.find(sp => sp.id.toString() === fromSalesPersonId)
    const targetSalesPerson = salesPersons.find(sp => sp.id.toString() === toSalesPersonId)

    return (
        <ERPLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ArrowRightLeft className="h-6 w-6 text-primary" />
                            Transfer Customers
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Transfer assigned customers from one sales person to another
                        </p>
                    </div>
                </div>

                {/* Main 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Columns: Source & Customer Selection List */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <UserCheck className="h-5 w-5 text-muted-foreground" />
                                    Step 1: Select Source Sales Person
                                </CardTitle>
                                <CardDescription>
                                    Choose the sales person whose customers you want to transfer
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="max-w-md">
                                    <Select
                                        value={fromSalesPersonId || ""}
                                        onValueChange={(val) => {
                                            setFromSalesPersonId(val)
                                            if (toSalesPersonId === val) setToSalesPersonId(null)
                                        }}
                                        disabled={isLoadingSalesPersons}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={isLoadingSalesPersons ? "Loading..." : "Select Source Sales Person"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {salesPersons.map((person) => (
                                                <SelectItem key={person.id} value={person.id.toString()}>
                                                    <span className="font-medium">{person.username}</span>
                                                    {person.fullName && <span className="text-muted-foreground text-xs ml-2">({person.fullName})</span>}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {fromSalesPersonId && (
                            <Card>
                                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Users className="h-5 w-5 text-muted-foreground" />
                                            Assigned Customers List
                                        </CardTitle>
                                        <CardDescription>
                                            {isLoadingCustomers
                                                ? "Loading customers..."
                                                : `${assignedCustomers.length} total customer(s) assigned to ${sourceSalesPerson?.username || ''}`}
                                        </CardDescription>
                                    </div>
                                    {selectedCustomerIds.length > 0 && (
                                        <Badge variant="secondary" className="w-fit text-xs font-semibold px-3 py-1 bg-primary/10 text-primary border-primary/20">
                                            {selectedCustomerIds.length} customer(s) selected
                                        </Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Search Bar */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search by customer name, contact, type or address..."
                                                className="pl-9"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        {searchTerm && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSearchTerm("")}
                                                className="h-9 px-2 text-xs"
                                            >
                                                <FilterX className="h-4 w-4 mr-1" />
                                                Clear
                                            </Button>
                                        )}
                                    </div>

                                    {/* Customer Table */}
                                    {isLoadingCustomers ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <p className="mt-2 text-sm text-muted-foreground">Loading assigned customers...</p>
                                        </div>
                                    ) : assignedCustomers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                                            <Users className="h-10 w-10 mb-2 opacity-20" />
                                            <p className="font-medium text-sm">No customers assigned</p>
                                            <p className="text-xs text-muted-foreground">This sales person does not have any customers to transfer.</p>
                                        </div>
                                    ) : filteredCustomers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-md">
                                            <p className="text-sm">No matching customers found for "{searchTerm}"</p>
                                        </div>
                                    ) : (
                                        <div className="border rounded-md overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead className="w-[45px] text-center">
                                                            <Checkbox
                                                                checked={isAllFilteredSelected ? true : isSomeFilteredSelected ? "indeterminate" : false}
                                                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                                            />
                                                        </TableHead>
                                                        <TableHead>Customer Name</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Contact Person</TableHead>
                                                        <TableHead>Address</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredCustomers.map((customer) => {
                                                        const isSelected = selectedCustomerIds.includes(customer.id)
                                                        return (
                                                            <TableRow
                                                                key={customer.id}
                                                                className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"}`}
                                                                onClick={() => toggleSelectCustomer(customer.id)}
                                                            >
                                                                <TableCell className="text-center py-2.5" onClick={(e) => e.stopPropagation()}>
                                                                    <Checkbox
                                                                        checked={isSelected}
                                                                        onCheckedChange={() => toggleSelectCustomer(customer.id)}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="font-medium py-2.5">
                                                                    {customer.name}
                                                                </TableCell>
                                                                <TableCell className="py-2.5">
                                                                    <Badge variant="outline" className="flex w-fit items-center gap-1 font-normal text-xs">
                                                                        {getCustomerTypeIcon(customer.type)}
                                                                        {customer.type}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-sm py-2.5">
                                                                    <div className="flex flex-col">
                                                                        <span>{customer.contactPerson || '-'}</span>
                                                                        {customer.contactNumber && (
                                                                            <span className="text-xs text-muted-foreground">{customer.contactNumber}</span>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate py-2.5">
                                                                    {customer.address || '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                                {filteredCustomers.length > 0 && (
                                    <CardFooter className="pt-0 flex justify-between text-xs text-muted-foreground border-t p-4 bg-muted/20">
                                        <span>Showing {filteredCustomers.length} of {assignedCustomers.length} customers</span>
                                        <span>{selectedCustomerIds.length} selected</span>
                                    </CardFooter>
                                )}
                            </Card>
                        )}
                    </div>

                    {/* Right 1 Column: Target Sales Person & Action Box */}
                    <div className="space-y-6">
                        <Card className="sticky top-6">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <ArrowRight className="h-5 w-5 text-primary" />
                                    Step 2: Select Target & Transfer
                                </CardTitle>
                                <CardDescription>
                                    Select destination sales person and execute transfer
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {/* Target Sales Person Select */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">
                                        Target Sales Person (Destination)
                                    </label>
                                    <Select
                                        value={toSalesPersonId || ""}
                                        onValueChange={setToSalesPersonId}
                                        disabled={!fromSalesPersonId || isLoadingSalesPersons}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={!fromSalesPersonId ? "Select Source first" : "Select Target Sales Person"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {salesPersons
                                                .filter(person => person.id.toString() !== fromSalesPersonId)
                                                .map((person) => (
                                                    <SelectItem key={person.id} value={person.id.toString()}>
                                                        <span className="font-medium">{person.username}</span>
                                                        {person.fullName && <span className="text-muted-foreground text-xs ml-2">({person.fullName})</span>}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Transfer Summary Preview Box */}
                                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Transfer Summary
                                    </h4>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center pb-2 border-b">
                                            <span className="text-muted-foreground text-xs">From (Source):</span>
                                            <span className="font-medium text-xs">
                                                {sourceSalesPerson ? sourceSalesPerson.username : <span className="italic text-muted-foreground">Not selected</span>}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center pb-2 border-b">
                                            <span className="text-muted-foreground text-xs">To (Target):</span>
                                            <span className="font-medium text-xs text-primary">
                                                {targetSalesPerson ? targetSalesPerson.username : <span className="italic text-muted-foreground">Not selected</span>}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground text-xs">Customers to Transfer:</span>
                                            <Badge variant={selectedCustomerIds.length > 0 ? "default" : "secondary"}>
                                                {selectedCustomerIds.length} customer(s)
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Transfer Button */}
                                <Button
                                    className="w-full h-11 text-sm font-medium"
                                    disabled={
                                        !fromSalesPersonId ||
                                        !toSalesPersonId ||
                                        selectedCustomerIds.length === 0 ||
                                        isTransferring
                                    }
                                    onClick={handleTransfer}
                                >
                                    {isTransferring ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Transferring Customers...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Transfer {selectedCustomerIds.length} Customer(s)
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </ERPLayout>
    )
}
