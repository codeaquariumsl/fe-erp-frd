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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { chequesApi, type Cheque, type ReturnChequeResponse } from "@/lib/api"
import { Search, RotateCcw, CalendarIcon, Printer } from "lucide-react"
import { format } from "date-fns"

export default function ReturnChequesPage() {
  const [cheques, setCheques] = useState<(Cheque & { depositDate?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Return Dialog State
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [selectedCheque, setSelectedCheque] = useState<(Cheque & { depositDate?: string }) | null>(null)
  const [returnDate, setReturnDate] = useState<Date>(new Date())
  const [returnReason, setReturnReason] = useState<string>("")
  const [remarks, setRemarks] = useState("")
  const [bankCharge, setBankCharge] = useState<number>(0)
  const [penalty, setPenalty] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Receipt Dialog State
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [returnResponse, setReturnResponse] = useState<ReturnChequeResponse | null>(null)

  useEffect(() => {
    loadCheques()
  }, [])

  const loadCheques = async () => {
    setLoading(true)
    try {
      const data = await chequesApi.getDeposited()
      setCheques(data || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load deposited cheques",
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

  const openReturnDialog = (cheque: (Cheque & { depositDate?: string })) => {
    setSelectedCheque(cheque)
    setReturnDate(new Date())
    setReturnReason("")
    setRemarks("")
    setBankCharge(0)
    setPenalty(0)
    setShowReturnDialog(true)
  }

  const handleReturnCheque = async () => {
    if (!selectedCheque) return
    if (!returnReason) {
      toast({
        title: "Validation Error",
        description: "Return reason is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const reasonToSubmit = remarks ? `${returnReason} - ${remarks}` : returnReason;

      const response = await chequesApi.returnCheque({
        receiptId: selectedCheque.id,
        returnDate: format(returnDate, "yyyy-MM-dd"),
        reason: reasonToSubmit,
        bankCharge: bankCharge || 0,
        penalty: penalty || 0
      })

      toast({
        title: "Success",
        description: "Cheque returned successfully",
      })

      setReturnResponse(response)
      setShowReturnDialog(false)
      // setShowReceiptDialog(true)
      loadCheques()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to return cheque",
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
              <h2 className="text-2xl font-bold">Return Cheques</h2>
              <p className="text-sm text-muted-foreground">Manage and route bounced deposited cheques</p>
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
            <h2 className="text-2xl font-bold">Return Cheques</h2>
            <p className="text-sm text-muted-foreground">View deposited cheques and process bank returns (bounced cheques)</p>
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
                <TableHead>Deposit Date</TableHead>
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
                    No deposited cheques found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCheques.map((cheque) => (
                  <TableRow key={cheque.id}>
                    <TableCell className="font-medium">{cheque.chequeNo}</TableCell>
                    <TableCell>{cheque.depositDate ? format(new Date(cheque.depositDate), "MMM dd, yyyy") : (cheque.chequeDate ? format(new Date(cheque.chequeDate), "MMM dd, yyyy") : '-')}</TableCell>
                    <TableCell>{cheque.bankName}</TableCell>
                    <TableCell>{cheque.customerName}</TableCell>
                    <TableCell>{cheque.invoices || '-'}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(cheque.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="outline" size="sm" onClick={() => openReturnDialog(cheque)}>
                        <RotateCcw className="w-4 h-4 mr-1 text-orange-500" />
                        Return
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Return Dialog Modal */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return Deposited Cheque</DialogTitle>
            <DialogDescription>
              Record a bounced cheque (Cheque No: {selectedCheque?.chequeNo}). This will reverse the bank deposit and debit the customer account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Return Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(returnDate, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={returnDate}
                    onSelect={(date) => date && setReturnDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Return Reason *</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Insufficient Funds">Insufficient Funds</SelectItem>
                  <SelectItem value="Signature Mismatch">Signature Mismatch</SelectItem>
                  <SelectItem value="Account Closed">Account Closed</SelectItem>
                  <SelectItem value="Post Dated">Post Dated</SelectItem>
                  <SelectItem value="Payment Stopped">Payment Stopped</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Charges</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bankCharge || ""}
                  onChange={(e) => setBankCharge(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Penalty</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={penalty || ""}
                  onChange={(e) => setPenalty(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Remarks (Optional)</Label>
              <Textarea
                placeholder="Additional notes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)} disabled={isSubmitting}>
              Close
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleReturnCheque} disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Confirm Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:w-full print:border-none print:shadow-none print:p-0">
          <DialogHeader className="print-hide">
            <DialogTitle>Cheque Return Acknowledgment</DialogTitle>
          </DialogHeader>
          <div className="print-visible space-y-6 p-6">
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold uppercase tracking-wider">Company Name</h1>
              <p className="text-muted-foreground mt-1">Returned Cheque Advice</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-bold">Advice No:</p>
                <p>{returnResponse?.referenceNo}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">Date Processed:</p>
                <p>{format(new Date(), "PPpp")}</p>
              </div>
            </div>

            <div className="border rounded-md p-4 bg-muted/20">
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="font-semibold text-sm text-muted-foreground">Cheque Number</p>
                  <p className="font-medium">{returnResponse?.chequeNo}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{returnResponse?.customer}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-muted-foreground">Bank Drawn</p>
                  <p className="font-medium">{returnResponse?.bank}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-muted-foreground">Cheque Amount</p>
                  <p className="font-medium">
                    {returnResponse ? new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(returnResponse.amount) : ''}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-muted-foreground">Bank Charges</p>
                  <p className="font-medium text-red-600">
                    {returnResponse ? new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(returnResponse.charges) : ''}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-muted-foreground">Total Customer Debit</p>
                  <p className="font-medium text-lg font-bold">
                    {returnResponse ? new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(returnResponse.amount + returnResponse.charges) : ''}
                  </p>
                </div>
              </div>
            </div>

            {returnResponse?.invoices && returnResponse.invoices.length > 0 && (
              <div className="pt-4">
                <p className="font-semibold text-sm mb-2">Affected Invoices Reopened:</p>
                <div className="flex flex-wrap gap-2">
                  {returnResponse.invoices.map((inv, idx) => (
                    <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-sm border">{inv}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-8">
              <p className="text-sm">This is an automated advice confirming that the cheque has been reversed due to a bank return. Corresponding accounts receivable adjustments have been executed successfully.</p>
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
              Print Advice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{
        __html: `
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
