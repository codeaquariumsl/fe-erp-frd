"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  autoPostingRulesApi,
  ledgerAccountsApi,
  AutoPostingRule,
  LedgerAccount,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface RuleFormProps {
  id?: string
}

const TRIGGER_MODULES = [
  'PURCHASE_GRN',
  'PURCHASE_INVOICE',
  'SALES_INVOICE',
  'STOCK_ADJUSTMENT_INCREASE',
  'STOCK_ADJUSTMENT_DECREASE',
  'CUSTOMER_PAYMENT',
  'SUPPLIER_PAYMENT',
  'COGS',
  'STOCK_TRANSFER',
  'SALES_RETURN',
  'PURCHASE_RETURN',
]

const TRIGGER_EVENTS = [
  'CREATE',
  'UPDATE',
  'APPROVE',
  'POST',
  'RECEIVE',
]

export default function RuleForm({ id }: RuleFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(!!id)
  const [submitting, setSubmitting] = useState(false)
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [formData, setFormData] = useState<Partial<AutoPostingRule>>({
    ruleName: "",
    description: "",
    triggerModule: "PURCHASE_GRN",
    triggerEvent: "RECEIVE",
    debitLedgerId: undefined,
    creditLedgerId: undefined,
    useControlAccount: false,
    isEnabled: true,
    ruleOrder: 0,
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const ledgerData = await ledgerAccountsApi.getAllAccounts()
      setLedgers(Array.isArray(ledgerData) ? ledgerData : [])

      if (id && id !== "new") {
        const rule = await autoPostingRulesApi.getById(id)
        setFormData(rule)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.ruleName?.trim()) {
      toast({
        title: "Validation Error",
        description: "Rule name is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.debitLedgerId) {
      toast({
        title: "Validation Error",
        description: "Debit ledger is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.creditLedgerId) {
      toast({
        title: "Validation Error",
        description: "Credit ledger is required",
        variant: "destructive",
      })
      return
    }

    if (formData.debitLedgerId === formData.creditLedgerId) {
      toast({
        title: "Validation Error",
        description: "Debit and credit ledgers cannot be the same",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        debitLedgerId: parseInt(formData.debitLedgerId.toString()),
        creditLedgerId: parseInt(formData.creditLedgerId.toString()),
      }

      if (id && id !== "new") {
        await autoPostingRulesApi.update(id, payload)
        toast({
          title: "Success",
          description: "Rule updated successfully",
        })
      } else {
        await autoPostingRulesApi.create(payload as any)
        toast({
          title: "Success",
          description: "Rule created successfully",
        })
      }
      router.push("/accounting/auto-posting-rules")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save rule",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  const debitLedger = ledgers.find(l => l.id === formData.debitLedgerId)
  const creditLedger = ledgers.find(l => l.id === formData.creditLedgerId)

  return (
    <div className="space-y-4">
      <Link href="/accounting/auto-posting-rules">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            {id && id !== "new" ? "Edit Auto-Posting Rule" : "Create Auto-Posting Rule"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="ruleName">Rule Name *</Label>
                <Input
                  id="ruleName"
                  value={formData.ruleName || ""}
                  onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
                  placeholder="e.g., GRN_RECEIPT"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isEnabled">Status</Label>
                <Select value={formData.isEnabled ? "enabled" : "disabled"} onValueChange={(value) => setFormData({ ...formData, isEnabled: value === "enabled" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain what this rule does"
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Trigger Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="triggerModule">Trigger Module *</Label>
                  <Select value={formData.triggerModule || "PURCHASE_GRN"} onValueChange={(value) => setFormData({ ...formData, triggerModule: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_MODULES.map(module => (
                        <SelectItem key={module} value={module}>
                          {module}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Which transaction triggers this rule</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="triggerEvent">Trigger Event *</Label>
                  <Select value={formData.triggerEvent || "RECEIVE"} onValueChange={(value) => setFormData({ ...formData, triggerEvent: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_EVENTS.map(event => (
                        <SelectItem key={event} value={event}>
                          {event}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">When does the trigger occur</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Journal Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="debitLedgerId">Debit Ledger *</Label>
                  <Select
                    value={formData.debitLedgerId?.toString() || ""}
                    onValueChange={(value) => setFormData({ ...formData, debitLedgerId: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ledger to debit" />
                    </SelectTrigger>
                    <SelectContent>
                      {ledgers.map(ledger => (
                        <SelectItem key={ledger.id} value={ledger.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs">{ledger.ledgerCode}</span>
                            <span>{ledger.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Account to be debited</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditLedgerId">Credit Ledger *</Label>
                  <Select
                    value={formData.creditLedgerId?.toString() || ""}
                    onValueChange={(value) => setFormData({ ...formData, creditLedgerId: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ledger to credit" />
                    </SelectTrigger>
                    <SelectContent>
                      {ledgers.map(ledger => (
                        <SelectItem key={ledger.id} value={ledger.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs">{ledger.ledgerCode}</span>
                            <span>{ledger.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Account to be credited</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="useControlAccount">Use Control Account</Label>
                  <Select value={formData.useControlAccount ? "yes" : "no"} onValueChange={(value) => setFormData({ ...formData, useControlAccount: value === "yes" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">For dynamic customer/supplier accounts</p>
                </div>

                {formData.useControlAccount && (
                  <div className="space-y-2">
                    <Label htmlFor="controlAccountType">Control Account Type</Label>
                    <Select value={formData.controlAccountType || "CUSTOMER"} onValueChange={(value) => setFormData({ ...formData, controlAccountType: value as any })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                        <SelectItem value="SUPPLIER">Supplier</SelectItem>
                        <SelectItem value="BANK">Bank</SelectItem>
                        <SelectItem value="INVENTORY">Inventory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center gap-4">
              <div className="flex gap-2">
                <Link href="/accounting/auto-posting-rules">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  disabled={!formData.debitLedgerId || !formData.creditLedgerId}
                >
                  Preview
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Rule"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rule Preview</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded">
              <div>
                <div className="text-sm text-muted-foreground">Rule Name</div>
                <div className="font-semibold">{formData.ruleName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Trigger</div>
                <div className="font-semibold">{formData.triggerModule} → {formData.triggerEvent}</div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <div className="text-sm text-muted-foreground mb-2">Debit Ledger</div>
              {debitLedger && (
                <>
                  <div className="font-mono text-xs">{debitLedger.ledgerCode}</div>
                  <div className="font-semibold">{debitLedger.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{debitLedger.accountType?.name}</div>
                </>
              )}
            </div>

            <div className="text-center text-muted-foreground">↕️</div>

            <div className="p-4 bg-red-50 rounded border border-red-200">
              <div className="text-sm text-muted-foreground mb-2">Credit Ledger</div>
              {creditLedger && (
                <>
                  <div className="font-mono text-xs">{creditLedger.ledgerCode}</div>
                  <div className="font-semibold">{creditLedger.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{creditLedger.accountType?.name}</div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowPreview(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
