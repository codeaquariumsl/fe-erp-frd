"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Package,
  Users,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Truck,
  Loader2,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Leaf,
  TrendingDown,
  CheckCircle2,
  Clock,
  Sparkles
} from "lucide-react"
import {
  dashboardApi,
  invoicesApi,
  receiptsApi,
  reportsApi,
  DashboardMainDetails,
  Invoice,
  Receipt
} from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { LockKeyhole, ShieldAlert } from "lucide-react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { KpiSection } from "@/components/dashboard/kpi-section"
import { KpiCard } from "@/components/dashboard/kpi-card"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
)

const ALL_ROUTES = [
  { href: "/master/suppliers", permissions: ["suppliers:view"] },
  { href: "/purchase-orders", permissions: ["purchase-orders:view"] },
  { href: "/grn", permissions: ["grn:view"] },
  { href: "/supplier-returns", permissions: ["supplier-returns:view"] },
  { href: "/supplier-payments", permissions: ["supplier-payments:view"] },
  { href: "/master/categories", permissions: ["categories:view"] },
  { href: "/master/items", permissions: ["items:view"] },
  { href: "/batches", permissions: ["batches:view"] },
  { href: "/inventory", permissions: ["inventory:view"] },
  { href: "/good-request-notes", permissions: ["good-request-notes:view"] },
  { href: "/issue-notes", permissions: ["issue-notes:view"] },
  { href: "/transfer-in-notes", permissions: ["transfer-in-notes:view"] },
  { href: "/stock-adjustment", permissions: ["stock-adjustment:view"] },
  { href: "/stock-reconciliation", permissions: ["stock-reconciliation:view"] },
  { href: "/customers", permissions: ["customers:view"] },
  { href: "/sales", permissions: ["sales-orders:view"] },
  { href: "/delivery-orders", permissions: ["delivery-orders:view"] },
  { href: "/dispatched-orders", permissions: ["dispatched-orders:view"] },
  { href: "/invoices", permissions: ["invoices:view"] },
  { href: "/receipts", permissions: ["receipts:view"] },
  { href: "/credit-notes", permissions: ["credit-notes:view"] },
  { href: "/customer-returns", permissions: ["customer-returns:view"] },
  { href: "/master/customer-item-codes", permissions: ["customer-item-codes:view"] },
  { href: "/master/routes", permissions: ["routes:view"] },
  { href: "/master/vehicles", permissions: ["vehicles:view"] },
  { href: "/accounting/account-types", permissions: ["accounting:view"] },
  { href: "/accounting/bank-deposits", permissions: ["bank-deposits:view"] },
  { href: "/reports", permissions: ["reports:view"] },
  { href: "/reports/stock", permissions: ["reports-stock-reports:view"] },
  { href: "/reports/movements", permissions: ["reports-stock-movements:view"] },
  { href: "/reports/enhanced-movements", permissions: ["reports-stock-enhanced-movements:view"] },
  { href: "/reports/gin", permissions: ["reports-stock-gin-reports:view"] },
  { href: "/reports/analytics", permissions: ["reports-stock-inventory-valuation:view"] },
  { href: "/reports/general-sales", permissions: ["reports-sales-general:view"] },
  { href: "/reports/item-wise-sales", permissions: ["reports-sales-item-wise:view"] },
  { href: "/reports/sales-by-item", permissions: ["reports-sales-item-wise:view"] },
  { href: "/reports/rep-wise-sales", permissions: ["reports-sales-rep-wise:view"] },
  { href: "/reports/rep-wise-orders", permissions: ["reports-sales-rep-wise:view"] },
  { href: "/reports/free-issue", permissions: ["reports-sales-free-issue:view", "reports-sales-item-wise:view"] },
  { href: "/reports/grn", permissions: ["reports-purchasing-grn-reports:view"] },
  { href: "/reports/item-wise-purchasing", permissions: ["reports-purchasing-item-wise:view"] },
  { href: "/reports/supplier-wise-po", permissions: ["reports-purchasing-supplier-wise:view"] },
  { href: "/reports/expenses", permissions: ["reports-expenses:view"] },
  { href: "/reports/salesperson-commission", permissions: ["reports-salesperson-commission:view"] },
  { href: "/master/locations", permissions: ["warehouse:view"] },
  { href: "/master/stores", permissions: ["warehouse:view"] },
  { href: "/master/units", permissions: ["units:view"] },
  { href: "/master/return-types", permissions: ["return-types:view"] },
  { href: "/user-management", permissions: ["users:view", "roles:view"] },
]

export default function Dashboard() {
  const router = useRouter()
  const { hasPermission, user, isLoading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [mainDetails, setMainDetails] = useState<DashboardMainDetails | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [topSellingItems, setTopSellingItems] = useState<any[]>([])
  const [salesSummary, setSalesSummary] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasNoPermissions, setHasNoPermissions] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (user && user.roleId !== 1 && !hasPermission("dashboard:view")) {
      const firstAllowed = ALL_ROUTES.find(r => r.permissions.some(p => hasPermission(p)))
      if (firstAllowed) {
        router.replace(firstAllowed.href)
      } else {
        setHasNoPermissions(true)
        setLoading(false)
      }
    } else {
      loadDashboardData()
    }
  }, [authLoading, user, hasPermission])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        mainDataRes,
        invoicesRes,
        receiptsRes,
        topItemsRes,
        salesSummaryRes
      ] = await Promise.allSettled([
        dashboardApi.getMainDetails(),
        invoicesApi.getAll({ limit: 1000 }),
        receiptsApi.getAll({ limit: 1000 }),
        reportsApi.getTopSellingItems(undefined, undefined, 5),
        reportsApi.getSalesSummary()
      ])

      if (mainDataRes.status === 'fulfilled') {
        setMainDetails(mainDataRes.value)
      } else {
        console.error("Failed to load main details:", mainDataRes.reason)
      }

      if (invoicesRes.status === 'fulfilled') {
        setInvoices(invoicesRes.value.data || [])
      } else {
        console.error("Failed to load invoices:", invoicesRes.reason)
      }

      if (receiptsRes.status === 'fulfilled') {
        setReceipts(receiptsRes.value || [])
      } else {
        console.error("Failed to load receipts:", receiptsRes.reason)
      }

      if (topItemsRes.status === 'fulfilled') {
        setTopSellingItems(topItemsRes.value || [])
      } else {
        console.error("Failed to load top items:", topItemsRes.reason)
      }

      if (salesSummaryRes.status === 'fulfilled') {
        setSalesSummary(salesSummaryRes.value)
      } else {
        console.error("Failed to load sales summary:", salesSummaryRes.reason)
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getOrderStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0 flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" /> Delivered</Badge>
      case "in transit":
      case "intransit":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-0 flex items-center gap-1 w-fit"><Truck className="h-3 w-3" /> In Transit</Badge>
      case "approved":
        return <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-200 border-0 flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-0 flex items-center gap-1 w-fit"><Clock className="h-3 w-3" /> Pending</Badge>
      default:
        return <Badge variant="outline" className="border-slate-200">{status}</Badge>
    }
  }

  // Calculate Metrics from raw data
  const now = new Date()
  const oneDay = 24 * 60 * 60 * 1000

  // 1. Sales Calculations (Weekly, Monthly, Annual)
  const getSalesForPeriod = (days: number) => {
    return invoices
      .filter(inv => {
        if (!inv.invoiceDate || inv.status === 'Cancelled') return false
        const invDate = new Date(inv.invoiceDate)
        return (now.getTime() - invDate.getTime()) <= days * oneDay
      })
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
  }

  const weeklySales = getSalesForPeriod(7)
  const monthlySales = getSalesForPeriod(30)
  const annualSales = getSalesForPeriod(365)

  // Determine trend percentage (weekly vs previous week, etc. or placeholder if not enough data)
  const getSalesTrend = (days: number) => {
    const current = getSalesForPeriod(days)
    const previous = invoices
      .filter(inv => {
        if (!inv.invoiceDate || inv.status === 'Cancelled') return false
        const invDate = new Date(inv.invoiceDate)
        const diffDays = (now.getTime() - invDate.getTime()) / oneDay
        return diffDays > days && diffDays <= days * 2
      })
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)

    if (previous === 0) return 0
    return parseFloat(((current - previous) / previous * 100).toFixed(1))
  }

  const weeklySalesTrend = getSalesTrend(7)
  const monthlySalesTrend = getSalesTrend(30)
  const annualSalesTrend = getSalesTrend(365)

  // 2. Collections Calculations (Weekly, Monthly, Annual)
  const getCollectionsForPeriod = (days: number) => {
    return receipts
      .filter(rec => {
        if (!rec.receiptDate || rec.isActive === false) return false
        const recDate = new Date(rec.receiptDate)
        return (now.getTime() - recDate.getTime()) <= days * oneDay
      })
      .reduce((sum, rec) => sum + (rec.totalPaid || 0), 0)
  }

  const weeklyCollections = getCollectionsForPeriod(7)
  const monthlyCollections = getCollectionsForPeriod(30)
  const annualCollections = getCollectionsForPeriod(365)

  const getCollectionsTrend = (days: number) => {
    const current = getCollectionsForPeriod(days)
    const previous = receipts
      .filter(rec => {
        if (!rec.receiptDate || rec.isActive === false) return false
        const recDate = new Date(rec.receiptDate)
        const diffDays = (now.getTime() - recDate.getTime()) / oneDay
        return diffDays > days && diffDays <= days * 2
      })
      .reduce((sum, rec) => sum + (rec.totalPaid || 0), 0)

    if (previous === 0) return 0
    return parseFloat(((current - previous) / previous * 100).toFixed(1))
  }

  const weeklyCollectionsTrend = getCollectionsTrend(7)
  const monthlyCollectionsTrend = getCollectionsTrend(30)
  const annualCollectionsTrend = getCollectionsTrend(365)

  // 3. Sales vs Collections Chart Data (Last 6 Months)
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return {
      key: d.toISOString().slice(0, 7), // "YYYY-MM"
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
    }
  }).reverse()

  const chartData = {
    labels: last6Months.map(m => m.label),
    datasets: [
      {
        label: 'Invoiced Sales',
        data: last6Months.map(m => {
          return invoices
            .filter(inv => inv.invoiceDate && inv.invoiceDate.slice(0, 7) === m.key && inv.status !== 'Cancelled')
            .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
        }),
        backgroundColor: 'rgba(16, 185, 129, 0.85)', // Emerald
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'Received Collections',
        data: last6Months.map(m => {
          return receipts
            .filter(rec => rec.receiptDate && rec.receiptDate.slice(0, 7) === m.key && rec.isActive !== false)
            .reduce((sum, rec) => sum + (rec.totalPaid || 0), 0)
        }),
        backgroundColor: 'rgba(245, 158, 11, 0.85)', // Amber
        borderColor: 'rgb(245, 158, 11)',
        borderWidth: 1,
        borderRadius: 6,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 11, family: 'Inter' }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.04)' },
        ticks: {
          callback: function (value: any) {
            if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M'
            if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K'
            return value
          }
        }
      },
      x: {
        grid: { display: false }
      }
    }
  }

  // 4. Delivery Order Status
  const orderStatusData = {
    labels: (mainDetails?.deliveryOrderStatus || []).map(item => item.status),
    datasets: [
      {
        data: (mainDetails?.deliveryOrderStatus || []).map(item => item.count),
        backgroundColor: [
          '#10B981', // Emerald
          '#F59E0B', // Amber
          '#3B82F6', // Blue
          '#EF4444', // Red
          '#6B7280', // Gray
          '#8B5CF6', // Purple
        ],
        borderWidth: 0,
      },
    ],
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          font: { size: 11 }
        }
      }
    },
    cutout: '70%',
  }

  // 5. Top Customers list
  const topCustomers = (() => {
    if (!salesSummary?.summary?.customerBreakdown) return []
    const breakdown = salesSummary.summary.customerBreakdown
    return Object.entries(breakdown)
      .map(([name, data]: [string, any]) => ({
        name,
        count: data.count,
        totalValue: data.totalValue
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
  })()

  if (hasNoPermissions) {
    return (
      <ERPLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
              <LockKeyhole className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-800">No Authorizations Assigned</h2>
              <p className="text-sm text-slate-500">Your account does not have permissions assigned for any workspace modules. Please contact your system administrator.</p>
            </div>
          </div>
        </div>
      </ERPLayout>
    )
  }

  return (
    <ERPLayout>
      <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}

        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Operations Hub <Leaf className="h-6 w-6 text-emerald-600 fill-emerald-600/10" />
              </h1>
            </div>
            <p className="text-slate-500 mt-1 text-sm">Welcome back to Fruit Eazy ERP — real-time sales and collections metrics</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadDashboardData} disabled={loading} className="shadow-sm border-slate-200 hover:bg-slate-100 rounded-xl">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2 text-emerald-600" />}
              Refresh
            </Button>
            <Button onClick={() => router.push('/reports')} className="shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              <BarChart3 className="h-4 w-4 mr-2" />
              Detailed Reports
            </Button>
          </div>
        </div>

        {/* --- KPI SECTION: INVOICED SALES --- */}
        <KpiSection
          title="Invoiced Sales Performance"
          badgeLabel="Invoices"
          accentDot="bg-emerald-600"
          badgeCls="bg-emerald-50 text-emerald-700 border-emerald-200"
        >
          <KpiCard
            label="Weekly Invoiced Sales"
            value={formatCurrency(weeklySales)}
            trend={weeklySalesTrend}
            trendLabel="vs last week"
            icon={<DollarSign className="h-5 w-5" />}
            accentBg="bg-emerald-50"
            accentColor="text-emerald-600"
            loading={loading}
          />
          <KpiCard
            label="Monthly Invoiced Sales"
            value={formatCurrency(monthlySales)}
            trend={monthlySalesTrend}
            trendLabel="vs last month"
            icon={<TrendingUp className="h-5 w-5" />}
            accentBg="bg-emerald-50"
            accentColor="text-emerald-600"
            loading={loading}
          />
          <KpiCard
            label="Annual Invoiced Sales (Rolling)"
            value={formatCurrency(annualSales)}
            trend={annualSalesTrend}
            trendLabel="vs last year"
            icon={<Sparkles className="h-5 w-5" />}
            accentBg="bg-emerald-50"
            accentColor="text-emerald-600"
            loading={loading}
          />
        </KpiSection>

        {/* --- KPI SECTION: COLLECTIONS --- */}
        <KpiSection
          title="Collections & Cashflow"
          badgeLabel="Receipts"
          accentDot="bg-amber-500"
          badgeCls="bg-amber-50 text-amber-700 border-amber-200"
        >
          <KpiCard
            label="Weekly Collected Receipts"
            value={formatCurrency(weeklyCollections)}
            trend={weeklyCollectionsTrend}
            trendLabel="vs last week"
            icon={<DollarSign className="h-5 w-5" />}
            accentBg="bg-amber-50"
            accentColor="text-amber-600"
            loading={loading}
          />
          <KpiCard
            label="Monthly Collected Receipts"
            value={formatCurrency(monthlyCollections)}
            trend={monthlyCollectionsTrend}
            trendLabel="vs last month"
            icon={<TrendingUp className="h-5 w-5" />}
            accentBg="bg-amber-50"
            accentColor="text-amber-600"
            loading={loading}
          />
          <KpiCard
            label="Annual Collected Receipts (Rolling)"
            value={formatCurrency(annualCollections)}
            trend={annualCollectionsTrend}
            trendLabel="vs last year"
            icon={<Sparkles className="h-5 w-5" />}
            accentBg="bg-amber-50"
            accentColor="text-amber-600"
            loading={loading}
          />
        </KpiSection>

        {/* --- CHARTS SECTION --- */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sales vs Collections Comparison Chart */}
          <Card className="lg:col-span-2 shadow-sm border-slate-200/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Sales vs Collections Comparison</CardTitle>
                <CardDescription className="text-xs">Invoice totals compared to received payments over the last 6 months</CardDescription>
              </div>
              <BarChart3 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="h-64">
                  <Bar data={chartData} options={chartOptions} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Order Status */}
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Delivery Distribution</CardTitle>
                <CardDescription className="text-xs">Current state of delivery orders</CardDescription>
              </div>
              <PieChart className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="h-64 relative">
                  <Doughnut data={orderStatusData} options={doughnutOptions} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- GRID INSIGHTS (FAST MOVING & TOP CUSTOMERS) --- */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Fast Moving Items */}
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                Fast Moving Items
              </CardTitle>
              <CardDescription className="text-xs">Top products ranked by quantity sold</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {topSellingItems.length > 0 ? (
                    topSellingItems.map((item, index) => {
                      const totalQty = parseInt(item.totalQuantitySold || 0)
                      const maxQty = Math.max(...topSellingItems.map(i => parseInt(i.totalQuantitySold || 1)))
                      const progressPercentage = Math.min(100, (totalQty / maxQty) * 100)

                      return (
                        <div key={index} className="space-y-1.5 p-3 hover:bg-slate-50 rounded-xl transition-all">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 flex items-center justify-center bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full">
                                {index + 1}
                              </span>
                              <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                                {item.Item?.name || `Product #${item.itemId}`}
                              </span>
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                {item.Item?.sku || 'SKU N/A'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900">{totalQty.toLocaleString()}</span>
                              <span className="text-[11px] text-slate-400 ml-1">sold</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress value={progressPercentage} className="h-2 flex-1" />
                            <span className="text-xs font-semibold text-slate-500 min-w-[65px] text-right">
                              {formatCurrency(item.totalRevenue)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center text-slate-500 py-12">
                      <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm">No transaction details available to determine top products</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                Top Customers
              </CardTitle>
              <CardDescription className="text-xs">Highest-value buyers based on invoice history</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {topCustomers.length > 0 ? (
                    topCustomers.map((cust, index) => {
                      const initials = cust.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()

                      return (
                        <div key={index} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-emerald-600 text-white font-semibold text-xs">
                                {initials || "C"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm text-slate-800">{cust.name}</p>
                              <p className="text-xs text-slate-400">{cust.count} orders</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm text-slate-900">{formatCurrency(cust.totalValue)}</p>
                            <Badge className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100">Top Buyer</Badge>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center text-slate-500 py-12">
                      <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm">No sales invoices logged to calculate customer value</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- RECENT INVOICES & LOW STOCK ALERTS --- */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Invoices */}
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Recent Invoiced Orders</CardTitle>
                <CardDescription className="text-xs">Latest issued business invoices</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/invoices')} className="text-xs text-emerald-600 hover:text-emerald-700">
                View Invoices
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {(mainDetails?.recentOrders || []).length > 0 ? (
                    (mainDetails?.recentOrders || []).map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            <div>
                              <p className="font-semibold text-sm text-slate-800">#{order.invoiceNumber || order.id}</p>
                              <p className="text-xs text-slate-400">{order.Customer?.name || 'Unknown Customer'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-slate-900">{formatCurrency(order.total || 0)}</p>
                          <div className="mt-1">{getOrderStatusBadge(order.status)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-500 py-12">
                      <ShoppingCart className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm">No recent invoices found</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Low Stock Alerts</CardTitle>
                <CardDescription className="text-xs">Warehouse items falling below safety reorder limits</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/inventory')} className="text-xs text-emerald-600 hover:text-emerald-700">
                Manage Stock
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {(mainDetails?.lowStockItems || []).length > 0 ? (
                    (mainDetails?.lowStockItems || []).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100/40">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-50 rounded-lg">
                            <Package className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{item.name}</p>
                            <p className="text-xs text-slate-400">{item.sku || 'SKU N/A'}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center justify-end gap-2 text-sm">
                            <span className="text-red-600 font-bold">{item.availableQty || 0}</span>
                            <span className="text-slate-400">/</span>
                            <span className="text-slate-500 font-medium">{item.reorderLevelQty || 0}</span>
                          </div>
                          <Progress
                            value={Math.min(100, ((item.availableQty || 0) / Math.max(item.reorderLevelQty || 1, 1)) * 100)}
                            className="w-16 h-1.5"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-500 py-12">
                      <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm">All inventory items are above reorder limits</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- QUICK ACTIONS --- */}
        {/* <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800">Operations Panel</CardTitle>
            <CardDescription className="text-xs">Quick entry points for primary ERP operations</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button
                className="h-16 flex-col gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/10"
                onClick={() => router.push('/sales')}
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="font-semibold text-sm">Create Sales Order</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex-col gap-1.5 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 rounded-xl shadow-sm"
                onClick={() => router.push('/grn')}
              >
                <Package className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-sm">Receive Goods (GRN)</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex-col gap-1.5 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 rounded-xl shadow-sm"
                onClick={() => router.push('/delivery-orders')}
              >
                <Truck className="h-5 w-5 text-amber-500" />
                <span className="font-semibold text-sm">Logistics / Delivery</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex-col gap-1.5 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 rounded-xl shadow-sm"
                onClick={() => router.push('/customers')}
              >
                <Users className="h-5 w-5 text-blue-500" />
                <span className="font-semibold text-sm">Customers CRM</span>
              </Button>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </ERPLayout>
  )
}
