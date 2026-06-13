"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fundsTransfersApi, ledgerAccountsApi, FundsTransfer, LedgerAccount } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Eye } from "lucide-react"
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function FundsTransfersPage() {
  const [fundsTransfers, setFundsTransfers] = useState<FundsTransfer[]>([])
  const [bankAccounts, setBankAccounts] = useState<LedgerAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<FundsTransfer | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [reconciliationNotes, setReconciliationNotes] = useState("")
  const [formData, setFormData] = useState({
    transferDate: "",
    sourceBankAccountId: "",
    destinationBankAccountId: "",
    amount: "",
    description: "",
    referenceNumber: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadFundsTransfers()
    loadBankAccounts()
  }, [])

  const loadFundsTransfers = async () => {
    try {
      setLoading(true)
      const response = await fundsTransfersApi.getAll<any>()
      const data = (response as any)?.data || response
      setFundsTransfers(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load funds transfers",
        variant: "destructive",
      })
      setFundsTransfers([])
    } finally {
      setLoading(false)
    }
  }

  const loadBankAccounts = async () => {
    try {
      const response = await ledgerAccountsApi.getBankAccounts<LedgerAccount>()
      const accounts = (response as any)?.data || response
      setBankAccounts(Array.isArray(accounts) ? accounts : [])
    } catch (error: any) {
      console.error("Failed to load bank accounts:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      transferDate: "",
      sourceBankAccountId: "",
      destinationBankAccountId: "",
      amount: "",
      description: "",
      referenceNumber: "",
    })
  }

  const handleCreateFundsTransfer = async () => {
    if (!formData.transferDate || !formData.sourceBankAccountId || !formData.destinationBankAccountId || !formData.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    if (formData.sourceBankAccountId === formData.destinationBankAccountId) {
      toast({
        title: "Validation Error",
        description: "Source and destination accounts must be different",
        variant: "destructive",
      })
      return
    }

    try {
      setIsProcessing(true)
      await fundsTransfersApi.create({
        transferDate: formData.transferDate,
        sourceBankAccountId: parseInt(formData.sourceBankAccountId),
        destinationBankAccountId: parseInt(formData.destinationBankAccountId),
        amount: parseFloat(formData.amount),
        description: formData.description,
        referenceNumber: formData.referenceNumber,
      })
      toast({
        title: "Success",
        description: "Funds transfer created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadFundsTransfers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create funds transfer",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleViewTransfer = (transfer: FundsTransfer) => {
    setSelectedTransfer(transfer)
    setIsViewDialogOpen(true)
  }

  const handleSubmitTransfer = async (transferId: number) => {
    try {
      setIsProcessing(true)
      await fundsTransfersApi.submit(transferId)
      toast({
        title: "Success",
        description: "Funds transfer submitted successfully",
      })
      setIsViewDialogOpen(false)
      loadFundsTransfers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit funds transfer",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApproveTransfer = async (transferId: number) => {
    try {
      setIsProcessing(true)
      await fundsTransfersApi.approve(transferId)
      toast({
        title: "Success",
        description: "Funds transfer approved successfully",
      })
      setIsViewDialogOpen(false)
      loadFundsTransfers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve funds transfer",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePostTransfer = async (transferId: number) => {
    try {
      setIsProcessing(true)
      await fundsTransfersApi.post(transferId)
      toast({
        title: "Success",
        description: "Funds transfer posted successfully",
      })
      setIsViewDialogOpen(false)
      loadFundsTransfers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post funds transfer",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReconcileTransfer = async (transferId: number) => {
    try {
      setIsProcessing(true)
      await fundsTransfersApi.reconcile(transferId, { notes: reconciliationNotes })
      toast({
        title: "Success",
        description: "Funds transfer reconciled successfully",
      })
      setIsViewDialogOpen(false)
      setReconciliationNotes("")
      loadFundsTransfers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reconcile funds transfer",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
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
      Pending: "bg-yellow-50 text-yellow-700",
      Reconciled: "bg-green-50 text-green-700",
      Mismatched: "bg-orange-50 text-orange-700",
    }
    return colors[status || "Pending"] || "bg-gray-50 text-gray-700"
  }

  const filteredFundsTransfers = fundsTransfers.filter(
    (transfer) =>
      (statusFilter === "All" || transfer.status === statusFilter) &&
      (transfer.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  return (
    <ERPLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Funds Transfers</h1>
            <p className="text-muted-foreground mt-1">Manage inter-bank and inter-account transfers</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Funds Transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
              <DialogHeader className="pb-0">
                <DialogTitle className="text-xl">New Funds Transfer</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Transfer Information Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="transferDate" className="text-xs font-medium">Transfer Date *</Label>
                    <Input
                      id="transferDate"
                      type="date"
                      value={formData.transferDate}
                      onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount" className="text-xs font-medium">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="sourceAccount" className="text-xs font-medium">Source Account *</Label>
                    <Select value={formData.sourceBankAccountId} onValueChange={(value) => setFormData({ ...formData, sourceBankAccountId: value })}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select source account" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {bankAccounts.filter(a => a.status === "Active").map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.name} ({account.ledgerCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="destinationAccount" className="text-xs font-medium">Destination Account *</Label>
                    <Select value={formData.destinationBankAccountId} onValueChange={(value) => setFormData({ ...formData, destinationBankAccountId: value })}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select destination account" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {bankAccounts.filter(a => a.status === "Active").map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.name} ({account.ledgerCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="referenceNumber" className="text-xs font-medium">Reference Number</Label>
                    <Input
                      id="referenceNumber"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="Transfer reference"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs font-medium">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Transfer description"
                    className="h-9 text-sm"
                  />
                </div>

                {/* Summary Section */}
                {formData.amount && formData.sourceBankAccountId && formData.destinationBankAccountId && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">Transfer Amount</p>
                        <p className="font-bold text-sm text-blue-900 dark:text-blue-100">{parseFloat(formData.amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">From</p>
                        <p className="font-bold text-sm text-blue-900 dark:text-blue-100">
                          {bankAccounts.find(a => a.id.toString() === formData.sourceBankAccountId)?.name || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">To</p>
                        <p className="font-bold text-sm text-blue-900 dark:text-blue-100">
                          {bankAccounts.find(a => a.id.toString() === formData.destinationBankAccountId)?.name || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} size="sm" className="text-sm">
                  Cancel
                </Button>
                <Button onClick={handleCreateFundsTransfer} disabled={isProcessing || !formData.transferDate || !formData.sourceBankAccountId || !formData.destinationBankAccountId || !formData.amount} size="sm" className="text-sm">
                  {isProcessing ? "Creating..." : "Create Transfer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardDescription>All inter-bank and inter-account transfers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search transfers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Posted">Posted</SelectItem>
                    <SelectItem value="Reconciled">Reconciled</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredFundsTransfers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No funds transfers found
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer #</TableHead>
                        <TableHead>Transfer Date</TableHead>
                        <TableHead>From Account</TableHead>
                        <TableHead>To Account</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reconciliation</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFundsTransfers.map((transfer) => (
                        <TableRow key={transfer.id}>
                          <TableCell className="font-mono text-sm">{transfer.transferNumber}</TableCell>
                          <TableCell className="text-sm">{new Date(transfer.transferDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm">{(transfer.sourceBankAccount?.name || transfer.SourceBankAccount?.name) || "-"}</TableCell>
                          <TableCell className="text-sm">{(transfer.destinationBankAccount?.name || transfer.DestinationBankAccount?.name) || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">{parseFloat(transfer.amount?.toString() || "0").toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={`capitalize ${getStatusColor(transfer.status)}`}>
                              {transfer.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`capitalize ${getReconciliationColor(transfer.reconciliationStatus)}`}>
                              {transfer.reconciliationStatus || "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewTransfer(transfer)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* View Funds Transfer Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
            <DialogHeader className="pb-0">
              <DialogTitle className="text-xl">Funds Transfer Details</DialogTitle>
            </DialogHeader>

            {selectedTransfer && (
              <div className="space-y-4">
                {/* Transfer Info Card */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                  <div>
                    <p className="text-xs text-muted-foreground">Transfer Number</p>
                    <p className="font-mono font-bold text-sm">{selectedTransfer.transferNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={`capitalize ${getStatusColor(selectedTransfer.status)}`}>
                      {selectedTransfer.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Transfer Date</p>
                    <p className="text-sm">{new Date(selectedTransfer.transferDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="font-mono font-bold text-sm">{parseFloat(selectedTransfer.amount?.toString() || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">From Account</p>
                    <p className="text-sm font-semibold">{(selectedTransfer.sourceBankAccount?.name || selectedTransfer.SourceBankAccount?.name) || "-"}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {(selectedTransfer.sourceBankAccount?.accountNumber || selectedTransfer.SourceBankAccount?.accountNumber) || (selectedTransfer.sourceBankAccount?.ledgerCode || selectedTransfer.SourceBankAccount?.ledgerCode)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(selectedTransfer.sourceBankAccount?.Bank?.name || selectedTransfer.SourceBankAccount?.Bank?.name)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">To Account</p>
                    <p className="text-sm font-semibold">{(selectedTransfer.destinationBankAccount?.name || selectedTransfer.DestinationBankAccount?.name) || "-"}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {(selectedTransfer.destinationBankAccount?.accountNumber || selectedTransfer.DestinationBankAccount?.accountNumber) || (selectedTransfer.destinationBankAccount?.ledgerCode || selectedTransfer.DestinationBankAccount?.ledgerCode)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(selectedTransfer.destinationBankAccount?.Bank?.name || selectedTransfer.DestinationBankAccount?.Bank?.name)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reconciliation Status</p>
                    <Badge className={`capitalize ${getReconciliationColor(selectedTransfer.reconciliationStatus)}`}>
                      {selectedTransfer.reconciliationStatus || "Pending"}
                    </Badge>
                  </div>
                  {selectedTransfer.Creator && (
                    <div className="col-span-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Created By</p>
                      <p className="text-xs font-medium">{selectedTransfer.Creator.fullName} ({selectedTransfer.Creator.email})</p>
                    </div>
                  )}
                </div>

                {selectedTransfer.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedTransfer.description}</p>
                  </div>
                )}

                {selectedTransfer.referenceNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Reference Number</p>
                    <p className="text-sm">{selectedTransfer.referenceNumber}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-semibold">Transfer Workflow</p>
                  <div className="flex gap-2 flex-wrap">
                    {/* Draft -> Submitted: Submit Button */}
                    {selectedTransfer.status === "Draft" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                            Submit
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Submit Funds Transfer?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Submit this funds transfer for approval. Once submitted, it will require approval before posting.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleSubmitTransfer(selectedTransfer.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? "Processing..." : "Submit"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Submitted -> Approved: Approve Button */}
                    {selectedTransfer.status === "Submitted" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                            Approve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve Funds Transfer?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Approve this funds transfer. Once approved, it can be posted to the accounting system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleApproveTransfer(selectedTransfer.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? "Processing..." : "Approve"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Approved -> Posted: Post Button */}
                    {selectedTransfer.status === "Approved" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white">
                            Post
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Post Funds Transfer?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Post this funds transfer to the accounting system. This will record the transfer in the ledger.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePostTransfer(selectedTransfer.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? "Processing..." : "Post"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Posted -> Reconciled: Reconcile Button */}
                    {selectedTransfer.status === "Posted" && selectedTransfer.reconciliationStatus !== "Reconciled" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white">
                            Reconcile
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reconcile Funds Transfer?</AlertDialogTitle>
                            <AlertDialogDescription>
                              <div className="space-y-2 mt-2">
                                <p>Confirm that this funds transfer has been successfully reconciled with bank records.</p>
                                <div>
                                  <Label htmlFor="reconciliation-notes" className="text-xs font-medium">Reconciliation Notes</Label>
                                  <Input
                                    id="reconciliation-notes"
                                    value={reconciliationNotes}
                                    onChange={(e) => setReconciliationNotes(e.target.value)}
                                    placeholder="Enter reconciliation notes"
                                    className="h-8 text-sm mt-1"
                                  />
                                </div>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleReconcileTransfer(selectedTransfer.id)}
                              disabled={isProcessing}
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              {isProcessing ? "Reconciling..." : "Reconcile"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} size="sm" className="text-sm">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
