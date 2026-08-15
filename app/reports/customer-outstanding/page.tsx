"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import {
  CalendarIcon,
  Loader2,
  Download,
  Search,
  FileText,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Users,
  ChevronDown,
  ChevronRight,
  Printer,
  RotateCcw,
  CheckCircle2,
  Clock,
  Building2,
  ArrowUpDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import jsPDF from "jspdf"
import { reportsApi, customersApi, usersApi, locationsApi } from "@/lib/api"
import { generateCustomerOutstandingReportExcel } from "@/lib/excel-generator"
import { CustomerSelect } from "@/components/customer/customer-select"


export default function CustomerOutstandingReportPage() {
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  // Filter States
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all")
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>("all")
  const [selectedSalesRep, setSelectedSalesRep] = useState<string>("all")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [status, setStatus] = useState<string>("outstanding") // default to outstanding

  // Sorting State
  const [sortBy, setSortBy] = useState<string>("outstanding")
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC")

  // Expandable Row State
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

  // Dropdown options
  const [customers, setCustomers] = useState<any[]>([])
  const [salesReps, setSalesReps] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [customersData, salesRepsData, locationsData] = await Promise.allSettled([
          customersApi.getAll(),
          usersApi.getSalesPersons(),
          locationsApi.getAll()
        ])

        if (customersData.status === 'fulfilled') setCustomers(Array.isArray(customersData.value) ? customersData.value : [])
        if (salesRepsData.status === 'fulfilled') setSalesReps(Array.isArray(salesRepsData.value) ? salesRepsData.value : [])
        if (locationsData.status === 'fulfilled') setLocations(Array.isArray(locationsData.value) ? locationsData.value : [])
      } catch (error) {
        console.error("Failed to load report options", error)
      }
    }
    loadOptions()
  }, [])

  useEffect(() => {
    fetchReport()
  }, [sortBy, sortOrder])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const response = await reportsApi.getCustomerOutstanding({
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        customerId: selectedCustomer && selectedCustomer !== "all" ? selectedCustomer : undefined,
        customerType: selectedCustomerType && selectedCustomerType !== "all" ? selectedCustomerType : undefined,
        salesPersonId: selectedSalesRep && selectedSalesRep !== "all" ? selectedSalesRep : undefined,
        locationId: selectedLocation && selectedLocation !== "all" ? selectedLocation : undefined,
        status,
        sortBy,
        sortOrder
      })
      setReportData(response)
    } catch (error) {
      console.error("Failed to load customer outstanding report", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = () => {
    fetchReport()
  }

  const handleResetFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    setSelectedCustomer("all")
    setSelectedCustomerType("all")
    setSelectedSalesRep("all")
    setSelectedLocation("all")
    setStatus("outstanding")
    setSortBy("outstanding")
    setSortOrder("DESC")
    setTimeout(() => {
      fetchReport()
    }, 50)
  }

  const toggleRow = (customerId: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }))
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'))
    } else {
      setSortBy(field)
      setSortOrder('DESC')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
  }

  const downloadPDF = () => {
    if (!reportData || !reportData.data) return

    try {
      const doc = new jsPDF("landscape", "mm", "a4")
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      const margin = 10

      const rightText = (text: string, y: number, x: number = pageWidth - margin, options: any = {}) => {
        doc.text(text, x, y, { align: "right", ...options })
      }

      let yPos = 15

      // Logo & Header
      try {
        doc.setFillColor(253, 203, 88)
        doc.circle(margin + 12, yPos + 2, 10, "F")
        doc.addImage("/assets/fruit_easy_logo.png", "PNG", margin, yPos - 8, 22, 22)
      } catch (e) {
        doc.setFillColor(253, 203, 88)
        doc.circle(margin + 12, yPos + 2, 10, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text("fe", margin + 8, yPos + 4)
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(18)
      doc.setTextColor(15, 23, 42)
      rightText("CUSTOMER OUTSTANDING REPORT", yPos)

      yPos += 6
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 116, 139)
      rightText(`Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, yPos)

      yPos += 12
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(15, 23, 42)
      doc.text("Fruit Eazy ERP", margin, yPos)
      yPos += 4
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 116, 139)
      doc.text("No. 358, Jana Jaya City Mall, Rajagiriya, Sri Lanka | 0744118869", margin, yPos)

      // Summary Cards Box
      yPos += 8
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 16, 2, 2, "FD")

      const summaryY = yPos + 5
      const colWidth = (pageWidth - (margin * 2)) / 5

      const summaryItems = [
        { label: "Total Customers", value: (reportData.summary?.totalCustomers || 0).toString() },
        { label: "Total Invoiced", value: `LKR ${(reportData.summary?.totalInvoiced || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
        { label: "Total Paid", value: `LKR ${(reportData.summary?.totalPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
        { label: "Total Outstanding", value: `LKR ${(reportData.summary?.totalOutstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: [194, 65, 12] },
        { label: "Total Overdue", value: `LKR ${(reportData.summary?.totalOverdue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: [185, 28, 28] }
      ]

      summaryItems.forEach((item, idx) => {
        const itemX = margin + (idx * colWidth) + 5
        doc.setFontSize(7)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100, 116, 139)
        doc.text(item.label.toUpperCase(), itemX, summaryY)

        doc.setFontSize(9)
        doc.setFont("helvetica", "bold")
        if (item.color) {
          doc.setTextColor(item.color[0], item.color[1], item.color[2])
        } else {
          doc.setTextColor(15, 23, 42)
        }
        doc.text(item.value, itemX, summaryY + 5)
      })

      yPos += 22

      // Draw Table Header
      const drawTableHeader = (currentY: number) => {
        doc.setFillColor(30, 41, 59)
        doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F')

        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(255, 255, 255)

        const headers = [
          { label: "Code", x: margin + 3, align: "left" },
          { label: "Customer Name", x: margin + 25, align: "left" },
          { label: "Contact", x: margin + 90, align: "left" },
          { label: "Sales Rep", x: margin + 125, align: "left" },
          { label: "Invoiced (LKR)", x: margin + 175, align: "right" },
          { label: "Paid (LKR)", x: margin + 205, align: "right" },
          { label: "Outstanding (LKR)", x: margin + 245, align: "right" },
          { label: "Overdue (LKR)", x: margin + 275, align: "right" }
        ]

        headers.forEach(h => {
          doc.text(h.label, h.x, currentY + 4.5, { align: h.align as any })
        })
      }

      drawTableHeader(yPos)
      yPos += 7;

      // Table Rows
      (reportData.data || []).forEach((row: any, idx: number) => {
        if (yPos > pageHeight - 20) {
          doc.addPage()
          yPos = 15
          drawTableHeader(yPos)
          yPos += 7
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margin, yPos, pageWidth - (margin * 2), 6.5, 'F')
        }

        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(51, 65, 85)

        doc.text(row.customerCode || "-", margin + 3, yPos + 4.5)

        const nameStr = (row.customerName || "-").length > 32 ? (row.customerName || "").slice(0, 30) + ".." : (row.customerName || "-")
        doc.setFont("helvetica", "bold")
        doc.text(nameStr, margin + 25, yPos + 4.5)

        doc.setFont("helvetica", "normal")
        doc.text(row.contactNumber || "-", margin + 90, yPos + 4.5)

        const repStr = (row.salesPerson || "-").length > 20 ? (row.salesPerson || "").slice(0, 18) + ".." : (row.salesPerson || "-")
        doc.text(repStr, margin + 125, yPos + 4.5)

        doc.text((row.totalInvoiced || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), margin + 175, yPos + 4.5, { align: "right" })
        doc.text((row.totalPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), margin + 205, yPos + 4.5, { align: "right" })

        // Outstanding
        doc.setFont("helvetica", "bold")
        doc.setTextColor(194, 65, 12)
        doc.text((row.outstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), margin + 245, yPos + 4.5, { align: "right" })

        // Overdue
        doc.setTextColor(185, 28, 28)
        doc.text((row.overdue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), margin + 275, yPos + 4.5, { align: "right" })

        yPos += 6.5

        doc.setDrawColor(241, 245, 249)
        doc.line(margin, yPos, pageWidth - margin, yPos)
      })

      // Table Footer Totals Row
      if (yPos > pageHeight - 25) {
        doc.addPage()
        yPos = 15
      }

      doc.setFillColor(241, 245, 249)
      doc.rect(margin, yPos, pageWidth - (margin * 2), 7, 'F')
      doc.setDrawColor(203, 213, 225)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      doc.line(margin, yPos + 7, pageWidth - margin, yPos + 7)

      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(15, 23, 42)
      doc.text("GRAND TOTAL", margin + 25, yPos + 4.5)

      doc.text((reportData.summary?.totalInvoiced || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), margin + 175, yPos + 4.5, { align: "right" })
      doc.text((reportData.summary?.totalPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), margin + 205, yPos + 4.5, { align: "right" })

      doc.setTextColor(194, 65, 12)
      doc.text((reportData.summary?.totalOutstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), margin + 245, yPos + 4.5, { align: "right" })

      doc.setTextColor(185, 28, 28)
      doc.text((reportData.summary?.totalOverdue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), margin + 275, yPos + 4.5, { align: "right" })

      // Page numbers
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(148, 163, 184)
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" })
        doc.text("Fruit Eazy ERP — Confidential Report", margin, pageHeight - 8)
      }

      doc.save(`Customer_Outstanding_Report_${format(new Date(), "yyyyMMdd")}.pdf`)
      toast({
        title: "Success",
        description: "Customer Outstanding PDF downloaded successfully."
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Failed to generate PDF report.",
        variant: "destructive"
      })
    }
  }

  return (
    <ERPLayout>
      <div className="space-y-3 p-3 md:p-4 bg-slate-50/60 min-h-screen">
        {/* --- HEADER --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 px-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Customer Outstanding Report</h1>
              <p className="text-xs text-slate-500">Track customer receivables, overdue balances, and invoice aging</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {reportData && (
              <>
                <Button variant="outline" size="sm" onClick={downloadPDF} className="h-8 text-xs px-3 shadow-2xs border-slate-200 hover:bg-slate-50 rounded-lg text-rose-700 hover:text-rose-800">
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Download PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => generateCustomerOutstandingReportExcel(reportData)} className="h-8 text-xs px-3 shadow-2xs border-slate-200 hover:bg-slate-50 rounded-lg text-emerald-700 hover:text-emerald-800">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Excel Export
                </Button>
              </>
            )}

            <Button size="sm" onClick={handleApplyFilters} disabled={loading} className="h-8 text-xs px-3 shadow-2xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
              {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
              Generate Report
            </Button>
          </div>
        </div>

        {/* --- FILTERS PANEL --- */}
        <Card className="border border-slate-200/80 bg-white shadow-2xs">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {/* Customer */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Customer</Label>
                <CustomerSelect
                  customers={customers}
                  value={selectedCustomer === "all" ? "" : selectedCustomer}
                  onValueChange={(id) => setSelectedCustomer(id ? String(id) : "all")}
                  placeholder="All Customers"
                  showMainBadge={true}
                />
              </div>

              {/* Customer Category / Group */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Customer Group</Label>
                <Select value={selectedCustomerType} onValueChange={setSelectedCustomerType}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    <SelectItem value="Supermarket">Supermarket</SelectItem>
                    <SelectItem value="Own Shop">Own Shop</SelectItem>
                    <SelectItem value="Distributor">Distributor</SelectItem>
                    <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                    <SelectItem value="Walking">Walking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sales Rep */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Sales Rep</Label>
                <Select value={selectedSalesRep} onValueChange={setSelectedSalesRep}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="All Sales Reps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sales Reps</SelectItem>
                    {salesReps.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Location</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 text-xs bg-white font-medium">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="outstanding">Outstanding Only</SelectItem>
                    <SelectItem value="paid">Fully Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Date From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8 text-xs bg-white", !startDate && "text-slate-400")}>
                      <CalendarIcon className="mr-1.5 h-3 w-3" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Date To</Label>
                <div className="flex items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8 text-xs bg-white", !endDate && "text-slate-400")}>
                        <CalendarIcon className="mr-1.5 h-3 w-3" />
                        {endDate ? format(endDate, "dd/MM/yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                  </Popover>

                  <Button variant="ghost" size="icon" onClick={handleResetFilters} title="Reset Filters" className="h-8 w-8 text-slate-400 hover:text-slate-600 flex-shrink-0">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- RESULTS SECTION --- */}
        {reportData && (
          <div className="space-y-3">
            {/* KPI Summary Cards */}
            <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <Card className="border-l-4 border-l-slate-500 shadow-2xs bg-white">
                <CardContent className="p-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Customers</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">{reportData.summary?.totalCustomers || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                    <Users className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 shadow-2xs bg-white">
                <CardContent className="p-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</p>
                    <p className="text-base font-bold text-blue-700 mt-0.5">{formatCurrency(reportData.summary?.totalInvoiced)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500 shadow-2xs bg-white">
                <CardContent className="p-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Paid</p>
                    <p className="text-base font-bold text-emerald-700 mt-0.5">{formatCurrency(reportData.summary?.totalPaid)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              {/* Visually Emphasized Outstanding Amount */}
              <Card className="border-l-4 border-l-orange-500 shadow-2xs bg-orange-50/40 border-orange-200/80">
                <CardContent className="p-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Total Outstanding</p>
                    <p className="text-lg font-black text-orange-700 mt-0.5 tracking-tight">{formatCurrency(reportData.summary?.totalOutstanding)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              {/* Overdue Amount */}
              <Card className="border-l-4 border-l-red-500 shadow-2xs bg-red-50/40 border-red-200/80">
                <CardContent className="p-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Overdue Amount</p>
                    <p className="text-lg font-black text-red-700 mt-0.5 tracking-tight">{formatCurrency(reportData.summary?.totalOverdue)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-100 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Customer Outstanding Table */}
            <Card className="border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">Customer Records</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-700">
                    {reportData.data?.length || 0} Total Records
                  </Badge>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50">
                      <TableHead className="w-8 py-2 text-center"></TableHead>
                      <TableHead className="py-2 font-semibold">Code</TableHead>
                      <TableHead className="py-2 font-semibold cursor-pointer select-none" onClick={() => handleSort('customerName')}>
                        <div className="flex items-center gap-1">
                          Customer Name
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </TableHead>
                      <TableHead className="py-2 font-semibold">Contact</TableHead>
                      <TableHead className="py-2 font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('totalInvoiced')}>
                        <div className="flex items-center justify-end gap-1">
                          Invoiced
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </TableHead>
                      <TableHead className="py-2 font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('totalPaid')}>
                        <div className="flex items-center justify-end gap-1">
                          Paid
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </TableHead>
                      <TableHead className="py-2 font-semibold text-right">Adjustments</TableHead>
                      <TableHead className="py-2 font-semibold text-right cursor-pointer select-none text-orange-700" onClick={() => handleSort('outstanding')}>
                        <div className="flex items-center justify-end gap-1">
                          Outstanding
                          <ArrowUpDown className="h-3 w-3 text-orange-500" />
                        </div>
                      </TableHead>
                      <TableHead className="py-2 font-semibold text-right cursor-pointer select-none text-red-700" onClick={() => handleSort('overdue')}>
                        <div className="flex items-center justify-end gap-1">
                          Overdue
                          <ArrowUpDown className="h-3 w-3 text-red-500" />
                        </div>
                      </TableHead>
                      <TableHead className="py-2 font-semibold cursor-pointer select-none" onClick={() => handleSort('lastPaymentDate')}>
                        <div className="flex items-center gap-1">
                          Last Payment
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </TableHead>
                      <TableHead className="py-2 font-semibold text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.data && reportData.data.length > 0 ? (
                      reportData.data.map((row: any) => {
                        const isExpanded = expandedRows[row.customerId]
                        return (
                          <>
                            <TableRow
                              key={row.customerId}
                              className={cn(
                                "hover:bg-slate-50 transition-colors cursor-pointer",
                                isExpanded && "bg-slate-50/80"
                              )}
                              onClick={() => toggleRow(row.customerId)}
                            >
                              <TableCell className="py-2 text-center">
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                              </TableCell>
                              <TableCell className="py-2 font-mono text-[11px] text-slate-500">{row.customerCode}</TableCell>
                              <TableCell className="py-2">
                                <div>
                                  <span className="font-semibold text-slate-800">{row.customerName}</span>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-50">{row.customerType}</Badge>
                                    <span>• Rep: {row.salesPerson}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-slate-600">{row.contactNumber}</TableCell>
                              <TableCell className="py-2 text-right font-medium text-slate-700">{formatCurrency(row.totalInvoiced)}</TableCell>
                              <TableCell className="py-2 text-right font-medium text-emerald-700">{formatCurrency(row.totalPaid)}</TableCell>
                              <TableCell className="py-2 text-right font-medium text-slate-500">{formatCurrency(row.adjustments)}</TableCell>
                              <TableCell className="py-2 text-right font-bold text-orange-600">{formatCurrency(row.outstanding)}</TableCell>
                              <TableCell className="py-2 text-right font-bold text-red-600">{formatCurrency(row.overdue)}</TableCell>
                              <TableCell className="py-2 text-slate-500 text-[11px]">{row.lastPaymentDate || '-'}</TableCell>
                              <TableCell className="py-2 text-center">
                                {row.outstanding > 0 ? (
                                  <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0 hover:bg-orange-50 font-semibold">
                                    Outstanding
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 hover:bg-emerald-50 font-semibold">
                                    Paid
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>

                            {/* EXPANDABLE INVOICE DETAILS & AGING */}
                            {isExpanded && (
                              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                <TableCell colSpan={11} className="p-3 pl-8 border-b">
                                  <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                                    {/* Aging Summary Badges */}
                                    <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
                                      <span className="text-[11px] font-bold text-slate-600 uppercase">Aging Breakdown:</span>
                                      <Badge variant="outline" className="text-[10px] bg-slate-50">Current: {formatCurrency(row.aging?.current)}</Badge>
                                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">1-30 Days: {formatCurrency(row.aging?.days1_30)}</Badge>
                                      <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-800 border-orange-200">31-60 Days: {formatCurrency(row.aging?.days31_60)}</Badge>
                                      <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">61-90 Days: {formatCurrency(row.aging?.days61_90)}</Badge>
                                      <Badge variant="outline" className="text-[10px] bg-red-100 text-red-800 border-red-300">91-120 Days: {formatCurrency(row.aging?.days91_120)}</Badge>
                                      <Badge variant="outline" className="text-[10px] bg-red-200 text-red-900 border-red-400 font-bold">&gt;120 Days: {formatCurrency(row.aging?.above120)}</Badge>
                                    </div>

                                    {/* Invoice Sub-table */}
                                    <div>
                                      <p className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                        Invoice Transactions ({row.invoices?.length || 0})
                                      </p>
                                      {row.invoices && row.invoices.length > 0 ? (
                                        <div className="overflow-x-auto border border-slate-100 rounded-md">
                                          <Table className="text-[11px]">
                                            <TableHeader>
                                              <TableRow className="bg-slate-100/70">
                                                <TableHead className="py-1 font-semibold">Invoice #</TableHead>
                                                <TableHead className="py-1 font-semibold">Invoice Date</TableHead>
                                                <TableHead className="py-1 font-semibold">Due Date</TableHead>
                                                <TableHead className="py-1 font-semibold text-right">Invoice Amount</TableHead>
                                                <TableHead className="py-1 font-semibold text-right">Paid</TableHead>
                                                <TableHead className="py-1 font-semibold text-right">Outstanding</TableHead>
                                                <TableHead className="py-1 font-semibold text-center">Overdue Status</TableHead>
                                                <TableHead className="py-1 font-semibold text-center">Status</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {row.invoices.map((inv: any) => (
                                                <TableRow key={inv.id} className="hover:bg-slate-50">
                                                  <TableCell className="py-1 font-semibold text-emerald-700">#{inv.invoiceNumber}</TableCell>
                                                  <TableCell className="py-1 text-slate-500">{inv.invoiceDate ? format(new Date(inv.invoiceDate), 'dd/MM/yyyy') : '-'}</TableCell>
                                                  <TableCell className="py-1 text-slate-500">{inv.dueDate ? format(new Date(inv.dueDate), 'dd/MM/yyyy') : '-'}</TableCell>
                                                  <TableCell className="py-1 text-right font-medium text-slate-800">{formatCurrency(inv.totalAmount)}</TableCell>
                                                  <TableCell className="py-1 text-right font-medium text-emerald-700">{formatCurrency(inv.paidAmount)}</TableCell>
                                                  <TableCell className="py-1 text-right font-bold text-orange-600">{formatCurrency(inv.outstandingAmount)}</TableCell>
                                                  <TableCell className="py-1 text-center">
                                                    {inv.isOverdue ? (
                                                      <Badge className="bg-red-50 text-red-700 border-red-200 text-[9px] px-1 py-0">
                                                        {inv.daysOverdue} Days Overdue
                                                      </Badge>
                                                    ) : (
                                                      <Badge className="bg-slate-50 text-slate-500 border-slate-200 text-[9px] px-1 py-0">
                                                        On Schedule
                                                      </Badge>
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="py-1 text-center font-medium text-slate-600">{inv.status}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-slate-400 py-2">No individual invoices recorded for this customer.</p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12 text-slate-400">
                          <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-medium">No outstanding balances found for the selected filters.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ERPLayout>
  )
}
