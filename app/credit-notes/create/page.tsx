"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { creditNotesApi, customersApi, itemsApi, invoicesApi, Customer, Item, CreditNoteItem, CreateCreditNoteRequest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toastr } from "@/lib/toastr"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"

export default function CreateCreditNotePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [items, setItems] = useState<Item[]>([])
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
        loadData()
        // Get location ID from localStorage
        const locationId = localStorage.getItem("selectedLocationId")
        if (locationId) {
            setSelectedLocationId(parseInt(locationId))
        }
    }, [])

    const loadData = async () => {
        try {
            const [customersData, itemsData] = await Promise.all([
                customersApi.getAll(),
                itemsApi.getAll()
            ])
            setCustomers(Array.isArray(customersData) ? customersData : [])
            setItems(Array.isArray(itemsData) ? itemsData : [])
        } catch (error) {
            console.error("Error loading data:", error)
            toastr.error("Failed to load data")
        }
    }

    const handleAddItem = () => {
        if (!newItem.itemId || !newItem.qty || !newItem.unitPrice) {
            toastr.error("Please fill in all required item fields")
            return
        }

        const item = items.find(i => i.id.toString() === newItem.itemId)
        if (!item) {
            toastr.error("Invalid item selected")
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
            toastr.error("Please select a customer")
            return
        }

        if (creditNoteItems.length === 0) {
            toastr.error("Please add at least one item")
            return
        }

        if (!selectedLocationId) {
            toastr.error("No location selected. Please select a location from settings.")
            return
        }

        try {
            setLoading(true)

            const requestData: CreateCreditNoteRequest = {
                customerId: parseInt(formData.customerId),
                invoiceId: formData.invoiceId ? parseInt(formData.invoiceId) : undefined,
                creditNoteDate: formData.creditNoteDate,
                reason: formData.reason,
                isTaxCreditNote: formData.isTaxCreditNote,
                taxRate: parseFloat(formData.taxRate),
                notes: formData.notes,
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

            await creditNotesApi.create(requestData)
            toastr.success("Credit note created successfully")
            router.push("/credit-notes")
        } catch (error: any) {
            console.error("Error creating credit note:", error)
            toastr.error(error.message || "Failed to create credit note")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create Credit Note</h1>
                    <p className="text-muted-foreground">Create a new credit note for a customer</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>General Information</CardTitle>
                        <CardDescription>Basic credit note details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Customer *</Label>
                                <Select
                                    value={formData.customerId}
                                    onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map(customer => (
                                            <SelectItem key={customer.id} value={customer.id.toString()}>
                                                {customer.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Invoice ID (Optional)</Label>
                                <Input
                                    type="number"
                                    value={formData.invoiceId}
                                    onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
                                    placeholder="Enter invoice ID if applicable"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Credit Note Date *</Label>
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
                                    placeholder="Enter reason for credit note"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
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

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Enter any additional notes"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Items</CardTitle>
                        <CardDescription>Add items to the credit note</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                            <div className="space-y-2">
                                <Label>Item *</Label>
                                <Select
                                    value={newItem.itemId}
                                    onValueChange={(value) => {
                                        const item = items.find(i => i.id.toString() === value)
                                        setNewItem({
                                            ...newItem,
                                            itemId: value,
                                            unitPrice: item?.sellingPrice.toString() || "0"
                                        })
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {items.map(item => (
                                            <SelectItem key={item.id} value={item.id.toString()}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Code</Label>
                                <Input
                                    value={newItem.code}
                                    onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                                    placeholder="Item code"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Qty *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={newItem.qty}
                                    onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
                                    placeholder="Quantity"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Unit Price *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={newItem.unitPrice}
                                    onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                                    placeholder="Unit price"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Discount (%)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={newItem.discount}
                                    onChange={(e) => setNewItem({ ...newItem, discount: e.target.value })}
                                    placeholder="Discount"
                                />
                            </div>

                            <Button type="button" onClick={handleAddItem}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                            </Button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="newItemTax"
                                checked={newItem.isTaxItem}
                                onCheckedChange={(checked) =>
                                    setNewItem({ ...newItem, isTaxItem: checked as boolean })
                                }
                            />
                            <Label htmlFor="newItemTax" className="cursor-pointer">
                                Taxable Item
                            </Label>
                        </div>

                        <div className="space-y-2">
                            <Label>Item Reason</Label>
                            <Input
                                value={newItem.reason}
                                onChange={(e) => setNewItem({ ...newItem, reason: e.target.value })}
                                placeholder="Reason for this item"
                            />
                        </div>

                        {creditNoteItems.length > 0 && (
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Unit Price</TableHead>
                                            <TableHead>Discount</TableHead>
                                            <TableHead>Tax</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {creditNoteItems.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{item.Item?.name}</TableCell>
                                                <TableCell>{item.code || "-"}</TableCell>
                                                <TableCell>{item.qty}</TableCell>
                                                <TableCell>LKR {item.unitPrice.toFixed(2)}</TableCell>
                                                <TableCell>{item.discount}%</TableCell>
                                                <TableCell>
                                                    {item.isTaxItem ? "Yes" : "No"}
                                                    {item.isTaxItem && ` (LKR ${(item.taxAmount || 0).toFixed(2)})`}
                                                </TableCell>
                                                <TableCell>LKR {(item.total || 0).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
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
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-end">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span className="font-medium">LKR {calculateSubtotal().toFixed(2)}</span>
                                </div>
                                {formData.isTaxCreditNote && (
                                    <div className="flex justify-between">
                                        <span>Tax ({formData.taxRate}%):</span>
                                        <span className="font-medium">LKR {calculateTaxAmount().toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold border-t pt-2">
                                    <span>Total:</span>
                                    <span>LKR {calculateTotal().toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Creating..." : "Create Credit Note"}
                    </Button>
                </div>
            </form>
        </div>
    )
}
