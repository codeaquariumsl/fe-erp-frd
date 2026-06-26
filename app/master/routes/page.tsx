"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Search, MoreHorizontal, Route, MapPin, Clock, Loader2, AlertCircle, Eye, Truck, Edit, Trash2, Calendar } from "lucide-react"
import { routesApi, vehiclesApi, driversApi, customersApi, type Vehicle, type Driver, type Customer } from "@/lib/api"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { toast } from "@/hooks/use-toast"

interface RouteData {
  driver: any
  vehicle: any
  vehicleId: string
  driverId: string
  id: number
  routeName: string
  description: string
  city: string
  startPoint: string
  endPoint: string
  distanceKm: number
  estimateTime: string
  status: string
  vehicleIds: number[]
  customerIds: number[]
  customers?: Customer[]
  days: string[]
  createdAt: string
  updatedAt: string
  createdByUsername: string
  updatedByUsername: string
}

export default function RoutesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [routes, setRoutes] = useState<RouteData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingRoute, setEditingRoute] = useState<RouteData | null>(null)
  const [viewingRoute, setViewingRoute] = useState<RouteData | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    routeName: "",
    description: "",
    city: "",
    startPoint: "",
    endPoint: "",
    distanceKm: 0,
    estimateTime: "",
    status: "active",
    vehicleIds: [] as number[],
    vehicleId: "",
    driverId: "",
    customerIds: [] as number[],
    days: [] as string[],
  })

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Vehicles and Drivers
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerSearchTerm, setCustomerSearchTerm] = useState("")

  useEffect(() => {
    loadRoutes()
    loadVehicles()
    loadDrivers()
    loadCustomers()
  }, [])

  const loadVehicles = async () => {
    try {
      const data = await vehiclesApi.getAll<Vehicle>()
      setVehicles(data)
    } catch (err) {
      // ignore for now
    }
  }

  const loadDrivers = async () => {
    try {
      const data = await driversApi.getAll<Driver>()
      setDrivers(data)
    } catch (err) {
      // ignore for now
    }
  }

  const loadCustomers = async () => {
    try {
      const data = await customersApi.getAll<Customer>()
      setCustomers(data)
    } catch (err) {
      // ignore for now
    }
  }

  const loadRoutes = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const routesData = await routesApi.getAll<RouteData>()
      setRoutes(routesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load routes")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSubmitting(true)
      setError(null)

      // Validate required fields
      const errors: string[] = []

      if (!formData.routeName.trim()) {
        errors.push("Route Name is required")
      }
      if (!formData.city) {
        errors.push("City is required")
      }
      if (!formData.vehicleId) {
        errors.push("Vehicle is required")
      }
      if (!formData.driverId) {
        errors.push("Driver is required")
      }
      if (!formData.startPoint.trim()) {
        errors.push("Start Point is required")
      }
      if (!formData.endPoint.trim()) {
        errors.push("End Point is required")
      }
      if (!formData.distanceKm || formData.distanceKm <= 0) {
        errors.push("Distance must be greater than 0")
      }
      if (!formData.estimateTime.trim()) {
        errors.push("Estimated Time is required")
      }


      if (errors.length > 0) {
        setValidationErrors(errors)
        setError(errors.join(", "))
        return
      }

      // Clear validation errors if all validations pass
      setValidationErrors([])

      // Prepare payload
      const payload = {
        ...formData,
        vehicleId: formData.vehicleId || undefined,
        driverId: formData.driverId || undefined,
      }

      if (editingRoute) {
        await routesApi.update(editingRoute.id, payload)
      } else {
        await routesApi.create(payload)
      }

      // Show success toast
      toast({
        title: editingRoute ? "Route Updated" : "Route Created",
        description: editingRoute
          ? "The route has been updated successfully."
          : "The new route has been created successfully.",
        variant: "default",
      })

      // Reset form and close dialog
      setFormData({
        routeName: "",
        description: "",
        city: "",
        startPoint: "",
        endPoint: "",
        distanceKm: 0,
        estimateTime: "",
        status: "active",
        vehicleIds: [],
        vehicleId: "",
        driverId: "",
        customerIds: [],
        days: [],
      })
      setCustomerSearchTerm("")
      setValidationErrors([])
      setIsDialogOpen(false)
      setEditingRoute(null)

      // Reload routes
      await loadRoutes()
    } catch (err) {
      // Handle duplicate entry error
      if (err && typeof err === 'object' && 'error' in err && err.error === 'Duplicate Entry') {
        toast({
          title: "Duplicate Route Name",
          description: "This route name already exists. Please choose a different name.",
          variant: "destructive",
        })
        // Highlight the route name field
        setValidationErrors(["route name"])
      } else {
        // Handle other errors
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to save route",
          variant: "destructive",
        })
        setError(err instanceof Error ? err.message : "Failed to save route")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditRoute = (route: RouteData) => {
    setEditingRoute(route)
    setCustomerSearchTerm("")
    setValidationErrors([])
    setFormData({
      routeName: route.routeName,
      description: route.description,
      city: route.city,
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      distanceKm: route.distanceKm,
      estimateTime: route.estimateTime,
      status: route.status,
      driverId: String(route.driverId || ""),
      vehicleId: String(route.vehicleId || ""),
      vehicleIds: route.vehicleIds || [],
      customerIds: route.customerIds || [],
      days: route.days || [],
    })
    setIsDialogOpen(true)
  }

  const handleDeleteRoute = async (routeId: number) => {
    // if (!confirm("Are you sure you want to delete this route?")) return

    try {
      await routesApi.remove(routeId)
      await loadRoutes()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route")
    }
  }

  const handleViewRoute = (route: RouteData) => {
    setViewingRoute(route)
  }

  // Helper function to check if a field has validation errors
  const hasValidationError = (fieldName: string) => {
    return validationErrors.some(error => error.toLowerCase().includes(fieldName.toLowerCase()))
  }

  // Helper function to clear specific validation error
  const clearValidationError = (fieldName: string) => {
    setValidationErrors(prev => prev.filter(error => !error.toLowerCase().includes(fieldName.toLowerCase())))
  }

  const filteredRoutes = routes.filter(
    (route) =>
      route.routeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge variant="default" className="bg-green-600">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    )
  }

  const totalDistance = routes.reduce((sum, route) => sum + (route.distanceKm || 0), 0)
  const activeRoutes = routes.filter((r) => r.status === "active").length
  const totalVehicles = routes.reduce((sum, route) => sum + (route.vehicleIds?.length || 0), 0)
  const totalCustomers = routes.reduce((sum, route) => sum + (route.customerIds?.length || 0), 0)

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
            <h1 className="text-3xl font-bold">Routes Management</h1>
            <p className="text-muted-foreground">Manage delivery routes and logistics</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingRoute(null)
                  setCustomerSearchTerm("")
                  setValidationErrors([])
                  setFormData({
                    routeName: "",
                    description: "",
                    city: "",
                    startPoint: "",
                    endPoint: "",
                    distanceKm: 0,
                    estimateTime: "",
                    status: "active",
                    vehicleId: "",
                    driverId: "",
                    vehicleIds: [],
                    customerIds: [],
                    days: [],
                  })
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Route
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{editingRoute ? "Edit Route" : "Add New Route"}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleCreateRoute} className="space-y-2 pr-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="routeName">Route Name *</Label>
                      <Input
                        id="routeName"
                        value={formData.routeName}
                        onChange={(e) => {
                          setFormData({ ...formData, routeName: e.target.value })
                          clearValidationError("route name")
                        }}
                        required
                        disabled={isSubmitting}
                        placeholder="Enter route name"
                        className={hasValidationError("route name") ? "border-red-500 focus:border-red-500" : ""}
                      />
                      {hasValidationError("route name") && (
                        <p className="text-sm text-red-500 mt-1">Route Name is required</p>
                      )}
                    </div>

                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Select
                        value={formData.city}
                        onValueChange={(value) => {
                          setFormData({ ...formData, city: value })
                          clearValidationError("city")
                        }}
                        disabled={isSubmitting}
                        required
                      >
                        <SelectTrigger className={hasValidationError("city") ? "border-red-500 focus:border-red-500" : ""}>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* <SelectItem value="__all__">Select city</SelectItem> */}
                          <SelectItem value="Colombo">Colombo</SelectItem>
                          <SelectItem value="Kandy">Kandy</SelectItem>
                          <SelectItem value="Galle">Galle</SelectItem>
                          <SelectItem value="Jaffna">Jaffna</SelectItem>
                          <SelectItem value="Negombo">Negombo</SelectItem>
                          <SelectItem value="Anuradhapura">Anuradhapura</SelectItem>
                          <SelectItem value="Ratnapura">Ratnapura</SelectItem>
                          <SelectItem value="Trincomalee">Trincomalee</SelectItem>
                          <SelectItem value="Batticaloa">Batticaloa</SelectItem>
                          <SelectItem value="Matara">Matara</SelectItem>
                          <SelectItem value="Kurunegala">Kurunegala</SelectItem>
                          <SelectItem value="Badulla">Badulla</SelectItem>
                          <SelectItem value="Puttalam">Puttalam</SelectItem>
                          <SelectItem value="Polonnaruwa">Polonnaruwa</SelectItem>
                          <SelectItem value="Hambantota">Hambantota</SelectItem>
                          <SelectItem value="Vavuniya">Vavuniya</SelectItem>
                          <SelectItem value="Kilinochchi">Kilinochchi</SelectItem>
                          <SelectItem value="Mannar">Mannar</SelectItem>
                          <SelectItem value="Monaragala">Monaragala</SelectItem>
                          <SelectItem value="Ampara">Ampara</SelectItem>
                          <SelectItem value="Gampaha">Gampaha</SelectItem>
                          <SelectItem value="Kalutara">Kalutara</SelectItem>
                          <SelectItem value="Matale">Matale</SelectItem>
                          <SelectItem value="Nuwara Eliya">Nuwara Eliya</SelectItem>
                          <SelectItem value="Kegalle">Kegalle</SelectItem>
                          <SelectItem value="Mullaitivu">Mullaitivu</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasValidationError("city") && (
                        <p className="text-sm text-red-500 mt-1">City is required</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="vehicleId">Vehicle *</Label>
                      <Select
                        value={formData.vehicleId}
                        onValueChange={(value) => {
                          setFormData({ ...formData, vehicleId: value })
                          clearValidationError("vehicle")
                        }}
                        disabled={isSubmitting}
                        required
                      >
                        <SelectTrigger className={hasValidationError("vehicle") ? "border-red-500 focus:border-red-500" : ""}>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* <SelectItem value="__all__">Select vehicle</SelectItem> */}
                          {vehicles.map((v) => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.vehicleNumber} - {v.vehicleType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {hasValidationError("vehicle") && (
                        <p className="text-sm text-red-500 mt-1">Vehicle is required</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="driverId">Driver *</Label>
                      <Select
                        value={formData.driverId}
                        onValueChange={(value) => {
                          setFormData({ ...formData, driverId: value })
                          clearValidationError("driver")
                        }}
                        disabled={isSubmitting}
                        required
                      >
                        <SelectTrigger className={hasValidationError("driver") ? "border-red-500 focus:border-red-500" : ""}>
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* <SelectItem value="__all__">Select driver</SelectItem> */}
                          {drivers.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.name} ({d.mobile})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {hasValidationError("driver") && (
                        <p className="text-sm text-red-500 mt-1">Driver is required</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="startPoint">Start Point *</Label>
                      <Input
                        id="startPoint"
                        value={formData.startPoint}
                        onChange={(e) => setFormData({ ...formData, startPoint: e.target.value })}
                        required
                        disabled={isSubmitting}
                        placeholder="Enter start point"
                        className={hasValidationError("start point") ? "border-red-500 focus:border-red-500" : ""}
                      />
                      {hasValidationError("start point") && (
                        <p className="text-sm text-red-500 mt-1">Start Point is required</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="endPoint">End Point *</Label>
                      <Input
                        id="endPoint"
                        value={formData.endPoint}
                        onChange={(e) => setFormData({ ...formData, endPoint: e.target.value })}
                        required
                        disabled={isSubmitting}
                        placeholder="Enter end point"
                        className={hasValidationError("end point") ? "border-red-500 focus:border-red-500" : ""}
                      />
                      {hasValidationError("end point") && (
                        <p className="text-sm text-red-500 mt-1">End Point is required</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="distanceKm">Distance (km) *</Label>
                        <Input
                          id="distanceKm"
                          type="number"
                          step="0.1"
                          value={formData.distanceKm}
                          onChange={(e) => setFormData({ ...formData, distanceKm: Number.parseFloat(e.target.value) || 0 })}
                          required
                          disabled={isSubmitting}
                          placeholder="0.0"
                          className={hasValidationError("distance") ? "border-red-500 focus:border-red-500" : ""}
                        />
                        {hasValidationError("distance") && (
                          <p className="text-sm text-red-500 mt-1">Distance must be greater than 0</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="estimateTime">Estimated Time *</Label>
                        <Input
                          id="estimateTime"
                          value={formData.estimateTime}
                          onChange={(e) => setFormData({ ...formData, estimateTime: e.target.value })}
                          required
                          disabled={isSubmitting}
                          placeholder="e.g., 45 min"
                          className={hasValidationError("estimated time") ? "border-red-500 focus:border-red-500" : ""}
                        />
                        {hasValidationError("estimated time") && (
                          <p className="text-sm text-red-500 mt-1">Estimated Time is required</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">


                    {/* Customer Selection */}
                    <div>
                      <Label>Customers for this Route *</Label>
                      <div className={`mt-2 border rounded-lg ${hasValidationError("customer") ? "border-red-500" : ""}`}>
                        <div className="p-1 bg-muted/50 border-b">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              Selected: {formData.customerIds.length} customer(s)
                            </span>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const filteredCustomers = customers.filter(customer =>
                                    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                    customer.type.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                    customer.contactNumber.toLowerCase().includes(customerSearchTerm.toLowerCase())
                                  )
                                  setFormData({ ...formData, customerIds: filteredCustomers.map(c => c.id) })
                                }}
                                disabled={isSubmitting}
                              >
                                Select All
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setFormData({ ...formData, customerIds: [] })}
                                disabled={isSubmitting}
                              >
                                Clear All
                              </Button>
                            </div>
                          </div>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              placeholder="Search customers..."
                              value={customerSearchTerm}
                              onChange={(e) => setCustomerSearchTerm(e.target.value)}
                              className="pl-10"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-3">
                          <div className="space-y-1">
                            {customers
                              .filter(customer =>
                                customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                customer.type.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                customer.contactNumber.toLowerCase().includes(customerSearchTerm.toLowerCase())
                              )
                              .map((customer) => (
                                <div key={customer.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors">
                                  <Checkbox
                                    id={`customer-${customer.id}`}
                                    checked={formData.customerIds.includes(customer.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setFormData({
                                          ...formData,
                                          customerIds: [...formData.customerIds, customer.id]
                                        })
                                      } else {
                                        setFormData({
                                          ...formData,
                                          customerIds: formData.customerIds.filter(id => id !== customer.id)
                                        })
                                      }
                                    }}
                                    disabled={isSubmitting}
                                    className="mt-1"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <Label
                                      htmlFor={`customer-${customer.id}`}
                                      className="text-sm font-medium leading-none cursor-pointer block"
                                    >
                                      {customer.name}
                                    </Label>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium mr-2">
                                        {customer.type}
                                      </span>
                                      {customer.contactNumber && (
                                        <span className="mr-2">📞 {customer.contactNumber}</span>
                                      )}
                                      {customer.address && (
                                        <span className="block mt-1 truncate">📍 {customer.address}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            {customers.filter(customer =>
                              customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                              customer.type.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                              customer.contactNumber.toLowerCase().includes(customerSearchTerm.toLowerCase())
                            ).length === 0 && (
                                <div className="text-center py-8">
                                  <p className="text-sm text-muted-foreground">
                                    {customerSearchTerm ? 'No customers found matching your search' : 'No customers available'}
                                  </p>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                      {hasValidationError("customer") && (
                        <p className="text-sm text-red-500 mt-1">At least one customer must be selected</p>
                      )}
                    </div>

                    {/* Delivery Days Selection */}
                    <div>
                      <Label>
                        {/* <Calendar className="h-4 w-4" /> */}
                        Weekly Delivery Days
                      </Label>
                      <div className="mt-2 border rounded-lg">
                        <div className="p-1 bg-muted/50 border-b">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Selected: {formData.days.length} day(s)
                            </span>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                                  setFormData({ ...formData, days: allDays })
                                }}
                                disabled={isSubmitting}
                              >
                                Select All
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setFormData({ ...formData, days: [] })}
                                disabled={isSubmitting}
                              >
                                Clear All
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="p-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                              <div key={day} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md transition-colors">
                                <Checkbox
                                  id={`day-${day}`}
                                  checked={formData.days.includes(day)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFormData({
                                        ...formData,
                                        days: [...formData.days, day]
                                      })
                                    } else {
                                      setFormData({
                                        ...formData,
                                        days: formData.days.filter(d => d !== day)
                                      })
                                    }
                                  }}
                                  disabled={isSubmitting}
                                />
                                <Label
                                  htmlFor={`day-${day}`}
                                  className="text-sm font-medium leading-none cursor-pointer"
                                >
                                  {day}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {formData.days.length === 0 && (
                            <div className="text-center py-2">
                              <p className="text-sm text-muted-foreground">
                                No delivery days selected
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={isSubmitting}
                      placeholder="Enter route description"
                    />
                  </div>



                  {/* <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status"
                    checked={formData.status === "active"}
                    onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? "active" : "inactive" })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="status">Active</Label>
                </div> */}
                  <DialogFooter>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingRoute ? "Update Route" : "Create Route"}
                    </Button>
                  </DialogFooter>
                </form>
              </div>
            </DialogContent>
          </Dialog >
        </div >

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )
        }

        {/* Summary Cards - Compact Style */}
        <div className="grid gap-2 md:grid-cols-4">
          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total Routes</CardTitle>
              <Route className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{routes.length}</div>
              <p className="text-xs text-muted-foreground leading-tight">All routes</p>
            </CardContent>
          </Card>

          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Active Routes</CardTitle>
              <Route className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{activeRoutes}</div>
              <p className="text-xs text-muted-foreground leading-tight">Currently active</p>
            </CardContent>
          </Card>

          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total Distance</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{totalDistance.toFixed(1)} km</div>
              <p className="text-xs text-muted-foreground leading-tight">Combined distance</p>
            </CardContent>
          </Card>

          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Assigned Customers</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{totalCustomers}</div>
              <p className="text-xs text-muted-foreground leading-tight">Total customers</p>
            </CardContent>
          </Card>
        </div>

        {/* Routes List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              {/* <CardTitle>Delivery Routes</CardTitle> */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search routes..."
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
                  <TableHead>Route Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Start - End</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Est. Time</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Delivery Days</TableHead>
                  <TableHead>Customers</TableHead>
                  {/* <TableHead>Status</TableHead> */}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Route className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{route.routeName}</div>
                          <div className="text-sm text-muted-foreground">
                            {route.description.length > 30
                              ? `${route.description.substring(0, 30)}...`
                              : route.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{route.city}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{route.startPoint}</span>
                        <span className="mx-2 text-muted-foreground">→</span>
                        <span className="font-medium">{route.endPoint}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {route.distanceKm} km
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {route.estimateTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3 text-muted-foreground" />
                          {route.vehicle?.vehicleNumber || route.vehicleId || "Unassigned"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {route.driver?.name || "No driver assigned"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {route.days && route.days.length > 0 ? (
                          route.days.map((day) => (
                            <Badge key={day} variant="outline" className="text-xs">
                              {day.substring(0, 3)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No days set</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{route.customerIds?.length || 0}</span>
                        <span className="text-xs text-muted-foreground">customers</span>
                      </div>
                    </TableCell>
                    {/* <TableCell>{getStatusBadge(route.status)}</TableCell> */}
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewRoute(route)}>
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button variant="outline" size="sm" onClick={() => handleEditRoute(route)}>
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
                                This action cannot be undone. This will permanently delete the Route.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteRoute(route.id)}>Delete</AlertDialogAction>
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

        {/* Route Details Dialog */}
        <Dialog open={!!viewingRoute} onOpenChange={() => setViewingRoute(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Route Details</DialogTitle>
            </DialogHeader>
            {viewingRoute && (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Route Name</Label>
                    <p className="text-lg font-semibold">{viewingRoute.routeName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">City</Label>
                    <p className="text-lg">{viewingRoute.city}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Vehicle</Label>
                    <p className="text-lg font-bold">
                      {viewingRoute.vehicle?.vehicleNumber
                        ? `${viewingRoute.vehicle.vehicleNumber} - ${viewingRoute.vehicle.vehicleType}`
                        : viewingRoute.vehicleId
                          ? `Vehicle #${viewingRoute.vehicleId}`
                          : "Unassigned"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mt-2">Driver</Label>
                    <p className="text-sm font-bold">
                      {viewingRoute.driver?.name
                        ? `${viewingRoute.driver.name} (${viewingRoute.driver.mobile})`
                        : viewingRoute.driverId
                          ? `Driver #${viewingRoute.driverId}`
                          : "No driver assigned"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Start Point</Label>
                    <p className="text-lg font-medium">{viewingRoute.startPoint}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">End Point</Label>
                    <p className="text-lg font-medium">{viewingRoute.endPoint}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Distance</Label>
                    <p className="text-lg font-bold">{viewingRoute.distanceKm} km</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Estimated Time</Label>
                    <p className="text-lg font-bold">{viewingRoute.estimateTime}</p>
                  </div>

                </div>

                {/* Delivery Days Section */}
                {viewingRoute.days && viewingRoute.days.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Delivery Days
                    </Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {viewingRoute.days.map((day) => (
                        <Badge key={day} variant="outline" className="text-sm">
                          {day}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Deliveries scheduled on {viewingRoute.days.length} day(s) per week
                    </div>
                  </div>
                )}

                {/* Customers Section */}
                {viewingRoute.customerIds && viewingRoute.customerIds.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Assigned Customers</Label>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {viewingRoute.customerIds.map((customerId) => {
                        const customer = customers.find(c => c.id === customerId)
                        return (
                          <div key={customerId} className="flex items-center p-2 bg-muted rounded-lg">
                            <div>
                              <div className="font-medium text-sm">
                                {customer?.name || `Customer #${customerId}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {customer?.type || 'Unknown type'} • {customer?.contactNumber || 'No contact'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Total: {viewingRoute.customerIds.length} customer(s) assigned to this route
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{viewingRoute.description}</p>
                </div>

                {/* <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(viewingRoute.status)}</div>
              </div> */}

                {viewingRoute.vehicleIds && viewingRoute.vehicleIds.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Vehicle IDs</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {viewingRoute.vehicleIds.map((vehicleId) => (
                        <Badge key={vehicleId} variant="outline">
                          Vehicle #{vehicleId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p>{new Date(viewingRoute.createdAt).toLocaleDateString()}</p>
                    {viewingRoute.createdByUsername && (
                      <p className="font-medium text-xs text-muted-foreground">by {viewingRoute.createdByUsername}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p>{new Date(viewingRoute.updatedAt).toLocaleDateString()}</p>
                    {viewingRoute.createdByUsername && (
                      <p className="font-medium text-xs text-muted-foreground">by {viewingRoute.createdByUsername}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div >
    </ERPLayout>
  )
}

