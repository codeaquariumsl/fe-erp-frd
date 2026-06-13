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
import { accountTypesApi, AccountType } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface AccountTypeFormProps {
  id?: string
}

export default function AccountTypeForm({ id }: AccountTypeFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(!!id)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<AccountType>>({
    name: "",
    description: "",
    drBehavior: "increase",
    crBehavior: "decrease",
    status: "Active",
  })

  useEffect(() => {
    if (id && id !== "new") {
      loadAccountType()
    }
  }, [id])

  const loadAccountType = async () => {
    try {
      const data = await accountTypesApi.getById(id!)
      setFormData(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load account type",
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
        description: "Account type name is required",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      if (id && id !== "new") {
        await accountTypesApi.update(id, formData)
        toast({
          title: "Success",
          description: "Account type updated successfully",
        })
      } else {
        await accountTypesApi.create(formData as any)
        toast({
          title: "Success",
          description: "Account type created successfully",
        })
      }
      router.push("/accounting/account-types")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save account type",
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
      <Link href="/accounting/account-types">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            {id && id !== "new" ? "Edit Account Type" : "Create Account Type"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Account Type Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Asset, Liability"
                  disabled={formData.isSystemProtected}
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

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                disabled={formData.isSystemProtected}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="drBehavior">Debit Behavior</Label>
                <Select value={formData.drBehavior || "increase"} onValueChange={(value) => setFormData({ ...formData, drBehavior: value as any })} disabled={formData.isSystemProtected}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase</SelectItem>
                    <SelectItem value="decrease">Decrease</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">When account is debited</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="crBehavior">Credit Behavior</Label>
                <Select value={formData.crBehavior || "decrease"} onValueChange={(value) => setFormData({ ...formData, crBehavior: value as any })} disabled={formData.isSystemProtected}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase</SelectItem>
                    <SelectItem value="decrease">Decrease</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">When account is credited</p>
              </div>
            </div>

            {formData.isSystemProtected && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                ⚠️ This is a system-protected account type and cannot be modified
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Link href="/accounting/account-types">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={submitting || formData.isSystemProtected}>
                {submitting ? "Saving..." : "Save Account Type"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
