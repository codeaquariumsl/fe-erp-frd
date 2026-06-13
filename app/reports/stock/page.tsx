"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CalendarIcon,
  FileText,
  FileSpreadsheet,
  Loader2,
  Boxes,
  Search,
  ArrowRightLeft,
  Warehouse,
  ClipboardList
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { reportsApi, storesApi, itemsApi, categoriesApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { generateStockSummaryPDF, generateBincardPDF } from "@/lib/pdf-generator"
import { generateBincardExcel, generateStockMovementSummaryExcel } from "@/lib/excel-generator"
import { DocLink } from "@/components/reports/doc-link"
import { ItemSelect } from "@/components/items/item-select"

export default function StockReportsPage() {
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  // Tab states
  const [activeTab, setActiveTab] = useState<string>("summary")

  // Stock Reports State
  const [stockSummary, setStockSummary] = useState<any[]>([])
  const [stockByStore, setStockByStore] = useState<any[]>([])
  const [stockMovementSummary, setStockMovementSummary] = useState<any>(null)
  const [binCardReport, setBinCardReport] = useState<any>(null)

  // Filter States - Stock Movement Summary
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [stockMovementItem, setStockMovementItem] = useState<string>("")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()

  // Filter States - Stock By Store
  const [selectedStore, setSelectedStore] = useState<string>("")

  // Filter States - Bincard
  const [bincardItem, setBincardItem] = useState<string>("")
  const [bincardStore, setBincardStore] = useState<string>("")
  const [bincardStartDate, setBincardStartDate] = useState<Date>()
  const [bincardEndDate, setBincardEndDate] = useState<Date>()

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [storesResponse, itemsResponse, categoriesResponse] = await Promise.all([
          storesApi.getAll(),
          itemsApi.getAll(),
          categoriesApi.getAll()
        ])
        setStores(Array.isArray(storesResponse) ? storesResponse : [])
        setItems(Array.isArray(itemsResponse) ? itemsResponse : [])
        setCategories(Array.isArray(categoriesResponse) ? categoriesResponse : [])
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }
    loadInitialData()
  }, [])

  const loadStockSummary = async () => {
    setLoading(true)
    try {
      const data = await reportsApi.getStockSummary()
      setStockSummary(data)
    } catch (error) {
      console.error('Error loading stock summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStockMovementSummary = async () => {
    if (!selectedCategory || !startDate || !endDate) return
    setLoading(true)
    try {
      const data = await reportsApi.getStockMovementSummary(
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd'),
        parseInt(selectedCategory),
        stockMovementItem && stockMovementItem !== "all_items" ? parseInt(stockMovementItem) : undefined
      )
      setStockMovementSummary(data)
    } catch (error) {
      console.error('Error loading stock movement summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStockByStore = async () => {
    if (!selectedStore) return
    setLoading(true)
    try {
      const data = await reportsApi.getStockByStore(selectedStore)
      setStockByStore(data)
    } catch (error) {
      console.error('Error loading stock by store:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBinCardReport = async () => {
    if (!bincardItem || !bincardStore || !bincardStartDate || !bincardEndDate) return
    setLoading(true)
    try {
      const data = await reportsApi.getBinCard(
        bincardItem,
        format(bincardStartDate, 'yyyy-MM-dd'),
        format(bincardEndDate, 'yyyy-MM-dd'),
        bincardStore
      )
      setBinCardReport(data)
    } catch (error) {
      console.error('Error loading bincard report:', error)
    } finally {
      setLoading(false)
    }
  }

  // Parse bincard refNo for clickable link support
  const getBincardDocLink = (refNo: string) => {
    if (!refNo) return null
    const parts = refNo.split("-")
    if (parts.length < 2) return null
    const typeStr = parts[0]?.toUpperCase()
    const docId = parts.slice(1).join("-")

    let docType: "grn" | "gin" | "delivery-order" | "sales-order" | "invoice" | null = null
    if (typeStr === "GRN") docType = "grn"
    else if (typeStr === "GIN") docType = "gin"
    else if (typeStr === "DO") docType = "delivery-order"
    else if (typeStr === "SO") docType = "sales-order"
    else if (typeStr === "INV" || typeStr === "INVOICE") docType = "invoice"

    if (docType && docId) {
      return { docType, docId }
    }
    return null
  }

  return (
    <ERPLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10">
              <Boxes className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Stock Reports</h1>
              <p className="text-xs text-muted-foreground">View and export stock-related reports and bincards</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="grid grid-cols-4 max-w-2xl h-9 text-xs">
            <TabsTrigger value="summary" className="text-xs py-1">Stock Summary</TabsTrigger>
            <TabsTrigger value="movements" className="text-xs py-1">Movement Summary</TabsTrigger>
            <TabsTrigger value="by-store" className="text-xs py-1">Stock By Store</TabsTrigger>
            <TabsTrigger value="bincard" className="text-xs py-1">Bincard Report</TabsTrigger>
          </TabsList>

          {/* TAB 1: Stock Summary */}
          <TabsContent value="summary" className="space-y-3 mt-0">
            <Card className="border-dashed">
              <CardContent className="p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Retrieve total available stock across all stores</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={loadStockSummary} disabled={loading}>
                    {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                    Generate
                  </Button>
                  {stockSummary.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => generateStockSummaryPDF(stockSummary)}>
                      <FileText className="mr-1.5 h-3.5 w-3.5 text-red-500" />
                      PDF
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {stockSummary.length > 0 && (
              <Card className="shadow-sm">
                <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/20">
                  <span className="text-xs font-semibold">Total Stock Summary</span>
                  <span className="text-[10px] text-muted-foreground">{stockSummary.length} items</span>
                </div>
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="py-2">Item</TableHead>
                        <TableHead className="py-2 text-right">Total Qty</TableHead>
                        <TableHead className="py-2">Unit</TableHead>
                        <TableHead className="py-2 text-right">Stores Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockSummary.map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/30 even:bg-muted/10">
                          <TableCell className="py-1.5 font-medium">{item.Item?.name || "Unknown Item"}</TableCell>
                          <TableCell className="py-1.5 text-right font-semibold text-teal-600">{item.totalQty?.toLocaleString()}</TableCell>
                          <TableCell className="py-1.5 text-muted-foreground">{item.Item?.unit || "-"}</TableCell>
                          <TableCell className="py-1.5 text-right font-medium">{item.storeCount || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: Stock Movement Summary */}
          <TabsContent value="movements" className="space-y-3 mt-0">
            <Card className="border-dashed">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Item</Label>
                    <ItemSelect
                      items={[
                        { id: "all_items" as any, name: "All Items" },
                        ...items.filter(item => !selectedCategory || item.categoryId === parseInt(selectedCategory))
                      ]}
                      value={stockMovementItem || "all_items"}
                      onValueChange={setStockMovementItem}
                      placeholder="All Items"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8 text-xs", !startDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {startDate ? format(startDate, "dd/MM/yyyy") : <span>Start</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8 text-xs", !endDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {endDate ? format(endDate, "dd/MM/yyyy") : <span>End</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex gap-2">
                    <Button className="w-full h-8" size="sm" onClick={loadStockMovementSummary} disabled={loading || !selectedCategory || !startDate || !endDate}>
                      {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Search className="mr-1 h-3 w-3" />}
                      Generate
                    </Button>
                    {stockMovementSummary && (
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => generateStockMovementSummaryExcel(stockMovementSummary)}>
                        <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {stockMovementSummary && (
              <Card className="shadow-sm">
                <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/20">
                  <span className="text-xs font-semibold">Stock Movement summary</span>
                  <span className="text-[10px] text-muted-foreground">{stockMovementSummary.data?.length || 0} items</span>
                </div>
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="py-2">Item Name</TableHead>
                        <TableHead className="py-2 text-right">Opening</TableHead>
                        <TableHead className="py-2 text-right">IN</TableHead>
                        <TableHead className="py-2 text-right">OUT</TableHead>
                        <TableHead className="py-2 text-right">Closing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockMovementSummary.data?.map((item: any, index: number) => (
                        <TableRow key={index} className="hover:bg-muted/30 even:bg-muted/10">
                          <TableCell className="py-1.5 font-medium">{item.itemName}</TableCell>
                          <TableCell className="py-1.5 text-right font-medium text-muted-foreground">{item.opening}</TableCell>
                          <TableCell className="py-1.5 text-right text-emerald-600 font-semibold">+{item.inQty}</TableCell>
                          <TableCell className="py-1.5 text-right text-rose-600 font-semibold">-{item.outQty}</TableCell>
                          <TableCell className="py-1.5 text-right font-bold text-primary">{item.closing}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB 3: Stock by Store */}
          <TabsContent value="by-store" className="space-y-3 mt-0">
            <Card className="border-dashed">
              <CardContent className="p-3">
                <div className="flex items-end gap-3 max-w-md">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-muted-foreground">Store</Label>
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select Store" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id.toString()}>{store.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={loadStockByStore} disabled={loading || !selectedStore} className="h-8">
                    {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                    Generate
                  </Button>
                </div>
              </CardContent>
            </Card>

            {stockByStore.length > 0 && (
              <Card className="shadow-sm">
                <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/20">
                  <span className="text-xs font-semibold">Available Stock in Store</span>
                  <span className="text-[10px] text-muted-foreground">{stockByStore.length} items</span>
                </div>
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="py-2">Item</TableHead>
                        <TableHead className="py-2 text-right">Quantity</TableHead>
                        <TableHead className="py-2">Unit</TableHead>
                        <TableHead className="py-2">Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockByStore.map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/30 even:bg-muted/10">
                          <TableCell className="py-1.5 font-medium">{item.Item?.name || "Unknown Item"}</TableCell>
                          <TableCell className="py-1.5 text-right font-bold text-teal-600">{item.availableQty?.toLocaleString()}</TableCell>
                          <TableCell className="py-1.5 text-muted-foreground">{item.Item?.unit || "-"}</TableCell>
                          <TableCell className="py-1.5 text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB 4: Bincard Report */}
          <TabsContent value="bincard" className="space-y-3 mt-0">
            <Card className="border-dashed">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Select Item</Label>
                    <ItemSelect
                      items={items}
                      value={bincardItem}
                      onValueChange={setBincardItem}
                      placeholder="Select Item"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Select Store</Label>
                    <Select value={bincardStore} onValueChange={setBincardStore}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select Store" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id.toString()}>{store.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8 text-xs", !bincardStartDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {bincardStartDate ? format(bincardStartDate, "dd/MM/yyyy") : <span>Start</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={bincardStartDate} onSelect={setBincardStartDate} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8 text-xs", !bincardEndDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {bincardEndDate ? format(bincardEndDate, "dd/MM/yyyy") : <span>End</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={bincardEndDate} onSelect={setBincardEndDate} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex gap-2">
                    <Button className="w-full h-8 text-xs" size="sm" onClick={loadBinCardReport} disabled={loading || !bincardItem || !bincardStore || !bincardStartDate || !bincardEndDate}>
                      {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Search className="mr-1 h-3 w-3" />}
                      Generate
                    </Button>
                    {binCardReport && (
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => generateBincardPDF(binCardReport)}>
                          <FileText className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => generateBincardExcel(binCardReport)}>
                          <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {binCardReport && (
              <Card className="shadow-sm">
                <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">Bin Card Records</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">{binCardReport.location}</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{binCardReport.data?.length || 0} records</span>
                </div>
                <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                  {binCardReport.data?.length > 0 ? (
                    <Table className="text-xs">
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow className="bg-muted/40">
                          <TableHead className="py-2">Date</TableHead>
                          <TableHead className="py-2">Ref No</TableHead>
                          <TableHead className="py-2">Description</TableHead>
                          <TableHead className="py-2 text-right">IN</TableHead>
                          <TableHead className="py-2 text-right">OUT</TableHead>
                          <TableHead className="py-2 text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {binCardReport.data.map((record: any, index: number) => {
                          const docLinkData = getBincardDocLink(record.refNo)
                          return (
                            <TableRow key={index} className="hover:bg-muted/30 even:bg-muted/10">
                              <TableCell className="py-1.5 text-muted-foreground">{new Date(record.date).toLocaleDateString()}</TableCell>
                              <TableCell className="py-1.5 font-medium">
                                {docLinkData ? (
                                  <DocLink docType={docLinkData.docType} docId={docLinkData.docId} label={record.refNo} />
                                ) : (
                                  record.refNo || "-"
                                )}
                              </TableCell>
                              <TableCell className="py-1.5 max-w-[200px] truncate" title={record.description}>{record.description}</TableCell>
                              <TableCell className="py-1.5 text-right font-medium text-emerald-600">{record.inQty > 0 ? `+${record.inQty}` : "-"}</TableCell>
                              <TableCell className="py-1.5 text-right font-medium text-rose-600">{record.outQty > 0 ? `-${record.outQty}` : "-"}</TableCell>
                              <TableCell className="py-1.5 text-right font-bold text-primary">{record.balance}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      No records found for selected filters.
                    </div>
                  )}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ERPLayout>
  )
}
