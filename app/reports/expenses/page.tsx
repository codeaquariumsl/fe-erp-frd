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
import { CalendarIcon, Loader2, Download, Search, Wallet, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { reportsApi, pettyCashApi } from "@/lib/api"
import { generateExpensesReportExcel } from "@/lib/excel-generator"

export default function ExpensesReportPage() {
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState<any>(null)
    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [categories, setCategories] = useState<any[]>([])

    useEffect(() => {
        pettyCashApi.getAllCategories().then(d => setCategories(Array.isArray(d) ? d : [])).catch(console.error)
    }, [])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const data = await reportsApi.getExpensesReport({
                startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
                categoryId: selectedCategory && selectedCategory !== "all" ? parseInt(selectedCategory) : undefined,
            })
            setReportData(data)
        } catch (error) { console.error("Failed to load report", error) }
        finally { setLoading(false) }
    }

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(amount || 0)

    const totalExpenses = reportData
        ? (reportData.summary?.totalExpenses ?? reportData.details?.reduce((acc: number, item: any) => acc + (item.amount || 0), 0))
        : 0

    return (
        <ERPLayout>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10"><Wallet className="h-5 w-5 text-red-600" /></div>
                        <div>
                            <h1 className="text-xl font-bold">Expenses Report</h1>
                            <p className="text-xs text-muted-foreground">Petty cash payments and expenses analysis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {reportData && (
                            <Button variant="outline" size="sm" onClick={() => generateExpensesReportExcel(reportData)}>
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
                                <Label className="text-xs text-muted-foreground">Category</Label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {reportData && (
                    <>
                        {/* KPI */}
                        <Card className="border-l-4 border-l-red-500">
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className="p-2 rounded-full bg-red-50"><TrendingDown className="h-4 w-4 text-red-600" /></div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Total Expenses</div>
                                    <div className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                                </div>
                                <div className="ml-auto text-xs text-muted-foreground">{reportData.details?.length} records</div>
                            </CardContent>
                        </Card>

                        {/* Table */}
                        <Card>
                            <div className="flex items-center justify-between px-4 py-2.5 border-b">
                                <span className="text-sm font-semibold">Detailed Expense List</span>
                            </div>
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="py-2 font-semibold">Date</TableHead>
                                            <TableHead className="py-2 font-semibold">Category</TableHead>
                                            <TableHead className="py-2 font-semibold">Description</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Amount</TableHead>
                                            <TableHead className="py-2 font-semibold">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.details.map((expense: any) => (
                                            <TableRow key={expense.id} className="hover:bg-muted/30 even:bg-muted/10">
                                                <TableCell className="py-1.5 text-muted-foreground">{format(new Date(expense.paymentDate), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="py-1.5">{expense.categoryName}</TableCell>
                                                <TableCell className="py-1.5 max-w-[200px] truncate">{expense.description}</TableCell>
                                                <TableCell className="py-1.5 text-right font-semibold text-red-600">{formatCurrency(expense.amount)}</TableCell>
                                                <TableCell className="py-1.5 text-muted-foreground">{expense.status}</TableCell>
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
                        <div className="p-4 rounded-full bg-muted mb-4"><Wallet className="h-8 w-8 text-muted-foreground" /></div>
                        <p className="text-sm font-medium text-muted-foreground">Set filters and click Generate</p>
                    </div>
                )}
            </div>
        </ERPLayout>
    )
}
