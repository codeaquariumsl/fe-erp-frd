"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Download, Filter, User as UserIcon, Calendar as CalendarIcon, TrendingUp, DollarSign, PieChart, BarChart3, Info } from "lucide-react"
import { reportsApi, usersApi, User } from "@/lib/api"
import { format } from "date-fns"
import { DocLink } from "@/components/reports/doc-link"

export default function SalespersonCommissionReportPage() {
    const [loading, setLoading] = useState(false)
    const [salesPersons, setSalesPersons] = useState<User[]>([])
    const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>("all")
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM"))
    const [reportData, setReportData] = useState<any>(null)

    useEffect(() => {
        usersApi.getSalesPersons().then(d => setSalesPersons(Array.isArray(d) ? d : [])).catch(console.error)
    }, [])

    const loadReport = async () => {
        setLoading(true)
        try {
            const date = `${selectedDate}-01`
            const data = await reportsApi.getSalespersonCommissionReport(
                date,
                selectedSalesPerson === "all" ? undefined : selectedSalesPerson
            )
            setReportData(data)
        } catch (error) { console.error("Error loading commission report:", error); setReportData(null) }
        finally { setLoading(false) }
    }

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(amount || 0)

    const totalActual = reportData?.data?.reduce((sum: number, item: any) => sum + (item.totalActualCollection || 0), 0) || 0
    const totalEligible = reportData?.data?.reduce((sum: number, item: any) => sum + (item.totalEligibleCollection || 0), 0) || 0
    const totalComm = reportData?.data?.reduce((sum: number, item: any) => sum + (item.totalCommission || 0), 0) || 0
    const eligibilityRate = totalActual > 0 ? (totalEligible / totalActual) * 100 : 0

    return (
        <ERPLayout>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/10"><DollarSign className="h-5 w-5 text-violet-600" /></div>
                        <div>
                            <h1 className="text-xl font-bold">Salesperson Commission</h1>
                            <p className="text-xs text-muted-foreground">Track and analyze salesperson commissions and collections</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!reportData}>
                        <Download className="h-3.5 w-3.5 mr-1.5" />Export PDF
                    </Button>
                </div>

                {/* Filters */}
                <Card className="border-dashed">
                    <CardContent className="p-3 flex flex-wrap items-end gap-3">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Salesperson</label>
                            <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
                                <SelectTrigger className="w-48 h-8 text-xs bg-background">
                                    <SelectValue placeholder="All Salespersons" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Salespersons</SelectItem>
                                    {salesPersons.map((sp) => (
                                        <SelectItem key={sp.id} value={sp.id.toString()}>{sp.fullName || sp.username}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Month</label>
                            <input
                                type="month"
                                className="flex h-8 w-36 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <Button size="sm" onClick={loadReport} disabled={loading} className="h-8">
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Filter className="h-3.5 w-3.5 mr-1.5" />}
                            Generate
                        </Button>
                    </CardContent>
                </Card>

                {reportData && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid gap-3 md:grid-cols-4">
                            <Card className="border-l-4 border-l-blue-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-1.5 rounded-full bg-blue-50"><DollarSign className="h-3.5 w-3.5 text-blue-600" /></div>
                                    <div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Actual Collection</div>
                                        <div className="text-sm font-bold">{formatCurrency(totalActual)}</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-green-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-1.5 rounded-full bg-green-50"><TrendingUp className="h-3.5 w-3.5 text-green-600" /></div>
                                    <div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Eligible Collection</div>
                                        <div className="text-sm font-bold">{formatCurrency(totalEligible)}</div>
                                        <div className="text-[10px] text-green-600">{eligibilityRate.toFixed(1)}% eligibility</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-purple-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-1.5 rounded-full bg-purple-50"><PieChart className="h-3.5 w-3.5 text-purple-600" /></div>
                                    <div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Commission</div>
                                        <div className="text-sm font-bold">{formatCurrency(totalComm)}</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-amber-500">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-1.5 rounded-full bg-amber-50"><CalendarIcon className="h-3.5 w-3.5 text-amber-600" /></div>
                                    <div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Salespersons</div>
                                        <div className="text-sm font-bold">{reportData.data?.length || 0}</div>
                                        <div className="text-[10px] text-muted-foreground">included</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Commission Breakdown Table */}
                        <Card>
                            <div className="flex items-center gap-2 px-4 py-2.5 border-b">
                                <UserIcon className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold">Commission Breakdown</span>
                                {reportData.period && (
                                    <span className="text-xs text-muted-foreground ml-auto">
                                        {new Date(reportData.period.startDate).toLocaleDateString()} - {new Date(reportData.period.endDate).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="py-2 font-semibold">Salesperson</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Actual Collection</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Eligible Collection</TableHead>
                                            <TableHead className="py-2 font-semibold text-center">Rate (%)</TableHead>
                                            <TableHead className="py-2 font-semibold text-right">Commission</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.data?.map((row: any) => (
                                            <TableRow key={row.salesPersonId} className="hover:bg-muted/30 even:bg-muted/10">
                                                <TableCell className="py-1.5">
                                                    <div className="font-semibold">{row.salesPersonName}</div>
                                                    <div className="text-[10px] text-muted-foreground">ID: {row.salesPersonId}</div>
                                                </TableCell>
                                                <TableCell className="py-1.5 text-right font-medium">{formatCurrency(row.totalActualCollection)}</TableCell>
                                                <TableCell className="py-1.5 text-right font-medium text-green-600">{formatCurrency(row.totalEligibleCollection)}</TableCell>
                                                <TableCell className="py-1.5 text-center">
                                                    <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/5 text-primary font-bold">{row.commissionRate}%</Badge>
                                                </TableCell>
                                                <TableCell className="py-1.5 text-right font-bold text-purple-600">{formatCurrency(row.totalCommission)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {reportData.data?.length === 0 && (
                                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No data found.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>

                        {/* Detailed Transactions */}
                        {reportData.data?.length === 1 && reportData.data[0].details?.length > 0 && (
                            <Card>
                                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-blue-50/30">
                                    <Info className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-semibold text-blue-800">Detailed Transactions – {reportData.data[0].salesPersonName}</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table className="text-xs">
                                        <TableHeader>
                                            <TableRow className="bg-blue-50/20">
                                                <TableHead className="py-2">Receipt No</TableHead>
                                                <TableHead className="py-2">Invoice No</TableHead>
                                                <TableHead className="py-2 text-center">Aging Days</TableHead>
                                                <TableHead className="py-2 text-right">Paid Amount</TableHead>
                                                <TableHead className="py-2 text-right">Eligible Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reportData.data[0].details.map((detail: any, idx: number) => (
                                                <TableRow key={idx} className="hover:bg-muted/30 even:bg-muted/10">
                                                    <TableCell className="py-1.5 font-medium text-blue-700">{detail.receiptNo}</TableCell>
                                                    <TableCell className="py-1.5">
                                                        {detail.invoiceId
                                                            ? <DocLink docType="invoice" docId={detail.invoiceId} label={detail.invoiceNo} />
                                                            : <span className="font-mono text-muted-foreground">{detail.invoiceNo}</span>
                                                        }
                                                    </TableCell>
                                                    <TableCell className="py-1.5 text-center">
                                                        <Badge variant={detail.agingDays > 60 ? "destructive" : detail.agingDays > 30 ? "secondary" : "outline"} className="text-[10px]">
                                                            {detail.agingDays}d
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-1.5 text-right">{formatCurrency(detail.paidAmount)}</TableCell>
                                                    <TableCell className="py-1.5 text-right font-semibold text-green-600">{formatCurrency(detail.eligibleAmount)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        )}
                    </>
                )}

                {!reportData && !loading && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 rounded-full bg-muted mb-4"><BarChart3 className="h-8 w-8 text-muted-foreground" /></div>
                        <h3 className="text-sm font-semibold">Ready to analyze?</h3>
                        <p className="text-xs text-muted-foreground max-w-xs text-center mt-1">Select a salesperson and target month to generate the commission breakdown.</p>
                    </div>
                )}
            </div>
        </ERPLayout>
    )
}
