"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Filter,
  X,
  Package,
  Scale,
  Ruler,
  Hash,
  Clock,
  MoreHorizontal,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { unitsApi, type Unit, type CreateUnitRequest, type UpdateUnitRequest, type UnitType } from "@/lib/api"
import { ERPLayout } from "@/components/layouts/erp-layout"

const UNIT_TYPE_ICONS = {
  WEIGHT: <Scale className="h-4 w-4" />,
  VOLUME: <Package className="h-4 w-4" />,
  LENGTH: <Ruler className="h-4 w-4" />,
  AREA: <MoreHorizontal className="h-4 w-4" />,
  COUNT: <Hash className="h-4 w-4" />,
  TIME: <Clock className="h-4 w-4" />,
  OTHER: <MoreHorizontal className="h-4 w-4" />,
}

const UNIT_TYPE_COLORS = {
  WEIGHT: "bg-blue-100 text-blue-800",
  VOLUME: "bg-green-100 text-green-800",
  LENGTH: "bg-yellow-100 text-yellow-800",
  AREA: "bg-purple-100 text-purple-800",
  COUNT: "bg-red-100 text-red-800",
  TIME: "bg-orange-100 text-orange-800",
  OTHER: "bg-gray-100 text-gray-800",
}

interface FormData extends CreateUnitRequest {
  isActive?: boolean
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterUnitType, setFilterUnitType] = useState<string>("ALL")
  const [filterActive, setFilterActive] = useState<string>("ALL")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [viewUnit, setViewUnit] = useState<Unit | null>(null)
  const [deleteConfirmUnit, setDeleteConfirmUnit] = useState<Unit | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    symbol: "",
    unitType: "OTHER",
    baseUnit: "",
    conversionFactor: 1,
    description: "",
    isDecimalAllowed: true,
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

  const fetchUnits = async () => {
    try {
      setLoading(true)
      const response = await unitsApi.getAll({
        page: currentPage,
        limit: itemsPerPage,
        unitType: filterUnitType === "ALL" ? undefined : filterUnitType,
        isActive: filterActive === "ALL" ? undefined : filterActive === "active",
        search: searchTerm || undefined,
      })
      setUnits(response.units)
      setTotalCount(response.totalCount)
    } catch (error) {
      console.error("Error fetching units:", error)
      toast.error("Failed to load units")
    } finally {
      setLoading(false)
    }
  }

  const fetchUnitTypes = async () => {
    try {
      const types = await unitsApi.getTypes()
      setUnitTypes(types)
    } catch (error) {
      console.error("Error fetching unit types:", error)
    }
  }

  useEffect(() => {
    fetchUnitTypes()
  }, [])

  useEffect(() => {
    fetchUnits()
  }, [currentPage, itemsPerPage, filterUnitType, filterActive, searchTerm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUnit) {
        await unitsApi.update(editingUnit.id, formData)
        toast.success("Unit updated successfully")
      } else {
        await unitsApi.create(formData)
        toast.success("Unit created successfully")
      }
      setIsDialogOpen(false)
      resetForm()
      fetchUnits()
    } catch (error) {
      console.error("Error saving unit:", error)
      toast.error(editingUnit ? "Failed to update unit" : "Failed to create unit")
    }
  }

  const handleDelete = async (unit: Unit) => {
    try {
      await unitsApi.remove(unit.id)
      toast.success("Unit deleted successfully")
      fetchUnits()
    } catch (error) {
      console.error("Error deleting unit:", error)
      toast.error("Failed to delete unit")
    }
    setDeleteConfirmUnit(null)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      symbol: "",
      unitType: "OTHER",
      baseUnit: "",
      conversionFactor: 1,
      description: "",
      isDecimalAllowed: true,
    })
    setEditingUnit(null)
  }

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit)
    setFormData({
      name: unit.name,
      symbol: unit.symbol,
      unitType: unit.unitType,
      baseUnit: unit.baseUnit || "",
      conversionFactor: unit.conversionFactor || 1,
      description: unit.description || "",
      isDecimalAllowed: unit.isDecimalAllowed,
      isActive: unit.isActive,
    })
    setIsDialogOpen(true)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterUnitType("ALL")
    setFilterActive("ALL")
  }

  const hasActiveFilters = searchTerm || filterUnitType || filterActive

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Units Management</h1>
            <p className="text-muted-foreground">
              Manage measurement units for items and inventory
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingUnit ? "Edit Unit" : "Create New Unit"}
                </DialogTitle>
                <DialogDescription>
                  {editingUnit
                    ? "Update the unit information below."
                    : "Add a new measurement unit to the system."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Unit Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Kilogram"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol *</Label>
                    <Input
                      id="symbol"
                      value={formData.symbol}
                      onChange={(e) =>
                        setFormData({ ...formData, symbol: e.target.value })
                      }
                      placeholder="e.g., kg"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitType">Unit Type *</Label>
                  <Select
                    value={formData.unitType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, unitType: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit type" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            {UNIT_TYPE_ICONS[type.value as keyof typeof UNIT_TYPE_ICONS]}
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseUnit">Base Unit</Label>
                    <Input
                      id="baseUnit"
                      value={formData.baseUnit}
                      onChange={(e) =>
                        setFormData({ ...formData, baseUnit: e.target.value })
                      }
                      placeholder="e.g., gram"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conversionFactor">Conversion Factor</Label>
                    <Input
                      id="conversionFactor"
                      type="number"
                      step="0.01"
                      value={formData.conversionFactor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          conversionFactor: Number(e.target.value),
                        })
                      }
                      placeholder="1.0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Optional description..."
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isDecimalAllowed"
                      checked={formData.isDecimalAllowed}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          isDecimalAllowed: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="isDecimalAllowed">Allow decimal values</Label>
                  </div>

                  {editingUnit && (
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
                    {editingUnit ? "Update" : "Create"} Unit
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
                    placeholder="Search units..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Select value={filterUnitType} onValueChange={setFilterUnitType}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Unit Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {unitTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

        {/* Units Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Units ({totalCount})</CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {units.length} of {totalCount} units
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading units...</div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Base Unit</TableHead>
                      <TableHead>Conversion</TableHead>
                      <TableHead>Decimal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-mono text-sm">
                          {unit.code}
                        </TableCell>
                        <TableCell className="font-medium">{unit.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {unit.symbol}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={UNIT_TYPE_COLORS[unit.unitType as keyof typeof UNIT_TYPE_COLORS]}
                          >
                            <span className="mr-1">
                              {UNIT_TYPE_ICONS[unit.unitType as keyof typeof UNIT_TYPE_ICONS]}
                            </span>
                            {unit.unitType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {unit.baseUnit || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {unit.conversionFactor ? `×${unit.conversionFactor}` : "-"}
                        </TableCell>
                        <TableCell>
                          {unit.isDecimalAllowed ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              No
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={unit.isActive ? "default" : "secondary"}
                            className={
                              unit.isActive
                                ? "bg-green-600"
                                : "bg-gray-400"
                            }
                          >
                            {unit.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(unit.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewUnit(unit)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(unit)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmUnit(unit)}
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

        {/* View Unit Dialog */}
        <Dialog open={!!viewUnit} onOpenChange={() => setViewUnit(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Unit Details</DialogTitle>
              <DialogDescription>
                View complete information for this unit.
              </DialogDescription>
            </DialogHeader>
            {viewUnit && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Code</Label>
                    <p className="font-mono text-sm">{viewUnit.code}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p>{viewUnit.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Symbol</Label>
                    <p className="font-mono">{viewUnit.symbol}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <div className="flex items-center gap-2">
                      {UNIT_TYPE_ICONS[viewUnit.unitType]}
                      <span>{viewUnit.unitType}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Base Unit</Label>
                    <p>{viewUnit.baseUnit || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Conversion Factor</Label>
                    <p>{viewUnit.conversionFactor || "N/A"}</p>
                  </div>
                </div>

                {viewUnit.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground">
                      {viewUnit.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Decimal Allowed</Label>
                    <p>{viewUnit.isDecimalAllowed ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge
                      variant={viewUnit.isActive ? "default" : "secondary"}
                      className={viewUnit.isActive ? "bg-green-600" : "bg-gray-400"}
                    >
                      {viewUnit.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <Label className="text-sm font-medium">Created</Label>
                      <p>{format(new Date(viewUnit.createdAt), "PPp")}</p>
                      <p>By: {viewUnit.createdByUsername}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Updated</Label>
                      <p>{format(new Date(viewUnit.updatedAt), "PPp")}</p>
                      <p>By: {viewUnit.updatedByUsername}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteConfirmUnit}
          onOpenChange={() => setDeleteConfirmUnit(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the unit "
                {deleteConfirmUnit?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmUnit(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmUnit && handleDelete(deleteConfirmUnit)}
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