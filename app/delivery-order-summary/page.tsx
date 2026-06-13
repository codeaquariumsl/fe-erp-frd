"use client"

import { useEffect, useState, useCallback } from "react"
import { routesApi, storesApi, deliveryOrderSummaryItemsApi } from "@/lib/api"
import { toastr } from "@/lib/toastr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Truck, MapPin, Clock, CheckCircle, AlertTriangle, Package, FileText, BarChart3, Loader2, Printer } from "lucide-react"
import { format } from "date-fns"
import jsPDF from "jspdf"
import { ERPLayout } from "@/components/layouts/erp-layout"

export default function DeliveryOrderSummaryPage() {
    // State for filters
    const [filters, setFilters] = useState({
        routeId: "",
        date: format(new Date(), "yyyy-MM-dd"),
    })

    // State for data
    const [summaryData, setSummaryData] = useState<any>(null)
    const [routes, setRoutes] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // State for stores and confirmations
    const [stores, setStores] = useState<any[]>([])
    const [storeDetails, setStoreDetails] = useState<{ [key: string]: any }>({}) // Store detailed info with stock
    const [selectedStores, setSelectedStores] = useState<{ [key: string]: string }>({})
    const [confirmedItems, setConfirmedItems] = useState<Set<string>>(new Set())
    const [confirmLoading, setConfirmLoading] = useState<Set<string>>(new Set())

    // State for summary items from API
    const [summaryItems, setSummaryItems] = useState<any[]>([])
    const [loadingSummaryItems, setLoadingSummaryItems] = useState(false)

    // Load routes and stores on component mount
    useEffect(() => {
        Promise.all([
            routesApi.getAll(),
            storesApi.getAll()
        ])
            .then(([routesData, storesData]) => {
                setRoutes(routesData)
                setStores(storesData)
            })
            .catch((err) => console.error("Failed to load data:", err.message))
    }, [])

    // Fetch summary data
    const handleFetchSummary = async () => {
        if (!filters.routeId) {
            setError("Please select a route")
            return
        }

        setLoading(true)
        setError("")

        try {
            const data = await deliveryOrderSummaryItemsApi.getByFilter({
                routeId: Number(filters.routeId),
                summaryDate: filters.date,
            })
            setSummaryData(data)
        } catch (err: any) {
            setError(err.message || "Failed to fetch delivery order summary")
        } finally {
            setLoading(false)
        }
    }

    // Fetch summary items from API
    const fetchSummaryItems = useCallback(async () => {
        if (!filters.routeId || !filters.date) return

        setLoadingSummaryItems(true)
        try {
            const response = await deliveryOrderSummaryItemsApi.getByFilter({
                summaryDate: filters.date,
                routeId: Number(filters.routeId),
                page: 1,
                limit: 100
            }) as any
            setSummaryItems(response.items || [])
        } catch (error) {
            console.error("Failed to fetch summary items:", error)
        } finally {
            setLoadingSummaryItems(false)
        }
    }, [filters.routeId, filters.date])

    // Auto-fetch when filters change and route is selected
    useEffect(() => {
        if (filters.routeId && filters.date) {
            handleFetchSummary()
            fetchSummaryItems()
        }
    }, [filters.routeId, filters.date, fetchSummaryItems])

    // Fetch detailed store information with stock
    const fetchStoreDetails = async (storeId: string) => {
        // if (storeDetails[storeId]) return storeDetails[storeId] // Return cached data

        try {
            const storeDetail = await storesApi.getById(storeId)
            setStoreDetails(prev => ({
                ...prev,
                [storeId]: storeDetail
            }))
            return storeDetail
        } catch (error) {
            console.error("Failed to fetch store details:", error)
            return null
        }
    }

    // Handle store selection for item
    const handleStoreSelect = async (itemKey: string, storeId: string) => {
        setSelectedStores(prev => ({
            ...prev,
            [itemKey]: storeId
        }))

        // Fetch store details with stock information
        await fetchStoreDetails(storeId)
    }

    // Handle item confirmation
    const handleConfirmItem = async (itemKey: string, itemName: string) => {
        const selectedStore = selectedStores[itemKey]

        if (!selectedStore) {
            toastr.warning("Please select a loading store before confirming the item.")
            return
        }

        setConfirmLoading(prev => new Set(prev).add(itemKey))

        try {
            // Extract item info from itemKey (format: "item-{index}")
            const itemIndex = parseInt(itemKey.split('-')[1])
            const item = summaryData?.items[itemIndex]

            if (!item) {
                throw new Error("Item not found")
            }

            // Update release info for all related summary items for this item
            if (item.assignedGrnItems && item.assignedGrnItems.length > 0) {
                // Get summary items for this item from the backend
                const summaryItemsForItem = await deliveryOrderSummaryItemsApi.getByFilter({
                    summaryDate: filters.date,
                    routeId: Number(filters.routeId)
                }) as any

                // Filter to get only items for the current item
                const relevantSummaryItems = summaryItemsForItem.items?.filter((si: any) =>
                    si.itemId === item.itemId
                ) || []

                if (relevantSummaryItems.length > 0) {
                    // Bulk update all summary items for this item
                    await deliveryOrderSummaryItemsApi.bulkUpdate({
                        summaryItemIds: relevantSummaryItems.map((si: any) => si.id),
                        isReleased: true,
                        releaseStoreId: Number(selectedStore),
                        user: { id: 1 } // TODO: Get actual user ID from auth context
                    })
                }
            }

            setConfirmedItems(prev => new Set(prev).add(itemKey))

            // Refresh summary items
            await fetchSummaryItems()

        } catch (error) {
            console.error("Failed to confirm item:", error)
            toastr.error("Failed to confirm item loading. Please try again.")
        } finally {
            setConfirmLoading(prev => {
                const newSet = new Set(prev)
                newSet.delete(itemKey)
                return newSet
            })
        }
    }

    // Handle confirmation for individual summary items
    const handleConfirmSummaryItem = async (summaryItemId: number, itemName: string, index: number) => {
        const selectedStore = selectedStores[`item-${index}`]

        if (!selectedStore) {
            toastr.warning("Please select a loading store before confirming the item.")
            return
        }

        setConfirmLoading(prev => new Set(prev).add(`item-${index}`))

        try {
            // Update release info for this specific summary item
            await deliveryOrderSummaryItemsApi.updateRelease(summaryItemId, {
                releaseStoreId: Number(selectedStore),
                isReleased: true,
                user: { id: 1 } // TODO: Get actual user ID from auth context
            })
            // Fetch store details with stock information
            await fetchStoreDetails(selectedStore)

            setConfirmedItems(prev => new Set(prev).add(`item-${index}`))

            // Refresh the summary data
            await handleFetchSummary()

        } catch (error) {
            console.error("Failed to confirm summary item:", error)
            toastr.error("Failed to confirm item loading. Please try again.")
        } finally {
            setConfirmLoading(prev => {
                const newSet = new Set(prev)
                newSet.delete(`item-${index}`)
                return newSet
            })
        }
    }

    // Check if item is confirmed by checking summary items
    const isItemConfirmed = (itemIndex: number) => {
        const item = summaryData?.items[itemIndex]
        if (!item) return false

        // Check if any summary items for this item are released
        return summaryItems.some((si: any) =>
            si.itemId === item.itemId && si.isReleased
        )
    }

    // Get release store for item
    const getItemReleaseStore = (itemIndex: number) => {
        const item = summaryData?.items[itemIndex]
        if (!item) return null

        // Find first released summary item for this item
        const releasedSummaryItem = summaryItems.find((si: any) =>
            si.itemId === item.itemId && si.isReleased && si.releaseStoreId
        )

        if (releasedSummaryItem) {
            const store = stores.find(s => s.id === releasedSummaryItem.releaseStoreId)
            return store?.name || `Store ${releasedSummaryItem.releaseStoreId}`
        }

        return null
    }

    // Check if selected store can fulfill the item quantity
    const canStoreFullfillItem = (itemIndex: number) => {
        const selectedStoreId = selectedStores[`item-${itemIndex}`]
        if (!selectedStoreId) return false

        const storeDetail = storeDetails[selectedStoreId]
        if (!storeDetail || !storeDetail.stocks) return false

        const summaryItem = summaryData?.items[itemIndex]
        if (!summaryItem) return false

        // Find stock for this item in the selected store
        const stockItem = storeDetail.stocks.find((stock: any) =>
            stock.itemId === summaryItem.itemId
        )

        if (!stockItem) return false

        return stockItem.availableQty >= summaryItem.qty
    }

    // Get stock availability information for display
    const getStockAvailability = (itemIndex: number) => {
        const selectedStoreId = selectedStores[`item-${itemIndex}`]
        if (!selectedStoreId) return null

        const storeDetail = storeDetails[selectedStoreId]
        if (!storeDetail || !storeDetail.stocks) return null

        const summaryItem = summaryData?.items[itemIndex]
        if (!summaryItem) return null

        // Find stock for this item in the selected store
        const stockItem = storeDetail.stocks.find((stock: any) =>
            stock.itemId === summaryItem.itemId
        )

        return {
            available: stockItem?.availableQty || 0,
            required: summaryItem.qty,
            canFulfill: stockItem ? stockItem.availableQty >= summaryItem.qty : false,
            hasStock: !!stockItem
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Scheduled":
                return <Badge className="bg-blue-600">Scheduled</Badge>
            case "In Transit":
                return <Badge className="bg-yellow-600">In Transit</Badge>
            case "Delivered":
                return <Badge className="bg-green-600">Delivered</Badge>
            case "Pending":
                return <Badge variant="outline">Pending</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Scheduled":
                return <Clock className="h-4 w-4 text-blue-500" />
            case "In Transit":
                return <Truck className="h-4 w-4 text-yellow-500" />
            case "Delivered":
                return <CheckCircle className="h-4 w-4 text-green-500" />
            case "Pending":
                return <AlertTriangle className="h-4 w-4 text-orange-500" />
            default:
                return <Clock className="h-4 w-4 text-gray-500" />
        }
    }

    const handlePrintSummary = () => {
        if (!summaryData) return

        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.width
        const pageHeight = doc.internal.pageSize.height

        // Colors
        const primaryColor: [number, number, number] = [37, 99, 235]
        const grayColor: [number, number, number] = [156, 163, 175]
        const lightGrayColor: [number, number, number] = [243, 244, 246]
        const successColor: [number, number, number] = [34, 197, 94]

        // Header Section
        doc.setFillColor(...primaryColor)
        doc.rect(0, 0, pageWidth, 30, 'F')

        // Company Name
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text('CODE AQUA ERP (PVT) LTD', 20, 20)

        // Document title
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text('Delivery Order Summary', pageWidth - 20, 20, { align: 'right' })

        let yPos = 50
        doc.setTextColor(0, 0, 0)

        // Summary Filters Section
        doc.setFillColor(...lightGrayColor)
        doc.rect(20, yPos - 5, pageWidth - 40, 25, 'F')
        doc.setDrawColor(...grayColor)
        doc.rect(20, yPos - 5, pageWidth - 40, 25, 'S')

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('FILTERS APPLIED', 25, yPos + 5)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        // Filter details
        const routeForPrint = routes.find(r => r.id === Number(filters.routeId))

        const filterText = [
            routeForPrint ? `Route: ${routeForPrint.routeName}` : '',
            filters.date ? `Summary Date: ${filters.date}` : ''
        ].filter(Boolean).join(' | ') || 'No filters applied'

        doc.text(filterText, 25, yPos + 15)

        yPos += 35

        // Summary Statistics
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('DELIVERY STATISTICS', 25, yPos)
        yPos += 15

        // Stats grid
        const stats = [
            { label: 'Total Items to Deliver', value: summaryData.summary.totalItems || 0 },
            { label: 'Total Delivery Orders', value: summaryData.summary.totalDeliveryOrders || 0 },
            { label: 'Items Can Fulfill', value: summaryData.summary.itemsCanFulfill || 0 },
            { label: 'Items with Shortage', value: summaryData.summary.itemsWithShortage || 0 }
        ]

        const statCols = 4
        const statColWidth = (pageWidth - 40) / statCols

        stats.forEach((stat, index) => {
            const col = index % statCols
            const row = Math.floor(index / statCols)
            const x = 20 + col * statColWidth
            const y = yPos + row * 20

            // Stat box
            doc.setFillColor(248, 250, 252)
            doc.rect(x, y - 3, statColWidth - 5, 15, 'F')
            doc.setDrawColor(...grayColor)
            doc.rect(x, y - 3, statColWidth - 5, 15, 'S')

            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(stat.label, x + 5, y + 4)

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(14)
            doc.text(String(stat.value), x + 5, y + 10)
        })

        yPos += 30

        // Items Table
        if (summaryData.items && summaryData.items.length > 0) {
            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.text('ITEMS TO DELIVER FOR ROUTE', 25, yPos)
            yPos += 15

            // Table headers
            const headers = ['Item Name', 'Wanted Qty', 'Available Qty', 'Status', 'Assigned GRNs']
            const colWidths = [45, 25, 25, 25, 60]
            const colX = [20, 65, 90, 115, 140]

            // Header background
            doc.setFillColor(...primaryColor)
            doc.rect(20, yPos - 2, pageWidth - 40, 12, 'F')

            // Header text
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            headers.forEach((header, index) => {
                doc.text(header, colX[index], yPos + 6)
            })

            yPos += 12
            doc.setTextColor(0, 0, 0)

            // Table rows
            summaryData.items.forEach((item: any, index: number) => {
                // Check if we need a new page
                if (yPos > pageHeight - 40) {
                    doc.addPage()
                    yPos = 30
                }

                // Alternate row colors - highlight shortage items in red
                if (index % 2 === 0) {
                    doc.setFillColor(248, 250, 252)
                    doc.rect(20, yPos - 2, pageWidth - 40, 12, 'F')
                }
                if (!item.canFulfill) {
                    doc.setFillColor(254, 242, 242) // Red background for shortage items
                    doc.rect(20, yPos - 2, pageWidth - 40, 12, 'F')
                }

                doc.setFontSize(8)
                doc.setFont('helvetica', 'normal')

                // Item name
                doc.text(item.itemName || 'N/A', colX[0], yPos + 6)

                // Wanted quantity
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(10)
                doc.setTextColor(...primaryColor)
                doc.text(String(item.totalWantedQty || 0), colX[1], yPos + 6)
                doc.setTextColor(0, 0, 0)

                // Available quantity
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(8)
                const availableColor: [number, number, number] = item.totalAvailableQty >= item.totalWantedQty ? [34, 197, 94] : [239, 68, 68] // Green or Red
                doc.setTextColor(...availableColor)
                doc.text(String(item.totalAvailableQty || 0), colX[2], yPos + 6)
                doc.setTextColor(0, 0, 0)

                // Status
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(7)
                if (item.canFulfill) {
                    doc.setTextColor(34, 197, 94) // Green
                    doc.text('CAN FULFILL', colX[3], yPos + 6)
                } else {
                    doc.setTextColor(239, 68, 68) // Red
                    doc.text('SHORTAGE', colX[3], yPos + 4)
                    doc.text(`-${item.shortageQty || 0}`, colX[3], yPos + 8)
                }
                doc.setTextColor(0, 0, 0)

                // Assigned GRN numbers
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(7)
                if (item.assignedGrnItems && item.assignedGrnItems.length > 0) {
                    const grnText = item.assignedGrnItems.map((grn: any) => `${grn.grnNumber}(${grn.assignedQty})`).join(', ')
                    const splitText = doc.splitTextToSize(grnText, colWidths[4] - 3)
                    doc.text(splitText, colX[4], yPos + 6)
                } else {
                    doc.setTextColor(...grayColor)
                    doc.text('No GRN assigned', colX[4], yPos + 6)
                    doc.setTextColor(0, 0, 0)
                }

                yPos += 14
            })
        } else {
            doc.setFontSize(12)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(...grayColor)
            doc.text('No items found matching the criteria', 25, yPos)
        }

        // Instructions for Stock Keeper Section
        yPos += 25

        // Check if we have enough space for instructions, if not start a new page
        if (yPos > pageHeight - 100) {
            doc.addPage()
            yPos = 30
        }

        // Instructions Header
        // doc.setFillColor(255, 243, 205) // Yellow background similar to UI
        // doc.rect(20, yPos - 5, pageWidth - 40, 15, 'F')
        // doc.setDrawColor(245, 158, 11) // Yellow border
        // doc.rect(20, yPos - 5, pageWidth - 40, 15, 'S')

        // doc.setFontSize(12)
        // doc.setFont('helvetica', 'bold')
        // doc.setTextColor(146, 64, 14) // Dark yellow/brown color
        // doc.text('INSTRUCTIONS FOR STOCK KEEPER', 25, yPos + 5)

        // yPos += 25
        // doc.setTextColor(0, 0, 0)

        // // Instructions List
        // const instructions = [
        //     'Check the wanted quantity for each item as listed above',
        //     'Release items ONLY from the assigned GRN numbers shown in the table',
        //     'For items with "Shortage" status, release only the available quantity',
        //     'Items marked as "Can Fulfill" should be released in full quantity',
        //     'Verify all items against this list before releasing to driver',
        //     'Report any discrepancies immediately to the warehouse supervisor'
        // ]

        // doc.setFontSize(10)
        // doc.setFont('helvetica', 'normal')

        // instructions.forEach((instruction, index) => {
        //     // Check if we need a new page
        //     if (yPos > pageHeight - 30) {
        //         doc.addPage()
        //         yPos = 30
        //     }

        //     // Number and instruction
        //     doc.setFont('helvetica', 'bold')
        //     doc.text(`${index + 1}.`, 25, yPos)

        //     doc.setFont('helvetica', 'normal')
        //     // Split long instructions into multiple lines if needed
        //     const maxWidth = pageWidth - 50
        //     const lines = doc.splitTextToSize(instruction, maxWidth)

        //     lines.forEach((line: string, lineIndex: number) => {
        //         doc.text(line, 35, yPos + (lineIndex * 5))
        //     })

        //     yPos += Math.max(lines.length * 5, 8) + 2
        // })

        yPos += 10

        // Footer
        const footerY = pageHeight - 20
        doc.setDrawColor(...grayColor)
        doc.line(20, footerY, pageWidth - 20, footerY)

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...grayColor)
        doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 25, footerY + 10)

        // Save the PDF
        const fileName = `DeliveryOrderSummary_${routeForPrint?.routeName || 'Route'}_${filters.date || format(new Date(), 'yyyyMMdd')}.pdf`
        doc.save(fileName)
    }

    return (
        <ERPLayout>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Delivery Order Summary</h1>
                        <p className="text-muted-foreground">Comprehensive view of delivery orders and items by route</p>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    {/* <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader> */}
                    <CardContent>
                        <div className="grid grid-cols-5 gap-4 mt-2">
                            <div>
                                <Label htmlFor="date">Summary Date *</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={filters.date}
                                    onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <Label htmlFor="route">Route *</Label>
                                <Select
                                    value={filters.routeId}
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, routeId: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a route" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {routes.map((route) => (
                                            <SelectItem key={route.id} value={String(route.id)}>
                                                {route.routeName || route.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={handleFetchSummary}
                                    disabled={loading || !filters.routeId}
                                    className="w-full"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            <BarChart3 className="h-4 w-4 mr-2" />
                                            Generate Summary
                                        </>
                                    )}
                                </Button>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={handlePrintSummary}
                                    disabled={!summaryData}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print PDF
                                </Button>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 text-red-600 bg-red-50 p-3 rounded-lg">
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {summaryData && (
                    <>
                        {/* Summary Statistics */}
                        {/* <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <Card className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{summaryData.summary.totalItems}</div>
                            <div className="text-sm text-gray-600">Total Items</div>
                        </Card>
                        <Card className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{summaryData.summary.totalDeliveryOrders}</div>
                            <div className="text-sm text-gray-600">Delivery Orders</div>
                        </Card>
                        <Card className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{summaryData.summary.itemsCanFulfill}</div>
                            <div className="text-sm text-gray-600">Can Fulfill</div>
                        </Card>

                        <Card className="p-4 text-center">
                            <div className="text-xl font-bold text-blue-600">{summaryData.summary.totalWantedQty}</div>
                            <div className="text-sm text-gray-600">Total Wanted Qty</div>
                        </Card>
                        <Card className="p-4 text-center">
                            <div className="text-xl font-bold text-green-600">{summaryData.summary.totalAvailableQty}</div>
                            <div className="text-sm text-gray-600">Total Available Qty</div>
                        </Card>
                        <Card className="p-4 text-center">
                            <div className="text-xl font-bold text-red-600">{summaryData.summary.totalShortageQty}</div>
                            <div className="text-sm text-gray-600">Total Shortage Qty</div>
                        </Card>
                    </div> */}

                        {/* Route Information */}
                        {filters.routeId && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Selected Route Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {(() => {
                                        const selectedRoute = routes.find(r => r.id === Number(filters.routeId))
                                        return selectedRoute ? (
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <span className="font-medium text-gray-700">Route Name:</span>
                                                        <div className="text-gray-900">{selectedRoute.routeName || selectedRoute.name}</div>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">Route Code:</span>
                                                        <div className="text-gray-900">{selectedRoute.routeCode || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">City:</span>
                                                        <div className="text-gray-900">{selectedRoute.city || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">Distance:</span>
                                                        <div className="text-gray-900">{selectedRoute.distanceKm || 'N/A'} km</div>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">Estimate Time:</span>
                                                        <div className="text-gray-900">{selectedRoute.estimateTime || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">Status:</span>
                                                        <br />
                                                        <Badge variant={selectedRoute.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                                            {selectedRoute.status || 'N/A'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">Route details not available</p>
                                        )
                                    })()}
                                </CardContent>
                            </Card>
                        )}

                        {/* Summary Items Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Summary Items ({summaryData.totalItems || 0})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item Name</TableHead>
                                            <TableHead>Delivery Order</TableHead>
                                            <TableHead>GRN</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead>Release Status</TableHead>
                                            {/* <TableHead>Loading Store</TableHead>
                                            <TableHead>Action</TableHead> */}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summaryData.items && summaryData.items.map((summaryItem: any, index: number) => (
                                            <TableRow key={summaryItem.id || index}>
                                                <TableCell className="font-medium">
                                                    {summaryItem.Item?.color + ' ' + summaryItem.Item?.name + ' ' + summaryItem.Item?.country || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <span className="font-medium text-blue-600">
                                                            {summaryItem.DeliveryOrder?.doNumber || 'N/A'}
                                                        </span>
                                                        <div className="text-gray-600 text-xs">
                                                            DO Item Qty: {summaryItem.DeliveryOrderItem?.qty || 0}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm bg-blue-100 p-1 rounded inline-block">
                                                        <span className="font-medium">{summaryItem.GRN?.grnNumber || 'N/A'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-semibold text-blue-600">
                                                    {summaryItem.qty}
                                                </TableCell>
                                                <TableCell>
                                                    {summaryItem.isReleased ? (
                                                        <Badge className="bg-green-600">Released</Badge>
                                                    ) : (
                                                        <Badge variant="outline">Not Released</Badge>
                                                    )}
                                                </TableCell>
                                                {/* <TableCell>
                                                    {summaryItem.isReleased && summaryItem.releaseStoreId ? (
                                                        <span className="text-sm">
                                                            {stores.find(s => s.id === summaryItem.releaseStoreId)?.name || `Store ${summaryItem.releaseStoreId}`}
                                                        </span>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <Select
                                                                value={selectedStores[`item-${index}`] || ""}
                                                                onValueChange={(value) => handleStoreSelect(`item-${index}`, value)}
                                                                disabled={summaryItem.isReleased}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select store" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {stores.map((store) => (
                                                                        <SelectItem key={store.id} value={String(store.id)}>
                                                                            {store.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>

                                                         
                                                            {selectedStores[`item-${index}`] && (() => {
                                                                const stockInfo = getStockAvailability(index)
                                                                if (!stockInfo) return null

                                                                return (
                                                                    <div className="text-xs">
                                                                        {stockInfo.hasStock ? (
                                                                            <div className={`p-2 rounded ${stockInfo.canFulfill ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                                                <div className="font-medium">
                                                                                    Available: {stockInfo.available} | Required: {stockInfo.required}
                                                                                </div>
                                                                                {!stockInfo.canFulfill && (
                                                                                    <div className="text-red-600 font-medium">
                                                                                        ⚠️ Insufficient stock! Short by {stockInfo.required - stockInfo.available}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="p-2 rounded bg-gray-50 text-gray-600">
                                                                                No stock available for this item
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })()}
                                                        </div>
                                                    )}
                                                </TableCell> */}
                                                {/* <TableCell>
                                                    {summaryItem.isReleased ? (
                                                        <Badge className="bg-green-600">Confirmed</Badge>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleConfirmSummaryItem(summaryItem.id, summaryItem.Item?.name || 'Item', index)}
                                                                disabled={
                                                                    confirmLoading.has(`item-${index}`) ||
                                                                    !selectedStores[`item-${index}`] ||
                                                                    !canStoreFullfillItem(index)
                                                                }
                                                                className="h-8 text-xs w-full"
                                                            >
                                                                {confirmLoading.has(`item-${index}`) ? "..." : "Confirm"}
                                                            </Button>

                                                           Show warning if store selected but can't fulfill 
                                                            {selectedStores[`item-${index}`] && !canStoreFullfillItem(index) && (
                                                                <div className="text-xs text-red-600 text-center">
                                                                    Cannot confirm: Insufficient stock
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell> */}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                            </CardContent>
                        </Card>

                        {/* Filter Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Summary Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium">Route ID:</span> {summaryData.filter?.routeId || filters.routeId}
                                    </div>
                                    <div>
                                        <span className="font-medium">Summary Date:</span> {summaryData.filter?.summaryDate || filters.date}
                                    </div>
                                    <div>
                                        <span className="font-medium">Total Items:</span> {summaryData.totalItems || 0}
                                    </div>
                                    <div>
                                        <span className="font-medium">Current Page:</span> {summaryData.currentPage || 1} of {summaryData.totalPages || 1}
                                    </div>
                                    <div>
                                        <span className="font-medium">Last Updated:</span> {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
                                    </div>
                                    <div>
                                        <span className="font-medium">Selected Route:</span> {routes.find(r => r.id === Number(filters.routeId))?.routeName || 'N/A'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {!summaryData && !loading && !error && (
                    <Card>
                        <CardContent className="text-center py-8">
                            <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p className="text-gray-500">Select a route and date to view the delivery order summary</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </ERPLayout>
    )
}
