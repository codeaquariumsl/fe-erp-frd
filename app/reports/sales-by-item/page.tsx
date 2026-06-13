"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Search, Package, FileText, FileSpreadsheet, TrendingUp, Users, ShoppingCart } from "lucide-react"
import { reportsApi, itemsApi, Item } from "@/lib/api"
import { cn } from "@/lib/utils"
import { generateSalesByItemExcel } from "@/lib/excel-generator"
import { generateSalesByItemPDF } from "@/lib/pdf-generator"
import { ItemSelect } from "@/components/items/item-select"
import { DocLink } from "@/components/reports/doc-link"

export default function SalesByItemReportPage() {
    const [loading, setLoading] = useState(false)
    const [loadingItems, setLoadingItems] = useState(true)
    const [items, setItems] = useState<Item[]>([])
    const [selectedItemId, setSelectedItemId] = useState<string>("")
    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()
    const [data, setData] = useState<any>(null)

    // Load all items on mount (no pagination → plain Item[] returned)
    useEffect(() => {
        itemsApi.getAll().then((res: any) => {
            // getAll() without args returns Item[] directly; with args may return PaginatedResponse
            const list: Item[] = Array.isArray(res)
                ? res
                : Array.isArray((res as any)?.data)
                    ? (res as any).data
                    : [];
            setItems(list);
        }).catch(() => setItems([])).finally(() => setLoadingItems(false));
    }, [])

    const loadData = async () => {
        if (!selectedItemId) return
        setLoading(true)
        try {
            const result = await reportsApi.getSalesByItem(
                selectedItemId,
                startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate ? format(endDate, 'yyyy-MM-dd') : undefined
            )
            setData(result)
        } catch (error) {
            console.error('Error loading sales by item data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) =>
        `LKR ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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
                <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={value} onSelect={onChange} initialFocus />
                </PopoverContent>
            </Popover>
        </div>
    )

    const StatCard = ({ title, value, icon: Icon, colorClass }: {
        title: string, value: string | number, icon: any, colorClass: string
    }) => (
        <Card>
            <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">{title}</p>
                    <p className="text-xl font-bold leading-tight">{value}</p>
                </div>
            </CardContent>
        </Card>
    )

    return (
        <ERPLayout>
            <div className="space-y-4">
                {/* Page Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                        <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Item Detail Summary</h1>
                        <p className="text-xs text-muted-foreground">
                            Detailed sales breakdown for a specific item — quantity sold, revenue, customers & history
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <div className="p-4 flex flex-wrap items-end gap-3 border-b">
                        <div className="space-y-1 flex-1 min-w-[260px] max-w-sm">
                            <Label className="text-xs text-muted-foreground">
                                Select Item <span className="text-destructive">*</span>
                            </Label>
                            {loadingItems ? (
                                <div className="h-9 flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading items...
                                </div>
                            ) : (
                                <ItemSelect
                                    items={items}
                                    value={selectedItemId}
                                    onValueChange={(val) => {
                                        setSelectedItemId(val)
                                        setData(null)
                                    }}
                                    placeholder="Choose an item to analyze..."
                                />
                            )}
                        </div>
                        <DatePicker value={startDate} onChange={setStartDate} label="Start Date" />
                        <DatePicker value={endDate} onChange={setEndDate} label="End Date" />
                        <Button
                            size="sm"
                            onClick={loadData}
                            disabled={loading || !selectedItemId}
                            className="h-8"
                        >
                            {loading
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                : <Search className="h-3.5 w-3.5 mr-1" />}
                            Load Report
                        </Button>
                        <Button
                            size="sm" variant="outline" className="h-8 gap-1.5"
                            onClick={() => generateSalesByItemExcel(data)}
                            disabled={!data}
                        >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Excel</span>
                        </Button>
                        <Button
                            size="sm" variant="outline" className="h-8 gap-1.5"
                            onClick={() => generateSalesByItemPDF(data)}
                            disabled={!data}
                        >
                            <FileText className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">PDF</span>
                        </Button>
                    </div>
                </Card>

                {/* Empty state */}
                {!data && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                        <Package className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-sm font-medium">Select an item and click Load Report</p>
                        <p className="text-xs mt-1">You'll see quantity sold, revenue, top customers, and monthly trends</p>
                    </div>
                )}

                {/* Results */}
                {data && data.itemStats && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">

                        {/* Summary KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard
                                title="Total Qty Sold"
                                value={data.itemStats.totalQuantitySold?.toLocaleString() || 0}
                                icon={ShoppingCart}
                                colorClass="bg-blue-500/10 text-blue-600"
                            />
                            <StatCard
                                title="Total Revenue"
                                value={formatCurrency(data.itemStats.totalRevenue)}
                                icon={TrendingUp}
                                colorClass="bg-emerald-500/10 text-emerald-600"
                            />
                            <StatCard
                                title="Average Price"
                                value={formatCurrency(data.itemStats.averagePrice)}
                                icon={FileText}
                                colorClass="bg-amber-500/10 text-amber-600"
                            />
                            <StatCard
                                title="Total Invoices"
                                value={data.itemStats.totalInvoices || 0}
                                icon={Users}
                                colorClass="bg-purple-500/10 text-purple-600"
                            />
                        </div>

                        {/* Customer & Monthly Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Top Customers */}
                            <Card className="flex flex-col">
                                <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold">Top Customers</h3>
                                </div>
                                <div className="overflow-auto max-h-[280px]">
                                    <Table className="text-xs">
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow className="bg-muted/40">
                                                <TableHead className="py-2">Customer</TableHead>
                                                <TableHead className="py-2 text-center">Qty Bought</TableHead>
                                                <TableHead className="py-2 text-right">Total Spent</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(data.itemStats.customerFrequency || {})
                                                .sort((a: any, b: any) => b[1].totalQuantity - a[1].totalQuantity)
                                                .slice(0, 12)
                                                .map(([customer, stats]: [string, any], i) => (
                                                    <TableRow key={i} className="hover:bg-muted/30 even:bg-muted/10">
                                                        <TableCell className="py-1.5 font-medium truncate max-w-[160px]">{customer}</TableCell>
                                                        <TableCell className="py-1.5 text-center font-semibold">{stats.totalQuantity}</TableCell>
                                                        <TableCell className="py-1.5 text-right">{formatCurrency(stats.totalSpent)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            {Object.keys(data.itemStats.customerFrequency || {}).length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                                                        No customer data found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>

                            {/* Monthly Breakdown */}
                            <Card className="flex flex-col">
                                <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold">Monthly Breakdown</h3>
                                </div>
                                <div className="overflow-auto max-h-[280px]">
                                    <Table className="text-xs">
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow className="bg-muted/40">
                                                <TableHead className="py-2">Month</TableHead>
                                                <TableHead className="py-2 text-center">Qty Sold</TableHead>
                                                <TableHead className="py-2 text-right">Revenue</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(data.itemStats.monthlyBreakdown || {})
                                                .sort(([a]: any, [b]: any) => b.localeCompare(a))
                                                .map(([month, stats]: [string, any], i) => (
                                                    <TableRow key={i} className="hover:bg-muted/30 even:bg-muted/10">
                                                        <TableCell className="py-1.5 font-medium">{month}</TableCell>
                                                        <TableCell className="py-1.5 text-center font-semibold">{stats.quantity}</TableCell>
                                                        <TableCell className="py-1.5 text-right">{formatCurrency(stats.revenue)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            {Object.keys(data.itemStats.monthlyBreakdown || {}).length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                                                        No monthly data found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </div>

                        {/* Sales History */}
                        <Card>
                            <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold">Detailed Sales History</h3>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {data.sales?.length || 0} record{data.sales?.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="overflow-x-auto max-h-[500px]">
                                <Table className="text-xs relative">
                                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="py-2">Date</TableHead>
                                            <TableHead className="py-2">Invoice #</TableHead>
                                            <TableHead className="py-2">Customer</TableHead>
                                            <TableHead className="py-2 text-right">Qty</TableHead>
                                            <TableHead className="py-2 text-right">Unit Price</TableHead>
                                            <TableHead className="py-2 text-right">Discount</TableHead>
                                            <TableHead className="py-2 text-right">Line Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.sales?.length > 0 ? (
                                            data.sales.map((sale: any, i: number) => (
                                                <TableRow key={i} className="hover:bg-muted/30 even:bg-muted/10">
                                                    <TableCell className="py-1.5 whitespace-nowrap">
                                                        {sale.Invoice?.invoiceDate
                                                            ? format(new Date(sale.Invoice.invoiceDate), 'dd/MM/yyyy')
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 font-medium">
                                                        <DocLink
                                                            docType="invoice"
                                                            docId={sale.Invoice?.id}
                                                            label={sale.Invoice?.invoiceNumber || '-'}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-1.5 truncate max-w-[180px]">
                                                        {sale.Invoice?.Customer?.name || '-'}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 text-right font-bold text-blue-600">
                                                        {sale.qty}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 text-right">
                                                        {formatCurrency(sale.price)}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 text-right text-muted-foreground">
                                                        {sale.discount > 0 ? `${sale.discount}%` : '-'}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 text-right font-semibold text-emerald-700">
                                                        {formatCurrency(sale.total)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                                    No sales history found for the selected period.
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
