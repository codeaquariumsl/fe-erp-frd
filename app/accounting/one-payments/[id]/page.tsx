"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { onePaymentsApi, OnePayment } from "@/lib/api"
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

interface OnePaymentDetailsProps {
  params: Promise<{ id: string }>
}

export default function OnePaymentDetails({ params }: OnePaymentDetailsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = use(params)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [onePayment, setOnePayment] = useState<OnePayment | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [reversalReason, setReversalReason] = useState("")

  useEffect(() => {
    loadOnePayment()
  }, [resolvedParams.id])

  const loadOnePayment = async () => {
    try {
      setLoading(true)
      const rawData = await onePaymentsApi.getById<any>(resolvedParams.id)
      const data = rawData?.data || rawData
      if (!data) throw new Error("Payment not found")
      
      const normalized = {
        ...data,
        totalAmount: parseFloat(data.totalPaymentAmount || data.totalAmount || 0),
        lines: (data.Lines || data.lines || []).map((line: any) => ({
          ...line,
          amount: parseFloat(line.amount || 0),
          ledgerAccount: line.LedgerAccount || line.ledgerAccount
        })),
        paymentMethods: (data.PaymentMethods || data.paymentMethods || []).map((method: any) => ({
          ...method,
          amount: parseFloat(method.amount || 0),
          ledgerAccount: method.LedgerAccount || method.ledgerAccount
        }))
      }
      setOnePayment(normalized)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load payment details",
        variant: "destructive",
      })
      router.push("/accounting/one-payments")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!onePayment) return
    try {
      setSubmitting(true)
      await onePaymentsApi.submit(onePayment.id)
      toast({ title: "Success", description: "Payment submitted successfully" })
      loadOnePayment()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit payment", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    if (!onePayment) return
    try {
      setSubmitting(true)
      await onePaymentsApi.approve(onePayment.id)
      toast({ title: "Success", description: "Payment approved successfully" })
      loadOnePayment()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to approve payment", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveAndPost = async () => {
    if (!onePayment) return
    try {
      setSubmitting(true)
      await onePaymentsApi.approveAndPost(onePayment.id)
      toast({ title: "Success", description: "Payment approved and posted successfully" })
      loadOnePayment()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to approve and post payment", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePost = async () => {
    if (!onePayment) return
    try {
      setSubmitting(true)
      await onePaymentsApi.post(onePayment.id)
      toast({ title: "Success", description: "Payment posted successfully" })
      loadOnePayment()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to post payment", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!onePayment) return
    if (!rejectionReason.trim()) {
      toast({ title: "Validation Error", description: "Rejection reason is required", variant: "destructive" })
      return
    }
    try {
      setSubmitting(true)
      await onePaymentsApi.reject(onePayment.id, { rejectionReason })
      toast({ title: "Success", description: "Payment rejected successfully" })
      setRejectionReason("")
      loadOnePayment()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reject payment", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReverse = async () => {
    if (!onePayment) return
    if (!reversalReason.trim()) {
      toast({ title: "Validation Error", description: "Reversal reason is required", variant: "destructive" })
      return
    }
    try {
      setSubmitting(true)
      await onePaymentsApi.reverse(onePayment.id, { reversalReason })
      toast({ title: "Success", description: "Payment reversed successfully" })
      setReversalReason("")
      loadOnePayment()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reverse payment", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!onePayment) return
    try {
      setSubmitting(true)
      await onePaymentsApi.cancel(onePayment.id)
      toast({ title: "Success", description: "Payment cancelled successfully" })
      loadOnePayment()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to cancel payment", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrintVoucher = () => {
    if (!onePayment) return
    try {
      generatePaymentVoucherPDF(onePayment)
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
      toast({ title: "Success", description: "Cheque PDF generated successfully" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate cheque PDF", variant: "destructive" })
    }
  }

  if (loading) {
    return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  if (!onePayment) {
    return <ERPLayout><div className="p-4 text-center">Payment not found</div></ERPLayout>
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      Draft: "bg-gray-100 text-gray-800",
      Submitted: "bg-blue-100 text-blue-800",
      Approved: "bg-green-100 text-green-800",
      Posted: "bg-purple-100 text-purple-800",
      Rejected: "bg-red-100 text-red-800",
      Reversed: "bg-orange-100 text-orange-800",
      Cancelled: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  return (
    <ERPLayout>
      <div className="space-y-4">
        <Link href="/accounting/one-payments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payments
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">One-Time Payment Details</CardTitle>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Payment Number:</span>
                  <span className="font-mono text-sm font-semibold">{onePayment.paymentNumber}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className={`capitalize ${getStatusColor(onePayment.status)}`}>
                  {onePayment.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
              <div>
                <p className="text-xs text-muted-foreground">Payment Number</p>
                <p className="font-mono font-bold">{onePayment.paymentNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reference Number</p>
                <p className="font-mono font-bold">{onePayment.referenceNumber || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Date</p>
                <p>{new Date(onePayment.paymentDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="font-mono font-bold text-lg">{onePayment.totalAmount?.toFixed(2)} {onePayment.currencyCode}</p>
              </div>
              {onePayment.description && (
                <div className="col-span-1 md:col-span-2">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">{onePayment.description}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Created By</p>
                <p className="text-sm font-medium">{onePayment.Creator?.fullName || onePayment.createdByUsername || "System"}</p>
              </div>
              {(onePayment.ApprovedByUser || onePayment.approvedByUsername) && (
                <div>
                  <p className="text-xs text-muted-foreground">Approved By</p>
                  <p className="text-sm font-medium">{onePayment.ApprovedByUser?.fullName || onePayment.approvedByUsername}</p>
                </div>
              )}
              {(onePayment.PostedByUser || onePayment.postedByUsername) && (
                <div>
                  <p className="text-xs text-muted-foreground">Posted By</p>
                  <p className="text-sm font-medium">{onePayment.PostedByUser?.fullName || onePayment.postedByUsername}</p>
                </div>
              )}
            </div>

            {/* Rejection / Reversal alert boxes */}
            {onePayment.rejectionReason && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <Label className="text-sm text-red-800 font-semibold">Rejection Reason</Label>
                <p className="text-red-700 mt-1">{onePayment.rejectionReason}</p>
              </div>
            )}
            {onePayment.reversalReason && (
              <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                <Label className="text-sm text-orange-800 font-semibold">Reversal Reason</Label>
                <p className="text-orange-700 mt-1">{onePayment.reversalReason}</p>
              </div>
            )}

            {/* Print action buttons */}
            <div className="flex gap-2">
              {onePayment.status === "Posted" && (
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

            {/* Payment Lines */}
            {onePayment.lines && onePayment.lines.length > 0 && (
              <div>
                <Label className="text-base font-semibold mb-2 block">Payment Lines</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table className="text-xs">
                    <TableHeader className="bg-gray-100">
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Ledger Account</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {onePayment.lines.map((line: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="py-2">
                            <Badge variant={line.lineType === "Debit" ? "default" : "secondary"}>
                              {line.lineType}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">{line.ledgerAccount?.name || `Account #${line.ledgerAccountId}`}</TableCell>
                          <TableCell className="py-2 font-mono">{line.amount.toFixed(2)}</TableCell>
                          <TableCell className="py-2">{line.description || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {onePayment.paymentMethods && onePayment.paymentMethods.length > 0 && (
              <div>
                <Label className="text-base font-semibold mb-2 block">Payment Methods</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table className="text-xs">
                    <TableHeader className="bg-gray-100">
                      <TableRow>
                        <TableHead>Method</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reference / Details</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {onePayment.paymentMethods.map((method: any, index: number) => {
                        const isChq = method.paymentMethod?.toLowerCase().includes('cheque')
                        return (
                          <TableRow key={index}>
                            <TableCell className="py-2">
                              {method.paymentMethod}
                              {isChq && <Badge variant="outline" className="ml-2 text-[8px] bg-amber-50 text-amber-700 border-amber-200">CHEQUE</Badge>}
                            </TableCell>
                            <TableCell className="py-2">{method.ledgerAccount?.name || `Account #${method.ledgerAccountId}`}</TableCell>
                            <TableCell className="py-2 font-mono">{Number(method.amount).toFixed(2)}</TableCell>
                            <TableCell className="py-2">
                              <div className="flex flex-col gap-0.5">
                                {method.referenceNumber && <span className="text-[10px]"><span className="text-muted-foreground mr-1">Ref:</span> {method.referenceNumber}</span>}
                                {isChq && (
                                  <>
                                    {method.chequeNo && <span className="text-[10px]"><span className="text-muted-foreground mr-1">Chq#:</span> {method.chequeNo}</span>}
                                    {method.chequeDate && <span className="text-[10px] text-amber-700 italic">({new Date(method.chequeDate).toLocaleDateString()})</span>}
                                    {method.bankName && <span className="text-[10px] uppercase font-semibold text-blue-700">{method.bankName}</span>}
                                  </>
                                )}
                                {!method.referenceNumber && !isChq && <span className="text-muted-foreground">-</span>}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              {isChq && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] text-amber-600 border-amber-300 hover:bg-amber-50"
                                  title="Print Cheque"
                                  onClick={() => handlePrintCheque({
                                    payee: onePayment.description || "-",
                                    amount: parseFloat(method.amount?.toString() || "0"),
                                    chequeDate: method.chequeDate || onePayment.paymentDate,
                                    chequeNo: method.chequeNo,
                                    bankName: method.bankName,
                                    referenceNo: method.referenceNumber,
                                    documentNo: onePayment.paymentNumber,
                                    documentType: "One-Time Payment",
                                    preparedBy: onePayment.Creator?.fullName || onePayment.createdByUsername || undefined,
                                  })}
                                >
                                  <Printer className="h-3 w-3 mr-1" /> Cheque
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Workflow Actions Section */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-semibold">Payment Workflow</p>
              <div className="flex gap-2 flex-wrap">
                {onePayment.status === "Draft" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white" disabled={submitting}>Submit</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Submit Payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Submit this payment for approval.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
                          {submitting ? "Processing..." : "Submit"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {onePayment.status === "Submitted" && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" disabled={submitting}>Approve</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Payment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Approve this payment. Once approved, it can be posted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleApprove} disabled={submitting}>
                            {submitting ? "Processing..." : "Approve"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={submitting}>Reject</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Payment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <div className="space-y-2 mt-2">
                              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                              <Input
                                id="rejection-reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Enter reason for rejection"
                              />
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleReject} disabled={submitting || !rejectionReason.trim()} className="bg-red-600 hover:bg-red-700 text-white">
                            {submitting ? "Processing..." : "Reject"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" disabled={submitting}>
                          Approve & Post
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve & Post Payment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Approve this payment. Once approved, it will be posted to the accounting system.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleApproveAndPost}
                            disabled={submitting}
                          >
                            {submitting ? "Processing..." : "Approve & Post"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}

                {onePayment.status === "Approved" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white" disabled={submitting}>Post</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Post Payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Post this payment to the accounting system. This will create journal entries.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePost} disabled={submitting}>
                          {submitting ? "Processing..." : "Post"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {onePayment.status === "Posted" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50" disabled={submitting}>Reverse</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reverse Payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <div className="space-y-2 mt-2">
                            <Label htmlFor="reversal-reason">Reversal Reason *</Label>
                            <Input
                              id="reversal-reason"
                              value={reversalReason}
                              onChange={(e) => setReversalReason(e.target.value)}
                              placeholder="Enter reason for reversal"
                            />
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReverse} disabled={submitting || !reversalReason.trim()} className="bg-orange-600 hover:bg-orange-700 text-white">
                          {submitting ? "Reversing..." : "Reverse"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {onePayment.status === "Draft" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={submitting}>Cancel</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel this payment?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>No</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
                          {submitting ? "Processing..." : "Yes, Cancel"}
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
