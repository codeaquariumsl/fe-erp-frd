"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { CalendarIcon, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CustomerSelect } from "@/components/customer/customer-select"
import {
    customerReturnsApi,
    customersApi,
    returnTypesApi,
    locationsApi,
    storesApi,
    itemsApi,
    unitsCrudApi,
    invoicesApi,
    apiRequestWithLocation,
    type CustomerReturn,
    type Customer,
    type ReturnType,
    type Location,
    type Store,
    type Item,
    type Unit,
    type CustomerReturnItem,
    type Invoice,
    type InvoiceItem
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface CreateCustomerReturnFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function CreateCustomerReturnForm({ open, onOpenChange, onSuccess }: CreateCustomerReturnFormProps) {
    const { toast } = useToast()
    const [formData, setFormData] = useState<Partial<CustomerReturn>>({
        customerId: 0,
        returnTypeId: 0,
        reason: "",
        notes: "",
        locationId: 0,
        storeId: 0,
        items: [],
        currency: "LKR",
        returnDate: new Date().toISOString()
    })

    const [customers, setCustomers] = useState<Customer[]>([])
    const [returnTypes, setReturnTypes] = useState<ReturnType[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [stores, setStores] = useState<Store[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
    const [loading, setLoading] = useState(false)
    const [showItemForm, setShowItemForm] = useState(false)
    const [remainingQtyData, setRemainingQtyData] = useState<Record<number, {
        originalQty: number; returnedQty: number; remainingQty: number;
    }>>({}) // keyed by itemId
    const [loadingRemainingQty, setLoadingRemainingQty] = useState(false)

    // Derived values for tax calculation
    const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId)
    const isTaxInvoice = selectedInvoice?.isTaxInvoice || false
    const currentTaxRate = selectedInvoice?.taxRate || 18

    // New item form state
    const [newItem, setNewItem] = useState<Partial<CustomerReturnItem>>({
        itemId: 0,
        quantity: 0,
        unitPrice: 0,
        discount: 0,
        totalPrice: 0,
        unitId: 0,
        condition: "Good",
        reason: "",
        disposition: "Refund",
        isRefundable: true
    })

    useEffect(() => {
        if (open) {
            fetchMasterData()
        } else {
            resetForm()
        }
    }, [open])

    useEffect(() => {
        if (formData.customerId) {
            fetchCustomerInvoices(formData.customerId)
        } else {
            setInvoices([])
            setInvoiceItems([])
        }
    }, [formData.customerId])

    const fetchCustomerInvoices = async (customerId: number) => {
        try {
            const data = await invoicesApi.getByCustomerId(customerId)
            setInvoices(data)
        } catch (error) {
            console.error("Error fetching customer invoices:", error)
        }
    }

    const fetchRemainingQty = async (invoiceId: number) => {
        try {
            setLoadingRemainingQty(true)
            const data = await customerReturnsApi.getInvoiceRemainingQty(invoiceId)
            const map: Record<number, { originalQty: number; returnedQty: number; remainingQty: number }> = {}
                ; (data.items || []).forEach(item => {
                    map[item.itemId] = {
                        originalQty: item.originalQty,
                        returnedQty: item.returnedQty,
                        remainingQty: item.remainingQty
                    }
                })
            setRemainingQtyData(map)
        } catch (error) {
            console.error("Error fetching remaining qty:", error)
            setRemainingQtyData({})
        } finally {
            setLoadingRemainingQty(false)
        }
    }

    const fetchUnits = async () => {
        try {
            const crudData = await unitsCrudApi.getAll<Unit>()
            return Array.isArray(crudData) ? crudData.filter((unit: Unit) => unit.isActive) : []
        } catch (error) {
            console.error("Error fetching units:", error)
            return []
        }
    }

    const fetchMasterData = async () => {
        try {
            const [customersData, returnTypesData, locationsData, itemsData, unitsData] = await Promise.all([
                customersApi.getAll(),
                returnTypesApi.getActive(),
                locationsApi.getAll(),
                itemsApi.getAll(),
                fetchUnits(),
            ])

            setCustomers(customersData as Customer[])
            setReturnTypes(returnTypesData as ReturnType[])
            setLocations(locationsData as Location[])

            const itemsArray = Array.isArray(itemsData)
                ? itemsData
                : (itemsData && typeof itemsData === 'object' && 'data' in (itemsData as any))
                    ? (itemsData as any).data
                    : (itemsData && typeof itemsData === 'object' && 'items' in (itemsData as any))
                        ? (itemsData as any).items
                        : []

            setItems(itemsArray as Item[])
            setUnits(unitsData as Unit[])

        } catch (error) {
            console.error("Error fetching master data:", error)
        }
    }

    // Effect to fetch stores for the selected location
    useEffect(() => {
        const fetchLocationStores = async (locId: number) => {
            try {
                // storesApi.getAll() only returns stores for the logged-in location.
                // We use apiRequestWithLocation to fetch for the specifically selected location.
                const response = await apiRequestWithLocation<any>('/stores', String(locId))

                // Manual unwrap for raw apiRequest response
                const data = (response && typeof response === 'object' && 'data' in response)
                    ? response.data
                    : response;

                setStores(Array.isArray(data) ? data : [])
            } catch (error) {
                console.error("Error fetching location stores:", error)
                setStores([])
            }
        }

        if (formData.locationId) {
            fetchLocationStores(formData.locationId)
        } else {
            setStores([])
        }
    }, [formData.locationId])

    const handleSubmit = async () => {
        try {
            setLoading(true)

            if (!formData.customerId || !formData.invoiceId || !formData.returnTypeId || !formData.locationId || !formData.storeId) {
                toast({
                    title: "Validation Error",
                    description: "Please fill in all required fields",
                    variant: "destructive",
                })
                return
            }

            if (!formData.items || formData.items.length === 0) {
                toast({
                    title: "Validation Error",
                    description: "Please add at least one item to return",
                    variant: "destructive",
                })
                return
            }

            const payload: any = {
                ...formData,
                totalAmount: calculateTotal(),
                subTotal: parseFloat(calculateSubtotalBeforeDiscount().toFixed(2)),
                taxAmount: parseFloat(calculateTax().toFixed(2)),
                taxRate: currentTaxRate,
                discountAmount: parseFloat(calculateDiscountTotal().toFixed(2)),
                isTaxReturn: isTaxInvoice,
            }

            await customerReturnsApi.create(payload)
            toast({
                title: "Success",
                description: "Customer return created successfully",
            })

            onSuccess()
            onOpenChange(false)
            resetForm()
        } catch (error: any) {
            console.error("Error creating customer return:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to create customer return",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            customerId: undefined,
            returnTypeId: undefined,
            reason: "",
            notes: "",
            locationId: undefined,
            storeId: undefined,
            items: [],
            currency: "LKR",
            returnDate: new Date().toISOString()
        })
        setInvoices([])
        setSelectedInvoiceId(null)
        setInvoiceItems([])
        setRemainingQtyData({})
        resetNewItemForm()
        setShowItemForm(false)
    }

    const handleAddItem = () => {
        if (!newItem.itemId || !newItem.quantity || !newItem.unitPrice || !newItem.condition) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required item fields",
                variant: "destructive",
            })
            return
        }

        if (selectedInvoiceId && newItem.itemId) {
            const remData = remainingQtyData[newItem.itemId]
            if (remData !== undefined) {
                // Already-added qty in this form session for same item
                const alreadyAddedQty = (formData.items || [])
                    .filter(i => i.itemId === newItem.itemId)
                    .reduce((sum, item) => sum + item.quantity, 0)
                const effectiveRemaining = Math.max(0, remData.remainingQty - alreadyAddedQty)
                if ((newItem.quantity || 0) > effectiveRemaining) {
                    toast({
                        title: "Validation Error",
                        description: `Quantity (${newItem.quantity}) exceeds remaining returnable qty (${effectiveRemaining.toFixed(3)}) for this item. Already returned: ${remData.returnedQty.toFixed(3)} of ${remData.originalQty.toFixed(3)}.`,
                        variant: "destructive",
                    })
                    return
                }
                if (effectiveRemaining <= 0) {
                    toast({
                        title: "Validation Error",
                        description: `This item has been fully returned already (${remData.returnedQty.toFixed(3)} / ${remData.originalQty.toFixed(3)}).`,
                        variant: "destructive",
                    })
                    return
                }
            }
        }

        const originalUnitPrice = newItem.unitPrice || 0
        const discPerc = newItem.discount || 0
        const qty = newItem.quantity || 0

        const inclTotalBeforeDisc = qty * originalUnitPrice
        const discAmountIncl = inclTotalBeforeDisc * (discPerc / 100)

        // Final Total Rounded to 2 decimals
        const totalPriceRounded = parseFloat((inclTotalBeforeDisc - discAmountIncl).toFixed(2))

        const itemExclTotal = isTaxInvoice ? totalPriceRounded / (1 + currentTaxRate / 100) : totalPriceRounded
        const itemTaxAmount = totalPriceRounded - itemExclTotal

        const itemToAdd: CustomerReturnItem = {
            itemId: newItem.itemId!,
            quantity: qty,
            unitPrice: originalUnitPrice,
            discount: discPerc,
            totalPrice: totalPriceRounded,
            taxAmount: parseFloat(itemTaxAmount.toFixed(2)),
            excludingTaxAmount: parseFloat(itemExclTotal.toFixed(2)),
            unitId: newItem.unitId!,
            condition: newItem.condition as any || "Good",
            reason: newItem.reason || "",
            disposition: newItem.disposition as any || "Refund",
            isRefundable: newItem.isRefundable || false,
            refundAmount: newItem.isRefundable ? totalPriceRounded : 0,
            item: items.find(item => item.id === newItem.itemId)
        }

        setFormData(prev => ({
            ...prev,
            items: [...(prev.items || []), itemToAdd]
        }))

        resetNewItemForm()
        setShowItemForm(false)
    }

    const resetNewItemForm = () => {
        setNewItem({
            itemId: 0,
            quantity: 0,
            unitPrice: 0,
            discount: 0,
            totalPrice: 0,
            unitId: 0,
            condition: "Good",
            reason: "",
            disposition: "Refund",
            isRefundable: true
        })
    }

    const handleRemoveItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items?.filter((_, i) => i !== index) || []
        }))
    }

    const calculateSubtotalBeforeDiscount = () => {
        return (formData.items || []).reduce((sum, item) => {
            const originalPrice = item.unitPrice || 0
            const inclTotalBeforeDisc = (item.quantity || 0) * originalPrice
            const exclTotalBeforeDisc = isTaxInvoice ? inclTotalBeforeDisc / (1 + currentTaxRate / 100) : inclTotalBeforeDisc
            return sum + parseFloat(exclTotalBeforeDisc.toFixed(2))
        }, 0)
    }

    const calculateDiscountTotal = () => {
        return (formData.items || []).reduce((sum, item) => {
            const originalPrice = item.unitPrice || 0
            const inclTotalBeforeDisc = (item.quantity || 0) * originalPrice
            const discAmountIncl = inclTotalBeforeDisc * ((item.discount || 0) / 100)
            const exclDisc = isTaxInvoice ? discAmountIncl / (1 + currentTaxRate / 100) : discAmountIncl
            return sum + parseFloat(exclDisc.toFixed(2))
        }, 0)
    }

    const calculateSubtotal = () => {
        // This is Subtotal AFTER discount (Excl. Tax)
        return (formData.items || []).reduce((sum, item) => sum + (item.excludingTaxAmount || 0), 0)
    }

    const calculateTax = () => {
        if (!isTaxInvoice) return 0
        return (formData.items || []).reduce((sum, item) => sum + (item.taxAmount || 0), 0)
    }

    const calculateTotal = () => {
        return (formData.items || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Customer Return</DialogTitle>
                    <DialogDescription>Create a new customer return note</DialogDescription>
                </DialogHeader>

                <div className="grid gap-2 py-2">
                    <Card>
                        <CardHeader className="py-2">
                            <CardTitle className="text-base">General Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Return Date <span className="text-red-500">*</span></Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !formData.returnDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {formData.returnDate ? format(new Date(formData.returnDate), "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={formData.returnDate ? new Date(formData.returnDate) : undefined}
                                                onSelect={(date) => setFormData(prev => ({ ...prev, returnDate: date?.toISOString() }))}
                                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customer">Customer <span className="text-red-500">*</span></Label>
                                    <CustomerSelect
                                        customers={customers}
                                        value={formData.customerId || 0}
                                        onValueChange={(id) => setFormData(prev => ({ ...prev, customerId: id }))}
                                        placeholder="Select customer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invoice">Invoice <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={selectedInvoiceId?.toString() || ""}
                                        onValueChange={(value) => {
                                            if (!value) {
                                                setSelectedInvoiceId(null)
                                                setInvoiceItems([])
                                                setRemainingQtyData({})
                                                setFormData(prev => ({ ...prev, invoiceId: undefined }))
                                            } else {
                                                const id = parseInt(value)
                                                setSelectedInvoiceId(id)
                                                const inv = invoices.find(i => i.id === id)
                                                setInvoiceItems(inv?.items || [])
                                                setFormData(prev => ({ ...prev, invoiceId: id, items: [] }))
                                                fetchRemainingQty(id)
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select invoice" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {invoices.map((inv) => (
                                                <SelectItem key={inv.id} value={inv.id?.toString() || ""}>
                                                    {inv.invoiceNumber} — {Number(inv.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({new Date(inv.invoiceDate).toLocaleDateString()})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="returnType">Return Type <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={formData.returnTypeId?.toString() || undefined}
                                        onValueChange={(id) => setFormData(prev => ({ ...prev, returnTypeId: parseInt(id) }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select return type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {returnTypes.map((type) => (
                                                <SelectItem key={type.id} value={type.id.toString()}>
                                                    {type.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="location">Location <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={formData.locationId?.toString() || undefined}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, locationId: parseInt(value), storeId: undefined }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {locations.map((loc) => (
                                                <SelectItem key={loc.id} value={loc.id.toString()}>
                                                    {loc.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="store">Store <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={formData.storeId?.toString() || undefined}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, storeId: parseInt(value) }))}
                                        disabled={!formData.locationId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={formData.locationId ? "Select store" : "Select location first"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stores
                                                .filter(s => s.locationId === formData.locationId)
                                                .map((s) => (
                                                    <SelectItem key={s.id} value={s.id.toString()}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>


                                <div className="space-y-2 col-span-3">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Input
                                        id="notes"
                                        placeholder="Additional observations or notes"
                                        value={formData.notes || ""}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-base">Return Items</CardTitle>
                            {!showItemForm && (
                                <Button size="sm" onClick={() => setShowItemForm(true)}>
                                    <Plus className="h-4 w-4 mr-1" /> Add Item
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {showItemForm && (
                                <div className="p-4 border rounded-md bg-muted/30 mb-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label>Item <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={newItem.itemId?.toString() || ""}
                                                onValueChange={(value) => {
                                                    const itemId = parseInt(value)
                                                    let itemPrice = 0
                                                    let itemUnitId = 0
                                                    let itemDiscount = 0

                                                    if (selectedInvoiceId) {
                                                        const invItem = invoiceItems.find(i => i.itemId === itemId)
                                                        itemPrice = invItem?.price || 0
                                                        itemDiscount = invItem?.discount || 0
                                                        // Note: InvoiceItem might not have unitId directly in some schemas, 
                                                        // but we can try to find the item in global list for unitId if needed
                                                        const itemData = items.find(i => i.id === itemId)
                                                        itemUnitId = itemData?.unit ? units.find(u => u.name === itemData.unit)?.id || 0 : 0
                                                    } else {
                                                        const itemData = items.find(i => i.id === itemId)
                                                        itemPrice = itemData?.sellingPrice || 0
                                                        itemDiscount = 0
                                                        itemUnitId = itemData?.unit ? units.find(u => u.name === itemData.unit)?.id || 0 : 0
                                                    }

                                                    setNewItem(prev => ({
                                                        ...prev,
                                                        itemId: itemId,
                                                        unitPrice: itemPrice,
                                                        discount: itemDiscount,
                                                        unitId: itemUnitId
                                                    }))
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an item" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[300px]">
                                                    {selectedInvoiceId ? (
                                                        invoiceItems
                                                            .filter(invItem => {
                                                                // If we have remaining data, only show items with > 0 remaining
                                                                if (Object.keys(remainingQtyData).length > 0) {
                                                                    const rd = remainingQtyData[invItem.itemId]
                                                                    if (!rd) return true // no data yet, show all
                                                                    const alreadyAdded = (formData.items || []).filter(i => i.itemId === invItem.itemId).reduce((s, i) => s + i.quantity, 0)
                                                                    return (rd.remainingQty - alreadyAdded) > 0
                                                                }
                                                                return true
                                                            })
                                                            .map((invItem) => {
                                                                const rd = remainingQtyData[invItem.itemId]
                                                                const alreadyAdded = (formData.items || []).filter(i => i.itemId === invItem.itemId).reduce((s, i) => s + i.quantity, 0)
                                                                const remQty = rd ? Math.max(0, rd.remainingQty - alreadyAdded) : invItem.qty
                                                                return (
                                                                    <SelectItem key={invItem.itemId} value={invItem.itemId.toString()}>
                                                                        <div className="flex flex-col">
                                                                            <span>{invItem.item?.name}</span>
                                                                            <span className="text-[10px] text-muted-foreground">
                                                                                Inv Qty: {invItem.qty} | Price: {Number(invItem.price).toLocaleString()} {rd ? ` | Rem: ${remQty.toFixed(2)}` : ""}
                                                                            </span>
                                                                        </div>
                                                                    </SelectItem>
                                                                )
                                                            })
                                                    ) : (
                                                        items.map((i) => (
                                                            <SelectItem key={i.id} value={i.id.toString()}>
                                                                <div className="flex flex-col">
                                                                    <span>{i.name}</span>
                                                                    <span className="text-[10px] text-muted-foreground">SKU: {i.sku} | Price: {Number(i.sellingPrice).toLocaleString()}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2 col-span-1">
                                            <Label>Quantity <span className="text-red-500">*</span></Label>
                                            <Input
                                                type="number"
                                                value={newItem.quantity || ""}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0
                                                    if (selectedInvoiceId && newItem.itemId) {
                                                        const rd = remainingQtyData[newItem.itemId]
                                                        if (rd) {
                                                            const alreadyAdded = (formData.items || [])
                                                                .filter(i => i.itemId === newItem.itemId)
                                                                .reduce((sum, item) => sum + item.quantity, 0)
                                                            const effectiveRem = Math.max(0, rd.remainingQty - alreadyAdded)
                                                            if (val > effectiveRem) {
                                                                toast({
                                                                    title: "Exceeds Remaining Qty",
                                                                    description: `Only ${effectiveRem.toFixed(3)} units can be returned for this item (${rd.returnedQty.toFixed(3)} already returned of ${rd.originalQty.toFixed(3)}).`,
                                                                    variant: "destructive"
                                                                })
                                                            }
                                                        }
                                                    }
                                                    setNewItem(prev => ({ ...prev, quantity: val }))
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2 col-span-1">
                                            <Label>Remaining Qty {loadingRemainingQty && <span className="text-xs text-blue-500">(loading…)</span>}</Label>
                                            {(() => {
                                                const rd = newItem.itemId ? remainingQtyData[newItem.itemId] : undefined
                                                const alreadyAdded = newItem.itemId ? (formData.items || []).filter(i => i.itemId === newItem.itemId).reduce((s, i) => s + i.quantity, 0) : 0
                                                const remQty = rd ? Math.max(0, rd.remainingQty - alreadyAdded) : (selectedInvoiceId ? (invoiceItems.find(i => i.itemId === newItem.itemId)?.qty || 0) : "-")
                                                const isFullyReturned = rd && remQty === 0
                                                return (
                                                    <Input
                                                        type="text"
                                                        disabled
                                                        className={`bg-muted font-medium ${isFullyReturned ? 'text-red-500' : rd ? 'text-orange-600' : ''}`}
                                                        value={rd ? `${(remQty as number).toFixed(3)} / ${rd.originalQty.toFixed(3)}` : remQty}
                                                    />
                                                )
                                            })()}
                                        </div>

                                        <div className="space-y-2 col-span-1">
                                            <Label>Unit Price (Incl)</Label>
                                            <Input
                                                type="number"
                                                disabled
                                                className="bg-muted"
                                                value={newItem.unitPrice || ""}
                                            />
                                        </div>

                                        <div className="space-y-2 col-span-1">
                                            <Label>Discount (%)</Label>
                                            <Input
                                                type="text"
                                                disabled
                                                className="bg-muted"
                                                value={newItem.discount || 0}
                                            />
                                        </div>

                                        <div className="space-y-2 col-span-1">
                                            <Label>Row Total (Incl)</Label>
                                            <Input
                                                type="text"
                                                disabled
                                                className="bg-muted font-bold text-emerald-600"
                                                value={((newItem.quantity || 0) * (newItem.unitPrice || 0) * (1 - (newItem.discount || 0) / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            />
                                        </div>

                                        {isTaxInvoice && (
                                            <>
                                                <div className="space-y-2 col-span-1">
                                                    <Label>Rate (Tax Excl)</Label>
                                                    <Input
                                                        type="text"
                                                        disabled
                                                        className="bg-muted text-blue-600"
                                                        value={(() => {
                                                            const discountedIncl = (newItem.unitPrice || 0) * (1 - (newItem.discount || 0) / 100)
                                                            return (discountedIncl / (1 + currentTaxRate / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                        })()}
                                                    />
                                                </div>
                                                <div className="space-y-2 col-span-1">
                                                    <Label>Total (Excl)</Label>
                                                    <Input
                                                        type="text"
                                                        disabled
                                                        className="bg-muted font-bold text-blue-600"
                                                        value={(() => {
                                                            const discountedIncl = (newItem.unitPrice || 0) * (1 - (newItem.discount || 0) / 100)
                                                            const totalExcl = (newItem.quantity || 0) * (discountedIncl / (1 + currentTaxRate / 100))
                                                            return totalExcl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                        })()}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div className="space-y-2 col-span-1">
                                            <Label>Remarks / Reason</Label>
                                            <Input
                                                placeholder="Enter reason for this item"
                                                value={newItem.reason || ""}
                                                onChange={(e) => setNewItem(prev => ({ ...prev, reason: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setShowItemForm(false)}>Cancel</Button>
                                        <Button size="sm" onClick={handleAddItem}>Add to Return</Button>
                                    </div>
                                </div>
                            )}

                            <div className="border rounded-md">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-gray-100">
                                            <TableHead className="py-2">Item</TableHead>
                                            <TableHead className="py-2 text-right">Qty</TableHead>
                                            <TableHead className="py-2 text-right">Unit Price</TableHead>
                                            <TableHead className="py-2 text-right">Disc %</TableHead>
                                            {isTaxInvoice && <TableHead className="py-2 text-right">Tax</TableHead>}
                                            <TableHead className="py-2 text-right">Total (Incl)</TableHead>
                                            <TableHead className="py-2"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {formData.items?.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="py-1">
                                                    <p className="font-medium">{item.item?.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{item.item?.sku}</p>
                                                </TableCell>
                                                <TableCell className="py-1 text-right">{item.quantity.toFixed(2)}</TableCell>
                                                <TableCell className="py-1 text-right">{item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell className="py-1 text-right">{item.discount || 0}%</TableCell>
                                                {isTaxInvoice && (
                                                    <TableCell className="py-1 text-right text-muted-foreground">
                                                        {item.taxAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                )}
                                                <TableCell className="py-1 text-right font-medium">
                                                    {item.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="py-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveItem(idx)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!formData.items || formData.items.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={isTaxInvoice ? 7 : 6} className="text-center text-muted-foreground py-6">
                                                    No items added yet. Click 'Add Item' to start.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="mt-4 flex flex-col items-end space-y-1.5 pr-2">
                                <div className="flex justify-between w-64 text-sm">
                                    <span className="text-muted-foreground">Subtotal (Excl. Tax):</span>
                                    <span>LKR {calculateSubtotalBeforeDiscount().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between w-64 text-sm">
                                    <span className="text-muted-foreground">Discount (Excl. Tax):</span>
                                    <span>LKR {calculateDiscountTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {isTaxInvoice && (
                                    <div className="flex justify-between w-64 text-sm text-blue-600">
                                        <span>Tax ({currentTaxRate}%):</span>
                                        <span>LKR {calculateTax().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="flex justify-between w-72 border-t pt-1.5">
                                    <span className="font-bold">Total (Incl. Tax):</span>
                                    <span className="font-bold text-lg text-emerald-600">
                                        LKR {calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Creating..." : "Create Return Note"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
