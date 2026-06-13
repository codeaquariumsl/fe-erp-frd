"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { billEntriesApi, suppliersApi, ledgerAccountsApi, BillEntry, Supplier, LedgerAccount, BillEntryDetail } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { LedgerSelect } from "@/components/accounting/ledger-select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface BillEntryDetailsProps {
  params: Promise<{ id: string }>
}

export default function BillEntryDetails({ params }: BillEntryDetailsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = use(params)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [billEntry, setBillEntry] = useState<BillEntry | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([])
  const [details, setDetails] = useState<BillEntryDetail[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isAddingDetail, setIsAddingDetail] = useState(false)
  const [detailForm, setDetailForm] = useState({
    ledgerId: "",
    description: "",
    quantity: "1",
    unitPrice: "0",
    amount: "",
    taxAmount: "0",
  })
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    taxAmount: "0",
    dueDate: "",
    paymentTerms: "",
  })

  useEffect(() => {
    loadData()
  }, [resolvedParams.id])

  const loadData = async () => {
    try {
      setLoading(true)
      const [billData, suppliersData, ledgersData, detailsData] = await Promise.all([
        billEntriesApi.getById<BillEntry>(resolvedParams.id),
        suppliersApi.getAll<Supplier>(),
        ledgerAccountsApi.getAllAccounts<LedgerAccount>(),
        billEntriesApi.getDetails(parseInt(resolvedParams.id))
      ])
      setBillEntry(billData)
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
      setLedgers(Array.isArray(ledgersData) ? ledgersData : [])
      setDetails(Array.isArray(detailsData) ? detailsData : [])
      setFormData({
        description: billData.description || "",
        amount: billData.amount.toString(),
        taxAmount: (billData.taxAmount || 0).toString(),
        dueDate: billData.dueDate,
        paymentTerms: billData.paymentTerms || "",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load bill entry",
        variant: "destructive",
      })
      router.push("/accounting/bill-entries")
    } finally {
      setLoading(false)
    }
  }

  const loadBillEntry = async () => {
    try {
      setLoading(true)
      const data = await billEntriesApi.getById<BillEntry>(resolvedParams.id)
      setBillEntry(data)
      setFormData({
        description: data.description || "",
        amount: data.amount.toString(),
        taxAmount: (data.taxAmount || 0).toString(),
        dueDate: data.dueDate,
        paymentTerms: data.paymentTerms || "",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load bill entry",
        variant: "destructive",
      })
      router.push("/accounting/bill-entries")
    } finally {
      setLoading(false)
    }
  }

  const loadSuppliers = async () => {
    try {
      const data = await suppliersApi.getAll<Supplier>()
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Failed to load suppliers:", error)
    }
  }

  const handleAddDetail = async () => {
    if (!billEntry || !detailForm.ledgerId || !detailForm.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      await billEntriesApi.addDetail(billEntry.id, {
        ledgerId: parseInt(detailForm.ledgerId),
        description: detailForm.description,
        quantity: parseInt(detailForm.quantity) || 1,
        unitPrice: parseFloat(detailForm.unitPrice) || 0,
        amount: parseFloat(detailForm.amount),
        taxAmount: parseFloat(detailForm.taxAmount) || 0,
      })
      toast({
        title: "Success",
        description: "Detail line added successfully",
      })
      setDetailForm({
        ledgerId: "",
        description: "",
        quantity: "1",
        unitPrice: "0",
        amount: "",
        taxAmount: "0",
      })
      setIsAddingDetail(false)
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add detail",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveDetail = async (detailId: number) => {
    if (!billEntry) return

    try {
      setSubmitting(true)
      await billEntriesApi.removeDetail(billEntry.id, detailId)
      toast({
        title: "Success",
        description: "Detail line removed successfully",
      })
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove detail",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!billEntry) return

    try {
      setSubmitting(true)
      await billEntriesApi.update(billEntry.id, {
        description: formData.description,
        amount: parseFloat(formData.amount),
        taxAmount: parseFloat(formData.taxAmount),
        dueDate: formData.dueDate,
        paymentTerms: formData.paymentTerms,
      })
      toast({
        title: "Success",
        description: "Bill entry updated successfully",
      })
      setIsEditing(false)
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update bill entry",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!billEntry) return

    try {
      setSubmitting(true)
      await billEntriesApi.submit(billEntry.id)
      toast({
        title: "Success",
        description: "Bill entry submitted successfully",
      })
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit bill entry",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    if (!billEntry) return

    try {
      setSubmitting(true)
      await billEntriesApi.approve(billEntry.id)
      toast({
        title: "Success",
        description: "Bill entry approved successfully",
      })
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve bill entry",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePost = async () => {
    if (!billEntry) return

    try {
      setSubmitting(true)
      await billEntriesApi.post(billEntry.id)
      toast({
        title: "Success",
        description: "Bill entry posted successfully with journal created",
      })
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post bill entry",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!billEntry || !rejectionReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      await billEntriesApi.reject(billEntry.id, { rejectionReason })
      toast({
        title: "Success",
        description: "Bill entry rejected successfully",
      })
      setShowRejectDialog(false)
      setRejectionReason("")
      loadBillEntry()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject bill entry",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!billEntry) {
    return <div>Bill entry not found</div>
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      Draft: "bg-gray-100 text-gray-800",
      Submitted: "bg-blue-100 text-blue-800",
      Approved: "bg-green-100 text-green-800",
      Posted: "bg-purple-100 text-purple-800",
      Rejected: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const canEdit = billEntry.status === "Draft"
  const canSubmit = billEntry.status === "Draft"
  const canApprove = billEntry.status === "Submitted"
  const canPost = billEntry.status === "Approved"
  const canReject = billEntry.status === "Submitted" || billEntry.status === "Approved"

  return (
    <ERPLayout>
      <div className="space-y-4">
        <Link href="/accounting/bill-entries">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bill Entry Details</CardTitle>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Bill Number:</span>
                  <span className="font-mono text-sm font-semibold">{billEntry.billNumber}</span>
                </div>
              </div>
              <Badge className={`capitalize ${getStatusColor(billEntry.status)}`}>
                {billEntry.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Summary Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-accent/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Supplier</Label>
                  <p className="font-medium">{billEntry.supplier?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Bill Date</Label>
                  <p className="font-medium">{new Date(billEntry.billDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <p className="font-medium">{new Date(billEntry.dueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total Amount</Label>
                  <p className="font-mono font-semibold">{parseFloat(billEntry.totalAmount?.toString() || "0").toFixed(2)}</p>
                </div>
              </div>

              {/* Editable Fields */}
              {isEditing ? (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxAmount">Tax Amount</Label>
                    <Input
                      id="taxAmount"
                      type="number"
                      value={formData.taxAmount}
                      onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={submitting}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdate} disabled={submitting}>
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} disabled={submitting}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4 border rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">Amount</Label>
                    <p className="font-mono">{parseFloat(formData.amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tax Amount</Label>
                    <p className="font-mono">{parseFloat(formData.taxAmount).toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Due Date</Label>
                    <p>{new Date(formData.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p>{formData.description || "-"}</p>
                  </div>
                  {canEdit && (
                    <Button size="sm" onClick={() => setIsEditing(true)}>
                      Edit Details
                    </Button>
                  )}
                </div>
              )}

              {/* Workflow Actions */}
              {billEntry.rejectionReason && (
                <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                  <Label className="text-sm text-red-800 font-semibold">Rejection Reason</Label>
                  <p className="text-red-700 mt-1">{billEntry.rejectionReason}</p>
                </div>
              )}

              {/* Line Items Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Bill Details / Line Items</h3>
                  {canEdit && (
                    <Button size="sm" onClick={() => setIsAddingDetail(!isAddingDetail)}>
                      {isAddingDetail ? "Cancel" : "+ Add Line Item"}
                    </Button>
                  )}
                </div>

                {isAddingDetail && (
                  <div className="p-4 border rounded-lg bg-accent/50 space-y-4 mb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ledgerId">Ledger Account *</Label>
                        <LedgerSelect
                          value={detailForm.ledgerId}
                          onValueChange={(v) => setDetailForm({ ...detailForm, ledgerId: v })}
                          ledgers={ledgers}
                          placeholder="Select ledger"
                        />
                      </div>
                      <div>
                        <Label htmlFor="detailDescription">Description</Label>
                        <Input
                          id="detailDescription"
                          value={detailForm.description}
                          onChange={(e) => setDetailForm({ ...detailForm, description: e.target.value })}
                          placeholder="Item description"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={detailForm.quantity}
                          onChange={(e) => setDetailForm({ ...detailForm, quantity: e.target.value })}
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="unitPrice">Unit Price</Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          step="0.01"
                          value={detailForm.unitPrice}
                          onChange={(e) => setDetailForm({ ...detailForm, unitPrice: e.target.value })}
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="detailAmount">Amount *</Label>
                        <Input
                          id="detailAmount"
                          type="number"
                          step="0.01"
                          value={detailForm.amount}
                          onChange={(e) => setDetailForm({ ...detailForm, amount: e.target.value })}
                          placeholder="0.00"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="detailTaxAmount">Tax Amount</Label>
                        <Input
                          id="detailTaxAmount"
                          type="number"
                          step="0.01"
                          value={detailForm.taxAmount}
                          onChange={(e) => setDetailForm({ ...detailForm, taxAmount: e.target.value })}
                          placeholder="0.00"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddDetail} disabled={submitting}>
                        Add Item
                      </Button>
                      <Button variant="outline" onClick={() => setIsAddingDetail(false)} disabled={submitting}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {details.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    No line items added yet
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left">Ledger</th>
                          <th className="px-4 py-2 text-left">Description</th>
                          <th className="px-4 py-2 text-right">Qty</th>
                          <th className="px-4 py-2 text-right">Unit Price</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                          <th className="px-4 py-2 text-right">Tax</th>
                          {canEdit && <th className="px-4 py-2 text-center">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {details.map((detail) => (
                          <tr key={detail.id} className="border-t">
                            <td className="px-4 py-2 font-mono text-xs">
                              {detail.ledger?.name || `Ledger ${detail.ledgerId}`}
                            </td>
                            <td className="px-4 py-2">{detail.description}</td>
                            <td className="px-4 py-2 text-right">{detail.quantity || 1}</td>
                            <td className="px-4 py-2 text-right font-mono">{(detail.unitPrice || 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-mono">{(detail.amount || 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-mono">{(detail.taxAmount || 0).toFixed(2)}</td>
                            {canEdit && (
                              <td className="px-4 py-2 text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => detail.id && handleRemoveDetail(detail.id)}
                                  disabled={submitting}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  ×
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-4">
                {canSubmit && (
                  <Button onClick={handleSubmit} disabled={submitting}>
                    Submit for Approval
                  </Button>
                )}
                {canApprove && (
                  <Button onClick={handleApprove} disabled={submitting} variant="default">
                    Approve
                  </Button>
                )}
                {canPost && (
                  <Button onClick={handlePost} disabled={submitting} variant="default">
                    Post (Create Journal)
                  </Button>
                )}
                {canReject && (
                  <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                    <Button
                      variant="destructive"
                      disabled={submitting}
                      onClick={() => setShowRejectDialog(true)}
                    >
                      Reject
                    </Button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Bill Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                          Enter the rejection reason for this bill entry.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Input
                        placeholder="Reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        disabled={submitting}
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleReject}
                          disabled={submitting || !rejectionReason.trim()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Reject
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  )
}
