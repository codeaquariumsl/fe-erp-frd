"use client"

import React, { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CalendarIcon,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Check,
  ChevronsUpDown,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Printer,
  FileText,
  PieChart,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  User,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { accountingReportsApi, ledgerAccountsApi, LedgerAccount } from "@/lib/api"
import { LedgerSelect } from "@/components/accounting/ledger-select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export default function AccountingReportsPage() {
  const [selectedTab, setSelectedTab] = useState("trial-balance")
  const [loading, setLoading] = useState(false)
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"))

  // Report data states
  const [trialBalance, setTrialBalance] = useState<any>(null)
  const [profitLoss, setProfitLoss] = useState<any>(null)
  const [balanceSheet, setBalanceSheet] = useState<any>(null)
  const [customerOutstanding, setCustomerOutstanding] = useState<any>(null)
  const [supplierOutstanding, setSupplierOutstanding] = useState<any>(null)
  const [stockValuation, setStockValuation] = useState<any>(null)
  const [cashBank, setCashBank] = useState<any>(null)
  const [dashboard, setDashboard] = useState<any>(null)
  const [ledgerDetails, setLedgerDetails] = useState<any>(null)
  const [generalLedger, setGeneralLedger] = useState<any>(null)
  const [glCategoryFilter, setGlCategoryFilter] = useState<string>("all")
  const [glSearch, setGlSearch] = useState("")
  const [glExpandedAccounts, setGlExpandedAccounts] = useState<Record<number, boolean>>({})
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([])
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>("")
  const [ledgerSearch, setLedgerSearch] = useState("")
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState<string>("all")
  const [trialBalanceSearch, setTrialBalanceSearch] = useState("")
  const [expandedRows, setExpandedRows] = useState<Record<string, any>>({})
  const [expandedLoading, setExpandedLoading] = useState<Record<string, boolean>>({})
  const [selectedTx, setSelectedTx] = useState<any>(null)

  // Load ledger accounts on mount
  useEffect(() => {
    loadLedgerAccounts()
  }, [])

  // Load reports on tab change or date change
  useEffect(() => {
    loadReport(selectedTab)
  }, [selectedTab])

  const loadLedgerAccounts = async () => {
    try {
      const data = await ledgerAccountsApi.getAllAccounts<LedgerAccount>()
      const accounts = Array.isArray(data) ? data : (data as any)?.data || []
      setLedgerAccounts(accounts)
    } catch (error) {
      console.error("Failed to load ledger accounts:", error)
    }
  }

  const loadReport = async (reportType: string) => {
    setLoading(true)
    try {
      switch (reportType) {
        case "trial-balance":
          const trialData = await accountingReportsApi.getTrialBalance({ asOfDate })
          setTrialBalance(trialData)
          break
        case "profit-loss":
          const plData = await accountingReportsApi.getProfitLoss({ startDate, endDate })
          setProfitLoss(plData)
          break
        case "balance-sheet":
          const bsData = await accountingReportsApi.getBalanceSheet({ asOfDate })
          setBalanceSheet(bsData)
          break
        case "customer-outstanding":
          const coData = await accountingReportsApi.getCustomerOutstanding({ asOfDate })
          setCustomerOutstanding(coData)
          break
        case "supplier-outstanding":
          const soData = await accountingReportsApi.getSupplierOutstanding({ asOfDate })
          setSupplierOutstanding(soData)
          break
        case "stock-valuation":
          const svData = await accountingReportsApi.getStockValuation({ asOfDate })
          setStockValuation(svData)
          break
        case "cash-bank":
          const cbData = await accountingReportsApi.getCashBankBook({ startDate, endDate })
          setCashBank(cbData)
          break
        case "dashboard":
          const dbData = await accountingReportsApi.getDashboard()
          setDashboard(dbData)
          break
        case "ledger-details":
          if (selectedLedgerId) {
            const ldData = await accountingReportsApi.getLedgerDetails({
              ledgerAccountId: parseInt(selectedLedgerId),
              startDate,
              endDate
            })
            setLedgerDetails(ldData)
          }
          break
        case "general-ledger":
          const glData = await accountingReportsApi.getGeneralLedger({
            startDate,
            endDate,
            accountCategory: glCategoryFilter !== "all" ? glCategoryFilter : undefined
          })
          setGeneralLedger(glData)
          break
      }
      toast.success("Report loaded successfully")
    } catch (error: any) {
      console.error("Error loading report:", error)
      toast.error(error.message || "Failed to load report")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadReport(selectedTab)
  }

  const handleDrillDown = async (ledgerCode: string) => {
    const account = ledgerAccounts.find(
      (a) => a.ledgerCode === ledgerCode || (a as any).code === ledgerCode
    )
    if (account) {
      setLedgerCategoryFilter("all")
      setSelectedLedgerId(account.id.toString())
      setSelectedTab("ledger-details")

      // Load details for this specific account immediately
      setLoading(true)
      try {
        const ldData = await accountingReportsApi.getLedgerDetails({
          ledgerAccountId: account.id,
          startDate,
          endDate
        })
        setLedgerDetails(ldData)
      } catch (error: any) {
        console.error("Error loading drill-down data:", error)
        toast.error("Failed to load ledger details")
      } finally {
        setLoading(false)
      }
    } else {
      toast.error(`Could not find ledger account with code: ${ledgerCode}`)
    }
  }

  const toggleRowExpand = async (ledgerCode: string) => {
    if (expandedRows[ledgerCode]) {
      const newExpanded = { ...expandedRows }
      delete newExpanded[ledgerCode]
      setExpandedRows(newExpanded)
      return
    }

    const account = ledgerAccounts.find(
      (a) => a.ledgerCode === ledgerCode || (a as any).code === ledgerCode
    )
    if (!account) return

    setExpandedLoading(prev => ({ ...prev, [ledgerCode]: true }))
    try {
      const ldData = await accountingReportsApi.getLedgerDetails({
        ledgerAccountId: account.id,
        startDate,
        endDate,
      })
      setExpandedRows(prev => ({ ...prev, [ledgerCode]: ldData }))
    } catch (error) {
      console.error("Failed to load sub-rows:", error)
      toast.error("Failed to load transaction details")
    } finally {
      setExpandedLoading(prev => ({ ...prev, [ledgerCode]: false }))
    }
  }

  const formatCurrency = (value: any) => {
    const num = typeof value === "string" ? parseFloat(value) : value
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(num || 0)
  }

  const formatPercent = (value: any) => {
    const num = typeof value === "string" ? parseFloat(value) : value
    return `${(num || 0).toFixed(2)}%`
  }

  const getTransactionUrl = (tx: any): string | null => {
    if (!tx) return null;
    const module = tx.module || tx.transactionModule;
    const refId = tx.referenceId;

    switch (module) {
      case "BILL_ENTRY":
        return refId ? `/accounting/bill-entries/${refId}` : `/accounting/bill-entries`;
      case "BILL_PAYMENT":
        return refId ? `/accounting/bill-payments/${refId}` : `/accounting/bill-payments`;
      case "ONE_PAYMENT":
        return refId ? `/accounting/one-payments/${refId}` : `/accounting/one-payments`;
      case "FUNDS_TRANSFER":
        return refId ? `/accounting/funds-transfers/${refId}` : `/accounting/funds-transfers`;
      case "JOURNAL_ENTRY":
        return refId ? `/accounting/journal-entries/${refId}` : `/accounting/journal-entries`;
      case "INVOICE":
        return refId ? `/invoices?view=${refId}` : "/invoices";
      case "RECEIPT":
        return refId ? `/receipts?view=${refId}` : "/receipts";
      case "SUPPLIER_PAYMENT":
        return refId ? `/supplier-payments?view=${refId}` : "/supplier-payments";
      case "CUSTOMER_RETURN":
        return refId ? `/customer-returns?view=${refId}` : "/customer-returns";
      case "GRN":
        return refId ? `/grn?view=${refId}` : "/grn";
      case "BANK_DEPOSIT":
        return refId ? `/accounting/bank-deposits?view=${refId}` : "/accounting/bank-deposits";
      case "PETTY_CASH_PAYMENT":
        return refId ? `/accounting/petty-cash?view=${refId}` : "/accounting/petty-cash";
      default:
        return null;
    }
  }

  const handleRowClick = (tx: any) => {
    setSelectedTx(tx);
  }

  // ── Excel Export Helpers ─────────────────────────────────────────────────────

  const downloadWorkbook = (wb: XLSX.WorkBook, filename: string) => {
    XLSX.writeFile(wb, filename)
    toast.success(`${filename} downloaded successfully`)
  }

  const exportTrialBalanceExcel = () => {
    if (!trialBalance) return
    const wb = XLSX.utils.book_new()

    // Summary sheet
    const summaryData = [
      ["CODE AQUA ERP"],
      ["Trial Balance Report"],
      [`As of Date: ${new Date(trialBalance.asOfDate).toLocaleDateString()}`],
      [],
      ["Summary"],
      ["Total Debits (LKR)", parseFloat(trialBalance.summary.totalDebits)],
      ["Total Credits (LKR)", parseFloat(trialBalance.summary.totalCredits)],
      ["Difference (LKR)", parseFloat(trialBalance.summary.difference)],
      ["Status", trialBalance.summary.isBalanced ? "Balanced" : "Unbalanced"],
      [],
      ["Ledger Code", "Ledger Name", "Account Type", "Account Category", "Opening Balance", "Debits", "Credits", "Closing Balance", "Balance Type"],
      ...trialBalance.data.map((row: any) => [
        row.ledgerCode,
        row.ledgerName,
        row.accountType,
        row.accountCategory,
        parseFloat(row.openingBalance),
        parseFloat(row.journalDebits),
        parseFloat(row.journalCredits),
        parseFloat(row.closingBalance),
        row.closingBalanceType,
      ])
    ]
    const ws = XLSX.utils.aoa_to_sheet(summaryData)
    ws["!cols"] = [{ wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws, "Trial Balance")
    downloadWorkbook(wb, `Trial_Balance_${asOfDate}.xlsx`)
  }

  const exportProfitLossExcel = () => {
    if (!profitLoss) return
    const wb = XLSX.utils.book_new()
    const stmt = profitLoss.incomeStatement

    const rows: any[][] = [
      ["CODE AQUA ERP"],
      ["Profit & Loss Statement"],
      [`Period: ${startDate} to ${endDate}`],
      [],
      ["SALES REVENUE"],
      ["Ledger Code", "Ledger Name", "Amount (LKR)"],
      ...stmt.sales.accounts.map((a: any) => [a.ledgerCode, a.ledgerName, parseFloat(a.amount)]),
      ["Total Sales", "", parseFloat(stmt.sales.total)],
      [],
      ["COST OF GOODS SOLD"],
      ["COGS", "", parseFloat(stmt.costOfGoodsSold.amount)],
      [],
      ["Gross Profit", "", parseFloat(stmt.grossProfit)],
      [],
      ["OPERATING EXPENSES"],
      ["Ledger Code", "Ledger Name", "Amount (LKR)"],
      ...stmt.operatingExpenses.accounts.map((a: any) => [a.ledgerCode, a.ledgerName, parseFloat(a.amount)]),
      ["Total Expenses", "", parseFloat(stmt.operatingExpenses.total)],
      [],
      ["Net Profit / Loss", "", parseFloat(stmt.netProfitLoss)],
      ["Profit Margin %", "", parseFloat(stmt.profitMargin)],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws["!cols"] = [{ wch: 20 }, { wch: 38 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws, "P&L Statement")
    downloadWorkbook(wb, `Profit_Loss_${startDate}_to_${endDate}.xlsx`)
  }

  const exportBalanceSheetExcel = () => {
    if (!balanceSheet) return
    const wb = XLSX.utils.book_new()
    const bs = balanceSheet.balanceSheet

    const rows: any[][] = [
      ["CODE AQUA ERP"],
      ["Balance Sheet"],
      [`As of Date: ${new Date(balanceSheet.asOfDate).toLocaleDateString()}`],
      [],
      ["ASSETS"],
      ["Ledger Code", "Ledger Name", "Category", "Amount (LKR)"],
      ...bs.assets.accounts.map((a: any) => [a.ledgerCode, a.ledgerName, a.category, parseFloat(a.amount)]),
      ["Total Assets", "", "", parseFloat(bs.assets.total)],
      [],
      ["LIABILITIES"],
      ["Ledger Code", "Ledger Name", "Category", "Amount (LKR)"],
      ...bs.liabilities.accounts.map((a: any) => [a.ledgerCode, a.ledgerName, a.category, parseFloat(a.amount)]),
      ["Total Liabilities", "", "", parseFloat(bs.liabilities.total)],
      [],
      ["EQUITY"],
      ["Ledger Code", "Ledger Name", "Category", "Amount (LKR)"],
      ...bs.equity.accounts.map((a: any) => [a.ledgerCode, a.ledgerName, a.category, parseFloat(a.amount)]),
      ["Total Equity", "", "", parseFloat(bs.equity.total)],
      [],
      ["Total Liabilities + Equity", "", "", parseFloat(balanceSheet.summary.totalLiabilitiesAndEquity)],
      ["Difference", "", "", parseFloat(balanceSheet.summary.difference)],
      ["Status", "", "", balanceSheet.summary.isBalanced ? "Balanced" : "Unbalanced"],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws["!cols"] = [{ wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet")
    downloadWorkbook(wb, `Balance_Sheet_${asOfDate}.xlsx`)
  }

  const exportAccountsReceivableExcel = () => {
    if (!customerOutstanding) return
    const wb = XLSX.utils.book_new()

    // Summary sheet
    const summaryRows: any[][] = [
      ["CODE AQUA ERP"],
      ["Accounts Receivable Report"],
      [`As of Date: ${new Date(customerOutstanding.asOfDate).toLocaleDateString()}`],
      [],
      ["Total Customers", customerOutstanding.summary.totalCustomers],
      ["Total Outstanding (LKR)", parseFloat(customerOutstanding.summary.totalOutstanding)],
      ["Overdue Cases", customerOutstanding.summary.overdueCases],
      [],
      ["Customer Name", "Credit Limit", "Total Outstanding", "Unapplied Credits", "Credit Exceeded"],
      ...customerOutstanding.customerOutstanding.map((c: any) => [
        c.customerName,
        parseFloat(c.creditLimit),
        parseFloat(c.totalOutstanding),
        parseFloat(c.unappliedCredits),
        c.creditExceeded ? "Yes" : "No",
      ])
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
    wsSummary["!cols"] = [{ wch: 35 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, "AR Summary")

    // Detailed sheet (all invoices)
    const detailRows: any[][] = [
      ["Customer Name", "Invoice #", "Invoice Date", "Invoice Total", "Paid Amount", "Outstanding", "Days Outstanding", "Aging Bucket"],
    ]
    customerOutstanding.customerOutstanding.forEach((c: any) => {
      c.invoices.forEach((inv: any) => {
        detailRows.push([
          c.customerName,
          inv.invoiceNumber,
          new Date(inv.invoiceDate).toLocaleDateString(),
          parseFloat(inv.total),
          parseFloat(inv.paidAmount || 0),
          parseFloat(inv.outstanding),
          inv.daysOutstanding,
          inv.agingBucket,
        ])
      })
    })
    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows)
    wsDetail["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, wsDetail, "Invoice Details")

    downloadWorkbook(wb, `Accounts_Receivable_${asOfDate}.xlsx`)
  }

  const exportAccountsPayableExcel = () => {
    if (!supplierOutstanding) return
    const wb = XLSX.utils.book_new()

    // Summary sheet
    const summaryRows: any[][] = [
      ["CODE AQUA ERP"],
      ["Accounts Payable Report"],
      [`As of Date: ${new Date(supplierOutstanding.asOfDate).toLocaleDateString()}`],
      [],
      ["Total Suppliers", supplierOutstanding.summary.totalSuppliers],
      ["Total Outstanding (LKR)", parseFloat(supplierOutstanding.summary.totalOutstanding)],
      ["Overdue Payments", supplierOutstanding.summary.overduePayments],
      [],
      ["Supplier Name", "Total Outstanding (LKR)"],
      ...supplierOutstanding.supplierOutstanding.map((s: any) => [
        s.supplierName,
        parseFloat(s.totalOutstanding),
      ])
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
    wsSummary["!cols"] = [{ wch: 35 }, { wch: 22 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, "AP Summary")

    // Detailed sheet (all bills)
    const detailRows: any[][] = [
      ["Supplier Name", "Bill #", "Bill Date", "Due Date", "Bill Amount", "Paid Amount", "Outstanding", "Days Overdue", "Aging Bucket"],
    ]
    supplierOutstanding.supplierOutstanding.forEach((s: any) => {
      s.bills.forEach((b: any) => {
        detailRows.push([
          s.supplierName,
          b.billNumber,
          new Date(b.billDate).toLocaleDateString(),
          new Date(b.dueDate).toLocaleDateString(),
          parseFloat(b.billAmount),
          parseFloat(b.paidAmount || 0),
          parseFloat(b.outstanding),
          b.daysOverdue,
          b.agingBucket,
        ])
      })
    })
    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows)
    wsDetail["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 13 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, wsDetail, "Bill Details")

    downloadWorkbook(wb, `Accounts_Payable_${asOfDate}.xlsx`)
  }

  const exportCashBankBookExcel = () => {
    if (!cashBank) return
    const wb = XLSX.utils.book_new()

    // Summary sheet
    const summaryRows: any[][] = [
      ["CODE AQUA ERP"],
      ["Cash & Bank Book"],
      [`Period: ${cashBank.period?.startDate ?? "All"} to ${cashBank.period?.endDate ?? "All"}`],
      [],
      ["Total Cash (LKR)", parseFloat(cashBank.summary.totalCash)],
      ["Total Bank (LKR)", parseFloat(cashBank.summary.totalBank)],
      ["Total Cash & Bank (LKR)", parseFloat(cashBank.summary.totalCashAndBank)],
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
    wsSummary["!cols"] = [{ wch: 28 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary")

    // One sheet per account
    cashBank.accounts.forEach((account: any, idx: number) => {
      const accountRows: any[][] = [
        [`Account: ${account.ledgerName} (${account.ledgerType})`],
        ["Opening Balance (LKR)", parseFloat(account.openingBalance)],
        ["Closing Balance (LKR)", parseFloat(account.closingBalance)],
        [],
        ["Date", "Transaction #", "Reference #", "Module", "Description", "Debit (LKR)", "Credit (LKR)", "Balance (LKR)"],
        ...account.transactions.map((tx: any) => [
          new Date(tx.date).toLocaleDateString(),
          tx.transactionNumber,
          tx.referenceNumber || "-",
          tx.module,
          tx.description,
          parseFloat(tx.debit),
          parseFloat(tx.credit),
          parseFloat(tx.balance),
        ])
      ]
      const wsAccount = XLSX.utils.aoa_to_sheet(accountRows)
      wsAccount["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
      // Sheet name max 31 chars
      const sheetName = account.ledgerName.substring(0, 28) + (idx > 0 ? `_${idx}` : "")
      XLSX.utils.book_append_sheet(wb, wsAccount, sheetName.substring(0, 31))
    })

    downloadWorkbook(wb, `Cash_Bank_Book_${startDate}_to_${endDate}.xlsx`)
  }

  const exportGeneralLedgerExcel = () => {
    if (!generalLedger) return
    const wb = XLSX.utils.book_new()

    // Summary sheet
    const summaryRows: any[][] = [
      ["CODE AQUA ERP"],
      ["General Ledger Report"],
      [`Period: ${startDate} to ${endDate}`],
      [],
      ["Ledger Code", "Ledger Name", "Account Type", "Category", "Opening Balance", "Total Debit", "Total Credit", "Net Movement", "Closing Balance"],
      ...(generalLedger.generalLedger || []).map((acct: any) => [
        acct.ledgerAccount.ledgerCode,
        acct.ledgerAccount.name,
        acct.ledgerAccount.accountType,
        acct.ledgerAccount.accountCategory,
        parseFloat(acct.balances.openingBalance),
        parseFloat(acct.periodTotals.totalDebit),
        parseFloat(acct.periodTotals.totalCredit),
        parseFloat(acct.periodTotals.netMovement),
        parseFloat(acct.balances.closingBalance),
      ])
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
    wsSummary["!cols"] = [{ wch: 14 }, { wch: 34 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, "GL Summary")

    const usedNames = new Set<string>()
    usedNames.add("gl summary")

    // Individual account sheets
    ;(generalLedger.generalLedger || []).forEach((acct: any, idx: number) => {
      const txRows: any[][] = [
        [`${acct.ledgerAccount.ledgerCode} - ${acct.ledgerAccount.name}`],
        [`Account Type: ${acct.ledgerAccount.accountType}   Category: ${acct.ledgerAccount.accountCategory}`],
        [`Period: ${startDate} to ${endDate}`],
        [],
        ["Opening Balance", parseFloat(acct.balances.openingBalance), acct.balances.openingBalanceType],
        [],
        ["Date", "Transaction #", "Module", "Reference #", "Description", "Debit (LKR)", "Credit (LKR)", "Balance (LKR)", "Bal Type"],
        ...(acct.transactions || []).map((tx: any) => [
          new Date(tx.transactionDate).toLocaleDateString(),
          tx.transactionNumber,
          tx.module,
          tx.referenceNumber || "-",
          tx.description,
          parseFloat(tx.debit),
          parseFloat(tx.credit),
          parseFloat(tx.balance),
          tx.balanceType,
        ]),
        [],
        ["Closing Balance", parseFloat(acct.balances.closingBalance), acct.balances.closingBalanceType],
      ]
      const ws = XLSX.utils.aoa_to_sheet(txRows)
      ws["!cols"] = [{ wch: 13 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 8 }]
      
      const cleanName = acct.ledgerAccount.name.replace(/[^a-zA-Z0-9 _-]/g, "").trim()
      let sheetName = cleanName.substring(0, 31).trim()
      if (!sheetName) {
        sheetName = `Acct_${idx}`
      }

      if (usedNames.has(sheetName.toLowerCase())) {
        const code = acct.ledgerAccount.ledgerCode || `${idx}`
        const suffix = `_${code}`
        sheetName = `${sheetName.substring(0, 31 - suffix.length)}${suffix}`

        let counter = 1
        let finalName = sheetName
        while (usedNames.has(finalName.toLowerCase())) {
          const countSuffix = `_${counter}`
          finalName = `${sheetName.substring(0, 31 - countSuffix.length)}${countSuffix}`
          counter++
        }
        sheetName = finalName
      }

      usedNames.add(sheetName.toLowerCase())
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })

    downloadWorkbook(wb, `General_Ledger_${startDate}_to_${endDate}.xlsx`)
  }

  const exportLedgerDetailsExcel = () => {
    if (!ledgerDetails) return
    const wb = XLSX.utils.book_new()
    const la = ledgerDetails.ledgerAccount

    const rows: any[][] = [
      ["CODE AQUA ERP"],
      ["Ledger Details Report"],
      [`Ledger: ${la.ledgerCode} - ${la.name}`],
      [`Account Type: ${la.accountType}   Category: ${la.accountCategory}`],
      [`Period: ${new Date(ledgerDetails.period.startDate).toLocaleDateString()} to ${new Date(ledgerDetails.period.endDate).toLocaleDateString()}`],
      [],
      ["Opening Balance (LKR)", parseFloat(ledgerDetails.balances.openingBalance), ledgerDetails.balances.openingBalanceType],
      ["Total Debit (LKR)", parseFloat(ledgerDetails.periodTotals.totalDebit)],
      ["Total Credit (LKR)", parseFloat(ledgerDetails.periodTotals.totalCredit)],
      ["Net Movement (LKR)", parseFloat(ledgerDetails.periodTotals.netMovement)],
      ["Closing Balance (LKR)", parseFloat(ledgerDetails.balances.closingBalance), ledgerDetails.balances.closingBalanceType],
      [],
      ["Date", "Transaction #", "Module", "Reference #", "Description", "Debit (LKR)", "Credit (LKR)", "Balance (LKR)", "Balance Type", "Prepared By"],
      ...ledgerDetails.transactions.map((tx: any) => [
        new Date(tx.transactionDate).toLocaleDateString(),
        tx.transactionNumber,
        tx.module,
        tx.referenceNumber || "-",
        tx.description,
        parseFloat(tx.debit),
        parseFloat(tx.credit),
        parseFloat(tx.balance),
        tx.balanceType,
        tx.createdBy ? (tx.createdBy.fullName || tx.createdBy.username) : "System"
      ])
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 38 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws, "Ledger Details")
    const safeName = la.name.replace(/[^a-zA-Z0-9_\- ]/g, "").substring(0, 20)
    downloadWorkbook(wb, `Ledger_${safeName}_${startDate}_to_${endDate}.xlsx`)
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Accounting Reports</h1>
            <p className="text-muted-foreground">
              Comprehensive financial reports for monitoring business health
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="bg-slate-100/80 p-1 mb-8 border border-slate-200/50 backdrop-blur-sm sticky top-0 z-10 grid grid-cols-3 md:grid-cols-5 lg:grid-cols-10 h-auto gap-1">
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm py-2 text-xs font-semibold transition-all">
              <BarChart3 className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="profit-loss" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm py-2 text-xs font-semibold transition-all">
              <TrendingUp className="h-3.5 w-3.5" />
              P&L
            </TabsTrigger>
            <TabsTrigger value="ledger-details" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm py-2 text-xs font-semibold transition-all">
              <FileText className="h-3.5 w-3.5" />
              Ledger
            </TabsTrigger>
            <TabsTrigger value="balance-sheet" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm py-2 text-xs font-semibold transition-all">
              <PieChart className="h-3.5 w-3.5" />
              Balance
            </TabsTrigger>
            <TabsTrigger value="trial-balance" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm py-2 text-xs font-semibold transition-all">
              <RefreshCw className="h-3.5 w-3.5" />
              Trial
            </TabsTrigger>
            <TabsTrigger value="customer-outstanding" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm py-2 text-xs font-semibold transition-all">
              <ArrowDownRight className="h-3.5 w-3.5" />
              AR
            </TabsTrigger>
            <TabsTrigger value="supplier-outstanding" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm py-2 text-xs font-semibold transition-all">
              <ArrowUpRight className="h-3.5 w-3.5" />
              AP
            </TabsTrigger>
            <TabsTrigger value="stock-valuation" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm py-2 text-xs font-semibold transition-all">
              <BarChart3 className="h-3.5 w-3.5 rotate-90" />
              Stock
            </TabsTrigger>
            <TabsTrigger value="cash-bank" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm py-2 text-xs font-semibold transition-all">
              <Wallet className="h-3.5 w-3.5" />
              Cash
            </TabsTrigger>
            <TabsTrigger value="general-ledger" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm py-2 text-xs font-semibold transition-all">
              <FileText className="h-3.5 w-3.5" />
              Gen. Ledger
            </TabsTrigger>
          </TabsList>

          {/* Trial Balance Report */}
          <TabsContent value="trial-balance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trial Balance Report</CardTitle>
                <CardDescription>Verify accounting data correctness</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Filter */}
                {/* Filter & Search Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                  <div className="flex gap-4 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-500">As of Date</Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={asOfDate}
                          onChange={(e) => setAsOfDate(e.target.value)}
                          className="h-9 w-40 bg-white"
                        />
                        <Button
                          onClick={() => loadReport("trial-balance")}
                          size="sm"
                          className="gap-2"
                        >
                          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Filter ledger by name or code..."
                        value={trialBalanceSearch}
                        onChange={(e) => setTrialBalanceSearch(e.target.value)}
                        className="pl-9 h-9 bg-white"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportTrialBalanceExcel}
                      disabled={!trialBalance || loading}
                      className="gap-2 border-slate-200"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Report Content */}
                {!loading && trialBalance && (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total Debits</p>
                          <p className="text-2xl font-bold text-indigo-600 mt-1">
                            {formatCurrency(trialBalance.summary.totalDebits)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total Credits</p>
                          <p className="text-2xl font-bold text-emerald-600 mt-1">
                            {formatCurrency(trialBalance.summary.totalCredits)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-amber-500 shadow-sm">
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Difference</p>
                          <p className="text-2xl font-bold text-amber-600 mt-1">
                            {formatCurrency(trialBalance.summary.difference)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card
                        className={cn(
                          "border-l-4 shadow-sm",
                          trialBalance.summary.isBalanced ? "border-l-green-500 bg-green-50/30" : "border-l-red-500 bg-red-50/30"
                        )}
                      >
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider text-center">Final Status</p>
                          <div className="flex items-center justify-center gap-2 mt-1">
                            {trialBalance.summary.isBalanced ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="font-black text-green-600 uppercase">Balanced</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-5 w-5 text-red-600" />
                                <span className="font-black text-red-600 uppercase">Unbalanced</span>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="w-32 font-bold text-slate-700">Code</TableHead>
                            <TableHead className="font-bold text-slate-700">Ledger Name</TableHead>
                            <TableHead className="font-bold text-slate-700">Category</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Opening</TableHead>
                            <TableHead className="text-right font-bold text-indigo-700">Debits</TableHead>
                            <TableHead className="text-right font-bold text-emerald-700">Credits</TableHead>
                            <TableHead className="text-right font-bold text-slate-900">Closing</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trialBalance.data
                            .filter((row: any) =>
                              row.ledgerName.toLowerCase().includes(trialBalanceSearch.toLowerCase()) ||
                              row.ledgerCode.toLowerCase().includes(trialBalanceSearch.toLowerCase()) ||
                              row.accountType?.toLowerCase().includes(trialBalanceSearch.toLowerCase())
                            )
                            .map((row: any, idx: number) => (
                              <TableRow key={idx} className="hover:bg-slate-50/80 transition-colors">
                                <TableCell className="font-mono text-xs text-slate-500">{row.ledgerCode}</TableCell>
                                <TableCell>
                                  <span
                                    className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                    onClick={() => handleDrillDown(row.ledgerCode)}
                                  >
                                    {row.ledgerName}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] font-bold uppercase opacity-70">
                                    {row.accountType}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-slate-500">
                                  {formatCurrency(row.openingBalance)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-indigo-600 bg-indigo-50/20">
                                  {formatCurrency(row.journalDebits)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-emerald-600 bg-emerald-50/20">
                                  {formatCurrency(row.journalCredits)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-slate-900">
                                  {formatCurrency(row.closingBalance)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profit & Loss Report */}
          <TabsContent value="profit-loss" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss Statement</CardTitle>
                <CardDescription>Measure business performance over a period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Range Filter */}
                <div className="flex flex-wrap gap-4 items-end justify-between">
                  <div className="flex gap-4 items-end">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <Button onClick={() => loadReport("profit-loss")}>Apply</Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={exportProfitLossExcel}
                    disabled={!profitLoss || loading}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Excel
                  </Button>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Report Content */}
                {!loading && profitLoss && (
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Gross Profit</p>
                              <p className="text-2xl font-bold text-slate-900 mt-1">
                                {formatCurrency(profitLoss.incomeStatement.grossProfit)}
                              </p>
                            </div>
                            <div className="bg-blue-50 p-2 rounded-full">
                              <BarChart3 className="h-5 w-5 text-blue-500" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className={cn(
                        "border-l-4 shadow-sm hover:shadow-md transition-shadow",
                        parseFloat(profitLoss.incomeStatement.netProfitLoss) >= 0 ? "border-l-emerald-500" : "border-l-rose-500"
                      )}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Net Profit/Loss</p>
                              <p className={cn(
                                "text-2xl font-bold mt-1",
                                parseFloat(profitLoss.incomeStatement.netProfitLoss) >= 0 ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {formatCurrency(profitLoss.incomeStatement.netProfitLoss)}
                              </p>
                            </div>
                            <div className={cn(
                              "p-2 rounded-full",
                              parseFloat(profitLoss.incomeStatement.netProfitLoss) >= 0 ? "bg-emerald-50" : "bg-rose-50"
                            )}>
                              {parseFloat(profitLoss.incomeStatement.netProfitLoss) >= 0 ? (
                                <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <ArrowDownRight className="h-5 w-5 text-rose-500" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Profit Margin</p>
                              <p className="text-2xl font-bold text-indigo-900 mt-1">
                                {formatPercent(profitLoss.incomeStatement.profitMargin)}
                              </p>
                            </div>
                            <div className="bg-indigo-50 p-2 rounded-full">
                              <PieChart className="h-5 w-5 text-indigo-500" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Revenue</p>
                              <p className="text-2xl font-bold text-amber-900 mt-1">
                                {formatCurrency(profitLoss.incomeStatement.sales.total)}
                              </p>
                            </div>
                            <div className="bg-amber-50 p-2 rounded-full">
                              <TrendingUp className="h-5 w-5 text-amber-500" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Income Statement */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Income Statement Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Sales */}
                        <div>
                          <h3 className="font-semibold mb-2">Sales Revenue</h3>
                          <div className="ml-4">
                            <Table>
                              <TableBody>
                                {profitLoss.incomeStatement.sales.accounts.map((account: any, idx: number) => (
                                  <React.Fragment key={idx}>
                                    <TableRow
                                      className="cursor-pointer hover:bg-slate-50 border-none group transition-colors"
                                      onClick={() => toggleRowExpand(account.ledgerCode)}
                                    >
                                      <TableCell className="p-2 flex items-center gap-2">
                                        {expandedRows[account.ledgerCode] ? (
                                          <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                                        )}
                                        <span className="text-blue-600 hover:text-blue-800 transition-colors font-medium">
                                          {account.ledgerName}
                                        </span>
                                      </TableCell>
                                      <TableCell className="p-2 text-right font-medium">
                                        {formatCurrency(account.amount)}
                                      </TableCell>
                                    </TableRow>

                                    {expandedLoading[account.ledgerCode] && (
                                      <TableRow className="border-none">
                                        <TableCell colSpan={2} className="py-2 pl-12 text-muted-foreground flex items-center gap-2 text-xs">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          Loading transactions...
                                        </TableCell>
                                      </TableRow>
                                    )}

                                    {expandedRows[account.ledgerCode] && (
                                      <TableRow className="hover:bg-transparent border-none">
                                        <TableCell colSpan={2} className="p-0 pb-3 pl-10 pr-2">
                                          <div className="border-l-2 border-slate-200 pl-4 bg-slate-50/50 rounded-b-lg p-3">
                                            <Table className="text-[11px]">
                                              <TableHeader className="bg-slate-100/50">
                                                <TableRow className="hover:bg-transparent border-none h-8">
                                                  <TableHead className="h-8 py-1">Date</TableHead>
                                                  <TableHead className="h-8 py-1">Ref #</TableHead>
                                                  <TableHead className="h-8 py-1">Description</TableHead>
                                                  <TableHead className="h-8 py-1 text-right">Amount</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {expandedRows[account.ledgerCode].transactions.map((tx: any) => (
                                                  <TableRow
                                                    key={tx.transactionId}
                                                    className="hover:bg-slate-100 border-b border-slate-100/50 h-8 cursor-pointer"
                                                    onClick={() => handleRowClick(tx)}
                                                  >
                                                    <TableCell className="py-1">{new Date(tx.transactionDate).toLocaleDateString()}</TableCell>
                                                    <TableCell className="py-1">
                                                      <span
                                                        className="font-mono text-[10px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          const url = getTransactionUrl(tx);
                                                          if (url) window.open(url, "_blank");
                                                        }}
                                                      >
                                                        {tx.transactionNumber}
                                                      </span>
                                                    </TableCell>
                                                    <TableCell className="py-1 truncate max-w-[200px]" title={tx.description}>
                                                      {tx.description}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-right font-medium">
                                                      {formatCurrency(parseFloat(tx.debit) - parseFloat(tx.credit))}
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                                {expandedRows[account.ledgerCode].transactions.length === 0 && (
                                                  <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground italic">
                                                      No transactions found
                                                    </TableCell>
                                                  </TableRow>
                                                )}
                                                <TableRow className="border-t-2 border-slate-200 bg-slate-100/30">
                                                  <TableCell colSpan={3} className="text-right font-semibold py-1">Subtotal:</TableCell>
                                                  <TableCell className="text-right font-bold py-1 text-blue-700">
                                                    {formatCurrency(account.amount)}
                                                  </TableCell>
                                                </TableRow>
                                              </TableBody>
                                            </Table>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                ))}
                                <TableRow className="border-t-2 font-bold bg-muted/30">
                                  <TableCell className="p-2">Total Sales Revenue</TableCell>
                                  <TableCell className="p-2 text-right">{formatCurrency(profitLoss.incomeStatement.sales.total)}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        {/* COGS */}
                        <div>
                          <h3 className="font-semibold mb-2">Cost of Goods Sold</h3>
                          <div className="ml-4 font-semibold flex justify-between">
                            <span>COGS</span>
                            <span>{formatCurrency(profitLoss.incomeStatement.costOfGoodsSold.amount)}</span>
                          </div>
                        </div>

                        {/* Operating Expenses */}
                        <div>
                          <h3 className="font-semibold mb-2">Operating Expenses</h3>
                          <div className="ml-4">
                            <Table>
                              <TableBody>
                                {profitLoss.incomeStatement.operatingExpenses.accounts.map((account: any, idx: number) => (
                                  <React.Fragment key={idx}>
                                    <TableRow
                                      className="cursor-pointer hover:bg-slate-50 border-none group transition-colors"
                                      onClick={() => toggleRowExpand(account.ledgerCode)}
                                    >
                                      <TableCell className="p-2 flex items-center gap-2">
                                        {expandedRows[account.ledgerCode] ? (
                                          <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                                        )}
                                        <span className="text-blue-600 hover:text-blue-800 transition-colors font-medium">
                                          {account.ledgerName}
                                        </span>
                                      </TableCell>
                                      <TableCell className="p-2 text-right font-medium">
                                        {formatCurrency(account.amount)}
                                      </TableCell>
                                    </TableRow>

                                    {expandedLoading[account.ledgerCode] && (
                                      <TableRow className="border-none">
                                        <TableCell colSpan={2} className="py-2 pl-12 text-muted-foreground flex items-center gap-2 text-xs">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          Loading transactions...
                                        </TableCell>
                                      </TableRow>
                                    )}

                                    {expandedRows[account.ledgerCode] && (
                                      <TableRow className="hover:bg-transparent border-none">
                                        <TableCell colSpan={2} className="p-0 pb-3 pl-10 pr-2">
                                          <div className="border-l-2 border-slate-200 pl-4 bg-slate-50/50 rounded-b-lg p-3">
                                            <Table className="text-[11px]">
                                              <TableHeader className="bg-slate-100/50">
                                                <TableRow className="hover:bg-transparent border-none h-8">
                                                  <TableHead className="h-8 py-1">Date</TableHead>
                                                  <TableHead className="h-8 py-1">Ref #</TableHead>
                                                  <TableHead className="h-8 py-1">Description</TableHead>
                                                  <TableHead className="h-8 py-1 text-right">Amount</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {expandedRows[account.ledgerCode].transactions.map((tx: any) => (
                                                  <TableRow
                                                    key={tx.transactionId}
                                                    className="hover:bg-slate-100 border-b border-slate-100/50 h-8 cursor-pointer"
                                                    onClick={() => handleRowClick(tx)}
                                                  >
                                                    <TableCell className="py-1">{new Date(tx.transactionDate).toLocaleDateString()}</TableCell>
                                                    <TableCell className="py-1">
                                                      <span
                                                        className="font-mono text-[10px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          const url = getTransactionUrl(tx);
                                                          if (url) window.open(url, "_blank");
                                                        }}
                                                      >
                                                        {tx.transactionNumber}
                                                      </span>
                                                    </TableCell>
                                                    <TableCell className="py-1 truncate max-w-[200px]" title={tx.description}>
                                                      {tx.description}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-right font-medium">
                                                      {formatCurrency(parseFloat(tx.debit) - parseFloat(tx.credit))}
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                                {expandedRows[account.ledgerCode].transactions.length === 0 && (
                                                  <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground italic">
                                                      No transactions found
                                                    </TableCell>
                                                  </TableRow>
                                                )}
                                                <TableRow className="border-t-2 border-slate-200 bg-slate-100/30">
                                                  <TableCell colSpan={3} className="text-right font-semibold py-1">Subtotal:</TableCell>
                                                  <TableCell className="text-right font-bold py-1 text-blue-700">
                                                    {formatCurrency(account.amount)}
                                                  </TableCell>
                                                </TableRow>
                                              </TableBody>
                                            </Table>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                ))}
                                <TableRow className="border-t-2 font-bold bg-muted/30">
                                  <TableCell className="p-2">Total Expenses</TableCell>
                                  <TableCell className="p-2 text-right">{formatCurrency(profitLoss.incomeStatement.operatingExpenses.total)}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Sheet Report */}
          <TabsContent value="balance-sheet" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
                <CardDescription>Financial position on a specific date</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Filter */}
                <div className="flex flex-wrap gap-4 items-end justify-between">
                  <div className="flex gap-4 items-end">
                    <div>
                      <Label>As of Date</Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={asOfDate}
                          onChange={(e) => setAsOfDate(e.target.value)}
                        />
                        <Button onClick={() => loadReport("balance-sheet")}>Apply</Button>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={exportBalanceSheetExcel}
                    disabled={!balanceSheet || loading}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Excel
                  </Button>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Report Content */}
                {!loading && balanceSheet && (
                  <div className="space-y-6">
                    {/* Balance Sheet Status */}
                    <div className={cn(
                      "p-4 rounded-xl border flex items-center justify-between mb-8 shadow-sm transition-all",
                      balanceSheet.summary.isBalanced
                        ? "bg-emerald-50 border-emerald-100 text-emerald-900"
                        : "bg-rose-50 border-rose-100 text-rose-900 animate-pulse"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-3 rounded-full",
                          balanceSheet.summary.isBalanced ? "bg-emerald-100/50" : "bg-rose-100/50"
                        )}>
                          {balanceSheet.summary.isBalanced ? (
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-6 w-6 text-rose-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider opacity-60">Status</p>
                          <p className="text-lg font-bold">{balanceSheet.summary.message}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-wider opacity-60">Difference</p>
                        <p className="text-lg font-mono font-bold">
                          {formatCurrency(parseFloat(balanceSheet.balanceSheet.assets.total) - (parseFloat(balanceSheet.balanceSheet.liabilities.total) + parseFloat(balanceSheet.balanceSheet.equity.total)))}
                        </p>
                      </div>
                    </div>

                    {/* Standard Financial Layout: Assets vs L&E */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                      {/* Left Side: Assets */}
                      <div className="space-y-6">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Assets</CardTitle>
                              <Wallet className="h-4 w-4 text-slate-400" />
                            </div>
                          </CardHeader>
                          <CardContent className="p-0">
                            <Table>
                              <TableBody>
                                {balanceSheet.balanceSheet.assets.accounts.map((account: any, idx: number) => (
                                  <TableRow key={idx} className="hover:bg-slate-50 border-slate-100">
                                    <TableCell className="py-2 pl-4">
                                      <span
                                        className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                                        onClick={() => handleDrillDown(account.ledgerCode)}
                                      >
                                        {account.ledgerName}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-2 pr-4 text-right font-medium text-sm">
                                      {formatCurrency(account.amount)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-slate-50 relative">
                                  <TableCell className="py-4 pl-4 font-bold text-slate-900 text-lg">Total Assets</TableCell>
                                  <TableCell className="py-4 pr-4 text-right font-black text-slate-900 text-xl">
                                    {formatCurrency(balanceSheet.balanceSheet.assets.total)}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Right Side: Liabilities & Equity */}
                      <div className="space-y-6">
                        {/* Liabilities */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Liabilities</CardTitle>
                              <ArrowUpRight className="h-4 w-4 text-slate-400" />
                            </div>
                          </CardHeader>
                          <CardContent className="p-0">
                            <Table>
                              <TableBody>
                                {balanceSheet.balanceSheet.liabilities.accounts.map((account: any, idx: number) => (
                                  <TableRow key={idx} className="hover:bg-slate-50 border-slate-100">
                                    <TableCell className="py-2 pl-4">
                                      <span
                                        className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                                        onClick={() => handleDrillDown(account.ledgerCode)}
                                      >
                                        {account.ledgerName}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-2 pr-4 text-right font-medium text-sm">
                                      {formatCurrency(account.amount)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-slate-50">
                                  <TableCell className="py-2 pl-4 font-bold text-slate-700">Total Liabilities</TableCell>
                                  <TableCell className="py-2 pr-4 text-right font-bold text-slate-700">
                                    {formatCurrency(balanceSheet.balanceSheet.liabilities.total)}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>

                        {/* Equity */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Equity</CardTitle>
                              <PieChart className="h-4 w-4 text-slate-400" />
                            </div>
                          </CardHeader>
                          <CardContent className="p-0">
                            <Table>
                              <TableBody>
                                {balanceSheet.balanceSheet.equity.accounts.map((account: any, idx: number) => (
                                  <TableRow key={idx} className="hover:bg-slate-50 border-slate-100">
                                    <TableCell className="py-2 pl-4">
                                      <span
                                        className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                                        onClick={() => handleDrillDown(account.ledgerCode)}
                                      >
                                        {account.ledgerName}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-2 pr-4 text-right font-medium text-sm">
                                      {formatCurrency(account.amount)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-slate-50">
                                  <TableCell className="py-2 pl-4 font-bold text-slate-700">Total Equity</TableCell>
                                  <TableCell className="py-2 pr-4 text-right font-bold text-slate-700">
                                    {formatCurrency(balanceSheet.balanceSheet.equity.total)}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>

                        {/* Summary of L&E */}
                        <Card className="border-slate-950 bg-slate-900 text-white shadow-xl">
                          <CardContent className="p-6 flex justify-between items-center">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider opacity-60">Total Liabilities & Equity</p>
                              <p className="text-2xl lg:text-3xl font-black">
                                {formatCurrency(parseFloat(balanceSheet.balanceSheet.liabilities.total) + parseFloat(balanceSheet.balanceSheet.equity.total))}
                              </p>
                            </div>
                            <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center">
                              <CheckCircle className="h-8 w-8 text-emerald-400" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customer Outstanding Report */}
          <TabsContent value="customer-outstanding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Accounts Receivable</CardTitle>
                <CardDescription>Money customers still owe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Filter */}
                <div className="flex flex-wrap gap-4 items-end justify-between">
                  <div className="flex gap-4 items-end">
                    <div>
                      <Label>As of Date</Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={asOfDate}
                          onChange={(e) => setAsOfDate(e.target.value)}
                        />
                        <Button onClick={() => loadReport("customer-outstanding")}>Apply</Button>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={exportAccountsReceivableExcel}
                    disabled={!customerOutstanding || loading}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Excel
                  </Button>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Summary Cards */}
                {!loading && customerOutstanding && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-sm">Total Customers</p>
                          <p className="text-2xl font-bold">{customerOutstanding.summary.totalCustomers}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-sm">Total Outstanding</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {formatCurrency(customerOutstanding.summary.totalOutstanding)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-sm">Overdue Cases</p>
                          <p className="text-2xl font-bold text-red-600">
                            {customerOutstanding.summary.overdueCases}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Customers Table */}
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer Name</TableHead>
                            <TableHead className="text-right">Credit Limit</TableHead>
                            <TableHead className="text-right">Outstanding</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerOutstanding.customerOutstanding.map((customer: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{customer.customerName}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(customer.creditLimit)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(customer.totalOutstanding)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={customer.creditExceeded ? "destructive" : "secondary"}
                                >
                                  {customer.creditExceeded ? "Over Limit" : "OK"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Supplier Outstanding Report */}
          <TabsContent value="supplier-outstanding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Accounts Payable</CardTitle>
                <CardDescription>Money you owe to suppliers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Filter */}
                <div className="flex flex-wrap gap-4 items-end justify-between">
                  <div className="flex gap-4 items-end">
                    <div>
                      <Label>As of Date</Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={asOfDate}
                          onChange={(e) => setAsOfDate(e.target.value)}
                        />
                        <Button onClick={() => loadReport("supplier-outstanding")}>Apply</Button>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={exportAccountsPayableExcel}
                    disabled={!supplierOutstanding || loading}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Excel
                  </Button>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Summary Cards */}
                {!loading && supplierOutstanding && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-sm">Total Suppliers</p>
                          <p className="text-2xl font-bold">{supplierOutstanding.summary.totalSuppliers}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-sm">Total Outstanding</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {formatCurrency(supplierOutstanding.summary.totalOutstanding)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-sm">Overdue Payments</p>
                          <p className="text-2xl font-bold text-red-600">
                            {supplierOutstanding.summary.overduePayments}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Suppliers Table */}
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Supplier Name</TableHead>
                            <TableHead className="text-right">Outstanding Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {supplierOutstanding.supplierOutstanding.map((supplier: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{supplier.supplierName}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(supplier.totalOutstanding)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Valuation Report */}
          <TabsContent value="stock-valuation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Stock Valuation</CardTitle>
                <CardDescription>Monetary value of inventory</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Filter */}
                <div className="flex gap-4 items-end">
                  <div>
                    <Label>As of Date</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={asOfDate}
                        onChange={(e) => setAsOfDate(e.target.value)}
                      />
                      <Button onClick={() => loadReport("stock-valuation")}>Apply</Button>
                    </div>
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Summary Cards */}
                {!loading && stockValuation && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-sm">Valuation at Cost</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(stockValuation.summary.totalValuationAtCost)}
                          </p>
                        </CardContent>
                      </Card>
                      {/* <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-sm">Valuation at Market</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(stockValuation.summary.totalValuationAtMarket)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-sm">Potential Profit</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(stockValuation.summary.potentialProfit)}
                          </p>
                        </CardContent>
                      </Card> */}
                    </div>

                    {/* Stock Items Table */}
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item SKU</TableHead>
                            <TableHead>Item Name</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Valuation</TableHead>
                            <TableHead className="text-right">Margin %</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockValuation.stockValuation.map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">{item.itemSku}</TableCell>
                              <TableCell>{item.itemName}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(item.valuationAtCost)}
                              </TableCell>
                              <TableCell className="text-right">{formatPercent(item.margin)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash & Bank Book */}
          <TabsContent value="cash-bank" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cash & Bank Book</CardTitle>
                <CardDescription>Real money movement tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Range Filter */}
                <div className="flex flex-wrap gap-4 items-end justify-between">
                  <div className="flex gap-4 items-end">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <Button onClick={() => loadReport("cash-bank")}>Apply</Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={exportCashBankBookExcel}
                    disabled={!cashBank || loading}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Excel
                  </Button>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Summary */}
                {!loading && cashBank && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-sm">Total Cash</p>
                          <p className="text-2xl font-bold">{formatCurrency(cashBank.summary.totalCash)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-sm">Total Bank</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(cashBank.summary.totalBank)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-sm">Total Cash & Bank</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(cashBank.summary.totalCashAndBank)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Accounts */}
                    {cashBank.accounts.map((account: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {account.ledgerName}
                            <Badge className="ml-2">{account.ledgerType}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between">
                              <span>Opening Balance:</span>
                              <span className="font-semibold">{formatCurrency(account.openingBalance)}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                              <span>Closing Balance:</span>
                              <span className="font-bold">{formatCurrency(account.closingBalance)}</span>
                            </div>
                          </div>

                          {/* Transactions Table */}
                          <div className="rounded-md border overflow-x-auto">
                            <Table className="text-sm">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="text-right">Debit</TableHead>
                                  <TableHead className="text-right">Credit</TableHead>
                                  <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {account.transactions.map((tx: any, txIdx: number) => (
                                  <TableRow key={txIdx}>
                                    <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                                    <TableCell>{tx.description}</TableCell>
                                    <TableCell className="text-right">
                                      {tx.debit > 0 ? formatCurrency(tx.debit) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {tx.credit > 0 ? formatCurrency(tx.credit) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {formatCurrency(tx.balance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Accounting Dashboard</CardTitle>
                <CardDescription>Comprehensive accounting overview</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Dashboard Content */}
                {!loading && dashboard && (
                  <div className="space-y-6">
                    {/* Trial Balance Status */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Trial Balance Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-muted-foreground text-sm">Total Debits</p>
                            <p className="text-2xl font-bold">
                              {formatCurrency(dashboard.dashboard.trialBalance.totalDebits)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-sm">Total Credits</p>
                            <p className="text-2xl font-bold">
                              {formatCurrency(dashboard.dashboard.trialBalance.totalCredits)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-sm">Status</p>
                            <div className="flex items-center gap-2 mt-2">
                              {dashboard.dashboard.trialBalance.isBalanced ? (
                                <>
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                  <span className="font-bold text-green-600">Balanced</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-5 w-5 text-red-600" />
                                  <span className="font-bold text-red-600">Unbalanced</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Profit & Loss Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">P&L Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-muted-foreground text-sm">Total Income</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {formatCurrency(dashboard.dashboard.profitAndLoss.totalIncome)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-sm">Total Expenses</p>
                            <p className="text-2xl font-bold text-red-600">
                              {formatCurrency(dashboard.dashboard.profitAndLoss.totalExpenses)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-sm">Net Profit</p>
                            <p
                              className={`text-2xl font-bold ${parseFloat(dashboard.dashboard.profitAndLoss.netProfit) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                                }`}
                            >
                              {formatCurrency(dashboard.dashboard.profitAndLoss.netProfit)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Balance Sheet Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Balance Sheet Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-muted-foreground text-sm">Total Assets</p>
                            <p className="text-2xl font-bold">
                              {formatCurrency(dashboard.dashboard.balanceSheet.totalAssets)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-sm">Total Liabilities</p>
                            <p className="text-2xl font-bold">
                              {formatCurrency(dashboard.dashboard.balanceSheet.totalLiabilities)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-sm">Total Equity</p>
                            <p className="text-2xl font-bold">
                              {formatCurrency(dashboard.dashboard.balanceSheet.totalEquity)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ledger Details Report */}
          <TabsContent value="ledger-details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ledger Details Report</CardTitle>
                <CardDescription>Detailed transaction history for a specific ledger account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Ledger Account *</Label>
                      <Select value={ledgerCategoryFilter} onValueChange={setLedgerCategoryFilter}>
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {Array.from(new Set(ledgerAccounts.map(a => a.AccountCategory?.name).filter(Boolean))).map(cat => (
                            <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <LedgerSelect
                        ledgers={ledgerAccounts.filter(account =>
                          ledgerCategoryFilter === "all" ||
                          account.AccountCategory?.name === ledgerCategoryFilter ||
                          account.accountCategory?.name === ledgerCategoryFilter
                        )}
                        value={selectedLedgerId}
                        onValueChange={setSelectedLedgerId}
                        placeholder="Select ledger account"
                        className="w-full font-normal"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => loadReport("ledger-details")}
                    disabled={!selectedLedgerId}
                  >
                    Generate Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportLedgerDetailsExcel}
                    disabled={!ledgerDetails || loading}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Excel
                  </Button>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Report Content */}
                {!loading && ledgerDetails && (
                  <div className="space-y-6">
                    {/* Ledger Account Info */}
                    <Card className="bg-slate-50 dark:bg-slate-900">
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Ledger Code</p>
                            <p className="font-mono font-bold">{ledgerDetails.ledgerAccount.ledgerCode}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Ledger Name</p>
                            <p className="font-semibold">{ledgerDetails.ledgerAccount.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Account Type</p>
                            <Badge variant="outline">{ledgerDetails.ledgerAccount.accountType}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Category</p>
                            <p className="text-sm">{ledgerDetails.ledgerAccount.accountCategory}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ledger Account Info Banner */}
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden mb-8">
                      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <FileText className="h-32 w-32" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <Badge className="bg-blue-500 text-white border-none hover:bg-blue-600 px-3 py-1 font-mono text-xs">
                                {ledgerDetails.ledgerAccount.ledgerCode}
                              </Badge>
                              <span className="text-white/50 text-sm font-medium">{ledgerDetails.ledgerAccount.accountType}</span>
                            </div>
                            <h2 className="text-3xl font-black tracking-tight">{ledgerDetails.ledgerAccount.name}</h2>
                            <div className="flex items-center gap-2 text-white/60 text-sm">
                              <CalendarIcon className="h-4 w-4" />
                              <span>{new Date(ledgerDetails.period.startDate).toLocaleDateString()} - {new Date(ledgerDetails.period.endDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Current Closing Balance</p>
                            <p className="text-3xl font-black text-blue-400">
                              {formatCurrency(ledgerDetails.balances.closingBalance)}
                            </p>
                            <Badge className={cn(
                              "text-[10px] font-bold uppercase",
                              ledgerDetails.balances.closingBalanceType === 'DR' ? "bg-indigo-500/20 text-indigo-300" : "bg-emerald-500/20 text-emerald-300"
                            )}>
                              {ledgerDetails.balances.closingBalanceType === 'DR' ? 'Debit' : 'Credit'} Balance
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Opening Balance</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-xl font-bold">{formatCurrency(ledgerDetails.balances.openingBalance)}</p>
                            <span className="text-[10px] font-medium text-slate-400 uppercase">{ledgerDetails.balances.openingBalanceType}</span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
                        <CardContent className="pt-6">
                          <p className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">Total Debits (+)</p>
                          <p className="text-xl font-bold mt-1 text-slate-900">{formatCurrency(ledgerDetails.periodTotals.totalDebit)}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all border-l-4 border-l-rose-500">
                        <CardContent className="pt-6">
                          <p className="text-rose-600 text-[10px] font-bold uppercase tracking-wider">Total Credits (-)</p>
                          <p className="text-xl font-bold mt-1 text-slate-900">{formatCurrency(ledgerDetails.periodTotals.totalCredit)}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all bg-slate-50 border-dashed">
                        <CardContent className="pt-6">
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Net Movement</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className={cn(
                              "text-xl font-bold",
                              parseFloat(ledgerDetails.periodTotals.netMovement) >= 0 ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {formatCurrency(ledgerDetails.periodTotals.netMovement)}
                            </p>
                            {parseFloat(ledgerDetails.periodTotals.netMovement) >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-rose-500" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Transactions Table */}
                    <Card className="border-slate-200 shadow-lg overflow-hidden">
                      <CardHeader className="bg-slate-900 py-3 border-b border-white/10 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Transaction History
                        </CardTitle>
                        <Badge variant="outline" className="text-white/60 border-white/20">
                          {ledgerDetails.summary.totalTransactions} Records
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-0">
                        {ledgerDetails.transactions.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                            <div className="bg-slate-100 p-4 rounded-full">
                              <AlertCircle className="h-10 w-10 text-slate-300" />
                            </div>
                            <p className="font-medium italic">No journal entries found in this period</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-slate-50">
                                <TableRow>
                                  <TableHead className="font-bold text-slate-700 text-xs">Date</TableHead>
                                  <TableHead className="font-bold text-slate-700 text-xs">Reference</TableHead>
                                  <TableHead className="font-bold text-slate-700 text-xs">Description</TableHead>
                                  <TableHead className="text-right font-bold text-indigo-700 text-xs">Debit</TableHead>
                                  <TableHead className="text-right font-bold text-emerald-700 text-xs">Credit</TableHead>
                                  <TableHead className="text-right font-bold text-slate-950 text-xs">Running Balance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {ledgerDetails.transactions.map((tx: any, idx: number) => (
                                  <TableRow
                                    key={idx}
                                    className="group hover:bg-blue-50/30 transition-colors border-slate-100 h-10 cursor-pointer"
                                    onClick={() => handleRowClick(tx)}
                                  >
                                    <TableCell className="text-[11px] font-medium py-2">
                                      {new Date(tx.transactionDate).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="py-2">
                                      <div className="flex flex-col">
                                        <span
                                          className="font-mono text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const url = getTransactionUrl(tx);
                                            if (url) window.open(url, "_blank");
                                          }}
                                        >
                                          {tx.transactionNumber}
                                        </span>
                                        <span className="text-[9px] text-slate-400 uppercase tracking-tighter">{tx.module}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-2">
                                      <p className="text-[11px] text-slate-600 max-w-[250px] truncate" title={tx.description}>
                                        {tx.description}
                                      </p>
                                    </TableCell>
                                    <TableCell className="text-right py-2 font-mono text-[11px] text-indigo-600 font-medium">
                                      {parseFloat(tx.debit) > 0 ? formatCurrency(tx.debit) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right py-2 font-mono text-[11px] text-emerald-600 font-medium">
                                      {parseFloat(tx.credit) > 0 ? formatCurrency(tx.credit) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right py-2 font-mono text-[11px] font-bold text-slate-950 bg-slate-50/50 group-hover:bg-blue-50/50 transition-colors">
                                      <div className="flex items-center justify-end gap-1">
                                        {formatCurrency(tx.balance)}
                                        <span className="text-[9px] text-slate-400 font-normal">{tx.balanceType}</span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── General Ledger Report ── */}
          <TabsContent value="general-ledger" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Ledger Report</CardTitle>
                <CardDescription>Full transaction history across all ledger accounts for the selected period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-500">Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9 w-40 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-500">End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9 w-40 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-500">Account Category</Label>
                      <Select value={glCategoryFilter} onValueChange={setGlCategoryFilter}>
                        <SelectTrigger className="h-9 w-44 bg-white">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {Array.from(new Set(ledgerAccounts.map(a => a.AccountCategory?.name).filter(Boolean))).map(cat => (
                            <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => loadReport("general-ledger")}
                      size="sm"
                      className="gap-2"
                    >
                      <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                      Generate
                    </Button>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search accounts..."
                        value={glSearch}
                        onChange={(e) => setGlSearch(e.target.value)}
                        className="pl-9 h-9 bg-white"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportGeneralLedgerExcel}
                      disabled={!generalLedger || loading}
                      className="gap-2 border-slate-200"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>

                {/* Loading */}
                {loading && (
                  <div className="flex items-center justify-center p-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Empty state */}
                {!loading && !generalLedger && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <FileText className="h-14 w-14 mb-4 opacity-30" />
                    <p className="font-semibold text-lg">No Data Yet</p>
                    <p className="text-sm mt-1">Select a date range and click Generate to view the General Ledger.</p>
                  </div>
                )}

                {/* Report Content */}
                {!loading && generalLedger && (() => {
                  const accounts: any[] = (generalLedger.generalLedger || []).filter((acct: any) =>
                    !glSearch ||
                    acct.ledgerAccount.name.toLowerCase().includes(glSearch.toLowerCase()) ||
                    acct.ledgerAccount.ledgerCode.toLowerCase().includes(glSearch.toLowerCase())
                  )

                  return (
                    <div className="space-y-4">
                      {/* Summary banner */}
                      <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                          <FileText className="h-36 w-36" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
                          <div>
                            <p className="text-white/50 text-xs font-bold uppercase tracking-wider">General Ledger</p>
                            <p className="text-2xl font-black mt-1">All Accounts</p>
                            <p className="text-white/40 text-sm mt-1">{startDate} → {endDate}</p>
                          </div>
                          <div className="flex gap-6">
                            <div className="text-center">
                              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Total Accounts</p>
                              <p className="text-2xl font-black text-blue-400 mt-1">{accounts.length}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Total Debit</p>
                              <p className="text-2xl font-black text-indigo-300 mt-1">
                                {formatCurrency(accounts.reduce((s: number, a: any) => s + parseFloat(a.periodTotals?.totalDebit || 0), 0))}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Total Credit</p>
                              <p className="text-2xl font-black text-emerald-300 mt-1">
                                {formatCurrency(accounts.reduce((s: number, a: any) => s + parseFloat(a.periodTotals?.totalCredit || 0), 0))}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Per-account cards */}
                      {accounts.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-sm">No accounts match your search.</div>
                      )}
                      {accounts.map((acct: any) => {
                        const la = acct.ledgerAccount
                        const isOpen = !!glExpandedAccounts[la.id]
                        return (
                          <div key={la.id} className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            {/* Account header row */}
                            <button
                              className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                              onClick={() => setGlExpandedAccounts(prev => ({ ...prev, [la.id]: !prev[la.id] }))}
                            >
                              <div className="flex items-center gap-3">
                                {isOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                                <span className="font-mono text-xs text-slate-500 bg-white px-2 py-0.5 rounded border">{la.ledgerCode}</span>
                                <span className="font-semibold text-slate-900">{la.name}</span>
                                <Badge variant="outline" className="text-[9px] font-bold uppercase opacity-70">{la.accountType}</Badge>
                              </div>
                              <div className="flex items-center gap-6 text-right">
                                <div className="hidden md:block">
                                  <p className="text-[10px] text-slate-400 uppercase font-bold">Opening</p>
                                  <p className="text-sm font-mono font-semibold text-slate-600">{formatCurrency(acct.balances.openingBalance)}</p>
                                </div>
                                <div className="hidden md:block">
                                  <p className="text-[10px] text-indigo-500 uppercase font-bold">Debit</p>
                                  <p className="text-sm font-mono font-semibold text-indigo-600">{formatCurrency(acct.periodTotals.totalDebit)}</p>
                                </div>
                                <div className="hidden md:block">
                                  <p className="text-[10px] text-emerald-500 uppercase font-bold">Credit</p>
                                  <p className="text-sm font-mono font-semibold text-emerald-600">{formatCurrency(acct.periodTotals.totalCredit)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase font-bold">Closing</p>
                                  <p className="text-sm font-mono font-bold text-slate-900">{formatCurrency(acct.balances.closingBalance)}</p>
                                </div>
                                <Badge className={cn(
                                  "text-[9px] font-bold uppercase",
                                  acct.balances.closingBalanceType === 'DR'
                                    ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                    : "bg-emerald-100 text-emerald-700 border-emerald-200"
                                )}>
                                  {acct.balances.closingBalanceType}
                                </Badge>
                              </div>
                            </button>

                            {/* Transaction rows (expanded) */}
                            {isOpen && (
                              <div className="overflow-x-auto">
                                {(!acct.transactions || acct.transactions.length === 0) ? (
                                  <div className="py-6 text-center text-slate-400 text-sm">No transactions in this period.</div>
                                ) : (
                                  <Table>
                                    <TableHeader className="bg-slate-50/80">
                                      <TableRow>
                                        <TableHead className="text-xs font-bold text-slate-500 w-28">Date</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-500">Txn #</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-500">Module</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-500">Reference</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-500">Description</TableHead>
                                        <TableHead className="text-right text-xs font-bold text-indigo-600">Debit</TableHead>
                                        <TableHead className="text-right text-xs font-bold text-emerald-600">Credit</TableHead>
                                        <TableHead className="text-right text-xs font-bold text-slate-700">Balance</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {/* Opening balance row */}
                                      <TableRow className="bg-slate-50 font-semibold">
                                        <TableCell colSpan={5} className="text-xs text-slate-500 italic py-1.5 pl-4">Opening Balance</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-slate-400 py-1.5">—</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-slate-400 py-1.5">—</TableCell>
                                        <TableCell className="text-right font-mono text-xs font-bold text-slate-700 py-1.5">
                                          {formatCurrency(acct.balances.openingBalance)}
                                          <span className="ml-1 text-[9px] text-slate-400">{acct.balances.openingBalanceType}</span>
                                        </TableCell>
                                      </TableRow>
                                      {acct.transactions.map((tx: any, tIdx: number) => (
                                        <TableRow
                                          key={tIdx}
                                          className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                                          onClick={() => handleRowClick(tx)}
                                        >
                                          <TableCell className="text-xs text-slate-500 py-2 whitespace-nowrap">
                                            {new Date(tx.transactionDate).toLocaleDateString()}
                                          </TableCell>
                                          <TableCell className="font-mono text-xs font-medium text-slate-700 py-2">{tx.transactionNumber}</TableCell>
                                          <TableCell className="py-2">
                                            <Badge variant="secondary" className="text-[9px] font-bold uppercase">{tx.module}</Badge>
                                          </TableCell>
                                          <TableCell className="font-mono text-xs text-slate-500 py-2">{tx.referenceNumber || "—"}</TableCell>
                                          <TableCell className="text-xs text-slate-600 py-2 max-w-xs truncate">{tx.description}</TableCell>
                                          <TableCell className="text-right font-mono text-xs text-indigo-600 py-2 bg-indigo-50/20">
                                            {parseFloat(tx.debit) > 0 ? formatCurrency(tx.debit) : "—"}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs text-emerald-600 py-2 bg-emerald-50/20">
                                            {parseFloat(tx.credit) > 0 ? formatCurrency(tx.credit) : "—"}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs font-bold text-slate-900 py-2">
                                            {formatCurrency(tx.balance)}
                                            <span className="ml-1 text-[9px] text-slate-400">{tx.balanceType}</span>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      {/* Closing balance row */}
                                      <TableRow className="bg-slate-100/80 font-semibold border-t-2 border-slate-200">
                                        <TableCell colSpan={5} className="text-xs text-slate-600 font-bold py-2 pl-4">Closing Balance</TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold text-indigo-600 py-2">
                                          {formatCurrency(acct.periodTotals.totalDebit)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold text-emerald-600 py-2">
                                          {formatCurrency(acct.periodTotals.totalCredit)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold text-slate-900 py-2">
                                          {formatCurrency(acct.balances.closingBalance)}
                                          <span className="ml-1 text-[9px] text-slate-400">{acct.balances.closingBalanceType}</span>
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Ledger Entry Detail Dialog */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-xl p-6 border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              Ledger Entry Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Transaction details posted to this ledger account
            </DialogDescription>
          </DialogHeader>

          {selectedTx && (
            <div className="space-y-6 pt-4">
              {/* Header metrics card */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Transaction Number</p>
                  <p className="font-mono font-bold text-sm text-slate-900 mt-0.5">{selectedTx.transactionNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                    {new Date(selectedTx.transactionDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Source Module</p>
                  <Badge variant="secondary" className="mt-1 font-mono text-[9px] font-bold uppercase tracking-tight">
                    {selectedTx.module}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reference Doc</p>
                  <p className="text-sm font-mono font-semibold text-slate-800 mt-0.5">
                    {selectedTx.referenceNumber || "-"}
                  </p>
                </div>
              </div>

              {/* Amount details */}
              <div className="grid grid-cols-3 gap-3 border-y border-slate-100 py-4">
                <div className="text-center border-r border-slate-100">
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Debit</p>
                  <p className="text-lg font-black text-indigo-600 mt-1">
                    {parseFloat(selectedTx.debit) > 0 ? formatCurrency(selectedTx.debit) : "-"}
                  </p>
                </div>
                <div className="text-center border-r border-slate-100">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Credit</p>
                  <p className="text-lg font-black text-emerald-600 mt-1">
                    {parseFloat(selectedTx.credit) > 0 ? formatCurrency(selectedTx.credit) : "-"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-900 font-bold uppercase tracking-wider">Running Balance</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <p className="text-lg font-black text-slate-900">
                      {formatCurrency(selectedTx.balance)}
                    </p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{selectedTx.balanceType}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Description / Memo</p>
                <p className="text-sm text-slate-700 bg-slate-50/50 p-3 rounded-lg border border-slate-100/50 italic leading-relaxed">
                  {selectedTx.description || "No description provided"}
                </p>
              </div>

              {/* Prepared by */}
              <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 p-2 rounded-lg">
                    <User className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[9px] text-white/50 font-bold uppercase tracking-wider">User Responsible</p>
                    <p className="text-sm font-bold mt-0.5">
                      {selectedTx.createdBy ? (selectedTx.createdBy.fullName || selectedTx.createdBy.username) : "System Account"}
                    </p>
                  </div>
                </div>
                {selectedTx.createdBy && (
                  <Badge className="bg-blue-500/20 text-blue-300 border-none">
                    @{selectedTx.createdBy.username}
                  </Badge>
                )}
              </div>

              {/* Open document button */}
              {getTransactionUrl(selectedTx) && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => {
                      const url = getTransactionUrl(selectedTx);
                      if (url) window.open(url, "_blank");
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl py-2 shadow-sm transition-all"
                  >
                    Open Source Document
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ERPLayout>
  )
}
