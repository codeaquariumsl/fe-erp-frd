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
import { autoPostingRulesApi, AutoPostingRule, ledgerAccountsApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye, ToggleRight, ToggleLeft } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface LedgerAccount {
  id: number
  ledgerCode: string
  name: string
  accountType: string
}

export default function AutoPostingRulesPage() {
  const [rules, setRules] = useState<AutoPostingRule[]>([])
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<AutoPostingRule | null>(null)
  const [formData, setFormData] = useState({
    ruleName: "",
    description: "",
    triggerModule: "PURCHASE_GRN",
    triggerEvent: "RECEIVE",
    debitLedgerId: "",
    creditLedgerId: "",
    priority: "1",
    isEnabled: true,
  })
  const { toast } = useToast()

  useEffect(() => {
    loadRules()
    loadLedgerAccounts()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const data = await autoPostingRulesApi.getAll<AutoPostingRule>()
      setRules(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load auto posting rules",
        variant: "destructive",
      })
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  const loadLedgerAccounts = async () => {
    try {
      const data = await ledgerAccountsApi.getAllAccounts()
      setLedgerAccounts(Array.isArray(data) ? data : (data as any)?.data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load ledger accounts",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      ruleName: "",
      description: "",
      triggerModule: "PURCHASE_GRN",
      triggerEvent: "RECEIVE",
      debitLedgerId: "",
      creditLedgerId: "",
      priority: "1",
      isEnabled: true,
    })
    setSelectedRule(null)
  }

  const handleCreateRule = async () => {
    if (!formData.ruleName.trim()) {
      toast({
        title: "Validation Error",
        description: "Rule name is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.debitLedgerId || !formData.creditLedgerId) {
      toast({
        title: "Validation Error",
        description: "Both debit and credit ledger accounts are required",
        variant: "destructive",
      })
      return
    }

    try {
      await autoPostingRulesApi.create(formData)
      toast({
        title: "Success",
        description: "Auto posting rule created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadRules()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create auto posting rule",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRule = async (id: number) => {
    try {
      await autoPostingRulesApi.remove(id)
      toast({
        title: "Success",
        description: "Auto posting rule deleted successfully",
      })
      loadRules()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete auto posting rule",
        variant: "destructive",
      })
    }
  }

  const handleToggleRule = async (id: number) => {
    try {
      const updated = await autoPostingRulesApi.toggle(id)
      setRules(rules.map(r => r.id === id ? updated : r))
      toast({
        title: "Success",
        description: `Rule ${updated.isEnabled ? "enabled" : "disabled"}`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle rule",
        variant: "destructive",
      })
    }
  }

  const handleViewRule = (rule: AutoPostingRule) => {
    setSelectedRule(rule)
    setIsViewDialogOpen(true)
  }

  const filteredRules = rules.filter(
    (rule) =>
      rule.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rule.description && rule.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return <ERPLayout><div className="flex items-center justify-center h-screen">Loading...</div></ERPLayout>
  }

  return (
    <ERPLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Auto Posting Rules</h1>
            <p className="text-muted-foreground mt-1">Configure automatic journal entry generation based on system events</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Auto Posting Rule</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ruleName">Rule Name</Label>
                  <Input
                    id="ruleName"
                    value={formData.ruleName}
                    onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
                    placeholder="e.g., GRN to Inventory Posting"
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
                <div>
                  <Label htmlFor="triggerModule">Trigger Module</Label>
                  <Select value={formData.triggerModule} onValueChange={(value) => setFormData({ ...formData, triggerModule: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PURCHASE_GRN">Purchase GRN</SelectItem>
                      <SelectItem value="PURCHASE_INVOICE">Purchase Invoice</SelectItem>
                      <SelectItem value="SALES_INVOICE">Sales Invoice</SelectItem>
                      <SelectItem value="STOCK_ADJUSTMENT">Stock Adjustment</SelectItem>
                      <SelectItem value="STOCK_TRANSFER">Stock Transfer</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="triggerEvent">Trigger Event</Label>
                  <Select value={formData.triggerEvent} onValueChange={(value) => setFormData({ ...formData, triggerEvent: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREATE">Create</SelectItem>
                      <SelectItem value="UPDATE">Update</SelectItem>
                      <SelectItem value="APPROVE">Approve</SelectItem>
                      <SelectItem value="POST">Post</SelectItem>
                      <SelectItem value="RECEIVE">Receive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="debitLedgerId">Debit Ledger Account *</Label>
                  <Select value={formData.debitLedgerId} onValueChange={(value) => setFormData({ ...formData, debitLedgerId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select debit account" />
                    </SelectTrigger>
                    <SelectContent>
                      {ledgerAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.ledgerCode} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="creditLedgerId">Credit Ledger Account *</Label>
                  <Select value={formData.creditLedgerId} onValueChange={(value) => setFormData({ ...formData, creditLedgerId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select credit account" />
                    </SelectTrigger>
                    <SelectContent>
                      {ledgerAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.ledgerCode} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    placeholder="Execution order"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateRule}>Create Rule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            {/* <CardTitle>Auto Posting Rules List</CardTitle> */}
            <CardDescription>Rules that automatically generate journal entries based on business events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {filteredRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No auto posting rules found
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule Name</TableHead>
                        <TableHead>Trigger Module</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="py-2 font-medium">{rule.ruleName}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline">{rule.triggerModule}</Badge>
                          </TableCell>
                          <TableCell className="py-2 text-sm">{rule.triggerEvent}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant={rule.isEnabled ? "default" : "secondary"}>
                              {rule.isEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewRule(rule)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleRule(rule.id)}>
                                  {rule.isEnabled ? (
                                    <>
                                      <ToggleLeft className="h-4 w-4 mr-2" />
                                      Disable
                                    </>
                                  ) : (
                                    <>
                                      <ToggleRight className="h-4 w-4 mr-2" />
                                      Enable
                                    </>
                                  )}
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
                                      <AlertDialogTitle>Delete Auto Posting Rule</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{rule.ruleName}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteRule(rule.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Auto Posting Rule Details</DialogTitle>
            </DialogHeader>
            {selectedRule && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Rule Name</Label>
                  <p className="font-medium mt-1">{selectedRule.ruleName}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Description</Label>
                  <p className="font-medium mt-1">{selectedRule.description || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Trigger Module</Label>
                    <Badge variant="outline" className="mt-1">{selectedRule.triggerModule}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Trigger Event</Label>
                    <Badge variant="outline" className="mt-1">{selectedRule.triggerEvent}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <Badge variant={selectedRule.isEnabled ? "default" : "secondary"} className="mt-1">
                    {selectedRule.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}

