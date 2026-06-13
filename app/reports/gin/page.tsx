"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, Search, ArrowLeftRight } from "lucide-react"
import { reportsApi } from "@/lib/api"
import { generateGINReportPDF } from "@/lib/pdf-generator"
import { DocLink } from "@/components/reports/doc-link"

export default function GINReportsPage() {
    const [loading, setLoading] = useState(false)
    const [ginSummary, setGinSummary] = useState<any[]>([])
    const [selectedStatus, setSelectedStatus] = useState<string>("all")

    const loadGinSummary = async () => {
        setLoading(true)
        try {
            const data = await reportsApi.getGinSummary(selectedStatus === "all" ? undefined : selectedStatus)
            setGinSummary(data)
        } catch (error) {
            console.error('Error loading GIN summary:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case "approved": return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs py-0">Approved</Badge>
            case "pending": return <Badge variant="secondary" className="text-xs py-0">Pending</Badge>
            case "rejected": return <Badge variant="destructive" className="text-xs py-0">Rejected</Badge>
            default: return <Badge variant="outline" className="text-xs py-0">{status}</Badge>
        }
    }

    return (
        <ERPLayout>
            <div className="space-y-3">
                {/* Compact Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                            <ArrowLeftRight className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">GIN Reports</h1>
                            <p className="text-xs text-muted-foreground">Goods Issue Note analysis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {ginSummary.length > 0 && (
                            <Button variant="outline" size="sm" onClick={() => generateGINReportPDF(ginSummary)}>
                                <Download className="mr-1.5 h-3.5 w-3.5" />PDF
                            </Button>
                        )}
                        <Button size="sm" onClick={loadGinSummary} disabled={loading}>
                            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                            Load
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="border-dashed">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-3">
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
                                        <SelectItem value="Rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                {ginSummary.length > 0 && (
                    <Card>
                        <div className="flex items-center justify-between px-4 py-2.5 border-b">
                            <span className="text-sm font-semibold">GIN Summary</span>
                            <span className="text-xs text-muted-foreground">{ginSummary.length} records</span>
                        </div>
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="py-2 font-semibold">GIN Number</TableHead>
                                        <TableHead className="py-2 font-semibold">Date</TableHead>
                                        <TableHead className="py-2 font-semibold">Issue Store</TableHead>
                                        <TableHead className="py-2 font-semibold">Transfer Store</TableHead>
                                        <TableHead className="py-2 font-semibold">Status</TableHead>
                                        <TableHead className="py-2 font-semibold text-right">Items</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ginSummary.map((gin, index) => (
                                        <TableRow key={index} className="hover:bg-muted/30 even:bg-muted/10">
                                            <TableCell className="py-1.5">
                                                <DocLink docType="gin" docId={gin.id} label={gin.ginNumber} />
                                            </TableCell>
                                            <TableCell className="py-1.5 text-muted-foreground">{new Date(gin.ginDate).toLocaleDateString('en-GB')}</TableCell>
                                            <TableCell className="py-1.5 font-medium">{gin.IssueStore?.name}</TableCell>
                                            <TableCell className="py-1.5 text-muted-foreground">{gin.TransferStore?.name}</TableCell>
                                            <TableCell className="py-1.5">{getStatusBadge(gin.status)}</TableCell>
                                            <TableCell className="py-1.5 text-right font-semibold">{gin.GINItems?.length || 0}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                )}

                {!loading && ginSummary.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 rounded-full bg-muted mb-4"><ArrowLeftRight className="h-8 w-8 text-muted-foreground" /></div>
                        <p className="text-sm font-medium text-muted-foreground">Click Load to fetch GIN report data</p>
                    </div>
                )}
            </div>
        </ERPLayout>
    )
}
