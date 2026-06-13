"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import {
  CalendarIcon,
  Loader2,
  Search,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileText
} from "lucide-react"
import { reportsApi, itemsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ItemSelect } from "@/components/items/item-select"
import { DocLink } from "@/components/reports/doc-link"

export default function MovementsReportsPage() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [stockMovements, setStockMovements] = useState<any[]>([])
  const [itemStockMovements, setItemStockMovements] = useState<any[]>([])

  // Filter States - General
  const [documentType, setDocumentType] = useState<string>("all")
  const [inOut, setInOut] = useState<string>("all")

  // Filter States - Item Specific
  const [selectedItem, setSelectedItem] = useState<string>("")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()

  useEffect(() => {
    itemsApi.getAll().then(res => setItems(Array.isArray(res) ? res : []))
  }, [])

  const loadStockMovements = async () => {
    setLoading(true)
    try {
      const data = await reportsApi.getStockMovements(
        documentType === "all" ? undefined : documentType,
        inOut === "all" ? undefined : inOut as "IN" | "OUT"
      )
      setStockMovements(data)
    } catch (error) {
      console.error('Error loading stock movements:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadItemStockMovements = async () => {
    if (!selectedItem) return
    setLoading(true)
    try {
      const data = await reportsApi.getItemStockMovements(
        selectedItem,
        startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate ? format(endDate, 'yyyy-MM-dd') : undefined
      )
      setItemStockMovements(data)
    } catch (error) {
      console.error('Error loading item stock movements:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(amount || 0)
  }

  const mapDocType = (type: string): "grn" | "gin" | "delivery-order" | "sales-order" | "invoice" | null => {
    const t = type?.toUpperCase()
    if (t === "GRN") return "grn"
    if (t === "GIN") return "gin"
    if (t === "DO" || t === "DELIVERY ORDER" || t === "DELIVERY_ORDER") return "delivery-order"
    if (t === "SO" || t === "SALES ORDER" || t === "SALES_ORDER") return "sales-order"
    if (t === "INV" || t === "INVOICE") return "invoice"
    return null
  }

  // Stats calculation
  const generalInCount = stockMovements.filter(m => m.inOut === "IN").reduce((acc, m) => acc + (m.qty || 0), 0)
  const generalOutCount = stockMovements.filter(m => m.inOut === "OUT").reduce((acc, m) => acc + (m.qty || 0), 0)

  const itemInCount = itemStockMovements.filter(m => m.inOut === "IN").reduce((acc, m) => acc + (m.qty || 0), 0)
  const itemOutCount = itemStockMovements.filter(m => m.inOut === "OUT").reduce((acc, m) => acc + (m.qty || 0), 0)

  return (
    <ERPLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ArrowUpDown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Stock Movements</h1>
              <p className="text-xs text-muted-foreground">Track item inbound and outbound history</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Card 1: General Stock Movements */}
          <div className="space-y-3">
            <Card className="border-dashed">
              <div className="p-3 border-b flex items-center justify-between">
                <span className="text-sm font-semibold">General Movements Filter</span>
                <Button size="sm" onClick={loadStockMovements} disabled={loading}>
                  {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                  Generate
                </Button>
              </div>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Doc Type</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Doc Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Documents</SelectItem>
                        <SelectItem value="GRN">GRN</SelectItem>
                        <SelectItem value="GIN">GIN</SelectItem>
                        <SelectItem value="DO">Delivery Order</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Direction</Label>
                    <Select value={inOut} onValueChange={setInOut}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All (IN/OUT)</SelectItem>
                        <SelectItem value="IN">IN</SelectItem>
                        <SelectItem value="OUT">OUT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {stockMovements.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                  <CardContent className="p-2.5 flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-emerald-50"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /></div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Total Inflow</div>
                      <div className="text-sm font-bold text-emerald-600">{generalInCount.toLocaleString()} Units</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-rose-500 shadow-sm">
                  <CardContent className="p-2.5 flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-rose-50"><TrendingDown className="h-3.5 w-3.5 text-rose-600" /></div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Total Outflow</div>
                      <div className="text-sm font-bold text-rose-600">{generalOutCount.toLocaleString()} Units</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="shadow-sm">
              <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/20">
                <span className="text-xs font-semibold">General Movements Log</span>
                {stockMovements.length > 0 && <span className="text-[10px] text-muted-foreground">{stockMovements.length} records</span>}
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                {stockMovements.length > 0 ? (
                  <Table className="text-xs">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow className="bg-muted/40">
                        <TableHead className="py-2 font-semibold">Date</TableHead>
                        <TableHead className="py-2 font-semibold">Document</TableHead>
                        <TableHead className="py-2 font-semibold">Item</TableHead>
                        <TableHead className="py-2 font-semibold">Store</TableHead>
                        <TableHead className="py-2 font-semibold">Dir</TableHead>
                        <TableHead className="py-2 font-semibold text-right">Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockMovements.map((movement, index) => {
                        const docType = mapDocType(movement.documentType)
                        return (
                          <TableRow key={index} className="hover:bg-muted/30 even:bg-muted/10">
                            <TableCell className="py-1.5 text-muted-foreground">{new Date(movement.createdAt || movement.movementDate).toLocaleDateString()}</TableCell>
                            <TableCell className="py-1.5 font-medium">
                              {docType && movement.documentNumber ? (
                                <DocLink docType={docType} docId={movement.documentNumber} label={`${movement.documentType} / ${movement.documentNumber}`} />
                              ) : (
                                movement.documentNumber || movement.documentType || "-"
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 max-w-[120px] truncate" title={movement.Stock?.Item?.name || movement.itemName}>{movement.Stock?.Item?.name || movement.itemName}</TableCell>
                            <TableCell className="py-1.5">{movement.Stock?.Store?.name || movement.storeName || "-"}</TableCell>
                            <TableCell className="py-1.5">
                              <Badge className="text-[9px] px-1 py-0" variant={movement.inOut === 'IN' ? 'default' : 'secondary'}>{movement.inOut}</Badge>
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-semibold">{movement.qty}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No general stock movements loaded. Set filters and generate.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Card 2: Item Specific Movements */}
          <div className="space-y-3">
            <Card className="border-dashed">
              <div className="p-3 border-b flex items-center justify-between">
                <span className="text-sm font-semibold">Item-Specific Filter</span>
                <Button size="sm" onClick={loadItemStockMovements} disabled={loading || !selectedItem}>
                  {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                  Generate
                </Button>
              </div>
              <CardContent className="p-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Select Item</Label>
                  <ItemSelect items={items} value={selectedItem} onValueChange={setSelectedItem} className="w-full text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                </div>
              </CardContent>
            </Card>

            {itemStockMovements.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                  <CardContent className="p-2.5 flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-emerald-50"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /></div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Item Inflow</div>
                      <div className="text-sm font-bold text-emerald-600">{itemInCount.toLocaleString()} Units</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-rose-500 shadow-sm">
                  <CardContent className="p-2.5 flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-rose-50"><TrendingDown className="h-3.5 w-3.5 text-rose-600" /></div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Item Outflow</div>
                      <div className="text-sm font-bold text-rose-600">{itemOutCount.toLocaleString()} Units</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="shadow-sm">
              <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/20">
                <span className="text-xs font-semibold">Item Movements Log</span>
                {itemStockMovements.length > 0 && <span className="text-[10px] text-muted-foreground">{itemStockMovements.length} records</span>}
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                {itemStockMovements.length > 0 ? (
                  <Table className="text-xs">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow className="bg-muted/40">
                        <TableHead className="py-2 font-semibold">Date</TableHead>
                        <TableHead className="py-2 font-semibold">Document</TableHead>
                        <TableHead className="py-2 font-semibold">Store</TableHead>
                        <TableHead className="py-2 font-semibold">Dir</TableHead>
                        <TableHead className="py-2 font-semibold text-right">Qty</TableHead>
                        <TableHead className="py-2 font-semibold text-right">Cost Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemStockMovements.map((movement, index) => {
                        const docType = mapDocType(movement.documentType)
                        return (
                          <TableRow key={index} className="hover:bg-muted/30 even:bg-muted/10">
                            <TableCell className="py-1.5 text-muted-foreground">{new Date(movement.movementDate || movement.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="py-1.5 font-medium">
                              {docType && movement.documentNumber ? (
                                <DocLink docType={docType} docId={movement.documentNumber} label={`${movement.documentType} / ${movement.documentNumber}`} />
                              ) : (
                                movement.documentNumber ? `${movement.documentType} / ${movement.documentNumber}` : movement.documentType || "-"
                              )}
                            </TableCell>
                            <TableCell className="py-1.5">{movement.storeName || movement.Stock?.Store?.name || "-"}</TableCell>
                            <TableCell className="py-1.5">
                              <Badge className="text-[9px] px-1 py-0" variant={movement.inOut === 'IN' ? 'default' : 'secondary'}>{movement.inOut}</Badge>
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-semibold">{movement.qty}</TableCell>
                            <TableCell className="py-1.5 text-right text-muted-foreground">{formatCurrency(movement.costPrice)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No item movements loaded. Choose an item and load.
                  </div>
                )}
              </div>
            </Card>
          </div>

        </div>
      </div>
    </ERPLayout>
  )
}
