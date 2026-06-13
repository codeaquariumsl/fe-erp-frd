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
import { CalendarIcon, Loader2, Search, Package, TrendingUp, FileText, FileSpreadsheet } from "lucide-react"
import { reportsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { generateTopSellingItemsExcel } from "@/lib/excel-generator"
import { generateTopSellingItemsPDF } from "@/lib/pdf-generator"

export default function ItemWiseSalesReportPage() {
    const [loading, setLoading] = useState(false)
    const [topItems, setTopItems] = useState<any[]>([])
    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()

    const loadTopItems = async () => {
        setLoading(true)
        try {
            const data = await reportsApi.getTopSellingItems(
                startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
                50 // limit to top 50
            )
            setTopItems(data || [])
        } catch (error) {
            console.error('Error loading top selling items:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => `LKR ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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

    return (
        <ERPLayout>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10"><TrendingUp className="h-5 w-5 text-indigo-600" /></div>
                    <div>
                        <h1 className="text-xl font-bold">Item Wise Sales Report</h1>
                        <p className="text-xs text-muted-foreground">Identify items with the most sales within a period</p>
                    </div>
                </div>

                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b">
                        <span className="text-sm font-semibold">Top Selling Items</span>
                        <div className="flex flex-wrap items-end gap-2">
                            <DatePicker value={startDate} onChange={setStartDate} label="Start Date" />
                            <DatePicker value={endDate} onChange={setEndDate} label="End Date" />
                            <Button size="sm" onClick={loadTopItems} disabled={loading} className="h-8">
                                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Search className="h-3.5 w-3.5 mr-1" />}
                                Load Data
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => generateTopSellingItemsExcel(topItems, startDate, endDate)} disabled={topItems.length === 0}>
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Excel</span>
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => generateTopSellingItemsPDF(topItems, startDate, endDate)} disabled={topItems.length === 0}>
                                <FileText className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">PDF</span>
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead className="py-2">Item Code</TableHead>
                                    <TableHead className="py-2">Item Name</TableHead>
                                    <TableHead className="py-2">Category</TableHead>
                                    <TableHead className="py-2 text-center">Invoices count</TableHead>
                                    <TableHead className="py-2 text-right">Qty Sold</TableHead>
                                    <TableHead className="py-2 text-right">Avg Price</TableHead>
                                    <TableHead className="py-2 text-right">Total Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                                            No sales data found for the selected period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    topItems.map((item, index) => (
                                        <TableRow key={`${item.itemId}-${index}`} className="hover:bg-muted/30 even:bg-muted/10">
                                            <TableCell className="py-1.5 font-medium">{item.Item?.sku || '-'}</TableCell>
                                            <TableCell className="py-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Package className="h-3 w-3 text-muted-foreground" />
                                                    {item.Item?.name || 'Unknown Item'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-1.5">{item.Item?.Category?.name || '-'}</TableCell>
                                            <TableCell className="py-1.5 text-center">{item.totalInvoices || 0}</TableCell>
                                            <TableCell className="py-1.5 text-right font-semibold">{item.totalQuantitySold || 0}</TableCell>
                                            <TableCell className="py-1.5 text-right">{formatCurrency(item.averagePrice)}</TableCell>
                                            <TableCell className="py-1.5 text-right font-bold text-primary">{formatCurrency(item.totalRevenue)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </ERPLayout>
    )
}
