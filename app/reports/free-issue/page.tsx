"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Search, Package, Gift, FileText, FileSpreadsheet, Users, DollarSign, Tag, RefreshCw } from "lucide-react"
import { invoicesApi, customersApi, type Customer } from "@/lib/api"
import { cn } from "@/lib/utils"
import { generateFreeIssueExcel } from "@/lib/excel-generator"
import { generateFreeIssuePDF } from "@/lib/pdf-generator"
import { DocLink } from "@/components/reports/doc-link"

export interface FreeIssueLineItem {
  id: string
  invoiceId: number
  invoiceNumber: string
  invoiceDate: string
  customerId: number
  customerName: string
  salesPersonName: string
  itemId: number
  itemCode: string
  itemName: string
  unit: string
  category: string
  billedQty: number
  freeQty: number
  price: number
  totalFreeValue: number
}

export interface GroupedFreeItem {
  itemId: number
  itemCode: string
  itemName: string
  unit: string
  category: string
  totalBilledQty: number
  totalFreeQty: number
  totalFreeValue: number
  invoiceCount: number
}

export default function FreeIssueItemsReportPage() {
  const [loading, setLoading] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("ALL")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [viewMode, setViewMode] = useState<"item-summary" | "invoice-lines">("item-summary")

  // Raw extracted line items
  const [rawLineItems, setRawLineItems] = useState<FreeIssueLineItem[]>([])

  // Load customers list on mount
  useEffect(() => {
    customersApi.getAll()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
        setCustomers(list)
      })
      .catch((err) => console.error("Error loading customers:", err))
      .finally(() => setLoadingCustomers(false))
  }, [])

  // Load free issue items from approved invoices
  const loadReportData = async () => {
    setLoading(true)
    try {
      // Fetch approved invoices
      const response = await invoicesApi.getAll({
        status: "Approved",
        limit: 1000,
        customerId: selectedCustomerId !== "ALL" ? selectedCustomerId : undefined,
        dateFrom: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        dateTo: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
      })

      const invoices = response.data || []
      const extracted: FreeIssueLineItem[] = []

      invoices.forEach((inv) => {
        if (!inv.items || !Array.isArray(inv.items)) return

        inv.items.forEach((item: any, idx: number) => {
          const freeQty = Number(item.freeQty || (item as any).freeIssueQty || 0)
          if (freeQty > 0) {
            const price = Number(item.price || 0)
            extracted.push({
              id: `${inv.id}-${item.itemId || idx}-${idx}`,
              invoiceId: inv.id!,
              invoiceNumber: inv.invoiceNumber,
              invoiceDate: inv.invoiceDate,
              customerId: inv.customerId,
              customerName: inv.customer?.name || "Unknown Customer",
              salesPersonName: (inv.SalesPerson as any)?.name || (inv.SalesPerson as any)?.username || "N/A",
              itemId: item.itemId,
              itemCode: item.code || item.item?.sku || item.item?.code || "-",
              itemName: item.item?.name || "Unknown Item",
              unit: item.item?.unit || "pcs",
              category: item.item?.Category?.name || item.item?.category || "General",
              billedQty: Number(item.qty || 0),
              freeQty: freeQty,
              price: price,
              totalFreeValue: freeQty * price,
            })
          }
        })
      })

      setRawLineItems(extracted)
    } catch (error) {
      console.error("Error loading free issue report data:", error)
      setRawLineItems([])
    } finally {
      setLoading(false)
    }
  }

  // Auto load on mount
  useEffect(() => {
    loadReportData()
  }, [])

  // Filtered line items based on search term
  const filteredLineItems = rawLineItems.filter((item) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      item.itemName.toLowerCase().includes(term) ||
      item.itemCode.toLowerCase().includes(term) ||
      item.customerName.toLowerCase().includes(term) ||
      item.invoiceNumber.toLowerCase().includes(term) ||
      item.salesPersonName.toLowerCase().includes(term)
    )
  })

  // Grouped by Item for Item-summary view mode
  const groupedByItem: GroupedFreeItem[] = Object.values(
    filteredLineItems.reduce((acc: Record<string | number, GroupedFreeItem>, item) => {
      const id = item.itemId || item.itemName
      if (!acc[id]) {
        acc[id] = {
          itemId: item.itemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unit: item.unit,
          category: item.category,
          totalBilledQty: 0,
          totalFreeQty: 0,
          totalFreeValue: 0,
          invoiceCount: 0,
        }
      }
      acc[id].totalBilledQty += item.billedQty
      acc[id].totalFreeQty += item.freeQty
      acc[id].totalFreeValue += item.totalFreeValue
      acc[id].invoiceCount += 1
      return acc
    }, {})
  )

  // Overall Statistics
  const totalFreeQty = filteredLineItems.reduce((sum, item) => sum + item.freeQty, 0)
  const totalBilledQty = filteredLineItems.reduce((sum, item) => sum + item.billedQty, 0)
  const totalFreeValue = filteredLineItems.reduce((sum, item) => sum + item.totalFreeValue, 0)
  const uniqueItemsCount = new Set(filteredLineItems.map((item) => item.itemId)).size
  const uniqueInvoicesCount = new Set(filteredLineItems.map((item) => item.invoiceId)).size

  const formatCurrency = (amount: number) =>
    `LKR ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const DatePicker = ({ value, onChange, label }: { value?: Date; onChange: (d?: Date) => void; label: string }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 w-28 justify-start text-left font-normal text-xs", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-1.5 h-3 w-3" />
            {value ? format(value, "dd/MM/yy") : label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={value} onSelect={onChange} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  )

  return (
    <ERPLayout>
      <div className="space-y-4">
        {/* Page Title Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-200">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Free Issue Items Report</h1>
              <p className="text-xs text-muted-foreground">
                Detailed record of all free items issued in approved invoices
              </p>
            </div>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-purple-100 bg-purple-50/30">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700">
                <Tag className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Free Qty</p>
                <p className="text-lg font-bold text-purple-900">{totalFreeQty.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/30">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Free Value Cost</p>
                <p className="text-lg font-bold text-emerald-900">{formatCurrency(totalFreeValue)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50/30">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Distinct Items</p>
                <p className="text-lg font-bold text-blue-900">{uniqueItemsCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-100 bg-amber-50/30">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Approved Invoices</p>
                <p className="text-lg font-bold text-amber-900">{uniqueInvoicesCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls Card */}
        <Card>
          <div className="p-3.5 flex flex-wrap items-end justify-between gap-3 border-b">
            <div className="flex flex-wrap items-end gap-3 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="space-y-1 flex-1 min-w-[180px]">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search item, customer, invoice..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Customer Filter */}
              <div className="space-y-1 min-w-[160px]">
                <Label className="text-xs text-muted-foreground">Customer</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Customers</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filters */}
              <DatePicker value={startDate} onChange={setStartDate} label="Start Date" />
              <DatePicker value={endDate} onChange={setEndDate} label="End Date" />

              {/* Load / Refresh */}
              <Button size="sm" onClick={loadReportData} disabled={loading} className="h-8 px-3">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                Load Data
              </Button>
            </div>

            {/* View Mode & Export Options */}
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item-summary">Item Summary</SelectItem>
                  <SelectItem value="invoice-lines">Invoice Line Items</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={() => generateFreeIssueExcel(filteredLineItems, startDate, endDate)}
                disabled={filteredLineItems.length === 0}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={() => generateFreeIssuePDF(filteredLineItems, startDate, endDate)}
                disabled={filteredLineItems.length === 0}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          </div>

          {/* Table Display */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-xs">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading approved free issue items...
              </div>
            ) : viewMode === "item-summary" ? (
              /* Item Summary View Table */
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="py-2.5">Item Code</TableHead>
                    <TableHead className="py-2.5">Item Name</TableHead>
                    <TableHead className="py-2.5">Category</TableHead>
                    <TableHead className="py-2.5 text-center">Invoices Count</TableHead>
                    <TableHead className="py-2.5 text-right">Billed Qty</TableHead>
                    <TableHead className="py-2.5 text-right">Free Qty Issued</TableHead>
                    <TableHead className="py-2.5 text-right">Free Issue %</TableHead>
                    <TableHead className="py-2.5 text-right">Free Value (LKR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedByItem.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        {searchTerm ? "No matching free issue items found." : "No free issue items found in approved invoices."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedByItem.map((item) => {
                      const totalOverall = item.totalBilledQty + item.totalFreeQty
                      const freePercentage = totalOverall > 0 ? (item.totalFreeQty / totalOverall) * 100 : 0
                      return (
                        <TableRow key={item.itemId} className="hover:bg-muted/30 even:bg-muted/10">
                          <TableCell className="py-2 font-mono font-medium">{item.itemCode}</TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-purple-600" />
                              <span className="font-medium">{item.itemName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">{item.category}</TableCell>
                          <TableCell className="py-2 text-center font-medium">{item.invoiceCount}</TableCell>
                          <TableCell className="py-2 text-right">{item.totalBilledQty} {item.unit}</TableCell>
                          <TableCell className="py-2 text-right font-bold text-purple-700">
                            +{item.totalFreeQty} {item.unit}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">
                              {freePercentage.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right font-semibold text-emerald-700">
                            {formatCurrency(item.totalFreeValue)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            ) : (
              /* Invoice Detailed Line Items View Table */
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="py-2.5">Date</TableHead>
                    <TableHead className="py-2.5">Invoice #</TableHead>
                    <TableHead className="py-2.5">Customer</TableHead>
                    <TableHead className="py-2.5">Sales Rep</TableHead>
                    <TableHead className="py-2.5">Item Name</TableHead>
                    <TableHead className="py-2.5 text-right">Billed Qty</TableHead>
                    <TableHead className="py-2.5 text-right">Free Qty</TableHead>
                    <TableHead className="py-2.5 text-right">Unit Price</TableHead>
                    <TableHead className="py-2.5 text-right">Free Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLineItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                        {searchTerm ? "No matching invoice lines found." : "No free issue items found in approved invoices."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLineItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 even:bg-muted/10">
                        <TableCell className="py-2">
                          {item.invoiceDate ? format(new Date(item.invoiceDate), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell className="py-2">
                          <DocLink docType="invoice" docId={item.invoiceId} label={item.invoiceNumber} />
                        </TableCell>
                        <TableCell className="py-2 font-medium">{item.customerName}</TableCell>
                        <TableCell className="py-2 text-muted-foreground">{item.salesPersonName}</TableCell>
                        <TableCell className="py-2 font-medium">{item.itemName}</TableCell>
                        <TableCell className="py-2 text-right">{item.billedQty} {item.unit}</TableCell>
                        <TableCell className="py-2 text-right font-bold text-purple-700">
                          +{item.freeQty} {item.unit}
                        </TableCell>
                        <TableCell className="py-2 text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="py-2 text-right font-semibold text-emerald-700">
                          {formatCurrency(item.totalFreeValue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>
    </ERPLayout>
  )
}
