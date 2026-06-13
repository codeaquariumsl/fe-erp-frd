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
import { CalendarIcon, Loader2, Download, Search, FileText, TrendingUp, AlertTriangle, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { reportsApi, customersApi, usersApi } from "@/lib/api"
import { generateGeneralSalesReportExcel } from "@/lib/excel-generator"
import { CustomerSelect } from "@/components/customer/customer-select"
import { DocLink } from "@/components/reports/doc-link"

export default function GeneralSalesReportPage() {
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState<any>(null)

    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()
    const [selectedCustomer, setSelectedCustomer] = useState<string>("all")
    const [selectedSalesRep, setSelectedSalesRep] = useState<string>("all")

    const [customers, setCustomers] = useState<any[]>([])
    const [salesReps, setSalesReps] = useState<any[]>([])

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [customersData, salesRepsData] = await Promise.all([
                    customersApi.getAll(),
                    usersApi.getSalesPersons()
                ])
                setCustomers(Array.isArray(customersData) ? customersData : [])
                setSalesReps(Array.isArray(salesRepsData) ? salesRepsData : [])
            } catch (error) {
                console.error("Failed to load options", error)
            }
        }
        loadOptions()
    }, [])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const data = await reportsApi.getGeneralSales({
                startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
                customerId: selectedCustomer && selectedCustomer !== "all" ? parseInt(selectedCustomer) : undefined,
                salesRepId: selectedSalesRep && selectedSalesRep !== "all" ? parseInt(selectedSalesRep) : undefined,
            })
            setReportData(data)
        } catch (error) {
            console.error("Failed to load report", error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(amount || 0)
    }

    return (
        <ERPLayout>
            <div className="space-y-3">
                {/* Compact Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-tight">General Sales Report</h1>
                            <p className="text-xs text-muted-foreground">Sales summary and detailed invoice list</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {reportData && (
                            <Button variant="outline" size="sm" onClick={() => generateGeneralSalesReportExcel(reportData)}>
                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                Excel
                            </Button>
                        )}
                        <Button size="sm" onClick={fetchReport} disabled={loading}>
                            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                            Generate
                        </Button>
                    </div>
                </div>

                {/* Compact Filters */}
                <Card className="border-dashed">
                    <CardContent className="p-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Start Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8 text-xs", !startDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-1.5 h-3 w-3" />
                                            {startDate ? format(startDate, "dd/MM/yyyy") : "Pick date"}
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
                                            {endDate ? format(endDate, "dd/MM/yyyy") : "Pick date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Customer</Label>
                                <CustomerSelect
                                    customers={customers}
                                    value={selectedCustomer === "all" ? "" : selectedCustomer}
                                    onValueChange={(id) => setSelectedCustomer(id ? String(id) : "all")}
                                    placeholder="All Customers"
                                    showMainBadge={true}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Sales Rep</Label>
                                <Select value={selectedSalesRep} onValueChange={setSelectedSalesRep}>
                                    <SelectTrigger className="h-8 text-xs">
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
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                {reportData && (
                    <>
                        {/* Summary KPI Cards */}
                        <div className="grid gap-3 md:grid-cols-3">
                            <Card className="border-l-4 border-l-blue-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-blue-50"><TrendingUp className="h-4 w-4 text-blue-600" /></div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Total Sales</div>
                                        <div className="text-base font-bold text-blue-700">{formatCurrency(reportData.summary.totalSales)}</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-orange-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-orange-50"><DollarSign className="h-4 w-4 text-orange-600" /></div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Total Outstanding</div>
                                        <div className="text-base font-bold text-orange-600">{formatCurrency(reportData.summary.totalOutstanding)}</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-red-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-red-50"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Total Overdue</div>
                                        <div className="text-base font-bold text-red-600">{formatCurrency(reportData.summary.totalOverDue)}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detail Table */}
                        <Card>
                            <div className="flex items-center justify-between px-4 py-2.5 border-b">
                                <span className="text-sm font-semibold">Invoice Details</span>
                                <span className="text-xs text-muted-foreground">{reportData.details.length} records</span>
                            </div>
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="py-2 font-semibold">Inv ID</TableHead>
                                            <TableHead className="py-2 font-semibold">Date</TableHead>
                                            <TableHead className="py-2 font-semibold">Due Date</TableHead>
                                            <TableHead className="py-2 font-semibold">Customer</TableHead>
                                            <TableHead className="py-2 font-semibold">Sales Rep</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Inv Value</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Paid</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Returned</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Outstanding</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Overdue</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.details.map((invoice: any) => (
                                            <TableRow key={invoice.id} className="hover:bg-muted/30 even:bg-muted/10">
                                                <TableCell className="py-1.5 font-medium">
                                                    <DocLink docType="invoice" docId={invoice.id} label={invoice.invoiceNumber} />
                                                </TableCell>
                                                <TableCell className="py-1.5 text-muted-foreground">{format(new Date(invoice.invoiceDate), 'dd/MM/yy')}</TableCell>
                                                <TableCell className="py-1.5 text-muted-foreground">{format(new Date(invoice.dueDate), 'dd/MM/yy')}</TableCell>
                                                <TableCell className="py-1.5 font-medium max-w-[160px] truncate">{invoice.customerName}</TableCell>
                                                <TableCell className="py-1.5 text-muted-foreground">{invoice.salesRep}</TableCell>
                                                <TableCell className="py-1.5 text-right">{formatCurrency(invoice.invValue)}</TableCell>
                                                <TableCell className="py-1.5 text-right text-green-600 font-medium">{formatCurrency(invoice.paidAmount)}</TableCell>
                                                <TableCell className="py-1.5 text-right text-muted-foreground">{formatCurrency(invoice.returnedAmount)}</TableCell>
                                                <TableCell className="py-1.5 text-right">{formatCurrency(invoice.outstanding)}</TableCell>
                                                <TableCell className="py-1.5 text-right">
                                                    <span className={invoice.overDueValue > 0 ? "text-red-600 font-bold" : "text-green-600"}>
                                                        {formatCurrency(invoice.overDueValue)}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </>
                )}

                {/* Empty state */}
                {!reportData && !loading && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 rounded-full bg-muted mb-4"><FileText className="h-8 w-8 text-muted-foreground" /></div>
                        <p className="text-sm font-medium text-muted-foreground">Set filters and click Generate to load the report</p>
                    </div>
                )}
            </div>
        </ERPLayout>
    )
}
