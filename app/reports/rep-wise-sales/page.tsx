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
import { format } from "date-fns"
import { CalendarIcon, Loader2, Download, Search, Users, TrendingUp, DollarSign, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { reportsApi, usersApi } from "@/lib/api"
import { generateRepWiseSalesReportExcel } from "@/lib/excel-generator"

export default function RepWiseSalesReportPage() {
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState<any>(null)
    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()
    const [selectedSalesRep, setSelectedSalesRep] = useState<string>("all")
    const [salesReps, setSalesReps] = useState<any[]>([])

    useEffect(() => {
        usersApi.getSalesPersons().then(d => setSalesReps(Array.isArray(d) ? d : [])).catch(console.error)
    }, [])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const data = await reportsApi.getRepWiseSales({
                startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
                salesRepId: selectedSalesRep && selectedSalesRep !== "all" ? parseInt(selectedSalesRep) : undefined,
            })
            setReportData(data)
        } catch (error) { console.error("Failed to load report", error) }
        finally { setLoading(false) }
    }

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(amount || 0)

    const grandTotal = reportData?.reduce((acc: number, item: any) => acc + item.totalSales, 0) || 0
    const grandOutstanding = reportData?.reduce((acc: number, item: any) => acc + item.totalOutstanding, 0) || 0
    const grandOverdue = reportData?.reduce((acc: number, item: any) => acc + item.totalOverDue, 0) || 0

    return (
        <ERPLayout>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/10"><Users className="h-5 w-5 text-teal-600" /></div>
                        <div>
                            <h1 className="text-xl font-bold">Rep Wise Sales Report</h1>
                            <p className="text-xs text-muted-foreground">Performance analysis by Sales Representative</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {reportData && (
                            <Button variant="outline" size="sm" onClick={() => generateRepWiseSalesReportExcel(reportData)}>
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
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Start Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8 text-xs", !startDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-1.5 h-3 w-3" />{startDate ? format(startDate, "dd/MM/yyyy") : "Pick date"}
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
                                            <CalendarIcon className="mr-1.5 h-3 w-3" />{endDate ? format(endDate, "dd/MM/yyyy") : "Pick date"}
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
                        </div>
                    </CardContent>
                </Card>

                {reportData && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid gap-3 md:grid-cols-3">
                            <Card className="border-l-4 border-l-blue-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-blue-50"><TrendingUp className="h-4 w-4 text-blue-600" /></div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Grand Total Sales</div>
                                        <div className="text-base font-bold text-blue-700">{formatCurrency(grandTotal)}</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-orange-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-orange-50"><DollarSign className="h-4 w-4 text-orange-600" /></div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Total Outstanding</div>
                                        <div className="text-base font-bold text-orange-600">{formatCurrency(grandOutstanding)}</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-red-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-red-50"><AlertCircle className="h-4 w-4 text-red-600" /></div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Total Overdue</div>
                                        <div className="text-base font-bold text-red-600">{formatCurrency(grandOverdue)}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Performance Table */}
                        <Card>
                            <div className="flex items-center justify-between px-4 py-2.5 border-b">
                                <span className="text-sm font-semibold">Sales Representative Performance</span>
                                <span className="text-xs text-muted-foreground">{reportData.length} reps</span>
                            </div>
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="py-2 font-semibold">Sales Representative</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Invoices</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Total Sales</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Outstanding</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Overdue</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.map((rep: any) => (
                                            <TableRow key={rep.salesRepId} className="hover:bg-muted/30 even:bg-muted/10">
                                                <TableCell className="py-1.5 font-semibold">{rep.salesRepName}</TableCell>
                                                <TableCell className="py-1.5 text-right">{rep.invoices.length}</TableCell>
                                                <TableCell className="py-1.5 text-right font-semibold text-blue-700">{formatCurrency(rep.totalSales)}</TableCell>
                                                <TableCell className="py-1.5 text-right text-orange-600">{formatCurrency(rep.totalOutstanding)}</TableCell>
                                                <TableCell className="py-1.5 text-right text-red-600">{formatCurrency(rep.totalOverDue)}</TableCell>
                                            </TableRow>
                                        ))}
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
