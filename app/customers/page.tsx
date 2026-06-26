"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ERPLayout } from "@/components/layouts/erp-layout"
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
import toastr from "@/lib/toastr"
import {
  Plus,
  Search,
  MoreHorizontal,
  Users,
  Building2,
  User,
  ShoppingCart,
  Edit,
  Trash2,
  Eye,
  CreditCard,
  History,
  Divide,
  MapPin,
  Clock,
  Percent,
} from "lucide-react"
import { customersApi, routesApi, categoriesApi, type Customer, type Category } from "@/lib/api"
import { Checkbox } from "@/components/ui/checkbox"
import { CustomerSelect } from "@/components/customer/customer-select"

interface Route {
  id: number
  routeName: string
  city: string
  description: string
  status: string
}

interface CustomerFormData {
  name: string
  type: string
  parentId: number | null
  address: string
  contactPerson: string
  contactNumber: string
  contactNumber2: string
  email: string
  creditLimit: number
  creditPeriod: number
  discountRate: number
  status: string
  routeId: number | null
  isTaxInclusive: boolean
  taxNumber: string
  latitude: string
  longitude: string
  paymentMethod: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [routeFilter, setRouteFilter] = useState<string>("all")
  const [parentFilter, setParentFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    type: "Supermarket",
    parentId: null,
    address: "",
    contactPerson: "",
    contactNumber: "",
    contactNumber2: "",
    email: "",
    creditLimit: 0,
    creditPeriod: 30,
    discountRate: 0,
    status: "active",
    routeId: null,
    isTaxInclusive: false,
    taxNumber: "",
    latitude: "",
    longitude: "",
    paymentMethod: "Cash on delivery",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Category Wise Discount states
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false)
  const [selectedCustomerForDiscount, setSelectedCustomerForDiscount] = useState<Customer | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [customerCategoryDiscounts, setCustomerCategoryDiscounts] = useState<{ categoryId: number, discountPercentage: number }[]>([])

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Load customers on component mount
  useEffect(() => {
    loadCustomers()
    loadRoutes()
    loadCategories()
  }, [])

  // Keyboard shortcuts for filters
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault?.()
              ; (document.querySelector('input[placeholder*="Search"]') as HTMLInputElement)?.focus()
            break
          case 'r':
            e.preventDefault?.()
            // Reset all filters
            setSearchTerm("")
            setTypeFilter("all")
            setStatusFilter("all")
            setRouteFilter("all")
            setParentFilter("all")
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])

  const loadRoutes = async () => {
    try {
      const data = await routesApi.getAll<Route>()
      setRoutes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to load routes:", error)
      setRoutes([])
    }
  }

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll<Category>()
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to load categories:", error)
      setCategories([])
    }
  }

  const handleParentCustomerChange = (parentId: number | null) => {
    setFormData(prev => ({ ...prev, parentId }))

    // Auto-populate fields from parent customer
    if (parentId) {
      const parentCustomer = customers.find(c => c.id === parentId)
      if (parentCustomer) {
        setFormData(prev => ({
          ...prev,
          email: parentCustomer.email,
          contactPerson: parentCustomer.contactPerson,
          contactNumber: parentCustomer.contactNumber,
          contactNumber2: (parentCustomer as any).contactNumber2 || "",
          creditLimit: (parentCustomer as any).creditLimit || 0,
          paymentMethod: "Cash on delivery",
          creditPeriod: (parentCustomer as any).creditPeriod || 30,
        }))
      }
    } else {
      setFormData({
        ...formData,
        contactPerson: "",
        contactNumber: "",
        contactNumber2: "",
        email: "",
        creditLimit: 0,
        paymentMethod: "Cash on delivery",
        creditPeriod: 30,
      })
    }
  }

  const validateForm = async (isEdit = false) => {
    const errors: Record<string, string> = {}

    // Required field validations
    if (!formData.name.trim()) {
      errors.name = "Customer name is required"
    }

    if (!formData.address.trim()) {
      errors.address = "Address is required"
    }
    if (!formData.contactNumber.trim()) {
      errors.contactNumber = "Contact number is required"
    } else if (!/^[\+]?[0-9\s\-\(\)]{8,20}$/.test(formData.contactNumber)) {
      errors.contactNumber = "Please enter a valid contact number"
    }

    if (formData.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Please enter a valid email address"
      }
    }

    if (formData.type !== "Walk-in" && formData.type !== "Walking") {
      if (!formData.contactPerson.trim()) {
        errors.contactPerson = "Contact person is required"
      }

      if (formData.creditLimit < 0) {
        errors.creditLimit = "Credit limit cannot be negative"
      }

      if (formData.creditPeriod < 0) {
        errors.creditPeriod = "Credit period cannot be negative"
      } else if (formData.creditPeriod > 365) {
        errors.creditPeriod = "Credit period cannot exceed 365 days"
      }
    }

    // Tax number validation if tax inclusive is enabled
    if (formData.isTaxInclusive) {
      if (!formData.taxNumber.trim()) {
        errors.taxNumber = "Tax number is required when tax inclusive is enabled"
      }
    }

    // Uniqueness validation checks
    if (formData.name.trim()) {
      const nameError = await validateCustomerName(formData.name)
      if (nameError) errors.name = nameError
    }

    if (formData.email.trim()) {
      const emailError = await validateCustomerEmail(formData.email)
      if (emailError) errors.email = emailError
    }

    if (formData.contactNumber.trim()) {
      const contactError = await validateCustomerContactNumber(formData.contactNumber)
      if (contactError) errors.contactNumber = contactError
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const clearFieldError = (fieldName: string) => {
    if (formErrors[fieldName]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  // Validation functions for uniqueness checks
  const validateCustomerName = async (name: string) => {
    if (!name.trim()) return ''

    const existingCustomer = customers.find(
      customer => customer.name.toLowerCase() === name.toLowerCase() &&
        (!editingCustomer || customer.id !== editingCustomer.id)
    )

    return existingCustomer ? 'A customer with this name already exists' : ''
  }

  const validateCustomerEmail = async (email: string) => {
    if (!email.trim()) return ''

    // const existingCustomer = customers.find(
    //   customer => customer.email.toLowerCase() === email.toLowerCase() &&
    //     (!editingCustomer || customer.id !== editingCustomer.id)
    // )

    return false ? 'A customer with this email already exists' : ''
  }

  const validateCustomerContactNumber = async (contactNumber: string) => {
    if (!contactNumber.trim()) return ''

    // Normalize contact numbers for comparison (remove spaces, dashes, etc.)
    const normalizeNumber = (num: string) => num.replace(/[\s\-\(\)]/g, '')
    const normalizedInput = normalizeNumber(contactNumber)

    // const existingCustomer = customers.find(
    //   customer => normalizeNumber(customer.contactNumber) === normalizedInput &&
    //     (!editingCustomer || customer.id !== editingCustomer.id)
    // )

    return false ? 'A customer with this contact number already exists' : ''
  }

  const handleFormDataChange = async (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear existing form errors for this field
    clearFieldError(field)

    // Perform real-time validation for uniqueness
    let validationError = ''

    if (field === 'name') {
      validationError = await validateCustomerName(value)
    } else if (field === 'email') {
      validationError = await validateCustomerEmail(value)
    } else if (field === 'contactNumber') {
      validationError = await validateCustomerContactNumber(value)
    }

    setValidationErrors(prev => ({
      ...prev,
      [field]: validationError
    }))
  }

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const data = await customersApi.getAll<Customer>()
      setCustomers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to load customers:", error)
      toastr.error("Failed to load customers. Please try again.")
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomer = async () => {
    const isValid = await validateForm(false)
    if (!isValid) {
      return
    }

    try {
      const payload = {
        ...formData,
        creditLimit: Number(formData.creditLimit),
        creditPeriod: Number(formData.creditPeriod),
        parentId: formData.parentId || null,
        latitude: formData.latitude.trim() !== "" && !isNaN(Number(formData.latitude)) ? Number(formData.latitude) : null,
        longitude: formData.longitude.trim() !== "" && !isNaN(Number(formData.longitude)) ? Number(formData.longitude) : null,
      }

      await customersApi.create(payload)
      toastr.success("Customer created successfully")
      setIsCreateDialogOpen(false)
      resetForm()
      loadCustomers()
    } catch (error) {
      console.error("Failed to create customer:", error)
      toastr.error(error instanceof Error ? error.message : "Failed to create customer")
    }
  }

  const handleEditCustomer = async () => {
    if (!editingCustomer) return

    const isValid = await validateForm(true)
    if (!isValid) {
      return
    }

    try {
      // Build the basic update payload
      const payload: any = {
        name: formData.name,
        email: formData.email,
        contactNumber: formData.contactNumber,
        contactNumber2: formData.contactNumber2,
        address: formData.address,
        isTaxInclusive: formData.isTaxInclusive,
        taxNumber: formData.taxNumber || "",
        discountRate: formData.discountRate,
        latitude: formData.latitude.trim() !== "" && !isNaN(Number(formData.latitude)) ? Number(formData.latitude) : null,
        longitude: formData.longitude.trim() !== "" && !isNaN(Number(formData.longitude)) ? Number(formData.longitude) : null,
      }

      // Add optional fields for non-walk-in customers
      if (formData.type !== "Walking") {
        payload.contactPerson = formData.contactPerson
        payload.creditLimit = Number(formData.creditLimit)
        payload.creditPeriod = Number(formData.creditPeriod)
        payload.parentId = formData.parentId || null
        payload.routeId = formData.routeId || null
      }

      // Make the PUT request to update customer
      await customersApi.update(editingCustomer.id, payload)
      toastr.success("Customer information updated successfully")
      setIsEditDialogOpen(false)
      setEditingCustomer(null)
      resetForm()
      loadCustomers()
    } catch (error) {
      console.error("Failed to update customer:", error)
      toastr.error(error instanceof Error ? error.message : "Failed to update customer")
    }
  }

  const handleDeleteCustomer = async (customer: Customer) => {
    try {
      await customersApi.remove(customer.id)
      toastr.success("Customer deleted successfully")
      loadCustomers()
    } catch (error) {
      console.error("Failed to delete customer:", error)
      toastr.error(error instanceof Error ? error.message : "Failed to delete customer")
    }
  }

  const openViewDialog = (customer: Customer) => {
    setViewCustomer(customer)
    setIsViewDialogOpen(true)
  }
  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      type: customer.type,
      parentId: customer.parentId,
      address: customer.address,
      contactPerson: customer.contactPerson,
      contactNumber: customer.contactNumber,
      contactNumber2: (customer as any).contactNumber2 || "",
      email: customer.email,
      creditLimit: (customer as any).creditLimit || 0,
      paymentMethod: (customer as any).paymentMethod || "Cash on delivery",
      creditPeriod: (customer as any).creditPeriod || 30,
      discountRate: (customer as any).discountRate || 0,
      status: customer.status,
      routeId: (customer as any).routes.length > 0 ? (customer as any).routes[0].id : null,
      isTaxInclusive: (customer as any).isTaxInclusive || false,
      taxNumber: (customer as any).taxNumber || "",
      latitude: customer.latitude?.toString() || "",
      longitude: customer.longitude?.toString() || "",
    })
    setFormErrors({})
    setValidationErrors({})
    setIsEditDialogOpen(true)
  }

  const openDiscountDialog = async (customer: Customer) => {
    setSelectedCustomerForDiscount(customer)
    setIsDiscountDialogOpen(true)
    try {
      const discounts = await customersApi.getCategoryDiscounts(customer.id)
      setCustomerCategoryDiscounts(discounts || [])
    } catch (error) {
      console.error("Failed to load category discounts:", error)
      setCustomerCategoryDiscounts([])
    }
  }

  const handleUpdateCategoryDiscounts = async () => {
    if (!selectedCustomerForDiscount) return

    try {
      await customersApi.updateCategoryDiscounts(selectedCustomerForDiscount.id, customerCategoryDiscounts)
      toastr.success("Category discounts updated successfully")
      setIsDiscountDialogOpen(false)
    } catch (error) {
      console.error("Failed to update category discounts:", error)
      toastr.error("Failed to update category discounts")
    }
  }

  const updateDiscountPercentage = (categoryId: number, percentage: string) => {
    const value = parseFloat(percentage) || 0
    setCustomerCategoryDiscounts(prev => {
      const existing = prev.find(d => d.categoryId === categoryId)
      if (existing) {
        return prev.map(d => d.categoryId === categoryId ? { ...d, discountPercentage: value } : d)
      } else {
        return [...prev, { categoryId, discountPercentage: value }]
      }
    })
  }

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Supermarket",
      parentId: null,
      address: "",
      contactPerson: "",
      contactNumber: "",
      contactNumber2: "",
      email: "",
      creditLimit: 0,
      paymentMethod: "Cash on delivery",
      creditPeriod: 30,
      discountRate: 0,
      status: "active",
      routeId: null,
      isTaxInclusive: false,
      taxNumber: "",
      latitude: "",
      longitude: "",
    })
    setFormErrors({})
    setValidationErrors({})
  }

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      // Text search filter
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contactNumber?.includes(searchTerm) ||
        (customer as any).contactNumber2?.includes(searchTerm)

      // Type filter
      const matchesType = typeFilter === "all" || customer.type === typeFilter

      // Status filter
      const matchesStatus = statusFilter === "all" || customer.status === statusFilter

      // Route filter
      const matchesRoute =
        routeFilter === "all" ||
        (routeFilter === "no-route" && !(customer as any).routes?.length) ||
        (routeFilter === "has-route" && (customer as any).routes?.length > 0) ||
        ((customer as any).routes?.some((route: any) => route.id.toString() === routeFilter))

      // Parent filter
      const matchesParent =
        parentFilter === "all" ||
        (parentFilter === "main" && !customer.parentId) ||
        (parentFilter === "branch" && customer.parentId) ||
        (customer.parentId?.toString() === parentFilter)

      return matchesSearch && matchesType && matchesStatus && matchesRoute && matchesParent
    })
  }, [customers, searchTerm, typeFilter, statusFilter, routeFilter, parentFilter])

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredCustomers.slice(startIndex, endIndex)
  }, [filteredCustomers, currentPage, itemsPerPage])

  const getTotalPages = useMemo(() => {
    return Math.ceil(filteredCustomers.length / itemsPerPage)
  }, [filteredCustomers.length, itemsPerPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1)
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, typeFilter, statusFilter, routeFilter, parentFilter])

  // Pagination Component
  const PaginationControls = () => {
    const totalPages = getTotalPages

    if (totalPages <= 1) return null

    const getVisiblePages = () => {
      const delta = 2
      const range = []
      const rangeWithDots = []

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i)
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...')
      } else {
        rangeWithDots.push(1)
      }

      rangeWithDots.push(...range)

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages)
      } else {
        rangeWithDots.push(totalPages)
      }

      return rangeWithDots
    }

    return (
      <div className="flex items-center justify-between py-2 gap-2 text-xs">
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-700">Show</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-16 h-6 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-gray-700">entries</span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredCustomers.length)} / {filteredCustomers.length}
          </span>
        </div>

        <div className="flex items-center space-x-0.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="h-6 w-6 p-0 text-xs"
          >
            {'<<'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-6 w-6 p-0 text-xs"
          >
            {'<'}
          </Button>

          {getVisiblePages().map((page, index) => (
            <Button
              key={index}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => typeof page === 'number' && handlePageChange(page)}
              disabled={typeof page !== 'number'}
              className="h-6 w-6 p-0 text-xs"
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-6 w-6 p-0 text-xs"
          >
            {'>'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="h-6 w-6 p-0 text-xs"
          >
            {'>>'}
          </Button>
        </div>
      </div>
    )
  }

  const getCustomerTypeIcon = (type: string) => {
    switch (type) {
      case "Supermarket":
        return <Building2 className="h-4 w-4" />
      case "Wholesaler":
      case "Distributor":
        return <ShoppingCart className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getParentCustomers = () => {
    return customers.filter((customer) => customer.parentId === null)
  }

  // Calculate analytics (use filtered data for more relevant stats)
  const totalCustomers = customers.length
  const filteredTotalCustomers = filteredCustomers.length
  const supermarkets = filteredCustomers.filter((c) => c.type === "Supermarket").length
  const activeCustomers = filteredCustomers.filter((c) => c.status === "active").length
  const branchCustomers = filteredCustomers.filter((c) => c.parentId !== null).length

  if (loading) {
    return (
      <ERPLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-64 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-6 w-12 bg-gray-200 rounded animate-pulse mb-0.5" />
                  <div className="h-2 w-16 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
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
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Customer Management</h1>
            <p className="text-xs text-muted-foreground">Manage your customers and their information</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">Add New Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-1.5">
                  {/* <Label htmlFor="customerType">Customer Type *</Label> */}
                  <div className="flex flex-wrap gap-4 mt-0.5 text-xs">
                    {[
                      "Supermarket",
                      "Wholesaler",
                      "Distributor",
                      "Own Shop",
                      "Walk-in"
                    ].map((type) => (
                      <label key={type} className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="customerType"
                          value={type}
                          checked={formData.type === type}
                          onChange={() => setFormData({ ...formData, type })}
                          className="accent-primary"
                        />
                        <span>{type === "Walk-in" ? "Walk-in Customer" : type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <hr className="my-2" />
                <div className={"grid gap-3" + (formData.type === "Walk-in" ? " grid-cols-1" : " grid-cols-2")}>
                  <div>
                    <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      placeholder="Enter customer full name"
                      value={formData.name}
                      onChange={(e) => handleFormDataChange('name', e.target.value)}
                      className={formErrors.name || validationErrors.name ? "border-red-500" : ""}
                    />
                    {(formErrors.name || validationErrors.name) && (
                      <div className="text-xs text-red-600 mt-1">{formErrors.name || validationErrors.name}</div>
                    )}
                  </div>
                  {formData.type !== "Walk-in" && (
                    <div>
                      <Label htmlFor="parentCustomer">Parent Customer (for branches)</Label>
                      <CustomerSelect
                        customers={getParentCustomers()}
                        value={formData.parentId || 0}
                        onValueChange={(id) => handleParentCustomerChange(id === 0 ? null : id)}
                        placeholder="Select parent customer (optional)"
                      />
                    </div>
                  )}
                </div>
                <div className={"grid gap-3" + (formData.type === "Walk-in" ? " grid-cols-2" : " grid-cols-3")}>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="customer@example.com"
                      value={formData.email}
                      onChange={(e) => handleFormDataChange('email', e.target.value)}
                      className={formErrors.email || validationErrors.email ? "border-red-500" : ""}
                    />
                    {(formErrors.email || validationErrors.email) && (
                      <div className="text-xs text-red-600 mt-1">{formErrors.email || validationErrors.email}</div>
                    )}
                  </div>

                  {formData.type !== "Walk-in" && (
                    <div>
                      <Label htmlFor="contactPerson">Contact Person <span className="text-red-500">*</span></Label>
                      <Input
                        id="contactPerson"
                        placeholder="Enter contact person"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        className={formErrors.contactPerson ? "border-red-500" : ""}
                      />
                      {formErrors.contactPerson && (
                        <div className="text-xs text-red-600 mt-1">{formErrors.contactPerson}</div>
                      )}
                    </div>
                  )}
                  <div>
                    <Label htmlFor="contactNumber">Contact Number <span className="text-red-500">*</span></Label>
                    <Input
                      id="contactNumber"
                      placeholder="+94 XX XXX XXXX"
                      value={formData.contactNumber}
                      onChange={(e) => handleFormDataChange('contactNumber', e.target.value)}
                      className={formErrors.contactNumber || validationErrors.contactNumber ? "border-red-500" : ""}
                    />
                    {(formErrors.contactNumber || validationErrors.contactNumber) && (
                      <div className="text-xs text-red-600 mt-1">{formErrors.contactNumber || validationErrors.contactNumber}</div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="contactNumber2">Contact Number 2</Label>
                    <Input
                      id="contactNumber2"
                      placeholder="+94 XX XXX XXXX"
                      value={formData.contactNumber2}
                      onChange={(e) => handleFormDataChange('contactNumber2', e.target.value)}
                    />
                  </div>

                </div>
                {formData.type !== "Walk-in" && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="route">Assigned Route</Label>
                      <Select
                        value={formData.routeId?.toString() || "none"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, routeId: value === "none" ? null : Number(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select delivery route (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Route Assigned</SelectItem>
                          {routes
                            .filter(route => route.status === "active")
                            .map((route) => (
                              <SelectItem key={route.id} value={route.id.toString()}>
                                {route.routeName} - {route.city}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="creditLimit">Credit Limit (LKR) <span className="text-red-500">*</span></Label>
                      <Input
                        id="creditLimit"
                        type="number"
                        placeholder="0.00"
                        value={formData.creditLimit}
                        onChange={(e) => {
                          setFormData({ ...formData, creditLimit: Number(e.target.value) })
                          clearFieldError('creditLimit')
                        }}
                        className={formErrors.creditLimit ? "border-red-500" : ""}
                      />
                      {formErrors.creditLimit && (
                        <div className="text-xs text-red-600 mt-1">{formErrors.creditLimit}</div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.paymentMethod}
                        onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                      >
                        <SelectTrigger className={formErrors.paymentMethod ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select Payment Method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash on delivery">Cash on delivery</SelectItem>
                          <SelectItem value="Bill to bill">Bill to bill</SelectItem>
                          <SelectItem value="One month credit">One month credit</SelectItem>
                          <SelectItem value="14 days credit">14 days credit</SelectItem>
                          <SelectItem value="7 days credit">7 days credit</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.paymentMethod && (
                        <div className="text-xs text-red-600 mt-1">{formErrors.paymentMethod}</div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="creditPeriod">Credit Period (Days) <span className="text-red-500">*</span></Label>
                      <Input
                        id="creditPeriod"
                        type="number"
                        placeholder="30"
                        value={formData.creditPeriod}
                        onChange={(e) => {
                          setFormData({ ...formData, creditPeriod: Number(e.target.value) })
                          clearFieldError('creditPeriod')
                        }}
                        className={formErrors.creditPeriod ? "border-red-500" : ""}
                      />
                      {formErrors.creditPeriod && (
                        <div className="text-xs text-red-600 mt-1">{formErrors.creditPeriod}</div>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="address"
                    placeholder="Enter full address"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value })
                      clearFieldError('address')
                    }}
                    className={formErrors.address ? "border-red-500" : ""}
                  />
                  {formErrors.address && (
                    <div className="text-xs text-red-600 mt-1">{formErrors.address}</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      placeholder="e.g. 6.9271"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      placeholder="e.g. 79.8612"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* <div>
                    <Label htmlFor="discountRate">Discount Rate (%)</Label>
                    <Input
                      id="discountRate"
                      type="number"
                      placeholder="0"
                      value={formData.discountRate}
                      onChange={(e) => setFormData({ ...formData, discountRate: Number(e.target.value) })}
                      className={formErrors.discountRate ? "border-red-500" : ""}
                    />
                    {formErrors.discountRate && (
                      <div className="text-xs text-red-600 mt-1">{formErrors.discountRate}</div>
                    )}
                  </div> */}
                  <div className="grid grid-rows-2">
                    <div className="flex items-center space-x-2 mt-8">
                      <Checkbox
                        id="isTaxInclusive"
                        checked={formData.isTaxInclusive}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isTaxInclusive: checked as boolean })
                        }
                      />
                      <Label htmlFor="isTaxInclusive" className="text-sm">Is Tax Inclusive</Label>
                    </div>
                    {formData.isTaxInclusive && (
                      <div>
                        <Label htmlFor="taxNumber">Tax Number <span className="text-red-500">*</span></Label>
                        <Input
                          id="taxNumber"
                          placeholder="Enter tax number"
                          value={formData.taxNumber}
                          onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                          className={formErrors.taxNumber ? "border-red-500" : ""}
                        />
                        {formErrors.taxNumber && (
                          <div className="text-xs text-red-600 mt-1">{formErrors.taxNumber}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <div className="grid grid-cols-3 gap-3 space-y-0">
                    <div className="flex items-center space-x-2">
                      {/* <Checkbox
                      id="status"
                      checked={formData.status === "active"}
                      onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? "active" : "inactive" })}
                    />
                    <Label htmlFor="status">Active</Label> */}
                    </div>
                    <Button variant="outline" size="sm" onClick={resetForm}>
                      Clear
                    </Button>
                    <Button size="sm"
                      className="w-full"
                      onClick={handleCreateCustomer}
                      disabled={Object.keys(validationErrors).some(key => validationErrors[key]) || !formData.name.trim() || !formData.contactNumber.trim()}
                    >
                      Create Customer
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        {/* <div className="grid gap-4 md:grid-cols-4">
        <Card className="h-20 flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredTotalCustomers !== totalCustomers ? (
                <span>{filteredTotalCustomers} <span className="text-sm text-muted-foreground">/ {totalCustomers}</span></span>
              ) : (
                totalCustomers
              )}
            </div>
            <p className="text-xs text-muted-foreground">{activeCustomers} active customers</p>
          </CardContent>
        </Card>

        <Card className="h-20 flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supermarkets</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supermarkets}</div>
            <p className="text-xs text-muted-foreground">In current filter</p>
          </CardContent>
        </Card>

        <Card className="h-20 flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Branch Customers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branchCustomers}</div>
            <p className="text-xs text-muted-foreground">Branch locations</p>
          </CardContent>
        </Card>

        <Card className="h-20 flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCustomers.length > 0 ? (totalDeliveryTime / filteredCustomers.length).toFixed(1) : 0}h
            </div>
            <p className="text-xs text-muted-foreground">Average delivery</p>
          </CardContent>
        </Card>
      </div> */}

        {/* Customer List */}
        <Card className="mt-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* <CardTitle>Customer List</CardTitle> */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search... (Ctrl+K)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-48 h-8 text-xs"
                  />
                </div>

                {/* Filter Options */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="Filter by Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Supermarket">Supermarket</SelectItem>
                    <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                    <SelectItem value="Distributor">Distributor</SelectItem>
                    <SelectItem value="Own Shop">Own Shop</SelectItem>
                    <SelectItem value="Walking">Walk-in</SelectItem>
                  </SelectContent>
                </Select>

                {/* <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select> */}

                <Select value={routeFilter} onValueChange={setRouteFilter}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="Filter by Route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    <SelectItem value="has-route">Has Route</SelectItem>
                    <SelectItem value="no-route">No Route</SelectItem>
                    {routes
                      .filter(route => route.status === "active")
                      .map((route) => (
                        <SelectItem key={route.id} value={route.id.toString()}>
                          {route.routeName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Select value={parentFilter} onValueChange={setParentFilter}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="Filter by Parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="main">Main Customers</SelectItem>
                    <SelectItem value="branch">Branch Customers</SelectItem>
                    {getParentCustomers().map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear Filters Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 whitespace-nowrap"
                  onClick={() => {
                    setSearchTerm("")
                    setTypeFilter("all")
                    setStatusFilter("all")
                    setRouteFilter("all")
                    setParentFilter("all")
                  }}
                  title="Clear all filters (Ctrl+R)"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Filter Summary */}
          <div className="px-6 pb-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  Showing {filteredCustomers.length} of {customers.length} customers
                </span>

                {/* Active Filters Display */}
                {(searchTerm || typeFilter !== "all" || statusFilter !== "all" || routeFilter !== "all" || parentFilter !== "all") && (
                  <div className="flex items-center gap-2">
                    <span>Filters:</span>
                    {searchTerm && (
                      <Badge variant="secondary" className="text-xs">
                        Search: "{searchTerm}"
                      </Badge>
                    )}
                    {typeFilter !== "all" && (
                      <Badge variant="secondary" className="text-xs">
                        Type: {typeFilter}
                      </Badge>
                    )}
                    {statusFilter !== "all" && (
                      <Badge variant="secondary" className="text-xs">
                        Status: {statusFilter}
                      </Badge>
                    )}
                    {routeFilter !== "all" && (
                      <Badge variant="secondary" className="text-xs">
                        Route: {routeFilter === "has-route" ? "Has Route" : routeFilter === "no-route" ? "No Route" : routes.find(r => r.id.toString() === routeFilter)?.routeName || routeFilter}
                      </Badge>
                    )}
                    {parentFilter !== "all" && (
                      <Badge variant="secondary" className="text-xs">
                        Parent: {parentFilter === "main" ? "Main Customers" : parentFilter === "branch" ? "Branch Customers" : customers.find(c => c.id.toString() === parentFilter)?.name || parentFilter}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {filteredCustomers.length === 0 && customers.length > 0 && (
                <span className="text-xs text-amber-600">No customers match the current filters</span>
              )}
            </div>
          </div>

          <CardContent>
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs py-2">Customer</TableHead>
                  <TableHead className="text-xs py-2">Type</TableHead>
                  <TableHead className="text-xs py-2">Parent</TableHead>
                  <TableHead className="text-xs py-2">Route</TableHead>
                  <TableHead className="text-xs py-2">Contact</TableHead>
                  <TableHead className="text-xs py-2">Email</TableHead>
                  <TableHead className="text-xs py-2">Location</TableHead>
                  {/* <TableHead>Delivery Time</TableHead> */}
                  {/* <TableHead>Status</TableHead> */}
                  <TableHead className="text-xs py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => (
                  <TableRow key={customer.id} className="text-xs">
                    <TableCell className="py-2">
                      <div>
                        <div className="font-medium text-xs">{customer.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {customer.id}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        {getCustomerTypeIcon(customer.type)}
                        <span className="text-xs">{customer.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {customer.parentId ? (
                        <div className="text-xs">
                          {customers.find((c) => c.id === customer.parentId)?.name || `Parent ID: ${customer.parentId}`}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs py-0.5">Main</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {(customer as any).routes.length > 0 ? (
                        <div className="text-xs">
                          {(() => {
                            const route = routes.find((r) => r.id === (customer as any).routes[0].id)
                            return route ? (
                              <div>
                                <div className="font-medium text-xs">{route.routeName}</div>
                                <div className="text-xs text-muted-foreground">{route.city}</div>
                              </div>
                            ) : `Route ID: ${(customer as any).routeId}`
                          })()}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs py-0.5">None</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="text-xs">
                        <div className="text-xs">{customer.contactPerson}</div>
                        <div className="text-xs text-muted-foreground">{customer.contactNumber}</div>
                        {/* <div className="text-xs text-muted-foreground">{customer.email}</div> */}
                      </div>
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell className="py-2">
                      {customer.latitude && customer.longitude ? (
                        <div className="text-xs">
                          {/* <div>Lat: {customer.latitude}</div>
                          <div>Lng: {customer.longitude}</div> */}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${customer.latitude},${customer.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            <MapPin className="h-3 w-3 inline text-primary" /> Map Link
                          </a>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not Set</span>
                      )}
                    </TableCell>
                    {/* <TableCell>{customer.deliveryTime} h</TableCell> */}
                    {/* <TableCell>{getStatusBadge(customer.status)}</TableCell> */}
                    <TableCell className="py-2">
                      <div className="flex items-center space-x-1">
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openViewDialog(customer)}>
                          <Eye className="h-3 w-3" />
                        </Button>

                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(customer)}>
                          <Edit className="h-3 w-3" />
                        </Button>

                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openDiscountDialog(customer)} title="Set Category Discounts">
                          <Percent className="h-3 w-3" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-red-500">Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the Customer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => handleDeleteCustomer(customer)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls />
          </CardContent>
        </Card>

        {/* View Customer Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={() => setIsViewDialogOpen(false)}>
          <DialogContent className="max-w-5xl p-0">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4">
              <DialogHeader>
                <DialogTitle className="mb-1 text-lg font-bold text-primary">Customer Details</DialogTitle>
              </DialogHeader>
              {viewCustomer && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  {/* Left Section: Details */}
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-xs">
                    <div>
                      <div className="text-xs text-muted-foreground">Name</div>
                      <div className="font-semibold text-base">{viewCustomer.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Type</div>
                      <div className="font-semibold text-base">{viewCustomer.type === "Walk-in" ? "Walk-in Customer" : viewCustomer.type}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Parent</div>
                      <div className="font-semibold text-base">
                        {viewCustomer.parentId ?
                          (customers.find((c) => c.id === viewCustomer.parentId)?.name || `Parent ID: ${viewCustomer.parentId}`)
                          : "Main Customer"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Assigned Route</div>
                      <div className="font-semibold text-base">
                        {(viewCustomer as any).routeId ? (
                          (() => {
                            const route = routes.find((r) => r.id === (viewCustomer as any).routeId)
                            return route ? `${route.routeName} - ${route.city}` : `Route ID: ${(viewCustomer as any).routeId}`
                          })()
                        ) : "No Route Assigned"}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-muted-foreground">Address</div>
                      <div className="font-semibold text-base">{viewCustomer.address}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Contact Person</div>
                      <div className="font-semibold text-base">{viewCustomer.contactPerson}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Contact Number</div>
                      <div className="font-semibold text-base">{viewCustomer.contactNumber}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Contact Number 2</div>
                      <div className="font-semibold text-base">{(viewCustomer as any).contactNumber2 || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Email</div>
                      <div className="font-semibold text-base">{viewCustomer.email}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Credit Limit</div>
                      <div className="font-semibold text-base">LKR {((viewCustomer as any).creditLimit || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Credit Period</div>
                      <div className="font-semibold text-base">{(viewCustomer as any).creditPeriod || 30} days</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Payment Method</div>
                      <div className="font-semibold text-base">{(viewCustomer as any).paymentMethod || "Cash on delivery"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Tax Inclusive</div>
                      <div className="font-semibold text-base">
                        {(viewCustomer as any).isTaxInclusive ? "Yes" : "No"}
                      </div>
                    </div>
                    {(viewCustomer as any).isTaxInclusive && (
                      <div>
                        <div className="text-xs text-muted-foreground">Tax Number</div>
                        <div className="font-semibold text-base">{(viewCustomer as any).taxNumber || "N/A"}</div>
                      </div>
                    )}
                  </div>

                  {/* Right Section: Embedded Google Maps */}
                  <div className="md:col-span-1 flex flex-col justify-start mt-2">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">Customer Location</div>
                    {viewCustomer.latitude && viewCustomer.longitude ? (
                      <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                        <iframe
                          title="Customer Location Map"
                          src={`https://maps.google.com/maps?q=${viewCustomer.latitude},${viewCustomer.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                          width="100%"
                          height="280"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                        ></iframe>
                        <div className="p-2 bg-zinc-50 dark:bg-zinc-800 text-[10px] text-muted-foreground flex justify-between items-center">
                          <span>
                            {viewCustomer.latitude}, {viewCustomer.longitude}
                          </span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${viewCustomer.latitude},${viewCustomer.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-semibold"
                          >
                            Open in Google Maps
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[280px] rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center p-4 text-center bg-zinc-50 dark:bg-zinc-800/50">
                        <MapPin className="h-8 w-8 text-zinc-400 mb-2" />
                        <span className="text-xs font-medium text-zinc-500">No Location Coordinates Set</span>
                        <span className="text-[10px] text-zinc-400 mt-1">Edit customer info to add latitude and longitude.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Customer Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Edit Customer</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Update customer information, contact details, and optionally change login credentials.
              </p>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1 text-xs">
                <input
                  type="radio"
                  name="editCustomerType"
                  value={formData.type === "Walking" ? "Walk-in Customer" : formData.type}
                  disabled
                  checked={true}
                  className="accent-primary"
                />
                <span className="text-xs"> {formData.type === "Walking" ? "Walk-in Customer" : formData.type}</span>
              </div>
              {/* <div className="font-semibold text-base text-muted-foreground">{formData.type === "Walk-in" ? "Walk-in Customer" : formData.type}</div> */}
              {/* <div className="grid grid-cols-1 gap-2">
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  "Supermarket",
                  "Wholesaler",
                  "Distributor",
                  "Own Shop",
                  "Walk-in"
                ].map((type) => (
                  <label key={type} className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="editCustomerType"
                      value={type}
                      disabled
                      checked={formData.type === type}
                      onChange={() => setFormData({ ...formData, type })}
                      className="accent-primary"
                    />
                    <span>{type === "Walk-in" ? "Walk-in Customer" : type}</span>
                  </label>
                ))}
              </div>
            </div> */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="editCustomerName" className="text-xs">Customer Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="editCustomerName"
                    placeholder="Enter customer name"
                    value={formData.name}
                    onChange={(e) => handleFormDataChange('name', e.target.value)}
                    className={formErrors.name || validationErrors.name ? "border-red-500" : ""}
                  />
                  {(formErrors.name || validationErrors.name) && (
                    <div className="text-xs text-red-600 mt-1">{formErrors.name || validationErrors.name}</div>
                  )}
                </div>
                {formData.type !== "Walking" && (
                  <div>
                    <Label htmlFor="editParentCustomer" className="text-xs">Parent Customer (for branches)</Label>
                    <CustomerSelect
                      customers={getParentCustomers().filter((c) => c.id !== editingCustomer?.id)}
                      value={formData.parentId || 0}
                      onValueChange={(id) => handleParentCustomerChange(id === 0 ? null : id)}
                      placeholder="Select parent customer (optional)"
                    />
                  </div>
                )}
              </div>
              <div className={"grid gap-3" + (formData.type === "Walking" ? " grid-cols-2" : " grid-cols-3")}>
                <div>
                  <Label htmlFor="editEmail">Email Address</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.email}
                    onChange={(e) => handleFormDataChange('email', e.target.value)}
                    className={formErrors.email || validationErrors.email ? "border-red-500" : ""}
                  />
                  {(formErrors.email || validationErrors.email) && (
                    <div className="text-xs text-red-600 mt-1">{formErrors.email || validationErrors.email}</div>
                  )}
                </div>
                {formData.type !== "Walking" && (
                  <div>
                    <Label htmlFor="editContactPerson">Contact Person <span className="text-red-500">*</span></Label>
                    <Input
                      id="editContactPerson"
                      placeholder="Enter contact person"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className={formErrors.contactPerson ? "border-red-500" : ""}
                    />
                    {formErrors.contactPerson && (
                      <div className="text-xs text-red-600 mt-1">{formErrors.contactPerson}</div>
                    )}
                  </div>
                )}
                <div>
                  <Label htmlFor="editContactNumber">Contact Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="editContactNumber"
                    placeholder="+94 XX XXX XXXX"
                    value={formData.contactNumber}
                    onChange={(e) => handleFormDataChange('contactNumber', e.target.value)}
                    className={formErrors.contactNumber || validationErrors.contactNumber ? "border-red-500" : ""}
                  />
                  {(formErrors.contactNumber || validationErrors.contactNumber) && (
                    <div className="text-xs text-red-600 mt-1">{formErrors.contactNumber || validationErrors.contactNumber}</div>
                  )}
                </div>
                <div>
                  <Label htmlFor="editContactNumber2">Contact Number 2</Label>
                  <Input
                    id="editContactNumber2"
                    placeholder="+94 XX XXX XXXX"
                    value={formData.contactNumber2}
                    onChange={(e) => handleFormDataChange('contactNumber2', e.target.value)}
                  />
                </div>



              </div>
              {formData.type !== "Walking" && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="editRoute">Assigned Route</Label>
                    <Select
                      value={formData.routeId?.toString() || "none"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, routeId: value === "none" ? null : Number(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select delivery route (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Route Assigned</SelectItem>
                        {routes
                          .filter(route => route.status === "active")
                          .map((route) => (
                            <SelectItem key={route.id} value={route.id.toString()}>
                              {route.routeName} - {route.city}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="editCreditLimit">Credit Limit (LKR) <span className="text-red-500">*</span></Label>
                    <Input
                      id="editCreditLimit"
                      type="number"
                      placeholder="0.00"
                      value={formData.creditLimit}
                      onChange={(e) => {
                        setFormData({ ...formData, creditLimit: Number(e.target.value) })
                        clearFieldError('creditLimit')
                      }}
                      className={formErrors.creditLimit ? "border-red-500" : ""}
                    />
                    {formErrors.creditLimit && (
                      <div className="text-xs text-red-600 mt-1">{formErrors.creditLimit}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-paymentMethod">Payment Method <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                    >
                      <SelectTrigger className={formErrors.paymentMethod ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select Payment Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash on delivery">Cash on delivery</SelectItem>
                        <SelectItem value="Bill to bill">Bill to bill</SelectItem>
                        <SelectItem value="One month credit">One month credit</SelectItem>
                        <SelectItem value="14 days credit">14 days credit</SelectItem>
                        <SelectItem value="7 days credit">7 days credit</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.paymentMethod && (
                      <div className="text-xs text-red-600 mt-1">{formErrors.paymentMethod}</div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="editCreditPeriod">Credit Period (Days) <span className="text-red-500">*</span></Label>
                    <Input
                      id="editCreditPeriod"
                      type="number"
                      placeholder="30"
                      value={formData.creditPeriod}
                      onChange={(e) => {
                        setFormData({ ...formData, creditPeriod: Number(e.target.value) })
                        clearFieldError('creditPeriod')
                      }}
                      className={formErrors.creditPeriod ? "border-red-500" : ""}
                    />
                    {formErrors.creditPeriod && (
                      <div className="text-xs text-red-600 mt-1">{formErrors.creditPeriod}</div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="editAddress">Address <span className="text-red-500">*</span></Label>
                <Textarea
                  id="editAddress"
                  placeholder="Enter full address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={formErrors.address ? "border-red-500" : ""}
                />
                {formErrors.address && (
                  <div className="text-xs text-red-600 mt-1">{formErrors.address}</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="editLatitude">Latitude</Label>
                  <Input
                    id="editLatitude"
                    placeholder="e.g. 6.9271"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editLongitude">Longitude</Label>
                  <Input
                    id="editLongitude"
                    placeholder="e.g. 79.8612"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {/* <div>
                  <Label htmlFor="editDiscountRate">Discount Rate (%)</Label>
                  <Input
                    id="editDiscountRate"
                    type="number"
                    placeholder="0"
                    value={formData.discountRate}
                    onChange={(e) => setFormData({ ...formData, discountRate: Number(e.target.value) })}
                    className={formErrors.discountRate ? "border-red-500" : ""}
                  />
                  {formErrors.discountRate && (
                    <div className="text-xs text-red-600 mt-1">{formErrors.discountRate}</div>
                  )}
                </div> */}
                <div className="grid grid-rows-2">
                  <div className="flex items-center space-x-2 mt-8">
                    <Checkbox
                      id="editIsTaxInclusive"
                      checked={formData.isTaxInclusive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isTaxInclusive: checked as boolean })
                      }
                    />
                    <Label htmlFor="editIsTaxInclusive" className="text-sm">Is Tax Inclusive</Label>
                  </div>
                  {formData.isTaxInclusive && (
                    <div>
                      <Label htmlFor="editTaxNumber">Tax Number <span className="text-red-500">*</span></Label>
                      <Input
                        id="editTaxNumber"
                        placeholder="Enter tax number"
                        value={formData.taxNumber}
                        onChange={(e) => {
                          setFormData({ ...formData, taxNumber: e.target.value })
                          clearFieldError('taxNumber')
                        }}
                        className={formErrors.taxNumber ? "border-red-500" : ""}
                      />
                      {formErrors.taxNumber && (
                        <div className="text-xs text-red-600 mt-1">{formErrors.taxNumber}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>



              {/* Update Summary */}
              {/* {(formData.username.trim() || formData.password.trim()) && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-orange-900 mb-2">Update Summary</h4>
                <ul className="text-xs text-orange-800 space-y-1">
                  <li>✓ Basic customer information will be updated</li>
                  {formData.username.trim() && <li>✓ Username will be changed</li>}
                  {formData.password.trim() && <li>✓ Password will be updated</li>}
                </ul>
              </div>
            )} */}
              <DialogFooter>
                <div className="grid grid-cols-3 gap-3 space-y-0">
                  <div className="flex items-center space-x-2">
                    {/* <Checkbox
                  id="editStatus"
                  checked={formData.status === "active"}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? "active" : "inactive" })}
                />
                <Label htmlFor="editStatus">Active</Label> */}
                  </div>
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    Clear Form
                  </Button>
                  <Button size="sm"
                    className="w-full"
                    onClick={handleEditCustomer}
                    disabled={Object.keys(validationErrors).some(key => validationErrors[key]) || !formData.name.trim() || !formData.contactNumber.trim()}
                  >
                    Update Customer
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
        {/* Category Wise Discount Dialog */}
        <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Category Wise Discounts - {selectedCustomerForDiscount?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              {categories.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No categories found</div>
              ) : (
                <div className="grid gap-4">
                  {categories.map((category) => {
                    const existingDiscount = customerCategoryDiscounts.find(d => d.categoryId === category.id)
                    return (
                      <div key={category.id} className="grid grid-cols-2 items-center gap-4 border-b pb-2 last:border-0">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{category.name}</p>
                          <p className="text-xs text-muted-foreground">{category.code}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="0.0"
                            className="h-8"
                            value={existingDiscount?.discountPercentage || ""}
                            onChange={(e) => updateDiscountPercentage(category.id, e.target.value)}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateCategoryDiscounts}>Save Discounts</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
