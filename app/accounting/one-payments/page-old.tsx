"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { onePaymentsApi, suppliersApi, OnePayment, Supplier } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye } from "lucide-react"
import Link from "next/link"

export default function OnePaymentsPage() {
  const [onePayments, setOnePayments] = useState<OnePayment[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    supplierId: "",
    paymentDate: "",
    paymentMethod: "Bank Transfer",
    bankAccountId: "",
    totalAmount: "",
    paymentType: "Advance Payment",
    description: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadOnePayments()
    loadSuppliers()
  }, [])

  const loadOnePayments = async () => {
    try {
      setLoading(true)
      const data = await onePaymentsApi.getAll<OnePayment>()
      setOnePayments(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load one-payments",
        variant: "destructive",
      })
      setOnePayments([])
    } finally {
      setLoading(false)
    }
  }

  const loadSuppliers = async () => {
    try {
      const data = await suppliersApi.getAll<Supplier>()
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Failed to load suppliers:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      supplierId: "",
      paymentDate: "",
      paymentMethod: "Bank Transfer",
      bankAccountId: "",
      totalAmount: "",
      paymentType: "Advance Payment",
      description: "",
    })
  }

  const handleCreateOnePayment = async () => {
    if (!formData.supplierId || !formData.paymentDate || !formData.totalAmount) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      await onePaymentsApi.create({
        supplierId: parseInt(formData.supplierId),
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod as any,
        bankAccountId: formData.bankAccountId ? parseInt(formData.bankAccountId) : undefined,
        totalAmount: parseFloat(formData.totalAmount),
        paymentType: formData.paymentType as any,
        description: formData.description,
      })
      toast({
        title: "Success",
        description: "One-payment created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadOnePayments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create one-payment",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      Draft: "bg-gray-100 text-gray-800",
      Allocated: "bg-yellow-100 text-yellow-800",
      Submitted: "bg-blue-100 text-blue-800",
      Approved: "bg-green-100 text-green-800",
      Posted: "bg-purple-100 text-purple-800",
      Reversed: "bg-orange-100 text-orange-800",
      Cancelled: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const filteredOnePayments = onePayments.filter(
    (payment) =>
      (statusFilter === "All" || payment.status === statusFilter) &&
      (payment.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  return (
    <ERPLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">One Time Payments</h1>
            <p className="text-muted-foreground mt-1">Manage advance and lump-sum supplier payments</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New One-Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create One-Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select value={formData.supplierId} onValueChange={(value) => setFormData({ ...formData, supplierId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="LC">LC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentType">Payment Type</Label>
                  <Select value={formData.paymentType} onValueChange={(value) => setFormData({ ...formData, paymentType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Advance Payment">Advance Payment</SelectItem>
                      <SelectItem value="Lump Sum">Lump Sum</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="totalAmount">Total Amount *</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Payment description"
                  />
                </div>
                <Button onClick={handleCreateOnePayment} className="w-full">
                  Create One-Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            {/* <CardTitle>One-Payments List</CardTitle> */}
            <CardDescription>All advance and lump-sum supplier payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Allocated">Allocated</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Posted">Posted</SelectItem>
                    <SelectItem value="Reversed">Reversed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredOnePayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No one-payments found
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment #</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Payment Type</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOnePayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">{payment.paymentNumber}</TableCell>
                          <TableCell>{payment.supplier?.name || "-"}</TableCell>
                          <TableCell className="text-sm">{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm">{payment.paymentType}</TableCell>
                          <TableCell className="font-mono text-sm">{parseFloat(payment.totalAmount?.toString() || "0").toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={`capitalize ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/accounting/one-payments/${payment.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
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
      </div>
    </ERPLayout>
  )
}
