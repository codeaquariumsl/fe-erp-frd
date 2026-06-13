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
import { CalendarIcon, Loader2, Download, Search, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { reportsApi } from "@/lib/api"
import { generateGRNReportPDF } from "@/lib/pdf-generator"
import { DocLink } from "@/components/reports/doc-link"

export default function GRNReportsPage() {
    const [loading, setLoading] = useState(false)
    const [grnSummary, setGrnSummary] = useState<any[]>([])
    const [selectedStatus, setSelectedStatus] = useState<string>("all")
    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()

    const loadGrnSummary = async () => {
        setLoading(true)
        try {
            const data = await reportsApi.getGrnSummary(selectedStatus === "all" ? undefined : selectedStatus)
            setGrnSummary(data)
        } catch (error) {
            console.error('Error loading GRN summary:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case "approved": return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs py-0">Approved</Badge>
            case "pending": return <Badge variant="secondary" className="text-xs py-0">Pending</Badge>
            case "qc checked": return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs py-0">QC Checked</Badge>
            case "rejected": return <Badge variant="destructive" className="text-xs py-0">Rejected</Badge>
            default: return <Badge variant="outline" className="text-xs py-0">{status}</Badge>
        }
    }

    const formatCurrency = (amount: number) => `LKR ${(amount || 0).toLocaleString()}`

    return (
        <ERPLayout>
            <div className="space-y-3">
                {/* Compact Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <Package className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">GRN Reports</h1>
                            <p className="text-xs text-muted-foreground">Goods Received Note analysis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {grnSummary.length > 0 && (
                            <Button variant="outline" size="sm" onClick={() => generateGRNReportPDF(grnSummary)}>
                                <Download className="mr-1.5 h-3.5 w-3.5" />PDF
                            </Button>
                        )}
                        <Button size="sm" onClick={loadGrnSummary} disabled={loading}>
                            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                            Load
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="border-dashed">
                    <CardContent className="p-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Status</Label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger className="h-8 w-36 text-xs">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Approved">Approved</SelectItem>
                                        <SelectItem value="QC Checked">QC Checked</SelectItem>
                                        <SelectItem value="Rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Start Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn("h-8 w-32 justify-start text-left font-normal text-xs", !startDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-1.5 h-3 w-3" />
                                            {startDate ? format(startDate, "dd/MM/yy") : "Start"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">End Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn("h-8 w-32 justify-start text-left font-normal text-xs", !endDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-1.5 h-3 w-3" />
                                            {endDate ? format(endDate, "dd/MM/yy") : "End"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                {grnSummary.length > 0 && (
                    <Card>
                        <div className="flex items-center justify-between px-4 py-2.5 border-b">
                            <span className="text-sm font-semibold">GRN Summary</span>
                            <span className="text-xs text-muted-foreground">{grnSummary.length} records</span>
                        </div>
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="py-2 font-semibold">GRN Number</TableHead>
                                        <TableHead className="py-2 font-semibold">Date</TableHead>
                                        <TableHead className="py-2 font-semibold">Supplier</TableHead>
                                        <TableHead className="py-2 font-semibold">Store</TableHead>
                                        <TableHead className="py-2 font-semibold">Status</TableHead>
                                        <TableHead className="py-2 font-semibold text-right">Total Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {grnSummary.map((grn, index) => (
                                        <TableRow key={index} className="hover:bg-muted/30 even:bg-muted/10">
                                            <TableCell className="py-1.5">
                                                <DocLink docType="grn" docId={grn.id} label={grn.grnNumber} />
                                            </TableCell>
                                            <TableCell className="py-1.5 text-muted-foreground">{new Date(grn.grnDate).toLocaleDateString('en-GB')}</TableCell>
                                            <TableCell className="py-1.5 font-medium">{grn.Supplier?.name}</TableCell>
                                            <TableCell className="py-1.5 text-muted-foreground">{grn.Store?.name}</TableCell>
                                            <TableCell className="py-1.5">{getStatusBadge(grn.status)}</TableCell>
                                            <TableCell className="py-1.5 text-right font-semibold">{formatCurrency(grn.totalValue)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                )}

                {!loading && grnSummary.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 rounded-full bg-muted mb-4"><Package className="h-8 w-8 text-muted-foreground" /></div>
                        <p className="text-sm font-medium text-muted-foreground">Click Load to fetch GRN report data</p>
                    </div>
                )}
            </div>
        </ERPLayout>
    )
}
