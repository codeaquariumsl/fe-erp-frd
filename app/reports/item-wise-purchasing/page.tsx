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
import { format } from "date-fns"
import { CalendarIcon, Loader2, Search, Package, TrendingUp, FileText, FileSpreadsheet, Scale, DollarSign } from "lucide-react"
import { reportsApi, categoriesApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { generateItemWisePurchasingExcel } from "@/lib/excel-generator"
import { generateItemWisePurchasingPDF } from "@/lib/pdf-generator"

export default function ItemWisePurchasingReportPage() {
    const [loading, setLoading] = useState(false)
    const [purchases, setPurchases] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all")
    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()

    useEffect(() => {
        categoriesApi.getAll().then((res: any) => {
            setCategories(Array.isArray(res) ? res : []);
        }).catch(() => setCategories([]));
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await reportsApi.getItemWisePurchasing(
                startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
                selectedCategoryId === "all" ? undefined : parseInt(selectedCategoryId)
            )
            setPurchases(data || [])
        } catch (error) {
            console.error('Error loading item-wise purchasing data:', error)
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
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={value} onSelect={onChange} initialFocus /></PopoverContent>
            </Popover>
        </div>
    )

    const totalQty = purchases.reduce((sum, item) => sum + (item.totalQuantityPurchased || 0), 0)
    const totalWeight = purchases.reduce((sum, item) => sum + (item.weightPurchased || 0), 0)
    const totalCost = purchases.reduce((sum, item) => sum + (item.totalCost || 0), 0)

    return (
        <ERPLayout>
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Item-Wise Purchasing Report</h1>
                            <p className="text-xs text-muted-foreground">Detailed summary of items purchased via GRNs</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => generateItemWisePurchasingExcel(purchases, startDate, endDate)}
                            disabled={purchases.length === 0}
                            className="h-8 text-xs gap-1.5"
                        >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" /> Excel
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => generateItemWisePurchasingPDF(purchases, startDate, endDate)}
                            disabled={purchases.length === 0}
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
                                <Label className="text-xs text-muted-foreground">Category</Label>
                                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                    <SelectTrigger className="h-8 w-40 text-xs">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DatePicker value={startDate} onChange={setStartDate} label="Start Date" />
                            <DatePicker value={endDate} onChange={setEndDate} label="End Date" />
                            <Button 
                                size="sm" 
                                onClick={loadData} 
                                disabled={loading}
                                className="h-8 text-xs ml-auto sm:ml-0"
                            >
                                {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                                Load Report
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                {purchases.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Card>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Total Quantity Purchased</p>
                                    <p className="text-xl font-bold leading-tight">{totalQty.toLocaleString()}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
                                    <Scale className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Total Weight Purchased</p>
                                    <p className="text-xl font-bold leading-tight">{totalWeight.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Total Spend Amount</p>
                                    <p className="text-xl font-bold leading-tight">{formatCurrency(totalCost)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Table Grid */}
                {purchases.length > 0 ? (
                    <Card>
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <span className="text-sm font-semibold">Purchased Items Details</span>
                            <span className="text-xs text-muted-foreground">{purchases.length} items found</span>
                        </div>
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                                        <TableHead className="w-12 py-2.5 text-center font-semibold">Rank</TableHead>
                                        <TableHead className="py-2.5 font-semibold">Item Code</TableHead>
                                        <TableHead className="py-2.5 font-semibold">Item Name</TableHead>
                                        <TableHead className="py-2.5 font-semibold">Category</TableHead>
                                        <TableHead className="py-2.5 text-center font-semibold">GRNs</TableHead>
                                        <TableHead className="py-2.5 text-right font-semibold">Qty Purchased</TableHead>
                                        <TableHead className="py-2.5 text-right font-semibold">Weight (kg)</TableHead>
                                        <TableHead className="py-2.5 text-right font-semibold">Avg Cost Price</TableHead>
                                        <TableHead className="py-2.5 text-right font-semibold">Total Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchases.map((p, index) => (
                                        <TableRow key={index} className="hover:bg-muted/30 even:bg-muted/10">
                                            <TableCell className="py-2 text-center text-muted-foreground font-medium">{index + 1}</TableCell>
                                            <TableCell className="py-2 font-mono text-muted-foreground">{p.Item?.sku || '-'}</TableCell>
                                            <TableCell className="py-2 font-medium">{p.Item?.name || 'Unknown Item'}</TableCell>
                                            <TableCell className="py-2 text-muted-foreground">{p.Item?.Category?.name || '-'}</TableCell>
                                            <TableCell className="py-2 text-center font-medium">{p.totalGrns}</TableCell>
                                            <TableCell className="py-2 text-right">{p.totalQuantityPurchased?.toLocaleString()}</TableCell>
                                            <TableCell className="py-2 text-right text-muted-foreground">{p.weightPurchased?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                                            <TableCell className="py-2 text-right">{formatCurrency(p.averageCostPrice)}</TableCell>
                                            <TableCell className="py-2 text-right font-semibold text-blue-900">{formatCurrency(p.totalCost)}</TableCell>
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
                                <Package className="h-8 w-8 opacity-75" />
                            </div>
                            <p className="text-sm font-semibold text-muted-foreground">No purchasing data loaded</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">Select filters above and click Load Report to display results.</p>
                        </div>
                    )
                )}
            </div>
        </ERPLayout>
    )
}
