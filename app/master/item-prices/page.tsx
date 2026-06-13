"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import toastr from "@/lib/toastr"
import { itemPricesApi, customersApi, itemsApi, type ItemPrice, type Item } from "@/lib/api"
import { Plus, Search, Edit, Trash2, DollarSign, Users, Package, TrendingUp } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ERPLayout } from "@/components/layouts/erp-layout"

interface Customer {
  id: number
  type: string
  name: string
  email: string
  phone: string
  address: string
  status: string
  createdAt: string
  updatedAt: string
}

export default function ItemPricesPage() {
  // New response: [{ customer, itemPrices: [ { id, item, price, effectiveDate, status } ] }]
  const [itemPriceGroups, setItemPriceGroups] = useState<any[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedItemPrice, setSelectedItemPrice] = useState<ItemPrice | null>(null)
  const [formData, setFormData] = useState({
    customerId: "",
    type: "Supermarket", // Default type
    effectiveDate: "",
    itemPrices: [
      {
        itemId: "",
        price: "",
      },
    ],
  })
  const [bulkPrices, setBulkPrices] = useState<{ itemId: number; price: string; status: boolean; effectiveDate: string }[]>([])

  useEffect(() => {
    fetchItemPrices()
    fetchCustomers()
    fetchItems()
  }, [])

  const fetchItemPrices = async () => {
    try {
      // New response: array of { customer, itemPrices: [...] }
      const data = await itemPricesApi.getAll<any>()
      setItemPriceGroups(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch item prices",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const data = await customersApi.getAll<Customer>()
      setCustomers(data)
    } catch (error) {
      console.error("Failed to fetch customers:", error)
    }
  }

  const fetchItems = async () => {
    try {
      const data = await itemsApi.getAll<Item>()
      setItems(data)
    } catch (error) {
      console.error("Failed to fetch items:", error)
    }
  }

  const handleEdit = async () => {
    if (!selectedItemPrice) return;
    try {
      const customerId = Number.parseInt(formData.customerId);
      const itemId = Number.parseInt(formData.itemPrices[0].itemId);
      const payload = {
        type: formData.type,
        customerId: Number.parseInt(formData.customerId),
        effectiveDate: formData.effectiveDate,
        itemPrices: formData.itemPrices.map(itemPrice => ({
          itemId: Number.parseInt(itemPrice.itemId),
          price: Number.parseFloat(itemPrice.price),
        })),
      }
      await itemPricesApi.update(`${customerId}/${itemId}`, payload);
      toast({
        title: "Success",
        description: "Item price updated successfully",
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchItemPrices();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item price",
        variant: "destructive",
      });
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await itemPricesApi.remove(id)
      toast({
        title: "Success",
        description: "Item price deleted successfully",
      })
      fetchItemPrices()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item price",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      customerId: "",
      type: "Supermarket", // Reset to default type
      effectiveDate: "",
      itemPrices: [
        {
          itemId: "",
          price: "",
        },
      ],
    })
    setSelectedItemPrice(null)
  }

  const openEditDialog = (itemPrice: ItemPrice) => {
    setSelectedItemPrice(itemPrice)
    setFormData({
      customerId: itemPrice.customer?.id.toString(),
      type: itemPrice.type, // Set type from customer
      effectiveDate: new Date(itemPrice.itemPrices[0].effectiveDate).toISOString().slice(0, 10),
      itemPrices: itemPrice.itemPrices.map(itemPriceDetail => ({
        itemId: itemPriceDetail.item.id.toString(),
        price: itemPriceDetail.price.toString(),
      })),
    })
    setIsEditDialogOpen(true)
  }


  const handleCustomerSelect = (customerId: string) => {
    setFormData({ ...formData, customerId });
    setBulkPrices(
      items.map(item => ({
        itemId: item.id,
        price: "",
        status: true,
        effectiveDate: new Date().toISOString().slice(0, 10)
      }))
    );
  };

  const handleTypeSelect = (type: string) => {
    setFormData({ ...formData, type, customerId: undefined });
    setBulkPrices(
      items.map(item => ({
        itemId: item.id,
        price: "",
        status: true,
        effectiveDate: new Date().toISOString().slice(0, 10)
      }))
    );
  };

  const handleBulkPriceChange = (index: number, field: string, value: any) => {
    const updatedPrices = bulkPrices.map((p, i) => i === index ? { ...p, [field]: value } : p);
    setBulkPrices(updatedPrices);

    const updatedFormData = {
      ...formData,
      itemPrices: updatedPrices.map(p => ({
        itemId: p.itemId.toString(),
        price: p.price.toString(),
      }))
    };
    setFormData(updatedFormData);
  };

  const handleBulkSubmit = async () => {
    try {
      const payload = {
        type: formData.type,
        customerId: Number.parseInt(formData.customerId),
        prices: bulkPrices.map(p => ({
          itemId: p.itemId,
          price: Number.parseFloat(p.price),
          effectiveDate: formData.effectiveDate
        }))
      };
      await itemPricesApi.create(payload);
      toast({ title: "Success", description: "Prices set successfully" });
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
      resetForm();
      fetchItemPrices();
    } catch (error) {
      toast({ title: "Error", description: "Failed to set prices", variant: "destructive" });
    }
  };

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <ERPLayout>
      <div className="flex-1 space-y-2 p-2 md:p-2 pt-2">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Item Prices Management</h2>
            <p className="text-muted-foreground">Manage customer-specific item pricing</p>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item Price
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Set Item Prices (Bulk)</DialogTitle>
                  <DialogDescription>Select customer, then set prices for each item.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-wrap gap-6 mt-1 text-sm">
                  {[
                    "Supermarket",
                    "Wholesaler",
                    "Distributor",
                    "Own Shop",
                    "Walking"
                  ].map((type) => (
                    <label key={type} className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value={type}
                        checked={formData.type === type}
                        onChange={handleTypeSelect.bind(null, type)}
                        className="accent-primary"
                      />
                      <span>{type === "Walking" ? "Walk-in Customer" : type}</span>
                    </label>
                  ))}
                </div>
                <div className="grid gap-4 py-4  grid-cols-2">
                  {formData.type === "Supermarket" && (
                    <div className="grid gap-2">
                      <Label htmlFor="customerId">Customer</Label>
                      <Select
                        value={formData.customerId}
                        onValueChange={handleCustomerSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="effectiveDate">Effective Date</Label>
                    <Input
                      type="date"
                      value={formData.effectiveDate}
                      onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    />
                  </div>
                </div>
                {(formData.type !== "Supermarket" || formData.customerId) && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="w-40">Price (per kg)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkPrices.map((row, idx) => {
                          const item = items.find(i => i.id === row.itemId);
                          return (
                            <TableRow key={row.itemId}>
                              <TableCell>{item?.color + " " + item?.name + " " + item?.country || "Unknown"}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={row.price}
                                  onChange={e => handleBulkPriceChange(idx, "price", e.target.value)}
                                  placeholder="Enter price"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" onClick={handleBulkSubmit} disabled={!(formData.type !== "Supermarket" || formData.customerId)}>
                    Set Prices
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Analytics Cards */}
        {/* <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
       
        <Card className="h-20 p-2 flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2">
            <CardTitle className="text-xs font-semibold">Unique Customers</CardTitle>
            <Users className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-2 py-1">
            <div className="text-lg font-bold leading-tight">{0}</div>
            <p className="text-[10px] text-muted-foreground">With custom pricing</p>
          </CardContent>
        </Card>
        <Card className="h-20 p-2 flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2">
            <CardTitle className="text-xs font-semibold">Items</CardTitle>
            <Package className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-2 py-1">
            <div className="text-lg font-bold leading-tight">{items.length}</div>
            <p className="text-[10px] text-muted-foreground">Available items</p>
          </CardContent>
        </Card>
      </div> */}

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, item, or price..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemPriceGroups.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{row.customer ? row.customer.name : row.type}</div>
                        <div className="text-xs text-muted-foreground">{row.customer?.type}</div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(row.itemPrices[0].effectiveDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={row.itemPrices[0].status === "Active" ? "default" : "secondary"}>{row.itemPrices[0].status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(row)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the item price.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(row.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Item Price</DialogTitle>
              <DialogDescription>Update customer-specific pricing.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-6 mt-1 text-sm">
              {[
                "Supermarket",
                "Wholesaler",
                "Distributor",
                "Own Shop",
                "Walking"
              ].map((type) => (
                <label key={type} className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name="customerType"
                    value={type}
                    checked={formData.type === type}
                    onChange={handleTypeSelect.bind(null, type)}
                    disabled
                    className="accent-primary"
                  />
                  <span className="text-muted-foreground">{type === "Walking" ? "Walk-in Customer" : type}</span>
                </label>
              ))}
            </div>
            <div className="grid gap-4 py-4 grid-cols-2">
              {formData.type === "Supermarket" && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-customerId">Customer</Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                    disabled
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="edit-effectiveDate">Effective Date</Label>
                <Input
                  id="edit-effectiveDate"
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                />
              </div>
            </div>
            {(formData.type !== "Supermarket" || formData.customerId) && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-40">Price (per kg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.itemPrices.map((row, idx) => {
                      const item = items.find(i => i.id.toString() === row.itemId);
                      return (
                        <TableRow key={row.itemId}>
                          <TableCell>{item?.color + " " + item?.name + " " + item?.country || "Unknown"}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              // step="0.01"
                              value={row.price}
                              onChange={e => handleBulkPriceChange(idx, "price", e.target.value)}
                              placeholder="Enter price"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}


            <DialogFooter>
              <Button type="submit" onClick={handleBulkSubmit}>
                Update Price
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
