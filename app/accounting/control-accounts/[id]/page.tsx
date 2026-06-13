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
  controlAccountsApi, 
  accountTypesApi, 
  accountCategoriesApi,
  ControlAccount,
  AccountType,
  AccountCategory,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface ControlAccountFormProps {
  id?: string
}

export default function ControlAccountForm({ id }: ControlAccountFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(!!id)
  const [submitting, setSubmitting] = useState(false)
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([])
  const [categories, setCategories] = useState<AccountCategory[]>([])
  const [formData, setFormData] = useState<Partial<ControlAccount>>({
    name: "",
    accountTypeId: undefined,
    accountCategoryId: undefined,
    controlType: "CUSTOMER",
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
        const account = await controlAccountsApi.getById(id)
        setFormData(account)
        
        if (account.accountTypeId) {
          const cats = await accountCategoriesApi.getByAccountType(account.accountTypeId)
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
        description: "Control account name is required",
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
      if (id && id !== "new") {
        await controlAccountsApi.update(id, formData)
        toast({
          title: "Success",
          description: "Control account updated successfully",
        })
      } else {
        await controlAccountsApi.create(formData as any)
        toast({
          title: "Success",
          description: "Control account created successfully",
        })
      }
      router.push("/accounting/control-accounts")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save control account",
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
      <Link href="/accounting/control-accounts">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            {id && id !== "new" ? "Edit Control Account" : "Create Control Account"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Control Account Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Control"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="controlType">Control Type *</Label>
                <Select value={formData.controlType || "CUSTOMER"} onValueChange={(value) => setFormData({ ...formData, controlType: value as any })}>
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

            <div className="p-4 bg-blue-50 rounded text-sm text-blue-800">
              💡 Control accounts aggregate transactions for specific entity types. Use these for automatic ledger selection in rules.
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/accounting/control-accounts">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Control Account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
