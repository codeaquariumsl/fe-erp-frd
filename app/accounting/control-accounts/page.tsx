"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { controlAccountsApi, accountTypesApi, accountCategoriesApi, ControlAccount, AccountType, AccountCategory } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export default function ControlAccountsPage() {
  const [accounts, setAccounts] = useState<ControlAccount[]>([])
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([])
  const [categories, setCategories] = useState<AccountCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ControlAccount | null>(null)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    controlType: "CUSTOMER",
    accountTypeId: "",
    accountCategoryId: "",
    status: "Active",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [accountsData, typesData, categoriesData] = await Promise.all([
        controlAccountsApi.getAll<ControlAccount>(),
        accountTypesApi.getAll<AccountType>(),
        accountCategoriesApi.getAll<AccountCategory>()
      ])
      setAccounts(Array.isArray(accountsData) ? accountsData : [])
      setAccountTypes(Array.isArray(typesData) ? typesData : [])
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load data",
        variant: "destructive",
      })
      setAccounts([])
      setAccountTypes([])
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await controlAccountsApi.getAll<ControlAccount>()
      setAccounts(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load control accounts",
        variant: "destructive",
      })
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      controlType: "CUSTOMER",
      accountTypeId: "",
      accountCategoryId: "",
      status: "Active",
    })
    setSelectedAccount(null)
  }

  const handleAccountCategoryChange = async (value: string) => {
    setFormData({ ...formData, accountCategoryId: value, code: "" })

    if (value) {
      try {
        const response = await controlAccountsApi.getNextCode(parseInt(value))
        setFormData(prev => ({ ...prev, accountCategoryId: value, code: response.nextCode }))
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch next control account code",
          variant: "destructive",
        })
      }
    }
  }

  const handleCreateAccount = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Account name is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.accountTypeId) {
      toast({
        title: "Validation Error",
        description: "Account type is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.accountCategoryId) {
      toast({
        title: "Validation Error",
        description: "Account category is required",
        variant: "destructive",
      })
      return
    }

    try {
      await controlAccountsApi.create({
        ...formData,
        accountTypeId: parseInt(formData.accountTypeId),
        accountCategoryId: parseInt(formData.accountCategoryId)
      })
      toast({
        title: "Success",
        description: "Control account created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create control account",
        variant: "destructive",
      })
    }
  }

  const handleUpdateAccount = async () => {
    if (!selectedAccount) return

    if (!formData.accountTypeId) {
      toast({
        title: "Validation Error",
        description: "Account type is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.accountCategoryId) {
      toast({
        title: "Validation Error",
        description: "Account category is required",
        variant: "destructive",
      })
      return
    }

    try {
      await controlAccountsApi.update(selectedAccount.id, {
        ...formData,
        accountTypeId: parseInt(formData.accountTypeId),
        accountCategoryId: parseInt(formData.accountCategoryId)
      })
      toast({
        title: "Success",
        description: "Control account updated successfully",
      })
      setIsEditDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update control account",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAccount = async (id: number) => {
    try {
      await controlAccountsApi.remove(id)
      toast({
        title: "Success",
        description: "Control account deleted successfully",
      })
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete control account",
        variant: "destructive",
      })
    }
  }

  const handleEditAccount = (account: ControlAccount) => {
    setSelectedAccount(account)
    setFormData({
      name: account.name,
      code: account.code,
      controlType: account.controlType,
      accountTypeId: account.accountTypeId?.toString() || "",
      accountCategoryId: account.accountCategoryId?.toString() || "",
      status: account.status,
    })
    setIsEditDialogOpen(true)
  }

  const handleViewAccount = (account: ControlAccount) => {
    setSelectedAccount(account)
    setIsViewDialogOpen(true)
  }

  const filteredAccounts = accounts.filter(
    (acc) =>
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.controlType.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  return (
    <ERPLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Control Accounts</h1>
            <p className="text-muted-foreground mt-1">Manage aggregate accounts for customers, suppliers, and banks</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Control Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Control Account</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountTypeId">Account Type</Label>
                  <Select value={formData.accountTypeId} onValueChange={(value) => setFormData({ ...formData, accountTypeId: value, accountCategoryId: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.code} | {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="accountCategoryId">Account Category</Label>
                  <Select value={formData.accountCategoryId} onValueChange={handleAccountCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => !formData.accountTypeId || c.accountTypeId.toString() === formData.accountTypeId)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.code} | {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="code">Control Account Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Total Customers, Total Suppliers"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="mb-2 block">Control Type</Label>
                  <RadioGroup
                    value={formData.controlType}
                    onValueChange={(value) => setFormData({ ...formData, controlType: value })}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CUSTOMER" id="create-type-customer" />
                      <Label htmlFor="create-type-customer" className="font-normal cursor-pointer">Customer</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SUPPLIER" id="create-type-supplier" />
                      <Label htmlFor="create-type-supplier" className="font-normal cursor-pointer">Supplier</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="BANK" id="create-type-bank" />
                      <Label htmlFor="create-type-bank" className="font-normal cursor-pointer">Bank</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="INVENTORY" id="create-type-inventory" />
                      <Label htmlFor="create-type-inventory" className="font-normal cursor-pointer">Inventory</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="OTHER" id="create-type-other" />
                      <Label htmlFor="create-type-other" className="font-normal cursor-pointer">Other</Label>
                    </div>
                  </RadioGroup>
                </div>

              </div>
              <DialogFooter>
                <Button onClick={handleCreateAccount}>Create Control Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            {/* <CardTitle>Control Accounts List</CardTitle> */}
            <CardDescription>Aggregate accounts for system automation and reporting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search control accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {filteredAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No control accounts found
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Control Type</TableHead>
                        <TableHead>Account Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.code}</TableCell>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{account.controlType}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{account.AccountType?.name || "-"}</TableCell>
                          <TableCell className="text-sm">{account.AccountCategory?.name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={account.status === "Active" ? "default" : "secondary"}>
                              {account.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewAccount(account)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditAccount(account)}>
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
                                      <AlertDialogTitle>Delete Control Account</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{account.name}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteAccount(account.id)}
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
              <DialogTitle>Control Account Details</DialogTitle>
            </DialogHeader>
            {selectedAccount && (
              <div className="space-y-6">
                <div>
                  <Label className="text-sm text-muted-foreground">Account Code</Label>
                  <p className="font-medium text-lg mt-1">{selectedAccount.code}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Account Name</Label>
                  <p className="font-medium text-lg mt-1">{selectedAccount.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Control Type</Label>
                  <Badge variant="outline" className="mt-1">{selectedAccount.controlType}</Badge>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Account Type</Label>
                  <p className="font-medium mt-1">{selectedAccount.AccountType?.name || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Account Category</Label>
                  <p className="font-medium mt-1">{selectedAccount.AccountCategory?.name || "N/A"}</p>
                </div>
                <div className="border-t pt-4">
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <Badge variant={selectedAccount.status === "Active" ? "default" : "secondary"} className="mt-1">
                    {selectedAccount.status}
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
              <DialogTitle>Edit Control Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-code">Control Account Code</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  readOnly
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="edit-name">Account Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-2 block">Control Type</Label>
                <RadioGroup
                  value={formData.controlType}
                  onValueChange={(value) => setFormData({ ...formData, controlType: value })}
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CUSTOMER" id="edit-type-customer" />
                    <Label htmlFor="edit-type-customer" className="font-normal cursor-pointer">Customer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="SUPPLIER" id="edit-type-supplier" />
                    <Label htmlFor="edit-type-supplier" className="font-normal cursor-pointer">Supplier</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BANK" id="edit-type-bank" />
                    <Label htmlFor="edit-type-bank" className="font-normal cursor-pointer">Bank</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="INVENTORY" id="edit-type-inventory" />
                    <Label htmlFor="edit-type-inventory" className="font-normal cursor-pointer">Inventory</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="OTHER" id="edit-type-other" />
                    <Label htmlFor="edit-type-other" className="font-normal cursor-pointer">Other</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="edit-accountTypeId">Account Type</Label>
                <Select value={formData.accountTypeId} onValueChange={(value) => setFormData({ ...formData, accountTypeId: value, accountCategoryId: "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-accountCategoryId">Account Category</Label>
                <Select value={formData.accountCategoryId} onValueChange={handleAccountCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => !formData.accountTypeId || c.accountTypeId.toString() === formData.accountTypeId)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
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
              <Button onClick={handleUpdateAccount} className="w-full">Update Control Account</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
