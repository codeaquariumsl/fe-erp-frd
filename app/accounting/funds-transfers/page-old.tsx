"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fundsTransfersApi, ledgerAccountsApi, FundsTransfer, LedgerAccount } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye } from "lucide-react"
import Link from "next/link"

export default function FundsTransfersPage() {
  const [fundsTransfers, setFundsTransfers] = useState<FundsTransfer[]>([])
  const [bankAccounts, setBankAccounts] = useState<LedgerAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Funds Transfer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="transferDate">Transfer Date *</Label>
                  <Input
                    id="transferDate"
                    type="date"
                    value={formData.transferDate}
                    onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sourceAccount">Source Account *</Label>
                  <Select value={formData.sourceBankAccountId} onValueChange={(value) => setFormData({ ...formData, sourceBankAccountId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.filter(a => a.status === "Active").map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name} ({account.ledgerCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="destinationAccount">Destination Account *</Label>
                  <Select value={formData.destinationBankAccountId} onValueChange={(value) => setFormData({ ...formData, destinationBankAccountId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.filter(a => a.status === "Active").map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name} ({account.ledgerCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="Transfer reference"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Transfer description"
                  />
                </div>
                <Button onClick={handleCreateFundsTransfer} className="w-full">
                  Create Funds Transfer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            {/* <CardTitle>Funds Transfers List</CardTitle> */}
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/accounting/funds-transfers/${transfer.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
      </div>
    </ERPLayout>
  )
}
