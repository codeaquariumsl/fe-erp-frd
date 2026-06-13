"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { accountTypesApi, AccountType } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export default function AccountTypesPage() {
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    drBehavior: "increase",
    crBehavior: "decrease",
    status: "Active",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadAccountTypes()
  }, [])

  const loadAccountTypes = async () => {
    try {
      setLoading(true)
      const data = await accountTypesApi.getAll<AccountType>()
      setAccountTypes(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load account types",
        variant: "destructive",
      })
      setAccountTypes([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      drBehavior: "increase",
      crBehavior: "decrease",
      status: "Active",
    })
    setSelectedAccountType(null)
  }

  const handleCreateAccountType = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Account type name is required",
        variant: "destructive",
      })
      return
    }

    try {
      await accountTypesApi.create(formData)
      toast({
        title: "Success",
        description: "Account type created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadAccountTypes()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account type",
        variant: "destructive",
      })
    }
  }

  const handleUpdateAccountType = async () => {
    if (!selectedAccountType) return

    try {
      await accountTypesApi.update(selectedAccountType.id, formData)
      toast({
        title: "Success",
        description: "Account type updated successfully",
      })
      setIsEditDialogOpen(false)
      resetForm()
      loadAccountTypes()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update account type",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAccountType = async (id: number) => {
    try {
      await accountTypesApi.remove(id)
      toast({
        title: "Success",
        description: "Account type deleted successfully",
      })
      loadAccountTypes()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account type",
        variant: "destructive",
      })
    }
  }

  const handleEditAccountType = (accountType: AccountType) => {
    setSelectedAccountType(accountType)
    setFormData({
      name: accountType.name,
      description: accountType.description || "",
      drBehavior: accountType.drBehavior,
      crBehavior: accountType.crBehavior,
      status: accountType.status,
    })
    setIsEditDialogOpen(true)
  }

  const handleViewAccountType = (accountType: AccountType) => {
    setSelectedAccountType(accountType)
    setIsViewDialogOpen(true)
  }

  const filteredAccountTypes = accountTypes.filter(
    (at) =>
      at.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (at.description && at.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return <ERPLayout> <div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  return (
    <ERPLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Account Types</h1>
            <p className="text-muted-foreground mt-1">Manage account classifications (Asset, Liability, Income, Expense, Equity)</p>
          </div>
        </div>

        <Card>
          {/* <CardHeader>
            <CardTitle>Account Types List</CardTitle>
            <CardDescription>All account types configured in the system</CardDescription>
          </CardHeader> */}
          <CardContent className="mt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search account types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {filteredAccountTypes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No account types found
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Dr Behavior</TableHead>
                        <TableHead>Cr Behavior</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccountTypes.map((accountType) => (
                        <TableRow key={accountType.id}>
                          <TableCell className="font-medium">{accountType.code}</TableCell>
                          <TableCell className="font-medium">{accountType.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{accountType.description || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`capitalize ${accountType.drBehavior === "increase" ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"
                              }`}>{accountType.drBehavior}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`capitalize ${accountType.crBehavior === "increase" ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"
                              }`}>{accountType.crBehavior}</Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewAccountType(accountType)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                {!accountType.isSystemProtected && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleEditAccountType(accountType)}>
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
                                          <AlertDialogTitle>Delete Account Type</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete "{accountType.name}"? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteAccountType(accountType.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Account Type Details</DialogTitle>
            </DialogHeader>
            {selectedAccountType && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedAccountType.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Description</Label>
                  <p className="font-medium">{selectedAccountType.description || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Debit Behavior</Label>
                    <Badge variant="outline" className={`capitalize mt-1 ${selectedAccountType.drBehavior === "increase" ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"
                      }`}>{selectedAccountType.drBehavior}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Credit Behavior</Label>
                    <Badge variant="outline" className={`capitalize mt-1 ${selectedAccountType.crBehavior === "increase" ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"
                      }`}>{selectedAccountType.crBehavior}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <Badge variant={selectedAccountType.status === "Active" ? "default" : "secondary"} className="mt-1">
                    {selectedAccountType.status}
                  </Badge>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Account Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Account Type Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-drBehavior">Debit Behavior</Label>
                <Select value={formData.drBehavior} onValueChange={(value) => setFormData({ ...formData, drBehavior: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase</SelectItem>
                    <SelectItem value="decrease">Decrease</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-crBehavior">Credit Behavior</Label>
                <Select value={formData.crBehavior} onValueChange={(value) => setFormData({ ...formData, crBehavior: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase</SelectItem>
                    <SelectItem value="decrease">Decrease</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdateAccountType} className="w-full">Update Account Type</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
