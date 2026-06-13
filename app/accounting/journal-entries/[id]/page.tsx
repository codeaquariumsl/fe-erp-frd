"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  journalEntriesApi,
  ledgerAccountsApi,
  JournalEntry,
  JournalEntryLine,
  LedgerAccount,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ArrowLeft, Trash2, Plus } from "lucide-react"
import { LedgerSelect } from "@/components/accounting/ledger-select"

interface JournalFormProps {
  params: Promise<{ id: string }>
}

export default function JournalForm({ params }: JournalFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const [loading, setLoading] = useState(!!id && id !== "new")
  const [submitting, setSubmitting] = useState(false)
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([])
  const [formData, setFormData] = useState<Partial<JournalEntry>>({
    journalDate: new Date().toISOString().split('T')[0],
    description: "",
    referenceModule: "MANUAL",
    lines: [],
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const ledgerData = await ledgerAccountsApi.getAllAccounts()
      setLedgers(Array.isArray(ledgerData) ? ledgerData : [])

      if (id && id !== "new") {
        const journal = await journalEntriesApi.getById(id)
        setFormData(journal)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddLine = () => {
    const newLine: Partial<JournalEntryLine> = {
      ledgerAccountId: undefined,
      debitAmount: 0,
      creditAmount: 0,
      description: "",
      lineNumber: (formData.lines?.length || 0) + 1,
    }
    setFormData({
      ...formData,
      lines: [...(formData.lines || []), newLine],
    })
  }

  const handleRemoveLine = (index: number) => {
    setFormData({
      ...formData,
      lines: formData.lines?.filter((_, i) => i !== index) || [],
    })
  }

  const handleUpdateLine = (index: number, field: keyof JournalEntryLine, value: any) => {
    const updatedLines = [...(formData.lines || [])]
    updatedLines[index] = {
      ...updatedLines[index],
      [field]: value,
    }
    setFormData({
      ...formData,
      lines: updatedLines,
    })
  }

  const calculateTotals = () => {
    const lines = formData.lines || []
    return {
      totalDebit: lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0),
      totalCredit: lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0),
    }
  }

  const { totalDebit, totalCredit } = calculateTotals()
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.journalDate) {
      toast({
        title: "Validation Error",
        description: "Journal date is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.lines || formData.lines.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one journal line is required",
        variant: "destructive",
      })
      return
    }

    if (!isBalanced) {
      toast({
        title: "Validation Error",
        description: `Journal is not balanced. Debit (${totalDebit.toFixed(2)}) must equal Credit (${totalCredit.toFixed(2)})`,
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        totalDebit,
        totalCredit,
      }

      if (id && id !== "new") {
        await journalEntriesApi.update(id, payload)
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
      router.push("/accounting/journal-entries")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save journal entry",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      <Link href="/accounting/journal-entries">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            {id && id !== "new" ? "Edit Journal Entry" : "Create Journal Entry"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="journalDate">Journal Date *</Label>
                <Input
                  id="journalDate"
                  type="date"
                  value={formData.journalDate || ""}
                  onChange={(e) => setFormData({ ...formData, journalDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenceModule">Reference Module</Label>
                <Select value={formData.referenceModule || "MANUAL"} onValueChange={(value) => setFormData({ ...formData, referenceModule: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="SALES">Sales</SelectItem>
                    <SelectItem value="PURCHASE">Purchase</SelectItem>
                    <SelectItem value="INVENTORY">Inventory</SelectItem>
                    <SelectItem value="PAYMENT">Payment</SelectItem>
                    <SelectItem value="RECEIPT">Receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenceNumber">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  value={formData.referenceNumber || ""}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="e.g., INV-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter journal description"
              />
            </div>

            {/* Journal Lines Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Journal Lines</h3>
                <Button type="button" size="sm" variant="outline" onClick={handleAddLine}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="w-1/3">Ledger Account</TableHead>
                      <TableHead className="text-right w-1/6">Debit</TableHead>
                      <TableHead className="text-right w-1/6">Credit</TableHead>
                      <TableHead className="w-1/4">Description</TableHead>
                      <TableHead className="w-12">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.lines && formData.lines.length > 0 ? (
                      formData.lines.map((line, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <LedgerSelect
                              value={line.ledgerAccountId?.toString() || ""}
                              onValueChange={(value) => handleUpdateLine(idx, "ledgerAccountId", parseInt(value))}
                              ledgers={ledgers}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.debitAmount || 0}
                              onChange={(e) => handleUpdateLine(idx, "debitAmount", parseFloat(e.target.value))}
                              className="text-right text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.creditAmount || 0}
                              onChange={(e) => handleUpdateLine(idx, "creditAmount", parseFloat(e.target.value))}
                              className="text-right text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.description || ""}
                              onChange={(e) => handleUpdateLine(idx, "description", e.target.value)}
                              placeholder="Description"
                              className="text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveLine(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No lines added. Click "Add Line" to start entering journal items.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className={`p-4 rounded-lg border-2 ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="grid grid-cols-3 gap-4 text-sm font-semibold">
                  <div>
                    <div className="text-muted-foreground">Total Debit</div>
                    <div className="font-mono text-lg">{totalDebit.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Credit</div>
                    <div className="font-mono text-lg">{totalCredit.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Balance</div>
                    <div className={`font-mono text-lg ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                      {(totalDebit - totalCredit).toFixed(2)}
                    </div>
                  </div>
                </div>
                {!isBalanced && (
                  <div className="text-sm text-red-600 mt-2">
                    ⚠️ Journal is not balanced. Debit and Credit totals must be equal.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/accounting/journal-entries">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={submitting || !isBalanced}>
                {submitting ? "Saving..." : "Save Journal Entry"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
