"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Search, Users, FileText, FileSpreadsheet, ArrowLeft, TrendingUp, DollarSign, Clock, CheckCircle } from "lucide-react"
import { reportsApi, suppliersApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { generateSupplierWisePOExcel } from "@/lib/excel-generator"
import { generateSupplierWisePOPDF } from "@/lib/pdf-generator"
import { DocLink } from "@/components/reports/doc-link"

export default function SupplierWisePOReportPage() {
    const [loading, setLoading] = useState(false)
    const [loadingSuppliers, setLoadingSuppliers] = useState(true)
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all")
    const [selectedStatus, setSelectedStatus] = useState<string>("all")
    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        suppliersApi.getAll().then((res: any) => {
            setSuppliers(Array.isArray(res) ? res : []);
        }).catch(() => setSuppliers([])).finally(() => setLoadingSuppliers(false));
    }, [])

    const loadData = async (supplierIdOverride?: string) => {
        setLoading(true)
        const targetSupplierId = supplierIdOverride !== undefined ? supplierIdOverride : selectedSupplierId;
        try {
            const result = await reportsApi.getSupplierWisePO(
                startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
                targetSupplierId === "all" ? undefined : targetSupplierId,
                selectedStatus === "all" ? undefined : selectedStatus
            )
            setData(result)
        } catch (error) {
            console.error('Error loading supplier PO report data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSupplierRowClick = async (supplierId: number) => {
        setSelectedSupplierId(supplierId.toString())
        await loadData(supplierId.toString())
    }

    const handleBackToSummary = () => {
        setSelectedSupplierId("all")
        setData(null)
    }

    const formatCurrency = (amount: number) => 
        `LKR ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case "approved": return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs py-0">Approved</Badge>
            case "pending": return <Badge variant="secondary" className="text-xs py-0">Pending</Badge>
            case "completed": 
            case "received": return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs py-0">Completed</Badge>
            case "cancelled": return <Badge variant="destructive" className="text-xs py-0">Cancelled</Badge>
            default: return <Badge variant="outline" className="text-xs py-0">{status}</Badge>
        }
    }

    const DatePicker = ({ value, onChange, label }: { value?: Date, onChange: (d?: Date) => void, label: string }) => (
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 w-28 justify-start text-left font-normal text-xs", !value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-1.5 h-3 w-3" />
                        {value ? format(value, "dd/MM/yy") : label}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={value} onSelect={onChange} initialFocus /></PopoverContent>
            </Popover>
        </div>
    )

    // Render Summary Mode
    const renderSummaryMode = () => {
        const totalPOAmount = data ? data.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0) : 0;
        const totalPOCount = data ? data.reduce((sum: number, s: any) => sum + (s.poCount || 0), 0) : 0;

        return (
            <div className="space-y-4 animate-in fade-in duration-300">
                {/* Stats Cards */}
                {data && data.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Card>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Total PO Count</p>
                                    <p className="text-xl font-bold leading-tight">{totalPOCount.toLocaleString()} orders</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Total Amount Ordered</p>
                                    <p className="text-xl font-bold leading-tight">{formatCurrency(totalPOAmount)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Summary Table */}
                {data && data.length > 0 ? (
                    <Card>
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <span className="text-sm font-semibold">Suppliers PO Summary</span>
                            <span className="text-xs text-muted-foreground">{data.length} suppliers found</span>
                        </div>
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                                        <TableHead className="py-2.5 font-semibold">Supplier Name</TableHead>
                                        <TableHead className="py-2.5 font-semibold">Email</TableHead>
                                        <TableHead className="py-2.5 font-semibold">Phone</TableHead>
                                        <TableHead className="py-2.5 text-center font-semibold">Total Orders</TableHead>
                                        <TableHead className="py-2.5 text-center font-semibold text-amber-600">Pending</TableHead>
                                        <TableHead className="py-2.5 text-center font-semibold text-emerald-600">Approved</TableHead>
                                        <TableHead className="py-2.5 text-center font-semibold text-blue-600">Completed</TableHead>
                                        <TableHead className="py-2.5 text-right font-semibold">Total Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((s: any, idx: number) => (
                                        <TableRow 
                                            key={idx} 
                                            onClick={() => handleSupplierRowClick(s.supplierId)}
                                            className="hover:bg-muted/30 even:bg-muted/10 cursor-pointer"
                                        >
                                            <TableCell className="py-2 font-medium text-blue-700 hover:underline">{s.supplierName}</TableCell>
                                            <TableCell className="py-2 text-muted-foreground">{s.email || '-'}</TableCell>
                                            <TableCell className="py-2 text-muted-foreground">{s.phone || '-'}</TableCell>
                                            <TableCell className="py-2 text-center font-medium">{s.poCount}</TableCell>
                                            <TableCell className="py-2 text-center text-amber-600 font-semibold">{s.pendingCount}</TableCell>
                                            <TableCell className="py-2 text-center text-emerald-600 font-semibold">{s.approvedCount}</TableCell>
                                            <TableCell className="py-2 text-center text-blue-600 font-semibold">{s.completedCount}</TableCell>
                                            <TableCell className="py-2 text-right font-semibold">{formatCurrency(s.totalAmount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                ) : (
                    !loading && (
                        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-card border-dashed">
                            <div className="p-3.5 rounded-full bg-blue-500/5 mb-3 text-blue-500">
                                <Users className="h-8 w-8 opacity-75" />
                            </div>
                            <p className="text-sm font-semibold text-muted-foreground">No purchase order data loaded</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">Select filters above and click Load Report to list supplier order details.</p>
                        </div>
                    )
                )}
            </div>
        )
    }

    // Render Detail Mode
    const renderDetailMode = () => {
        if (!data || !data.supplierStats) return null;
        const stats = data.supplierStats;
        const purchaseOrders = data.purchaseOrders || [];

        return (
            <div className="space-y-4 animate-in fade-in duration-300">
                {/* Back Link Bar */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={handleBackToSummary} className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to Suppliers Summary
                    </Button>
                    <span className="text-xs text-muted-foreground font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                        Analyzing: {stats.supplierName}
                    </span>
                </div>

                {/* Stats cards for specific supplier */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                                <FileText className="h-4.5 w-4.5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Total POs</p>
                                <p className="text-lg font-bold leading-tight">{stats.totalOrders}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                                <DollarSign className="h-4.5 w-4.5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Total Spent</p>
                                <p className="text-lg font-bold leading-tight text-emerald-700">{formatCurrency(stats.totalAmount)}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                                <TrendingUp className="h-4.5 w-4.5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Avg Order Value</p>
                                <p className="text-lg font-bold leading-tight">{formatCurrency(stats.totalOrders > 0 ? stats.totalAmount / stats.totalOrders : 0)}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600">
                                <Clock className="h-4.5 w-4.5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Pending Orders</p>
                                <p className="text-lg font-bold leading-tight text-violet-700">{stats.statusBreakdown?.Pending || 0}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Details Tabs */}
                <Tabs defaultValue="history" className="w-full">
                    <TabsList className="grid w-64 grid-cols-2 h-9 p-0.5 bg-muted rounded-lg">
                        <TabsTrigger value="history" className="text-xs h-8">PO History</TabsTrigger>
                        <TabsTrigger value="items" className="text-xs h-8">Item Breakdown</TabsTrigger>
                    </TabsList>
                    
                    {/* PO History Tab */}
                    <TabsContent value="history" className="mt-3">
                        <Card>
                            <div className="px-4 py-3 border-b">
                                <span className="text-sm font-semibold">Purchase Orders List</span>
                            </div>
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                            <TableHead className="py-2.5 font-semibold">PO Number</TableHead>
                                            <TableHead className="py-2.5 font-semibold">Order Date</TableHead>
                                            <TableHead className="py-2.5 font-semibold">Delivery Date</TableHead>
                                            <TableHead className="py-2.5 font-semibold">Status</TableHead>
                                            <TableHead className="py-2.5 text-right font-semibold">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {purchaseOrders.map((po: any, idx: number) => (
                                            <TableRow key={idx} className="hover:bg-muted/30 even:bg-muted/10">
                                                <TableCell className="py-2 font-medium">
                                                    <DocLink docType="purchase-order" docId={po.id} label={po.orderNumber} />
                                                </TableCell>
                                                <TableCell className="py-2 text-muted-foreground">{po.orderDate ? format(new Date(po.orderDate), 'dd/MM/yyyy') : '-'}</TableCell>
                                                <TableCell className="py-2 text-muted-foreground">{po.deliveryDate ? format(new Date(po.deliveryDate), 'dd/MM/yyyy') : '-'}</TableCell>
                                                <TableCell className="py-2">{getStatusBadge(po.status)}</TableCell>
                                                <TableCell className="py-2 text-right font-semibold text-blue-900">{formatCurrency(po.totalAmount)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {purchaseOrders.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No purchase orders found for filters applied.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* Item Breakdown Tab */}
                    <TabsContent value="items" className="mt-3">
                        <Card>
                            <div className="px-4 py-3 border-b">
                                <span className="text-sm font-semibold">Ordered Items Frequency</span>
                            </div>
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                            <TableHead className="py-2.5 font-semibold">Item Name</TableHead>
                                            <TableHead className="py-2.5 text-center font-semibold">Orders Count</TableHead>
                                            <TableHead className="py-2.5 text-right font-semibold">Quantity Ordered</TableHead>
                                            <TableHead className="py-2.5 text-right font-semibold">Total Cost Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(stats.itemFrequency || {}).map(([name, itemStats]: [string, any], idx) => (
                                            <TableRow key={idx} className="hover:bg-muted/30 even:bg-muted/10">
                                                <TableCell className="py-2 font-medium">{name}</TableCell>
                                                <TableCell className="py-2 text-center font-medium">{itemStats.orders}</TableCell>
                                                <TableCell className="py-2 text-right">{itemStats.qty?.toLocaleString()}</TableCell>
                                                <TableCell className="py-2 text-right font-semibold text-emerald-900">{formatCurrency(itemStats.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {Object.keys(stats.itemFrequency || {}).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No items ordered by this supplier in the range.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        )
    }

    return (
        <ERPLayout>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                            <Users className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Supplier-Wise Purchase Orders</h1>
                            <p className="text-xs text-muted-foreground">Detailed summary of orders grouped by suppliers</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => generateSupplierWisePOExcel(data, startDate, endDate)}
                            disabled={!data}
                            className="h-8 text-xs gap-1.5"
                        >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" /> Excel
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => generateSupplierWisePOPDF(data, startDate, endDate)}
                            disabled={!data}
                            className="h-8 text-xs gap-1.5"
                        >
                            <FileText className="h-3.5 w-3.5 text-red-500" /> PDF
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="border-dashed">
                    <CardContent className="p-3">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Supplier</Label>
                                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                                    <SelectTrigger className="h-8 w-44 text-xs">
                                        <SelectValue placeholder={loadingSuppliers ? "Loading..." : "All Suppliers"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Suppliers</SelectItem>
                                        {suppliers.map((s) => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">PO Status</Label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger className="h-8 w-32 text-xs">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Approved">Approved</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DatePicker value={startDate} onChange={setStartDate} label="Start Date" />
                            <DatePicker value={endDate} onChange={setEndDate} label="End Date" />
                            <Button 
                                size="sm" 
                                onClick={() => loadData()} 
                                disabled={loading}
                                className="h-8 text-xs ml-auto sm:ml-0"
                            >
                                {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                                Load Report
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Content Block switcher */}
                {selectedSupplierId === "all" ? renderSummaryMode() : renderDetailMode()}
            </div>
        </ERPLayout>
    )
}
