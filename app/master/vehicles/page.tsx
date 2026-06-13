"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { vehiclesApi, routesApi, type Vehicle } from "@/lib/api"
import { Plus, Search, Edit, Trash2, Car, Truck, Users, TrendingUp } from "lucide-react"
import { ERPLayout } from "@/components/layouts/erp-layout"

interface Route {
  id: number
  name: string
  description: string
  startLocation: string
  endLocation: string
  distance: number
  estimatedTime: string
  status: string
  createdAt: string
  updatedAt: string
}

interface VehicleWithRoutes extends Vehicle {
  Routes?: Route[]
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleWithRoutes[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithRoutes | null>(null)
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    vehicleType: "",
    capacityKg: "",
    driverName: "",
    contactNumber: "",
    status: "Available",
    routeIds: [] as number[],
  })

  useEffect(() => {
    fetchVehicles()
    fetchRoutes()
  }, [])

  const fetchVehicles = async () => {
    try {
      const data = await vehiclesApi.getAll<VehicleWithRoutes>()
      setVehicles(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch vehicles",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRoutes = async () => {
    try {
      const data = await routesApi.getAll<Route>()
      setRoutes(data)
    } catch (error) {
      console.error("Failed to fetch routes:", error)
    }
  }

  const validatePhoneNumber = (phone: string): boolean => {
    return /^(\+94|0)[1-9][0-9]{8}$/.test(phone);
  }

  const handleCreate = async () => {
    try {
      // Validate phone number before submission
      if (formData.contactNumber && !validatePhoneNumber(formData.contactNumber)) {
        toast({
          title: "Invalid Contact Number",
          description: "Please enter a valid Sri Lankan phone number before submitting",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        ...formData,
        capacityKg: Number.parseInt(formData.capacityKg),
        routeIds: formData.routeIds,
      }

      await vehiclesApi.create(payload)
      toast({
        title: "Success",
        description: "Vehicle created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      fetchVehicles()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create vehicle",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async () => {
    if (!selectedVehicle) return

    try {
      // Validate phone number before submission
      if (formData.contactNumber && !validatePhoneNumber(formData.contactNumber)) {
        toast({
          title: "Invalid Contact Number",
          description: "Please enter a valid Sri Lankan phone number before submitting",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        ...formData,
        capacityKg: Number.parseInt(formData.capacityKg),
        routeIds: formData.routeIds,
      }

      await vehiclesApi.update(selectedVehicle.id, payload)
      toast({
        title: "Success",
        description: "Vehicle updated successfully",
      })
      setIsEditDialogOpen(false)
      resetForm()
      fetchVehicles()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update vehicle",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await vehiclesApi.remove(id)
      toast({
        title: "Success",
        description: "Vehicle deleted successfully",
      })
      fetchVehicles()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete vehicle",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      vehicleNumber: "",
      vehicleType: "",
      capacityKg: "",
      driverName: "",
      contactNumber: "",
      status: "Available",
      routeIds: [],
    })
    setSelectedVehicle(null)
  }

  const openEditDialog = (vehicle: VehicleWithRoutes) => {
    setSelectedVehicle(vehicle)
    setFormData({
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      capacityKg: vehicle.capacityKg.toString(),
      driverName: vehicle.driverName,
      contactNumber: vehicle.contactNumber,
      status: vehicle.status,
      routeIds: vehicle.routeIds || [],
    })
    setIsEditDialogOpen(true)
  }

  const getRouteNames = (routeIds: number[]) => {
    if (!routeIds || routeIds.length === 0) return "No routes assigned"
    return routeIds
      .map((id) => {
        const route = routes.find((r) => r.id === id)
        return route?.name || `Route ${id}`
      })
      .join(", ")
  }

  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.contactNumber.includes(searchTerm),
  )

  // Analytics calculations
  const totalVehicles = vehicles.length
  const availableVehicles = vehicles.filter((vehicle) => vehicle.status === "Available").length
  const totalCapacity = vehicles.reduce((sum, vehicle) => sum + vehicle.capacityKg, 0)
  const uniqueDrivers = new Set(vehicles.map((vehicle) => vehicle.driverName)).size

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <ERPLayout>
      <div className="flex-1 space-y-2 p-4 md:p-2 pt-2">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Vehicles Management</h2>
            <p className="text-muted-foreground">Manage your vehicle fleet</p>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Vehicle</DialogTitle>
                  <DialogDescription>Add a new vehicle to your fleet.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                      <Input
                        id="vehicleNumber"
                        value={formData.vehicleNumber}
                        onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                        placeholder="Vehicle registration number"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="vehicleType">Vehicle Type</Label>
                      <Select
                        value={formData.vehicleType}
                        onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Truck">Truck</SelectItem>
                          <SelectItem value="Van">Van</SelectItem>
                          <SelectItem value="Pickup">Pickup</SelectItem>
                          <SelectItem value="Trailer">Trailer</SelectItem>
                          <SelectItem value="Container">Container</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="capacityKg">Capacity (KG)</Label>
                    <Input
                      id="capacityKg"
                      type="number"
                      value={formData.capacityKg}
                      onChange={(e) => setFormData({ ...formData, capacityKg: e.target.value })}
                      placeholder="Vehicle capacity in kilograms"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="driverName">Owner Name</Label>
                      <Input
                        id="driverName"
                        value={formData.driverName}
                        onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                        placeholder="Owner's full name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input
                        id="contactNumber"
                        value={formData.contactNumber}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow numbers and the plus symbol
                          if (!/^[0-9+]*$/.test(value)) return;
                          // Limit to max 12 characters (+94XXXXXXXXX)
                          if (value.length > 12) return;
                          setFormData({ ...formData, contactNumber: value });
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          // Format validation for Sri Lankan numbers
                          const isValid = /^(\+94|0)[1-9][0-9]{8}$/.test(value);
                          if (!isValid && value) {
                            toast({
                              title: "Invalid Contact Number",
                              description: "Please enter a valid Sri Lankan phone number (e.g., +94XXXXXXXXX or 0XXXXXXXXX)",
                              variant: "destructive",
                            });
                          }
                        }}
                        placeholder="+94XXXXXXXXX or 0XXXXXXXXX"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter a valid Sri Lankan phone number (e.g., +94771234567 or 0771234567)
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div >
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="In Transit">In Transit</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                          <SelectItem value="Out of Service">Out of Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreate}>
                    Create Vehicle
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Analytics Cards - Compact Style */}
        <div className="grid gap-2 md:grid-cols-4">
          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total Vehicles</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{totalVehicles}</div>
              <p className="text-xs text-muted-foreground leading-tight">{availableVehicles} available</p>
            </CardContent>
          </Card>
          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total Capacity</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{totalCapacity.toLocaleString()} KG</div>
              <p className="text-xs text-muted-foreground leading-tight">Fleet capacity</p>
            </CardContent>
          </Card>
          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Drivers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{uniqueDrivers}</div>
              <p className="text-xs text-muted-foreground leading-tight">Active drivers</p>
            </CardContent>
          </Card>
          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Availability</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">
                {totalVehicles > 0 ? Math.round((availableVehicles / totalVehicles) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground leading-tight">Fleet availability</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            {/* <CardDescription>Manage your vehicle fleet</CardDescription> */}
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Routes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                    <TableCell>{vehicle.vehicleType}</TableCell>
                    <TableCell>{vehicle.capacityKg} KG</TableCell>
                    <TableCell>{vehicle.driverName}</TableCell>
                    <TableCell>{vehicle.contactNumber}</TableCell>
                    <TableCell className="max-w-xs truncate">{getRouteNames(vehicle.routeIds)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          vehicle.status === "Available"
                            ? "default"
                            : vehicle.status === "In Transit"
                              ? "secondary"
                              : vehicle.status === "Maintenance"
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {vehicle.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(vehicle)}>
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
                                This action cannot be undone. This will permanently delete the vehicle.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(vehicle.id)}>Delete</AlertDialogAction>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Vehicle</DialogTitle>
              <DialogDescription>Update vehicle information.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-vehicleNumber">Vehicle Number</Label>
                  <Input
                    id="edit-vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    placeholder="Vehicle registration number"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-vehicleType">Vehicle Type</Label>
                  <Select
                    value={formData.vehicleType}
                    onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Truck">Truck</SelectItem>
                      <SelectItem value="Van">Van</SelectItem>
                      <SelectItem value="Pickup">Pickup</SelectItem>
                      <SelectItem value="Trailer">Trailer</SelectItem>
                      <SelectItem value="Container">Container</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-capacityKg">Capacity (KG)</Label>
                <Input
                  id="edit-capacityKg"
                  type="number"
                  value={formData.capacityKg}
                  onChange={(e) => setFormData({ ...formData, capacityKg: e.target.value })}
                  placeholder="Vehicle capacity in kilograms"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-driverName">Owner Name</Label>
                  <Input
                    id="edit-driverName"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    placeholder="Owner's full name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-contactNumber">Contact Number</Label>
                  <Input
                    id="edit-contactNumber"
                    value={formData.contactNumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numbers and the plus symbol
                      if (!/^[0-9+]*$/.test(value)) return;
                      // Limit to max 12 characters (+94XXXXXXXXX)
                      if (value.length > 12) return;
                      setFormData({ ...formData, contactNumber: value });
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      // Format validation for Sri Lankan numbers
                      const isValid = /^(\+94|0)[1-9][0-9]{8}$/.test(value);
                      if (!isValid && value) {
                        toast({
                          title: "Invalid Contact Number",
                          description: "Please enter a valid Sri Lankan phone number (e.g., +94XXXXXXXXX or 0XXXXXXXXX)",
                          variant: "destructive",
                        });
                      }
                    }}
                    placeholder="+94XXXXXXXXX or 0XXXXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a valid Sri Lankan phone number (e.g., +94771234567 or 0771234567)
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="In Transit">In Transit</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Out of Service">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleEdit}>
                Update Vehicle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
