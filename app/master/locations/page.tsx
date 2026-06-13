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
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, MoreHorizontal, MapPin, Edit, Trash2, Eye } from "lucide-react"
import { locationsApi, type Location } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ERPLayout } from "@/components/layouts/erp-layout"

export default function LocationsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    contactPerson: "",
    contactNumber: "",
    email: "",
    taxNumber: "",
    taxRate: "",
    isActive: true,
  })
  const { toast } = useToast()

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    try {
      setLoading(true)
      const data = await locationsApi.getAll<Location>()
      setLocations(data)
    } catch (error) {
      console.error("Error loading locations:", error)
      toast({
        title: "Error",
        description: "Failed to load locations",
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
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      contactPerson: "",
      contactNumber: "",
      email: "",
      taxNumber: "",
      taxRate: "",
      isActive: true,
    })
  }

  const handleCreateLocation = async () => {
    // Validate required fields
    const requiredFields: { key: keyof typeof formData; label: string }[] = [
      { key: 'name', label: 'Location Name' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State/Province' },
      { key: 'country', label: 'Country' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'contactNumber', label: 'Contact Number' },
      { key: 'email', label: 'Email' },
    ];
    const missing = requiredFields.filter(f => !String(formData[f.key]).trim());
    if (missing.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill: ${missing.map(f => f.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    try {
      await locationsApi.create(formData)
      toast({
        title: "Success",
        description: "Location created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadLocations()
    } catch (error) {
      console.error("Error creating location:", error)
      toast({
        title: "Error",
        description: "Failed to create location",
        variant: "destructive",
      })
    }
  }

  const handleUpdateLocation = async () => {
    if (!selectedLocation) return

    try {
      await locationsApi.update(selectedLocation.id, formData)
      toast({
        title: "Success",
        description: "Location updated successfully",
      })
      setIsEditDialogOpen(false)
      resetForm()
      setSelectedLocation(null)
      loadLocations()
    } catch (error) {
      console.error("Error updating location:", error)
      toast({
        title: "Error",
        description: "Failed to update location",
        variant: "destructive",
      })
    }
  }

  const handleDeleteLocation = async (id: number) => {
    // if (!confirm("Are you sure you want to delete this location?")) return

    try {
      await locationsApi.remove(id)
      toast({
        title: "Success",
        description: "Location deleted successfully",
      })
      loadLocations()
    } catch (error) {
      console.error("Error deleting location:", error)
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      })
    }
  }

  const handleEditLocation = (location: Location) => {
    setSelectedLocation(location)
    setFormData({
      name: location.name,
      code: location.code,
      address: location.address,
      city: location.city || "",
      state: location.state || "",
      country: location.country || "",
      postalCode: location.postalCode || "",
      contactPerson: location.contactPerson || "",
      contactNumber: location.contactNumber || "",
      email: location.email || "",
      taxNumber: location.taxNumber || "",
      taxRate: location.taxRate || "",
      isActive: location.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const handleViewLocation = (location: Location) => {
    setSelectedLocation(location)
    setIsViewDialogOpen(true)
  }

  const filteredLocations = locations.filter(
    (location) =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.address.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <ERPLayout>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Locations</h1>
            <p className="text-muted-foreground">Manage warehouse and storage locations</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Location</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Location Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter location name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Location Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                      placeholder="Enter location code"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter full address"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State/Province *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                      placeholder="Enter state or province"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                      placeholder="Enter country"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData((prev) => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="Enter postal code"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                      placeholder="Enter contact person name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactNumber">Contact Number *</Label>
                    <Input
                      id="contactNumber"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contactNumber: e.target.value }))}
                      placeholder="Enter contact number"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="taxNumber">Tax Number</Label>
                    <Input
                      id="taxNumber"
                      value={formData.taxNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, taxNumber: e.target.value }))}
                      placeholder="Enter tax number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.01"
                      value={formData.taxRate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, taxRate: e.target.value }))}
                      placeholder="Enter tax rate"
                    />
                  </div>
                </div>

                {/* <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: !!checked }))}
                />
                <Label htmlFor="isActive">Active Location</Label>
              </div> */}

                <Button onClick={handleCreateLocation} className="w-full">
                  Create Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards - Compact Style */}
        <div className="grid gap-2 md:grid-cols-3">
          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total Locations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{locations.length}</div>
              <p className="text-xs text-muted-foreground leading-tight">All locations</p>
            </CardContent>
          </Card>

          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Active Locations</CardTitle>
              <MapPin className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{locations.filter((loc) => loc.isActive).length}</div>
              <p className="text-xs text-muted-foreground leading-tight">Currently active</p>
            </CardContent>
          </Card>

          <Card className="h-20 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Inactive Locations</CardTitle>
              <MapPin className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{locations.filter((loc) => !loc.isActive).length}</div>
              <p className="text-xs text-muted-foreground leading-tight">Currently inactive</p>
            </CardContent>
          </Card>
        </div>

        {/* Locations List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              {/* <CardTitle>Locations</CardTitle> */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search locations..."
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
                  <TableHead>Address</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell>
                      <div className="font-medium">{location.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{location.code}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{location.address}</div>
                    </TableCell>
                    <TableCell>{location.contactPerson || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={location.isActive ? "default" : "secondary"}>
                        {location.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewLocation(location)}>
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button variant="outline" size="sm" onClick={() => handleEditLocation(location)}>
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
                                This action cannot be undone. This will permanently delete the Location.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteLocation(location.id)}>Delete</AlertDialogAction>
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editName">Location Name</Label>
                  <Input
                    id="editName"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter location name"
                  />
                </div>
                <div>
                  <Label htmlFor="editCode">Location Code</Label>
                  <Input
                    id="editCode"
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="Enter location code"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editAddress">Address</Label>
                <Textarea
                  id="editAddress"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter full address"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editCity">City</Label>
                  <Input
                    id="editCity"
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Enter city"
                  />
                </div>
                <div>
                  <Label htmlFor="editState">State/Province</Label>
                  <Input
                    id="editState"
                    value={formData.state}
                    onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                    placeholder="Enter state or province"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editCountry">Country</Label>
                  <Input
                    id="editCountry"
                    value={formData.country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                    placeholder="Enter country"
                  />
                </div>
                <div>
                  <Label htmlFor="editPostalCode">Postal Code</Label>
                  <Input
                    id="editPostalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="Enter postal code"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editContactPerson">Contact Person</Label>
                  <Input
                    id="editContactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="Enter contact person name"
                  />
                </div>
                <div>
                  <Label htmlFor="editContactNumber">Contact Number</Label>
                  <Input
                    id="editContactNumber"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contactNumber: e.target.value }))}
                    placeholder="Enter contact number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editTaxNumber">Tax Number</Label>
                  <Input
                    id="editTaxNumber"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, taxNumber: e.target.value }))}
                    placeholder="Enter tax number"
                  />
                </div>
                <div>
                  <Label htmlFor="editTaxRate">Tax Rate (%)</Label>
                  <Input
                    id="editTaxRate"
                    type="number"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, taxRate: e.target.value }))}
                    placeholder="Enter tax rate"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editIsActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: !!checked }))}
                />
                <Label htmlFor="editIsActive">Active Location</Label>
              </div>

              <Button onClick={handleUpdateLocation} className="w-full">
                Update Location
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Location Details</DialogTitle>
            </DialogHeader>
            {selectedLocation && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Location Name</Label>
                    <p className="font-medium">{selectedLocation.name}</p>
                  </div>
                  <div>
                    <Label>Location Code</Label>
                    <p className="font-medium">{selectedLocation.code}</p>
                  </div>
                </div>

                <div>
                  <Label>Address</Label>
                  <p className="font-medium">{selectedLocation.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <p className="font-medium">{selectedLocation.city || "N/A"}</p>
                  </div>
                  <div>
                    <Label>State/Province</Label>
                    <p className="font-medium">{selectedLocation.state || "N/A"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Country</Label>
                    <p className="font-medium">{selectedLocation.country || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <p className="font-medium">{selectedLocation.postalCode || "N/A"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Person</Label>
                    <p className="font-medium">{selectedLocation.contactPerson || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Contact Number</Label>
                    <p className="font-medium">{selectedLocation.contactNumber || "N/A"}</p>
                  </div>
                </div>

                <div>
                  <Label>Email</Label>
                  <p className="font-medium">{selectedLocation.email || "N/A"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tax Number</Label>
                    <p className="font-medium">{selectedLocation.taxNumber || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Tax Rate</Label>
                    <p className="font-medium">{selectedLocation.taxRate ? `${selectedLocation.taxRate}%` : "N/A"}</p>
                  </div>
                </div>

                <div>
                  <Label>Status </Label>
                  <Badge variant={selectedLocation.isActive ? "default" : "secondary"}>
                    {selectedLocation.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Created At</Label>
                    <p className="font-medium">{new Date(selectedLocation.createdAt).toLocaleDateString()}</p>
                    {selectedLocation.createdByUsername && (
                      <p className="font-medium text-xs text-muted-foreground">by {selectedLocation.createdByUsername}</p>
                    )}
                  </div>
                  <div>
                    <Label>Updated At</Label>
                    <p className="font-medium">{new Date(selectedLocation.updatedAt).toLocaleDateString()}</p>
                    {selectedLocation.updatedByUsername && (
                      <p className="font-medium text-xs text-muted-foreground">by {selectedLocation.updatedByUsername}</p>
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
