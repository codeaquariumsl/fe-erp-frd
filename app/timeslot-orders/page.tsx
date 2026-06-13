"use client"

import { useState, useEffect, useMemo } from "react"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { deliveryOrdersApi } from "@/lib/api"
import { toastr } from "@/lib/toastr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
    Truck,
    Package,
    Eye,
    CheckCircle,
    Clock,
    Search,
    FileText,
    MapPin,
    Calendar,
    CalendarIcon,
    Download,
    Printer
} from "lucide-react"
import { format } from "date-fns"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface TimeslotGroup {
    timeslot: string
    isCurrentTimeslot: boolean
    isPastTimeslot: boolean
    isFutureTimeslot: boolean
    deliveryOrders: Array<{
        id: number
        doNumber: string
        status: string
        deliveryDate: string
        deliveryAddress: string
        salesOrder: {
            id: number
            orderNumber: string
            isDelivery: boolean
            dispatchDate: string
            timeslot: string
        }
        customer: any
        route: {
            id: number
            routeName: string
            city: string
        }
        driver: {
            id: number
            name: string
            mobile: string
        }
        vehicle: {
            id: number
            vehicleNumber: string
            vehicleType: string
        }
        items: Array<{
            id: number
            itemId: number
            qty: number
            isReady: boolean
            isReleased: boolean
            item: {
                id: number
                name: string
                color: string
                country: string
                sku: string
                unit: string
                weight: number
                category: {
                    id: number
                    name: string
                }
            }
            grn: any
            deliveryOrderSummary: {
                id: number
                code: string
                dateTime: string
            }
        }>
        totalQuantity: number
    }>
    items: Array<{
        id: number
        itemId: number
        qty: number
        isReady: boolean
        isReleased: boolean
        item: {
            id: number
            name: string
            color: string
            country: string
            sku: string
            unit: string
            weight: number
            category: {
                id: number
                name: string
            }
        }
        grn: any
        deliveryOrderSummary: {
            id: number
            code: string
            dateTime: string
        }
    }>
    summary: {
        totalDeliveryOrders: number
        totalItems: number
        totalQuantity: number
        uniqueItems: number
        routes: number
        drivers: number
        vehicles: number
    }
}

interface ApiResponse {
    filter: {
        date: string
        currentTime: string
    }
    summary: {
        totalTimeslots: number
        totalDeliveryOrders: number
        totalItems: number
        totalQuantity: number
        currentTimeslot: string | null
        currentTime: string
        date: string
        timeslotBreakdown: Array<{
            timeslot: string
            isCurrentTimeslot: boolean
            isPastTimeslot: boolean
            isFutureTimeslot: boolean
            deliveryOrdersCount: number
            itemsCount: number
            quantity: number
        }>
    }
    timeslotGroups: TimeslotGroup[]
    message?: string
}

// Helper function to set color in jsPDF
type RGB = readonly [number, number, number]
const setJsPDFColor = (color: RGB) => ({ rgb: color.map(c => c/255) })

export default function TimeslotOrdersPage() {
    // Main state
    const [timeslotGroups, setTimeslotGroups] = useState<TimeslotGroup[]>([])
    const [summaryData, setSummaryData] = useState<ApiResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // View dialog state
    const [viewDialogOpen, setViewDialogOpen] = useState(false)
    const [selectedTimeslotGroup, setSelectedTimeslotGroup] = useState<TimeslotGroup | null>(null)
    const [selectedGRNs, setSelectedGRNs] = useState<{ [itemId: number]: string }>({})

    // Load delivery order summaries
    const loadSummaries = async () => {
        setLoading(true)
        setError("")
        try {
            const response = await deliveryOrdersApi.getSummaryItemsTimeslot({
                date: selectedDate,
                currentTime: new Date().toTimeString().slice(0, 5) // HH:MM format
            }) as ApiResponse

            if (response.message) {
                // No data found case
                setTimeslotGroups([])
                setSummaryData(response)
            } else {
                setTimeslotGroups(response.timeslotGroups || [])
                setSummaryData(response)
            }
        } catch (err: any) {
            setError(err.message || "Failed to load delivery order summaries")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadSummaries()
    }, [selectedDate])

    // Generate PDF for timeslot group
    const generateTimeslotPDF = (timeslotGroup: TimeslotGroup) => {
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.width
        const pageHeight = doc.internal.pageSize.height
        let currentY = 20

        type RGB = readonly [number, number, number]

        // Modern color scheme - as RGB triplets
        const primaryColor: RGB = [59, 130, 246]
        const secondaryColor: RGB = [99, 102, 241]
        const accentColor: RGB = [16, 185, 129]
        const grayColor: RGB = [107, 114, 128]
        const lightGrayColor: RGB = [249, 250, 251]

        // Helper function to set color in jsPDF
        const setJsPDFColor = (color: RGB) => ({ rgb: color.map(c => c/255) })

        // Helper function to add header
        const addHeader = () => {
            // Company header with gradient effect
            const primaryRGB = setColor(primaryColor).rgb
            doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2])
            doc.rect(0, 0, pageWidth, 35, 'F')

            // Company name
            doc.setTextColor(1, 1, 1)
            doc.setFontSize(22)
            doc.setFont('helvetica', 'bold')
            doc.text('CODE AQUA ERP (PVT) LTD ERP', 15, 20)

            // Document title
            doc.setFontSize(12)
            doc.setFont('helvetica', 'normal')
            doc.text('Dispatched Orders - Timeslot Report', 15, 28)

            // Date and time
            const currentDateTime = new Date().toLocaleString()
            doc.setFontSize(10)
            doc.text(`Generated: ${currentDateTime}`, pageWidth - 70, 20)
            doc.text(`Date: ${selectedDate}`, pageWidth - 70, 28)

            return 45
        }

        // Helper function to add footer
        const addFooter = (pageNum: number, totalPages: number) => {
            const grayRGB = setColor(grayColor).rgb
            doc.setTextColor(grayRGB[0], grayRGB[1], grayRGB[2])
            doc.setFontSize(8)
            doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 30, pageHeight - 10)
            doc.text('Code Aqua ERP Solutions ERP System', 15, pageHeight - 10)
        }

        currentY = addHeader()

        // Timeslot information box
        const lightGrayRGB = setColor(lightGrayColor).rgb
        doc.setFillColor(lightGrayRGB[0], lightGrayRGB[1], lightGrayRGB[2])
        doc.rect(15, currentY, pageWidth - 30, 35, 'F')
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.rect(15, currentY, pageWidth - 30, 35, 'S')

        // Timeslot details
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(`Timeslot: ${timeslotGroup.timeslot}`, 20, currentY + 12)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        // Status badge
        let statusText = 'Pending'
        let statusColor: readonly [number, number, number] = grayColor
        if (timeslotGroup.isCurrentTimeslot) {
            statusText = 'Current'
            statusColor = [251, 146, 60] as const // Orange-400
        } else if (timeslotGroup.isPastTimeslot) {
            statusText = 'Past'
            statusColor = grayColor
        } else if (timeslotGroup.isFutureTimeslot) {
            statusText = 'Future'
            statusColor = primaryColor // Blue-500
        }

        const statusRGB = setColor(statusColor).rgb
        doc.setFillColor(statusRGB[0], statusRGB[1], statusRGB[2])
        doc.rect(20, currentY + 18, 25, 8, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(statusText, 22, currentY + 24)

        // Summary statistics
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const summaryStartX = 55
        doc.text(`Delivery Orders: ${timeslotGroup.summary.totalDeliveryOrders}`, summaryStartX, currentY + 20)
        doc.text(`Total Items: ${timeslotGroup.summary.totalItems}`, summaryStartX, currentY + 26)
        doc.text(`Total Quantity: ${timeslotGroup.summary.totalQuantity}`, summaryStartX + 60, currentY + 20)
        doc.text(`Routes: ${timeslotGroup.summary.routes}`, summaryStartX + 60, currentY + 26)
        doc.text(`Drivers: ${timeslotGroup.summary.drivers}`, summaryStartX + 110, currentY + 20)
        doc.text(`Vehicles: ${timeslotGroup.summary.vehicles}`, summaryStartX + 110, currentY + 26)

        currentY += 50

        // Delivery Orders section
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
        doc.text('Delivery Orders', 15, currentY)
        currentY += 8

        const deliveryOrdersData = timeslotGroup.deliveryOrders.map((order, index) => [
            (index + 1).toString(),
            order.doNumber,
            order.salesOrder.isDelivery ? 'Delivery' : 'Pickup',
            order.route?.routeName || 'N/A',
            order.driver?.name || 'N/A',
            order.vehicle?.vehicleNumber || 'N/A',
            order.status
        ])

        autoTable(doc, {
            startY: currentY,
            head: [['#', 'DO Number', 'Type', 'Route', 'Driver', 'Vehicle', 'Status']],
            body: deliveryOrdersData,
            headStyles: {
                fillColor: setColor(primaryColor).rgb as [number, number, number],
                textColor: [1, 1, 1],
                fontSize: 9,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [0, 0, 0]
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 25 },
                2: { cellWidth: 20 },
                3: { cellWidth: 30 },
                4: { cellWidth: 30 },
                5: { cellWidth: 25 },
                6: { cellWidth: 20 }
            },
            margin: { left: 15, right: 15 },
            theme: 'grid'
        })

        currentY = (doc as any).lastAutoTable.finalY + 15

        // Items section with grouping
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
        doc.text('Items & GRN Assignment', 15, currentY)
        currentY += 8

        // Group items by itemId and merge quantities
        const groupedItems = timeslotGroup.items.reduce((acc, item) => {
            const itemKey = item.itemId.toString();

            if (acc[itemKey]) {
                acc[itemKey].totalQty += item.qty;
                acc[itemKey].deliveryOrderSummaries.push(item.deliveryOrderSummary);
            } else {
                acc[itemKey] = {
                    item: item.item,
                    totalQty: item.qty,
                    deliveryOrderSummaries: [item.deliveryOrderSummary],
                    grn: item.grn,
                    isReady: item.isReady,
                    isReleased: item.isReleased
                };
            }

            return acc;
        }, {} as Record<string, any>);

        const itemsData = Object.values(groupedItems).map((groupedItem: any, index) => {
            const itemName = `${groupedItem.item.color} ${groupedItem.item.name} ${groupedItem.item.country} (${groupedItem.item.weight}kg)`;
            const deliveryOrders = groupedItem.deliveryOrderSummaries.map((summary: any) => summary.code).join(', ');
            const grnStatus = groupedItem.grn ? `GRN ${groupedItem.grn.id}` : 'No GRN';
            let status = 'Pending';
            if (groupedItem.isReleased) status = 'Dispatched';
            else if (groupedItem.isReady) status = 'Ready';

            return [
                (index + 1).toString(),
                itemName,
                groupedItem.item.sku,
                deliveryOrders,
                `${groupedItem.totalQty} ${groupedItem.item.unit}`,
                grnStatus,
                status
            ];
        });

        autoTable(doc, {
            startY: currentY,
            head: [['#', 'Item', 'SKU', 'Delivery Orders', 'Qty', 'GRN', 'Status']],
            body: itemsData,
            headStyles: {
                fillColor: setColor(accentColor).rgb as [number, number, number],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [0, 0, 0]
            },
            alternateRowStyles: {
                fillColor: [236, 253, 245] // Emerald-50
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 50 },
                2: { cellWidth: 25 },
                3: { cellWidth: 35 },
                4: { cellWidth: 20, halign: 'center' },
                5: { cellWidth: 25 },
                6: { cellWidth: 20, halign: 'center' }
            },
            margin: { left: 15, right: 15 },
            theme: 'grid'
        })

        // Footer
        addFooter(1, 1)

        // Add summary box at the bottom
        const finalY = (doc as any).lastAutoTable.finalY + 15
        if (finalY < pageHeight - 50) {
            doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
            doc.rect(15, finalY, pageWidth - 30, 25, 'F')

            doc.setTextColor(255, 255, 255)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text('Summary', 20, finalY + 8)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.text(`Total Unique Items: ${Object.keys(groupedItems).length}`, 20, finalY + 15)
            doc.text(`Total Quantity: ${timeslotGroup.summary.totalQuantity}`, 80, finalY + 15)
            doc.text(`Total Orders: ${timeslotGroup.summary.totalDeliveryOrders}`, 140, finalY + 15)

            const allReady = timeslotGroup.items.every(item => item.isReady)
            const allReleased = timeslotGroup.items.every(item => item.isReleased)
            let overallStatus = 'Pending'
            if (allReleased) overallStatus = 'Dispatched'
            else if (allReady) overallStatus = 'Ready'

            doc.text(`Status: ${overallStatus}`, 20, finalY + 20)
        }

        // Save PDF
        const fileName = `Dispatched-Orders-${timeslotGroup.timeslot.replace(':', '-')}-${selectedDate}.pdf`
        doc.save(fileName)
    }

    // Generate PDF for all timeslots
    const generateAllTimeslotsPDF = () => {
        if (!summaryData || timeslotGroups.length === 0) {
            toastr.error('No data available to generate PDF')
            return
        }

        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.width
        const pageHeight = doc.internal.pageSize.height

        // Modern color scheme
        const primaryColor = [59, 130, 246] // Blue-500
        const secondaryColor = [99, 102, 241] // Indigo-500
        const accentColor = [16, 185, 129] // Emerald-500
        const grayColor = [107, 114, 128] // Gray-500
        const lightGrayColor = [249, 250, 251] // Gray-50

        let currentY = 20

        // Header
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.rect(0, 0, pageWidth, 40, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(24)
        doc.setFont('helvetica', 'bold')
        doc.text('CODE AQUA ERP (PVT) LTD ERP', 15, 22)

        doc.setFontSize(14)
        doc.setFont('helvetica', 'normal')
        doc.text('Complete Dispatched Orders Report', 15, 32)

        const currentDateTime = new Date().toLocaleString()
        doc.setFontSize(10)
        doc.text(`Generated: ${currentDateTime}`, pageWidth - 70, 22)
        doc.text(`Date: ${selectedDate}`, pageWidth - 70, 30)

        currentY = 55

        // Overall summary
        doc.setFillColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2])
        doc.rect(15, currentY, pageWidth - 30, 30, 'F')
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.rect(15, currentY, pageWidth - 30, 30, 'S')

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Overall Summary', 20, currentY + 12)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Total Timeslots: ${summaryData.summary.totalTimeslots}`, 20, currentY + 20)
        doc.text(`Total Delivery Orders: ${summaryData.summary.totalDeliveryOrders}`, 80, currentY + 20)
        doc.text(`Total Items: ${summaryData.summary.totalItems}`, 140, currentY + 20)
        doc.text(`Total Quantity: ${summaryData.summary.totalQuantity}`, 20, currentY + 26)
        doc.text(`Current Time: ${summaryData.summary.currentTime}`, 80, currentY + 26)

        currentY += 45

        // Timeslots breakdown
        const timeslotData = timeslotGroups.map((group, index) => {
            let status = 'Pending'
            if (group.isCurrentTimeslot) status = 'Current'
            else if (group.isPastTimeslot) status = 'Past'
            else if (group.isFutureTimeslot) status = 'Future'

            return [
                (index + 1).toString(),
                group.timeslot,
                group.summary.totalDeliveryOrders.toString(),
                group.summary.totalItems.toString(),
                group.summary.totalQuantity.toString(),
                group.summary.routes.toString(),
                status
            ]
        })

        autoTable(doc, {
            startY: currentY,
            head: [['#', 'Timeslot', 'Orders', 'Items', 'Quantity', 'Routes', 'Status']],
            body: timeslotData,
            headStyles: {
                fillColor: setColor(primaryColor).rgb as [number, number, number],
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 9,
                textColor: [0, 0, 0]
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 25, halign: 'center' },
                5: { cellWidth: 20, halign: 'center' },
                6: { cellWidth: 25, halign: 'center' }
            },
            margin: { left: 15, right: 15 },
            theme: 'grid'
        })

        // Footer
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
        doc.setFontSize(8)
        doc.text('Page 1 of 1', pageWidth - 30, pageHeight - 10)
        doc.text('Code Aqua ERP Solutions ERP System', 15, pageHeight - 10)

        // Save PDF
        const fileName = `All-Dispatched-Orders-${selectedDate}.pdf`
        doc.save(fileName)
    }

    // Handle view timeslot group details
    const handleViewTimeslotGroup = (timeslotGroup: TimeslotGroup) => {
        setSelectedTimeslotGroup(timeslotGroup)
        setViewDialogOpen(true)

        // Initialize selected GRNs from existing data
        const initialGRNs: { [itemId: number]: string } = {}
        timeslotGroup.items.forEach(item => {
            if (item.grn) {
                initialGRNs[item.itemId] = String(item.grn.id)
            }
        })
        setSelectedGRNs(initialGRNs)
    }

    // Handle GRN selection for an item
    const handleGRNSelection = (itemId: number, grnId: string) => {
        setSelectedGRNs(prev => ({
            ...prev,
            [itemId]: grnId
        }))
    }

    // Handle dispatch action
    const handleDispatch = async () => {
        if (!selectedTimeslotGroup) return

        try {
            // For timeslot groups, we might need a different dispatch approach
            // This depends on your backend implementation
            const updateData = {
                timeslot: selectedTimeslotGroup.timeslot,
                items: selectedTimeslotGroup.items.map(item => ({
                    id: item.id,
                    grnId: selectedGRNs[item.itemId] ? Number(selectedGRNs[item.itemId]) : null
                }))
            }

            // Update the items with GRN assignments
            await deliveryOrdersApi.updateSummaryItems(updateData)
            console.log("Dispatching with data:", updateData)

            // Reload summaries
            await loadSummaries()
            setViewDialogOpen(false)

        } catch (err: any) {
            toastr.error(err.message || "Failed to dispatch items")
        }
    }

    // Check if all items have GRNs selected
    const canDispatch = selectedTimeslotGroup?.items.every(item =>
        selectedGRNs[item.itemId] || item.grn
    ) || false

    // Filter and paginate timeslot groups
    const { filteredTimeslotGroups, paginatedTimeslotGroups, getTotalPages } = useMemo(() => {
        // Filter timeslot groups based on search
        const filtered = timeslotGroups.filter(group =>
            group.timeslot.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.deliveryOrders.some(order =>
                order.doNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.route.routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())
            ) ||
            group.items.some(item =>
                item.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.item.sku.toLowerCase().includes(searchTerm.toLowerCase())
            )
        )

        // Calculate pagination
        const totalPages = Math.ceil(filtered.length / itemsPerPage)
        const startIndex = (currentPage - 1) * itemsPerPage
        const paginated = filtered.slice(startIndex, startIndex + itemsPerPage)

        return {
            filteredTimeslotGroups: filtered,
            paginatedTimeslotGroups: paginated,
            getTotalPages: () => totalPages
        }
    }, [timeslotGroups, searchTerm, currentPage, itemsPerPage])

    // Pagination Controls Component
    const PaginationControls = () => {
        const totalPages = getTotalPages()
        const startIndex = (currentPage - 1) * itemsPerPage + 1
        const endIndex = Math.min(currentPage * itemsPerPage, filteredTimeslotGroups.length)

        const getPageNumbers = () => {
            const pages = []
            const maxVisiblePages = 5
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

            if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1)
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i)
            }
            return pages
        }

        if (totalPages <= 1) return null

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                        Showing {startIndex} to {endIndex} of {filteredTimeslotGroups.length} entries
                        {filteredTimeslotGroups.length !== timeslotGroups.length && ` (filtered from ${timeslotGroups.length} total)`}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(value) => {
                                setItemsPerPage(Number(value))
                                setCurrentPage(1)
                            }}
                        >
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                        >
                            First
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Prev
                        </Button>

                        {getPageNumbers().map((pageNum) => (
                            <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                            >
                                {pageNum}
                            </Button>
                        ))}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            Last
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Get status badge for timeslot groups
    const getStatusBadge = (timeslotGroup: TimeslotGroup) => {
        const allReady = timeslotGroup.items.every(item => item.isReady)
        const allReleased = timeslotGroup.items.every(item => item.isReleased)

        if (allReleased) {
            return <Badge className="bg-green-600">Dispatched</Badge>
        } else if (timeslotGroup.isFutureTimeslot) {
            return <Badge className="bg-blue-600">Pending</Badge>
        } else if (timeslotGroup.isCurrentTimeslot) {
            return <Badge className="bg-orange-600">Current</Badge>
        } else if (timeslotGroup.isPastTimeslot) {
            return <Badge variant="outline">Past</Badge>
        } else {
            return <Badge variant="outline">Pending</Badge>
        }
    }

    return (
        <ERPLayout>
            <div className="space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Timeslot Orders</h1>
                        <p className="text-muted-foreground">Manage delivery orders organized by delivery timeslots</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-40"
                        />
                        <Button
                            onClick={generateAllTimeslotsPDF}
                            variant="outline"
                            disabled={loading || timeslotGroups.length === 0}
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export PDF
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Timeslots</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summaryData?.summary?.totalTimeslots || 0}</div>
                            <p className="text-xs text-muted-foreground">Active timeslots</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Delivery Orders</CardTitle>
                            <Truck className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summaryData?.summary?.totalDeliveryOrders || 0}</div>
                            <p className="text-xs text-muted-foreground">Total orders</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                            <Package className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summaryData?.summary?.totalItems || 0}</div>
                            <p className="text-xs text-muted-foreground">Items to dispatch</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                            <CheckCircle className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summaryData?.summary?.totalQuantity || 0}</div>
                            <p className="text-xs text-muted-foreground">Boxes to dispatch</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Timeslot Groups List */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Delivery Timeslots - {selectedDate}</CardTitle>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="Search timeslots..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 w-64"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">Loading timeslots...</div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-600">{error}</div>
                        ) : summaryData?.message ? (
                            <div className="text-center py-8 text-muted-foreground">{summaryData.message}</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Timeslot</TableHead>
                                        <TableHead>Delivery Orders</TableHead>
                                        <TableHead>Items</TableHead>
                                        <TableHead>Total Quantity</TableHead>
                                        <TableHead>Routes</TableHead>
                                        <TableHead>Drivers & Vehicles</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedTimeslotGroups.map((timeslotGroup) => (
                                        <TableRow key={timeslotGroup.timeslot}>
                                            <TableCell>
                                                <div className="font-medium text-lg">{timeslotGroup.timeslot}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {timeslotGroup.isCurrentTimeslot && "Current"}
                                                    {timeslotGroup.isPastTimeslot && "Past"}
                                                    {timeslotGroup.isFutureTimeslot && "Future"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{timeslotGroup.summary.totalDeliveryOrders}</div>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {timeslotGroup.deliveryOrders.slice(0, 3).map((order, idx) => (
                                                        <div key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                            {order.doNumber}
                                                        </div>
                                                    ))}
                                                    {timeslotGroup.deliveryOrders.length > 3 && (
                                                        <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                            +{timeslotGroup.deliveryOrders.length - 3} more
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{timeslotGroup.summary.totalItems}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {timeslotGroup.summary.uniqueItems} unique items
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{timeslotGroup.summary.totalQuantity}</div>
                                                <div className="text-sm text-muted-foreground">boxes</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{timeslotGroup.summary.routes}</div>
                                                <div className="text-sm text-muted-foreground">routes</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div>{timeslotGroup.summary.drivers} drivers</div>
                                                    <div>{timeslotGroup.summary.vehicles} vehicles</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(timeslotGroup)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewTimeslotGroup(timeslotGroup)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View Details
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => generateTimeslotPDF(timeslotGroup)}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                        PDF
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {!loading && !error && <PaginationControls />}
                    </CardContent>
                </Card>

                {/* View Timeslot Group Dialog */}
                <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                    <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Timeslot Details - {selectedTimeslotGroup?.timeslot}</DialogTitle>
                        </DialogHeader>

                        {selectedTimeslotGroup && (
                            <div className="space-y-2">
                                {/* Timeslot Info */}
                                <div className="grid grid-cols-4 gap-4 p-2 bg-gray-50 rounded-lg">
                                    <div>
                                        <Label className="text-sm font-medium">Timeslot</Label>
                                        <div className="text-lg font-bold">{selectedTimeslotGroup.timeslot}</div>
                                    </div>
                                    {/* <div>
                                        <Label className="text-sm font-medium">Status</Label>
                                        <div>
                                            {selectedTimeslotGroup.isCurrentTimeslot && "Current"}
                                            {selectedTimeslotGroup.isPastTimeslot && "Past"}
                                            {selectedTimeslotGroup.isFutureTimeslot && "Future"}
                                        </div>
                                    </div> */}
                                    <div>
                                        <Label className="text-sm font-medium">Total Items</Label>
                                        <div className="text-lg font-bold">{selectedTimeslotGroup.summary.totalItems}</div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Delivery Orders</Label>
                                        <div className="text-lg font-bold">{selectedTimeslotGroup.summary.totalDeliveryOrders}</div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Total Quantity</Label>
                                        <div className="text-lg font-bold">{selectedTimeslotGroup.summary.totalQuantity} Boxes</div>
                                    </div>
                                </div>

                                {/* Delivery Orders List */}
                                <div className="bg-blue-50 p-2 rounded-lg">
                                    <Label className="text-sm font-medium text-blue-800 mb-2 block">Included Delivery Orders</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                        {selectedTimeslotGroup.deliveryOrders.map((order, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded border">
                                                <div className="font-medium text-blue-800">{order.doNumber} {order.salesOrder.isDelivery ? "(Delivery)" : "(Pickup)"}</div>
                                                <div className="text-sm text-gray-600">
                                                    <div>Route: {order.route?.routeName}</div>
                                                    <div>Driver: {order.driver?.name}</div>
                                                    <div>Vehicle: {order.vehicle?.vehicleNumber}</div>
                                                    {/* <div>Status: {order.status}</div> */}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Items & GRN Assignment</h3>
                                    <div className="border rounded-lg">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-gray-50">
                                                    <TableHead className="w-2/8">Item</TableHead>
                                                    <TableHead className="w-2/8">Delivery Order Summaries</TableHead>
                                                    <TableHead className="w-2/8">GRN</TableHead>
                                                    <TableHead className="w-1/8">Qty by GRN</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="w-1/8">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(() => {
                                                    // Group items by itemId AND grnId combination
                                                    const groupedItems = selectedTimeslotGroup.items.reduce((acc, item) => {
                                                        // Create a composite key using both itemId and grnId
                                                        const grnId = item.grn ? item.grn.id : 'unassigned';
                                                        const compositeKey = `${item.itemId}-${grnId}`;

                                                        if (acc[compositeKey]) {
                                                            // Item with same itemId and GRN exists, merge quantities and summaries
                                                            acc[compositeKey].totalQty += item.qty;
                                                            acc[compositeKey].deliveryOrderSummaries.push(item.deliveryOrderSummary);
                                                            acc[compositeKey].itemInstances.push(item);
                                                        } else {
                                                            // New item or new GRN combination
                                                            acc[compositeKey] = {
                                                                item: item.item,
                                                                itemId: item.itemId,
                                                                totalQty: item.qty,
                                                                deliveryOrderSummaries: [item.deliveryOrderSummary],
                                                                itemInstances: [item],
                                                                grn: item.grn,
                                                                isReady: item.isReady,
                                                                isReleased: item.isReleased,
                                                                grnId: grnId
                                                            };
                                                        }

                                                        return acc;
                                                    }, {} as Record<string, any>);

                                                    // Convert to array and render
                                                    // Further group by itemId to get totals
                                                    const itemTotals = Object.values(groupedItems).reduce((acc, item: any) => {
                                                        if (!acc[item.itemId]) {
                                                            acc[item.itemId] = {
                                                                item: item.item,
                                                                total: 0
                                                            };
                                                        }
                                                        acc[item.itemId].total += item.totalQty;
                                                        return acc;
                                                    }, {} as Record<string, any>);

                                                    // Define the type for grouped items
                                                    interface GroupedItem {
                                                        item: {
                                                            color: string;
                                                            name: string;
                                                            country: string;
                                                            weight: number;
                                                            sku: string;
                                                            unit: string;
                                                            category: {
                                                                name: string;
                                                            };
                                                        };
                                                        itemId: number;
                                                        totalQty: number;
                                                        deliveryOrderSummaries: Array<any>;
                                                        itemInstances: Array<any>;
                                                        grn: any;
                                                        isReady: boolean;
                                                        isReleased: boolean;
                                                        grnId: string | number;
                                                    }

                                                    // Group the items by itemId for display
                                                    const groupedByItem = Object.values(groupedItems).reduce<Record<string, GroupedItem[]>>((acc, item: GroupedItem) => {
                                                        if (!acc[item.itemId]) {
                                                            acc[item.itemId] = [];
                                                        }
                                                        acc[item.itemId].push(item);
                                                        return acc;
                                                    }, {});

                                                    return Object.entries(groupedByItem).map(([itemId, items]: [string, GroupedItem[]]) => (
                                                        <TableRow key={itemId} className="group">
                                                            <TableCell>
                                                                <div className="font-medium">{items[0].item.color + ' ' + items[0].item.name + ' ' + items[0].item.country + ' (' + items[0].item.weight + 'kg)'}</div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {items[0].item.sku} • {items[0].item.category.name}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="space-y-1">
                                                                    {items.map((groupedItem) => (
                                                                        groupedItem.deliveryOrderSummaries.map((summary: any, idx: number) => (
                                                                            <div key={`${groupedItem.grnId}-${idx}`} className="flex items-center gap-2">
                                                                                <div className="font-medium text-xs bg-blue-50 px-2 py-1 rounded">
                                                                                    {summary.code}
                                                                                </div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    {format(new Date(summary.dateTime), "MMM dd, HH:mm")}
                                                                                </div>
                                                                                <div className="text-xs font-medium text-blue-600">
                                                                                    ({groupedItem.itemInstances[idx]?.qty} {items[0].item.unit})
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ))}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {items.map((groupedItem) => (
                                                                    <div key={groupedItem.grnId} className={groupedItem.grn ? "bg-green-50 p-2 rounded mb-1" : "bg-orange-50 p-2 rounded mb-1"}>
                                                                        <div className={groupedItem.grn ? "text-sm text-green-600" : "text-sm text-orange-800"}>
                                                                            {groupedItem.grn ? groupedItem.grn.grnNumber : "No GRN Assigned"}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </TableCell>
                                                            <TableCell>
                                                                {items.map((groupedItem) => (
                                                                    <div key={groupedItem.grnId} className="text-sm">
                                                                        <span className="font-medium text-blue-600">
                                                                            {groupedItem.totalQty} {items[0].item.unit}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </TableCell>
                                                            <TableCell>
                                                                {items.every(item => item.isReleased) ? (
                                                                    <Badge className="bg-green-600">Dispatched</Badge>
                                                                ) : items.every(item => item.isReady) ? (
                                                                    <Badge className="bg-blue-600">Ready</Badge>
                                                                ) : (
                                                                    <Badge variant="outline">Pending</Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-bold text-blue-700">
                                                                {itemTotals[itemId].total} {items[0].item.unit}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                })()}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-between gap-2 pt-4 border-t">
                                    <Button
                                        onClick={() => generateTimeslotPDF(selectedTimeslotGroup)}
                                        variant="outline"
                                        className="flex items-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Export PDF
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setViewDialogOpen(false)}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </ERPLayout>
    )
}
