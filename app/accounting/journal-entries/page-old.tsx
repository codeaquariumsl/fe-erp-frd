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
import { journalEntriesApi, JournalEntry } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye, Send, CheckCircle } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export default function JournalEntriesPage() {
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null)
  const [formData, setFormData] = useState({
    referenceNumber: "",
    journalDate: "",
    description: "",
    status: "Draft",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadJournals()
  }, [])

  const loadJournals = async () => {
    try {
      setLoading(true)
      const data = await journalEntriesApi.getAll()
      setJournals(Array.isArray(data) ? data : [])
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

  const resetForm = () => {
    setFormData({
      referenceNumber: "",
      journalDate: "",
      description: "",
      status: "Draft",
    })
    setSelectedJournal(null)
  }

  const handleCreateJournal = async () => {
    // Journal entries require complex nested structure with lines array
    // Create via dedicated journal entry creation endpoint
    toast({
      title: "Info",
      description: "Use the accounting module's full form to create journal entries with line items",
      variant: "default",
    })
    setIsCreateDialogOpen(false)
  }

  const handleDeleteJournal = async (id: number) => {
    try {
      await journalEntriesApi.delete(id)
      toast({
        title: "Success",
        description: "Journal entry deleted successfully",
      })
      loadJournals()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete journal entry",
        variant: "destructive",
      })
    }
  }

  const handleSubmitJournal = async (id: number) => {
    try {
      await journalEntriesApi.submit(id)
      toast({
        title: "Success",
        description: "Journal entry submitted successfully",
      })
      setIsViewDialogOpen(false)
      loadJournals()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit journal entry",
        variant: "destructive",
      })
    }
  }

  const handleApproveJournal = async (id: number) => {
    try {
      await journalEntriesApi.approve(id)
      toast({
        title: "Success",
        description: "Journal entry approved successfully",
      })
      setIsViewDialogOpen(false)
      loadJournals()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve journal entry",
        variant: "destructive",
      })
    }
  }

  const handleViewJournal = (journal: JournalEntry) => {
    setSelectedJournal(journal)
    setIsViewDialogOpen(true)
  }

  const filteredJournals = journals.filter(
    (journal) =>
      (journal.referenceNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (journal.description && journal.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "secondary"
      case "Submitted":
        return "outline"
      case "Approved":
        return "default"
      case "Posted":
        return "default"
      default:
        return "secondary"
    }
  }

  if (loading) {
    return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  return (
    <ERPLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Journal Entries</h1>
            <p className="text-muted-foreground mt-1">Create and manage journal entries with approval workflow</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Journal Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Journal Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="e.g., JE-001"
                  />
                </div>
                <div>
                  <Label htmlFor="journalDate">Journal Date</Label>
                  <Input
                    id="journalDate"
                    type="date"
                    value={formData.journalDate}
                    onChange={(e) => setFormData({ ...formData, journalDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <Button onClick={handleCreateJournal} className="w-full">Create Journal Entry</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            {/* <CardTitle>Journal Entries List</CardTitle> */}
            <CardDescription>All journal entries with approval status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search journal entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {filteredJournals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No journal entries found
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Journal #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJournals.map((journal) => (
                        <TableRow key={journal.id}>
                          <TableCell className="font-mono font-medium text-sm">{journal.journalNumber}</TableCell>
                          <TableCell className="text-sm">{new Date(journal.journalDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{journal.description || "-"}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{parseFloat(journal.totalDebit?.toString() || "0").toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{parseFloat(journal.totalCredit?.toString() || "0").toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(journal.status)} className="text-xs">
                              {journal.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleViewJournal(journal)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {journal.status === "Draft" && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleSubmitJournal(journal.id)}>
                                      <Send className="h-4 w-4 mr-2" />
                                      Submit for Approval
                                    </DropdownMenuItem>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                          onSelect={(e) => e.preventDefault()}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete "{journal.referenceNumber}"? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteJournal(journal.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                                {journal.status === "Submitted" && (
                                  <DropdownMenuItem onClick={() => handleApproveJournal(journal.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                )}
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

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Journal Entry - {selectedJournal?.journalNumber}</DialogTitle>
            </DialogHeader>
            {selectedJournal && (
              <div className="space-y-2">
                {/* Journal Info Section */}
                <div className="bg-accent p-4 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Journal Number</p>
                      <p className="font-mono font-semibold">{selectedJournal.journalNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={getStatusColor(selectedJournal.status)} className="mt-1">
                        {selectedJournal.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Journal Date</p>
                      <p className="font-semibold">{new Date(selectedJournal.journalDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reference</p>
                      <p className="font-mono text-sm">{selectedJournal.referenceNumber || "-"}</p>
                    </div>
                  </div>
                  {selectedJournal.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{selectedJournal.description}</p>
                    </div>
                  )}
                </div>

                {/* Journal Lines Section */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Journal Lines</h3>
                  {(selectedJournal.Lines && selectedJournal.Lines.length > 0) || (selectedJournal.lines && selectedJournal.lines.length > 0) ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>Ledger Account</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedJournal.Lines || selectedJournal.lines || []).map((line, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {line.LedgerAccount?.name || "Unknown"} <span className="text-xs text-muted-foreground">({line.LedgerAccount?.ledgerCode})</span>
                              </TableCell>
                              <TableCell className="text-right font-mono">{parseFloat(line.debitAmount?.toString() || "0").toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">{parseFloat(line.creditAmount?.toString() || "0").toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-slate-100 font-semibold">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right font-mono">{parseFloat(selectedJournal.totalDebit?.toString() || "0").toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono">{parseFloat(selectedJournal.totalCredit?.toString() || "0").toFixed(2)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg">
                      No line items found
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                  <div>
                    <p className="text-muted-foreground">Auto Posted</p>
                    <p className="font-medium">{selectedJournal.isAutoPosted ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reference Module</p>
                    <p className="font-medium">{selectedJournal.referenceModule || "-"}</p>
                  </div>
                </div>
                <DialogFooter>
                  {/* Action Buttons */}
                  <div className="flex gap-2 border-t pt-4">
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="flex-1">
                      Close
                    </Button>
                    {selectedJournal.status === "Draft" && (
                      <Button onClick={() => handleSubmitJournal(selectedJournal.id)} className="bg-blue-600 hover:bg-blue-700 flex-1">
                        Submit for Approval
                      </Button>
                    )}
                    {selectedJournal.status === "Submitted" && (
                      <Button onClick={() => handleApproveJournal(selectedJournal.id)} className="bg-green-600 hover:bg-green-700 flex-1">
                        Approve
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
