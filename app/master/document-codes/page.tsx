"use client"

import { useEffect, useState } from "react"
import { documentSequenceApi, type DocumentSequence } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function DocumentCodesPage() {
  const [codes, setCodes] = useState<DocumentSequence[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [form, setForm] = useState<DocumentSequence>({
    documentType: "",
    prefix: "",
    currentNumber: 0,
    numberLength: 5,
  })
  const { toast } = useToast()

  useEffect(() => {
    loadCodes()
  }, [])

  const loadCodes = async () => {
    setLoading(true)
    try {
      const data = await documentSequenceApi.getAll()
      setCodes(data)
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load document codes", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.documentType || !form.prefix) {
      toast({ title: "Validation Error", description: "Document Type and Prefix are required", variant: "destructive" })
      return
    }
    try {
      await documentSequenceApi.create(form)
      toast({ title: "Success", description: "Document code saved" })
      setOpenDialog(false)
      setForm({ documentType: "", prefix: "", currentNumber: 0, numberLength: 5 })
      loadCodes()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save document code", variant: "destructive" })
    }
  }

  const handleEdit = (code: DocumentSequence) => {
    setForm(code)
    setOpenDialog(true)
  }

  const handleUpdate = async () => {
    try {
      await documentSequenceApi.update(form.documentType, form)
      toast({ title: "Success", description: "Document code updated" })
      setOpenDialog(false)
      setForm({ documentType: "", prefix: "", currentNumber: 0, numberLength: 5 })
      loadCodes()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update document code", variant: "destructive" })
    }
  }

  const handleDelete = async (documentType: string) => {
    if (!confirm("Delete this document code?")) return
    try {
      await documentSequenceApi.remove(documentType)
      toast({ title: "Success", description: "Document code deleted" })
      loadCodes()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete document code", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Code Master</h1>
          <p className="text-muted-foreground">Manage all document code sequences for ERP modules</p>
        </div>
        <Button onClick={() => { setForm({ documentType: "", prefix: "", currentNumber: 0, numberLength: 5 }); setOpenDialog(true) }}>
          Add Document Code
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Document Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">Loading...</div>
          ) : codes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No document codes found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Current Number</TableHead>
                  <TableHead>Number Length</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.documentType}>
                    <TableCell>{code.documentType}</TableCell>
                    <TableCell>{code.prefix}</TableCell>
                    <TableCell>{code.currentNumber}</TableCell>
                    <TableCell>{code.numberLength}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(code)}>Edit</Button>
                      <Button size="sm" variant="destructive" className="ml-2" onClick={() => handleDelete(code.documentType)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.documentType && codes.some(c => c.documentType === form.documentType) ? "Edit Document Code" : "Add Document Code"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Type</Label>
              <Input
                value={form.documentType}
                onChange={e => setForm({ ...form, documentType: e.target.value })}
                disabled={codes.some(c => c.documentType === form.documentType)}
                placeholder="e.g. PO, GRN, SO"
              />
            </div>
            <div>
              <Label>Prefix</Label>
              <Input value={form.prefix} onChange={e => setForm({ ...form, prefix: e.target.value })} placeholder="e.g. PO, GRN, SO" />
            </div>
            <div>
              <Label>Current Number</Label>
              <Input type="number" value={form.currentNumber} onChange={e => setForm({ ...form, currentNumber: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Number Length</Label>
              <Input type="number" value={form.numberLength} onChange={e => setForm({ ...form, numberLength: Number(e.target.value) })} />
            </div>
            <div className="flex justify-end gap-2">
              {codes.some(c => c.documentType === form.documentType) ? (
                <Button variant="default" onClick={handleUpdate}>Update</Button>
              ) : (
                <Button variant="default" onClick={handleSave}>Save</Button>
              )}
              <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
