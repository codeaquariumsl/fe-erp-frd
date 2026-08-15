"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Sparkles,
  CalendarIcon
} from "lucide-react"
import {
  dashboardApi,
  reportsApi,
  DashboardMainDetails
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
import { Bar, Doughnut, Pie } from 'react-chartjs-2'

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
  { href: "/reports/customer-outstanding", permissions: ["reports-sales-customer-outstanding:view"] },
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
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly")
  const [loading, setLoading] = useState(true)
  const [mainDetails, setMainDetails] = useState<DashboardMainDetails | null>(null)
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
      loadDashboardData(period)
    }
  }, [authLoading, user, hasPermission, period])

  const loadDashboardData = async (currentPeriod: string = period) => {
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      let startDateStr: string | undefined
      let endDateStr: string = format(now, "yyyy-MM-dd")

      if (currentPeriod === "daily") {
        startDateStr = format(now, "yyyy-MM-dd")
      } else if (currentPeriod === "weekly") {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        startDateStr = format(start, "yyyy-MM-dd")
      } else {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        startDateStr = format(start, "yyyy-MM-dd")
      }

      const [
        mainDataRes,
        topItemsRes,
        salesSummaryRes
      ] = await Promise.allSettled([
        dashboardApi.getMainDetails(currentPeriod),
        reportsApi.getTopSellingItems(startDateStr, endDateStr, 5),
        reportsApi.getSalesSummary(startDateStr, endDateStr)
      ])

      if (mainDataRes.status === 'fulfilled') {
        setMainDetails(mainDataRes.value)
      } else {
        console.error("Failed to load main details:", mainDataRes.reason)
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

  // Period-based Metrics calculation
  const periodTitle = period === "daily" ? "Daily" : period === "weekly" ? "Weekly" : "Monthly"
  const prevTrendLabel = period === "daily" ? "vs yesterday" : period === "weekly" ? "vs prev week" : "vs prev month"

  const salesForPeriod = mainDetails?.summary?.monthlySales?.value || 0
  const salesTrendForPeriod = mainDetails?.summary?.monthlySales?.trend || 0

  const collectionsForPeriod = mainDetails?.summary?.monthlyCollections?.value || 0
  const collectionsTrendForPeriod = mainDetails?.summary?.monthlyCollections?.trend || 0

  // Dynamic Sales vs Collections Chart Data from mainDetails API endpoint
  const chartData = useMemo(() => {
    return {
      labels: mainDetails?.salesVsCollections?.labels || [],
      datasets: [
        {
          label: 'Invoiced Sales',
          data: mainDetails?.salesVsCollections?.sales || [],
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: 'Received Collections',
          data: mainDetails?.salesVsCollections?.collections || [],
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 1,
          borderRadius: 6,
        }
      ]
    }
  }, [mainDetails])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          padding: 10,
          font: { size: 10, family: 'Inter' }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.04)' },
        ticks: {
          font: { size: 10 },
          callback: function (value: any) {
            if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M'
            if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K'
            return value
          }
        }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } }
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

  // 4b. Sales Order Status
  const salesOrderStatusData = {
    labels: (mainDetails?.salesOrderStatus || []).map(item => item.status),
    datasets: [
      {
        data: (mainDetails?.salesOrderStatus || []).map(item => item.count),
        backgroundColor: [
          '#3B82F6', // Blue
          '#10B981', // Emerald
          '#F59E0B', // Amber
          '#8B5CF6', // Purple
          '#EF4444', // Red
          '#EC4899', // Pink
          '#6B7280', // Gray
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
          boxWidth: 10,
          usePointStyle: true,
          font: { size: 10 }
        }
      }
    },
    cutout: '72%',
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
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center mx-auto text-amber-600">
              <LockKeyhole className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-800">No Authorizations Assigned</h2>
              <p className="text-xs text-slate-500">Your account does not have permissions assigned for any workspace modules. Please contact your system administrator.</p>
            </div>
          </div>
        </div>
      </ERPLayout>
    )
  }

  return (
    <ERPLayout>
      <div className="space-y-3 p-2 md:p-2 bg-slate-50/70 min-h-screen">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl shadow-2xs text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          </div>
        )}

        {/* --- DASHBOARD HEADER & ACTIONS --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 px-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                {(() => {
                  const hour = new Date().getHours()
                  if (hour < 12) return "Good Morning"
                  if (hour < 18) return "Good Afternoon"
                  return "Good Evening"
                })()}, {user?.fullName || user?.username || (user ? `User ${user.id}` : "Guest")}!
              </h1>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Fruit Eazy ERP — Real-time business metrics, sales analytics & inventory controls</p>
          </div>
          <div className="flex items-center gap-2">
            {/* PERIOD SELECTOR DROPDOWN */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/90 rounded-lg px-2.5 py-1">
              <CalendarIcon className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">Period:</span>
              <Select value={period} onValueChange={(val: "daily" | "weekly" | "monthly") => setPeriod(val)}>
                <SelectTrigger className="h-6 text-xs border-0 bg-transparent p-0 shadow-none font-bold text-slate-800 focus:ring-0 w-[95px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className='text-xs' value="daily">Daily</SelectItem>
                  <SelectItem className='text-xs' value="weekly">Weekly</SelectItem>
                  <SelectItem className='text-xs' value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" onClick={() => loadDashboardData(period)} disabled={loading} className="h-8 text-xs px-3 shadow-2xs border-slate-200/80 hover:bg-slate-50 rounded-lg">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-emerald-600" /> : <Activity className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />}
              Refresh
            </Button>
            <Button size="sm" onClick={() => router.push('/reports')} className="h-8 text-xs px-3 shadow-2xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              Detailed Reports
            </Button>
          </div>
        </div>

        {/* --- CONSOLIDATED 6-COLUMN KPI SECTION --- */}
        <KpiSection
          title={`${periodTitle} Performance Summary`}
          badgeLabel={`Filter: ${periodTitle}`}
          accentDot="bg-emerald-600"
          badgeCls="bg-slate-100 text-slate-700 border-slate-200"
          gridClassName="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        >
          <KpiCard
            label={`${periodTitle} Sales`}
            value={formatCurrency(salesForPeriod)}
            trend={salesTrendForPeriod}
            trendLabel={prevTrendLabel}
            icon={<DollarSign />}
            accentBg="bg-emerald-50"
            accentColor="text-emerald-600"
            loading={loading}
          />
          <KpiCard
            label={`${periodTitle} Collections`}
            value={formatCurrency(collectionsForPeriod)}
            trend={collectionsTrendForPeriod}
            trendLabel={prevTrendLabel}
            icon={<TrendingUp />}
            accentBg="bg-amber-50"
            accentColor="text-amber-600"
            loading={loading}
          />
          <KpiCard
            label="Total Orders"
            value={(mainDetails?.summary?.totalOrders?.value || 0).toString()}
            subtext={`${mainDetails?.summary?.totalOrders?.pending || 0} Pending`}
            icon={<ShoppingCart />}
            accentBg="bg-blue-50"
            accentColor="text-blue-600"
            loading={loading}
          />
          <KpiCard
            label="Active Customers"
            value={(mainDetails?.summary?.activeCustomers?.value || 0).toString()}
            subtext="Registered & Active"
            icon={<Users />}
            accentBg="bg-purple-50"
            accentColor="text-purple-600"
            loading={loading}
          />
          <KpiCard
            label="Inventory Value"
            value={formatCurrency(mainDetails?.summary?.totalInventoryValue?.value || 0)}
            subtext="Available Stock"
            icon={<Package />}
            accentBg="bg-indigo-50"
            accentColor="text-indigo-600"
            loading={loading}
          />
          <KpiCard
            label="Low Stock Items"
            value={(mainDetails?.summary?.lowStockItems?.value || 0).toString()}
            subtext={mainDetails?.summary?.lowStockItems?.status || "Healthy"}
            icon={<AlertTriangle />}
            accentBg="bg-red-50"
            accentColor="text-red-600"
            loading={loading}
          />
        </KpiSection>

        {/* --- CHARTS SECTION --- */}
        <div className="grid gap-3.5 lg:grid-cols-4">
          {/* Sales vs Collections Comparison Chart */}
          <Card className="lg:col-span-2 shadow-2xs border-slate-200/80 bg-white">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-800">Sales vs Collections Comparison</CardTitle>
                <CardDescription className="text-[10px] text-slate-400">Invoiced totals vs received payments (last 6 months)</CardDescription>
              </div>
              <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="h-48">
                  <Bar data={chartData} options={chartOptions} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Order Status */}
          <Card className="shadow-2xs border-slate-200/80 bg-white">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-800">Sales Order Status</CardTitle>
                <CardDescription className="text-[10px] text-slate-400">Current status of sales orders</CardDescription>
              </div>
              <PieChart className="h-3.5 w-3.5 text-blue-600" />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="h-48 relative">
                  <Doughnut data={salesOrderStatusData} options={doughnutOptions} />
                </div>
              )}
            </CardContent>
          </Card>
          {/* Delivery Order Status */}
          <Card className="shadow-2xs border-slate-200/80 bg-white">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-800">Delivery Distribution</CardTitle>
                <CardDescription className="text-[10px] text-slate-400">Current status of logistics orders</CardDescription>
              </div>
              <PieChart className="h-3.5 w-3.5 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="h-48 relative">
                  <Doughnut data={orderStatusData} options={doughnutOptions} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- OPERATIONAL INSIGHTS (FAST MOVING & TOP CUSTOMERS) --- */}
        <div className="grid gap-3.5 lg:grid-cols-2">
          {/* Fast Moving Items */}
          <Card className="shadow-2xs border-slate-200/80 bg-white">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-emerald-600" />
                  Fast Moving Products
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400">Top items ranked by sales quantity</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-50 text-slate-600">Top 5</Badge>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="space-y-2">
                  {topSellingItems.length > 0 ? (
                    topSellingItems.map((item, index) => {
                      const totalQty = parseInt(item.totalQuantitySold || 0)
                      const maxQty = Math.max(...topSellingItems.map(i => parseInt(i.totalQuantitySold || 1)))
                      const progressPercentage = Math.min(100, (totalQty / maxQty) * 100)

                      return (
                        <div key={index} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-100 transition-all space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 flex items-center justify-center bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full flex-shrink-0">
                                {index + 1}
                              </span>
                              <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                                {item.Item?.name || `Product #${item.itemId}`}
                              </span>
                              <span className="text-[9px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded font-mono">
                                {item.Item?.sku || 'SKU N/A'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900">{totalQty.toLocaleString()}</span>
                              <span className="text-[10px] text-slate-400 ml-0.5">sold</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={progressPercentage} className="h-1.5 flex-1" />
                            <span className="text-[11px] font-semibold text-slate-600 min-w-[60px] text-right">
                              {formatCurrency(item.totalRevenue)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      <Package className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs">No transaction history available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card className="shadow-2xs border-slate-200/80 bg-white">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  Top Account Customers
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400">Highest-value buyers by invoice total</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-50 text-slate-600">Top 5</Badge>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="space-y-2">
                  {topCustomers.length > 0 ? (
                    topCustomers.map((cust, index) => {
                      const initials = cust.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()

                      return (
                        <div key={index} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg border border-slate-100 transition-all">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 border border-slate-200">
                              <AvatarFallback className="bg-emerald-600 text-white font-bold text-[10px]">
                                {initials || "C"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-xs text-slate-800 line-clamp-1">{cust.name}</p>
                              <p className="text-[10px] text-slate-400">{cust.count} orders logged</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-xs text-slate-900">{formatCurrency(cust.totalValue)}</p>
                            <Badge className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 font-medium">Top Buyer</Badge>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      <Users className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs">No sales invoices logged to aggregate customers</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- RECENT INVOICES & LOW STOCK ALERTS --- */}
        <div className="grid gap-3.5 lg:grid-cols-2">
          {/* Recent Invoices */}
          <Card className="shadow-2xs border-slate-200/80 bg-white">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-800">Recent Issued Invoices</CardTitle>
                <CardDescription className="text-[10px] text-slate-400">Latest active sales billing entries</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/invoices')} className="h-6 text-[11px] px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50">
                View All Invoices
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="space-y-2">
                  {(mainDetails?.recentOrders || []).length > 0 ? (
                    (mainDetails?.recentOrders || []).slice(0, 5).map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-all">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0"></div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-slate-800 truncate">#{order.invoiceNumber || order.id}</p>
                              <p className="text-[10px] text-slate-400 truncate">{order.Customer?.name || 'Unknown Customer'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="font-bold text-xs text-slate-900">{formatCurrency(order.total || 0)}</p>
                          <div className="mt-0.5">{getOrderStatusBadge(order.status)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      <ShoppingCart className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs">No recent invoices logged</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="shadow-2xs border-slate-200/80 bg-white">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-800">Low Stock Reorder Alerts</CardTitle>
                <CardDescription className="text-[10px] text-slate-400">Inventory items reaching safety thresholds</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/inventory')} className="h-6 text-[11px] px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50">
                Inventory Control
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="space-y-2">
                  {(mainDetails?.lowStockItems || []).length > 0 ? (
                    (mainDetails?.lowStockItems || []).slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-red-50/40 rounded-lg border border-red-100/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 bg-red-100/60 rounded-md flex-shrink-0">
                            <Package className="h-3.5 w-3.5 text-red-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-slate-800 truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{item.sku || 'SKU N/A'}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-0.5 flex-shrink-0 ml-2">
                          <div className="flex items-center justify-end gap-1 text-xs">
                            <span className="text-red-600 font-bold">{item.availableQty || 0}</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-500 font-medium text-[11px]">{item.reorderLevelQty || 0}</span>
                          </div>
                          <Progress
                            value={Math.min(100, ((item.availableQty || 0) / Math.max(item.reorderLevelQty || 1, 1)) * 100)}
                            className="w-14 h-1"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      <Package className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs">All inventory items are within healthy limits</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ERPLayout>
  )
}

