"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { usePagination } from "@/hooks/use-pagination"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ERPLayout } from "@/components/layouts/erp-layout"
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
import { Switch } from "@/components/ui/switch"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/hooks/use-toast"
import {
  grnApi,
  suppliersApi,
  storesApi,
  itemsApi,
  purchaseOrdersApi,
  batchesApi,
  batchItemsApi,
  type GRN,
  type Supplier,
  type Store,
  type Item,
  type GRNItem,
  type PurchaseOrder,
  type CreateBatchRequest,
  type CreateBatchItemRequest,
} from "@/lib/api"
import { Plus, Search, Edit, Trash2, Eye, CalendarIcon, Package, CheckCircle, XCircle, Clock, Printer, Loader2 } from "lucide-react"
import jsPDF from "jspdf";

import { useRef } from "react"
// Damage reasons can be customized as needed
const DAMAGE_REASONS = [
  "Broken packaging",
  "Expired",
  "Wrong item",
  "Contaminated",
  "Other"
]
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import Loading from "./loading"
import { SupplierSelect } from "@/components/supplier/supplier-select"
import { ItemSelect } from "@/components/items/item-select"

export default function GRNPage() {

  // Helper function to get status badge styling
  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case "Pending":
        return {
          variant: "secondary" as const,
          className: "bg-yellow-100 text-yellow-800 border-yellow-300"
        }
      case "Approved":
        return {
          variant: "default" as const,
          className: "bg-green-100 text-green-800 border-green-300"
        }
      case "QC Checked":
        return {
          variant: "default" as const,
          className: "bg-blue-100 text-blue-800 border-blue-300"
        }
      case "Rejected":
      case "QC Failed":
        return {
          variant: "destructive" as const,
          className: ""
        }
      default:
        return {
          variant: "secondary" as const,
          className: ""
        }
    }
  }
  const [grns, setGrns] = useState<GRN[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [approvedPOs, setApprovedPOs] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const ALL_SUPPLIERS = "__all__"
  const ALL_STATUS = "__all__"
  const [supplierFilter, setSupplierFilter] = useState(ALL_SUPPLIERS)
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS)
  const [dateFilter, setDateFilter] = useState("")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null)
  const [qcItems, setQcItems] = useState<any[]>([])
  const [qcLoading, setQcLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [qcStatus, setQcStatus] = useState<boolean>(true)
  const [qcReason, setQcReason] = useState<string>("")
  const [showQcDialog, setShowQcDialog] = useState<boolean>(false)

  // Batch creation states
  const [showBatchDialog, setShowBatchDialog] = useState<boolean>(false)
  const [approveLoading, setApproveLoading] = useState<boolean>(false)
  const [createBatchLoading, setCreateBatchLoading] = useState<boolean>(false)
  const [grnDate, setGrnDate] = useState<Date>()
  const [selectedPOId, setSelectedPOId] = useState<number | null>(null)

  // Barcode states
  const [barcodeInput, setBarcodeInput] = useState("")
  const [poItemBarcodeInput, setPOItemBarcodeInput] = useState("")

  // Currency conversion (USD to LKR)
  const [usdToLkrRate, setUsdToLkrRate] = useState(320) // Default rate, should be configurable

  const [formData, setFormData] = useState({
    grnNumber: "",
    supplierId: 0,
    storeId: 0,
    grnDate: "",
    purchaseOrderId: null as number | null,
    items: [] as GRNItem[],
    totalAmount: 0,
  })

  const router = useRouter()

  useEffect(() => {
    fetchData()
    loadAvailablePOs()
  }, [])

  const loadAvailablePOs = async () => {
    try {
      const orders = await purchaseOrdersApi.getAvailableList()
      setApprovedPOs(orders)
    } catch (error) {
      console.error("Failed to load available purchase orders:", error)
    }
  }

  // Auto-generate GRN number using Document Sequence API
  useEffect(() => {
    // if (isCreateDialogOpen) {
    //   import("@/lib/api").then(({ documentSequenceApi }) => {
    //     documentSequenceApi.generateNumber("GRN").then((res: any) => {
    //       setFormData((prev) => ({ ...prev, grnNumber: res.documentNumber }))
    //     }).catch((err: any) => {
    //       if (err.message && err.message.includes("Document type not found")) {
    //         toast({
    //           title: "Document Code Missing",
    //           description: "GRN document code is not configured. Please set it up in Document Code Master.",
    //           variant: "destructive",
    //           duration: 4000,
    //         })
    //         setTimeout(() => {
    //           router.push("/master/document-codes")
    //         }, 1500)
    //       } else {
    //         setFormData((prev) => ({ ...prev, grnNumber: generateGrnNumber() }))
    //       }
    //     })
    //   })
    // }
  }, [isCreateDialogOpen])

  const generateGrnNumber = () => {
    const timestamp = Date.now().toString().slice(-6)
    return `GRN-${timestamp}`
  }

  // QC submit handler
  const handleQcSubmit = async () => {
    if (!selectedGRN) return

    // Validate QC reason if status is fail
    if (!qcStatus && !qcReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for QC failure",
        variant: "destructive"
      });
      return;
    }

    setQcLoading(true);
    try {
      await grnApi.qcCheck(selectedGRN.id!, {
        qcStatus,
        reason: !qcStatus ? qcReason : undefined
      });

      toast({
        title: "QC submitted",
        description: qcStatus
          ? "QC check passed successfully."
          : "QC check failed and recorded successfully."
      });

      setIsViewDialogOpen(false);
      setTimeout(fetchData, 300);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit QC.",
        variant: "destructive"
      });
    } finally {
      setQcLoading(false);
    }
  }

  const fetchData = async () => {
    try {
      const [grnsData, suppliersData, storesData, itemsData] = await Promise.all([
        grnApi.getAll(),
        suppliersApi.getAll<Supplier>(),
        storesApi.getAll<Store>(),
        itemsApi.getAll<Item>(),
      ])
      setGrns(grnsData)
      setSuppliers(suppliersData)
      setStores(storesData)
      setItems(itemsData)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreateLoading(true)
    try {

      // Validate required fields before API call
      if (!formData.supplierId || formData.supplierId === 0) {
        toast({
          title: "Validation Error",
          description: "Please select a supplier",
          variant: "destructive",
        });
        setCreateLoading(false)
        return;
      }

      if (!formData.storeId || formData.storeId === 0) {
        toast({
          title: "Validation Error",
          description: "Please select a store",
          variant: "destructive",
        });
        setCreateLoading(false)
        return;
      }

      if (!formData.items || formData.items.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one item to the GRN",
          variant: "destructive",
        });
        setCreateLoading(false)
        return;
      }

      // Calculate total amount from all items
      const totalAmount = formData.items.reduce((sum, item) => {
        return sum + ((item.grnQty || 0) * (item.costPrice || 0))
      }, 0)

      const payloadWithTotal = {
        ...formData,
        totalAmount: totalAmount
      }

      const createdGrn = await grnApi.create(payloadWithTotal);
      toast({
        title: "Success",
        description: "GRN created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();

      // Set the selected GRN and show batch creation dialog
      setSelectedGRN(createdGrn);
      setShowBatchDialog(true);

      setTimeout(fetchData, 300);
      // Reload available purchase orders as the created GRN may have consumed a PO
      loadAvailablePOs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create GRN",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedGRN) return;
    try {
      await grnApi.update(selectedGRN.id!, formData);
      toast({
        title: "Success",
        description: "GRN updated successfully",
      });
      setIsEditDialogOpen(false);
      resetForm();
      setTimeout(fetchData, 300);
      // Reload available purchase orders as the updated GRN may affect PO availability
      loadAvailablePOs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update GRN",
        variant: "destructive",
      });
    }
  }

  const handleApproveReject = async (id: number, status: "Approved" | "Rejected") => {
    setApproveLoading(true)
    try {
      const response = await grnApi.approveReject(id, { status })

      // Handle success response
      const message = (response as any)?.message || `GRN ${status.toLowerCase()} successfully`
      toast({
        title: "Success",
        description: message,
      })

      // if (status === "Approved" && selectedGRN) {
      //   // Show batch creation dialog - the endpoint will auto-generate the batch number
      //   setShowBatchDialog(true)
      // } else {
      setIsViewDialogOpen(false)
      setTimeout(fetchData, 300)
      // }
    } catch (error) {
      console.error(`Failed to ${status.toLowerCase()} GRN:`, error)
      toast({
        title: "Error",
        description: `Failed to ${status.toLowerCase()} GRN`,
        variant: "destructive",
      })
    } finally {
      setApproveLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await grnApi.remove(id)
      toast({
        title: "Success",
        description: "GRN deleted successfully",
      })
      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete GRN",
        variant: "destructive",
      })
    }
  }

  const handleCreateBatch = async () => {
    if (!selectedGRN) return

    setCreateBatchLoading(true)
    try {
      // Use the new auto-generate endpoint
      const response = await batchesApi.autoGenerateFromGRN(selectedGRN.id!)

      // Success message with batch details
      const batchCount = Array.isArray(response.batch) ? response.batch.length : 1
      const message = response.message || `Batch created successfully from GRN ${selectedGRN.grnNumber}`

      toast({
        title: "Success",
        description: message,
      })

      setShowBatchDialog(false)
      setIsViewDialogOpen(false)

      // Reload data after successful batch creation
      setTimeout(fetchData, 300)
    } catch (error) {
      console.error("Failed to create batch:", error)
      const errorMessage = (error as any)?.message || "Failed to create batch"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCreateBatchLoading(false)
    }
  }

  const handlePrintGRN = (grn: GRN) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Colors for modern design
    const primaryColor: [number, number, number] = [37, 99, 235]; // Blue
    const grayColor: [number, number, number] = [156, 163, 175]; // Gray
    const lightGrayColor: [number, number, number] = [243, 244, 246]; // Light gray
    const successColor: [number, number, number] = [34, 197, 94]; // Green

    // Header Section
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 30, 'F');

    // Company Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CODE AQUA ERP (PVT) LTD', 20, 20);

    // Document title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Goods Receive Note', pageWidth - 20, 20, { align: 'right' });

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // GRN Information Section
    let yPos = 50;

    // GRN Details Box
    doc.setFillColor(...lightGrayColor);
    doc.rect(20, yPos - 5, pageWidth - 40, 40, 'F');
    doc.setDrawColor(...grayColor);
    doc.rect(20, yPos - 5, pageWidth - 40, 40, 'S');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GRN DETAILS', 25, yPos + 5);

    // Two column layout for GRN details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Left column
    doc.setFont('helvetica', 'bold');
    doc.text('GRN Number:', 25, yPos + 15);
    doc.text('Date:', 25, yPos + 22);
    doc.text('Supplier:', 25, yPos + 29);

    doc.setFont('helvetica', 'normal');
    doc.text(grn.grnNumber || '-', 70, yPos + 15);
    doc.text(format(new Date(grn.grnDate), 'dd/MM/yyyy'), 70, yPos + 22);
    doc.text((grn as any).Supplier?.name || grn.supplier?.name || '-', 70, yPos + 29);

    // Right column
    const rightColX = pageWidth / 2 + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Store:', rightColX, yPos + 15);
    doc.text('Status:', rightColX, yPos + 22);
    doc.text('PO Number:', rightColX, yPos + 29);

    doc.setFont('helvetica', 'normal');
    doc.text((grn as any).Store?.name || grn.store?.name || '-', rightColX + 35, yPos + 15);
    doc.text(grn.status || '-', rightColX + 35, yPos + 22);
    doc.text(grn.PurchaseOrder?.orderNumber || 'N/A', rightColX + 35, yPos + 29);

    yPos += 50;

    // Items Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RECEIVED ITEMS', 25, yPos);
    yPos += 10;

    // Table header
    const colWidths = [60, 25, 25, 25, 30, 35]; // Item, Qty, Unit, Cost, Expire, Total
    const colX = [25, 85, 110, 135, 160, 195];

    // Header background
    doc.setFillColor(...primaryColor);
    doc.rect(20, yPos - 2, pageWidth - 40, 12, 'F');

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Item Name', colX[0], yPos + 6);
    doc.text('Qty', colX[1], yPos + 6);
    doc.text('Unit', colX[2], yPos + 6);
    doc.text('Cost', colX[3], yPos + 6);
    doc.text('Expire', colX[4], yPos + 6);
    doc.text('Total', colX[5], yPos + 6);

    yPos += 12;
    doc.setTextColor(0, 0, 0);

    let totalAmount = 0;
    let totalQty = 0;
    let totalWeight = 0;

    // Table rows
    const grnItems = (grn as any).GRNItems || grn.items || [];
    if (grnItems && grnItems.length > 0) {
      grnItems.forEach((item: any, index: number) => {
        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(20, yPos - 2, pageWidth - 40, 14, 'F');
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        // Item name (with text wrapping)
        const itemName = (item.Item?.color || item.item?.color) + ' ' + (item.Item?.name || item.item?.name) + ' ' + (item.Item?.country || item.item?.country) || '-';
        const itemNameLines = doc.splitTextToSize(itemName, colWidths[0] - 5);
        doc.text(itemNameLines, colX[0], yPos + 5);



        // Quantity
        doc.text(String(item.grnQty || '-'), colX[1], yPos + 5);
        totalQty += item.grnQty || 0;

        // Unit
        doc.text(item.item?.unit || 'Pcs', colX[2], yPos + 5);

        // Cost Price
        doc.text(String(item.costPrice?.toFixed(2) || '0.00'), colX[3], yPos + 5);

        // Expire Date
        const expireDate = item.expireDate ? format(new Date(item.expireDate), 'dd/MM/yy') : '-';
        doc.text(expireDate, colX[4], yPos + 5);

        // Total for this item
        const itemTotal = (item.grnQty || 0) * (item.costPrice || 0);
        totalAmount += itemTotal;
        doc.text(itemTotal.toFixed(2), colX[5], yPos + 5);

        // Add weight if available
        if (item.weight && item.weight > 0) {
          totalWeight += item.weight;
        }

        // Calculate row height based on content
        const maxLines = Math.max(itemNameLines.length, 1);
        const rowHeight = Math.max(14, maxLines * 7);
        yPos += rowHeight;

        // Check if we need a new page
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = 30;
        }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...grayColor);
      doc.text('No items found', 25, yPos + 15);
      doc.setTextColor(0, 0, 0);
      yPos += 20;
    }

    // Summary Section
    yPos += 10;
    doc.setFillColor(...successColor);
    doc.rect(pageWidth - 140, yPos - 5, 120, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', pageWidth - 135, yPos + 5);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Items: ${grnItems?.length || 0}`, pageWidth - 135, yPos + 12);
    doc.text(`Total Quantity: ${totalQty}`, pageWidth - 135, yPos + 18);
    if (totalWeight > 0) {
      doc.text(`Total Weight: ${totalWeight.toFixed(2)} kg`, pageWidth - 135, yPos + 24);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount: ${totalAmount.toFixed(2)}`, pageWidth - 135, yPos + (totalWeight > 0 ? 30 : 24));
    doc.setTextColor(0, 0, 0);

    yPos += 45;

    // QC Information (if available)
    if (grn.status === 'QC Checked' && grnItems?.some((item: any) => item.rejectedQty && item.rejectedQty > 0)) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('QUALITY CONTROL SUMMARY', 25, yPos);
      yPos += 10;

      const rejectedItems = grnItems.filter((item: any) => item.rejectedQty && item.rejectedQty > 0);
      if (rejectedItems.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        rejectedItems.forEach((item: any) => {
          doc.text(`• ${(item.Item?.name || item.item?.name)}: ${item.rejectedQty} rejected`, 25, yPos);
          if (item.damageReason) {
            doc.text(`  Reason: ${item.damageReason}`, 25, yPos + 5);
            yPos += 5;
          }
          yPos += 8;
        });
      }
      yPos += 10;
    }

    // Footer
    const footerY = pageHeight - 30;
    doc.setDrawColor(...grayColor);
    doc.line(20, footerY, pageWidth - 20, footerY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 25, footerY + 10);
    doc.text('Page 1', pageWidth - 25, footerY + 10, { align: 'right' });

    // Signature section
    if (yPos < footerY - 50) {
      yPos = Math.max(yPos + 20, footerY - 40);

      // Signature boxes
      const sigBoxWidth = 60;
      const sig1X = 30;
      const sig2X = pageWidth / 2 - 30;
      const sig3X = pageWidth - 90;

      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(...grayColor);

      // Received by
      doc.line(sig1X, yPos, sig1X + sigBoxWidth, yPos);
      doc.setFontSize(9);
      doc.text('Received By', sig1X, yPos + 8);

      // QC Checked by
      doc.line(sig2X, yPos, sig2X + sigBoxWidth, yPos);
      doc.text('QC Checked By', sig2X, yPos + 8);

      // Approved by
      doc.line(sig3X, yPos, sig3X + sigBoxWidth, yPos);
      doc.text('Approved By', sig3X, yPos + 8);
    }

    // Save the PDF
    const fileName = `GRN_${grn.grnNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
  }

  const resetForm = () => {
    const today = new Date();
    setFormData({
      grnNumber: "",
      supplierId: 0,
      storeId: 0,
      grnDate: format(today, "yyyy-MM-dd"),
      purchaseOrderId: null,
      items: [],
    })
    setGrnDate(today)
    setSelectedGRN(null)
    setSelectedPOId(null)
    setBarcodeInput("")
    setPOItemBarcodeInput("")
  }

  const openEditDialog = async (grn: GRN) => {
    setSelectedGRN(grn)
    setFormData({
      grnNumber: grn.grnNumber,
      supplierId: grn.supplierId,
      storeId: grn.storeId,
      grnDate: grn.grnDate,
      purchaseOrderId: grn.PurchaseOrder?.id || null,
      items: (grn as any).GRNItems || grn.items || [],
    })
    setGrnDate(new Date(grn.grnDate))
    setBarcodeInput("")
    setPOItemBarcodeInput("")

    setIsEditDialogOpen(true)
  }

  const openViewDialog = (grn: GRN) => {
    setSelectedGRN(grn)
    // Reset QC states
    setQcStatus(true)
    setQcReason("")
    // If status is Approved, initialize QC state
    if (grn.status === "Approved") {
      const grnItems = (grn as any).GRNItems || grn.items || [];
      setQcItems(
        grnItems.map((item: any) => ({
          grnItemId: item.id || item.grnItemId,
          rejectedQty: 0,
          damageReason: "",
          remarks: ""
        }))
      )
    } else {
      setQcItems([])
    }
    setIsViewDialogOpen(true)
  }

  // Check for "view" query param on mount to open view dialog
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    const viewId = queryParams.get("view")
    if (viewId) {
      const loadAndOpen = async () => {
        try {
          const grn = await grnApi.getById(viewId)
          openViewDialog(grn)
        } catch (err) {
          console.error("Failed to load GRN from query param viewId:", viewId, err)
        }
      }
      loadAndOpen()
    }
  }, [])

  // QC submit handler
  // (no-op, handled below)

  // Add item to GRN form
  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemId: 0,
          grnQty: 0,
          availableQty: 0,
          weight: 0,
          costPrice: 0,
          expireDate: "",
          remarks: "",
          damageReason: "",
          rejectedQty: 0,
          coldRoomId: 0,
          palletRackId: 0,
          coldRoomName: "",
          rackCode: "",
          unit: ""
        },
      ],
    })
  }

  const updateItem = (index: number, field: keyof GRNItem, value: any) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    // Auto-set availableQty to grnQty when grnQty changes
    if (field === "grnQty") {
      const it = items.find(pi => pi.id === updatedItems[index].itemId);
      updatedItems[index].availableQty = value
      const itemWeight = (it?.weight || 1);
      const calculatedWeight = (itemWeight * (value || 0));
      updatedItems[index].weight = parseFloat(calculatedWeight.toFixed(3));
    }

    // Auto-set unit and item details when itemId changes
    if (field === "itemId") {
      const selectedItem = items.find(pi => pi.id === value);
      if (selectedItem) {
        updatedItems[index].item = selectedItem
        updatedItems[index].unit = selectedItem.unit || ""
      }
    }

    setFormData({ ...formData, items: updatedItems })
  }

  const removeItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: updatedItems })
  }

  // Currency conversion function
  const convertUsdToLkr = (usdAmount: number): number => {
    return parseFloat((usdAmount * usdToLkrRate).toFixed(2))
  }

  // Function to get the cost price based on PO currency
  const getCostPriceForPOItem = (poItem: any, selectedPO: any): number => {
    if (selectedPO?.currency === "USD") {
      return convertUsdToLkr(poItem.unitPrice)
    }
    return poItem.unitPrice // Already in LKR
  }

  // Function to add item by barcode (manual addition without PO)
  const addItemByBarcode = () => {
    if (!barcodeInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a barcode",
        variant: "destructive",
      })
      return
    }

    const item = items.find(item => item.barcode === barcodeInput.trim())
    if (!item) {
      toast({
        title: "Error",
        description: "Item not found with this barcode",
        variant: "destructive",
      })
      return
    }

    // Check if item already exists in the list
    const existingItem = formData.items.find(grnItem => grnItem.itemId === item.id)
    if (existingItem) {
      toast({
        title: "Warning",
        description: "Item already exists in the GRN list",
        variant: "destructive",
      })
      return
    }

    const newItem = {
      itemId: item.id,
      grnQty: 0,
      availableQty: 0,
      weight: 0,
      costPrice: 0,
      expireDate: "",
      item: item,
      remarks: "",
      damageReason: "",
      rejectedQty: 0,
      coldRoomId: 0,
      palletRackId: 0,
      coldRoomName: "",
      rackCode: "",
      unit: item.unit || ""
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))

    setBarcodeInput("") // Clear the input
    toast({
      title: "Success",
      description: `Item "${item.name}" added to GRN`,
      variant: "default",
    })
  }

  // Function to add item by barcode from PO
  const addPOItemByBarcode = () => {
    if (!poItemBarcodeInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a barcode",
        variant: "destructive",
      })
      return
    }

    if (!selectedPOId) {
      toast({
        title: "Error",
        description: "Please select a purchase order first",
        variant: "destructive",
      })
      return
    }

    const selectedPO = approvedPOs.find(po => po.id === selectedPOId)
    if (!selectedPO) {
      toast({
        title: "Error",
        description: "Selected purchase order not found",
        variant: "destructive",
      })
      return
    }

    const poItem = selectedPO.items.find(item => item.item?.barcode === poItemBarcodeInput.trim())
    if (!poItem) {
      toast({
        title: "Error",
        description: "Item with this barcode not found in selected purchase order",
        variant: "destructive",
      })
      return
    }

    // Check if item already exists in the GRN list
    // const existingItem = formData.items.find(grnItem => grnItem.itemId === poItem.itemId)
    // if (existingItem) {
    //   toast({
    //     title: "Warning",
    //     description: "Item already exists in the GRN list",
    //     variant: "destructive",
    //   })
    //   return
    // }

    const convertedCostPrice = getCostPriceForPOItem(poItem, selectedPO)
    const newItem = {
      itemId: poItem.itemId,
      grnQty: poItem.quantity, // Auto-populate with PO quantity
      availableQty: poItem.quantity,
      weight: (poItem.item?.weight || 1) * poItem.quantity,
      costPrice: convertedCostPrice,
      expireDate: "",
      item: poItem.item,
      remarks: "",
      damageReason: "",
      rejectedQty: 0,
      coldRoomId: 0,
      palletRackId: 0,
      coldRoomName: "",
      rackCode: "",
      poOrderedQty: poItem.quantity,
      unit: poItem.item?.unit || ""
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))

    setPOItemBarcodeInput("") // Clear the input
    const currencyMsg = selectedPO?.currency === "USD" ? ` (USD price converted to LKR)` : ""
    toast({
      title: "Success",
      description: `Item "${poItem.item?.name}" added to GRN from PO${currencyMsg}`,
      variant: "default",
    })
  }



  const filteredGRNs = useMemo(() => {
    return grns.filter((grn) => {
      const search = searchTerm.toLowerCase()
      const matchesSearch =
        grn.grnNumber.toLowerCase().includes(search) ||
        ((grn as any).Supplier?.name || grn.supplier?.name || "").toLowerCase().includes(search) ||
        ((grn as any).Store?.name || grn.store?.name || "").toLowerCase().includes(search)
      const matchesSupplier = supplierFilter === ALL_SUPPLIERS || ((grn as any).Supplier?.id || grn.supplier?.id)?.toString() === supplierFilter
      const matchesStatus = statusFilter === ALL_STATUS || grn.status === statusFilter
      const matchesDate = !dateFilter || (grn.grnDate && format(new Date(grn.grnDate), "yyyy-MM-dd") === dateFilter)
      return matchesSearch && matchesSupplier && matchesStatus && matchesDate
    })
  }, [grns, searchTerm, supplierFilter, statusFilter, dateFilter])

  const paginatedGRNs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredGRNs.slice(startIndex, endIndex)
  }, [filteredGRNs, currentPage, itemsPerPage])

  const getTotalPages = useMemo(() => {
    return Math.ceil(filteredGRNs.length / itemsPerPage)
  }, [filteredGRNs.length, itemsPerPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, supplierFilter, statusFilter, dateFilter])

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
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Show</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-20 h-8">
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
          <span className="text-sm text-gray-700">entries</span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground py-2">
          <span>
            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredGRNs.length)} of {filteredGRNs.length} GRNs (Total: {grns.length})
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            {'<<'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
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
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            {'>'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            {'>>'}
          </Button>
        </div>
      </div>
    )
  }

  // Analytics calculations
  const totalGRNs = grns.length
  const pendingGRNs = grns.filter((grn) => grn.status === "Pending").length
  const approvedGRNs = grns.filter((grn) => grn.status === "Approved" || grn.status === "QC Checked").length
  const rejectedGRNs = grns.filter((grn) => grn.status === "Rejected").length

  // Calculate total amounts
  const totalAmount = grns.reduce((sum, grn) => {
    const grnTotal = ((grn as any).GRNItems || grn.items || []).reduce((itemSum: number, item: any) => itemSum + ((item.grnQty || 0) * (item.costPrice || 0)), 0)
    return sum + grnTotal
  }, 0)

  if (loading) {
    return <ERPLayout><Loading /></ERPLayout>
  }

  return (
    <ERPLayout>
      <div className="flex-1 space-y-2 p-2 md:p-2 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Goods Receive Note Management</h2>
            <p className="text-muted-foreground">Manage your goods receipt notes</p>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create GRN
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Goods Receive Note</DialogTitle>
                  <DialogDescription>Create a new GRN to record received goods.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-4 gap-4">
                    {/* <div className="grid gap-2">
                    <Label htmlFor="grnNumber">GRN Number</Label>
                    <Input
                      id="grnNumber"
                      value={formData.grnNumber}
                      onChange={(e) => setFormData({ ...formData, grnNumber: e.target.value })}
                      placeholder="GRN number"
                    />
                  </div> */}
                    <div className="grid gap-2" >
                      <Label htmlFor="grnDate">GRN Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            disabled
                            variant="outline"
                            className={cn("justify-start text-left font-normal", !grnDate && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {grnDate ? format(grnDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={grnDate}
                            onSelect={(date) => {
                              setGrnDate(date)
                              setFormData({ ...formData, grnDate: date ? format(date, "yyyy-MM-dd") : "" })
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Purchase Order Select */}
                    <div className="grid gap-2">
                      <Label htmlFor="purchaseOrder">Purchase Order</Label>
                      <Select
                        value={selectedPOId?.toString() || ""}
                        onValueChange={(value) => {
                          if (value === "none") {
                            setSelectedPOId(null)
                            setFormData((prev) => ({
                              ...prev,
                              supplierId: 0,
                              purchaseOrderId: null,
                              items: [],
                            }))
                            return
                          }
                          const po = approvedPOs.find((p) => p.id === Number(value))
                          setSelectedPOId(po?.id || null)
                          if (po) {
                            setFormData((prev) => ({
                              ...prev,
                              supplierId: po.supplierId,
                              purchaseOrderId: po.id || null,
                              items: [],
                            }))
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select purchase order (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Purchase order)</SelectItem>
                          {approvedPOs.map((po) => (
                            <SelectItem key={po.id} value={po.id!.toString()}>
                              {po.orderNumber} - {po.supplier?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="supplierId" className="mb-1 block">Supplier <span className="text-red-500">*</span></Label>
                      <SupplierSelect
                        suppliers={suppliers}
                        value={formData.supplierId}
                        onValueChange={(value) => setFormData({ ...formData, supplierId: Number.parseInt(value) })}
                        placeholder="Search and select supplier"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="storeId">Store <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.storeId === 0 ? "" : formData.storeId.toString()}
                        onValueChange={(value) => setFormData({ ...formData, storeId: Number.parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id.toString()}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                  </div>

                  {/* Purchase Order Items Display */}
                  {selectedPOId && (
                    <div className="space-y-2">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <Label className="text-base font-semibold text-blue-800">Purchase Order Items</Label>
                        <p className="text-sm text-blue-600 mb-3">
                          Available items from selected purchase order
                          {(() => {
                            const selectedPO = approvedPOs.find(po => po.id === selectedPOId);
                            if (selectedPO?.currency === "USD") {
                              return <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                USD prices will be converted to LKR (Rate: {usdToLkrRate})
                              </span>
                            }
                            return null;
                          })()}
                        </p>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Ordered Qty</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>Total Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(() => {
                                const selectedPO = approvedPOs.find(po => po.id === selectedPOId);
                                return selectedPO?.items.map((poItem, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">
                                      {poItem.item?.name} ({poItem.item?.barcode})
                                    </TableCell>
                                    <TableCell>{poItem.quantity} {poItem.item?.unit || ""}</TableCell>
                                    <TableCell>
                                      {selectedPO?.currency === "USD" ? (
                                        <div>
                                          <div className="text-xs text-muted-foreground">USD {poItem.unitPrice.toFixed(2)}</div>
                                          <div className="font-medium">LKR {convertUsdToLkr(poItem.unitPrice).toFixed(2)}</div>
                                        </div>
                                      ) : (
                                        `LKR ${poItem.unitPrice.toFixed(2)}`
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {selectedPO?.currency === "USD" ? (
                                        <div>
                                          <div className="text-xs text-muted-foreground">USD {(poItem.quantity * poItem.unitPrice).toFixed(2)}</div>
                                          <div className="font-medium">LKR {convertUsdToLkr(poItem.quantity * poItem.unitPrice).toFixed(2)}</div>
                                        </div>
                                      ) : (
                                        `LKR ${(poItem.quantity * poItem.unitPrice).toFixed(2)}`
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )) || [];
                              })()}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GRN Items */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">GRN Items</Label>
                      {selectedPOId ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Enter barcode"
                              value={poItemBarcodeInput}
                              onChange={(e) => setPOItemBarcodeInput(e.target.value)}
                              className="w-64"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addPOItemByBarcode()
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addPOItemByBarcode}
                              disabled={!poItemBarcodeInput.trim()}
                            >
                              Add by Barcode
                            </Button>
                          </div>
                          <div className="text-muted-foreground">or</div>
                          <ItemSelect
                            items={(() => {
                              const selectedPO = approvedPOs.find(po => po.id === selectedPOId);
                              return selectedPO?.items.map(pi => pi.item).filter((it): it is Item => !!it) || [];
                            })()}
                            value=""
                            onValueChange={(value) => {
                              const selectedPO = approvedPOs.find(po => po.id === selectedPOId);
                              const poItem = selectedPO?.items.find(item => item.itemId === Number(value));
                              if (poItem) {
                                const convertedCostPrice = getCostPriceForPOItem(poItem, selectedPO)
                                const newItem = {
                                  itemId: poItem.itemId,
                                  grnQty: poItem.quantity, // Auto-populate with PO quantity
                                  availableQty: poItem.quantity,
                                  weight: (poItem.item?.weight || 1) * poItem.quantity,
                                  costPrice: convertedCostPrice,
                                  expireDate: "",
                                  item: poItem.item,
                                  remarks: "",
                                  damageReason: "",
                                  rejectedQty: 0,
                                  coldRoomId: 0,
                                  palletRackId: 0,
                                  coldRoomName: "",
                                  rackCode: "",
                                  poOrderedQty: poItem.quantity,
                                };
                                setFormData(prev => ({
                                  ...prev,
                                  items: [...prev.items, newItem]
                                }));
                              }
                            }}
                            placeholder="Add item from PO"
                            className="w-60"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Enter barcode to add item"
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            className="w-64"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addItemByBarcode()
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addItemByBarcode}
                            disabled={!barcodeInput.trim()}
                          >
                            Add by Barcode
                          </Button>
                          <div className="text-muted-foreground">or</div>
                          <Button type="button" variant="outline" size="sm" onClick={addItem}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                          </Button>
                        </div>
                      )}
                    </div>

                    {formData.items.length > 0 && (
                      <div className="border rounded-lg overflow-x-auto">
                        <Table className="min-w-[1000px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[150px]">Item</TableHead>
                              {selectedPOId && <TableHead className="w-24">PO Qty</TableHead>}
                              <TableHead >GRN Quantity</TableHead>
                              <TableHead >Unit</TableHead>
                              <TableHead>
                                Cost (LKR)
                                {(() => {
                                  const selectedPO = selectedPOId ? approvedPOs.find(po => po.id === selectedPOId) : null;
                                  return selectedPO?.currency === "USD" ? (
                                    <span className="text-xs text-yellow-600 ml-1">*Converted</span>
                                  ) : null;
                                })()}
                              </TableHead>
                              <TableHead className="min-w-[120px]">Expire Date</TableHead>
                              <TableHead className="w-12">Total</TableHead>
                              <TableHead className="w-4"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.items.map((item, index) => {
                              const selectedPO = selectedPOId ? approvedPOs.find(po => po.id === selectedPOId) : null;
                              const poItem = selectedPO?.items.find(pi => pi.itemId === item.itemId);
                              const totalUsedQty = formData.items
                                .filter(i => i.itemId === item.itemId)
                                .reduce((sum, i) => sum + i.grnQty, 0);
                              const remainingQty = poItem ? poItem.quantity - totalUsedQty + item.grnQty : 0;

                              return (
                                <TableRow key={index}>
                                  <TableCell className="min-w-[180px]">
                                    {selectedPOId ? (
                                      <div className="text-sm">
                                        {item.item?.name} ({item.item?.barcode})
                                      </div>
                                    ) : (
                                      <ItemSelect
                                        items={items}
                                        value={item.itemId}
                                        onValueChange={(value) => updateItem(index, "itemId", Number.parseInt(value))}
                                        disabledItemIds={formData.items.filter((_, i) => i !== index).map(i => i.itemId)}
                                        placeholder="Select item"
                                      />
                                    )}
                                  </TableCell>
                                  {selectedPOId && (
                                    <TableCell className="w-20">
                                      <div className="text-sm text-center">
                                        <div>{poItem?.quantity || 0}</div>
                                        <div className="text-xs text-muted-foreground">
                                          Rem: {remainingQty}
                                        </div>
                                      </div>
                                    </TableCell>
                                  )}
                                  <TableCell >
                                    <Input
                                      type="number"
                                      value={item.grnQty}
                                      onChange={(e) => updateItem(index, "grnQty", Number.parseFloat(e.target.value) || 0)}
                                      className="w-full text-sm"
                                      max={selectedPOId ? remainingQty : undefined}
                                      min="0"
                                      onFocus={(e) => e.target.select()}
                                    />
                                    {selectedPOId && remainingQty < item.grnQty && (
                                      <div className="text-xs text-red-500 mt-1">Exceeds limit!</div>
                                    )}
                                  </TableCell>
                                  {/* <TableCell >
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={item.weight}
                                      onChange={(e) => updateItem(index, "weight", Number.parseFloat(e.target.value) || 0)}
                                      className="w-full text-sm"
                                    />
                                  </TableCell> */}
                                  <TableCell className="w-12">
                                    <span className="font-medium text-sm">{item.unit}</span>
                                  </TableCell>
                                  <TableCell className="w-28">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={item.costPrice}
                                      onChange={(e) =>
                                        updateItem(index, "costPrice", Number.parseFloat(e.target.value) || 0)
                                      }
                                      className="w-full text-sm"
                                      onFocus={(e) => e.target.select()}
                                    // readOnly={selectedPOId}
                                    />
                                  </TableCell>

                                  <TableCell className="min-w-[130px]">
                                    <Input
                                      type="date"
                                      value={item.expireDate}
                                      onChange={(e) => updateItem(index, "expireDate", e.target.value)}
                                      className="w-full text-sm h-9"
                                    />
                                  </TableCell>
                                  <TableCell className="w-12">
                                    <span className="font-medium text-sm">{(item.grnQty * item.costPrice).toFixed(2)}</span>
                                  </TableCell>
                                  <TableCell className="w-4">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                                      <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Totals */}
                    {formData.items.length > 0 && (
                      <div className="flex justify-between space-x-4 pt-4 border-t">
                        <div className="text-left">
                          {selectedPOId && (
                            <div className="text-sm text-blue-600 mt-2 pt-2">
                              <div>PO Total: {(() => {
                                const selectedPO = approvedPOs.find(po => po.id === selectedPOId);
                                const total = selectedPO?.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0) || 0;
                                return total.toFixed(2);
                              })()}</div>
                              <div>Remaining: {(() => {
                                const selectedPO = approvedPOs.find(po => po.id === selectedPOId);
                                const poTotal = selectedPO?.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0) || 0;
                                const grnTotal = formData.items.reduce((sum, item) => sum + ((item.grnQty || 0) * (item.costPrice || 0)), 0);
                                return (poTotal - grnTotal).toFixed(2);
                              })()}</div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Total Items: {formData.items.length}</div>
                          <div className="text-sm text-muted-foreground">
                            Total Quantity: {formData.items.reduce((sum, item) => sum + (item.grnQty || 0), 0)}
                          </div>
                          {/* <div className="text-sm text-muted-foreground">
                            Total Weight: {formData.items.reduce((sum, item) => sum + (item.weight || 0), 0).toFixed(2)} kg
                          </div> */}
                          <div className="text-lg font-semibold">
                            Total Amount: {formData.items.reduce((sum, item) => sum + ((item.grnQty || 0) * (item.costPrice || 0)), 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreate} size="sm" disabled={createLoading}>
                    {createLoading ? "Creating..." : "Create GRN"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total GRNs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{totalGRNs}</div>
              <p className="text-xs text-muted-foreground leading-tight">{totalAmount.toFixed(2)} total value</p>
            </CardContent>
          </Card>
          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{pendingGRNs}</div>
              <p className="text-xs text-muted-foreground leading-tight">Awaiting approval</p>
            </CardContent>
          </Card>
          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{approvedGRNs}</div>
              <p className="text-xs text-muted-foreground leading-tight">Successfully approved</p>
            </CardContent>
          </Card>
          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{rejectedGRNs}</div>
              <p className="text-xs text-muted-foreground leading-tight">Rejected GRNs</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search GRNs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              {/* Supplier filter */}
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SUPPLIERS}>All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>{supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS}>All Statuses</SelectItem>
                  {Array.from(new Set(grns.map(g => g.status).filter(Boolean))).map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Date filter */}
              <Input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="w-36"
                placeholder="Date"
                min=""
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Amount (LKR)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedGRNs.map((grn) => (
                  <TableRow key={grn.id}>
                    <TableCell className="font-medium">
                      <div>
                        {grn.grnNumber}<br />
                        <span className="text-xs text-muted-foreground">{grn.PurchaseOrder?.orderNumber ? grn.PurchaseOrder?.orderNumber : ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(grn.grnDate), "PPP")}</TableCell>
                    <TableCell>{(grn as any).Supplier?.name || grn.supplier?.name}</TableCell>
                    <TableCell>{(grn as any).Store?.name || grn.store?.name}</TableCell>
                    <TableCell>
                      {(() => {
                        const items = (grn as any).GRNItems || grn.items || [];
                        const totalAmount = items.reduce((sum: number, item: any) => {
                          return sum + ((item.grnQty || 0) * (item.costPrice || 0));
                        }, 0);
                        return totalAmount.toFixed(2);
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeProps(grn.status).variant}
                        className={getStatusBadgeProps(grn.status).className}
                      >
                        {grn.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openViewDialog(grn)}>
                          <Eye className="h-4 w-4" />
                        </Button>

                        {grn.status === "Pending" ? (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(grn)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            {/* <Button variant="outline" size="sm" onClick={() => handleApproveReject(grn.id!, "Approved")}>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleApproveReject(grn.id!, "Rejected")}>
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button> */}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-red-600">Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <br />
                                    This action cannot be undone. This will permanently delete the GRN.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                    onClick={() => handleDelete(grn.id!)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) :
                          <Button variant="outline" size="sm" onClick={() => handlePrintGRN(grn)} title="Print GRN">
                            <Printer className="h-4 w-4" />
                          </Button>
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>GRN Details</DialogTitle>
              <DialogDescription>View goods receive note information.</DialogDescription>
            </DialogHeader>
            {selectedGRN && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">GRN Number</Label>
                    <p className="text-sm text-muted-foreground">{selectedGRN.grnNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Date</Label>
                    <p className="text-sm text-muted-foreground">{format(new Date(selectedGRN.grnDate), "PPP")}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Purchase Order</Label>
                    <p className="text-sm text-muted-foreground">{(selectedGRN as any).PurchaseOrder?.orderNumber || (selectedGRN as any).purchaseOrderId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Supplier</Label>
                    <p className="text-sm text-muted-foreground">{(selectedGRN as any).Supplier?.name || selectedGRN.supplier?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Store</Label>
                    <p className="text-sm text-muted-foreground">{(selectedGRN as any).Store?.name || selectedGRN.store?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status </Label>
                    <Badge
                      variant={getStatusBadgeProps(selectedGRN.status).variant}
                      className={getStatusBadgeProps(selectedGRN.status).className}
                    >
                      {selectedGRN.status}
                    </Badge>
                  </div>
                </div>
                {selectedGRN.status === "QC Failed" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Remarks</Label>
                      <p className="text-sm text-muted-foreground">{selectedGRN.remarks}</p>
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-base font-semibold">Items</Label>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[700px] max-w-full text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Expire</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(((selectedGRN as any).GRNItems || selectedGRN.items || [])).map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              {(item.Item?.name || item.item?.name) + ' (' + (item.Item?.barcode || item.item?.barcode) + ')'}
                            </TableCell>
                            <TableCell>
                              {item.expireDate && <span className="text-xs">{format(new Date(item.expireDate), "dd/MM/yyyy")}</span>}
                            </TableCell>
                            <TableCell>
                              {item.grnQty} {(item.Item?.unit || item.item?.unit || items.find((i) => i.id === item.itemId)?.unit || "")}
                            </TableCell>
                            {/* <TableCell> {item.weight || 1} kg </TableCell> */}
                            <TableCell>
                              {item.availableQty} {(item.Item?.unit || item.item?.unit || items.find((i) => i.id === item.itemId)?.unit || "")}
                            </TableCell>

                            <TableCell>{item.costPrice.toFixed(2)}</TableCell>
                            <TableCell>{(item.grnQty * item.costPrice).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total Items: {((selectedGRN as any).GRNItems || selectedGRN.items || []).length}</div>
                      <div className="text-sm text-muted-foreground">
                        Total Quantity: {((selectedGRN as any).GRNItems || selectedGRN.items || []).reduce((sum: number, item: any) => sum + item.grnQty, 0)}
                      </div>
                      {/* <div className="text-sm text-muted-foreground">
                        Total Weight: {((selectedGRN as any).GRNItems || selectedGRN.items || []).reduce((sum: number, item: any) => sum + item.weight, 0).toFixed(2)} kg
                      </div> */}
                      <div className="text-lg font-semibold">
                        Total Amount:
                        {((selectedGRN as any).GRNItems || selectedGRN.items || []).reduce((sum: number, item: any) => sum + ((item.grnQty || 0) * (item.costPrice || 0)), 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {/* QC Form */}
                  {/* {selectedGRN.status === "Approved" && (
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Quality Control Check</Label>
                          <p className="text-sm text-muted-foreground">Verify the received items quality</p>
                        </div>
                        {!qcStatus && (
                          <div className="text-sm">
                            <Label htmlFor="qcReason">Rejection Reason</Label>
                            <Input
                              id="qcReason"
                              placeholder="Enter reason for QC failure"
                              value={qcReason}
                              onChange={(e) => setQcReason(e.target.value)}
                              className="w-full"
                            />
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                          <div className="flex items-center space-x-2">
                            <Label>{qcStatus ? "Pass" : "Fail"}</Label>
                            <Switch
                              checked={qcStatus}
                              onCheckedChange={setQcStatus}
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            disabled={qcLoading || (!qcStatus && !qcReason)}
                            onClick={handleQcSubmit}
                          >
                            {qcLoading ? "Submitting..." : "Submit QC"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )} */}
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  {/* Show Approve/Reject only if status is Pending */}
                  {selectedGRN.status === "Pending" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproveReject(selectedGRN.id!, "Approved")}
                        disabled={approveLoading}
                      >
                        {approveLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Processing...
                          </div>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={approveLoading}
                        onClick={async () => {
                          await handleApproveReject(selectedGRN.id!, "Rejected");
                          setIsViewDialogOpen(false);
                          setTimeout(fetchData, 300);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {/* Show Generate Batch button if status is Approved */}
                  {selectedGRN.status === "Approved" && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setShowBatchDialog(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Generate Batch
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Created At</Label>
                    <p className="font-medium text-sm text-muted-foreground">{selectedGRN.createdAt ? format(new Date(selectedGRN.createdAt), "PPP p") : ""}</p>
                    {selectedGRN.createdUserName && (
                      <p className="font-medium text-xs text-muted-foreground">by {selectedGRN.createdUserName}</p>
                    )}
                  </div>
                  <div>
                    <Label>Updated At</Label>
                    <p className="font-medium text-sm text-muted-foreground">{selectedGRN.updatedAt ? format(new Date(selectedGRN.updatedAt), "PPP p") : ""}</p>
                    {selectedGRN.updatedUserName && (
                      <p className="font-medium text-xs text-muted-foreground">by {selectedGRN.updatedUserName}</p>
                    )}
                  </div>
                  <div>
                    {selectedGRN.approvedAt && (
                      <>
                        <Label>Approved At</Label>
                        <p className="font-medium text-sm text-muted-foreground">{selectedGRN.approvedAt ? format(new Date(selectedGRN.approvedAt), "PPP p") : ""}</p>
                        {selectedGRN.approvedUserName && (
                          <p className="font-medium text-xs text-muted-foreground">by {selectedGRN.approvedUserName}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    {selectedGRN.qcCheckedAt && (
                      <>
                        <Label>QC Checked At</Label>
                        <p className="font-medium text-sm text-muted-foreground">{selectedGRN.qcCheckedAt ? format(new Date(selectedGRN.qcCheckedAt), "PPP p") : ""}</p>
                        {selectedGRN.qcCheckedUserName && (
                          <p className="font-medium text-xs text-muted-foreground">by {selectedGRN.qcCheckedUserName}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* QC Dialog */}
        <Dialog open={showQcDialog} onOpenChange={setShowQcDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Quality Control Check</DialogTitle>
              <DialogDescription>
                Please perform quality control check for the received goods.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-between px-1">
                <div className="grid gap-1">
                  <Label>QC Status</Label>
                  <span className="text-sm text-muted-foreground">
                    Toggle switch to mark QC as Pass or Fail
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Label>{qcStatus ? "Pass" : "Fail"}</Label>
                  <Switch
                    checked={qcStatus}
                    onCheckedChange={(checked) => {
                      setQcStatus(checked)
                      if (checked) setQcReason("")
                    }}
                  />
                </div>
              </div>

              {!qcStatus && (
                <div className="grid gap-2">
                  <Label htmlFor="qcReason">Failure Reason</Label>
                  <Input
                    id="qcReason"
                    placeholder="Enter reason for QC failure"
                    value={qcReason}
                    onChange={(e) => setQcReason(e.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={!qcStatus && !qcReason}
                onClick={() => {
                  handleQcSubmit();
                  setShowQcDialog(false);
                }}
              >
                Submit QC
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Batch Creation Dialog */}
        <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Batch from GRN</DialogTitle>
              <DialogDescription>
                Confirm and create batch(es) from the approved GRN. Batch numbers will be auto-generated by the system.
              </DialogDescription>
            </DialogHeader>
            {selectedGRN && (
              <div className="space-y-6">
                {/* GRN Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">GRN Number</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedGRN.grnNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">GRN Date</Label>
                    <p className="text-sm text-muted-foreground mt-1">{format(new Date(selectedGRN.grnDate), "PPP")}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Supplier</Label>
                    <p className="text-sm text-muted-foreground mt-1">{(selectedGRN as any).Supplier?.name || selectedGRN.supplier?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Store</Label>
                    <p className="text-sm text-muted-foreground mt-1">{(selectedGRN as any).Store?.name || selectedGRN.store?.name}</p>
                  </div>
                </div>

                {/* Items List */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Items in this GRN:</Label>
                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Item Name</TableHead>
                          <TableHead className="text-xs">Quantity</TableHead>
                          <TableHead className="text-xs">Unit</TableHead>
                          <TableHead className="text-xs">Cost Price</TableHead>
                          <TableHead className="text-xs">Expire Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const grnItems = ((selectedGRN as any).GRNItems || selectedGRN.items || [])
                          if (grnItems.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
                                  No items found in this GRN
                                </TableCell>
                              </TableRow>
                            )
                          }
                          return grnItems.map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="text-xs">
                                {(item.Item?.name || item.item?.name)}
                                {(item.Item?.color || item.item?.color) && ` (${item.Item?.color || item.item?.color})`}
                              </TableCell>
                              <TableCell className="text-xs">{item.grnQty || item.availableQty || 0}</TableCell>
                              <TableCell className="text-xs">{item.Item?.unit || item.item?.unit || 'Pcs'}</TableCell>
                              <TableCell className="text-xs">{item.costPrice?.toFixed(2) || '0.00'}</TableCell>
                              <TableCell className="text-xs">
                                {item.expireDate ? format(new Date(item.expireDate), "dd/MMM/yyyy") : 'Not specified'}
                              </TableCell>
                            </TableRow>
                          ))
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Info Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Auto-Generation:</strong> The system will automatically generate batch number(s) and create batch items from all the items in this GRN. If items have different expire dates, separate batches will be created for each group.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowBatchDialog(false)}
                disabled={createBatchLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBatch}
                disabled={createBatchLoading}
              >
                {createBatchLoading ? "Creating Batch..." : "Create Batch"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Goods Receive Note</DialogTitle>
              <DialogDescription>Update GRN information.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-grnNumber">GRN Number</Label>
                  <Input
                    id="edit-grnNumber"
                    disabled
                    value={formData.grnNumber}
                    onChange={(e) => setFormData({ ...formData, grnNumber: e.target.value })}
                    placeholder="GRN number"
                    readOnly
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-grnDate">GRN Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        disabled
                        variant="outline"
                        className={cn("justify-start text-left font-normal", !grnDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {grnDate ? format(grnDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={grnDate}
                        onSelect={(date) => {
                          setGrnDate(date)
                          setFormData({ ...formData, grnDate: date ? format(date, "yyyy-MM-dd") : "" })
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Purchase Order Display (Read-only in edit mode) */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-purchaseOrder">Purchase Order</Label>
                  <Input
                    id="edit-purchaseOrder"
                    value={selectedGRN?.PurchaseOrder?.orderNumber || "No PO"}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-supplierId" className="mb-1 block">Supplier <span className="text-red-500">*</span></Label>
                  <SupplierSelect
                    suppliers={suppliers}
                    value={formData.supplierId}
                    onValueChange={(value) => setFormData({ ...formData, supplierId: Number.parseInt(value) })}
                    placeholder="Search and select supplier"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-storeId">Store <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.storeId.toString()}
                    onValueChange={(value) => setFormData({ ...formData, storeId: Number.parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id.toString()}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Purchase Order Items Display (if GRN has PO) */}
              {selectedGRN?.PurchaseOrder && (
                <div className="space-y-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Label className="text-base font-semibold text-blue-800">Purchase Order Items</Label>
                    <p className="text-sm text-blue-600 mb-3">Items from purchase order: {selectedGRN.PurchaseOrder.orderNumber}</p>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Ordered Qty</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>GRN Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedGRN.PurchaseOrder.PurchaseOrderItems?.map((poItem: any, index: number) => {
                            const grnQtyForItem = formData.items
                              .filter(item => item.itemId === poItem.itemId)
                              .reduce((sum, item) => sum + item.grnQty, 0);

                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {poItem.Item?.color} {poItem.Item?.name} {poItem.Item?.country} ({poItem.Item?.weight}kg)
                                </TableCell>
                                <TableCell>{poItem.quantity} {poItem.Item?.unit || ""}</TableCell>
                                <TableCell>{poItem.unitPrice.toFixed(2)}</TableCell>
                                <TableCell>{(poItem.quantity * poItem.unitPrice).toFixed(2)}</TableCell>
                                <TableCell>
                                  <span className={grnQtyForItem > poItem.quantity ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                                    {grnQtyForItem} / {poItem.quantity}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          }) || []}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {/* GRN Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">GRN Items</Label>
                  {selectedGRN?.PurchaseOrder ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Enter barcode"
                          value={poItemBarcodeInput}
                          onChange={(e) => setPOItemBarcodeInput(e.target.value)}
                          className="w-64"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              // For edit mode, we need to modify the PO item lookup slightly
                              if (!poItemBarcodeInput.trim()) {
                                toast({
                                  title: "Error",
                                  description: "Please enter a barcode",
                                  variant: "destructive",
                                })
                                return
                              }

                              const poItem = (selectedGRN.PurchaseOrder?.PurchaseOrderItems || selectedGRN.PurchaseOrder?.items || [])
                                .find((item: any) => (item.Item?.barcode || item.item?.barcode) === poItemBarcodeInput.trim())

                              if (!poItem) {
                                toast({
                                  title: "Error",
                                  description: "Item with this barcode not found in selected purchase order",
                                  variant: "destructive",
                                })
                                return
                              }

                              // Check if item already exists in the GRN list
                              const existingItem = formData.items.find(grnItem => grnItem.itemId === poItem.itemId)
                              if (existingItem) {
                                toast({
                                  title: "Warning",
                                  description: "Item already exists in the GRN list",
                                  variant: "destructive",
                                })
                                return
                              }

                              const convertedCostPrice = getCostPriceForPOItem(poItem, selectedGRN.PurchaseOrder)
                              const newItem = {
                                itemId: poItem.itemId,
                                grnQty: poItem.quantity, // Auto-populate with PO quantity
                                availableQty: poItem.quantity,
                                weight: ((poItem.Item || poItem.item)?.weight || 1) * poItem.quantity,
                                costPrice: convertedCostPrice,
                                expireDate: "",
                                item: poItem.Item || poItem.item,
                                remarks: "",
                                damageReason: "",
                                rejectedQty: 0,
                                coldRoomId: 0,
                                palletRackId: 0,
                                coldRoomName: "",
                                rackCode: "",
                                poOrderedQty: poItem.quantity,
                              }

                              setFormData(prev => ({
                                ...prev,
                                items: [...prev.items, newItem]
                              }))

                              setPOItemBarcodeInput("")
                              toast({
                                title: "Success",
                                description: `Item "${(poItem.Item?.name || poItem.item?.name)}" added to GRN from PO`,
                                variant: "default",
                              })
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!poItemBarcodeInput.trim()) {
                              toast({
                                title: "Error",
                                description: "Please enter a barcode",
                                variant: "destructive",
                              })
                              return
                            }

                            const poItem = (selectedGRN.PurchaseOrder?.PurchaseOrderItems || selectedGRN.PurchaseOrder?.items || [])
                              .find((item: any) => (item.Item?.barcode || item.item?.barcode) === poItemBarcodeInput.trim())

                            if (!poItem) {
                              toast({
                                title: "Error",
                                description: "Item with this barcode not found in selected purchase order",
                                variant: "destructive",
                              })
                              return
                            }

                            // Check if item already exists in the GRN list
                            const existingItem = formData.items.find(grnItem => grnItem.itemId === poItem.itemId)
                            if (existingItem) {
                              toast({
                                title: "Warning",
                                description: "Item already exists in the GRN list",
                                variant: "destructive",
                              })
                              return
                            }

                            const convertedCostPrice = getCostPriceForPOItem(poItem, selectedGRN.PurchaseOrder)
                            const newItem = {
                              itemId: poItem.itemId,
                              grnQty: poItem.quantity, // Auto-populate with PO quantity
                              availableQty: poItem.quantity,
                              weight: ((poItem.Item || poItem.item)?.weight || 1) * poItem.quantity,
                              costPrice: convertedCostPrice,
                              expireDate: "",
                              item: poItem.Item || poItem.item,
                              remarks: "",
                              damageReason: "",
                              rejectedQty: 0,
                              coldRoomId: 0,
                              palletRackId: 0,
                              coldRoomName: "",
                              rackCode: "",
                              poOrderedQty: poItem.quantity,
                            }

                            setFormData(prev => ({
                              ...prev,
                              items: [...prev.items, newItem]
                            }))

                            setPOItemBarcodeInput("")
                            toast({
                              title: "Success",
                              description: `Item "${(poItem.Item?.name || poItem.item?.name)}" added to GRN from PO`,
                              variant: "default",
                            })
                          }}
                          disabled={!poItemBarcodeInput.trim()}
                        >
                          Add by Barcode
                        </Button>
                      </div>
                      <div className="text-muted-foreground">or</div>
                      <ItemSelect
                        items={(() => {
                          const poItems = (selectedGRN.PurchaseOrder?.PurchaseOrderItems || selectedGRN.PurchaseOrder?.items || []);
                          return poItems.map((pi: any) => pi.Item || pi.item).filter((it: any) => !!it);
                        })()}
                        value=""
                        onValueChange={(value) => {
                          const poItem = (selectedGRN.PurchaseOrder?.PurchaseOrderItems || selectedGRN.PurchaseOrder?.items || []).find((item: any) => item.itemId === Number(value));
                          if (poItem) {
                            const convertedCostPrice = getCostPriceForPOItem(poItem, selectedGRN.PurchaseOrder)
                            const newItem = {
                              itemId: poItem.itemId,
                              grnQty: poItem.quantity, // Auto-populate with PO quantity
                              availableQty: poItem.quantity,
                              weight: (poItem.item?.weight || 1) * poItem.quantity,
                              costPrice: convertedCostPrice,
                              expireDate: "",
                              item: poItem.item,
                              remarks: "",
                              damageReason: "",
                              rejectedQty: 0,
                              coldRoomId: 0,
                              palletRackId: 0,
                              coldRoomName: "",
                              rackCode: "",
                              poOrderedQty: poItem.quantity,
                            };
                            setFormData(prev => ({
                              ...prev,
                              items: [...prev.items, newItem]
                            }));
                          }
                        }}
                        placeholder="Add item from PO"
                        className="w-60"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter barcode to add item"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        className="w-64"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addItemByBarcode()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addItemByBarcode}
                        disabled={!barcodeInput.trim()}
                      >
                        Add by Barcode
                      </Button>
                      <div className="text-muted-foreground">or</div>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                    </div>
                  )}
                </div>

                {formData.items.length > 0 && (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table className="min-w-[1000px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px]">Item</TableHead>
                          {selectedGRN?.PurchaseOrder && <TableHead className="w-20">PO Qty</TableHead>}
                          <TableHead >Quantity</TableHead>
                          <TableHead className="w-24">Cost Price</TableHead>
                          <TableHead className="min-w-[130px]">Expire Date</TableHead>
                          <TableHead className="w-12">Total</TableHead>
                          <TableHead className="w-4">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.items.map((item, index) => {
                          const selectedPO = selectedGRN?.PurchaseOrder;
                          const poItem = (selectedPO?.PurchaseOrderItems || selectedPO?.items || []).find((pi: any) => pi.itemId === item.itemId);
                          const totalUsedQty = formData.items
                            .filter(i => i.itemId === item.itemId)
                            .reduce((sum, i) => sum + i.grnQty, 0);
                          const remainingQty = poItem ? poItem.quantity - totalUsedQty + item.grnQty : 0;

                          return (
                            <TableRow key={index}>
                              <TableCell className="min-w-[180px]">
                                {selectedPO ? (
                                  <div className="text-sm">
                                    {item.item?.name} ({item.item?.barcode})
                                  </div>
                                ) : (
                                  <ItemSelect
                                    items={items}
                                    value={item.itemId}
                                    onValueChange={(value) => updateItem(index, "itemId", Number.parseInt(value))}
                                    disabledItemIds={formData.items.filter((_, i) => i !== index).map(i => i.itemId)}
                                    placeholder="Select item"
                                  />
                                )}
                              </TableCell>
                              {selectedPO && (
                                <TableCell className="w-20">
                                  <div className="text-sm text-center">
                                    <div>{poItem?.quantity || 0}</div>
                                    <div className="text-xs text-muted-foreground">
                                      Rem: {remainingQty}
                                    </div>
                                  </div>
                                </TableCell>
                              )}
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.grnQty}
                                  onChange={(e) => updateItem(index, "grnQty", Number.parseFloat(e.target.value) || 0)}
                                  className="w-full text-sm"
                                  max={selectedPO ? remainingQty : undefined}
                                  min="0"
                                  onFocus={(e) => e.target.select()}
                                />
                                {selectedPO && remainingQty < item.grnQty && (
                                  <div className="text-xs text-red-500 mt-1">Exceeds limit!</div>
                                )}
                              </TableCell>
                              {/* <TableCell className="w-12">
                                <span className="font-medium text-sm">{item.weight}</span>
                              </TableCell> */}
                              {/* <TableCell >
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.weight}
                                  onChange={(e) => updateItem(index, "weight", Number.parseFloat(e.target.value) || 0)}
                                  className="w-full text-sm"
                                />
                              </TableCell> */}
                              <TableCell className="w-24">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.costPrice}
                                  onChange={(e) => updateItem(index, "costPrice", Number.parseFloat(e.target.value) || 0)}
                                  className="w-full text-sm"
                                  readOnly={selectedPO}
                                />
                              </TableCell>

                              <TableCell className="min-w-[130px]">
                                <Input
                                  type="date"
                                  value={item.expireDate}
                                  onChange={(e) => updateItem(index, "expireDate", e.target.value)}
                                  className="w-full text-sm h-9"
                                />
                              </TableCell>
                              <TableCell className="w-12">
                                <span className="font-medium text-sm">{((item.grnQty || 0) * (item.costPrice || 0)).toFixed(2)}</span>
                              </TableCell>
                              <TableCell className="w-4">
                                <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Totals */}
                {formData.items.length > 0 && (
                  <div className="flex justify-between space-x-4 pt-4 border-t">
                    <div className="text-left">
                      {selectedGRN?.PurchaseOrder && (
                        <div className="text-sm text-blue-600 border-t mt-2 pt-2">
                          <div>PO Total: {(() => {
                            const total = (selectedGRN.PurchaseOrder.PurchaseOrderItems || selectedGRN.PurchaseOrder.items || []).reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
                            return (total || 0).toFixed(2);
                          })()}</div>
                          <div>Remaining: {(() => {
                            const poTotal = (selectedGRN.PurchaseOrder.PurchaseOrderItems || selectedGRN.PurchaseOrder.items || []).reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0) || 0;
                            const grnTotal = formData.items.reduce((sum, item) => sum + ((item.grnQty || 0) * (item.costPrice || 0)), 0);
                            return (poTotal - grnTotal).toFixed(2);
                          })()}</div>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total Items: {formData.items.length}</div>
                      <div className="text-sm text-muted-foreground">
                        Total Quantity: {formData.items.reduce((sum, item) => sum + item.grnQty, 0)}
                      </div>
                      {/* <div className="text-sm text-muted-foreground">
                        Total Weight: {formData.items.reduce((sum, item) => sum + (item.weight || 0), 0).toFixed(2)} kg
                      </div> */}
                      <div className="text-lg font-semibold">
                        Total Amount: {formData.items.reduce((sum, item) => sum + ((item.grnQty || 0) * (item.costPrice || 0)), 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleEdit} size="sm">
                Update GRN
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
