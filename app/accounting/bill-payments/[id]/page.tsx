"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Printer, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { billPaymentsApi, billEntriesApi, banksApi, bankBranchesApi, BillPayment, BillEntry, PaymentAllocation, Bank, BankBranch } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { generatePaymentVoucherPDF, generateChequePDF, type ChequePrintData } from "@/lib/pdf-generator"
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
import { useAuth } from "@/lib/auth"

interface BillPaymentDetailsProps {
  params: Promise<{ id: string }>
}

export default function BillPaymentDetails({ params }: BillPaymentDetailsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { hasPermission } = useAuth()
  const resolvedParams = use(params)
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [billPayment, setBillPayment] = useState<BillPayment | null>(null)
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankBranches, setBankBranches] = useState<BankBranch[]>([])
  const [cancellationReason, setCancellationReason] = useState("")

  useEffect(() => {
    loadBillPayment()
  }, [resolvedParams.id])

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [banksData, branchesData] = await Promise.all([
          banksApi.getAll({ status: 'Active' }),
          bankBranchesApi.getAll({ status: 'Active' })
        ])
        setBanks(Array.isArray(banksData) ? banksData : [])
        setBankBranches(Array.isArray(branchesData) ? branchesData : [])
      } catch (error) {
        console.error("Failed to load bank metadata:", error)
      }
    }
    loadMetadata()
  }, [])

  const loadBillPayment = async () => {
    try {
      setLoading(true)
      const data = await billPaymentsApi.getById<any>(resolvedParams.id)
      const normalizedPayment = data?.data || data
      if (!normalizedPayment) throw new Error("Payment not found")
      setBillPayment(normalizedPayment)

      // Use Entries (bill entries) if available, fallback to Allocations
      if (normalizedPayment.Entries && Array.isArray(normalizedPayment.Entries) && normalizedPayment.Entries.length > 0) {
        setAllocations(normalizedPayment.Entries.map((e: any) => ({
          id: e.id,
          billEntryId: e.billEntryId,
          allocatedAmount: e.amount,
          taxRate: e.taxRate,
          taxAmount: e.taxAmount,
          BillEntry: e.BillEntry
        })))
      } else if (normalizedPayment.Allocations && Array.isArray(normalizedPayment.Allocations) && normalizedPayment.Allocations.length > 0) {
        setAllocations(normalizedPayment.Allocations)
      } else {
        const allocData = await billPaymentsApi.getAllocations(normalizedPayment.id)
        setAllocations(Array.isArray(allocData) ? allocData : [])
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load bill payment details",
        variant: "destructive",
      })
      router.push("/accounting/bill-payments")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBillPayment = async () => {
    if (!billPayment) return
    try {
      setSubmitting(true)
      await billPaymentsApi.delete(billPayment.id)
      toast({
        title: "Success",
        description: "Bill payment deleted successfully",
      })
      router.push("/accounting/bill-payments")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bill payment",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitBillPayment = async () => {
    if (!billPayment) return
    try {
      setSubmitting(true)
      await billPaymentsApi.submit(billPayment.id)
      toast({
        title: "Success",
        description: "Bill payment submitted successfully",
      })
      loadBillPayment()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit bill payment",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveBillPayment = async () => {
    if (!billPayment) return
    try {
      setSubmitting(true)
      await billPaymentsApi.approve(billPayment.id)
      toast({
        title: "Success",
        description: "Bill payment approved successfully",
      })
      loadBillPayment()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve bill payment",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePostBillPayment = async () => {
    if (!billPayment) return
    try {
      setSubmitting(true)
      await billPaymentsApi.post(billPayment.id)
      toast({
        title: "Success",
        description: "Bill payment posted successfully",
      })
      loadBillPayment()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post bill payment",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelBillPayment = async () => {
    if (!billPayment) return
    try {
      setSubmitting(true)
      await billPaymentsApi.cancel(billPayment.id, { cancellationReason })
      toast({
        title: "Success",
        description: "Bill payment cancelled successfully",
      })
      setCancellationReason("")
      loadBillPayment()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel bill payment",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrintVoucher = () => {
    if (!billPayment) return
    try {
      generatePaymentVoucherPDF(billPayment)
      toast({
        title: "Success",
        description: "Payment voucher generated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate payment voucher",
        variant: "destructive",
      })
    }
  }

  const handlePrintCheque = (data: ChequePrintData) => {
    try {
      generateChequePDF(data)
      toast({
        title: "Success",
        description: "Cheque PDF generated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate cheque PDF",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  if (!billPayment) {
    return <ERPLayout><div className="p-4 text-center">Payment not found</div></ERPLayout>
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      Draft: "bg-gray-100 text-gray-800",
      Allocated: "bg-yellow-100 text-yellow-800",
      Submitted: "bg-blue-100 text-blue-800",
      Approved: "bg-green-100 text-green-800",
      Posted: "bg-purple-100 text-purple-800",
      Cancelled: "bg-orange-100 text-orange-800",
      Rejected: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  return (
    <ERPLayout>
      <div className="space-y-4">
        <Link href="/accounting/bill-payments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payments
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Bill Payment Details</CardTitle>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Payment Number:</span>
                  <span className="font-mono text-sm font-semibold">{billPayment.paymentNumber}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className={`capitalize text-xs ${getStatusColor(billPayment.status)}`}>
                  {billPayment.status}
                </Badge>
                <Badge className={`capitalize text-xs ${billPayment.approvalStatus === "Approved" ? "bg-green-100 text-green-800" : billPayment.approvalStatus === "Rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {billPayment.approvalStatus || "Pending"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Info Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
              <div>
                <p className="text-xs text-muted-foreground">Payment Number</p>
                <p className="font-mono font-bold text-sm">{billPayment.paymentNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Supplier</p>
                <p className="text-sm font-semibold">{billPayment.Supplier?.name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Date</p>
                <p className="text-sm">{new Date(billPayment.paymentDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Method</p>
                <p className="text-sm">{billPayment.paymentMethod}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">LKR {parseFloat(billPayment.amount?.toString() || "0").toFixed(2)}</p>
              </div>
              {billPayment.journalEntryId && (
                <div>
                  <p className="text-xs text-muted-foreground">Journal Entry ID</p>
                  <p className="font-mono text-sm">{billPayment.journalEntryId}</p>
                </div>
              )}
            </div>

            {/* Print trigger */}
            <div className="flex gap-2">
              {billPayment.status === "Posted" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintVoucher}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  <Printer className="h-4 w-4 mr-2" /> Print Payment Voucher
                </Button>
              )}
            </div>

            {/* Payment Breakdown (Details) Section */}
            {billPayment.Details && billPayment.Details.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Payment Breakdown</h3>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-600 border-blue-200">
                    {billPayment.Details.length} {billPayment.Details.length === 1 ? 'Method' : 'Methods'}
                  </Badge>
                </div>
                <div className="border rounded-md overflow-hidden bg-white dark:bg-slate-950">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b">
                      <TableRow className="h-8">
                        <TableHead className="font-semibold py-1">Payment Method</TableHead>
                        <TableHead className="text-right font-semibold py-1">Amount</TableHead>
                        <TableHead className="font-semibold py-1">Ledger Account</TableHead>
                        <TableHead className="font-semibold py-1">Details / Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billPayment.Details.map((detail) => {
                        const methodName = detail.PaymentType?.paymentTypeName || (detail.paymentTypeId === 1 ? 'Cash' : detail.paymentTypeId === 3 ? 'Bank Transfer' : 'Other')
                        return (
                          <TableRow key={detail.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 h-9">
                            <TableCell className="py-1 font-medium">{methodName}</TableCell>
                            <TableCell className="text-right font-mono font-bold py-1 text-blue-600 dark:text-blue-400">{parseFloat(detail.amount.toString()).toFixed(2)}</TableCell>
                            <TableCell className="py-1 text-muted-foreground">{detail.LedgerAccount?.name || '-'}</TableCell>
                            <TableCell className="py-1 text-muted-foreground text-[10px]">
                              <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
                                {detail.bankId && <Badge variant="secondary" className="text-[9px] h-4">{banks.find(b => b.id === detail.bankId)?.name || detail.bankId}</Badge>}
                                {detail.bankBranchId && <Badge variant="secondary" className="text-[9px] h-4">{bankBranches.find(bb => bb.id === detail.bankBranchId)?.branchName || detail.bankBranchId}</Badge>}
                                {detail.chequeNo && <Badge variant="outline" className="text-[9px] h-4 border-amber-200 bg-amber-50 text-amber-700">Cheque: {detail.chequeNo}</Badge>}
                                {detail.chequeDate && <span className="italic leading-4">({new Date(detail.chequeDate).toLocaleDateString()})</span>}
                                {detail.cardType && <Badge variant="outline" className="text-[9px] h-4">{detail.cardType}</Badge>}
                                {detail.referenceNo && <span className="leading-4 underline decoration-dotted underline-offset-2">Ref: {detail.referenceNo}</span>}
                                {detail.paymentTypeId === 4 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-[10px] text-amber-600 border-amber-300 hover:bg-amber-50 ml-1"
                                    title="Print Cheque"
                                    onClick={() => handlePrintCheque({
                                      payee: billPayment?.Supplier?.name || "-",
                                      amount: parseFloat(detail.amount.toString()),
                                      chequeDate: detail.chequeDate || billPayment?.paymentDate || "",
                                      chequeNo: detail.chequeNo,
                                      bankName: banks.find(b => b.id === detail.bankId)?.name,
                                      bankBranch: bankBranches.find(bb => bb.id === detail.bankBranchId)?.branchName,
                                      referenceNo: detail.referenceNo,
                                      documentNo: billPayment?.paymentNumber,
                                      documentType: "Bill Payment",
                                      preparedBy: billPayment?.Creator?.fullName || undefined,
                                    })}
                                  >
                                    <Printer className="h-3 w-3 mr-1" /> Cheque
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 h-9 font-bold">
                        <TableCell className="py-1">Total Paid</TableCell>
                        <TableCell className="text-right font-mono py-1 text-blue-700 dark:text-blue-300">
                          LKR {billPayment.Details.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0).toFixed(2)}
                        </TableCell>
                        <TableCell colSpan={2} className="py-1"></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Allocations & Bill Entry Details */}
            {allocations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold mb-2">Allocated Bills Summary</h3>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Bill Amount</p>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                      {allocations.reduce((sum, alloc) => sum + parseFloat(alloc.BillEntry?.totalAmount?.toString() || "0"), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950 p-2 rounded border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Total Paid</p>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                      {allocations.reduce((sum, alloc) => sum + parseFloat(alloc.BillEntry?.paidAmount?.toString() || "0"), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">Total Allocated</p>
                    <p className="text-sm font-bold text-green-900 dark:text-green-100">
                      {allocations.reduce((sum, alloc) => sum + parseFloat(alloc.allocatedAmount?.toString() || "0"), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950 p-2 rounded border border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Total Remaining</p>
                    <p className="text-sm font-bold text-purple-900 dark:text-purple-100">
                      {allocations.reduce((sum, alloc) => {
                        const billAmount = parseFloat(alloc.BillEntry?.totalAmount?.toString() || "0")
                        const paidAmount = parseFloat(alloc.BillEntry?.paidAmount?.toString() || "0")
                        const allocatedAmount = parseFloat(alloc.allocatedAmount?.toString() || "0")
                        return sum + (billAmount - paidAmount - allocatedAmount)
                      }, 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Detailed Allocations Table */}
                <div className="border rounded-md overflow-hidden">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-100 dark:bg-slate-800">
                      <TableRow>
                        <TableHead className="font-semibold">Allocation #</TableHead>
                        <TableHead className="font-semibold">Bill #</TableHead>
                        <TableHead className="font-semibold">Bill Date</TableHead>
                        <TableHead className="font-semibold">Due Date</TableHead>
                        <TableHead className="text-right font-semibold">Bill Amount</TableHead>
                        <TableHead className="text-right font-semibold">Paid Amount</TableHead>
                        <TableHead className="text-right font-semibold">Allocated</TableHead>
                        <TableHead className="text-right font-semibold">Tax (%)</TableHead>
                        <TableHead className="text-right font-semibold">Tax Amt</TableHead>
                        <TableHead className="text-right font-semibold">Remaining</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocations.map((alloc) => {
                        const billAmount = parseFloat(alloc.BillEntry?.totalAmount?.toString() || "0")
                        const paidAmount = parseFloat(alloc.BillEntry?.paidAmount?.toString() || "0")
                        const allocatedAmount = parseFloat(alloc.allocatedAmount?.toString() || "0")
                        const remaining = billAmount - paidAmount - allocatedAmount
                        const allocationPercentage = (allocatedAmount / billAmount * 100).toFixed(1)
                        return (
                          <TableRow key={alloc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                            <TableCell className="font-mono py-2 font-medium text-xs">{alloc.id || "-"}</TableCell>
                            <TableCell className="font-mono py-2 font-medium">{alloc.BillEntry?.billNumber || "-"}</TableCell>
                            <TableCell className="py-2">{alloc.BillEntry?.billDate ? new Date(alloc.BillEntry.billDate).toLocaleDateString() : "-"}</TableCell>
                            <TableCell className="py-2">{alloc.BillEntry?.dueDate ? new Date(alloc.BillEntry.dueDate).toLocaleDateString() : "-"}</TableCell>
                            <TableCell className="text-right font-mono py-2 font-semibold">{billAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono py-2 text-amber-600 dark:text-amber-400">{paidAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono py-2 font-semibold text-green-600 dark:text-green-400">{allocatedAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono py-2">{alloc.taxRate?.toFixed(2) || "0.00"}</TableCell>
                            <TableCell className="text-right font-mono py-2">{parseFloat(alloc.taxAmount?.toString() || "0").toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono py-2 text-blue-600 dark:text-blue-400">{remaining.toFixed(2)}</TableCell>
                            <TableCell className="py-2">
                              <div className="flex items-center gap-1">
                                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 dark:bg-green-400 rounded-full"
                                    style={{ width: `${allocationPercentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8">{allocationPercentage}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Audit Trail Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800">
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Created By</p>
                <p className="text-sm font-semibold">{billPayment.Creator?.fullName || "-"}</p>
                <p className="text-xs text-muted-foreground">{billPayment.Creator?.email || ""}</p>
              </div>
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Created At</p>
                <p className="text-sm">{billPayment.createdAt ? new Date(billPayment.createdAt).toLocaleString() : "-"}</p>
              </div>
              {billPayment.ApprovedByUser && (
                <>
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Approved By</p>
                    <p className="text-sm font-semibold">{billPayment.ApprovedByUser.fullName}</p>
                    <p className="text-xs text-muted-foreground">{billPayment.ApprovedByUser.email || ""}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Approved At</p>
                    <p className="text-sm">{billPayment.approvedAt ? new Date(billPayment.approvedAt).toLocaleString() : "-"}</p>
                  </div>
                </>
              )}
              {billPayment.PostedByUser && (
                <>
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Posted By</p>
                    <p className="text-sm font-semibold">{billPayment.PostedByUser.fullName}</p>
                    <p className="text-xs text-muted-foreground">{billPayment.PostedByUser.email || ""}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Posted At</p>
                    <p className="text-sm">{billPayment.postedAt ? new Date(billPayment.postedAt).toLocaleString() : "-"}</p>
                  </div>
                </>
              )}
              {billPayment.rejectionReason && (
                <div className="col-span-1 md:col-span-2 bg-red-50 dark:bg-red-950 p-2 rounded border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">Rejection Reason</p>
                  <p className="text-sm text-red-900 dark:text-red-100">{billPayment.rejectionReason}</p>
                </div>
              )}
            </div>

            {billPayment.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{billPayment.description}</p>
              </div>
            )}

            {/* Workflow Actions Section */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-semibold">Payment Workflow</p>
              <div className="flex gap-2 flex-wrap">
                {/* Edit & Delete trigger buttons */}
                {((billPayment.status === "Draft") || (billPayment.status === "Posted" && hasPermission("bill-payment:edit"))) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                      onClick={() => {
                        router.push(`/accounting/bill-payments?action=edit&id=${billPayment.id}`)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit (via List Page)
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200">
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-red-600">Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the Bill Payment and revert any bill allocations.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white"
                            onClick={handleDeleteBillPayment}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}

                {/* Draft -> Allocated: Allocate Button */}
                {billPayment.status === "Draft" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200" disabled={submitting}>
                        Allocate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Allocate Bills to Payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark the payment as Allocated. You can then submit it for approval.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleSubmitBillPayment}
                          disabled={submitting}
                        >
                          {submitting ? "Processing..." : "Allocate"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Allocated/Draft -> Submitted: Submit Button */}
                {(billPayment.status === "Draft" || billPayment.status === "Allocated") && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white" disabled={submitting}>
                        Submit
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Submit Bill Payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Submit this payment for approval. Once submitted, it will require approval before posting.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleSubmitBillPayment}
                          disabled={submitting}
                        >
                          {submitting ? "Processing..." : "Submit"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Submitted -> Approved: Approve Button */}
                {billPayment.status === "Submitted" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" disabled={submitting}>
                        Approve
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Approve Bill Payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Approve this payment. Once approved, it can be posted to the accounting system.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleApproveBillPayment}
                          disabled={submitting}
                        >
                          {submitting ? "Processing..." : "Approve"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Approved -> Posted: Post Button */}
                {billPayment.status === "Approved" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white" disabled={submitting}>
                        Post
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Post Bill Payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Post this payment to the accounting system. This will record the payment in the ledger.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handlePostBillPayment}
                          disabled={submitting}
                        >
                          {submitting ? "Processing..." : "Post"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Cancel Button for Draft/Allocated/Submitted/Approved */}
                {["Draft", "Allocated", "Submitted", "Approved"].includes(billPayment.status) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={submitting}>
                        Cancel
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Bill Payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <div className="space-y-2 mt-2">
                            <p>Are you sure you want to cancel this payment?</p>
                            <div>
                              <Label htmlFor="cancellation-reason" className="text-xs font-medium">Cancellation Reason</Label>
                              <Input
                                id="cancellation-reason"
                                value={cancellationReason}
                                onChange={(e) => setCancellationReason(e.target.value)}
                                placeholder="Enter reason for cancellation"
                                className="h-8 text-sm mt-1"
                                disabled={submitting}
                              />
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep It</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelBillPayment}
                          disabled={submitting || !cancellationReason.trim()}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {submitting ? "Cancelling..." : "Cancel Payment"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Posted Status: Show as Completed */}
                {billPayment.status === "Posted" && (
                  <div className="flex items-center gap-2 w-full">
                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                      ✓ Posted to Ledger
                    </Badge>
                    <p className="text-xs text-muted-foreground flex-1">
                      This payment has been successfully posted. Transaction ID: {billPayment.journalEntryId || "N/A"}
                    </p>
                  </div>
                )}

                {/* Cancelled Status: Show as Completed */}
                {billPayment.status === "Cancelled" && (
                  <div className="flex items-center gap-2 w-full">
                    <Badge className="bg-orange-100 text-orange-800 text-xs">
                      ✗ Cancelled
                    </Badge>
                    <p className="text-xs text-muted-foreground flex-1">
                      This payment has been cancelled.
                    </p>
                  </div>
                )}

                {/* Rejected Status: Show as Completed */}
                {billPayment.status === "Rejected" && (
                  <div className="flex items-center gap-2 w-full">
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      ✗ Rejected
                    </Badge>
                    <p className="text-xs text-muted-foreground flex-1">
                      This payment has been rejected.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  )
}
