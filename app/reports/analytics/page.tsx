"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, FileText, BarChart3, RotateCw, DollarSign, Package } from "lucide-react"
import { reportsApi } from "@/lib/api"
import { generateAnalyticsPDF } from "@/lib/pdf-generator"

export default function AnalyticsReportsPage() {
  const [loading, setLoading] = useState(false)
  const [inventoryValuation, setInventoryValuation] = useState<any[]>([])

  const loadInventoryValuation = async () => {
    setLoading(true)
    try {
      const data = await reportsApi.getInventoryValuation()
      setInventoryValuation(data)
    } catch (error) {
      console.error('Error loading inventory valuation:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventoryValuation()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(amount || 0)
  }

  const totalValue = inventoryValuation.reduce((acc, item) => acc + Number(item.totalValue || 0), 0)
  const totalQty = inventoryValuation.reduce((acc, item) => acc + Number(item.totalQty || 0), 0)

  return (
    <ERPLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Inventory Valuation</h1>
              <p className="text-xs text-muted-foreground">Detailed breakdown of current stock value</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={loadInventoryValuation} disabled={loading}>
              <RotateCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {inventoryValuation.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => generateAnalyticsPDF(inventoryValuation)}>
                <FileText className="mr-1.5 h-3.5 w-3.5 text-red-500" />
                Export PDF
              </Button>
            )}
          </div>
        </div>

        {inventoryValuation.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* KPI 1 */}
            <Card className="border-l-4 border-l-primary shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/5">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total Valuation</div>
                  <div className="text-xl font-bold text-primary">{formatCurrency(totalValue)}</div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2 */}
            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-50">
                  <Package className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total Stock Units</div>
                  <div className="text-xl font-bold text-emerald-600">{totalQty.toLocaleString()} Units</div>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">
                  {inventoryValuation.length} unique items
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Table/Data Card */}
        <Card className="shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : inventoryValuation.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="py-2 font-semibold">Item</TableHead>
                    <TableHead className="py-2 font-semibold">Total Qty</TableHead>
                    <TableHead className="py-2 font-semibold">Avg Cost Price</TableHead>
                    <TableHead className="py-2 font-semibold text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryValuation.map((item, index) => (
                    <TableRow key={index} className="hover:bg-muted/30 even:bg-muted/10">
                      <TableCell className="py-1.5 font-medium">{item.itemName}</TableCell>
                      <TableCell className="py-1.5">{item.totalQty}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground">{formatCurrency(item.avgCostPrice)}</TableCell>
                      <TableCell className="py-1.5 text-right font-semibold text-primary">{formatCurrency(item.totalValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No valuation data available.</p>
            </div>
          )}
        </Card>
      </div>
    </ERPLayout>
  )
}
