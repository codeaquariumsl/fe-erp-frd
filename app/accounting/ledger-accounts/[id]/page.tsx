"use client"

import { useState, useEffect } from "react"
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
import { 
  ledgerAccountsApi, 
  accountTypesApi, 
  accountCategoriesApi,
  controlAccountsApi,
  LedgerAccount,
  AccountType,
  AccountCategory,
  ControlAccount,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface LedgerFormProps {
  id?: string
}

export default function LedgerForm({ id }: LedgerFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(!!id)
  const [submitting, setSubmitting] = useState(false)
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([])
  const [categories, setCategories] = useState<AccountCategory[]>([])
  const [controlAccounts, setControlAccounts] = useState<ControlAccount[]>([])
  const [formData, setFormData] = useState<Partial<LedgerAccount>>({
    name: "",
    accountTypeId: undefined,
    accountCategoryId: undefined,
    controlAccountId: undefined,
    openingBalance: 0,
    openingBalanceType: "DR",
    ledgerType: "GENERAL",
    isBankLedger: false,
    status: "Active",
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (formData.accountTypeId) {
      loadCategories(formData.accountTypeId)
    }
  }, [formData.accountTypeId])

  const loadInitialData = async () => {
    try {
      const types = await accountTypesApi.getAll()
      setAccountTypes(Array.isArray(types) ? types : [])
      
      if (id && id !== "new") {
        const ledger = await ledgerAccountsApi.getById(id)
        setFormData(ledger)
        
        if (ledger.accountTypeId) {
          const cats = await accountCategoriesApi.getByAccountType(ledger.accountTypeId)
          setCategories(Array.isArray(cats) ? cats : [])
        }
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

  const loadCategories = async (accountTypeId: number) => {
    try {
      const cats = await accountCategoriesApi.getByAccountType(accountTypeId)
      setCategories(Array.isArray(cats) ? cats : [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load categories",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Ledger name is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.accountTypeId) {
      toast({
        title: "Validation Error",
        description: "Account type is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.accountCategoryId) {
      toast({
        title: "Validation Error",
        description: "Account category is required",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        openingBalance: parseFloat(formData.openingBalance?.toString() || "0"),
      }

      if (id && id !== "new") {
        await ledgerAccountsApi.update(id, payload)
        toast({
          title: "Success",
          description: "Ledger account updated successfully",
        })
      } else {
        await ledgerAccountsApi.create(payload as any)
        toast({
          title: "Success",
          description: "Ledger account created successfully",
        })
      }
      router.push("/accounting/ledger-accounts")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save ledger account",
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
      <Link href="/accounting/ledger-accounts">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            {id && id !== "new" ? "Edit Ledger Account" : "Create Ledger Account"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Ledger Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Cash in Hand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status || "Active"} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="accountTypeId">Account Type *</Label>
                <Select 
                  value={formData.accountTypeId?.toString() || ""} 
                  onValueChange={(value) => setFormData({ ...formData, accountTypeId: parseInt(value), accountCategoryId: undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map(type => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountCategoryId">Account Category *</Label>
                <Select 
                  value={formData.accountCategoryId?.toString() || ""} 
                  onValueChange={(value) => setFormData({ ...formData, accountCategoryId: parseInt(value) })}
                  disabled={!formData.accountTypeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="ledgerType">Ledger Type</Label>
                <Select value={formData.ledgerType || "GENERAL"} onValueChange={(value) => setFormData({ ...formData, ledgerType: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="SYSTEM">System</SelectItem>
                    <SelectItem value="BANK">Bank</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="PETTY_CASH">Petty Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isBankLedger">Is Bank Ledger</Label>
                <Select value={formData.isBankLedger ? "yes" : "no"} onValueChange={(value) => setFormData({ ...formData, isBankLedger: value === "yes" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="openingBalance">Opening Balance</Label>
                <Input
                  id="openingBalance"
                  type="number"
                  step="0.01"
                  value={formData.openingBalance || 0}
                  onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="openingBalanceType">Balance Type</Label>
                <Select value={formData.openingBalanceType || "DR"} onValueChange={(value) => setFormData({ ...formData, openingBalanceType: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DR">Debit</SelectItem>
                    <SelectItem value="CR">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="controlAccountId">Control Account</Label>
                <Select 
                  value={formData.controlAccountId?.toString() || ""} 
                  onValueChange={(value) => setFormData({ ...formData, controlAccountId: value ? parseInt(value) : undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {controlAccounts.map(ca => (
                      <SelectItem key={ca.id} value={ca.id.toString()}>
                        {ca.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/accounting/ledger-accounts">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Ledger"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
