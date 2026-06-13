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
import { CalendarIcon, FileText, FileSpreadsheet, Loader2, Search, Users, DollarSign, TrendingUp, Package } from "lucide-react"
import { reportsApi, customersApi, itemsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { generateSalesReportPDF, generateSalesByItemPDF } from "@/lib/pdf-generator"
import { generateSalesSummaryExcel, generateSalesByItemExcel } from "@/lib/excel-generator"
import { CustomerSelect } from "@/components/customer/customer-select"
import { ItemSelect } from "@/components/items/item-select"
import { DocLink } from "@/components/reports/doc-link"
import Link from "next/link"

export default function SalesReportsPage() {
    const [loading, setLoading] = useState(false)
    const [customers, setCustomers] = useState<any[]>([])
    const [items, setItems] = useState<any[]>([])

    const [salesSummary, setSalesSummary] = useState<any>(null)
    const [customerSales, setCustomerSales] = useState<any>(null)
    const [itemSales, setItemSales] = useState<any>(null)

    const [selectedStatus, setSelectedStatus] = useState<string>("all")
    const [selectedCustomer, setSelectedCustomer] = useState<string>("")
    const [selectedItem, setSelectedItem] = useState<string>("")
    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [customersResponse, itemsResponse] = await Promise.all([customersApi.getAll(), itemsApi.getAll()])
                setCustomers(Array.isArray(customersResponse) ? customersResponse : [])
                setItems(Array.isArray(itemsResponse) ? itemsResponse : [])
            } catch (error) { console.error('Error loading initial data:', error) }
        }
        loadInitialData()
    }, [])

    const loadSalesSummary = async () => {
        setLoading(true)
        try {
            const data = await reportsApi.getSalesSummary(
                startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
                selectedStatus === "all" ? undefined : selectedStatus
            )
            setSalesSummary(data)
        } catch (error) { console.error('Error loading sales summary:', error) }
        finally { setLoading(false) }
    }

    const loadCustomerSales = async () => {
        if (!selectedCustomer) return
        setLoading(true)
        try {
            const data = await reportsApi.getSalesByCustomer(
                selectedCustomer,
                startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate ? format(endDate, 'yyyy-MM-dd') : undefined
            )
            setCustomerSales(data)
        } catch (error) { console.error('Error loading customer sales:', error) }
        finally { setLoading(false) }
    }

    const loadItemSales = async () => {
        if (!selectedItem) return
        setLoading(true)
        try {
            const data = await reportsApi.getSalesByItem(
                selectedItem,
                startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate ? format(endDate, 'yyyy-MM-dd') : undefined
            )
            setItemSales(data)
        } catch (error) { console.error('Error loading item sales:', error) }
        finally { setLoading(false) }
    }

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case "approved": case "delivered": return <Badge className="bg-green-100 text-green-800 text-xs py-0">{status}</Badge>
            case "pending": return <Badge variant="secondary" className="text-xs py-0">Pending</Badge>
            case "rejected": case "cancelled": return <Badge variant="destructive" className="text-xs py-0">{status}</Badge>
            default: return <Badge variant="outline" className="text-xs py-0">{status}</Badge>
        }
    }

    const formatCurrency = (amount: number) => `LKR ${(amount || 0).toLocaleString()}`

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
                    <div className="p-2 rounded-lg bg-blue-500/10"><FileText className="h-5 w-5 text-blue-600" /></div>
                    <div>
                        <h1 className="text-xl font-bold">Sales Reports</h1>
                        <p className="text-xs text-muted-foreground">Analyze sales performance and customer trends</p>
                    </div>
                </div>

                {/* Quick-link sub-reports */}
                <div className="grid gap-2 md:grid-cols-5">
                    {[
                        { href: "/reports/general-sales", label: "General Sales", desc: "Outstanding & overdue", icon: FileText },
                        { href: "/reports/item-wise-sales", label: "Top Selling Items", desc: "Highest volume items", icon: TrendingUp },
                        { href: "/reports/sales-by-item", label: "Item Details", desc: "Analyze specific items", icon: Package },
                        { href: "/reports/rep-wise-sales", label: "Rep Wise Sales", desc: "Grouped by rep", icon: Users },
                        { href: "/reports/rep-wise-orders", label: "Rep Orders", desc: "Order volume by rep", icon: Users },
                        { href: "/reports/expenses", label: "Expenses", desc: "Petty cash & payments", icon: DollarSign },
                        { href: "/reports/salesperson-commission", label: "Commission", desc: "Monthly breakdown", icon: DollarSign },
                    ].map(link => (
                        <Link key={link.href} href={link.href}>
                            <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group h-full">
                                <CardContent className="p-3 flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                        <link.icon className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold truncate">{link.label}</div>
                                        <div className="text-[10px] text-muted-foreground truncate">{link.desc}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </ERPLayout>
    )
}
