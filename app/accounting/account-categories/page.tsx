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
import { accountCategoriesApi, accountTypesApi, AccountCategory, AccountType } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export default function AccountCategoriesPage() {
  const [categories, setCategories] = useState<AccountCategory[]>([])
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    accountTypeId: "",
    status: "Active",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [categoriesData, typesData] = await Promise.all([
        accountCategoriesApi.getAll<AccountCategory>(),
        accountTypesApi.getAll<AccountType>()
      ])
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      setAccountTypes(Array.isArray(typesData) ? typesData : [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load data",
        variant: "destructive",
      })
      setCategories([])
      setAccountTypes([])
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await accountCategoriesApi.getAll<AccountCategory>()
      setCategories(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load categories",
        variant: "destructive",
      })
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      accountTypeId: "",
      status: "Active",
    })
    setSelectedCategory(null)
  }

  const handleAccountTypeChange = async (value: string) => {
    setFormData({ ...formData, accountTypeId: value, code: "" })

    if (value) {
      try {
        const response = await accountCategoriesApi.getNextCode(parseInt(value))
        setFormData(prev => ({ ...prev, accountTypeId: value, code: response.nextCode }))
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch next category code",
          variant: "destructive",
        })
      }
    }
  }

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
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

    try {
      await accountCategoriesApi.create({
        ...formData,
        accountTypeId: parseInt(formData.accountTypeId)
      })
      toast({
        title: "Success",
        description: "Category created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      })
    }
  }

  const handleUpdateCategory = async () => {
    if (!selectedCategory) return

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
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

    try {
      await accountCategoriesApi.update(selectedCategory.id, {
        ...formData,
        accountTypeId: parseInt(formData.accountTypeId)
      })
      toast({
        title: "Success",
        description: "Category updated successfully",
      })
      setIsEditDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update category",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async (id: number) => {
    try {
      await accountCategoriesApi.remove(id)
      toast({
        title: "Success",
        description: "Category deleted successfully",
      })
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      })
    }
  }

  const handleEditCategory = (category: AccountCategory) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      code: category.code,
      accountTypeId: category.accountTypeId?.toString() || "",
      status: category.status,
    })
    setIsEditDialogOpen(true)
  }

  const handleEditAccountTypeChange = async (value: string) => {
    setFormData({ ...formData, accountTypeId: value, code: "" })

    if (value) {
      try {
        const response = await accountCategoriesApi.getNextCode(parseInt(value))
        setFormData(prev => ({ ...prev, accountTypeId: value, code: response.nextCode }))
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch next category code",
          variant: "destructive",
        })
      }
    }
  }

  const handleViewCategory = (category: AccountCategory) => {
    setSelectedCategory(category)
    setIsViewDialogOpen(true)
  }

  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  return (
    <ERPLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Account Categories</h1>
            <p className="text-muted-foreground mt-1">Organize accounts into logical groupings</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Account Category</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountTypeId">Account Type</Label>
                  <Select value={formData.accountTypeId} onValueChange={handleAccountTypeChange}>
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
                  <Label htmlFor="code">Category Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Category Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Fixed Assets, Current Liabilities"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateCategory}>Create Category</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            {/* <CardTitle>Categories List</CardTitle> */}
            <CardDescription>All account categories in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {filteredCategories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No categories found
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Account Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCategories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="py-2 font-medium">{category.code}</TableCell>
                          <TableCell className="py-2 font-medium">{category.name}</TableCell>
                          <TableCell className="py-2 text-sm">{category.AccountType?.name || "-"}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant={category.status === "Active" ? "default" : "secondary"}>
                              {category.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewCategory(category)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditCategory(category)}>
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
                                      <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteCategory(category.id)}
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
              <DialogTitle>Category Details</DialogTitle>
            </DialogHeader>
            {selectedCategory && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm text-muted-foreground">Category Code</Label>
                    <p className="font-medium text-lg mt-1">{selectedCategory.code}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Category Name</Label>
                    <p className="font-medium text-lg mt-1">{selectedCategory.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Account Type</Label>
                    <p className="font-medium text-lg mt-1">{selectedCategory.AccountType?.name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Account Type Description</Label>
                    <p className="text-sm mt-1">{selectedCategory.AccountType?.description || "No description"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Dr. Behavior</Label>
                      <Badge variant="outline" className="mt-1">
                        {selectedCategory.AccountType?.drBehavior === "increase" ? "Increases" : "Decreases"}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Cr. Behavior</Label>
                      <Badge variant="outline" className="mt-1">
                        {selectedCategory.AccountType?.crBehavior === "increase" ? "Increases" : "Decreases"}
                      </Badge>
                    </div>
                  </div>
                  {/* <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <Badge variant={selectedCategory.status === "Active" ? "default" : "secondary"} className="mt-1">
                      {selectedCategory.status}
                    </Badge>
                  </div> */}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Account Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Category Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-code">Category Code</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  readOnly
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="edit-accountTypeId">Account Type</Label>
                <Select value={formData.accountTypeId} onValueChange={handleEditAccountTypeChange}>
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
              <Button onClick={handleUpdateCategory} className="w-full">Update Category</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
