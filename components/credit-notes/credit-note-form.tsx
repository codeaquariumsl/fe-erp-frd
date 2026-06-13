"use client"

import { useState, useEffect } from "react"
import { Customer, Item, CreditNoteItem, CreditNote, invoicesApi, Invoice } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { CustomerSelect } from "@/components/customer/customer-select"

interface CreditNoteFormProps {
    customers: Customer[]
    items: Item[]
    initialData?: CreditNote | null
    onSubmit: (data: any) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

export function CreditNoteForm({ customers, items, initialData, onSubmit, onCancel, isLoading }: CreditNoteFormProps) {
    const { toast } = useToast()
    const [selectedLocationId, setSelectedLocationId] = useState<number>(0)

    const [formData, setFormData] = useState({
        customerId: "",
        invoiceId: "",
        creditNoteDate: new Date().toISOString().split("T")[0],
        reason: "",
        isTaxCreditNote: false,
        taxRate: "0",
        notes: "",
    })

    const [creditNoteItems, setCreditNoteItems] = useState<Omit<CreditNoteItem, "id" | "creditNoteId" | "createdAt" | "updatedAt">[]>([])
    const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([])
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

    // UI State for new item input
    const [newItem, setNewItem] = useState({
        itemId: "",
        code: "",
        qty: "1",
        unitPrice: "0",
        discount: "0",
        isTaxItem: false,
        reason: "",
    })

    useEffect(() => {
        // Get location ID from localStorage
        const locationId = localStorage.getItem("selectedLocationId")
        if (locationId) {
            setSelectedLocationId(parseInt(locationId))
        }

        // Populate form if initialData is provided
        if (initialData) {
            setFormData({
                customerId: initialData.customerId.toString(),
                invoiceId: initialData.invoiceId ? initialData.invoiceId.toString() : "",
                creditNoteDate: new Date(initialData.creditNoteDate).toISOString().split("T")[0],
                reason: initialData.reason || "",
                isTaxCreditNote: initialData.isTaxCreditNote,
                taxRate: initialData.taxRate.toString(),
                notes: initialData.notes || "",
            })

            const existingItems = initialData.CreditNoteItems || initialData.items || []
            setCreditNoteItems(existingItems.map(item => ({
                itemId: item.itemId,
                code: item.code,
                qty: Number(item.qty),
                unitPrice: Number(item.unitPrice),
                discount: Number(item.discount),
                discountedAmount: Number(item.discountedAmount),
                isTaxItem: item.isTaxItem,
                taxAmount: Number(item.taxAmount),
                total: Number(item.total),
                reason: item.reason,
                Item: item.Item // Preserve item details for display
            })))
        }
    }, [initialData])

    useEffect(() => {
        if (formData.customerId) {
            const fetchInvoices = async () => {
                try {
                    const data = await invoicesApi.getByCustomerId(parseInt(formData.customerId))
                    setCustomerInvoices(Array.isArray(data) ? data : [])
                } catch (error) {
                    console.error("Error fetching invoices:", error)
                    toast({
                        title: "Error",
                        description: "Failed to load customer invoices",
                        variant: "destructive",
                    })
                }
            }
            fetchInvoices()
        } else {
            setCustomerInvoices([])
        }
    }, [formData.customerId])

    const handleInvoiceSelect = (invoiceId: string) => {
        setFormData({ ...formData, invoiceId })

        const invoice = customerInvoices.find(inv => inv.id?.toString() === invoiceId)
        setSelectedInvoice(invoice || null)

        if (invoice) {
            const isTax = invoice.isTaxInvoice || false
            setFormData(prev => ({
                ...prev,
                invoiceId,
                isTaxCreditNote: isTax,
            }))
        }
    }

    const handleAddItem = () => {
        if (!newItem.itemId || !newItem.qty || !newItem.unitPrice) {
            toast({ title: "Error", description: "Please fill in all required item fields", variant: "destructive" })
            return
        }

        const item = items.find(i => i.id.toString() === newItem.itemId)
        if (!item) {
            toast({ title: "Error", description: "Invalid item selected", variant: "destructive" })
            return
        }

        const qty = parseFloat(newItem.qty)
        const unitPrice = parseFloat(newItem.unitPrice)
        const discount = parseFloat(newItem.discount)

        const discountedAmount = qty * unitPrice * (1 - discount / 100)
        const taxAmount = newItem.isTaxItem && formData.isTaxCreditNote
            ? discountedAmount * (parseFloat(formData.taxRate) / 100)
            : 0
        const total = discountedAmount + taxAmount

        const creditNoteItem: Omit<CreditNoteItem, "id" | "creditNoteId" | "createdAt" | "updatedAt"> = {
            itemId: parseInt(newItem.itemId),
            code: newItem.code,
            qty,
            unitPrice,
            discount,
            discountedAmount,
            isTaxItem: newItem.isTaxItem,
            taxAmount,
            total,
            reason: newItem.reason,
            Item: item,
        }

        setCreditNoteItems([...creditNoteItems, creditNoteItem])
        setNewItem({
            itemId: "",
            code: "",
            qty: "1",
            unitPrice: "0",
            discount: "0",
            isTaxItem: false,
            reason: "",
        })
    }

    const handleRemoveItem = (index: number) => {
        setCreditNoteItems(creditNoteItems.filter((_, i) => i !== index))
    }

    const calculateSubtotal = () => {
        return creditNoteItems.reduce((sum, item) => sum + (item.discountedAmount || 0), 0)
    }

    const calculateTaxAmount = () => {
        if (!formData.isTaxCreditNote) return 0
        return creditNoteItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0)
    }

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTaxAmount()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.customerId) {
            toast({ title: "Error", description: "Please select a customer", variant: "destructive" })
            return
        }

        if (!formData.invoiceId) {
            toast({ title: "Error", description: "Please select an invoice", variant: "destructive" })
            return
        }

        if (creditNoteItems.length === 0) {
            toast({ title: "Error", description: "Please add at least one item", variant: "destructive" })
            return
        }

        // For new creation, validate location. For update, potentially reuse existing location or current context
        if (!initialData && !selectedLocationId) {
            toast({ title: "Error", description: "No location selected. Please select a location from settings.", variant: "destructive" })
            return
        }

        const submissionData = {
            ...formData,
            customerId: parseInt(formData.customerId),
            invoiceId: formData.invoiceId ? parseInt(formData.invoiceId) : undefined,
            taxRate: parseFloat(formData.taxRate),
            locationId: selectedLocationId,
            items: creditNoteItems.map(item => ({
                itemId: item.itemId,
                code: item.code,
                qty: item.qty,
                unitPrice: item.unitPrice,
                discount: item.discount,
                isTaxItem: item.isTaxItem,
                reason: item.reason,
            })),
        }

        await onSubmit(submissionData)
    }

    // Helper helper for currency display
    const formatCurrency = (val: number | undefined) => (val || 0).toFixed(2)

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Customer *</Label>
                    <CustomerSelect
                        customers={customers}
                        value={formData.customerId}
                        onValueChange={(id) => {
                            setFormData({ ...formData, customerId: id ? String(id) : "" })
                        }}
                        placeholder="Select customer"
                        showMainBadge={true}
                        className="w-full font-normal"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Invoice *</Label>
                    <Select
                        value={formData.invoiceId}
                        onValueChange={handleInvoiceSelect}
                        disabled={!formData.customerId}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select invoice" />
                        </SelectTrigger>
                        <SelectContent>
                            {customerInvoices.map(invoice => (
                                <SelectItem key={invoice.id} value={invoice.id?.toString() || ""}>
                                    {invoice.invoiceNumber} - {new Date(invoice.invoiceDate).toLocaleDateString()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                        type="date"
                        value={formData.creditNoteDate}
                        onChange={(e) => setFormData({ ...formData, creditNoteDate: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        placeholder="Enter reason"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center space-x-2 pt-8">
                        <Checkbox
                            id="isTaxCreditNote"
                            checked={formData.isTaxCreditNote}
                            onCheckedChange={(checked) =>
                                setFormData({ ...formData, isTaxCreditNote: checked as boolean })
                            }
                        />
                        <Label htmlFor="isTaxCreditNote" className="cursor-pointer">
                            Tax Credit Note
                        </Label>
                    </div>
                </div>

                {formData.isTaxCreditNote && (
                    <div className="space-y-2">
                        <Label>Tax Rate (%)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.taxRate}
                            onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                            placeholder="Enter tax rate"
                        />
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Enter notes"
                    rows={2}
                />
            </div>

            <div className="border rounded-md p-4 space-y-4">
                <h3 className="font-medium">Items</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                    <div className="col-span-1 md:col-span-2 space-y-1">
                        <Label className="text-xs">Item *</Label>
                        <Select
                            value={newItem.itemId}
                            onValueChange={(value) => {
                                const item = items.find(i => i.id.toString() === value)

                                // If invoice selected, find price from invoice items
                                let price = item?.sellingPrice.toString() || "0"
                                let discount = "0"
                                let isTaxItem = false

                                if (selectedInvoice) {
                                    const invoiceItem = selectedInvoice.items.find(invItem => invItem.itemId.toString() === value)
                                    if (invoiceItem) {
                                        price = (invoiceItem.price || 0).toString()
                                        discount = (invoiceItem.discount || 0).toString()
                                        isTaxItem = !!invoiceItem.isTaxItem
                                    }
                                }

                                setNewItem({
                                    ...newItem,
                                    itemId: value,
                                    unitPrice: price,
                                    discount: discount,
                                    isTaxItem: isTaxItem
                                })
                            }}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                                {(selectedInvoice
                                    ? items.filter(i => selectedInvoice.items.some(invItem => invItem.itemId === i.id))
                                    : items
                                ).map(item => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">Qty</Label>
                        <Input
                            className="h-8"
                            type="number"
                            step="0.01"
                            value={newItem.qty}
                            onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">Price</Label>
                        <Input
                            className="h-8"
                            type="number"
                            step="0.01"
                            value={newItem.unitPrice}
                            onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                            disabled={!!selectedInvoice}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">Disc %</Label>
                        <Input
                            className="h-8"
                            type="number"
                            step="0.01"
                            value={newItem.discount}
                            onChange={(e) => setNewItem({ ...newItem, discount: e.target.value })}
                            disabled={!!selectedInvoice}
                        />
                    </div>

                    <Button type="button" size="sm" onClick={handleAddItem}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="newItemTax"
                        checked={newItem.isTaxItem}
                        onCheckedChange={(checked) =>
                            setNewItem({ ...newItem, isTaxItem: checked as boolean })
                        }
                        disabled={!!selectedInvoice}
                    />
                    <Label htmlFor="newItemTax" className="cursor-pointer text-sm">
                        Taxable Item
                    </Label>
                </div>

                {creditNoteItems.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="py-2">Item</TableHead>
                                    <TableHead className="py-2">Qty</TableHead>
                                    <TableHead className="py-2">Price</TableHead>
                                    <TableHead className="py-2">Disc %</TableHead>
                                    <TableHead className="py-2">Total</TableHead>
                                    <TableHead className="py-2"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {creditNoteItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="py-2">{item.Item?.name}</TableCell>
                                        <TableCell className="py-2">{item.qty}</TableCell>
                                        <TableCell className="py-2">{formatCurrency(item.unitPrice)}</TableCell>
                                        <TableCell className="py-2">{item.discount}</TableCell>
                                        <TableCell className="py-2">{formatCurrency(item.total)}</TableCell>
                                        <TableCell className="py-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => handleRemoveItem(index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-end border-t pt-4">
                <div className="w-48 text-sm space-y-1">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    {formData.isTaxCreditNote && (
                        <div className="flex justify-between">
                            <span>Tax:</span>
                            <span className="font-medium">{formatCurrency(calculateTaxAmount())}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold border-t pt-1">
                        <span>Total:</span>
                        <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {initialData ? (isLoading ? "Updating..." : "Update Credit Note") : (isLoading ? "Creating..." : "Create Credit Note")}
                </Button>
            </div>
        </form>
    )
}
