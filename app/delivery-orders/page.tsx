"use client"

import { useState, useEffect, useMemo } from "react"
import * as XLSX from "xlsx"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { deliveryOrdersApi, salesOrdersApi, driversApi, vehiclesApi, routesApi, storesApi, Store, stockApi } from "@/lib/api"
import { toastr } from "@/lib/toastr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, MoreHorizontal, Truck, MapPin, Clock, CheckCircle, CheckCircle2, AlertTriangle, Eye, Edit, Trash2, Route, Printer, FileText, BarChart3, X, Package, Send, CircleDot, HourglassIcon, Loader2, Check, ChevronsUpDown, FileDown } from "lucide-react"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { CustomerSelect } from "@/components/customer/customer-select"
import { customersApi, type Customer } from "@/lib/api"
import { useAuth } from "@/lib/auth"

export default function DeliveryOrdersPage() {
  const { hasPermission } = useAuth()
  // State for approved selection and summary
  const [selectedApprovedIds, setSelectedApprovedIds] = useState<any[]>([]);
  const [showApprovedSummaryDialog, setShowApprovedSummaryDialog] = useState(false);
  const [summarizedItems, setSummarizedItems] = useState<any[]>([]);
  const [creatingSummary, setCreatingSummary] = useState(false);
  const [createdSummaryCode, setCreatedSummaryCode] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Show summary dialog for selected approved orders
  const handleShowSummaryDialog = () => {
    // Merge items from selected orders
    const selectedOrders = deliveryOrders.filter((o: any) => selectedApprovedIds.includes(o.id));
    const itemMap: Record<string, { itemName: string; totalQty: number }> = {};
    selectedOrders.forEach((order: any) => {
      order.DeliveryOrderItems.forEach((item: any) => {
        const key = item.itemId;
        if (!itemMap[key]) {
          itemMap[key] = { itemName: item.Item?.name, totalQty: 0 };
        }
        itemMap[key].totalQty += item.qty;
      });
    });
    console.log(itemMap);

    setSummarizedItems(Object.values(itemMap));
    setShowApprovedSummaryDialog(true);
  };

  // Create summary for backend
  const handleCreateSummary = async () => {
    setCreatingSummary(true);
    try {
      console.log('Calling createSummary with orderIds:', selectedApprovedIds);

      // Send orderIds to backend API endpoint
      const resp = await deliveryOrdersApi.createSummary({ orderIds: selectedApprovedIds }) as any;
      console.log('createSummary response:', resp);

      // Handle the response structure from backend
      const summaryCode = resp?.code || resp?.summary?.code || `DOS-${Date.now()}`;
      setCreatedSummaryCode(summaryCode);

      console.log(`Summary created successfully: ${summaryCode}, Items: ${resp?.itemsCreated || 0}`);
      await fetchDeliveryOrders()
    } catch (err: any) {
      console.error('Summary creation failed:', err);
      toastr.error(err.message || "Failed to create summary");
    } finally {
      setCreatingSummary(false);
    }
  };

  // Print PDF handler - Delivery Order Summary (Same Layout as Packing Slip)
  const handlePrintSummaryPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    // Helper: Right align text
    const rightText = (text: string, y: number, x: number = pageWidth - margin) => {
      doc.text(text, x, y, { align: "right" });
    };

    let yPos = 20;

    // 1. Header Section (Logo + Company Details)
    // Logo
    try {
      doc.addImage("/assets/codeaqua_logo.png", "PNG", margin, yPos - 5, 40, 35);
    } catch (e) {
      console.error("Failed to add logo:", e);
      doc.setTextColor(76, 175, 80);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Code Aqua", margin, yPos + 10);
    }

    // Company Details
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const companyX = margin + 50;
    doc.text("Code Aqua ERP Solutions", companyX, yPos);

    yPos += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("B03, Crescat Boulevard, No 77 Colombo 03", companyX, yPos);
    yPos += 4;
    doc.text("VAT, 102861841 7000", companyX, yPos);
    yPos += 4;
    doc.text("+9471672564", companyX, yPos);
    yPos += 4;
    doc.text("info@bhlanka.com", companyX, yPos);
    yPos += 4;
    doc.text("www.bhlanka.com", companyX, yPos);

    yPos += 10;

    // 2. Title "Delivery Summary"
    const selectedOrders = deliveryOrders.filter((o: any) => selectedApprovedIds.includes(o.id));
    const isPending = selectedOrders.every((o: any) => o.status === "Pending");

    doc.setFontSize(24);
    doc.setTextColor(70, 130, 180); // Steel Blue style color
    doc.setFont("helvetica", "normal");
    doc.text(`Delivery Summary ${isPending ? "(PENDING)" : ""}`, pageWidth - margin, yPos, { align: "right" });

    yPos += 10;

    // 3. Summary Details (Report Info)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const leftColX = margin;
    const rightColX = pageWidth - margin - 80;

    // Left Column Info
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY DETAILS", leftColX, yPos);
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated Date: ${format(new Date(), 'dd/MM/yyyy')}`, leftColX, yPos);
    yPos += 5;
    doc.text(`Generated Time: ${format(new Date(), 'HH:mm:ss')}`, leftColX, yPos);
    yPos += 5;
    if (createdSummaryCode) {
      doc.text(`Summary Code: ${createdSummaryCode}`, leftColX, yPos);
      yPos += 5;
    }

    // Reset Y for Right Column if needed, or continue below
    yPos += 5;

    // Right Column Info (Stats)
    // We can place total items/orders here aligned to right similar to invoice no/date
    const statsY = yPos - 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    // Align with the "SUMMARY DETAILS" header line approx
    // Using simple layout below left column for now as there isn't strict "Bill To" data here

    doc.text(`SELECTED ORDERS: ${selectedApprovedIds.length}`, leftColX, yPos);
    yPos += 5;
    doc.text(`TOTAL ITEMS: ${summarizedItems.length}`, leftColX, yPos);
    yPos += 15;


    // 4. Items Table
    const tableCols = [
      { label: "NO", x: margin, w: 15 },
      { label: "ITEM CODE", x: margin + 15, w: 30 },
      { label: "DESCRIPTION", x: margin + 45, w: 90 },
      { label: "QTY", x: pageWidth - margin, w: 20, align: "right" }
    ];

    // Header Background
    doc.setFillColor(225, 240, 255); // Light blue
    doc.rect(margin, yPos - 4, pageWidth - (margin * 2), 8, 'F');

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 149, 237); // Cornflower Blue equivalent
    doc.setFontSize(9);

    doc.text("NO", tableCols[0].x, yPos + 1);
    doc.text("ITEM CODE", tableCols[1].x, yPos + 1);
    doc.text("DESCRIPTION", tableCols[2].x, yPos + 1);
    doc.text("QTY", tableCols[3].x, yPos + 1, { align: "right" });

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    // Items Loop
    summarizedItems.forEach((item: any, idx: number) => {
      // Check Page Break
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        // Draw Header on new page? (Optional, kept simple for now)
      }

      const itemNo = (idx + 1).toString();
      // Item code isn't explicitly in the summarizedItems map key logic (itemId used), 
      // usually we might need to fetch it or store it. 
      // Assuming item key or name might have it, or we leave it blank/mock if not available in this specific state view.
      // For now, let's try to see if itemId is usable or just placeholder
      const itemCode = "-";
      const itemName = item.itemName || "Unknown Item";
      const quantity = `${item.totalQty} ${item.unit || ''}`;

      doc.setFont("helvetica", "normal");
      doc.text(itemNo, tableCols[0].x, yPos);

      doc.setFont("helvetica", "bold");
      doc.text(itemCode, tableCols[1].x, yPos);

      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(itemName, tableCols[2].w);
      doc.text(descLines, tableCols[2].x, yPos);

      doc.text(quantity, tableCols[3].x, yPos, { align: "right" });

      const lineHeight = 6;
      yPos += Math.max(descLines.length * 5, lineHeight);
    });

    // Save
    const filename = `Delivery-Summary-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
    doc.save(filename);
  };
  // Approve handler
  const handleApproveOrder = async (order: any) => {
    if (!order?.id) return;
    setApproveLoading(true)
    try {
      await deliveryOrdersApi.approveReject(order.id, { status: "Approved" });
      // Reload delivery orders
      await fetchDeliveryOrders();
      setViewDialogOpen(false);
      toastr.success("Delivery order approved successfully");
    } catch (err: any) {
      toastr.error(err.message || "Failed to approve delivery order");
    } finally {
      setApproveLoading(false)
    }
  }

  // Finalize delivery handler for In Transit orders
  const handleFinalizeDelivery = async () => {
    if (!selectedOrder?.id) return;

    // Validate quantities first
    if (!validateQuantities()) {
      return;
    }

    setFinalizeLoading(true)
    setFinalizeError("")

    try {
      // Prepare the payload for finalization
      const finalizationData = {
        deliveryOrderId: selectedOrder.id,
        items: selectedOrder.DeliveryOrderItems.map((item: any) => {
          const quantities = itemQuantities[item.id] || {
            acceptedQty: item.qty,
            rejectedQty: 0,
            damagedQty: 0,
            weightDiffQty: 0
          }

          return {
            itemId: item.itemId,
            acceptedQty: quantities.acceptedQty,
            rejectedQty: quantities.rejectedQty,
            damagedQty: quantities.damagedQty,
            weightDiffQty: quantities.weightDiffQty
          }
        })
      }

      // Call the finalize API
      await deliveryOrdersApi.finalize(finalizationData)

      // Reload delivery orders and close dialog
      await fetchDeliveryOrders()
      setViewDialogOpen(false)

      // Reset state
      setItemQuantities({})

    } catch (err: any) {
      setFinalizeError(err.message || "Failed to finalize delivery order")
    } finally {
      setFinalizeLoading(false)
    }
  }

  // Confirm delivery handler for Finalized orders
  const handleConfirmDelivered = async () => {
    if (!selectedOrder?.id) return;

    setConfirmLoading(true)
    setConfirmError("")

    try {
      // Call the confirm-delivered API
      await deliveryOrdersApi.confirmDelivered({ deliveryOrderId: selectedOrder.id })

      // Reload delivery orders and close dialog
      await fetchDeliveryOrders()
      setViewDialogOpen(false)

    } catch (err: any) {
      setConfirmError(err.message || "Failed to confirm delivery")
    } finally {
      setConfirmLoading(false)
    }
  }

  // Print PDF handler - Delivery Note Format
  const handlePrintPDF = (order: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    // 1. Header Section (Logo + Company Details)
    let yPos = 20;

    // Logo
    try {
      // Using the logo from the public assets folder
      doc.setFillColor(253, 203, 88); // Yellowish circle
      doc.circle(margin + 15, yPos + 5, 15, "F");
      doc.addImage("/assets/fruit_easy_logo.png", "PNG", margin, yPos - 10, 30, 30);
    } catch (e) {
      console.error("Failed to add logo to PDF:", e);
      doc.setFillColor(253, 203, 88); // Yellowish circle
      doc.circle(margin + 15, yPos + 5, 15, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("fe", margin + 10, yPos + 2);
      doc.setFontSize(8);
      doc.text("FRUIT", margin + 8, yPos + 6);
      doc.text("eazy", margin + 9, yPos + 10);
    }

    yPos += 30;

    // Company Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Fruit Eazy", margin, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("No. 358,", margin, yPos);
    yPos += 4;
    doc.text("Jana Jaya City Mall,", margin, yPos);
    yPos += 4;
    doc.text("Rajagiriya Western Province", margin, yPos);
    yPos += 4;
    doc.text("SriLanka", margin, yPos);
    yPos += 4;
    doc.text("0744118869", margin, yPos);
    yPos += 4;
    doc.text("office@ceyloncarb.com", margin, yPos);

    // DELIVERY NOTE title
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text("DELIVERY NOTE", pageWidth - margin, 25, { align: "right" });

    // INV Number
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`# ${order.doNumber || order.SalesOrder?.invoiceNumber || "INV-000"}`, pageWidth - margin, 32, { align: "right" });

    // Balance Due
    // doc.setFontSize(9);
    // doc.text("Balance Due", pageWidth - margin, 42, { align: "right" });
    // doc.setFontSize(12);
    // doc.text("LKR0.00", pageWidth - margin, 48, { align: "right" }); // Assuming 0.00 since it's a delivery note unless order has balance

    yPos += 15;

    // Bill To & Delivery To
    const billToY = yPos;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Bill To", margin, billToY);

    doc.setFont("helvetica", "bold");
    const customerName = order.SalesOrder?.Customer?.name || order.Customer?.name || "-";
    doc.text(customerName, margin, billToY + 5);

    doc.setFont("helvetica", "normal");
    const customerAddress = order.SalesOrder?.Customer?.address || order.Customer?.address || "";
    const billAddressLines = doc.splitTextToSize(customerAddress, 80);
    doc.text(billAddressLines, margin, billToY + 10);

    const deliveryToY = billToY + 5 + (billAddressLines.length * 5) + 10;
    doc.text("Delivery To", margin, deliveryToY);

    const shipName = order.SalesOrder?.Customer?.name || order.Customer?.name || "-";
    const deliveryAddress = order.deliveryAddress || customerAddress;
    const shipAddressLines = doc.splitTextToSize(deliveryAddress, 80);

    doc.setFont("helvetica", "normal");
    doc.text(shipName, margin, deliveryToY + 5);
    doc.text(shipAddressLines, margin, deliveryToY + 10);

    yPos = deliveryToY + 5 + (shipAddressLines.length * 5) + 15;

    // Date
    const dateY = yPos - 10;
    doc.setFontSize(10);
    doc.text("Date :", pageWidth - 50, dateY, { align: "right" });
    doc.text(order.deliveryDate ? format(new Date(order.deliveryDate), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy"), pageWidth - margin, dateY, { align: "right" });

    // Table Data
    const tableBody: any[] = [];
    if (order.DeliveryOrderItems && order.DeliveryOrderItems.length > 0) {
      order.DeliveryOrderItems.forEach((item: any, index: number) => {
        const itemName = item.Item?.name || item.itemName || "-";
        const qty = parseFloat(item.qty).toFixed(2);
        tableBody.push([
          (index + 1).toString(),
          itemName,
          qty
        ]);
      });
    }

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Item & Description', 'Qty']],
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
        2: { cellWidth: 25, halign: 'right' }
      },
      styles: {
        fontSize: 9,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      margin: { left: margin, right: margin }
    });

    // Notes & Footer
    let finalY = (doc as any).lastAutoTable.finalY + 15;

    if (finalY > pageHeight - 60) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Notes", margin, finalY);

    finalY += 6;
    doc.setFontSize(9);
    doc.text("Bank Details", margin, finalY);

    finalY += 6;
    doc.text("Account Name: Ceylon Carb Private Limited", margin, finalY);
    finalY += 4;
    doc.text("Bank: National Development Bank (NDB)", margin, finalY);
    finalY += 4;
    doc.text("Bank Brach: Kohuwela", margin, finalY);
    finalY += 4;
    doc.text("Account Number: 111000305711", margin, finalY);

    finalY += 10;
    const notesText = "- Goods must be checked at the time of delivery. By signing the delivery note, the customer confirms that the items have been received in good condition and as per the invoice.";
    const notesLines = doc.splitTextToSize(notesText, pageWidth - (margin * 2));
    doc.text(notesLines, margin, finalY);

    finalY += (notesLines.length * 5) + 15;

    if (finalY > pageHeight - 20) {
      doc.addPage();
      finalY = 20;
    }

    doc.text("Authorized Signature", margin, finalY);
    doc.line(margin + 32, finalY, margin + 90, finalY);

    // Save
    const fileName = `DeliveryNote_${order.doNumber || "Draft"}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
  }

  // Delivery Order Summary generation
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState("")
  const [summaryData, setSummaryData] = useState<any>(null)
  const [summaryFilters, setSummaryFilters] = useState({
    routeId: "",
    deliveryDate: format(new Date(), "yyyy-MM-dd"),
    drivername: "",
    vehiclename: "",
  })
  useEffect(() => {
    setSummaryData(null);
    setSummaryError("");
  }, [summaryFilters]);

  // Handle summary dialog open/close with data clearing
  const handleSummaryDialogChange = (open: boolean) => {
    setSummaryDialogOpen(open)

    if (open) {
      // Clear previous data when opening the dialog
      setSummaryData(null)
      setSummaryError("")
      setSummaryFilters({
        routeId: "",
        deliveryDate: format(new Date(), "yyyy-MM-dd"),
        drivername: "",
        vehiclename: "",
      })
    }
  }

  const handlePrintSummary = () => {
    if (!summaryData) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height

    // Colors
    const primaryColor: [number, number, number] = [37, 99, 235]
    const grayColor: [number, number, number] = [156, 163, 175]
    const lightGrayColor: [number, number, number] = [243, 244, 246]
    const successColor: [number, number, number] = [34, 197, 94]

    // Header Section
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 30, 'F')

    // Company Name
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Code Aqua ERP Solutions', 20, 20)

    // Document title
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Stock Release Summary', pageWidth - 20, 20, { align: 'right' })

    let yPos = 50
    doc.setTextColor(0, 0, 0)

    // Summary Filters Section
    doc.setFillColor(...lightGrayColor)
    doc.rect(20, yPos - 5, pageWidth - 40, 25, 'F')
    doc.setDrawColor(...grayColor)
    doc.rect(20, yPos - 5, pageWidth - 40, 25, 'S')

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('FILTERS APPLIED', 25, yPos + 5)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Filter details
    const selectedRoute = routes.find(r => r.id === Number(summaryFilters.routeId))

    const filterText = [
      (summaryFilters.routeId !== "all" && selectedRoute) ? `Route: ${selectedRoute.routeName}` : '',
      summaryFilters.deliveryDate ? `Delivery Date: ${summaryFilters.deliveryDate}` : ''
    ].filter(Boolean).join(' | ') || 'No filters applied'

    doc.text(filterText, 25, yPos + 15)

    yPos += 35

    // Summary Statistics
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('DELIVERY STATISTICS', 25, yPos)
    yPos += 15

    // Stats grid
    const stats = [
      { label: 'Total Items to Release', value: summaryData.totalItems || 0 },
      { label: 'Total Quantity', value: summaryData.totalQty || 0 },
      { label: 'Items Can Fulfill', value: summaryData.itemsCanFulfill || 0 },
      { label: 'Items with Shortage', value: summaryData.itemsWithShortage || 0 }
    ]

    const statCols = 4
    const statColWidth = (pageWidth - 40) / statCols

    stats.forEach((stat, index) => {
      const col = index % statCols
      const row = Math.floor(index / statCols)
      const x = 20 + col * statColWidth
      const y = yPos + row * 20

      // Stat box
      doc.setFillColor(248, 250, 252)
      doc.rect(x, y - 3, statColWidth - 5, 15, 'F')
      doc.setDrawColor(...grayColor)
      doc.rect(x, y - 3, statColWidth - 5, 15, 'S')

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(stat.label, x + 5, y + 4)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(String(stat.value), x + 5, y + 10)
    })

    yPos += 30

    // Items Table
    if (summaryData.items && summaryData.items.length > 0) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('ITEMS TO RELEASE FOR VEHICLE', 25, yPos)
      yPos += 15

      // Table headers
      const headers = ['Item Name', 'Wanted Qty', 'Available Qty', 'Status', 'Assigned Batches']
      const colWidths = [45, 25, 25, 25, 60]
      const colX = [20, 65, 90, 115, 140]

      // Header background
      doc.setFillColor(...primaryColor)
      doc.rect(20, yPos - 2, pageWidth - 40, 12, 'F')

      // Header text
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      headers.forEach((header, index) => {
        doc.text(header, colX[index], yPos + 6)
      })

      yPos += 12
      doc.setTextColor(0, 0, 0)

      // Table rows
      summaryData.items.forEach((item: any, index: number) => {
        // Check if we need a new page
        if (yPos > pageHeight - 40) {
          doc.addPage()
          yPos = 30
        }

        // Alternate row colors - highlight shortage items in red
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(20, yPos - 2, pageWidth - 40, 12, 'F')
        }
        if (!item.canFulfill) {
          doc.setFillColor(254, 242, 242) // Red background for shortage items
          doc.rect(20, yPos - 2, pageWidth - 40, 12, 'F')
        }

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')

        // Item name
        doc.text(item.itemName || 'N/A', colX[0], yPos + 6)

        // Wanted quantity
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...primaryColor)
        doc.text(String(item.wantedQty || item.totalQty || 0), colX[1], yPos + 6)
        doc.setTextColor(0, 0, 0)

        // Available quantity
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        const availableColor: [number, number, number] = item.totalAvailableQty >= item.wantedQty ? [34, 197, 94] : [239, 68, 68] // Green or Red
        doc.setTextColor(...availableColor)
        doc.text(String(item.totalAvailableQty || 0), colX[2], yPos + 6)
        doc.setTextColor(0, 0, 0)

        // Status
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        if (item.canFulfill) {
          doc.setTextColor(34, 197, 94) // Green
          doc.text('CAN FULFILL', colX[3], yPos + 6)
        } else {
          doc.setTextColor(239, 68, 68) // Red
          doc.text('SHORTAGE', colX[3], yPos + 4)
          doc.text(`-${item.shortageQty}`, colX[3], yPos + 8)
        }
        doc.setTextColor(0, 0, 0)

        // Assigned Batch numbers
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        if (item.batches && item.batches.length > 0) {
          const batchText = item.batches.map((batch: any) => `${batch.batchNumber}(${batch.availableQty})`).join(', ')
          const splitText = doc.splitTextToSize(batchText, colWidths[4] - 3)
          doc.text(splitText, colX[4], yPos + 6)
        } else {
          doc.setTextColor(...grayColor)
          doc.text('No Batch assigned', colX[4], yPos + 6)
          doc.setTextColor(0, 0, 0)
        }

        yPos += 14
      })
    } else {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(...grayColor)
      doc.text('No items found matching the criteria', 25, yPos)
    }

    // // Instructions for Stock Keeper Section
    // yPos += 25

    // // Check if we have enough space for instructions, if not start a new page
    // if (yPos > pageHeight - 100) {
    //   doc.addPage()
    //   yPos = 30
    // }

    // // Instructions Header
    // doc.setFillColor(255, 243, 205) // Yellow background similar to UI
    // doc.rect(20, yPos - 5, pageWidth - 40, 15, 'F')
    // doc.setDrawColor(245, 158, 11) // Yellow border
    // doc.rect(20, yPos - 5, pageWidth - 40, 15, 'S')

    // doc.setFontSize(12)
    // doc.setFont('helvetica', 'bold')
    // doc.setTextColor(146, 64, 14) // Dark yellow/brown color
    // doc.text('INSTRUCTIONS FOR STOCK KEEPER', 25, yPos + 5)

    // yPos += 25
    // doc.setTextColor(0, 0, 0)

    // // Instructions List
    // const instructions = [
    //   'Check the wanted quantity for each item as listed above',
    //   'Release items ONLY from the assigned Batch numbers shown in the table',
    //   'For items with "Shortage" status, release only the available quantity',
    //   'Items marked as "Can Fulfill" should be released in full quantity',
    //   'Verify all items against this list before releasing to driver',
    //   'Report any discrepancies immediately to the warehouse supervisor'
    // ]

    // doc.setFontSize(10)
    // doc.setFont('helvetica', 'normal')

    // instructions.forEach((instruction, index) => {
    //   // Check if we need a new page
    //   if (yPos > pageHeight - 30) {
    //     doc.addPage()
    //     yPos = 30
    //   }

    //   // Number and instruction
    //   doc.setFont('helvetica', 'bold')
    //   doc.text(`${index + 1}.`, 25, yPos)

    //   doc.setFont('helvetica', 'normal')
    //   // Split long instructions into multiple lines if needed
    //   const maxWidth = pageWidth - 50
    //   const lines = doc.splitTextToSize(instruction, maxWidth)

    //   lines.forEach((line: string, lineIndex: number) => {
    //     doc.text(line, 35, yPos + (lineIndex * 5))
    //   })

    //   yPos += Math.max(lines.length * 5, 8) + 2
    // })

    // yPos += 10

    // Footer
    const footerY = pageHeight - 20
    doc.setDrawColor(...grayColor)
    doc.line(20, footerY, pageWidth - 20, footerY)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grayColor)
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 25, footerY + 10)

    // Save the PDF
    const fileName = `StockRelease_${summaryData.routeName || 'AllRoutes'}_${summaryData.deliveryDate || format(new Date(), 'yyyyMMdd')}.pdf`
    doc.save(fileName)
  }
  // View Details dialog state (must be inside component)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const handleViewDetails = (order: any) => {
    setSelectedOrder(order)
    setViewDialogOpen(true)

    // Initialize quantities for In Transit orders
    if (order?.status === "In Transit") {
      initializeItemQuantities(order)
      setFinalizeError("")
    }

    // Clear confirm state for all orders
    setConfirmError("")
  }
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editOrder, setEditOrder] = useState<any | null>(null)
  // Edit form fields
  const [editSalesOrder, setEditSalesOrder] = useState("")
  const [editScheduledDate, setEditScheduledDate] = useState("")
  const [editDeliveryAddress, setEditDeliveryAddress] = useState("")
  const [editDriver, setEditDriver] = useState("")
  const [editVehicle, setEditVehicle] = useState("")
  const [editRoute, setEditRoute] = useState("")
  const [editItems, setEditItems] = useState<any[]>([])
  const [editItemBatches, setEditItemBatches] = useState<{ [key: string]: string }>({}) // Track selected batch for each item
  const [editItemStores, setEditItemStores] = useState<{ [key: string]: string }>({}) // Track selected store for each item
  const [editItemStocks, setEditItemStocks] = useState<{ [key: string]: any[] }>({}) // Track stock data for each item
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState("")

  // Finalization state for In Transit orders
  const [finalizeLoading, setFinalizeLoading] = useState(false)
  const [finalizeError, setFinalizeError] = useState("")
  const [itemQuantities, setItemQuantities] = useState<{
    [key: string]: {
      acceptedQty: number
      rejectedQty: number
      damagedQty: number
      weightDiffQty: number
    }
  }>({})

  // Confirm delivery state
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState("")
  const [approveLoading, setApproveLoading] = useState(false)

  // Initialize item quantities when viewing an In Transit order
  const initializeItemQuantities = (order: any) => {
    if (order?.status === "In Transit" && order?.DeliveryOrderItems) {
      const quantities: { [key: string]: any } = {}
      order.DeliveryOrderItems.forEach((item: any) => {
        quantities[item.id] = {
          acceptedQty: item.acceptedQty || item.qty || 0, // Default to full quantity as accepted
          rejectedQty: item.rejectedQty || 0,
          damagedQty: item.damagedQty || 0,
          weightDiffQty: item.weightDiffQty || 0
        }
      })
      setItemQuantities(quantities)
    }
  }

  // Update item quantity
  const updateItemQuantity = (itemId: string, field: string, value: number) => {
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: Math.max(0, value) // Ensure non-negative values
      }
    }))
  }

  // Validate all quantities before finalization
  const validateQuantities = () => {
    if (!selectedOrder?.DeliveryOrderItems) return false

    for (const item of selectedOrder.DeliveryOrderItems) {
      const quantities = itemQuantities[item.id] || {}
      const total = (quantities.acceptedQty || 0) + (quantities.rejectedQty || 0) +
        (quantities.damagedQty || 0) + (quantities.weightDiffQty || 0)

      if (total !== item.qty) {
        setFinalizeError(`Item "${item.itemName || item.Item?.name}" quantities don't match original quantity (${total} vs ${item.qty})`)
        return false
      }
    }

    return true
  }

  // Auto-fill all items as accepted (quick fill)
  const handleQuickFillAccepted = () => {
    if (!selectedOrder?.DeliveryOrderItems) return

    const newQuantities: { [key: string]: any } = {}
    selectedOrder.DeliveryOrderItems.forEach((item: any) => {
      newQuantities[item.id] = {
        acceptedQty: item.qty,
        rejectedQty: 0,
        damagedQty: 0,
        weightDiffQty: 0
      }
    })
    setItemQuantities(newQuantities)
    setFinalizeError("")
  }

  // Open edit dialog and prefill fields
  const handleEditOrder = async (order: any) => {
    setEditOrder(order)
    setEditSalesOrder(order.SalesOrder?.id ? String(order.SalesOrder.id) : "")
    setEditScheduledDate(order.orderDate ? order.orderDate.slice(0, 10) : "")
    setEditDeliveryAddress(order.deliveryAddress || "")
    setEditDriver(order.driverId ? String(order.driverId) : "")
    setEditVehicle(order.vehicleId ? String(order.vehicleId) : "")
    setEditRoute(order.routeId ? String(order.routeId) : "")
    setEditItems(order.DeliveryOrderItems ? [...order.DeliveryOrderItems] : [])

    // Fetch stock data for each item
    const stockData: { [key: string]: any[] } = {}
    if (order.DeliveryOrderItems) {
      await Promise.all(
        order.DeliveryOrderItems.map(async (item: any) => {
          try {
            const stocks = await stockApi.getByItem(item.itemId)
            stockData[item.id] = stocks || []
          } catch (error) {
            console.error(`Failed to fetch stock for item ${item.itemId}:`, error)
            stockData[item.id] = []
          }
        })
      )
    }
    setEditItemStocks(stockData)

    // Initialize batch selections for each item
    const batchSelections: { [key: string]: string } = {}
    if (order.DeliveryOrderItems) {
      order.DeliveryOrderItems.forEach((item: any) => {
        // Default to first available batch if exists
        if (item.batchAvailability?.batches && item.batchAvailability.batches.length > 0) {
          batchSelections[item.id] = String(item.batchAvailability.batches[0].batchId)
        }
      })
    }
    setEditItemBatches(batchSelections)

    // Initialize store selections for each item based on stock availability
    const storeSelections: { [key: string]: string } = {}
    if (order.DeliveryOrderItems) {
      order.DeliveryOrderItems.forEach((item: any) => {
        // Use existing storeId if assigned
        if (item.storeId) {
          storeSelections[item.id] = String(item.storeId)
        } else {
          // Find first store with sufficient stock
          const itemStocks = stockData[item.id] || []
          const storeWithStock = itemStocks.find((stock: any) => stock.availableQty >= item.qty)

          if (storeWithStock) {
            storeSelections[item.id] = String(storeWithStock.storeId)
          } else {
            // Default to store ID 2 if no store has sufficient stock
            storeSelections[item.id] = "2"
          }
        }
      })
    }
    setEditItemStores(storeSelections)

    handleDialogOpen(true)
    setEditDialogOpen(true)
    setEditError("")
  }
  // Save changes handler
  const handleSaveEdit = async () => {
    if (!editOrder) return
    setEditLoading(true)
    setEditError("")
    try {
      // Validate required fields
      if (!editSalesOrder || !editScheduledDate || !editDeliveryAddress) {
        setEditError("Please fill all required fields.")
        setEditLoading(false)
        return
      }
      // Prepare payload
      const payload = {
        salesOrderId: Number(editSalesOrder),
        orderDate: editScheduledDate,
        deliveryAddress: editDeliveryAddress,
        driverId: editDriver ? Number(editDriver) : null,
        vehicleId: editVehicle ? Number(editVehicle) : null,
        routeId: editRoute ? Number(editRoute) : null,
        items: editItems.map(item => ({
          itemId: item.itemId,
          qty: item.qty,
          itemName: item.itemName,
          batchId: editItemBatches[item.id] ? Number(editItemBatches[item.id]) : null, // Include selected batch
          storeId: editItemStores[item.id] ? Number(editItemStores[item.id]) : null, // Include selected store
        })),
      }
      await deliveryOrdersApi.update(editOrder.id, payload)
      setEditDialogOpen(false)
      // Reload delivery orders
      await fetchDeliveryOrders()
      toastr.success("Delivery order updated successfully")
    } catch (err: any) {
      setEditError(err.message || "Failed to update delivery order")
    } finally {
      setEditLoading(false)
    }
  }
  const [searchTerm, setSearchTerm] = useState("")

  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Delete order handler
  const handleDelete = async (orderId: number) => {
    const orderToDelete = deliveryOrders.find(o => o.id === orderId)
    const orderNumber = orderToDelete?.doNumber || `Order #${orderId}`

    setLoading(true)
    setError("")

    try {
      await toastr.promise(
        deliveryOrdersApi.remove(orderId),
        {
          loading: `Deleting ${orderNumber}...`,
          success: `${orderNumber} deleted successfully!`,
          error: `Failed to delete ${orderNumber}`
        }
      )

      // Reload orders after deletion
      fetchDeliveryOrders()
    } catch (err: any) {
      setError(err.message || "Failed to delete order")
    } finally {
      setLoading(false)
    }
  }


  // Load dropdown data on component mount
  useEffect(() => {
    Promise.all([
      // salesOrdersApi.getAll(),
      driversApi.getAll(),
      vehiclesApi.getAll(),
      routesApi.getAll(),
      customersApi.getAll(),
      storesApi.getAll<Store>(),
    ])
      .then(([dr, ve, ro, cu, st]) => {
        // setSalesOrders(so)
        setDrivers(dr)
        setVehicles(ve)
        setRoutes(ro)
        setCustomers(Array.isArray(cu) ? cu : [])
        setStores(st || [])
      })
      .catch((err) => console.error("Failed to load dropdown data:", err.message))
  }, [])

  // Real data for dialog dropdowns
  const [salesOrders, setSalesOrders] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState("")

  // Auto-fill driver/vehicle when route changes in edit dialog
  useEffect(() => {
    if (!editDialogOpen) return;
    if (!editRoute) return;
    const selectedRoute = routes.find(r => String(r.id) === editRoute);
    if (selectedRoute) {
      // Only auto-fill if route has driver/vehicle and not already set by user
      if (selectedRoute.driver && selectedRoute.driver.id) {
        setEditDriver(String(selectedRoute.driver.id));
      }
      if (selectedRoute.vehicle && selectedRoute.vehicle.id) {
        setEditVehicle(String(selectedRoute.vehicle.id));
      }
    }
  }, [editRoute, editDialogOpen, routes]);

  // Dialog form state
  const [selectedSalesOrder, setSelectedSalesOrder] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [selectedDriver, setSelectedDriver] = useState("")
  const [selectedVehicle, setSelectedVehicle] = useState("")
  const [selectedRoute, setSelectedRoute] = useState("")

  // Load dropdown data when dialog opens
  const handleDialogOpen = (open: boolean) => {
    if (open) {
      setDialogLoading(true)
      setDialogError("")
      Promise.all([
        // salesOrdersApi.getAll(),
        driversApi.getAll(),
        vehiclesApi.getAll(),
        routesApi.getAll(),
        storesApi.getAll<Store>()
      ])
        .then(([dr, ve, ro, st]) => {
          // setSalesOrders(so)
          setDrivers(dr)
          setVehicles(ve)
          setRoutes(ro)
          setStores(st)
        })
        .catch((err) => setDialogError(err.message || "Failed to load form data"))
        .finally(() => setDialogLoading(false))
    }
  }
  const ALL_CUSTOMERS = "__all__"
  const ALL_STATUS = "__all__"
  const ALL_DRIVERS = "__all__"
  const ALL_ROUTES = "__all__"
  const [customerFilter, setCustomerFilter] = useState(ALL_CUSTOMERS)
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS)
  const [driverFilter, setDriverFilter] = useState(ALL_DRIVERS)
  const [routeFilter, setRouteFilter] = useState(ALL_ROUTES)
  const [dateFilter, setDateFilter] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchDeliveryOrders = async () => {
    setLoading(true)
    try {
      const response = await deliveryOrdersApi.getAll({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        status: statusFilter === ALL_STATUS ? undefined : statusFilter,
        customerId: customerFilter === ALL_CUSTOMERS ? undefined : customerFilter,
        driverId: driverFilter === ALL_DRIVERS ? undefined : driverFilter,
        routeId: routeFilter === ALL_ROUTES ? undefined : routeFilter,
        date: dateFilter || undefined,
      })
      setDeliveryOrders(response.data)
      setTotalOrders(response.pagination.total)
      setTotalPages(response.pagination.totalPages)
      setSummary(response.summary)
    } catch (err: any) {
      setError(err.message || "Failed to load delivery orders")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeliveryOrders()
  }, [currentPage, pageSize, searchTerm, customerFilter, statusFilter, driverFilter, routeFilter, dateFilter])

  // Check for "view" query param on mount to open view dialog
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    const viewId = queryParams.get("view")
    if (viewId) {
      const loadAndOpen = async () => {
        try {
          const order = await deliveryOrdersApi.getById(viewId)
          handleViewDetails(order)
        } catch (err) {
          console.error("Failed to load Delivery Order from query param viewId:", viewId, err)
        }
      }
      loadAndOpen()
    }
  }, [])

  // Update driver and vehicle when route changes in summary filters
  useEffect(() => {
    if (!summaryFilters.routeId) {
      setSummaryFilters(prev => ({
        ...prev,
        drivername: "",
        vehiclename: ""
      }))
    } else {
      const selectedRoute = routes.find(r => String(r.id) === summaryFilters.routeId)
      if (selectedRoute) {
        setSummaryFilters(prev => ({
          ...prev,
          drivername: selectedRoute.driver?.name || "",
          vehiclename: selectedRoute.vehicle?.vehicleNumber || ""
        }))
      }
    }
  }, [summaryFilters.routeId, routes])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, customerFilter, statusFilter, driverFilter, routeFilter, dateFilter])

  // Pagination handlers
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  // ── Export filtered delivery orders to Excel ─────────────────────────────
  const exportDeliveryOrdersExcel = async () => {
    try {
      setExporting(true)
      // Fetch all filtered rows (no pagination — large limit)
      const result = await deliveryOrdersApi.getAll({
        limit: 500,
        search: searchTerm || undefined,
        status: statusFilter === ALL_STATUS ? undefined : statusFilter,
        customerId: customerFilter === ALL_CUSTOMERS ? undefined : customerFilter,
        driverId: driverFilter === ALL_DRIVERS ? undefined : driverFilter,
        routeId: routeFilter === ALL_ROUTES ? undefined : routeFilter,
        date: dateFilter || undefined,
      })
      const orders = result.data

      const now = new Date()
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

      const wb = XLSX.utils.book_new()

      // ── Sheet 1: Delivery Orders Summary ──────────────────────────────────
      const summaryHeader = [
        "Delivery No.",
        "SO Order No.",
        "Order Date",
        "Customer",
        "Type",
        "Dispatch Date",
        "Delivery Date",
        "Vehicle",
        "Driver",
        "Route",
        "Status",
      ]
      const summaryRows: any[][] = [summaryHeader]
      orders.forEach((o: any) => {
        summaryRows.push([
          o.doNumber || "",
          o.SalesOrder?.orderNumber || "",
          o.orderDate ? format(new Date(o.orderDate), "yyyy-MM-dd") : "",
          o.SalesOrder?.Customer?.name || "",
          o.SalesOrder?.isDelivery ? "Delivery" : "Pickup",
          o.SalesOrder?.dispatchDate ? format(new Date(o.SalesOrder.dispatchDate), "yyyy-MM-dd") : "",
          o.deliveryDate ? format(new Date(o.deliveryDate), "yyyy-MM-dd") : "",
          o.Vehicle?.vehicleNumber || "Not assigned",
          o.Driver?.name || "Not assigned",
          o.Route?.routeName || "Not assigned",
          o.status || "",
        ])
      })
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
      wsSummary["!cols"] = [
        { wch: 18 }, { wch: 18 }, { wch: 13 }, { wch: 30 }, { wch: 10 },
        { wch: 13 }, { wch: 13 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
        { wch: 15 }
      ]
      XLSX.utils.book_append_sheet(wb, wsSummary, "Deliveries Summary")

      // ── Sheet 2: Delivery Order Items ────────────────────────────────────
      const itemHeader = [
        "Delivery No.",
        "SO Order No.",
        "Customer",
        "DO Status",
        "Item Name",
        "Item Code",
        "Qty",
        "Unit",
        "Accepted Qty",
        "Batch",
        "Store",
      ]
      const itemRows: any[][] = [itemHeader]
      orders.forEach((o: any) => {
        if (o.DeliveryOrderItems && o.DeliveryOrderItems.length > 0) {
          o.DeliveryOrderItems.forEach((item: any) => {
            const releaseStoreName = item.ReleaseStore?.name ||
              stores.find(s => s.id === item.storeId)?.name ||
              (item.storeId ? `Store ID ${item.storeId}` : "Not assigned")

            itemRows.push([
              o.doNumber || "",
              o.SalesOrder?.orderNumber || "",
              o.SalesOrder?.Customer?.name || "",
              o.status || "",
              item.Item?.name || item.itemName || "",
              item.Item?.barcode || item.Item?.sku || "-",
              Number(item.qty ?? 0),
              item.Item?.unit || "",
              o.status === "Finalized" || o.status === "Delivered" ? Number(item.acceptedQty ?? 0) : "",
              item.Batch?.batchNumber || "No Batch assigned",
              releaseStoreName,
            ])
          })
        } else {
          itemRows.push([
            o.doNumber || "",
            o.SalesOrder?.orderNumber || "",
            o.SalesOrder?.Customer?.name || "",
            o.status || "",
            "", "", "", "", "", "", ""
          ])
        }
      })
      const wsItems = XLSX.utils.aoa_to_sheet(itemRows)
      wsItems["!cols"] = [
        { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 15 },
        { wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 8 },
        { wch: 13 }, { wch: 20 }, { wch: 20 }
      ]
      XLSX.utils.book_append_sheet(wb, wsItems, "Delivery Items")

      const activeFilters = [
        statusFilter !== ALL_STATUS ? statusFilter : null,
        customerFilter !== ALL_CUSTOMERS ? "Customer" : null,
        driverFilter !== ALL_DRIVERS ? "Driver" : null,
        routeFilter !== ALL_ROUTES ? "Route" : null,
        dateFilter ? "Date" : null,
      ].filter(Boolean).join("_")

      XLSX.writeFile(wb, `DeliveryOrders_${activeFilters ? activeFilters + "_" : ""}${dateStr}.xlsx`)
    } catch (err: any) {
      console.error("Export failed:", err)
      toastr.error("Export failed: " + (err.message || "Unknown error"))
    } finally {
      setExporting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            Pending
          </Badge>
        )
      case "Approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Approved
          </Badge>
        )
      case "Dispatched":
        return (
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
            Dispatched
          </Badge>
        )
      case "Scheduled":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Scheduled
          </Badge>
        )
      case "In Transit":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            In Transit
          </Badge>
        )
      case "Finalized":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            Finalized
          </Badge>
        )
      case "Delivered":
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            Delivered
          </Badge>
        )
      case "Failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <CircleDot className="h-4 w-4 text-gray-500" />
      case "Approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Dispatched":
        return <Send className="h-4 w-4 text-indigo-500" />
      case "Scheduled":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "In Transit":
        return <Truck className="h-4 w-4 text-yellow-500" />
      case "Finalized":
        return <CheckCircle2 className="h-4 w-4 text-purple-500" />
      case "Delivered":
        return <Package className="h-4 w-4 text-green-600" />
      case "Failed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <HourglassIcon className="h-4 w-4 text-gray-400" />
    }
  }

  // Results Summary Component
  const ResultsSummary = () => {
    const startIndex = (currentPage - 1) * pageSize + 1
    const endIndex = Math.min(currentPage * pageSize, totalOrders)

    return (
      <div className="flex items-center justify-between text-xs text-muted-foreground py-2 border-t">
        <span>
          Showing {totalOrders > 0 ? startIndex : 0}-{endIndex} of {totalOrders} orders
        </span>
        {(searchTerm || customerFilter !== ALL_CUSTOMERS) && (
          <span className="flex items-center">
            <Search className="mr-1 h-3 w-3" />
            Filters active
          </span>
        )}
      </div>
    )
  }

  // Pagination Component
  const PaginationControls = () => {
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
          <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
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

  const clearFilters = () => {
    setSearchTerm("")
    setCustomerFilter(ALL_CUSTOMERS)
    setStatusFilter(ALL_STATUS)
    setDriverFilter(ALL_DRIVERS)
    setRouteFilter(ALL_ROUTES)
    setDateFilter("")
    setCurrentPage(1)
  }

  return (
    <ERPLayout>
      <div className="space-y-2">

        {/* Summary Dialog for selected approved orders */}
        <Dialog open={showApprovedSummaryDialog} onOpenChange={setShowApprovedSummaryDialog}>
          <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Summary of Selected Delivery Orders</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Summary Header */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-blue-800">Selected Orders: <span className="font-mono">{selectedApprovedIds.length}</span></div>
                  <div className="text-sm text-gray-600">Total Items: <span className="font-mono">{summarizedItems.length}</span></div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateSummary}
                    disabled={
                      creatingSummary ||
                      !!createdSummaryCode ||
                      deliveryOrders.filter(o => selectedApprovedIds.includes(o.id)).every(o => o.status === "Pending")
                    }
                    title={deliveryOrders.filter(o => selectedApprovedIds.includes(o.id)).every(o => o.status === "Pending") ? "Cannot create summary for Pending orders" : ""}
                  >
                    {creatingSummary ? "Creating..." : createdSummaryCode ? "Summary Created" : "Create Summary"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrintSummaryPDF}
                    disabled={summarizedItems.length === 0}
                  >
                    Print Summary
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowApprovedSummaryDialog(false)}>Close</Button>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">#</TableHead>
                      <TableHead className="font-semibold">Item Name</TableHead>
                      <TableHead className="font-semibold">Total Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summarizedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">No items found in selected orders.</TableCell>
                      </TableRow>
                    ) : (
                      summarizedItems.map((item: any, idx: number) => (
                        <TableRow key={idx} className="hover:bg-gray-50">
                          <TableCell className="text-xs text-gray-500">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell className="font-semibold text-blue-700">{item.totalQty}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Success Message */}
              {createdSummaryCode && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="font-bold text-green-700">Summary Created!</div>
                    <div className="text-sm">Summary Code: <span className="font-mono text-lg">{createdSummaryCode}</span></div>
                  </div>
                  <Button size="sm" className="mt-2 md:mt-0" onClick={handlePrintSummaryPDF}>Print</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        {/* ...existing code... */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Delivery Orders</h1>
            <p className="text-muted-foreground">Manage and track product deliveries to customers</p>
          </div>



          <div className="flex items-center space-x-2">
            <Dialog open={summaryDialogOpen} onOpenChange={handleSummaryDialogChange}>
              <DialogTrigger asChild>
                {/* <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Stock Release Summary
              </Button> */}
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Stock Release Summary for Vehicle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Summary Filters */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label htmlFor="summaryDate">Filter by Delivery Date *</Label>
                      <Input
                        id="summaryDate"
                        type="date"
                        value={summaryFilters.deliveryDate}
                        onChange={(e) => setSummaryFilters(prev => ({ ...prev, deliveryDate: e.target.value }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label htmlFor="summaryRoute">Filter by Route *</Label>
                      <Select
                        value={summaryFilters.routeId}
                        onValueChange={(value) => setSummaryFilters(prev => ({ ...prev, routeId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a specific route" />
                        </SelectTrigger>
                        <SelectContent>
                          {routes.map((route) => (
                            <SelectItem key={route.id} value={String(route.id)}>
                              {route.routeName || route.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Driver</div>
                      <div>{summaryFilters.drivername ? summaryFilters.drivername : <span className="text-muted-foreground">Not assigned</span>}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Vehicle</div>
                      <div>{summaryFilters.vehiclename ? summaryFilters.vehiclename : <span className="text-muted-foreground">Not assigned</span>}</div>
                    </div>

                  </div>

                  <div className="space-y-2">
                    {!summaryFilters.routeId && (
                      <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                        <span className="font-medium">Route Required:</span> Please select a specific route to generate the stock release summary.
                      </div>
                    )}
                    <div className="flex gap-2">
                      {/* <Button
                      onClick={handleGenerateSummary}
                      disabled={summaryLoading || !summaryFilters.routeId}
                      className="flex-1"
                    >
                      {summaryLoading ? "Generating..." : "Generate Stock Release List"}
                    </Button> */}
                      {summaryData && (
                        <Button
                          variant="outline"
                          onClick={handlePrintSummary}
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          Print PDF
                        </Button>
                      )}
                    </div>
                  </div>

                  {summaryError && (
                    <div className="text-red-600 bg-red-50 p-3 rounded-lg">
                      {summaryError}
                    </div>
                  )}

                  {summaryData && (
                    <div className="space-y-4">
                      {/* Summary Header */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-800 mb-2">Stock Release Summary</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><span className="font-medium">Route:</span> {summaryData.routeName}</div>
                          <div><span className="font-medium">Delivery Date:</span> {summaryData.deliveryDate}</div>
                        </div>
                      </div>

                      {/* Summary Statistics */}
                      <div className="grid grid-cols-4 gap-4">
                        <Card className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{summaryData.totalItems || 0}</div>
                          <div className="text-sm text-gray-600">Total Items to Release</div>
                        </Card>
                        <Card className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{summaryData.totalQty || 0}</div>
                          <div className="text-sm text-gray-600">Total Quantity</div>
                        </Card>
                        <Card className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{summaryData.itemsCanFulfill || 0}</div>
                          <div className="text-sm text-gray-600">Items Can Fulfill</div>
                        </Card>
                        <Card className="p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">{summaryData.itemsWithShortage || 0}</div>
                          <div className="text-sm text-gray-600">Items with Shortage</div>
                        </Card>
                      </div>

                      {/* Items Release List */}
                      {summaryData.items && summaryData.items.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Items to Release for Vehicle</h3>
                          <div className="border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50">
                                  <TableHead className="font-semibold">Item Name</TableHead>
                                  <TableHead className="font-semibold">Wanted Qty</TableHead>
                                  <TableHead className="font-semibold">Available Qty</TableHead>
                                  <TableHead className="font-semibold">Status</TableHead>
                                  <TableHead className="font-semibold">Assigned Batches</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {summaryData.items.map((item: any, index: number) => (
                                  <TableRow key={index} className={`hover:bg-gray-50 ${!item.canFulfill ? 'bg-red-50' : ''}`}>
                                    <TableCell className="font-medium">{item.itemColor + ' ' + item.itemName + ' ' + item.itemCountry}</TableCell>
                                    <TableCell className="text-lg font-semibold text-blue-600">{item.wantedQty || item.totalQty}</TableCell>
                                    <TableCell className="text-sm">
                                      <div className={`font-medium ${item.totalAvailableQty >= item.wantedQty ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.totalAvailableQty}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {item.canFulfill ? (
                                          <Badge variant="default" className="bg-green-600">
                                            Can Fulfill
                                          </Badge>
                                        ) : (
                                          <div className="space-y-1">
                                            <Badge variant="destructive">
                                              Shortage
                                            </Badge>
                                            <div className="text-xs text-red-600">
                                              Short: {item.shortageQty}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        {item.batches && item.batches.length > 0 ? (
                                          item.batches.map((batch: any, idx: number) => (
                                            <div key={idx} className="text-sm bg-blue-100 p-1 rounded inline-block mr-1 mb-1">
                                              <span className="font-medium">{batch.batchNumber}</span>
                                              <span className="text-blue-600 ml-1">({batch.availableQty})</span>
                                            </div>
                                          ))
                                        ) : (
                                          <span className="text-gray-500 text-sm">No Batch assigned</span>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {/* Instructions for Stock Keeper */}
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-800 mb-2">Instructions for Stock Keeper:</h4>
                        <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                          <li>Check the wanted quantity for each item as listed above</li>
                          <li>Release items ONLY from the assigned Batch numbers shown in blue badges</li>
                          <li>For items with "Shortage" status, release only the available quantity</li>
                          <li>Items marked as "Can Fulfill" should be released in full quantity</li>
                          <li>Verify all items against this list before releasing to driver</li>
                          <li>Report any discrepancies immediately to the warehouse supervisor</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {summaryData && summaryData.items && summaryData.items.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No items found for the selected route and date.</p>
                      <p className="text-sm">Try selecting a different route or date.</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog onOpenChange={handleDialogOpen}>
              <DialogTrigger asChild>
                {/* <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Delivery Order
              </Button> */}
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Create Delivery Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="salesOrder">Sales Order</Label>
                      <Select value={selectedSalesOrder} onValueChange={setSelectedSalesOrder} disabled={dialogLoading || !!dialogError}>
                        <SelectTrigger>
                          <SelectValue placeholder={dialogLoading ? "Loading..." : dialogError ? dialogError : "Select sales order"} />
                        </SelectTrigger>
                        <SelectContent>
                          {salesOrders.map((so) => (
                            <SelectItem key={so.id} value={so.id}>
                              {so.orderNumber} - {so.Customer?.name || so.customerName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="scheduledDate">Scheduled Date</Label>
                      <Input id="scheduledDate" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} disabled={dialogLoading} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="deliveryAddress">Delivery Address</Label>
                    <Input id="deliveryAddress" placeholder="Enter delivery address" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} disabled={dialogLoading} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="driver">Driver</Label>
                      <Select value={selectedDriver} onValueChange={setSelectedDriver} disabled={dialogLoading || !!dialogError}>
                        <SelectTrigger>
                          <SelectValue placeholder={dialogLoading ? "Loading..." : dialogError ? dialogError : "Select driver"} />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="vehicle">Vehicle</Label>
                      <Select value={selectedVehicle} onValueChange={setSelectedVehicle} disabled={dialogLoading || !!dialogError}>
                        <SelectTrigger>
                          <SelectValue placeholder={dialogLoading ? "Loading..." : dialogError ? dialogError : "Select vehicle"} />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.vehicleNumber} - {vehicle.vehicleType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="route">Route</Label>
                      <Select value={selectedRoute} onValueChange={setSelectedRoute} disabled={dialogLoading || !!dialogError}>
                        <SelectTrigger>
                          <SelectValue placeholder={dialogLoading ? "Loading..." : dialogError ? dialogError : "Select route"} />
                        </SelectTrigger>
                        <SelectContent>
                          {routes.map((route) => (
                            <SelectItem key={route.id} value={route.id}>
                              {route.name || route.routeName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Delivery Items</Label>
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-4 gap-2 text-sm font-medium">
                        <span>Item</span>
                        <span>Quantity</span>
                        <span>Unit</span>
                        <span>Weight</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Input placeholder="Item name" disabled />
                        <Input type="number" placeholder="0" disabled />
                        <Input placeholder="kg" disabled />
                        <Input placeholder="0.00" disabled />
                      </div>
                    </div>
                  </div>

                  <Button className="w-full">Create Delivery Order</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Export Excel Option */}
            <Button
              variant="outline"
              onClick={exportDeliveryOrdersExcel}
              disabled={exporting}
              className="border-green-600 text-green-700 hover:bg-green-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              {exporting ? "Exporting..." : "Export Excel"}
            </Button>

            {/* Stock Release Summary Button */}
            <Button
              variant="outline"
              onClick={() => handleShowSummaryDialog()}
              disabled={
                selectedApprovedIds.length === 0 ||
                (deliveryOrders.filter(o => selectedApprovedIds.includes(o.id)).some(o => o.status === "Pending") &&
                  deliveryOrders.filter(o => selectedApprovedIds.includes(o.id)).some(o => o.status === "Approved"))
              }
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Stock Release Summary
            </Button>
          </div>
        </div>


        {/* Summary Cards */}
        <div className="grid gap-2 md:grid-cols-4">
          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Total Deliveries</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">{summary?.total || 0}</div>
              <p className="text-xs text-muted-foreground leading-tight">
                Pending: {summary?.Pending || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Scheduled</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">
                {summary?.Scheduled || 0}
              </div>
              <p className="text-xs text-muted-foreground leading-tight">Scheduled deliveries</p>
            </CardContent>
          </Card>

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">In Transit</CardTitle>
              <Truck className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">
                {summary?.['In Transit'] || 0}
              </div>
              <p className="text-xs text-muted-foreground leading-tight">Currently delivering</p>
            </CardContent>
          </Card>

          <Card className="h-24 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <CardTitle className="text-xs font-medium">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="py-1 px-3">
              <div className="text-lg font-bold">
                {summary?.Delivered || 0}
              </div>
              <p className="text-xs text-muted-foreground leading-tight">Successfully delivered</p>
            </CardContent>
          </Card>
        </div>

        {/* Delivery Orders List */}
        <Card>
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              {/* <CardTitle>Delivery Orders</CardTitle> */}
              <div className="flex items-center gap-4 w-full justify-between">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search deliveries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-48"
                  />
                </div>
                {/* Customer filter */}
                <CustomerSelect
                  customers={customers}
                  value={customerFilter === ALL_CUSTOMERS ? "" : customerFilter}
                  onValueChange={(value) => setCustomerFilter(value ? String(value) : ALL_CUSTOMERS)}
                  placeholder="All Customers"
                  showMainBadge={true}
                  className="font-normal "
                />
                {/* Driver filter */}
                <Select
                  value={driverFilter}
                  onValueChange={setDriverFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Drivers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_DRIVERS}>All Drivers</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={String(driver.id)}>{driver.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Route filter */}
                <Select
                  value={routeFilter}
                  onValueChange={setRouteFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Routes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ROUTES}>All Routes</SelectItem>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={String(route.id)}>{route.name || route.routeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Status filter */}
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_STATUS}>All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Dispatched">Dispatched</SelectItem>
                    <SelectItem value="In Transit">In Transit</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Finalized">Finalized</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
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
                {(searchTerm || customerFilter !== ALL_CUSTOMERS || statusFilter !== ALL_STATUS || driverFilter !== ALL_DRIVERS || routeFilter !== ALL_ROUTES || dateFilter) && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    size="sm"
                    className="h-8 px-2 text-gray-500 hover:text-red-600"
                  >
                    <X className="mr-1 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer"
                      checked={
                        deliveryOrders.length > 0 &&
                        deliveryOrders.filter(o => o.status === "Pending" || o.status === "Approved").length > 0 &&
                        deliveryOrders.filter(o => o.status === "Pending" || o.status === "Approved").every(o => selectedApprovedIds?.includes(o.id))
                      }
                      onChange={(e) => {
                        const selectableOrders = deliveryOrders.filter(o => o.status === "Pending" || o.status === "Approved");
                        const selectableIds = selectableOrders.map(o => o.id);

                        if (e.target.checked) {
                          // Add visible selectable IDs to the current selection
                          setSelectedApprovedIds(Array.from(new Set([...(selectedApprovedIds || []), ...selectableIds])));
                        } else {
                          // Remove visible selectable IDs from the current selection
                          setSelectedApprovedIds((selectedApprovedIds || []).filter(id => !selectableIds.includes(id)));
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Delivery No.</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Dispatch Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  {/* <TableHead>Vehicle</TableHead> */}
                  <TableHead>Route</TableHead>
                  {/* <TableHead>Weight</TableHead> */}
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {loading ? "Loading delivery orders..." : "No delivery orders found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveryOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="py-2">
                        {(order.status === "Pending" || order.status === "Approved") && (
                          <input
                            className={`h-4 w-4 cursor-pointer ${order.status === "Approved" ? "accent-green-600" : "accent-amber-600"}`}
                            type="checkbox"
                            checked={selectedApprovedIds?.includes(order.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedApprovedIds([...selectedApprovedIds, order.id]);
                              } else {
                                setSelectedApprovedIds(selectedApprovedIds.filter((id: any) => id !== order.id));
                              }
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <div>
                          <div className="font-medium">{order.doNumber}</div>
                          <div className="text-xs text-muted-foreground">{order.SalesOrder.orderNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {format(new Date(order.orderDate), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell className="py-2">
                        <div>
                          <div className="font-medium">{order.SalesOrder.Customer.name}
                            <span> • </span>
                            <span className={`px-2 py-1 rounded text-xs ${order.SalesOrder.isDelivery
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                              }`}>
                              {order.SalesOrder.isDelivery ? 'Delivery' : 'Pickup'}
                            </span>
                          </div>
                          {/* <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {order.deliveryAddress?.split(" - ")[1] || order.deliveryAddress}
                          </div> */}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="font-sm">{format(new Date(order.SalesOrder.dispatchDate), "yyyy-MM-dd")}</div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="font-sm">{order.deliveryDate ? format(new Date(order.deliveryDate), "yyyy-MM-dd") : "-"}</div>
                      </TableCell>
                      {/* <TableCell className="py-2">
                        <div>
                          <div className="font-medium">{order.vehicleId ? order.Vehicle.vehicleNumber : <div className="text-xs text-muted-foreground">Not assigned</div>}</div>
                          <div className="text-xs text-muted-foreground">{order.driverId ? order.Driver.name : <div className="text-xs text-muted-foreground">-</div>}</div>
                        </div>
                      </TableCell> */}
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <Route className="h-4 w-4 text-muted-foreground" />
                          {order.vehicleId ? order.Route?.routeName : <div className="text-xs text-muted-foreground">Not assigned</div>}
                        </div>
                      </TableCell>
                      {/* <TableCell>{order.totalWeight} kg</TableCell> */}
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          {getStatusBadge(order.status)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center space-x-2">
                          <Button className="h-8 w-8" variant="outline" size="sm" onClick={() => handleViewDetails(order)}>
                            <Eye className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button className="h-8 w-8" variant="outline" size="sm" onClick={() => handlePrintPDF(order)} title="Print PDF">
                            <Printer className="h-4 w-4 text-green-500" />
                          </Button>
                          {(order.status === "Pending") ? (
                            <>
                              <Button className="h-8 w-8" variant="outline" size="sm" onClick={() => handleEditOrder(order)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              {hasPermission("delivery-orders:delete") && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button className="h-8 w-8" variant="outline" size="sm">
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-red-600">Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the Delivery Order.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                        onClick={() => handleDelete(order.id!)}
                                      >Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </>
                          ) : (
                            <>
                            </>
                          )}
                        </div>
                      </TableCell>
                      {/* View Details Dialog */}
                      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Delivery Order Details</DialogTitle>
                          </DialogHeader>
                          {selectedOrder && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <div className="text-xs text-muted-foreground">Delivery No.</div>
                                  <div className="font-semibold">{selectedOrder.doNumber}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Sales Order</div>
                                  <div>{selectedOrder.SalesOrder?.orderNumber}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Order Date</div>
                                  <div>{format(new Date(selectedOrder.orderDate), "yyyy-MM-dd")}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Customer</div>
                                  <div>{selectedOrder.SalesOrder?.Customer?.name}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Delivery Address</div>
                                  <div>{selectedOrder.deliveryAddress}</div>
                                </div>
                                <div className="font-medium">
                                  <div className="text-xs text-muted-foreground">Order Type</div>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${selectedOrder.SalesOrder.isDelivery
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {selectedOrder.SalesOrder.isDelivery ? 'Delivery' : 'Pickup'}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Delivery Date</div>
                                  <div>{selectedOrder.deliveryDate ? format(new Date(selectedOrder.deliveryDate), "yyyy-MM-dd") : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Dispatch Date</div>
                                  <div>{selectedOrder.SalesOrder.dispatchDate ? format(new Date(selectedOrder.SalesOrder.dispatchDate), "yyyy-MM-dd") : "-"}</div>
                                </div>
                                {/* <div>
                                  <div className="text-xs text-muted-foreground">Delivery Time</div>
                                  <div>{selectedOrder.SalesOrder.timeslot}</div>
                                </div> */}
                                {selectedOrder.SalesOrder.isDelivery && (
                                  <div>
                                    <div className="text-xs text-muted-foreground">Driver</div>
                                    <div>{selectedOrder.Driver?.name || <span className="text-muted-foreground">Not assigned</span>}</div>
                                  </div>
                                )}
                                {selectedOrder.SalesOrder.isDelivery && (
                                  <div>
                                    <div className="text-xs text-muted-foreground">Vehicle</div>
                                    <div>{selectedOrder.Vehicle?.vehicleNumber || <span className="text-muted-foreground">Not assigned</span>}</div>
                                  </div>
                                )}
                                {selectedOrder.SalesOrder.isDelivery && (
                                  <div>
                                    <div className="text-xs text-muted-foreground">Route</div>
                                    <div>{selectedOrder.Route?.routeName || <span className="text-muted-foreground">Not assigned</span>}</div>
                                  </div>
                                )}
                                <div>
                                  <div className="text-xs text-muted-foreground">Status</div>
                                  <div>{getStatusBadge(selectedOrder.status)}</div>
                                </div>
                                {/* <div>
                                  <div className="text-xs text-muted-foreground">Total Weight</div>
                                  <div>{selectedOrder.totalWeight} kg</div>
                                </div> */}

                              </div>
                              <div>
                                <div className="font-semibold mb-2">Delivery Items</div>
                                <div className="border rounded-lg">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-gray-50">
                                        <TableHead className="font-semibold">Item</TableHead>
                                        <TableHead className="font-semibold">Quantity</TableHead>
                                        <TableHead className="font-semibold">Release Status</TableHead>
                                        <TableHead className="font-semibold">Assigned Batch</TableHead>
                                        <TableHead className="font-semibold">Release Store</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedOrder.DeliveryOrderItems && selectedOrder.DeliveryOrderItems.length > 0 ? (
                                        selectedOrder.DeliveryOrderItems.map((item: any, idx: number) => {
                                          // Find summary items for this delivery order item
                                          const summaryItems = selectedOrder.SummaryItems?.filter((summary: any) =>
                                            summary.deliveryOrderItemId === item.id
                                          ) || []

                                          return (
                                            <TableRow key={idx} className="hover:bg-gray-50">
                                              <TableCell className="font-medium">{item.Item?.name}</TableCell>
                                              <TableCell>
                                                <div>
                                                  <span className="font-medium">{item.qty} {item.Item?.unit}</span><br />
                                                  <span className="text-xs text-muted-foreground">{selectedOrder?.status === "Finalized" || selectedOrder?.status === "Delivered" ? item.acceptedQty + ' ' + item.Item?.unit : ""}</span>
                                                </div>
                                              </TableCell>
                                              <TableCell>
                                                {summaryItems.length > 0 ? (
                                                  <div className="space-y-1">
                                                    {summaryItems.map((summary: any, summaryIdx: number) => (
                                                      <div key={summaryIdx} className="flex items-center gap-2">
                                                        {summary.isReleased ? (
                                                          <Badge variant="default" className="bg-green-600">
                                                            Released ({summary.qty})
                                                          </Badge>
                                                        ) : (
                                                          <Badge variant="outline" className="border-orange-500 text-orange-600">
                                                            Pending ({summary.qty})
                                                          </Badge>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <Badge variant="outline" className="border-gray-400 text-gray-600">
                                                    Not Assigned
                                                  </Badge>
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {item?.Batch ? (
                                                  <span className="font-medium">{item?.Batch?.batchNumber}</span>
                                                ) : (
                                                  <span className="text-gray-500 text-sm">No Batch assigned</span>
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {item.storeId ? (
                                                  <div className="text-sm font-medium text-blue-600">
                                                    {item.ReleaseStore?.name || stores.find(s => s.id === item.storeId)?.name || 'Store not found'}
                                                  </div>
                                                ) : summaryItems.length > 0 ? (
                                                  <div className="space-y-1">
                                                    {summaryItems.map((summary: any, summaryIdx: number) => (
                                                      <div key={summaryIdx} className="text-sm text-gray-600">
                                                        {summary.ReleaseStore?.name || 'Not assigned'}
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <span className="text-gray-500 text-sm">No store assigned</span>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          )
                                        })
                                      ) : (
                                        <TableRow>
                                          <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                                            No delivery items found
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              {/* Finalization section for In Transit orders */}
                              {selectedOrder?.status === "In Transit" && (
                                <div className="space-y-4">
                                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className="font-semibold text-orange-800 mb-2">Delivery Finalization</h4>
                                        <p className="text-sm text-orange-700">
                                          Please record the actual quantities received for each item. This will update inventory and complete the delivery.
                                        </p>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleQuickFillAccepted}
                                        disabled={finalizeLoading}
                                        className="text-green-600 border-green-300 hover:bg-green-50"
                                      >
                                        Quick Fill - All Accepted
                                      </Button>
                                    </div>
                                  </div>

                                  {finalizeError && (
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                      <p className="text-red-700 text-sm">{finalizeError}</p>
                                    </div>
                                  )}

                                  <div className="border rounded-lg">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-gray-50">
                                          <TableHead className="font-semibold">Item</TableHead>
                                          <TableHead className="font-semibold">Original Qty</TableHead>
                                          <TableHead className="font-semibold">Accepted</TableHead>
                                          <TableHead className="font-semibold">Rejected</TableHead>
                                          <TableHead className="font-semibold">Damaged</TableHead>
                                          <TableHead className="font-semibold">Weight Diff</TableHead>
                                          <TableHead className="font-semibold">Total Check</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedOrder.DeliveryOrderItems?.map((item: any, idx: number) => {
                                          const quantities = itemQuantities[item.id] || {
                                            acceptedQty: item.qty,
                                            rejectedQty: 0,
                                            damagedQty: 0,
                                            weightDiffQty: 0
                                          }

                                          const totalCheck = quantities.acceptedQty + quantities.rejectedQty +
                                            quantities.damagedQty + quantities.weightDiffQty
                                          const isValid = totalCheck === item.qty

                                          return (
                                            <TableRow key={idx} className={`hover:bg-gray-50 ${!isValid ? 'bg-red-50' : ''}`}>
                                              <TableCell className="font-medium">
                                                {item.Item?.name}
                                                <div className="text-xs text-gray-500">{item.Item?.unit}</div>
                                              </TableCell>
                                              <TableCell className="font-semibold text-blue-600">
                                                {item.qty}
                                              </TableCell>
                                              <TableCell>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  max={item.qty}
                                                  value={quantities.acceptedQty}
                                                  onChange={(e) => updateItemQuantity(item.id, 'acceptedQty', Number(e.target.value))}
                                                  className="w-20 h-8"
                                                  disabled={finalizeLoading}
                                                />
                                              </TableCell>
                                              <TableCell>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  value={quantities.rejectedQty}
                                                  onChange={(e) => updateItemQuantity(item.id, 'rejectedQty', Number(e.target.value))}
                                                  className="w-20 h-8"
                                                  disabled={finalizeLoading}
                                                />
                                              </TableCell>
                                              <TableCell>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  value={quantities.damagedQty}
                                                  onChange={(e) => updateItemQuantity(item.id, 'damagedQty', Number(e.target.value))}
                                                  className="w-20 h-8"
                                                  disabled={finalizeLoading}
                                                />
                                              </TableCell>
                                              <TableCell>
                                                <Input
                                                  type="number"
                                                  value={quantities.weightDiffQty}
                                                  onChange={(e) => updateItemQuantity(item.id, 'weightDiffQty', Number(e.target.value))}
                                                  className="w-20 h-8"
                                                  disabled={finalizeLoading}
                                                />
                                              </TableCell>
                                              <TableCell>
                                                <div className={`font-semibold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                                                  {totalCheck}
                                                  {!isValid && (
                                                    <div className="text-xs text-red-500">
                                                      {totalCheck > item.qty ? 'Over' : 'Under'} by {Math.abs(totalCheck - item.qty)}
                                                    </div>
                                                  )}
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          )
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>

                                  {/* Finalization summary */}
                                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <h5 className="font-semibold text-blue-800 mb-2">Finalization Summary</h5>
                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                      <div className="text-center">
                                        <div className="text-lg font-bold text-green-600">
                                          {Object.values(itemQuantities).reduce((sum, qty) => sum + qty.acceptedQty, 0)}
                                        </div>
                                        <div className="text-green-700">Total Accepted</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-lg font-bold text-red-600">
                                          {Object.values(itemQuantities).reduce((sum, qty) => sum + qty.rejectedQty, 0)}
                                        </div>
                                        <div className="text-red-700">Total Rejected</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-lg font-bold text-orange-600">
                                          {Object.values(itemQuantities).reduce((sum, qty) => sum + qty.damagedQty, 0)}
                                        </div>
                                        <div className="text-orange-700">Total Damaged</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-lg font-bold text-purple-600">
                                          {Object.values(itemQuantities).reduce((sum, qty) => sum + qty.weightDiffQty, 0)}
                                        </div>
                                        <div className="text-purple-700">Weight Difference</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Finalize button */}
                                  <div className="flex justify-end space-x-2 pt-4 border-t">
                                    <Button
                                      variant="outline"
                                      onClick={() => setViewDialogOpen(false)}
                                      disabled={finalizeLoading}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={handleFinalizeDelivery}
                                      disabled={
                                        finalizeLoading ||
                                        Object.keys(itemQuantities).length === 0 ||
                                        selectedOrder?.DeliveryOrderItems?.some((item: any) => {
                                          const quantities = itemQuantities[item.id] || {}
                                          const total = (quantities.acceptedQty || 0) + (quantities.rejectedQty || 0) +
                                            (quantities.damagedQty || 0) + (quantities.weightDiffQty || 0)
                                          return total !== item.qty
                                        })
                                      }
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {finalizeLoading ? "Finalizing..." : "Finalize Delivery"}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Confirm Delivery section for Dispatched orders */}
                              {selectedOrder?.status === "Dispatched" && (
                                <div className="space-y-4">
                                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className="font-semibold text-green-800 mb-2">Delivery Dispatched</h4>
                                        <p className="text-sm text-green-700">
                                          This delivery has been dispatched. Click confirm to mark as delivered.
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {confirmError && (
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                      <p className="text-red-700 text-sm">{confirmError}</p>
                                    </div>
                                  )}

                                  {/* Confirm Delivered button */}
                                  <div className="flex justify-end space-x-2 pt-4 border-t">
                                    <Button
                                      variant="outline"
                                      onClick={() => setViewDialogOpen(false)}
                                      disabled={confirmLoading}
                                    >
                                      Close
                                    </Button>
                                    <Button
                                      onClick={handleConfirmDelivered}
                                      disabled={confirmLoading}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      {confirmLoading ? "Confirming..." : "Confirm Delivered"}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Stock Release Summary */}
                              {selectedOrder.SummaryItems && selectedOrder.SummaryItems.length > 0 && selectedOrder.status === "Scheduled" && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                  <h4 className="font-semibold text-blue-800 mb-3">Stock Release Summary</h4>
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-blue-600">
                                        {selectedOrder.SummaryItems.length}
                                      </div>
                                      <div className="text-blue-700">Total Summary Items</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-green-600">
                                        {selectedOrder.SummaryItems.filter((item: any) => item.isReleased).length}
                                      </div>
                                      <div className="text-green-700">Released Items</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-orange-600">
                                        {selectedOrder.SummaryItems.filter((item: any) => !item.isReleased).length}
                                      </div>
                                      <div className="text-orange-700">Pending Release</div>
                                    </div>
                                  </div>

                                  {/* Summary by Date */}
                                  {Array.from(new Set(selectedOrder.SummaryItems.map((item: any) => item.summaryDate?.split('T')[0]))).map((date: any) => (
                                    <div key={date} className="mt-3 pt-3 border-t border-blue-200">
                                      <div className="text-sm font-medium text-blue-800 mb-1">
                                        Summary Date: {date ? format(new Date(date), "dd/MM/yyyy") : 'No date'}
                                      </div>
                                      <div className="text-xs text-blue-600">
                                        Items for this date: {selectedOrder.SummaryItems.filter((item: any) => item.summaryDate?.split('T')[0] === date).length}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Stock Release Instructions */}
                              {selectedOrder.SummaryItems && selectedOrder.SummaryItems.length > 0 && selectedOrder.status === "Scheduled" && (
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                  <div className="font-medium text-yellow-800 mb-2 text-sm">Stock Release Instructions:</div>
                                  <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                                    <li>Release items only from the assigned Batch numbers shown above</li>
                                    <li>Check the release status before proceeding with stock release</li>
                                    <li>Items marked as "Released" have already been processed</li>
                                    <li>Items marked as "Pending" are waiting for release approval</li>
                                    <li>Verify quantities against Batch records before release</li>
                                    <li>Report any discrepancies immediately to the warehouse supervisor</li>
                                  </ul>
                                </div>
                              )}
                              {/* Approve button for assigned route & driver, all items have storeId not empty */}
                              {((selectedOrder.Route?.id && selectedOrder.Driver?.id)
                                || !selectedOrder.SalesOrder.isDelivery)
                                && selectedOrder.status !== "Approved"
                                && selectedOrder.status !== "Dispatched"
                                && selectedOrder.status !== "Delivered"
                                && selectedOrder.DeliveryOrderItems.every((item: any) => item.storeId)
                                && (
                                  <div className="flex justify-end pt-2">
                                    <Button
                                      className="bg-green-600 text-white hover:bg-green-700"
                                      onClick={() => handleApproveOrder(selectedOrder)}
                                      disabled={approveLoading}
                                    >
                                      {approveLoading ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Approving...
                                        </>
                                      ) : (
                                        "Approve Delivery Order"
                                      )}
                                    </Button>
                                  </div>
                                )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      {/* Edit Delivery Order Dialog */}
                      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Delivery Order</DialogTitle>
                          </DialogHeader>
                          {editOrder && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <Label htmlFor="doNumber">Delivery Order</Label>
                                  <Input id="doNumber" value={editOrder.doNumber} disabled />
                                </div>
                                <div>
                                  <Label htmlFor="salesOrderNumber">Sales Order</Label>
                                  <Input id="salesOrderNumber" value={editOrder.SalesOrder?.orderNumber} disabled />
                                </div>
                                <div>
                                  <Label htmlFor="customerName">Customer</Label>
                                  <Input id="customerName" value={editOrder.SalesOrder?.Customer?.name} disabled />
                                </div>
                                <div>
                                  <Label htmlFor="scheduledDate">Delivery Date</Label>
                                  <Input id="scheduledDate" type="date" value={editScheduledDate} onChange={e => setEditScheduledDate(e.target.value)} disabled />
                                </div>
                                <div>
                                  <Label htmlFor="dispatchDate">Dispatch Date</Label>
                                  <Input id="dispatchDate" type="date" value={format(new Date(editOrder.SalesOrder.dispatchDate), "yyyy-MM-dd")} disabled />
                                </div>
                                {/* <div>
                                  <Label htmlFor="scheduledTime">Delivery Time</Label>
                                  <Input id="scheduledTime" type="time" value={editOrder.SalesOrder?.timeslot} disabled />
                                </div> */}
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                  <Label htmlFor="deliveryAddress">Delivery Address</Label>
                                  <Input id="deliveryAddress" placeholder="Enter delivery address" value={editDeliveryAddress} onChange={e => setEditDeliveryAddress(e.target.value)} disabled={editLoading} />
                                </div>
                                <div>
                                  <Label htmlFor="scheduledTime">Order Type</Label><br />
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${editOrder.SalesOrder.isDelivery
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {editOrder.SalesOrder.isDelivery ? 'Delivery' : 'Pickup'}
                                  </span>
                                </div>
                              </div>
                              {editOrder.SalesOrder.isDelivery && (
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <Label htmlFor="route">Route *</Label>
                                    <Select value={editRoute} onValueChange={setEditRoute} disabled={editLoading}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select route" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {routes.map((route) => (
                                          <SelectItem key={route.id} value={String(route.id)}>
                                            {route.name || route.routeName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor="driver">Driver</Label>
                                    <Select value={editDriver} onValueChange={setEditDriver} disabled={editLoading}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select driver" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {drivers.map((driver) => (
                                          <SelectItem key={driver.id} value={String(driver.id)}>
                                            {driver.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor="vehicle">Vehicle</Label>
                                    <Select value={editVehicle} onValueChange={setEditVehicle} disabled={editLoading}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select vehicle" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {vehicles.map((vehicle) => (
                                          <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                                            {vehicle.vehicleNumber} - {vehicle.vehicleType}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              )}

                              <div>
                                <Label>Delivery Items</Label>
                                <div className="border rounded-lg overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-gray-50">
                                        <TableHead className="font-semibold">Item</TableHead>
                                        <TableHead className="font-semibold">Quantity</TableHead>
                                        <TableHead className="font-semibold">Unit</TableHead>
                                        <TableHead className="font-semibold">Assigned Batch</TableHead>
                                        <TableHead className="font-semibold">Release Store</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {editItems.map((item, index) => {
                                        const unit = item.Item?.unit || ""
                                        const batchAvailability = item.batchAvailability
                                        const selectedBatchId = editItemBatches[item.id]
                                        const selectedBatch = batchAvailability?.batches?.find((b: any) => String(b.batchId) === selectedBatchId)
                                        const selectedStoreId = editItemStores[item.id]

                                        // Calculate item availability for the selected store from the fetched stock data
                                        const itemStocks = editItemStocks[item.id] || []
                                        const currentStoreStock = itemStocks.find((s: any) => String(s.storeId) === selectedStoreId)
                                        const storeTotalAvailable = currentStoreStock ? currentStoreStock.availableQty : 0

                                        // Prioritize selected batch qty if one is chosen, otherwise use the selected store's total
                                        const displayAvailableQty = selectedBatch ? selectedBatch.availableQuantity : storeTotalAvailable
                                        const hasSufficientStock = displayAvailableQty >= item.qty
                                        const stockShortage = Math.max(0, item.qty - displayAvailableQty)

                                        return (
                                          <TableRow key={index} className="hover:bg-gray-50">
                                            <TableCell className="font-medium">
                                              <div>
                                                <div>{item.Item?.name}</div>
                                                {item.Item?.barcode && (
                                                  <div className="text-xs text-muted-foreground">{item.Item.barcode}</div>
                                                )}
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <Input
                                                type="number"
                                                placeholder="Qty"
                                                value={item.qty}
                                                onChange={e => {
                                                  const updated = [...editItems]
                                                  updated[index].qty = Number(e.target.value)
                                                  setEditItems(updated)
                                                }}
                                                className="w-20"
                                              />
                                            </TableCell>
                                            <TableCell>{unit}</TableCell>
                                            <TableCell>
                                              {batchAvailability?.batches && batchAvailability.batches.length > 0 ? (
                                                <div className="space-y-2">
                                                  <Select
                                                    value={selectedBatchId}
                                                    onValueChange={(value) => {
                                                      setEditItemBatches(prev => ({
                                                        ...prev,
                                                        [item.id]: value
                                                      }))
                                                    }}
                                                    disabled={editLoading}
                                                  >
                                                    <SelectTrigger className="w-full">
                                                      <SelectValue placeholder="Select batch" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      {batchAvailability.batches.map((batch: any) => (
                                                        <SelectItem key={batch.batchId} value={String(batch.batchId)}>
                                                          <div className="flex flex-col">
                                                            <span className="font-medium">{batch.batchNumber}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                              Qty: {batch.availableQuantity} | GRN: {batch.grnNumber}
                                                              {batch.expireDate && ` | Exp: ${format(new Date(batch.expireDate), "yyyy-MM-dd")}`}
                                                            </span>
                                                          </div>
                                                        </SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              ) : (
                                                <span className="text-gray-500 text-sm">No batches available</span>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {/* load store list dropdown. defaul select store id 2 */}
                                              <Select
                                                value={editItemStores[item.id]}
                                                onValueChange={(value) => {
                                                  setEditItemStores(prev => ({
                                                    ...prev,
                                                    [item.id]: value
                                                  }))
                                                }}
                                                disabled={editLoading}
                                              >
                                                <SelectTrigger className="w-full">
                                                  <SelectValue placeholder="Select store" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {stores.map((store: any) => {
                                                    const itemStock = (editItemStocks[item.id] || []).find((s: any) => s.storeId === store.id)
                                                    const availableQty = itemStock?.availableQty || 0
                                                    const hasSufficient = availableQty >= item.qty

                                                    return (
                                                      <SelectItem key={store.id} value={String(store.id)}>
                                                        <div className="flex items-center justify-between w-full min-w-[200px] gap-2">
                                                          <span>{store.name}</span>
                                                          <Badge
                                                            variant={hasSufficient ? "outline" : "secondary"}
                                                            className={hasSufficient
                                                              ? "text-green-600 border-green-200 bg-green-50"
                                                              : "text-red-500 bg-red-50"
                                                            }
                                                          >
                                                            {availableQty} {unit}
                                                          </Badge>
                                                        </div>
                                                      </SelectItem>
                                                    )
                                                  })}
                                                </SelectContent>
                                              </Select>
                                            </TableCell>
                                          </TableRow>
                                        )
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                              <div className="flex justify-between items-center pt-4 border-t">
                                <div>
                                  {/* <div className="text-sm text-muted-foreground">
                                    Total Weight: {(() => {
                                      let total = 0;
                                      for (const item of editItems) {
                                        const unitWeight = item.Item?.weight || 1;
                                        total += item.qty * unitWeight;
                                      }
                                      return total;
                                    })()} Kg
                                  </div> */}
                                </div>
                                <Button onClick={handleSaveEdit} disabled={editLoading}>Save Changes</Button>
                              </div>
                              {editError && <div className="text-red-600">{editError}</div>}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Results Summary and Pagination */}
            <ResultsSummary />
            <PaginationControls />
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  )

}
