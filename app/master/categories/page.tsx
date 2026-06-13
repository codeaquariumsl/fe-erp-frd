"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, MoreHorizontal, Tag, Edit, Trash2, Eye } from "lucide-react"
import { categoriesApi, type Category } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ERPLayout } from "@/components/layouts/erp-layout"
import Loading from "./loading"

export default function CategoriesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    superCategoryId: null as number | null,
    isActive: true,
    image: "",
  })
  const { toast } = useToast()
  const { user, token, isLoading: authLoading } = useAuth()

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await categoriesApi.getAll<Category>()
      setCategories(data)
    } catch (error) {
      console.error("Error loading categories:", error)
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      superCategoryId: null,
      isActive: true,
      image: "",
    })
  }

  const handleCreateCategory = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive",
      })
      return
    }

    try {
      await categoriesApi.create(formData)
      toast({
        title: "Success",
        description: "Category created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadCategories()
    } catch (error) {
      console.error("Error creating category:", error)
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      })
    }
  }

  const handleUpdateCategory = async () => {
    if (!selectedCategory) return

    try {
      await categoriesApi.update(selectedCategory.id, formData)
      toast({
        title: "Success",
        description: "Category updated successfully",
      })
      setIsEditDialogOpen(false)
      resetForm()
      setSelectedCategory(null)
      loadCategories()
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return

    try {
      await categoriesApi.remove(id)
      toast({
        title: "Success",
        description: "Category deleted successfully",
      })
      loadCategories()
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      })
    }
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      code: category.code,
      superCategoryId: category.superCategoryId,
      isActive: category.isActive,
      image: category.image || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleViewCategory = (category: Category) => {
    setSelectedCategory(category)
    setIsViewDialogOpen(true)
  }

  const getParentCategoryName = (superCategoryId: number | null) => {
    if (!superCategoryId) return "None"
    const parent = categories.find((cat) => cat.id === superCategoryId)
    return parent?.name || "Unknown"
  }

  const getSubCategories = (parentId: number) => {
    return categories.filter((cat) => cat.superCategoryId === parentId)
  }

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.code.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading || authLoading) {
    return <Loading />
  }

  return (
    <ERPLayout>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Categories</h1>
            <p className="text-muted-foreground">Manage product categories and subcategories</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Category Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter category name"
                  />
                </div>

                {/* <div>
                <Label htmlFor="code">Category Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter category code"
                />
              </div> */}

                <div>
                  <Label htmlFor="superCategoryId">Parent Category</Label>
                  <Select
                    value={formData.superCategoryId?.toString() || ""}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        superCategoryId: value === "none" ? null : Number.parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Root Category)</SelectItem>
                      {categories
                        .filter((cat) => !cat.superCategoryId)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="image">Image URL</Label>
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                    placeholder="Enter image URL (optional)"
                  />
                </div>

                {/* <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: !!checked }))}
                />
                <Label htmlFor="isActive">Active Category</Label>
              </div> */}

                <Button onClick={handleCreateCategory} className="w-full">
                  Create Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards - Compact Style */}
        <div className="grid gap-2 md:grid-cols-4">
          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total Categories</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{categories.length}</div>
              <p className="text-xs text-muted-foreground leading-tight">All categories</p>
            </CardContent>
          </Card>

          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Root Categories</CardTitle>
              <Tag className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{categories.filter((cat) => !cat.superCategoryId).length}</div>
              <p className="text-xs text-muted-foreground leading-tight">Parent categories</p>
            </CardContent>
          </Card>

          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Active Categories</CardTitle>
              <Tag className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{categories.filter((cat) => cat.isActive).length}</div>
              <p className="text-xs text-muted-foreground leading-tight">Currently active</p>
            </CardContent>
          </Card>

          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Inactive Categories</CardTitle>
              <Tag className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{categories.filter((cat) => !cat.isActive).length}</div>
              <p className="text-xs text-muted-foreground leading-tight">Currently inactive</p>
            </CardContent>
          </Card>
        </div>

        {/* Categories List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              {/* <CardTitle>Categories</CardTitle> */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Parent Category</TableHead>
                  <TableHead>Subcategories</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {category.image && (
                          <img
                            src={category.image || "/placeholder.svg"}
                            alt={category.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <div className="font-medium">{category.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{category.code}</Badge>
                    </TableCell>
                    <TableCell>{getParentCategoryName(category.superCategoryId)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getSubCategories(category.id).length} subcategories</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.isActive ? "default" : "secondary"}>
                        {category.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewCategory(category)}>
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button variant="outline" size="sm" onClick={() => handleEditCategory(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the Category.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Category Name</Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter category name"
                />
              </div>

              {/* <div>
              <Label htmlFor="editCode">Category Code</Label>
              <Input
                id="editCode"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="Enter category code"
              />
            </div> */}

              <div>
                <Label htmlFor="editSuperCategoryId">Parent Category</Label>
                <Select
                  value={formData.superCategoryId?.toString() || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      superCategoryId: value === "none" ? null : Number.parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Root Category)</SelectItem>
                    {categories
                      .filter((cat) => !cat.superCategoryId && cat.id !== selectedCategory?.id)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="editImage">Image URL</Label>
                <Input
                  id="editImage"
                  value={formData.image}
                  onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="Enter image URL (optional)"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editIsActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: !!checked }))}
                />
                <Label htmlFor="editIsActive">Active Category</Label>
              </div>

              <Button onClick={handleUpdateCategory} className="w-full">
                Update Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Category Details</DialogTitle>
            </DialogHeader>
            {selectedCategory && (
              <div className="space-y-4">
                <div>
                  <Label>Category Name</Label>
                  <p className="font-medium">{selectedCategory.name}</p>
                </div>

                <div>
                  <Label>Category Code</Label>
                  <p className="font-medium">{selectedCategory.code}</p>
                </div>

                <div>
                  <Label>Parent Category</Label>
                  <p className="font-medium">{getParentCategoryName(selectedCategory.superCategoryId)}</p>
                </div>

                <div>
                  <Label>Subcategories</Label>
                  <p className="font-medium">{getSubCategories(selectedCategory.id).length} subcategories</p>
                </div>

                {selectedCategory.image && (
                  <div>
                    <Label>Image</Label>
                    <img
                      src={selectedCategory.image || "/placeholder.svg"}
                      alt={selectedCategory.name}
                      className="w-full h-32 object-cover rounded border"
                    />
                  </div>
                )}

                <div>
                  <Label>Status </Label>
                  <Badge variant={selectedCategory.isActive ? "default" : "secondary"}>
                    {selectedCategory.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Created At</Label>
                    <p className="font-medium">{new Date(selectedCategory.createdAt).toLocaleDateString()}</p>
                    {selectedCategory.createdByUsername && (
                      <p className="font-medium text-xs text-muted-foreground">by {selectedCategory.createdByUsername}</p>
                    )}
                  </div>
                  <div>
                    <Label>Updated At</Label>
                    <p className="font-medium">{new Date(selectedCategory.updatedAt).toLocaleDateString()}</p>
                    {selectedCategory.updatedByUsername && (
                      <p className="font-medium text-xs text-muted-foreground">by {selectedCategory.updatedByUsername}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
