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
import { CalendarIcon, Loader2, Download, Search, Users, ChevronDown, ChevronRight, ShoppingCart, CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { reportsApi, usersApi } from "@/lib/api"
import { generateRepWiseSalesOrdersReportExcel } from "@/lib/excel-generator"
import { DocLink } from "@/components/reports/doc-link"

export default function RepWiseSalesOrdersReportPage() {
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState<any>(null)
    const [expandedReps, setExpandedReps] = useState<Record<number, boolean>>({})

    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()
    const [selectedSalesRep, setSelectedSalesRep] = useState<string>("all")
    const [selectedStatus, setSelectedStatus] = useState<string>("all")
    const [salesReps, setSalesReps] = useState<any[]>([])

    useEffect(() => {
        usersApi.getSalesPersons().then(d => setSalesReps(Array.isArray(d) ? d : [])).catch(console.error)
    }, [])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const data = await reportsApi.getRepWiseSalesOrders({
                startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
                salesRepId: selectedSalesRep && selectedSalesRep !== "all" ? parseInt(selectedSalesRep) : undefined,
                status: selectedStatus && selectedStatus !== "all" ? selectedStatus : undefined,
            })
            setReportData(data)
            setExpandedReps({})
        } catch (error) { console.error("Failed to load report", error) }
        finally { setLoading(false) }
    }

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(amount || 0)

    const toggleRepExpanded = (repId: number) => setExpandedReps(prev => ({ ...prev, [repId]: !prev[repId] }))

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case "approved": case "delivered": return <Badge className="bg-green-100 text-green-800 text-xs py-0">{status}</Badge>
            case "pending": return <Badge variant="secondary" className="text-xs py-0">Pending</Badge>
            case "rejected": case "cancelled": return <Badge variant="destructive" className="text-xs py-0">{status}</Badge>
            default: return <Badge variant="outline" className="text-xs py-0">{status}</Badge>
        }
    }

    let grandTotalValue = 0, grandTotalCount = 0, approvedTotalValue = 0, approvedTotalCount = 0, pendingTotalValue = 0, pendingTotalCount = 0
    if (reportData) {
        reportData.forEach((rep: any) => {
            if (rep.orders) {
                rep.orders.forEach((order: any) => {
                    const val = parseFloat(order.totalAmount || 0)
                    grandTotalValue += val; grandTotalCount++
                    if (order.status === 'Approved') { approvedTotalValue += val; approvedTotalCount++ }
                    else if (order.status === 'Pending') { pendingTotalValue += val; pendingTotalCount++ }
                })
            }
        })
    }

    return (
        <ERPLayout>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10"><Users className="h-5 w-5 text-amber-600" /></div>
                        <div>
                            <h1 className="text-xl font-bold">Rep Wise Sales Orders</h1>
                            <p className="text-xs text-muted-foreground">Sales Order performance by Sales Representative</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {reportData && (
                            <Button variant="outline" size="sm" onClick={() => generateRepWiseSalesOrdersReportExcel(reportData)}>
                                <Download className="mr-1.5 h-3.5 w-3.5" />Excel
                            </Button>
                        )}
                        <Button size="sm" onClick={fetchReport} disabled={loading}>
                            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                            Generate
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="border-dashed">
                    <CardContent className="p-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Start Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8 text-xs", !startDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-1.5 h-3 w-3" />{startDate ? format(startDate, "dd/MM/yy") : "Pick date"}
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
                                            <CalendarIcon className="mr-1.5 h-3 w-3" />{endDate ? format(endDate, "dd/MM/yy") : "Pick date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Sales Rep</Label>
                                <Select value={selectedSalesRep} onValueChange={setSelectedSalesRep}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Sales Reps" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sales Reps</SelectItem>
                                        {salesReps.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.fullName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Status</Label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Active (Excl. Cancelled)</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Approved">Approved</SelectItem>
                                        <SelectItem value="Rejected">Rejected</SelectItem>
                                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {reportData && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid gap-3 md:grid-cols-3">
                            <Card className="border-l-4 border-l-blue-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-blue-50"><ShoppingCart className="h-4 w-4 text-blue-600" /></div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Grand Total</div>
                                        <div className="text-sm font-bold text-blue-700">{formatCurrency(grandTotalValue)}</div>
                                        <div className="text-[10px] text-muted-foreground">{grandTotalCount} orders</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-green-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-green-50"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Approved Total</div>
                                        <div className="text-sm font-bold text-green-600">{formatCurrency(approvedTotalValue)}</div>
                                        <div className="text-[10px] text-muted-foreground">{approvedTotalCount} orders</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-orange-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-orange-50"><Clock className="h-4 w-4 text-orange-500" /></div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Pending Total</div>
                                        <div className="text-sm font-bold text-orange-600">{formatCurrency(pendingTotalValue)}</div>
                                        <div className="text-[10px] text-muted-foreground">{pendingTotalCount} orders</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Expandable Rep Table */}
                        <Card>
                            <div className="flex items-center justify-between px-4 py-2.5 border-b">
                                <span className="text-sm font-semibold">Sales Representative Performance</span>
                                <span className="text-xs text-muted-foreground">Click row to expand orders</span>
                            </div>
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="py-2 w-8"></TableHead>
                                            <TableHead className="py-2 font-semibold">Sales Representative</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Sales Orders</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Total Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.map((rep: any) => (
                                            <>
                                                <TableRow
                                                    key={rep.salesRepId}
                                                    className="cursor-pointer hover:bg-muted/50 even:bg-muted/10 select-none"
                                                    onClick={() => toggleRepExpanded(rep.salesRepId)}
                                                >
                                                    <TableCell className="py-1.5">
                                                        {expandedReps[rep.salesRepId]
                                                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 font-semibold">{rep.salesRepName}</TableCell>
                                                    <TableCell className="py-1.5 text-right">{rep.orderCount}</TableCell>
                                                    <TableCell className="py-1.5 text-right font-bold text-blue-700">{formatCurrency(rep.totalSales)}</TableCell>
                                                </TableRow>
                                                {expandedReps[rep.salesRepId] && (
                                                    <TableRow key={`${rep.salesRepId}-expanded`}>
                                                        <TableCell colSpan={4} className="bg-muted/20 p-3">
                                                            <div className="rounded-md border bg-card overflow-x-auto">
                                                                <Table className="text-xs">
                                                                    <TableHeader>
                                                                        <TableRow className="bg-muted/40">
                                                                            <TableHead className="py-1.5">Order #</TableHead>
                                                                            <TableHead className="py-1.5">Customer</TableHead>
                                                                            <TableHead className="py-1.5">Order Date</TableHead>
                                                                            <TableHead className="py-1.5">Delivery</TableHead>
                                                                            <TableHead className="py-1.5 text-right">Amount</TableHead>
                                                                            <TableHead className="py-1.5 text-center">Status</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {rep.orders.map((order: any) => (
                                                                            <TableRow key={order.id} className="hover:bg-muted/30">
                                                                                <TableCell className="py-1.5">
                                                                                    <DocLink docType="sales-order" docId={order.id} label={order.orderNumber} />
                                                                                </TableCell>
                                                                                <TableCell className="py-1.5">{order.customerName}</TableCell>
                                                                                <TableCell className="py-1.5 text-muted-foreground">{order.orderDate ? format(new Date(order.orderDate), 'dd/MM/yy') : '-'}</TableCell>
                                                                                <TableCell className="py-1.5 text-muted-foreground">{order.deliveryDate ? format(new Date(order.deliveryDate), 'dd/MM/yy') : '-'}</TableCell>
                                                                                <TableCell className="py-1.5 text-right font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                                                                                <TableCell className="py-1.5 text-center">{getStatusBadge(order.status)}</TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                        {rep.orders.length === 0 && (
                                                                            <TableRow><TableCell colSpan={6} className="text-center py-3 text-muted-foreground">No orders found.</TableCell></TableRow>
                                                                        )}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        ))}
                                        {reportData.length === 0 && (
                                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No data found.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </>
                )}

                {!reportData && !loading && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 rounded-full bg-muted mb-4"><Users className="h-8 w-8 text-muted-foreground" /></div>
                        <p className="text-sm font-medium text-muted-foreground">Set filters and click Generate</p>
                    </div>
                )}
            </div>
        </ERPLayout>
    )
}
