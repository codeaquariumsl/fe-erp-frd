"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ERPLayout } from "@/components/layouts/erp-layout"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { chequesApi, type Cheque, type CancelChequeResponse } from "@/lib/api"
import { Search, XCircle, CalendarIcon, Printer } from "lucide-react"
import { format } from "date-fns"

export default function CancelChequesPage() {
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Cancel Dialog State
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null)
  const [cancelDate, setCancelDate] = useState<Date>(new Date())
  const [cancelReason, setCancelReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Receipt Dialog State
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [cancelResponse, setCancelResponse] = useState<CancelChequeResponse | null>(null)

  useEffect(() => {
    loadCheques()
  }, [])

  const loadCheques = async () => {
    setLoading(true)
    try {
      const data = await chequesApi.getInHand()
      setCheques(data || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load cheques",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredCheques = useMemo(() => {
    return cheques.filter((c) => {
      if (!searchTerm) return true
      const term = searchTerm.toLowerCase()
      return (
        (c.chequeNo && c.chequeNo.toLowerCase().includes(term)) ||
        (c.customerName && c.customerName.toLowerCase().includes(term)) ||
        (c.bankName && c.bankName.toLowerCase().includes(term))
      )
    })
  }, [cheques, searchTerm])

  const openCancelDialog = (cheque: Cheque) => {
    setSelectedCheque(cheque)
    setCancelDate(new Date())
    setCancelReason("")
    setShowCancelDialog(true)
  }

  const handleCancelCheque = async () => {
    if (!selectedCheque) return
    if (!cancelReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Cancel reason is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await chequesApi.cancel({
        id: selectedCheque.id,
        cancelDate: format(cancelDate, "yyyy-MM-dd"),
        cancelReason,
      })

      toast({
        title: "Success",
        description: "Cheque cancelled successfully",
      })

      setCancelResponse(response)
      setShowCancelDialog(false)
      setShowReceiptDialog(true)
      loadCheques()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel cheque",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <ERPLayout>
        <div className="flex-1 space-y-3 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold">Cancel Cheques</h2>
              <p className="text-sm text-muted-foreground">Manage and void collected cheques</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </div>
      </ERPLayout>
    )
  }

  return (
    <ERPLayout>
      <div className="flex-1 space-y-3 p-3 print-hide">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Cancel Cheques</h2>
            <p className="text-sm text-muted-foreground">Manage and void collected cheques using secure audit steps</p>
          </div>
        </div>

        <div className="flex items-center mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Cheque No, Customer or Bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="border rounded-md bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cheque No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCheques.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No cheques in hand found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCheques.map((cheque) => (
                  <TableRow key={cheque.id}>
                    <TableCell className="font-medium">{cheque.chequeNo}</TableCell>
                    <TableCell>{cheque.chequeDate ? format(new Date(cheque.chequeDate), "MMM dd, yyyy") : '-'}</TableCell>
                    <TableCell>{cheque.bankName}</TableCell>
                    <TableCell>{cheque.customerName}</TableCell>
                    <TableCell>{cheque.invoices || '-'}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(cheque.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="destructive" size="sm" onClick={() => openCancelDialog(cheque)}>
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Cancel Dialog Modal */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Cheque</DialogTitle>
            <DialogDescription>
              Provide the cancellation details for cheque number {selectedCheque?.chequeNo}. This will trigger an accounting reversal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cancel Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(cancelDate, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={cancelDate}
                    onSelect={(date) => date && setCancelDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Cancel Reason *</Label>
              <Textarea
                placeholder="Required cancel reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={isSubmitting}>
              Close
            </Button>
            <Button variant="destructive" onClick={handleCancelCheque} disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-2xl print:max-w-none print:w-full print:border-none print:shadow-none print:p-0">
          <DialogHeader className="print-hide">
            <DialogTitle>Cheque Cancellation Acknowledgment</DialogTitle>
          </DialogHeader>
          <div className="print-visible space-y-6 p-6">
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold uppercase tracking-wider">Company Name</h1>
              <p className="text-muted-foreground mt-1">Cheque Cancellation Acknowledgment</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-bold">Transaction No:</p>
                <p>{cancelResponse?.referenceNo}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">Date:</p>
                <p>{format(new Date(), "PPpp")}</p>
              </div>
            </div>

            <div className="border rounded-md p-4 bg-muted/20">
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="font-semibold text-sm text-muted-foreground">Cheque Number</p>
                  <p className="font-medium">{cancelResponse?.chequeNo}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-muted-foreground">Original Customer</p>
                  <p className="font-medium">{selectedCheque?.customerName}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-muted-foreground">Cancelled Amount</p>
                  <p className="font-medium text-lg">
                    {cancelResponse ? new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(cancelResponse.cancelledAmount) : ''}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-muted-foreground">Invoices Affected</p>
                  <p className="font-medium">{selectedCheque?.invoices || 'None'}</p>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <p className="text-sm">The aforementioned cheque has been voided. Corresponding accounts receivable adjustments have been executed successfully.</p>
            </div>

            <div className="mt-16 grid grid-cols-2 gap-8 pt-8">
              <div className="border-t border-dashed border-gray-400 pt-2 text-center text-sm font-medium">
                Authorized Signature
              </div>
              <div className="border-t border-dashed border-gray-400 pt-2 text-center text-sm font-medium">
                Customer Signature
              </div>
            </div>
          </div>
          <DialogFooter className="print-hide">
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
              Close
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-visible, .print-visible * {
            visibility: visible;
          }
          .print-visible {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}} />
    </ERPLayout>
  )
}
