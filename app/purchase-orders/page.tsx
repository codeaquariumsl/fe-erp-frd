"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { usePagination } from "@/hooks/use-pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Search,
  MoreHorizontal,
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  Printer,
} from "lucide-react"
import {
  purchaseOrdersApi,
  suppliersApi,
  itemsApi,
  documentSequenceApi,
  type PurchaseOrder,
  type Supplier,
  type Item,
  type PurchaseOrderItem,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { ERPLayout } from "@/components/layouts/erp-layout"
import Loading from "./loading"
import { SupplierSelect } from "@/components/supplier/supplier-select"
import { ItemSelect } from "@/components/items/item-select"

export default function PurchaseOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [formData, setFormData] = useState({
    orderNumber: "",
    supplierId: "",
    orderDate: "",
    deliveryDate: "",
    status: "Pending" as "Pending" | "Approved" | "Received" | "Cancelled",
    currency: "LKR" as "LKR" | "USD",
    items: [] as PurchaseOrderItem[],
  })
  const { toast } = useToast()
  const router = useRouter()

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  // Auto-generate order number using Document Sequence API
  useEffect(() => {
    // if (isCreateDialogOpen) {
    //   documentSequenceApi.generateNumber("PO").then((res) => {
    //     setFormData((prev) => ({ ...prev, orderNumber: res.documentNumber }))
    //   }).catch((err) => {
    //     if (err.message && err.message.includes("Document type not found")) {
    //       toast({
    //         title: "Document Code Missing",
    //         description: "Purchase Order document code is not configured. Please set it up in Document Code Master.",
    //         variant: "destructive",
    //         duration: 4000,
    //       })
    //       setTimeout(() => {
    //         router.push("/master/document-codes")
    //       }, 1500)
    //     } else {
    //       // fallback to timestamp if API fails for other reasons
    //       setFormData((prev) => ({ ...prev, orderNumber: generateOrderNumber() }))
    //     }
    //   })
    // }
  }, [isCreateDialogOpen])

  const loadData = async () => {
    try {
      console.log("Starting to load data...")
      setLoading(true)
      const [ordersData, suppliersData, itemsData] = await Promise.all([
        purchaseOrdersApi.getAll(),
        suppliersApi.getAll<Supplier>(),
        itemsApi.getAll<Item>(),
      ])
      setPurchaseOrders(ordersData)
      setSuppliers(suppliersData)
      setItems(itemsData)
      console.log("Data loaded successfully:", { orders: ordersData.length, suppliers: suppliersData.length, items: itemsData.length })
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6)
    return `PO-${timestamp}`
  }

  const resetForm = () => {
    setFormData({
      orderNumber: "", // will be set by Document Sequence API useEffect
      supplierId: "",
      orderDate: new Date().toISOString().split("T")[0],
      deliveryDate: "",
      status: "Pending",
      currency: "LKR",
      items: [],
    })
  }

  const handleCreateOrder = async () => {
    setCreateLoading(true)
    try {
      if (!formData.supplierId) {
        toast({
          title: "Validation Error",
          description: "Please select a supplier",
          variant: "destructive",
        })
        return
      }

      if (!formData.orderDate) {
        toast({
          title: "Validation Error",
          description: "Order date is required",
          variant: "destructive",
        })
        return
      }

      if (!formData.deliveryDate) {
        toast({
          title: "Validation Error",
          description: "Delivery date is required",
          variant: "destructive",
        })
        return
      }

      if (formData.items.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one item",
          variant: "destructive",
        })
        return
      }

      const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0)

      await purchaseOrdersApi.create({
        orderNumber: formData.orderNumber,
        supplierId: Number.parseInt(formData.supplierId),
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate,
        status: formData.status,
        currency: formData.currency,
        totalAmount,
        items: formData.items,
      })

      toast({
        title: "Success",
        description: "Purchase order created successfully",
      })

      setIsCreateDialogOpen(false)
      resetForm()
      await loadData()
    } catch (error) {
      console.error("Error creating purchase order:", error)
      toast({
        title: "Error",
        description: "Failed to create purchase order. " + (error instanceof Error ? error.message : "Please try again"),
        variant: "destructive",
      })
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpdateOrder = async () => {
    if (!selectedOrder) {
      console.log("No selected order found")
      return
    }

    try {
      console.log("Starting update for order:", selectedOrder.id)
      const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0)

      const updateData = {
        orderNumber: formData.orderNumber,
        supplierId: Number.parseInt(formData.supplierId),
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate,
        status: formData.status,
        currency: formData.currency,
        totalAmount,
        items: formData.items,
      }

      console.log("Update payload:", updateData)

      const result = await purchaseOrdersApi.update(selectedOrder.id!, updateData)
      console.log("Update successful:", result)

      toast({
        title: "Success",
        description: "Purchase order updated successfully",
      })

      // Ensure these happen in sequence
      setIsEditDialogOpen(false)
      setSelectedOrder(null)
      resetForm()
      await loadData()

      console.log("Update process completed")
    } catch (error) {
      console.error("Error updating purchase order:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update purchase order",
        variant: "destructive",
      })
    }
  }

  const handleDeleteOrder = async (id: number) => {
    try {
      await purchaseOrdersApi.remove(id)
      toast({
        title: "Success",
        description: "Purchase order deleted successfully",
      })
      await loadData()
    } catch (error) {
      console.error("Error deleting purchase order:", error)
      toast({
        title: "Error",
        description: "Failed to delete purchase order",
        variant: "destructive",
      })
    }
  }

  const handleApproveOrder = async (order: PurchaseOrder) => {
    // if (!confirm("Are you sure you want to approve this purchase order?")) return
    setApproveLoading(true)
    try {
      await purchaseOrdersApi.update(order.id!, {
        ...order,
        status: "Approved",
      })

      toast({
        title: "Success",
        description: "Purchase order approved successfully",
      })

      // Update the selected order state to reflect the new status
      // setSelectedOrder(prev => prev ? { ...prev, status: "Approved" } : null)
      setIsViewDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error("Error approving purchase order:", error)
      toast({
        title: "Error",
        description: "Failed to approve purchase order",
        variant: "destructive",
      })
    } finally {
      setApproveLoading(false)
    }
  }

  const handlePrintPO = (order: PurchaseOrder) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height

    // Add Logo Text (Instead of image)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(10, 115, 10) // Green
    doc.text('CEYLON CARB', 15, 20)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('INSPIRED BY EXCELLENCE', 15, 25)

    // Purchase Order title
    doc.setFontSize(24)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text('PURCHASE ORDER', pageWidth - 15, 20, { align: 'right' })

    // PO Number
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`# ${order.orderNumber}`, pageWidth - 15, 27, { align: 'right' })

    // Company Address
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Ceylon Carb (Private) Limited', 15, 40)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('No. 358, 3rd Floor, Jana Jaya City,', 15, 45)
    doc.text('Jinadasa Niyathapala Mawatha, Sri Jayawardenapura, Kotte.', 15, 50)
    doc.text('+94 71 4902255', 15, 55)
    doc.text('office@ceyloncarb.com', 15, 60)
    doc.text('www.ceyloncarb.com', 15, 65)

    // Supplier Address & Deliver To
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Supplier Address', pageWidth / 2 + 10, 40)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(order.supplier?.name || '-', pageWidth / 2 + 10, 45)
    doc.setFont('helvetica', 'normal')

    const supplierAddressParts = (order.supplier?.address || '').split(',')
    let currentY = 50
    if (supplierAddressParts.length > 0 && supplierAddressParts[0] !== '') {
      supplierAddressParts.forEach(part => {
        doc.text(part.trim(), pageWidth / 2 + 10, currentY)
        currentY += 5
      })
    } else {
      doc.text('Address not provided', pageWidth / 2 + 10, currentY)
    }

    doc.setFontSize(10)
    doc.text('Deliver To', pageWidth / 2 + 10, 75)
    doc.setFontSize(9)
    doc.text('office', pageWidth / 2 + 10, 80)
    doc.text('No. 358, 3rd Floor, Jana Jaya City,', pageWidth / 2 + 10, 85)
    doc.text('Jinadasa Niyathapala Mawatha,', pageWidth / 2 + 10, 90)
    doc.text('Sri Jayawardenapura, Kotte.', pageWidth / 2 + 10, 95)
    doc.text('+94 71 4902255', pageWidth / 2 + 10, 100)
    doc.text('office@ceyloncarb.com', pageWidth / 2 + 10, 105)
    doc.text('www.ceyloncarb.com', pageWidth / 2 + 10, 110)

    // Dates aligned right above table
    const tableStartY = 130

    doc.text('Date :', pageWidth - 50, tableStartY - 15, { align: 'right' })
    doc.text('Delivery Date :', pageWidth - 50, tableStartY - 8, { align: 'right' })

    doc.text(format(new Date(order.orderDate), 'dd MMM yyyy'), pageWidth - 15, tableStartY - 15, { align: 'right' })
    doc.text(order.deliveryDate ? format(new Date(order.deliveryDate), 'dd MMM yyyy') : 'TBD', pageWidth - 15, tableStartY - 8, { align: 'right' })

    // Prepare table data
    const tableBody: any[] = []
    let totalQty = 0
    let totalAmount = 0

    if (order.items && order.items.length > 0) {
      order.items.forEach((item, index) => {
        const selectedItem = items.find(i => i.id === item.itemId)
        const itemName = selectedItem ? `${selectedItem.name}` : `Item ${item.itemId}`

        tableBody.push([
          (index + 1).toString(),
          itemName,
          (item.quantity || 0).toFixed(2),
          (item.unitPrice || 0).toFixed(2),
          ((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ])

        totalQty += item.quantity || 0
        totalAmount += (item.quantity || 0) * (item.unitPrice || 0)
      })
    }

    autoTable(doc, {
      startY: tableStartY,
      head: [['#', 'Item & Description', 'Qty', 'Rate', 'Amount (LKR)']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [50, 50, 50],
        textColor: 255,
        fontStyle: 'normal',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' }
      },
      styles: {
        fontSize: 9,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      margin: { left: 15, right: 15 }
    })

    // Sub Total & Total
    const finalY = (doc as any).lastAutoTable.finalY + 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Sub Total', pageWidth - 50, finalY, { align: 'right' })
    doc.text(totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), pageWidth - 15, finalY, { align: 'right' })

    doc.line(15, finalY + 5, pageWidth - 15, finalY + 5)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Total', pageWidth - 50, finalY + 15, { align: 'right' })
    doc.text(`LKR ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 15, finalY + 15, { align: 'right' })

    // Terms & Conditions
    let termsY = finalY + 40
    if (termsY > pageHeight - 40) {
      doc.addPage()
      termsY = 20
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Terms & Conditions', 15, termsY)

    doc.setFontSize(9)
    doc.setTextColor(50, 50, 50)
    const terms = [
      '- Prices are fixed and inclusive of all applicable charges unless agreed otherwise in writing by both parties.',
      '- The Supplier must deliver goods within the agreed timeline and inform CCPL in advance of any delays.',
      '- All goods must align with agreed specifications, finalized samples, and quality standards.',
      '- Payments will be made as per the agreed terms in the purchase order and/or invoice.'
    ]

    termsY += 7
    terms.forEach(term => {
      doc.text(term, 15, termsY)
      termsY += 5
    })

    // Footer signature
    // doc.setFontSize(10)
    // doc.setTextColor(150, 150, 150)
    // doc.text('POWERED BY CODE AQUA ERP', 15, pageHeight - 15)

    // Save the PDF
    const fileName = `PO_${order.orderNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`
    doc.save(fileName)
  }

  const handleEditOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order)
    setFormData({
      orderNumber: order.orderNumber,
      supplierId: order.supplierId.toString(),
      orderDate: order.orderDate.split("T")[0], // Extract date part only
      deliveryDate: order.deliveryDate ? order.deliveryDate.split("T")[0] : "", // Extract date part only
      status: order.status,
      currency: order.currency || "LKR",
      items: order.items,
    })
    setIsEditDialogOpen(true)
  }

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order)
    setIsViewDialogOpen(true)
  }

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { itemId: 0, quantity: 1, unitPrice: 0, totalPrice: 0 }],
    }))
  }

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: number) => {
    setFormData((prev) => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }

      // Auto-set unit price from item's selling price when item is selected
      if (field === "itemId") {
        const selectedItem = items.find(item => item.id === value)
        if (selectedItem) {
          newItems[index].unitPrice = selectedItem.sellingPrice
        }
      }

      // Recalculate total price
      if (field === "quantity" || field === "unitPrice" || field === "itemId") {
        newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice
      }

      return { ...prev, items: newItems }
    })
  }

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  // Pagination with custom hook
  const {
    paginatedData: paginatedOrders,
    paginationProps
  } = usePagination({
    data: purchaseOrders,
    initialItemsPerPage: 10,
    filterFn: (order) =>
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        )
      case "Approved":
        return (
          <Badge variant="default" className="bg-blue-600">
            Approved
          </Badge>
        )
      case "Received":
        return (
          <Badge variant="default" className="bg-green-600">
            Received
          </Badge>
        )
      case "Cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "Approved":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case "Received":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Cancelled":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return <Loading />
  }

  return (
    <ERPLayout>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Purchase Orders</h1>
            <p className="text-muted-foreground">Manage purchase orders and supplier relationships</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Purchase Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Purchase Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  {/* <div>
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, orderNumber: e.target.value }))}
                  />
                </div> */}
                  <div>
                    <Label htmlFor="orderDate">Order Date</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      disabled
                      value={formData.orderDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, orderDate: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value: "LKR" | "USD") => setFormData((prev) => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LKR">LKR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>



                  {/* <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, supplierId: value }))}
                  />
                </div>
              </div> */}

                  <div>
                    <Label htmlFor="supplier" className="mb-2 block">Supplier <span className="text-red-500">*</span></Label>
                    <SupplierSelect
                      suppliers={suppliers}
                      value={formData.supplierId}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, supplierId: value }))}
                      placeholder="Search and select supplier"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deliveryDate">Delivery Date <span className="text-red-500">*</span></Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                    />
                  </div>
                  {/* <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Received">Received</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Order Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      Add Item
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4 space-y-3">
                    {formData.items.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No items added yet</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-12 gap-2 text-sm font-medium">
                          <div className="col-span-5">
                            <span>Item</span>
                          </div>
                          <span>Quantity</span>
                          <span>Unit</span>
                          <span className="col-span-2">Unit Price</span>
                          <span className="col-span-2">Total Price</span>
                          <span>Actions</span>
                        </div>
                        {formData.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-5">
                              <ItemSelect
                                items={items}
                                value={item.itemId}
                                onValueChange={(value) => updateItem(index, "itemId", Number.parseInt(value))}
                                disabledItemIds={formData.items.filter((_, i) => i !== index).map(i => i.itemId)}
                                placeholder="Select item"
                              />
                            </div>
                            <div className="space-y-1">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 0)}
                                min="1"
                              />
                            </div>
                            <div className="space-y-1">
                              {(() => {
                                const selectedItem = items.find(i => i.id === item.itemId)
                                return selectedItem?.unit ? (
                                  <div className="text-sm text-muted-foreground">
                                    {selectedItem.unit}
                                  </div>
                                ) : null
                              })()}
                            </div>
                            <Input
                              className="col-span-2"
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                            />
                            <div className="space-y-1 col-span-2">
                              <Label>{item.totalPrice.toFixed(2)}</Label>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-lg font-medium">
                    Total Amount: {formData.currency} {formData.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                  </span>
                  <Button onClick={handleCreateOrder} disabled={createLoading}>
                    {createLoading ? "Creating..." : "Create Purchase Order"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-semibold">Total Orders</CardTitle>
              <ShoppingBag className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-2 py-1">
              <div className="text-lg font-bold leading-tight">{purchaseOrders.length}</div>
              <p className="text-[10px] text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-semibold">Pending Orders</CardTitle>
              <Clock className="h-3 w-3 text-yellow-500" />
            </CardHeader>
            <CardContent className="px-2 py-1">
              <div className="text-lg font-bold leading-tight">
                {purchaseOrders.filter((order) => order.status === "Pending").length}
              </div>
              <p className="text-[10px] text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-semibold">Total Value</CardTitle>
              <ShoppingBag className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-2 py-1">
              <div className="text-lg font-bold leading-tight">
                {(() => {
                  const lkrTotal = purchaseOrders.filter(order => (order.currency || "LKR") === "LKR").reduce((sum, order) => sum + order.totalAmount, 0)
                  const usdTotal = purchaseOrders.filter(order => (order.currency || "LKR") === "USD").reduce((sum, order) => sum + order.totalAmount, 0)
                  if (lkrTotal > 0 && usdTotal > 0) {
                    return `LKR ${lkrTotal.toLocaleString()} / USD ${usdTotal.toLocaleString()}`
                  } else if (usdTotal > 0) {
                    return `USD ${usdTotal.toLocaleString()}`
                  } else {
                    return `LKR ${lkrTotal.toLocaleString()}`
                  }
                })()
                }
              </div>
              <p className="text-[10px] text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-semibold">Suppliers</CardTitle>
              <ShoppingBag className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-2 py-1">
              <div className="text-lg font-bold leading-tight">{suppliers.length}</div>
              <p className="text-[10px] text-muted-foreground">Active suppliers</p>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Orders List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders..."
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
                  <TableHead>Order Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.orderNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.supplier?.name || "Unknown Supplier"}</div>
                    </TableCell>
                    <TableCell>{format(new Date(order.orderDate), "PPP")}</TableCell>
                    <TableCell>{format(new Date(order.deliveryDate), "PPP")}</TableCell>
                    <TableCell>{(order.currency || "LKR")} {order.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        {getStatusBadge(order.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.status === "Pending" ? (
                          <>
                            {/* <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleApproveOrder(order)}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            title="Approve Order"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button> */}
                            <Button variant="outline" size="sm" onClick={() => handleEditOrder(order)} title="Edit Order">
                              <Edit className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" title="Delete Order">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-red-600">Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the Purchase Order.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                    onClick={() => handleDeleteOrder(order.id!)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) :
                          <Button variant="outline" size="sm" onClick={() => handlePrintPO(order)} title="Print Purchase Order">
                            <Printer className="h-4 w-4" />
                          </Button>
                        }
                      </div>

                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <PaginationControls {...paginationProps} />
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Purchase Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="editOrderNumber">Order Number</Label>
                  <Input
                    id="editOrderNumber"
                    value={formData.orderNumber}
                    disabled
                    onChange={(e) => setFormData((prev) => ({ ...prev, orderNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="editOrderDate">Order Date</Label>
                  <Input
                    id="editOrderDate"
                    type="date"
                    disabled
                    value={formData.orderDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, orderDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="editDeliveryDate">Delivery Date</Label>
                  <Input
                    id="editDeliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="editCurrency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value: "LKR" | "USD") => setFormData((prev) => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LKR">LKR (Sri Lankan Rupee)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editSupplier" className="mb-2 block">Supplier</Label>
                  <SupplierSelect
                    suppliers={suppliers}
                    value={formData.supplierId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, supplierId: value }))}
                    placeholder="Search and select supplier"
                  />
                </div>
                {/* <div>
                <Label htmlFor="editStatus">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Order Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    Add Item
                  </Button>
                </div>
                <div className="border rounded-lg p-4 space-y-3">
                  {formData.items.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No items added yet</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-8 gap-2 text-sm font-medium">
                        <span className="col-span-4">Item</span>
                        <span>Quantity & Unit</span>
                        <span>Unit Price</span>
                        <span>Total Price</span>
                        <span>Actions</span>
                      </div>
                      {formData.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-8 gap-2 items-center">

                          <div className="col-span-4">
                            <ItemSelect
                              items={items}
                              value={item.itemId}
                              onValueChange={(value) => updateItem(index, "itemId", Number.parseInt(value))}
                              disabledItemIds={formData.items.filter((_, i) => i !== index).map(i => i.itemId)}
                              placeholder="Select item"
                            />
                          </div>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 0)}
                              min="1"
                            />
                            {(() => {
                              const selectedItem = items.find(i => i.id === item.itemId)
                              return selectedItem?.unit ? (
                                <div className="text-xs text-muted-foreground">
                                  Unit: {selectedItem.unit}
                                </div>
                              ) : null
                            })()}
                          </div>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                          <Input value={item.totalPrice.toFixed(2)} disabled />
                          <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-lg font-medium">
                  Total Amount: {formData.currency} {formData.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                </span>
                <Button onClick={handleUpdateOrder}>Update Purchase Order</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Order Details</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Order Number</Label>
                    <p className="font-medium">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <Label>Order Date</Label>
                    <p className="font-medium">{new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label>Delivery Date</Label>
                    <p className="font-medium">{selectedOrder.deliveryDate ? new Date(selectedOrder.deliveryDate).toLocaleDateString() : "Unknown"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <Label>Supplier</Label>
                    <p className="font-medium">{selectedOrder.supplier?.name || "Unknown Supplier"}</p>
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <p className="font-medium">{selectedOrder.currency || "LKR"}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedOrder.status)}
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Order Items</Label>
                  <div className="border rounded-lg mt-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity & Unit</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {item.item ? `${item.item.name}${item.item.barcode ? ` - ${item.item.barcode}` : ""}` : `Item ID: ${item.itemId}`}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.quantity}</div>
                                {item.item?.unit && (
                                  <div className="text-xs text-muted-foreground">
                                    Unit: {item.item.unit}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{selectedOrder.currency || "LKR"} {item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell>{selectedOrder.currency || "LKR"} {item.totalPrice.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-lg font-medium">Total Amount: {selectedOrder.currency || "LKR"} {selectedOrder.totalAmount.toFixed(2)}</span>
                  <div className="flex items-center space-x-2">

                    {selectedOrder.status === "Pending" ? (
                      <Button
                        onClick={() => handleApproveOrder(selectedOrder)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={approveLoading}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {approveLoading ? "Approving..." : "Approve Order"}
                      </Button>
                    ) :
                      <Button
                        variant="outline"
                        onClick={() => handlePrintPO(selectedOrder)}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Order
                      </Button>
                    }
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
