"use client"

import type React from "react"

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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Plus, Search, MoreHorizontal, Building2, MapPin, Package, Loader2, AlertCircle, Eye, Edit, Trash2 } from "lucide-react"
import { storesApi, locationsApi, type Store, type Location } from "@/lib/api"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ERPLayout } from "@/components/layouts/erp-layout"

export default function StoresPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [stores, setStores] = useState<Store[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [viewingStore, setViewingStore] = useState<Store | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    capacity: 0,
    locationId: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [storesData, locationsData] = await Promise.all([storesApi.getAll<Store>(), locationsApi.getAll()])

      setStores(storesData)
      setLocations(locationsData.filter((loc) => loc.isActive))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSubmitting(true)
      setError(null)

      if (editingStore) {
        await storesApi.update(editingStore.id, formData)
      } else {
        await storesApi.create(formData)
      }

      // Reset form and close dialog
      setFormData({
        name: "",
        capacity: 0,
        locationId: 0,
      })
      setIsDialogOpen(false)
      setEditingStore(null)

      // Reload stores
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save store")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditStore = (store: Store) => {
    setEditingStore(store)
    setFormData({
      name: store.name,
      capacity: store.capacity,
      locationId: store.locationId,
    })
    setIsDialogOpen(true)
  }

  const handleDeleteStore = async (storeId: number) => {
    if (!confirm("Are you sure you want to delete this store?")) return

    try {
      await storesApi.remove(storeId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete store")
    }
  }

  const handleViewStore = (store: Store) => {
    setViewingStore(store)
  }

  const filteredStores = stores.filter(
    (store) =>
      store.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getLocationName(store.locationId)?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Helper to get cold rooms summary for a store
  const getColdRoomsSummary = (store: Store) => {
    // store.coldRooms may be undefined or an array
    const coldRooms = (store as any).coldRooms as any[] | undefined
    if (!coldRooms || coldRooms.length === 0) return "0"
    return `${coldRooms.length}`
    // return `${coldRooms.length} (${coldRooms.map(r => r.name).join(", ")})`
  }

  const getLocationName = (locationId: number) => {
    const location = locations.find((loc) => loc.id === locationId)
    return location?.name || "Unknown Location"
  }

  const getLocationAddress = (locationId: number) => {
    const location = locations.find((loc) => loc.id === locationId)
    return location?.address || ""
  }

  // Mock utilization data (in real app, this would come from inventory API)
  const getStoreUtilization = (storeId: number) => {
    const mockUtilizations = [45, 67, 23, 89, 34, 78, 56, 91, 12, 65]
    return mockUtilizations[storeId % mockUtilizations.length] || 50
  }

  const getCapacityStatus = (utilization: number) => {
    if (utilization >= 90) return { label: "Critical", color: "bg-red-600", variant: "destructive" as const }
    if (utilization >= 75) return { label: "High", color: "bg-orange-500", variant: "secondary" as const }
    if (utilization >= 50) return { label: "Medium", color: "bg-yellow-500", variant: "secondary" as const }
    return { label: "Low", color: "bg-green-600", variant: "default" as const }
  }

  const totalCapacity = stores.reduce((sum, store) => sum + store.capacity, 0)
  const averageUtilization =
    stores.length > 0 ? stores.reduce((sum, store) => sum + getStoreUtilization(store.id), 0) / stores.length : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <ERPLayout>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Stores Management</h1>
            <p className="text-muted-foreground">Manage storage facilities and capacity</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingStore(null)
                  setFormData({ name: "", capacity: 0, locationId: 0 })
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Store
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingStore ? "Edit Store" : "Add New Store"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateStore} className="space-y-4">
                <div>
                  <Label htmlFor="name">Store Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isSubmitting}
                    placeholder="Enter store name"
                  />
                </div>

                <div>
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number.parseInt(e.target.value) || 0 })}
                    required
                    disabled={isSubmitting}
                    placeholder="Enter capacity"
                  />
                </div>

                <div>
                  <Label htmlFor="locationId">Location</Label>
                  <Select
                    value={formData.locationId.toString()}
                    onValueChange={(value) => setFormData({ ...formData, locationId: Number.parseInt(value) })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingStore ? "Update Store" : "Create Store"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Cards - Compact Style */}
        <div className="grid gap-2 md:grid-cols-3">
          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total Stores</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{stores.length}</div>
              <p className="text-xs text-muted-foreground leading-tight">All storage facilities</p>
            </CardContent>
          </Card>

          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total Capacity</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{totalCapacity.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground leading-tight">Combined capacity</p>
            </CardContent>
          </Card>

          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Locations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{locations.length}</div>
              <p className="text-xs text-muted-foreground leading-tight">Available locations</p>
            </CardContent>
          </Card>
        </div>

        {/* Stores List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              {/* <CardTitle>Storage Facilities</CardTitle> */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search stores..."
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
                  <TableHead>Store Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Cold Rooms</TableHead>
                  {/* <TableHead>Utilization</TableHead>
                <TableHead>Status</TableHead> */}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.map((store) => {
                  const utilization = getStoreUtilization(store.id)
                  const status = getCapacityStatus(utilization)
                  return (
                    <TableRow key={store.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{store.name}</div>
                            <div className="text-sm text-muted-foreground">ID: {store.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{getLocationName(store.locationId)}</div>
                          <div className="text-sm text-muted-foreground">
                            {getLocationAddress(store.locationId).length > 30
                              ? `${getLocationAddress(store.locationId).substring(0, 30)}...`
                              : getLocationAddress(store.locationId)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{store.capacity.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">units</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {getColdRoomsSummary(store)}
                        </div>
                      </TableCell>
                      {/* <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{utilization}%</span>
                          <span className="text-muted-foreground">
                            {Math.round((utilization / 100) * store.capacity).toLocaleString()} /{" "}
                            {store.capacity.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={utilization} className="h-2" />
                      </div>
                    </TableCell> */}
                      {/* <TableCell>
                      <Badge variant={status.variant} className={status.color}>
                        {status.label}
                      </Badge>
                    </TableCell> */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewStore(store)}>
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button variant="outline" size="sm" onClick={() => handleEditStore(store)}>
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
                                  This action cannot be undone. This will permanently delete the Store.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteStore(store.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Store Details Dialog */}
        <Dialog open={!!viewingStore} onOpenChange={() => setViewingStore(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Store Details</DialogTitle>
            </DialogHeader>
            {viewingStore && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Store Name</Label>
                    <p className="text-lg font-semibold">{viewingStore.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Store ID</Label>
                    <p className="text-lg">{viewingStore.id}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                  <div className="mt-1">
                    <p className="font-medium">{getLocationName(viewingStore.locationId)}</p>
                    <p className="text-sm text-muted-foreground">{getLocationAddress(viewingStore.locationId)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Total Capacity</Label>
                    <p className="text-2xl font-bold">{viewingStore.capacity.toLocaleString()}</p>
                  </div>
                  {/* <div>
                  <Label className="text-sm font-medium text-muted-foreground">Current Utilization</Label>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">{getStoreUtilization(viewingStore.id)}%</p>
                    <Progress value={getStoreUtilization(viewingStore.id)} className="h-3" />
                  </div>
                </div> */}
                </div>

                {/* <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Used Capacity</Label>
                  <p className="text-lg font-semibold">
                    {Math.round((getStoreUtilization(viewingStore.id) / 100) * viewingStore.capacity).toLocaleString()}{" "}
                    units
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Available Capacity</Label>
                  <p className="text-lg font-semibold">
                    {Math.round(
                      viewingStore.capacity - (getStoreUtilization(viewingStore.id) / 100) * viewingStore.capacity,
                    ).toLocaleString()}{" "}
                    units
                  </p>
                </div>
              </div> */}

                {/* <div>
                <Label className="text-sm font-medium text-muted-foreground">Capacity Status</Label>
                <div className="mt-1">
                  <Badge
                    variant={getCapacityStatus(getStoreUtilization(viewingStore.id)).variant}
                    className={getCapacityStatus(getStoreUtilization(viewingStore.id)).color}
                  >
                    {getCapacityStatus(getStoreUtilization(viewingStore.id)).label}
                  </Badge>
                </div>
              </div> */}

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p>{new Date(viewingStore.createdAt).toLocaleDateString()}</p>
                    {viewingStore.createdByUsername && (
                      <p className="font-medium text-xs text-muted-foreground">by {viewingStore.createdByUsername}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p>{new Date(viewingStore.updatedAt).toLocaleDateString()}</p>
                    {viewingStore.updatedByUsername && (
                      <p className="font-medium text-xs text-muted-foreground">by {viewingStore.updatedByUsername}</p>
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
