"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Filter,
  X,
  RotateCcw,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { returnTypesApi, type ReturnType, type CreateReturnTypeRequest, type UpdateReturnTypeRequest } from "@/lib/api"
import { ERPLayout } from "@/components/layouts/erp-layout"

const PRIORITY_COLORS = {
  1: "bg-red-100 text-red-800",
  2: "bg-red-100 text-red-800", 
  3: "bg-orange-100 text-orange-800",
  4: "bg-orange-100 text-orange-800",
  5: "bg-yellow-100 text-yellow-800",
  6: "bg-yellow-100 text-yellow-800",
  7: "bg-blue-100 text-blue-800",
  8: "bg-blue-100 text-blue-800",
  9: "bg-green-100 text-green-800",
  10: "bg-green-100 text-green-800",
}

const getPriorityColor = (priority: number) => {
  if (priority >= 9) return "bg-red-100 text-red-800"
  if (priority >= 7) return "bg-orange-100 text-orange-800" 
  if (priority >= 5) return "bg-yellow-100 text-yellow-800"
  if (priority >= 3) return "bg-blue-100 text-blue-800"
  return "bg-green-100 text-green-800"
}

const getPriorityLabel = (priority: number) => {
  if (priority >= 9) return "Critical"
  if (priority >= 7) return "High"
  if (priority >= 5) return "Medium"
  if (priority >= 3) return "Low"
  return "Minimal"
}

interface FormData extends CreateReturnTypeRequest {
  isActive?: boolean
}

export default function ReturnTypesPage() {
  const [returnTypes, setReturnTypes] = useState<ReturnType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterActive, setFilterActive] = useState<string>("ALL")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingReturnType, setEditingReturnType] = useState<ReturnType | null>(null)
  const [viewReturnType, setViewReturnType] = useState<ReturnType | null>(null)
  const [deleteConfirmReturnType, setDeleteConfirmReturnType] = useState<ReturnType | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    isRefundable: false,
    isReplaceable: false,
    priority: 5,
  })
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const fetchReturnTypes = async () => {
    try {
      setLoading(true)
      const response = await returnTypesApi.getAll({
        page: currentPage,
        limit: itemsPerPage,
        isActive: filterActive ? filterActive === "active" : undefined,
        search: searchTerm || undefined,
      })
      setReturnTypes(response.returnTypes)
      setTotalCount(response.totalCount)
    } catch (error) {
      console.error("Error fetching return types:", error)
      toast.error("Failed to load return types")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReturnTypes()
  }, [currentPage, itemsPerPage, filterActive, searchTerm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingReturnType) {
        await returnTypesApi.update(editingReturnType.id, formData)
        toast.success("Return type updated successfully")
      } else {
        await returnTypesApi.create(formData)
        toast.success("Return type created successfully")
      }
      setIsDialogOpen(false)
      resetForm()
      fetchReturnTypes()
    } catch (error) {
      console.error("Error saving return type:", error)
      toast.error(editingReturnType ? "Failed to update return type" : "Failed to create return type")
    }
  }

  const handleDelete = async (returnType: ReturnType) => {
    try {
      await returnTypesApi.remove(returnType.id)
      toast.success("Return type deleted successfully")
      fetchReturnTypes()
    } catch (error) {
      console.error("Error deleting return type:", error)
      toast.error("Failed to delete return type")
    }
    setDeleteConfirmReturnType(null)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      isRefundable: false,
      isReplaceable: false,
      priority: 5,
    })
    setEditingReturnType(null)
  }

  const handleEdit = (returnType: ReturnType) => {
    setEditingReturnType(returnType)
    setFormData({
      name: returnType.name,
      description: returnType.description || "",
      isRefundable: returnType.isRefundable,
      isReplaceable: returnType.isReplaceable,
      priority: returnType.priority,
      isActive: returnType.isActive,
    })
    setIsDialogOpen(true)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterActive("ALL")
  }

  const hasActiveFilters = searchTerm || filterActive

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Return Types Management</h1>
            <p className="text-muted-foreground">
              Manage return types for product returns and exchanges
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Return Type
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingReturnType ? "Edit Return Type" : "Create New Return Type"}
                </DialogTitle>
                <DialogDescription>
                  {editingReturnType
                    ? "Update the return type information below."
                    : "Add a new return type to the system."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Return Type Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Damaged Product"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe this return type..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (1-10)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: Number(e.target.value),
                      })
                    }
                    placeholder="5"
                  />
                  <p className="text-sm text-muted-foreground">
                    Higher numbers indicate higher priority (1=Low, 10=Critical)
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isRefundable"
                      checked={formData.isRefundable}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          isRefundable: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="isRefundable">Refundable</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isReplaceable"
                      checked={formData.isReplaceable}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          isReplaceable: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="isReplaceable">Replaceable</Label>
                  </div>

                  {editingReturnType && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            isActive: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingReturnType ? "Update" : "Create"} Return Type
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search return types..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Return Types Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Return Types ({totalCount})</CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {returnTypes.length} of {totalCount} return types
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading return types...</div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Refundable</TableHead>
                      <TableHead>Replaceable</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnTypes.map((returnType) => (
                      <TableRow key={returnType.id}>
                        <TableCell className="font-mono text-sm">
                          {returnType.code}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div>{returnType.name}</div>
                            {returnType.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {returnType.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(returnType.priority)}>
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {getPriorityLabel(returnType.priority)} ({returnType.priority})
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {returnType.isRefundable ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <DollarSign className="mr-1 h-3 w-3" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              <XCircle className="mr-1 h-3 w-3" />
                              No
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {returnType.isReplaceable ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              <XCircle className="mr-1 h-3 w-3" />
                              No
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={returnType.isActive ? "default" : "secondary"}
                            className={
                              returnType.isActive
                                ? "bg-green-600"
                                : "bg-gray-400"
                            }
                          >
                            {returnType.isActive ? (
                              <CheckCircle className="mr-1 h-3 w-3" />
                            ) : (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            {returnType.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(returnType.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewReturnType(returnType)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(returnType)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmReturnType(returnType)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* View Return Type Dialog */}
        <Dialog open={!!viewReturnType} onOpenChange={() => setViewReturnType(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Return Type Details</DialogTitle>
              <DialogDescription>
                View complete information for this return type.
              </DialogDescription>
            </DialogHeader>
            {viewReturnType && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Code</Label>
                    <p className="font-mono text-sm">{viewReturnType.code}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p>{viewReturnType.name}</p>
                  </div>
                </div>

                {viewReturnType.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground">
                      {viewReturnType.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(viewReturnType.priority)}>
                        {getPriorityLabel(viewReturnType.priority)} ({viewReturnType.priority})
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge
                      variant={viewReturnType.isActive ? "default" : "secondary"}
                      className={viewReturnType.isActive ? "bg-green-600" : "bg-gray-400"}
                    >
                      {viewReturnType.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Refundable</Label>
                    <p>{viewReturnType.isRefundable ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Replaceable</Label>
                    <p>{viewReturnType.isReplaceable ? "Yes" : "No"}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <Label className="text-sm font-medium">Created</Label>
                      <p>{format(new Date(viewReturnType.createdAt), "PPp")}</p>
                      <p>By: {viewReturnType.createdByUsername}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Updated</Label>
                      <p>{format(new Date(viewReturnType.updatedAt), "PPp")}</p>
                      <p>By: {viewReturnType.updatedByUsername}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteConfirmReturnType}
          onOpenChange={() => setDeleteConfirmReturnType(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the return type "
                {deleteConfirmReturnType?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmReturnType(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmReturnType && handleDelete(deleteConfirmReturnType)}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}