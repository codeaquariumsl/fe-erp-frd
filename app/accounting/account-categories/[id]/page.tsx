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
  accountCategoriesApi, 
  accountTypesApi,
  AccountCategory,
  AccountType,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface CategoryFormProps {
  id?: string
}

export default function CategoryForm({ id }: CategoryFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(!!id)
  const [submitting, setSubmitting] = useState(false)
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([])
  const [formData, setFormData] = useState<Partial<AccountCategory>>({
    name: "",
    accountTypeId: undefined,
    status: "Active",
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const types = await accountTypesApi.getAll()
      setAccountTypes(Array.isArray(types) ? types : [])
      
      if (id && id !== "new") {
        const category = await accountCategoriesApi.getById(id)
        setFormData(category)
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
    
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
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

    setSubmitting(true)
    try {
      if (id && id !== "new") {
        await accountCategoriesApi.update(id, formData)
        toast({
          title: "Success",
          description: "Account category updated successfully",
        })
      } else {
        await accountCategoriesApi.create(formData as any)
        toast({
          title: "Success",
          description: "Account category created successfully",
        })
      }
      router.push("/accounting/account-categories")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save account category",
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
      <Link href="/accounting/account-categories">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            {id && id !== "new" ? "Edit Account Category" : "Create Account Category"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Current Assets, Fixed Assets"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="accountTypeId">Account Type *</Label>
                <Select 
                  value={formData.accountTypeId?.toString() || ""} 
                  onValueChange={(value) => setFormData({ ...formData, accountTypeId: parseInt(value) })}
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

            <div className="p-4 bg-blue-50 rounded text-sm text-blue-800">
              💡 Categories group ledger accounts within an account type for better organization and reporting.
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/accounting/account-categories">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Category"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
