"use client"

import { useState, useEffect } from "react"
import { Plus, MoreHorizontal, Edit, Trash2, Search, Building2 } from "lucide-react"
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
import { banksApi, Bank } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"

export default function BanksPage() {
    const [banks, setBanks] = useState<Bank[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        status: "Active" as "Active" | "Inactive"
    })

    const { toast } = useToast()

    useEffect(() => {
        loadBanks()
    }, [])

    const loadBanks = async () => {
        try {
            setLoading(true)
            const data = await banksApi.getAll<Bank>()
            setBanks(Array.isArray(data) ? data : [])
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load banks",
                variant: "destructive",
            })
            setBanks([])
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            code: "",
            name: "",
            status: "Active"
        })
        setEditingId(null)
    }

    const handleOpenCreate = () => {
        resetForm()
        setIsDialogOpen(true)
    }

    const handleEdit = (bank: Bank) => {
        setFormData({
            code: bank.code,
            name: bank.name,
            status: bank.status
        })
        setEditingId(bank.id)
        setIsDialogOpen(true)
    }

    const handleSubmit = async () => {
        if (!formData.name.trim() || !formData.code.trim()) {
            toast({
                title: "Validation Error",
                description: "Bank name and code are required",
                variant: "destructive",
            })
            return
        }

        try {
            if (editingId) {
                // Update
                await banksApi.update(editingId, formData)
                toast({ title: "Success", description: "Bank updated successfully" })
            } else {
                // Create
                await banksApi.create(formData)
                toast({ title: "Success", description: "Bank created successfully" })
            }
            setIsDialogOpen(false)
            loadBanks()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || `Failed to ${editingId ? 'update' : 'create'} bank`,
                variant: "destructive",
            })
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await banksApi.remove(id)
            toast({ title: "Success", description: "Bank deleted successfully" })
            loadBanks()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete bank",
                variant: "destructive",
            })
        }
    }

    const filteredBanks = banks.filter(bank =>
        bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bank.code.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <ERPLayout>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Banks</h1>
                        <p className="text-muted-foreground mt-1">Manage bank definitions for the system</p>
                    </div>
                    <Button onClick={handleOpenCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Bank
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Bank List</CardTitle>
                        <CardDescription>
                            A list of all banks configured in the system.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search by code or name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="max-w-sm"
                                />
                            </div>

                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Bank Name</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8">
                                                    Loading banks...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredBanks.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    No banks found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredBanks.map((bank) => (
                                                <TableRow key={bank.id}>
                                                    <TableCell className="font-mono">{bank.code}</TableCell>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                                            {bank.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={bank.status === 'Active' ? 'default' : 'secondary'}>
                                                            {bank.status}
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
                                                                <DropdownMenuItem onClick={() => handleEdit(bank)}>
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
                                                                            <AlertDialogTitle>Delete Bank</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Are you sure you want to delete {bank.name}? This action cannot be undone.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDelete(bank.id)} className="bg-destructive text-destructive-foreground">
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
                            <DialogTitle>{editingId ? 'Edit Bank' : 'Add Bank'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="code" className="text-right">Code</Label>
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="col-span-3"
                                    placeholder="e.g. 7010"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="col-span-3"
                                    placeholder="e.g. Bank of Ceylon"
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
                                {editingId ? 'Save Changes' : 'Create Bank'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ERPLayout>
    )
}
