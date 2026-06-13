"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { fundsTransfersApi, FundsTransfer } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ERPLayout } from "@/components/layouts/erp-layout"
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

interface FundsTransferDetailsProps {
  params: Promise<{ id: string }>
}

export default function FundsTransferDetails({ params }: FundsTransferDetailsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = use(params)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showReconcileDialog, setShowReconcileDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancellationReason, setCancellationReason] = useState("")
  const [fundsTransfer, setFundsTransfer] = useState<FundsTransfer | null>(null)

  useEffect(() => {
    loadFundsTransfer()
  }, [resolvedParams.id])

  const loadFundsTransfer = async () => {
    try {
      setLoading(true)
      const response = await fundsTransfersApi.getById<any>(resolvedParams.id)
      const data = response?.data || response
      setFundsTransfer(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load funds transfer",
        variant: "destructive",
      })
      router.push("/accounting/funds-transfers")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!fundsTransfer) return
    try {
      setSubmitting(true)
      await fundsTransfersApi.submit(fundsTransfer.id)
      toast({
        title: "Success",
        description: "Funds transfer submitted for approval",
      })
      loadFundsTransfer()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit funds transfer",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    if (!fundsTransfer) return
    try {
      setSubmitting(true)
      await fundsTransfersApi.approve(fundsTransfer.id)
      toast({
        title: "Success",
        description: "Funds transfer approved",
      })
      loadFundsTransfer()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve funds transfer",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePost = async () => {
    if (!fundsTransfer) return
    try {
      setSubmitting(true)
      await fundsTransfersApi.post(fundsTransfer.id)
      toast({
        title: "Success",
        description: "Funds transfer posted with journal created",
      })
      loadFundsTransfer()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post funds transfer",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReconcile = async () => {
    if (!fundsTransfer) return
    try {
      setSubmitting(true)
      await fundsTransfersApi.reconcile(fundsTransfer.id, {
        reconciliationDate: new Date().toISOString().split('T')[0]
      })
      toast({
        title: "Success",
        description: "Funds transfer reconciled successfully",
      })
      setShowReconcileDialog(false)
      loadFundsTransfer()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reconcile funds transfer",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!fundsTransfer || !cancellationReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a cancellation reason",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      await fundsTransfersApi.cancel(fundsTransfer.id, { cancellationReason })
      toast({
        title: "Success",
        description: "Funds transfer cancelled successfully",
      })
      setShowCancelDialog(false)
      setCancellationReason("")
      loadFundsTransfer()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel funds transfer",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!fundsTransfer) {
    return <div>Funds transfer not found</div>
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      Draft: "bg-gray-100 text-gray-800",
      Submitted: "bg-blue-100 text-blue-800",
      Approved: "bg-green-100 text-green-800",
      Posted: "bg-purple-100 text-purple-800",
      Reconciled: "bg-green-200 text-green-900",
      Cancelled: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const getReconciliationColor = (status?: string) => {
    const colors: { [key: string]: string } = {
      Pending: "bg-yellow-100 text-yellow-800",
      Reconciled: "bg-green-100 text-green-800",
      Mismatched: "bg-orange-100 text-orange-800",
    }
    return colors[status || "Pending"] || "bg-gray-100 text-gray-800"
  }

  const canSubmit = fundsTransfer.status === "Draft"
  const canApprove = fundsTransfer.status === "Submitted"
  const canPost = fundsTransfer.status === "Approved"
  const canReconcile = fundsTransfer.status === "Posted"
  const canCancel = fundsTransfer.status === "Draft" || fundsTransfer.status === "Submitted"

  return (
    <ERPLayout>
      <div className="space-y-4">
        <Link href="/accounting/funds-transfers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Funds Transfer Details</CardTitle>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Transfer Number:</span>
                  <span className="font-mono text-sm font-semibold">{fundsTransfer.transferNumber}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className={`capitalize ${getStatusColor(fundsTransfer.status)}`}>
                  {fundsTransfer.status}
                </Badge>
                <Badge className={`capitalize ${getReconciliationColor(fundsTransfer.reconciliationStatus)}`}>
                  {fundsTransfer.reconciliationStatus || "Pending"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Summary Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-accent/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Transfer Date</Label>
                  <p className="font-medium">{new Date(fundsTransfer.transferDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <p className="font-mono font-semibold">{parseFloat(fundsTransfer.amount?.toString() || "0").toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Reference</Label>
                  <p className="font-mono text-sm">{fundsTransfer.referenceNumber || "-"}</p>
                </div>
              </div>

              {/* Transfer Details */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Source Account</Label>
                    <div className="mt-2 p-3 bg-gray-50 rounded">
                      <p className="font-medium">{(fundsTransfer.sourceBankAccount?.name || fundsTransfer.SourceBankAccount?.name) || "-"}</p>
                      <p className="text-sm text-muted-foreground font-mono">{(fundsTransfer.sourceBankAccount?.accountNumber || fundsTransfer.SourceBankAccount?.accountNumber) || (fundsTransfer.sourceBankAccount?.ledgerCode || fundsTransfer.SourceBankAccount?.ledgerCode)}</p>
                      <p className="text-sm text-muted-foreground">{(fundsTransfer.sourceBankAccount?.Bank?.name || fundsTransfer.SourceBankAccount?.Bank?.name)}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Destination Account</Label>
                    <div className="mt-2 p-3 bg-blue-50 rounded">
                      <p className="font-medium">{(fundsTransfer.destinationBankAccount?.name || fundsTransfer.DestinationBankAccount?.name) || "-"}</p>
                      <p className="text-sm text-muted-foreground font-mono">{(fundsTransfer.destinationBankAccount?.accountNumber || fundsTransfer.DestinationBankAccount?.accountNumber) || (fundsTransfer.destinationBankAccount?.ledgerCode || fundsTransfer.DestinationBankAccount?.ledgerCode)}</p>
                      <p className="text-sm text-muted-foreground">{(fundsTransfer.destinationBankAccount?.Bank?.name || fundsTransfer.DestinationBankAccount?.Bank?.name)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount and Description */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div>
                  <Label className="text-sm text-muted-foreground">Transfer Amount</Label>
                  <p className="font-mono font-semibold text-lg mt-1">{parseFloat(fundsTransfer.amount?.toString() || "0").toFixed(2)}</p>
                </div>
                {fundsTransfer.description && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Description</Label>
                    <p className="mt-1">{fundsTransfer.description}</p>
                  </div>
                )}
              </div>

              {/* Reconciliation Info */}
              {fundsTransfer.reconciliationDate && (
                <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <Label className="text-sm text-green-800 font-semibold">Reconciliation Date</Label>
                  <p className="text-green-700 mt-1">{new Date(fundsTransfer.reconciliationDate).toLocaleDateString()}</p>
                </div>
              )}

              {/* Cancellation Reason */}
              {fundsTransfer.cancellationReason && (
                <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                  <Label className="text-sm text-red-800 font-semibold">Cancellation Reason</Label>
                  <p className="text-red-700 mt-1">{fundsTransfer.cancellationReason}</p>
                </div>
              )}

              {/* Workflow Actions */}
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
                {canReconcile && (
                  <AlertDialog open={showReconcileDialog} onOpenChange={setShowReconcileDialog}>
                    <Button
                      variant="outline"
                      disabled={submitting}
                      onClick={() => setShowReconcileDialog(true)}
                    >
                      Reconcile Transfer
                    </Button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reconcile Funds Transfer</AlertDialogTitle>
                        <AlertDialogDescription>
                          Mark this transfer as reconciled once confirmed in both bank accounts.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleReconcile}
                          disabled={submitting}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Reconcile Now
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {canCancel && (
                  <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                    <Button
                      variant="destructive"
                      disabled={submitting}
                      onClick={() => setShowCancelDialog(true)}
                    >
                      Cancel Transfer
                    </Button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Funds Transfer</AlertDialogTitle>
                        <AlertDialogDescription>
                          Enter the reason for cancelling this transfer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Textarea
                        placeholder="Reason for cancellation..."
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                        disabled={submitting}
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancel}
                          disabled={submitting || !cancellationReason.trim()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Cancel Transfer
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
