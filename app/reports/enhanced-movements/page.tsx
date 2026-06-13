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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CalendarIcon,
  Loader2,
  TrendingUp,
  TrendingDown,
  Layers,
  Search,
  ArrowRightLeft,
  Warehouse,
  BarChart4
} from "lucide-react"
import { reportsApi, itemsApi, storesApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ItemSelect } from "@/components/items/item-select"
import { DocLink } from "@/components/reports/doc-link"

export default function EnhancedMovementsPage() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  
  // State
  const [detailedItemMovements, setDetailedItemMovements] = useState<any>(null)
  const [storeMovements, setStoreMovements] = useState<any>(null)
  const [movementTrends, setMovementTrends] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<string>("item")

  // Filter States
  const [selectedItem, setSelectedItem] = useState<string>("")
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [groupBy, setGroupBy] = useState<string>("week")

  useEffect(() => {
    const loadInitial = async () => {
      const [itemsRes, storesRes] = await Promise.all([itemsApi.getAll(), storesApi.getAll()])
      setItems(Array.isArray(itemsRes) ? itemsRes : [])
      setStores(Array.isArray(storesRes) ? storesRes : [])
    }
    loadInitial()
  }, [])

  const loadDetailedItemMovements = async () => {
    if (!selectedItem) return
    setLoading(true)
    try {
      const data = await reportsApi.getDetailedItemStockMovements(
        selectedItem,
        startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate ? format(endDate, 'yyyy-MM-dd') : undefined
      )
      setDetailedItemMovements(data)
    } catch (error) {
      console.error('Error loading detailed movements:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStoreMovements = async () => {
    if (!selectedStore) return
    setLoading(true)
    try {
      const data = await reportsApi.getStockMovementsByStore(
        selectedStore,
        startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate ? format(endDate, 'yyyy-MM-dd') : undefined
      )
      setStoreMovements(data)
    } catch (error) {
      console.error('Error loading store movements:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMovementTrends = async () => {
    setLoading(true)
    try {
      const data = await reportsApi.getStockMovementTrends(
        startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        groupBy
      )
      setMovementTrends(data)
    } catch (error) {
      console.error('Error loading trends:', error)
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

  // Safe checks for arrays
  const itemMovementsList = detailedItemMovements?.movements || []
  const storeMovementsList = storeMovements?.movements || []
  const trendList = Array.isArray(movementTrends) ? movementTrends : (movementTrends?.trends || [])

  return (
    <ERPLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Layers className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Enhanced Movements</h1>
              <p className="text-xs text-muted-foreground">Advanced stock movement analysis and trends</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="grid grid-cols-3 max-w-md h-9 text-xs">
            <TabsTrigger value="item" className="text-xs py-1 flex items-center gap-1"><ArrowRightLeft className="h-3.5 w-3.5" />Item Analysis</TabsTrigger>
            <TabsTrigger value="store" className="text-xs py-1 flex items-center gap-1"><Warehouse className="h-3.5 w-3.5" />Store Movements</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs py-1 flex items-center gap-1"><BarChart4 className="h-3.5 w-3.5" />Trends</TabsTrigger>
          </TabsList>

          {/* Date range filters shared or placed contextually */}
          <Card className="border-dashed">
            <CardContent className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8 text-xs", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-1.5 h-3 w-3" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : <span>Start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1 col-span-2 md:col-span-1">
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8 text-xs", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-1.5 h-3 w-3" />
                        {endDate ? format(endDate, "dd/MM/yyyy") : <span>End date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                  </Popover>
                </div>

                {activeTab === "item" && (
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-muted-foreground">Item</Label>
                    <div className="flex gap-2">
                      <ItemSelect items={items} value={selectedItem} onValueChange={setSelectedItem} className="w-full text-xs" />
                      <Button size="sm" onClick={loadDetailedItemMovements} disabled={loading || !selectedItem} className="h-8">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
                        Load
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === "store" && (
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-muted-foreground">Store</Label>
                    <div className="flex gap-2">
                      <Select value={selectedStore} onValueChange={setSelectedStore}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select Store" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={loadStoreMovements} disabled={loading || !selectedStore} className="h-8">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
                        Load
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === "trends" && (
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-muted-foreground">Group By</Label>
                    <div className="flex gap-2">
                      <Select value={groupBy} onValueChange={setGroupBy}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="week">Week</SelectItem>
                          <SelectItem value="month">Month</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={loadMovementTrends} disabled={loading} className="h-8 w-24">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
                        Load Trends
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tab Content: Item Analysis */}
          <TabsContent value="item" className="space-y-3 mt-0">
            {detailedItemMovements && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-3">
                      <div className="text-[10px] text-muted-foreground">Total Inbound</div>
                      <div className="text-lg font-bold text-emerald-600">
                        {detailedItemMovements.stats?.totalInbound?.toLocaleString() || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-rose-500 shadow-sm">
                    <CardContent className="p-3">
                      <div className="text-[10px] text-muted-foreground">Total Outbound</div>
                      <div className="text-lg font-bold text-rose-600">
                        {detailedItemMovements.stats?.totalOutbound?.toLocaleString() || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                    <CardContent className="p-3">
                      <div className="text-[10px] text-muted-foreground">Net Movement</div>
                      <div className={cn("text-lg font-bold", (detailedItemMovements.stats?.netMovement || 0) >= 0 ? "text-indigo-600" : "text-rose-600")}>
                        {detailedItemMovements.stats?.netMovement?.toLocaleString() || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="shadow-sm">
                  <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/20">
                    <span className="text-xs font-semibold">Detailed Item Stock Movements</span>
                    <span className="text-[10px] text-muted-foreground">{itemMovementsList.length} logs</span>
                  </div>
                  <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                    {itemMovementsList.length > 0 ? (
                      <Table className="text-xs">
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow className="bg-muted/40">
                            <TableHead className="py-2">Date</TableHead>
                            <TableHead className="py-2">Document</TableHead>
                            <TableHead className="py-2">Store / Vehicle</TableHead>
                            <TableHead className="py-2">Direction</TableHead>
                            <TableHead className="py-2 text-right">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itemMovementsList.map((movement: any, index: number) => {
                            const docType = mapDocType(movement.documentType)
                            const locationText = movement.Stock?.Store?.name || 
                                                 (movement.Stock?.Lorry?.vehicleNumber ? `Lorry: ${movement.Stock.Lorry.vehicleNumber}` : "Unknown Store")
                            return (
                              <TableRow key={index} className="hover:bg-muted/30 even:bg-muted/10">
                                <TableCell className="py-1.5 text-muted-foreground">{new Date(movement.date || movement.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell className="py-1.5 font-medium">
                                  {docType && movement.documentNumber ? (
                                    <DocLink docType={docType} docId={movement.documentNumber} label={`${movement.documentType} / ${movement.documentNumber}`} />
                                  ) : (
                                    movement.documentNumber ? `${movement.documentType} / ${movement.documentNumber}` : movement.documentType || "-"
                                  )}
                                </TableCell>
                                <TableCell className="py-1.5">{locationText}</TableCell>
                                <TableCell className="py-1.5">
                                  <Badge className="text-[9px] px-1.5 py-0" variant={movement.inOut === 'IN' ? 'default' : 'secondary'}>{movement.inOut}</Badge>
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-semibold">{movement.qty}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        No movement records found for this item in selected dates.
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Tab Content: Store Movements */}
          <TabsContent value="store" className="space-y-3 mt-0">
            {storeMovements && (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <Card className="border-l-4 border-l-primary shadow-sm col-span-2 md:col-span-1">
                    <CardContent className="p-3">
                      <div className="text-[10px] text-muted-foreground">Unique Items</div>
                      <div className="text-lg font-bold text-primary">
                        {storeMovements.storeInfo?.uniqueItems || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-emerald-500 shadow-sm col-span-2 md:col-span-1">
                    <CardContent className="p-3">
                      <div className="text-[10px] text-muted-foreground">Total Inbound</div>
                      <div className="text-lg font-bold text-emerald-600">
                        {storeMovements.storeInfo?.totalInbound?.toLocaleString() || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-rose-500 shadow-sm col-span-2 md:col-span-1">
                    <CardContent className="p-3">
                      <div className="text-[10px] text-muted-foreground">Total Outbound</div>
                      <div className="text-lg font-bold text-rose-600">
                        {storeMovements.storeInfo?.totalOutbound?.toLocaleString() || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-indigo-500 shadow-sm col-span-2 md:col-span-1">
                    <CardContent className="p-3">
                      <div className="text-[10px] text-muted-foreground">Net Movement</div>
                      <div className="text-lg font-bold text-indigo-600">
                        {storeMovements.storeInfo?.netMovement?.toLocaleString() || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="shadow-sm">
                  <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/20">
                    <span className="text-xs font-semibold">Store Movements Summary by Item</span>
                    <span className="text-[10px] text-muted-foreground">{storeMovements.itemMovements?.length || 0} items</span>
                  </div>
                  <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                    {storeMovements.itemMovements?.length > 0 ? (
                      <Table className="text-xs">
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow className="bg-muted/40">
                            <TableHead className="py-2">Item Name</TableHead>
                            <TableHead className="py-2">Category</TableHead>
                            <TableHead className="py-2 text-right">Inflow</TableHead>
                            <TableHead className="py-2 text-right">Outflow</TableHead>
                            <TableHead className="py-2 text-right">Net</TableHead>
                            <TableHead className="py-2">Last Movement</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {storeMovements.itemMovements.map((im: any, idx: number) => (
                            <TableRow key={idx} className="hover:bg-muted/30 even:bg-muted/10">
                              <TableCell className="py-1.5 font-medium">{im.itemName}</TableCell>
                              <TableCell className="py-1.5 text-muted-foreground">{im.category}</TableCell>
                              <TableCell className="py-1.5 text-right text-emerald-600 font-medium">+{im.inbound}</TableCell>
                              <TableCell className="py-1.5 text-right text-rose-600 font-medium">-{im.outbound}</TableCell>
                              <TableCell className="py-1.5 text-right font-bold">{im.netMovement}</TableCell>
                              <TableCell className="py-1.5 text-muted-foreground">{im.lastMovement ? new Date(im.lastMovement).toLocaleDateString() : "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        No item movement summary found for this store.
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Tab Content: Movement Trends */}
          <TabsContent value="trends" className="space-y-3 mt-0">
            {movementTrends && (
              <Card className="shadow-sm">
                <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/20">
                  <span className="text-xs font-semibold">Periodic Movement Trends ({groupBy})</span>
                  <span className="text-[10px] text-muted-foreground">{trendList.length} periods</span>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  {trendList.length > 0 ? (
                    <Table className="text-xs">
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow className="bg-muted/40">
                          <TableHead className="py-2">Period</TableHead>
                          <TableHead className="py-2 text-right">Total IN</TableHead>
                          <TableHead className="py-2 text-right">Total OUT</TableHead>
                          <TableHead className="py-2 text-right">Net Movement</TableHead>
                          <TableHead className="py-2 text-right">Tx Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trendList.map((trend: any, index: number) => (
                          <TableRow key={index} className="hover:bg-muted/30 even:bg-muted/10">
                            <TableCell className="py-1.5 font-medium">{trend.period}</TableCell>
                            <TableCell className="py-1.5 text-right text-green-600 font-medium">+{trend.totalInbound?.toLocaleString() || trend.totalIn?.toLocaleString() || 0}</TableCell>
                            <TableCell className="py-1.5 text-right text-red-600 font-medium">-{trend.totalOutbound?.toLocaleString() || trend.totalOut?.toLocaleString() || 0}</TableCell>
                            <TableCell className="py-1.5 text-right font-bold">{trend.netMovement?.toLocaleString() || 0}</TableCell>
                            <TableCell className="py-1.5 text-right text-muted-foreground">{trend.movementCount || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      No trend data available for selected date range.
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
