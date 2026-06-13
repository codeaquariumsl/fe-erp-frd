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
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Search, MoreHorizontal, Factory, Globe, Building2, Edit, Trash2, Eye, Mail, Phone, Check, ChevronsUpDown } from "lucide-react"
import { suppliersApi, type Supplier } from "@/lib/api"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { CountrySelect } from "@/components/ui/country-select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface SupplierFormData {
  name: string
  type: string
  ledgerType: string
  contactPerson: string
  phone: string
  email: string
  address: string
  country: string
  status: string
}

// Default countries list organized by regions
const DEFAULT_COUNTRIES = [
  // South Asia
  "Sri Lanka",
  "India",
  "Bangladesh",
  "Pakistan",
  "Maldives",
  "Nepal",
  "Bhutan",

  // Southeast Asia
  "Singapore",
  "Malaysia",
  "Thailand",
  "Indonesia",
  "Philippines",
  "Vietnam",
  "Myanmar",
  "Cambodia",
  "Laos",
  "Brunei",

  // East Asia
  "China",
  "Japan",
  "South Korea",
  "Taiwan",
  "Hong Kong",
  "Macau",

  // Middle East
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Jordan",
  "Lebanon",

  // Europe
  "United Kingdom",
  "Germany",
  "France",
  "Italy",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Austria",
  "Spain",
  "Portugal",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",

  // North America
  "United States",
  "Canada",
  "Mexico",

  // Oceania
  "Australia",
  "New Zealand",

  // Africa
  "South Africa",
  "Egypt",
  "Morocco",
  "Kenya",
  "Nigeria",

  // Others
  "Brazil",
  "Argentina",
  "Chile",
  "Russia",
  "Turkey"
]

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState<SupplierFormData>({
    name: "",
    type: "Local",
    ledgerType: "Expense",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    country: "Sri Lanka",
    status: "active",
  })

  // Load suppliers on component mount
  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const data = await suppliersApi.getAll<Supplier>()
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to load suppliers:", error)
      toast({
        title: "Error",
        description: "Failed to load suppliers. Please try again.",
        variant: "destructive",
      })
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  const validatePhoneNumber = (phone: string): boolean => {
    // Basic validation to ensure it contains numbers and allowed characters
    return /^[0-9+\s-]{6,20}$/.test(phone);
  }

  const handleCreateSupplier = async () => {
    try {
      // Validate phone number before submission
      if (!validatePhoneNumber(formData.phone)) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number (+94XXXXXXXXX or 0XXXXXXXXX)",
          variant: "destructive",
        });
        return;
      }

      await suppliersApi.create(formData)
      toast({
        title: "Success",
        description: "Supplier created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadSuppliers()
    } catch (error) {
      console.error("Failed to create supplier:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create supplier",
        variant: "destructive",
      })
    }
  }

  const handleEditSupplier = async () => {
    if (!editingSupplier) return

    try {
      // Validate phone number before submission
      if (!validatePhoneNumber(formData.phone)) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number (+94XXXXXXXXX or 0XXXXXXXXX)",
          variant: "destructive",
        });
        return;
      }

      await suppliersApi.update(editingSupplier.id, formData)
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      })
      setIsEditDialogOpen(false)
      setEditingSupplier(null)
      resetForm()
      loadSuppliers()
    } catch (error) {
      console.error("Failed to update supplier:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update supplier",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSupplier = async (supplier: Supplier) => {
    try {
      await suppliersApi.remove(supplier.id)
      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      })
      loadSuppliers()
    } catch (error) {
      console.error("Failed to delete supplier:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete supplier",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      type: supplier.type,
      ledgerType: supplier.ledgerType,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      country: supplier.country,
      status: supplier.status,
    })
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (supplier: Supplier) => {
    setViewSupplier(supplier)
    setIsViewDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Local",
      ledgerType: "Expense",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      country: "Sri Lanka",
      status: "active",
    })
  }

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.country.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getSupplierTypeIcon = (type: string) => {
    switch (type) {
      case "Foreign":
      case "International":
        return <Globe className="h-4 w-4" />
      case "Local":
      case "Domestic":
        return <Building2 className="h-4 w-4" />
      default:
        return <Factory className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Foreign":
      case "International":
        return <Badge variant="secondary">Foreign</Badge>
      case "Local":
      case "Domestic":
        return <Badge variant="outline">Local</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  // Calculate analytics
  const totalSuppliers = suppliers.length
  const foreignSuppliers = suppliers.filter((s) => s.type === "Foreign" || s.type === "International").length
  const uniqueCountries = new Set(suppliers.map((s) => s.country)).size
  const activeSuppliers = suppliers.filter((s) => s.status === "active").length
  const activityRate = totalSuppliers > 0 ? Math.round((activeSuppliers / totalSuppliers) * 100) : 0

  if (loading) {
    return (
      <ERPLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    )
  }

  return (
    <ERPLayout>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Supplier Management</h1>
            <p className="text-muted-foreground">Manage your suppliers and vendor relationships</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplierName">Supplier Name *</Label>
                    <Input
                      id="supplierName"
                      placeholder="Enter supplier name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplierType">Supplier Type *</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Local">Local</SelectItem>
                        <SelectItem value="Foreign">Foreign</SelectItem>
                        <SelectItem value="Domestic">Domestic</SelectItem>
                        <SelectItem value="International">International</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      placeholder="Enter contact person"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow numbers, +, spaces and hyphens
                        if (!/^[0-9+\s-]*$/.test(value)) return;
                        // Limit to max 20 characters
                        if (value.length > 20) return;
                        setFormData({ ...formData, phone: value });
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value && !validatePhoneNumber(value)) {
                          toast({
                            title: "Invalid Phone Number",
                            description: "Please enter a valid phone number",
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter phone number (minimum 6 digits)
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="supplier@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter full address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <CountrySelect
                      value={formData.country}
                      onValueChange={(v) => setFormData({ ...formData, country: v })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ledgerType">Account Type *</Label>
                    <div className="flex items-center justify-between p-3 border rounded-md bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${formData.ledgerType === 'Expense' ? 'text-red-600' : 'text-gray-400'}`}>
                          Expense Supplier
                        </span>
                        <Switch
                          id="ledgerType"
                          checked={formData.ledgerType === 'Trade'}
                          onCheckedChange={(checked) => setFormData({ ...formData, ledgerType: checked ? 'Trade' : 'Expense' })}
                        />
                        <span className={`text-sm font-medium ${formData.ledgerType === 'Trade' ? 'text-blue-600' : 'text-gray-400'}`}>
                          Trade Supplier
                        </span>
                      </div>
                      <Badge variant={formData.ledgerType === 'Expense' ? 'destructive' : 'default'}>
                        {formData.ledgerType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Toggle to select how this supplier's transactions will be categorized in accounting
                    </p>
                  </div>
                </div>

                <Button className="w-full" onClick={handleCreateSupplier}>
                  Create Supplier
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSuppliers}</div>
              <p className="text-xs text-muted-foreground">{activeSuppliers} active suppliers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Foreign Suppliers</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{foreignSuppliers}</div>
              <p className="text-xs text-muted-foreground">International partners</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Global Presence</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueCountries}</div>
              <p className="text-xs text-muted-foreground">Unique countries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activity Rate</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activityRate}%</div>
              <p className="text-xs text-muted-foreground">Active suppliers</p>
            </CardContent>
          </Card>
        </div>

        {/* Supplier List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              {/* <CardTitle>Supplier List</CardTitle> */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search suppliers..."
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
                  <TableHead>Supplier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-muted-foreground">ID: {supplier.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSupplierTypeIcon(supplier.type)}
                        {getTypeBadge(supplier.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.ledgerType}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">{supplier.contactPerson}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {supplier.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">{supplier.country}</div>
                        <div className="text-xs text-muted-foreground">{supplier.address}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openViewDialog(supplier)}>
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button variant="outline" size="sm" onClick={() => openEditDialog(supplier)}>
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
                                This action cannot be undone. This will permanently delete the Supplier.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteSupplier(supplier)}>Delete</AlertDialogAction>
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

        {/* Edit Supplier Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editSupplierName">Supplier Name *</Label>
                  <Input
                    id="editSupplierName"
                    placeholder="Enter supplier name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editSupplierType">Supplier Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Local">Local</SelectItem>
                      <SelectItem value="Foreign">Foreign</SelectItem>
                      <SelectItem value="Domestic">Domestic</SelectItem>
                      <SelectItem value="International">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editContactPerson">Contact Person *</Label>
                  <Input
                    id="editContactPerson"
                    placeholder="Enter contact person"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editPhone">Phone Number *</Label>
                  <Input
                    id="editPhone"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow numbers, +, spaces and hyphens
                      if (!/^[0-9+\s-]*$/.test(value)) return;
                      // Limit to max 20 characters
                      if (value.length > 20) return;
                      setFormData({ ...formData, phone: value });
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value && !validatePhoneNumber(value)) {
                        toast({
                          title: "Invalid Phone Number",
                          description: "Please enter a valid phone number",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter phone number (minimum 6 digits)
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="editEmail">Email Address *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  placeholder="supplier@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="editAddress">Address *</Label>
                <Textarea
                  id="editAddress"
                  placeholder="Enter full address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editCountry">Country *</Label>
                    <CountrySelect
                      value={formData.country}
                      onValueChange={(v) => setFormData({ ...formData, country: v })}
                    />
                </div>
                <div>
                  <Label htmlFor="editLedgerType">Account Type *</Label>
                  <div className="flex items-center justify-between p-3 border rounded-md bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${formData.ledgerType === 'Expense' ? 'text-red-600' : 'text-gray-400'}`}>
                        Expense Supplier
                      </span>
                      <Switch
                        id="editLedgerType"
                        checked={formData.ledgerType === 'Trade'}
                        onCheckedChange={(checked) => setFormData({ ...formData, ledgerType: checked ? 'Trade' : 'Expense' })}
                      />
                      <span className={`text-sm font-medium ${formData.ledgerType === 'Trade' ? 'text-blue-600' : 'text-gray-400'}`}>
                        Trade Supplier
                      </span>
                    </div>
                    <Badge variant={formData.ledgerType === 'Expense' ? 'destructive' : 'default'}>
                      {formData.ledgerType}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Toggle to select how this supplier's transactions will be categorized in accounting
                  </p>
                </div>
              </div>

              <Button className="w-full" onClick={handleEditSupplier}>
                Update Supplier
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Supplier Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Supplier Details</DialogTitle>
            </DialogHeader>
            {viewSupplier && (
              <div className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm">{viewSupplier.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Type:</span>
                    {getTypeBadge(viewSupplier.type)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Ledger Type:</span>
                    <Badge variant={viewSupplier.ledgerType === 'Expense' ? 'destructive' : 'default'}>
                      {viewSupplier.ledgerType}
                    </Badge>
                  </div>
                  {/* <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  {getStatusBadge(viewSupplier.status)}
                </div> */}
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* Contact Information */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Contact Person:</span>
                    <span className="text-sm">{viewSupplier.contactPerson}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Phone:</span>
                    <span className="text-sm">{viewSupplier.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">{viewSupplier.email}</span>
                  </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* Location Information */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Country:</span>
                    <span className="text-sm">{viewSupplier.country}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Address:</span>
                    <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">{viewSupplier.address}</p>
                  </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* Additional Information */}
                {/* <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Supplier ID:</span>
                  <span className="text-sm">{viewSupplier.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Created:</span>
                  <span className="text-sm">
                    {viewSupplier.createdAt ? new Date(viewSupplier.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Updated:</span>
                  <span className="text-sm">
                    {viewSupplier.updatedAt ? new Date(viewSupplier.updatedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div> */}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
