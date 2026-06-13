"use client"

import { useState, useEffect } from "react"
import { Plus, MoreHorizontal, Edit, Trash2, Search, MapPin, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { banksApi, bankBranchesApi, Bank, BankBranch } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"

export default function BankBranchesPage() {
    const [branches, setBranches] = useState<BankBranch[]>([])
    const [banks, setBanks] = useState<Bank[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedBankFilter, setSelectedBankFilter] = useState<string>("all")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        bankId: "",
        branchCode: "",
        branchName: "",
        swiftCode: "",
        status: "Active" as "Active" | "Inactive"
    })

    const { toast } = useToast()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [banksData, branchesData] = await Promise.all([
                banksApi.getAll<Bank>(),
                bankBranchesApi.getAll<BankBranch>()
            ])

            setBanks(Array.isArray(banksData) ? banksData : [])
            setBranches(Array.isArray(branchesData) ? branchesData : [])
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load data",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const loadBranches = async () => {
        try {
            const branchesData = await bankBranchesApi.getAll<BankBranch>()
            setBranches(Array.isArray(branchesData) ? branchesData : [])
        } catch (error: any) {
            // silent fail or toast
        }
    }

    const resetForm = () => {
        setFormData({
            bankId: "",
            branchCode: "",
            branchName: "",
            swiftCode: "",
            status: "Active"
        })
        setEditingId(null)
    }

    const handleOpenCreate = () => {
        resetForm()
        setIsDialogOpen(true)
    }

    const handleEdit = (branch: BankBranch) => {
        setFormData({
            bankId: branch.bankId.toString(),
            branchCode: branch.branchCode,
            branchName: branch.branchName,
            swiftCode: branch.swiftCode,
            status: branch.status
        })
        setEditingId(branch.id)
        setIsDialogOpen(true)
    }

    const handleSubmit = async () => {
        if (!formData.bankId || !formData.branchName.trim() || !formData.branchCode.trim()) {
            toast({
                title: "Validation Error",
                description: "Bank, Branch Name and Branch Code are required",
                variant: "destructive",
            })
            return
        }

        const payload = {
            ...formData,
            bankId: parseInt(formData.bankId)
        }

        try {
            if (editingId) {
                // Update
                await bankBranchesApi.update(editingId, payload)
                toast({ title: "Success", description: "Branch updated successfully" })
            } else {
                // Create
                await bankBranchesApi.create(payload)
                toast({ title: "Success", description: "Branch created successfully" })
            }
            setIsDialogOpen(false)
            loadBranches() // Reload only branches
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || `Failed to ${editingId ? 'update' : 'create'} branch`,
                variant: "destructive",
            })
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await bankBranchesApi.remove(id)
            toast({ title: "Success", description: "Branch deleted successfully" })
            loadBranches()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete branch",
                variant: "destructive",
            })
        }
    }

    const filteredBranches = branches.filter(branch => {
        const matchesSearch =
            branch.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            branch.branchCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            branch.swiftCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (branch.Bank?.name || "").toLowerCase().includes(searchTerm.toLowerCase())

        const matchesBank = selectedBankFilter === "all" || branch.bankId.toString() === selectedBankFilter

        return matchesSearch && matchesBank
    })

    return (
        <ERPLayout>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Bank Branches</h1>
                        <p className="text-muted-foreground mt-1">Manage bank branches and swift codes</p>
                    </div>
                    <Button onClick={handleOpenCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Branch
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Branch List</CardTitle>
                        <CardDescription>
                            A list of bank branches configured in the system.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex items-center gap-2 flex-1">
                                    <Search className="h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="Search branches..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="max-w-sm"
                                    />
                                </div>
                                <Select value={selectedBankFilter} onValueChange={setSelectedBankFilter}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Filter by Bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Banks</SelectItem>
                                        {banks.map(bank => (
                                            <SelectItem key={bank.id} value={bank.id.toString()}>{bank.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Bank</TableHead>
                                            <TableHead>Branch Code</TableHead>
                                            <TableHead>Branch Name</TableHead>
                                            <TableHead>Swift Code</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8">
                                                    Loading branches...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredBranches.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No branches found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredBranches.map((branch) => (
                                                <TableRow key={branch.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                                            {branch.Bank?.name || "Unknown Bank"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono">{branch.branchCode}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                                            {branch.branchName}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{branch.swiftCode}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={branch.status === 'Active' ? 'default' : 'secondary'}>
                                                            {branch.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleEdit(branch)}>
                                                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                                                </DropdownMenuItem>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Are you sure you want to delete {branch.branchName}?
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDelete(branch.id)} className="bg-destructive text-destructive-foreground">
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
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="bank" className="text-right">Bank</Label>
                                <Select
                                    value={formData.bankId}
                                    onValueChange={(value) => setFormData({ ...formData, bankId: value })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {banks.map(bank => (
                                            <SelectItem key={bank.id} value={bank.id.toString()}>{bank.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="branchCode" className="text-right">Branch Code</Label>
                                <Input
                                    id="branchCode"
                                    value={formData.branchCode}
                                    onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                                    className="col-span-3"
                                    placeholder="e.g. 001"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="branchName" className="text-right">Name</Label>
                                <Input
                                    id="branchName"
                                    value={formData.branchName}
                                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                                    className="col-span-3"
                                    placeholder="e.g. Main Branch"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="swiftCode" className="text-right">Swift Code</Label>
                                <Input
                                    id="swiftCode"
                                    value={formData.swiftCode}
                                    onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                                    className="col-span-3"
                                    placeholder="e.g. BCEYLKCX"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value: "Active" | "Inactive") => setFormData({ ...formData, status: value })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit}>
                                {editingId ? 'Save Changes' : 'Create Branch'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ERPLayout>
    )
}
