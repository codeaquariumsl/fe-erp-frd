"use client"

import { useState, useEffect } from "react"
import { Plus, ChevronLeft, ChevronRight, Trash2, X, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { journalEntriesApi, JournalEntry, ledgerAccountsApi, LedgerAccount } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Eye } from "lucide-react"
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { LedgerSelect } from "@/components/accounting/ledger-select"

interface PaginationData {
  total: number
  page: number
  limit: number
  pages: number
}

interface JournalLine {
  ledgerAccountId: number
  debitAmount: number
  creditAmount: number
  description?: string
}

export default function JournalEntriesPage() {
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 10, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null)

  // Create Journal Entry states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([])
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [journalLines, setJournalLines] = useState<JournalLine[]>([
    { ledgerAccountId: 0, debitAmount: 0, creditAmount: 0, description: "" }
  ])
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingJournalId, setEditingJournalId] = useState<number | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    loadJournals(1)
    loadLedgerAccounts()
  }, [])

  const loadJournals = async (page: number = 1) => {
    try {
      setLoading(true)
      const response = await journalEntriesApi.getAll(page, 10)
      if (response && typeof response === 'object' && 'data' in response) {
        setJournals(Array.isArray(response.data) ? response.data : [])
        if ('pagination' in response) {
          setPagination(response.pagination as PaginationData)
        }
      } else {
        setJournals(Array.isArray(response) ? response : [])
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load journal entries",
        variant: "destructive",
      })
      setJournals([])
    } finally {
      setLoading(false)
    }
  }

  const loadLedgerAccounts = async () => {
    try {
      const response = await ledgerAccountsApi.getAllAccounts()
      setLedgerAccounts(Array.isArray(response) ? response : (response as any)?.data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load ledger accounts",
        variant: "destructive",
      })
    }
  }

  const handleAddLine = () => {
    setJournalLines([...journalLines, { ledgerAccountId: 0, debitAmount: 0, creditAmount: 0, description: "" }])
  }

  const handleRemoveLine = (index: number) => {
    if (journalLines.length > 1) {
      setJournalLines(journalLines.filter((_, i) => i !== index))
    }
  }

  const handleLineChange = (index: number, field: keyof JournalLine, value: number) => {
    const updatedLines = [...journalLines]
    updatedLines[index] = { ...updatedLines[index], [field]: value }
    setJournalLines(updatedLines)
  }

  const calculateTotals = () => {
    const totalDebit = journalLines.reduce((sum, line) => sum + (line.debitAmount || 0), 0)
    const totalCredit = journalLines.reduce((sum, line) => sum + (line.creditAmount || 0), 0)
    return { totalDebit, totalCredit }
  }

  const isBalanced = () => {
    const { totalDebit, totalCredit } = calculateTotals()
    return Math.abs(totalDebit - totalCredit) < 0.01 // Allow for small floating point differences
  }

  const resetCreateForm = () => {
    setJournalDate(new Date().toISOString().split('T')[0])
    setDescription("")
    setReferenceNumber("")
    setJournalLines([{ ledgerAccountId: 0, debitAmount: 0, creditAmount: 0, description: "" }])
    setIsEditMode(false)
    setEditingJournalId(null)
  }

  const handleEditClick = (journal: JournalEntry) => {
    setEditingJournalId(journal.id)
    setIsEditMode(true)
    setJournalDate(journal.journalDate.split('T')[0])
    setDescription(journal.description || "")
    setReferenceNumber(journal.referenceNumber || "")

    const lines = journal.Lines || journal.lines || []
    if (lines.length > 0) {
      setJournalLines(lines.map(l => ({
        ledgerAccountId: l.ledgerAccountId,
        debitAmount: parseFloat(l.debitAmount.toString()),
        creditAmount: parseFloat(l.creditAmount.toString()),
        description: l.description || ""
      })))
    } else {
      setJournalLines([{ ledgerAccountId: 0, debitAmount: 0, creditAmount: 0, description: "" }])
    }

    setIsCreateDialogOpen(true)
    setIsViewDialogOpen(false)
  }

  const handleCreateJournal = async () => {
    try {
      // Validation
      if (!journalDate) {
        toast({
          title: "Validation Error",
          description: "Please select a journal date",
          variant: "destructive",
        })
        return
      }

      if (journalLines.length === 0 || journalLines.every(line => line.ledgerAccountId === 0)) {
        toast({
          title: "Validation Error",
          description: "Please add at least one journal line with a ledger account",
          variant: "destructive",
        })
        return
      }

      if (!isBalanced()) {
        toast({
          title: "Validation Error",
          description: "Journal entry is not balanced. Total debits must equal total credits",
          variant: "destructive",
        })
        return
      }

      setIsProcessing(true)

      const { totalDebit, totalCredit } = calculateTotals()

      const payload = {
        journalDate,
        description,
        referenceNumber,
        lines: journalLines.filter(line => line.ledgerAccountId > 0),
        status: "Draft",
        referenceModule: "MANUAL",
        totalDebit,
        totalCredit,
        isAutoPosted: false
      }

      if (isEditMode && editingJournalId) {
        await journalEntriesApi.update(editingJournalId, payload as any)
        toast({
          title: "Success",
          description: "Journal entry updated successfully",
        })
      } else {
        await journalEntriesApi.create(payload as any)
        toast({
          title: "Success",
          description: "Journal entry created successfully",
        })
      }

      setIsCreateDialogOpen(false)
      resetCreateForm()
      loadJournals(pagination.page)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} journal entry`,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleViewJournal = (journal: JournalEntry) => {
    setSelectedJournal(journal)
    setIsViewDialogOpen(true)
  }

  const handleSubmitJournal = async (id: number) => {
    try {
      setIsProcessing(true)
      await journalEntriesApi.submit(id)
      toast({
        title: "Success",
        description: "Journal entry submitted successfully",
      })
      setIsViewDialogOpen(false)
      loadJournals(pagination.page)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit journal entry",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApproveJournal = async (id: number) => {
    try {
      setIsProcessing(true)
      await journalEntriesApi.approve(id)
      toast({
        title: "Success",
        description: "Journal entry approved successfully",
      })
      setIsViewDialogOpen(false)
      loadJournals(pagination.page)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve journal entry",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApproveAndPostJournal = async (id: number) => {
    try {
      setIsProcessing(true)
      await journalEntriesApi.approveAndPost(id)
      toast({
        title: "Success",
        description: "Journal entry approved and posted successfully",
      })
      setIsViewDialogOpen(false)
      loadJournals(pagination.page)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve and post journal entry",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePostJournal = async (id: number) => {
    try {
      setIsProcessing(true)
      await journalEntriesApi.post(id)
      toast({
        title: "Success",
        description: "Journal entry posted successfully",
      })
      setIsViewDialogOpen(false)
      loadJournals(pagination.page)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post journal entry",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredJournals = journals.filter((journal) => {
    const matchesSearch =
      (journal.referenceNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (journal.description && journal.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (journal.journalNumber && journal.journalNumber.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === "All" || journal.status === statusFilter

    return matchesSearch && matchesStatus
  })

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

  if (loading) {
    return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  return (
    <ERPLayout>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Journal Entries</h1>
            <p className="text-muted-foreground mt-1">Create and manage journal entries with approval workflow</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Journal Entry
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditMode ? 'Edit Journal Entry' : 'Create Journal Entry'}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Journal Header Information */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="journalDate">Journal Date *</Label>
                    <Input
                      id="journalDate"
                      type="date"
                      value={journalDate}
                      onChange={(e) => setJournalDate(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Enter journal entry description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    placeholder="Enter reference number (optional)"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>

                {/* Journal Lines */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Journal Lines *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddLine}
                      disabled={isProcessing}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Line
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-100">
                        <TableRow>
                          <TableHead className="w-[30%]">Ledger Account</TableHead>
                          <TableHead className="w-[30%]">Description</TableHead>
                          <TableHead className="w-[15%] text-right">Debit</TableHead>
                          <TableHead className="w-[15%] text-right">Credit</TableHead>
                          <TableHead className="w-[10%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {journalLines.map((line, index) => (
                          <TableRow key={index}>
                            <TableCell className="py-2">
                              <LedgerSelect
                                value={line.ledgerAccountId.toString()}
                                onValueChange={(value) => handleLineChange(index, 'ledgerAccountId', parseInt(value))}
                                ledgers={ledgerAccounts}
                                disabled={isProcessing}
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                placeholder="Line description..."
                                value={line.description || ''}
                                onChange={(e) => {
                                  const updatedLines = [...journalLines]
                                  updatedLines[index] = { ...updatedLines[index], description: e.target.value }
                                  setJournalLines(updatedLines)
                                }}
                                disabled={isProcessing}
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={line.debitAmount || ''}
                                onChange={(e) => handleLineChange(index, 'debitAmount', parseFloat(e.target.value) || 0)}
                                disabled={isProcessing}
                                className="text-right"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={line.creditAmount || ''}
                                onChange={(e) => handleLineChange(index, 'creditAmount', parseFloat(e.target.value) || 0)}
                                disabled={isProcessing}
                                className="text-right"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLine(index)}
                                disabled={isProcessing || journalLines.length === 1}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Totals Row */}
                        <TableRow className="bg-slate-100 font-semibold">
                          <TableCell colSpan={2}>Total</TableCell>
                          <TableCell className="text-right">
                            {calculateTotals().totalDebit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {calculateTotals().totalCredit.toFixed(2)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Balance Indicator */}
                  <div className={`p-3 rounded-md text-sm ${isBalanced() ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {isBalanced() ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">✓ Balanced</span>
                        <span>- Debits equal Credits</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">✗ Not Balanced</span>
                        <span>- Difference: {Math.abs(calculateTotals().totalDebit - calculateTotals().totalCredit).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    resetCreateForm()
                  }}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateJournal}
                  disabled={isProcessing || !isBalanced()}
                >
                  {isProcessing ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Journal Entry" : "Create Journal Entry")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          {/* <CardHeader>
            <CardDescription>All journal entries with approval status</CardDescription>
          </CardHeader> */}
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search journal entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="All">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Approved">Approved</option>
                  <option value="Posted">Posted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {filteredJournals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No journal entries found
                </div>
              ) : (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Journal #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead>Reference Module</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJournals.map((journal) => (
                          <TableRow key={journal.id}>
                            <TableCell className="py-2 font-mono font-medium text-sm">{journal.journalNumber}</TableCell>
                            <TableCell className="py-2 text-sm">{new Date(journal.journalDate).toLocaleDateString()}</TableCell>
                            <TableCell className="py-2 text-sm text-muted-foreground max-w-xs truncate">{journal.description || "-"}</TableCell>
                            <TableCell className="py-2 text-right font-mono text-sm">{parseFloat(journal.totalDebit?.toString() || "0").toFixed(2)}</TableCell>
                            <TableCell className="py-2 text-right font-mono text-sm">{parseFloat(journal.totalCredit?.toString() || "0").toFixed(2)}</TableCell>
                            <TableCell className="py-2 text-sm">{journal.referenceModule || "-"}</TableCell>
                            <TableCell className="py-2">
                              <Badge className={`capitalize ${getStatusColor(journal.status)}`}>
                                {journal.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 text-right flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleViewJournal(journal)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(journal.status === "Draft" || journal.status === "Submitted") && (
                                <Button variant="ghost" size="sm" onClick={() => handleEditClick(journal)}>
                                  <Edit className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between py-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadJournals(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={page === pagination.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => loadJournals(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadJournals(pagination.page + 1)}
                        disabled={pagination.page >= pagination.pages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* View Journal Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
            <DialogHeader className="pb-0">
              <DialogTitle className="text-xl">Journal Entry Details</DialogTitle>
            </DialogHeader>

            {selectedJournal && (
              <div className="space-y-4">
                {/* Journal Info Card */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                  <div>
                    <p className="text-xs text-muted-foreground">Journal Number</p>
                    <p className="font-mono font-bold text-sm">{selectedJournal.journalNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={`capitalize ${getStatusColor(selectedJournal.status)}`}>
                      {selectedJournal.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Journal Date</p>
                    <p className="text-sm">{new Date(selectedJournal.journalDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reference Module</p>
                    <p className="text-sm font-semibold">{selectedJournal.referenceModule || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Debit</p>
                    <p className="font-mono font-bold text-sm">{parseFloat(selectedJournal.totalDebit?.toString() || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Credit</p>
                    <p className="font-mono font-bold text-sm">{parseFloat(selectedJournal.totalCredit?.toString() || "0").toFixed(2)}</p>
                  </div>
                </div>

                {selectedJournal.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedJournal.description}</p>
                  </div>
                )}

                {selectedJournal.referenceNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Reference Number</p>
                    <p className="text-sm">{selectedJournal.referenceNumber}</p>
                  </div>
                )}

                {/* Journal Lines Section */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Journal Lines</h3>
                  {(selectedJournal.Lines && selectedJournal.Lines.length > 0) || (selectedJournal.lines && selectedJournal.lines.length > 0) ? (
                    <div className="border rounded-md overflow-hidden">
                      <Table className="text-xs">
                        <TableHeader className="bg-slate-100 dark:bg-slate-800">
                          <TableRow>
                            <TableHead className="font-semibold">Ledger Account</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="text-right font-semibold">Debit</TableHead>
                            <TableHead className="text-right font-semibold">Credit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedJournal.Lines || selectedJournal.lines || []).map((line, index) => (
                            <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                              <TableCell className="font-medium py-1">
                                {line.LedgerAccount?.name || "Unknown"}
                                <span className="text-xs text-muted-foreground ml-1">({line.LedgerAccount?.ledgerCode})</span>
                              </TableCell>
                              <TableCell className="py-1 text-xs text-muted-foreground">{line.description || "-"}</TableCell>
                              <TableCell className="text-right font-mono py-1 text-xs">{parseFloat(line.debitAmount?.toString() || "0").toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono py-1 text-xs">{parseFloat(line.creditAmount?.toString() || "0").toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-slate-100 dark:bg-slate-800 font-semibold">
                            <TableCell colSpan={2} className="py-1">Total</TableCell>
                            <TableCell className="text-right font-mono py-1 text-xs">{parseFloat(selectedJournal.totalDebit?.toString() || "0").toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono py-1 text-xs">{parseFloat(selectedJournal.totalCredit?.toString() || "0").toFixed(2)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-md">
                      No line items found
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                {(selectedJournal.isAutoPosted || selectedJournal.Creator) && (
                  <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 dark:bg-slate-900 p-3 rounded-md border-t">
                    {selectedJournal.isAutoPosted && (
                      <div>
                        <p className="text-xs text-muted-foreground">Auto Posted</p>
                        <p className="font-medium">Yes</p>
                      </div>
                    )}
                    {selectedJournal.Creator && (
                      <div>
                        <p className="text-xs text-muted-foreground">Created By</p>
                        <p className="font-medium text-xs">{selectedJournal.Creator.fullName}</p>
                      </div>
                    )}
                    {selectedJournal.ApprovedByUser && (
                      <div>
                        <p className="text-xs text-muted-foreground">Approved By</p>
                        <p className="font-medium text-xs">{selectedJournal.ApprovedByUser.fullName}</p>
                      </div>
                    )}
                    {selectedJournal.PostedByUser && (
                      <div>
                        <p className="text-xs text-muted-foreground">Posted By</p>
                        <p className="font-medium text-xs">{selectedJournal.PostedByUser.fullName}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {(selectedJournal.status === "Draft" || selectedJournal.status === "Submitted" || selectedJournal.status === "Approved") && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-semibold">Journal Workflow</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedJournal.status === "Draft" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                              Submit
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Submit Journal Entry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Submit this journal entry for approval. Once submitted, it will require approval before posting.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleSubmitJournal(selectedJournal.id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? "Processing..." : "Submit"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {selectedJournal.status === "Submitted" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                              Approve
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve Journal Entry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Approve this journal entry. Once approved, it will be posted to the accounting system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleApproveJournal(selectedJournal.id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? "Processing..." : "Approve"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {selectedJournal.status === "Submitted" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                              Approve & Post
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve & Post Journal Entry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Approve this journal entry. Once approved, it will be posted to the accounting system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleApproveAndPostJournal(selectedJournal.id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? "Processing..." : "Approve & Post"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {selectedJournal.status === "Approved" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                              Post
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Post Journal Entry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Post this journal entry. Once posted, it will be available in the accounting system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handlePostJournal(selectedJournal.id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? "Processing..." : "Post"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {(selectedJournal.status === "Draft" || selectedJournal.status === "Submitted") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-300 text-blue-700 hover:bg-blue-100"
                          onClick={() => handleEditClick(selectedJournal)}
                          disabled={isProcessing}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Journal
                        </Button>
                      )}
                    </div>
                  </div>
                )}
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
