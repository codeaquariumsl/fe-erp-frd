"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    TrendingUp, AlertTriangle, Loader2, Package, ShoppingCart, FileText,
    RefreshCcw, BarChart3, Download, ArrowRight, Users, Wallet, DollarSign
} from "lucide-react"
import { reportsApi } from "@/lib/api"
import { generateDashboardPDF } from "@/lib/pdf-generator"

const reportSections = [
    {
        title: "Stock & Inventory",
        items: [
            { name: "Stock Reports", href: "/reports/stock", icon: Package, description: "Bincards, Summary, by Store", color: "text-indigo-600", bg: "bg-indigo-50" },
            { name: "Stock Movements", href: "/reports/movements", icon: RefreshCcw, description: "Stock History", color: "text-purple-600", bg: "bg-purple-50" },
            { name: "Enhanced Movements", href: "/reports/enhanced-movements", icon: BarChart3, description: "Advanced Analysis", color: "text-pink-600", bg: "bg-pink-50" },
            { name: "GIN Reports", href: "/reports/gin", icon: FileText, description: "Goods Issued", color: "text-orange-600", bg: "bg-orange-50" },
            { name: "Inventory Valuation", href: "/reports/analytics", icon: BarChart3, description: "Inventory Valuation", color: "text-sky-600", bg: "bg-sky-50" },
        ]
    },
    {
        title: "Sales & Distribution",
        items: [
            // { name: "Sales Reports", href: "/reports/sales", icon: ShoppingCart, description: "Customer & Item Sales", color: "text-blue-600", bg: "bg-blue-50" },
            { name: "General Sales", href: "/reports/general-sales", icon: TrendingUp, description: "Outstanding & Overdue", color: "text-cyan-600", bg: "bg-cyan-50" },
            { name: "Item Wise Sales", href: "/reports/item-wise-sales", icon: TrendingUp, description: "Top selling items", color: "text-emerald-600", bg: "bg-emerald-50" },
            { name: "Item Detail Report", href: "/reports/sales-by-item", icon: Package, description: "Qty sold per item", color: "text-orange-600", bg: "bg-orange-50" },
            { name: "Rep Wise Sales", href: "/reports/rep-wise-sales", icon: Users, description: "Sales by Rep", color: "text-teal-600", bg: "bg-teal-50" },
            { name: "Rep Wise Orders", href: "/reports/rep-wise-orders", icon: Users, description: "Orders by Rep", color: "text-amber-600", bg: "bg-amber-50" },
        ]
    },
    {
        title: "Procurement & Purchasing",
        items: [
            { name: "GRN Reports", href: "/reports/grn", icon: FileText, description: "Goods Received", color: "text-green-600", bg: "bg-green-50" },
            { name: "Item-wise Purchasing", href: "/reports/item-wise-purchasing", icon: Package, description: "Qty purchased per item", color: "text-blue-600", bg: "bg-blue-50" },
            { name: "Supplier-wise PO", href: "/reports/supplier-wise-po", icon: Users, description: "POs grouped by supplier", color: "text-amber-600", bg: "bg-amber-50" },
        ]
    },
    {
        title: "Finance & Commission",
        items: [
            { name: "Expenses", href: "/reports/expenses", icon: Wallet, description: "Payments & Petty Cash", color: "text-red-600", bg: "bg-red-50" },
            { name: "Commission", href: "/reports/salesperson-commission", icon: DollarSign, description: "Monthly commission", color: "text-violet-600", bg: "bg-violet-50" },
        ]
    }
]

export default function ReportsDashboard() {
    const [loading, setLoading] = useState(false)
    const [lowStockItems, setLowStockItems] = useState<any[]>([])
    const [expiredItems, setExpiredItems] = useState<any[]>([])
    const [inventoryValuation, setInventoryValuation] = useState<any[]>([])
    const [threshold, setThreshold] = useState<string>("10")

    const loadDashboardReports = async () => {
        setLoading(true)
        try {
            const [lowStock, valuation] = await Promise.all([
                reportsApi.getLowStockItems(threshold ? parseInt(threshold) : undefined),
                reportsApi.getInventoryValuation()
            ])
            setLowStockItems(lowStock)
            setInventoryValuation(valuation)
            try {
                const expired = await reportsApi.getExpiredItems()
                setExpiredItems(expired)
            } catch (e) {
                setExpiredItems([])
            }
        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadDashboardReports() }, [])

    const formatCurrency = (amount: number) => `LKR ${(amount || 0).toLocaleString()}`
    const totalValue = inventoryValuation.reduce((sum, item) => sum + (item.totalValue || 0), 0)

    return (
        <ERPLayout>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Reports Dashboard</h1>
                            <p className="text-xs text-muted-foreground">Quick overview and access to all reports</p>
                        </div>
                    </div>
                    {/* <Button variant="outline" size="sm" onClick={() => generateDashboardPDF(document.getElementById('dashboard-content')!)}>
                        <Download className="h-3.5 w-3.5 mr-1.5" />Export
                    </Button> */}
                </div>

                {/* KPI Cards */}
                <div className="grid gap-3 md:grid-cols-3">
                    <Card className="border-l-4 border-l-orange-500">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="p-2 rounded-full bg-orange-50"><AlertTriangle className="h-4 w-4 text-orange-500" /></div>
                            <div className="flex-1">
                                <div className="text-xs text-muted-foreground">Low Stock Items</div>
                                <div className="text-lg font-bold">{lowStockItems.length}</div>
                                <div className="flex items-center gap-1">
                                    <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-14 h-5 text-xs px-1" />
                                    <span className="text-xs text-muted-foreground">threshold</span>
                                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={loadDashboardReports}><RefreshCcw className="h-3 w-3" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-red-500">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="p-2 rounded-full bg-red-50"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
                            <div>
                                <div className="text-xs text-muted-foreground">Expired Items</div>
                                <div className="text-lg font-bold">{expiredItems.length}</div>
                                <div className="text-xs text-muted-foreground">Items past expiry</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="p-2 rounded-full bg-green-50"><TrendingUp className="h-4 w-4 text-green-500" /></div>
                            <div>
                                <div className="text-xs text-muted-foreground">Inventory Value</div>
                                <div className="text-lg font-bold">{formatCurrency(totalValue)}</div>
                                <div className="text-xs text-muted-foreground">Current total</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Report Sections */}
                <div className="space-y-6">
                    {reportSections.map((section) => (
                        <div key={section.title} className="space-y-2.5">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-1.5 border-muted">
                                <span className="w-1.5 h-3.5 rounded-full bg-primary" />
                                {section.title}
                            </h2>
                            <div className="grid gap-2.5 md:grid-cols-3 lg:grid-cols-4">
                                {section.items.map((link) => (
                                    <Link key={link.href} href={link.href}>
                                        <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group h-full">
                                            <CardContent className="p-3 flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${link.bg} group-hover:scale-110 transition-transform`}>
                                                    <link.icon className={`h-4 w-4 ${link.color}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-semibold truncate">{link.name}</div>
                                                    <div className="text-xs text-muted-foreground truncate">{link.description}</div>
                                                </div>
                                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Data Tables */}
                <div id="dashboard-content" className="grid gap-3 md:grid-cols-2">
                    <Card>
                        <div className="flex items-center justify-between px-4 py-2.5 border-b">
                            <span className="text-sm font-semibold">Low Stock Alerts</span>
                            <span className="text-xs text-muted-foreground">{lowStockItems.length} items</span>
                        </div>
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="py-1.5">Item</TableHead>
                                        <TableHead className="py-1.5">Qty</TableHead>
                                        <TableHead className="py-1.5">Store</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lowStockItems.slice(0, 8).map((item, i) => (
                                        <TableRow key={i} className="hover:bg-muted/30 even:bg-muted/10">
                                            <TableCell className="py-1.5 font-medium">{item.Item.name}</TableCell>
                                            <TableCell className="py-1.5 text-red-600 font-bold">{item.availableQty}</TableCell>
                                            <TableCell className="py-1.5 text-muted-foreground">{item.Store?.name}</TableCell>
                                        </TableRow>
                                    ))}
                                    {lowStockItems.length === 0 && (
                                        <TableRow><TableCell colSpan={3} className="py-6 text-center text-muted-foreground">No low stock items</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between px-4 py-2.5 border-b">
                            <span className="text-sm font-semibold">Inventory Valuation (Top)</span>
                            <span className="text-xs text-muted-foreground">{inventoryValuation.length} items</span>
                        </div>
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="py-1.5">Item</TableHead>
                                        <TableHead className="py-1.5 text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inventoryValuation.slice(0, 8).map((item, i) => (
                                        <TableRow key={i} className="hover:bg-muted/30 even:bg-muted/10">
                                            <TableCell className="py-1.5 font-medium">{item.itemName}</TableCell>
                                            <TableCell className="py-1.5 text-right font-semibold">{formatCurrency(item.totalValue)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {inventoryValuation.length === 0 && (
                                        <TableRow><TableCell colSpan={2} className="py-6 text-center text-muted-foreground">No data</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            </div>
        </ERPLayout>
    )
}
