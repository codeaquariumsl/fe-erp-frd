"use client"

import { useState, useEffect } from "react"
import { Plus, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ledgerAccountsApi, accountCategoriesApi, LedgerAccount, AccountCategory, accountTypesApi, AccountType, controlAccountsApi, ControlAccount, banksApi, bankBranchesApi, Bank, BankBranch, PaginatedResponse } from "@/lib/api"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import * as XLSX from "xlsx"

export default function LedgerAccountsPage() {
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([])
  const [categories, setCategories] = useState<AccountCategory[]>([])
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([])
  const [controlAccounts, setControlAccounts] = useState<ControlAccount[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [branches, setBranches] = useState<BankBranch[]>([])
  const [cashBookLedgers, setCashBookLedgers] = useState<LedgerAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [activeTab, setActiveTab] = useState("list")
  const [chartOfAccounts, setChartOfAccounts] = useState<LedgerAccount[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedLedger, setSelectedLedger] = useState<LedgerAccount | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const initialFormState = {
    ledgerCode: "",
    name: "",
    accountTypeId: "",
    accountCategoryId: "",
    ledgerType: "GENERAL",
    openingBalance: "0",
    openingBalanceType: "DR",
    status: "Active",
    isUseControlAccount: false,
    controlAccountId: "",
    bankId: "",
    branchId: "",
    accountNumber: "",
    accountHolderName: "",
    cashBookLedgerId: "",
    pettyCashAmount: "0",
    bufferLevel: "0",
  }

  const [formData, setFormData] = useState(initialFormState)
  const { toast } = useToast()

  // Logic to fetch next ledger code based on selection
  useEffect(() => {
    if (!isCreateDialogOpen) return

    const fetchNextCode = async () => {
      try {
        let code = ""
        // Case 1: Control Account Selected
        if (formData.isUseControlAccount && formData.controlAccountId) {
          const res = await ledgerAccountsApi.getNextCode({
            controlAccountId: parseInt(formData.controlAccountId)
          })
          code = res.nextCode
        }
        // Case 2: Account Category Selected (and not using control account)
        else if (!formData.isUseControlAccount && formData.accountCategoryId) {
          const res = await ledgerAccountsApi.getNextCode({
            accountCategoryId: parseInt(formData.accountCategoryId)
          })
          code = res.nextCode
        }

        if (code) {
          setFormData(prev => ({ ...prev, ledgerCode: code }))
        }
      } catch (error) {
        console.error("Failed to fetch next ledger code", error)
      }
    }

    fetchNextCode()
  }, [formData.accountCategoryId, formData.isUseControlAccount, formData.controlAccountId, isCreateDialogOpen])

  useEffect(() => {
    loadData()
  }, [currentPage, searchTerm])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
      setCurrentPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch branches when selected bank changes
  useEffect(() => {
    if (formData.bankId) {
      const fetchBranches = async () => {
        try {
          const data = await bankBranchesApi.getByBankId(parseInt(formData.bankId))
          setBranches(Array.isArray(data) ? data : [])
        } catch (error) {
          console.error("Failed to fetch branches", error)
          setBranches([])
        }
      }
      fetchBranches()
    } else {
      setBranches([])
    }
  }, [formData.bankId])


  const loadData = async () => {
    try {
      setLoading(true)
      const [ledgersResponse, categoriesData, accountTypesData, controlAccountsData, banksData, allLedgersData] = await Promise.all([
        ledgerAccountsApi.getAll({ page: currentPage, limit: pageSize, search: searchTerm }),
        accountCategoriesApi.getAll<AccountCategory>(),
        accountTypesApi.getAll<AccountType>(),
        controlAccountsApi.getAll<ControlAccount>(),
        banksApi.getAll<Bank>(),
        ledgerAccountsApi.getAllAccounts<LedgerAccount>(),
      ])

      if (ledgersResponse && ledgersResponse.data) {
        setLedgers(ledgersResponse.data)
        setTotalItems(ledgersResponse.pagination.total || 0)
        setTotalPages(ledgersResponse.pagination.pages || ledgersResponse.pagination.totalPages || 0)
      } else {
        setLedgers([])
        setTotalItems(0)
        setTotalPages(0)
      }

      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      setAccountTypes(Array.isArray(accountTypesData) ? accountTypesData : [])
      setControlAccounts(Array.isArray(controlAccountsData) ? controlAccountsData : [])
      setBanks(Array.isArray(banksData) ? banksData : [])

      // Filter cash book ledgers
      const allLedgers = Array.isArray(allLedgersData) ? allLedgersData : (allLedgersData as any)?.data || []
      const cashBooks = allLedgers.filter((ledger: LedgerAccount) => ledger.ledgerType === 'CASH_BOOK' && ledger.status === 'Active')
      setCashBookLedgers(cashBooks)
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

  useEffect(() => {
    if (activeTab === "chart") {
      fetchChartOfAccounts()
    }
  }, [activeTab])

  const fetchChartOfAccounts = async () => {
    try {
      const res = await ledgerAccountsApi.getChartOfAccounts() as any
      // Handle wrapped response if necessary
      const array = res.data || res
      setChartOfAccounts(Array.isArray(array) ? array : [])
    } catch (error) {
      console.error("Failed to fetch chart of accounts", error)
    }
  }

  const handleDownloadExcel = async () => {
    try {
      setLoading(true)
      // Fetch all accounts for export
      const allAccountsData = await ledgerAccountsApi.getAllAccounts<LedgerAccount>()
      const allAccounts = Array.isArray(allAccountsData) ? allAccountsData : (allAccountsData as any)?.data || []

      if (allAccounts.length === 0) {
        toast({
          title: "No data",
          description: "There are no ledger accounts to export",
          variant: "destructive",
        })
        return
      }

      // Format data for Excel
      const exportData = allAccounts.map((ledger: any) => ({
        "Ledger Code": ledger.ledgerCode,
        "Name": ledger.name,
        "Type": ledger.ledgerType,
        "Account Category": ledger.AccountCategory?.name || "-",
        "Account Type": ledger.AccountType?.name || "-",
        "Status": ledger.status,
        "Opening Balance": ledger.openingBalance || 0,
        "Opening Balance Type": ledger.openingBalanceType || "-",
        "Control Account": ledger.ControlAccount?.name || "-",
        "Bank": ledger.Bank?.name || "-",
        "Account Number": ledger.accountNumber || "-",
      }))

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger Accounts")

      // Generate filename with date
      const date = new Date().toISOString().split('T')[0]
      const fileName = `Ledger_Accounts_${date}.xlsx`

      // Save file
      XLSX.writeFile(workbook, fileName)

      toast({
        title: "Success",
        description: "Excel file downloaded successfully",
      })
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download excel file",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData(initialFormState)
    setSelectedLedger(null)
  }

  const handleCreateLedger = async () => {
    if (!formData.name.trim() || !formData.ledgerCode.trim()) {
      toast({
        title: "Validation Error",
        description: "Ledger name and code are required",
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

    // Bank Validations
    if (formData.ledgerType === 'BANK') {
      if (!formData.bankId) {
        toast({ title: "Validation Error", description: "Bank is required for Bank ledger type", variant: "destructive" })
        return
      }
      if (!formData.branchId) {
        toast({ title: "Validation Error", description: "Branch is required for Bank ledger type", variant: "destructive" })
        return
      }
      if (!formData.accountNumber) {
        toast({ title: "Validation Error", description: "Account Number is required", variant: "destructive" })
        return
      }
      if (!formData.accountHolderName) {
        toast({ title: "Validation Error", description: "Account Holder Name is required", variant: "destructive" })
        return
      }
    }

    try {
      const selectedCategory = categories.find(c => c.id.toString() === formData.accountCategoryId)
      const accountTypeId = selectedCategory?.accountTypeId

      if (!accountTypeId) {
        toast({
          title: "Validation Error",
          description: "Account type not found for selected category",
          variant: "destructive",
        })
        return
      }

      const payload: any = {
        ...formData,
        accountTypeId: accountTypeId,
        accountCategoryId: parseInt(formData.accountCategoryId)
      }

      if (formData.isUseControlAccount && formData.controlAccountId) {
        payload.controlAccountId = parseInt(formData.controlAccountId)
      }

      if (formData.ledgerType === 'BANK') {
        payload.isBankLedger = true
        payload.accountNumber = formData.accountNumber
        payload.accountHolderName = formData.accountHolderName
        payload.bankId = parseInt(formData.bankId)
        payload.branchId = parseInt(formData.branchId)
      } else {
        // Clear bank details if type changed
        payload.bankId = null
        payload.branchId = null
        payload.accountNumber = null
        payload.accountHolderName = null
      }

      await ledgerAccountsApi.create(payload)
      toast({
        title: "Success",
        description: "Ledger account created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create ledger account",
        variant: "destructive",
      })
    }
  }

  const handleUpdateLedger = async () => {
    if (!selectedLedger) return

    if (!formData.accountCategoryId) {
      toast({
        title: "Validation Error",
        description: "Account category is required",
        variant: "destructive",
      })
      return
    }

    // Bank Validations
    if (formData.ledgerType === 'BANK') {
      if (!formData.bankId) {
        toast({ title: "Validation Error", description: "Bank is required for Bank ledger type", variant: "destructive" })
        return
      }
      if (!formData.branchId) {
        toast({ title: "Validation Error", description: "Branch is required for Bank ledger type", variant: "destructive" })
        return
      }
      if (!formData.accountNumber) {
        toast({ title: "Validation Error", description: "Account Number is required", variant: "destructive" })
        return
      }
      if (!formData.accountHolderName) {
        toast({ title: "Validation Error", description: "Account Holder Name is required", variant: "destructive" })
        return
      }
    }

    try {
      const payload: any = {
        ...formData,
        accountCategoryId: parseInt(formData.accountCategoryId)
      }

      if (formData.isUseControlAccount && formData.controlAccountId) {
        payload.controlAccountId = parseInt(formData.controlAccountId)
      } else {
        payload.controlAccountId = null
      }

      if (formData.ledgerType === 'BANK') {
        payload.isBankLedger = true
        payload.accountNumber = formData.accountNumber
        payload.accountHolderName = formData.accountHolderName
        payload.bankId = parseInt(formData.bankId)
        payload.branchId = parseInt(formData.branchId)
      } else {
        // Clear bank details if type changed
        payload.bankId = null
        payload.branchId = null
        payload.accountNumber = null
        payload.accountHolderName = null
      }

      await ledgerAccountsApi.update(selectedLedger.id, payload)
      toast({
        title: "Success",
        description: "Ledger account updated successfully",
      })
      setIsEditDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update ledger account",
        variant: "destructive",
      })
    }
  }

  const handleDeleteLedger = async (id: number) => {
    try {
      await ledgerAccountsApi.remove(id)
      toast({
        title: "Success",
        description: "Ledger account deleted successfully",
      })
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete ledger account",
        variant: "destructive",
      })
    }
  }

  const handleEditLedger = (ledger: LedgerAccount) => {
    setSelectedLedger(ledger)
    setFormData({
      ledgerCode: ledger.ledgerCode,
      name: ledger.name,
      accountTypeId: ledger.accountTypeId?.toString() || "",
      accountCategoryId: ledger.accountCategoryId?.toString() || "",
      ledgerType: ledger.ledgerType,
      openingBalance: ledger.openingBalance?.toString() || "0",
      openingBalanceType: ledger.openingBalanceType,
      status: ledger.status,
      isUseControlAccount: ledger.isUseControlAccount || false,
      controlAccountId: ledger.controlAccountId?.toString() || "",
      bankId: ledger.bankId?.toString() || "",
      branchId: ledger.branchId?.toString() || "",
      accountNumber: ledger.accountNumber || "",
      accountHolderName: ledger.accountHolderName || "",
      cashBookLedgerId: ledger.cashBookLedgerId?.toString() || "",
      pettyCashAmount: ledger.pettyCashAmount?.toString() || "0",
      bufferLevel: ledger.bufferLevel?.toString() || "0",
    })
    setIsEditDialogOpen(true)
  }

  const handleViewLedger = (ledger: LedgerAccount) => {
    setSelectedLedger(ledger)
    setIsViewDialogOpen(true)
  }

  const BankFields = () => (
    <>
      <div className="col-span-2 border-t mt-2 pt-4">
        <h4 className="font-semibold mb-3">Bank Details</h4>
      </div>
      <div>
        <Label htmlFor="bankId">Bank *</Label>
        <Select
          value={formData.bankId}
          onValueChange={(value) => setFormData({ ...formData, bankId: value, branchId: "" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Bank" />
          </SelectTrigger>
          <SelectContent>
            {banks.map((bank) => (
              <SelectItem key={bank.id} value={bank.id.toString()}>{bank.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="branchId">Branch *</Label>
        <Select
          value={formData.branchId}
          onValueChange={(value) => setFormData({ ...formData, branchId: value })}
          disabled={!formData.bankId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id.toString()}>{branch.branchName} ({branch.branchCode})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="accountNumber">Account Number *</Label>
        <Input
          id="accountNumber"
          value={formData.accountNumber}
          onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
          placeholder="e.g. 10002345678"
        />
      </div>
      <div>
        <Label htmlFor="accountHolderName">Account Holder Name *</Label>
        <Input
          id="accountHolderName"
          value={formData.accountHolderName}
          onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
          placeholder="e.g. Code Aqua ERP Pvt Ltd"
        />
      </div>
    </>
  )

  const PettyCashFields = () => (
    <>
      <div className="col-span-2 border-t mt-2 pt-4">
        <h4 className="font-semibold mb-3">Petty Cash Details</h4>
      </div>
      <div>
        <Label htmlFor="cashBookLedgerId">Cash Book Ledger *</Label>
        <Select
          value={formData.cashBookLedgerId}
          onValueChange={(value) => setFormData({ ...formData, cashBookLedgerId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Cash Book" />
          </SelectTrigger>
          <SelectContent>
            {cashBookLedgers.map((ledger) => (
              <SelectItem key={ledger.id} value={ledger.id.toString()}>
                {ledger.ledgerCode} - {ledger.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="pettyCashAmount">Petty Cash Amount *</Label>
        <Input
          id="pettyCashAmount"
          type="number"
          step="0.01"
          value={formData.pettyCashAmount}
          onChange={(e) => setFormData({ ...formData, pettyCashAmount: e.target.value })}
          placeholder="e.g. 10000.00"
        />
      </div>
      <div>
        <Label htmlFor="openingBalance">Opening Balance *</Label>
        <Input
          id="openingBalance"
          type="number"
          step="0.01"
          value={formData.openingBalance}
          onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
          placeholder="e.g. 5000.00"
        />
      </div>
      <div>
        <Label htmlFor="bufferLevel">Buffer Level *</Label>
        <Input
          id="bufferLevel"
          type="number"
          step="0.01"
          value={formData.bufferLevel}
          onChange={(e) => setFormData({ ...formData, bufferLevel: e.target.value })}
          placeholder="e.g. 1000.00"
        />
      </div>
    </>
  )

  const EditBankFields = () => (
    <>
      <div className="col-span-2 border-t mt-2 pt-4">
        <h4 className="font-semibold mb-3">Bank Details</h4>
      </div>
      <div>
        <Label htmlFor="edit-bankId">Bank *</Label>
        <Select
          value={formData.bankId}
          onValueChange={(value) => setFormData({ ...formData, bankId: value, branchId: "" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Bank" />
          </SelectTrigger>
          <SelectContent>
            {banks.map((bank) => (
              <SelectItem key={bank.id} value={bank.id.toString()}>{bank.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="edit-branchId">Branch *</Label>
        <Select
          value={formData.branchId}
          onValueChange={(value) => setFormData({ ...formData, branchId: value })}
          disabled={!formData.bankId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id.toString()}>{branch.branchName} ({branch.branchCode})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="edit-accountNumber">Account Number *</Label>
        <Input
          id="edit-accountNumber"
          value={formData.accountNumber}
          onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
          placeholder="e.g. 10002345678"
        />
      </div>
      <div>
        <Label htmlFor="edit-accountHolderName">Account Holder Name *</Label>
        <Input
          id="edit-accountHolderName"
          value={formData.accountHolderName}
          onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
          placeholder="e.g. Code Aqua ERP Pvt Ltd"
        />
      </div>
    </>
  )

  const EditPettyCashFields = () => (
    <>
      <div className="col-span-2 border-t mt-2 pt-4">
        <h4 className="font-semibold mb-3">Petty Cash Details</h4>
      </div>
      <div>
        <Label htmlFor="edit-cashBookLedgerId">Cash Book Ledger *</Label>
        <Select
          value={formData.cashBookLedgerId}
          onValueChange={(value) => setFormData({ ...formData, cashBookLedgerId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Cash Book" />
          </SelectTrigger>
          <SelectContent>
            {cashBookLedgers.map((ledger) => (
              <SelectItem key={ledger.id} value={ledger.id.toString()}>
                {ledger.ledgerCode} - {ledger.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="edit-pettyCashAmount">Petty Cash Amount *</Label>
        <Input
          id="edit-pettyCashAmount"
          type="number"
          step="0.01"
          value={formData.pettyCashAmount}
          onChange={(e) => setFormData({ ...formData, pettyCashAmount: e.target.value })}
          placeholder="e.g. 10000.00"
        />
      </div>
      <div>
        <Label htmlFor="edit-openingBalance">Opening Balance *</Label>
        <Input
          id="edit-openingBalance"
          type="number"
          step="0.01"
          value={formData.openingBalance}
          onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
          placeholder="e.g. 5000.00"
        />
      </div>
      <div>
        <Label htmlFor="edit-bufferLevel">Buffer Level *</Label>
        <Input
          id="edit-bufferLevel"
          type="number"
          step="0.01"
          value={formData.bufferLevel}
          onChange={(e) => setFormData({ ...formData, bufferLevel: e.target.value })}
          placeholder="e.g. 1000.00"
        />
      </div>
    </>
  )

  return (
    <ERPLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ledger Accounts</h1>
            <p className="text-muted-foreground mt-1">Manage your chart of accounts and ledger entries</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Ledger
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Ledger Account</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <Label htmlFor="accountTypeId">Account Type</Label>
                  <Select
                    value={formData.accountTypeId}
                    onValueChange={(value) => setFormData({
                      ...formData, accountTypeId: value,
                      accountCategoryId: "",
                      isUseControlAccount: false,
                      controlAccountId: ""
                    })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.code} | {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="accountCategoryId">Account Category</Label>
                  <Select
                    value={formData.accountCategoryId}
                    onValueChange={(value) => setFormData({ ...formData, accountCategoryId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(category => !formData.accountTypeId || category.accountTypeId.toString() === formData.accountTypeId)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.code} | {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-4">
                  <Checkbox
                    id="isUseControlAccount"
                    checked={formData.isUseControlAccount}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isUseControlAccount: checked as boolean })
                    }
                  />
                  <Label htmlFor="isUseControlAccount">Use Control Account</Label>
                </div>
                {formData.isUseControlAccount ? (
                  <div>
                    <Label htmlFor="controlAccountId">Control Account *</Label>
                    <Select value={formData.controlAccountId} onValueChange={(value) => setFormData({ ...formData, controlAccountId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select control account" />
                      </SelectTrigger>
                      <SelectContent>
                        {controlAccounts
                          .filter(account => !formData.accountCategoryId || account.accountCategoryId.toString() === formData.accountCategoryId)
                          .map((account) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.code} | {account.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div></div>
                )}
                <div>
                  <Label htmlFor="name">Ledger Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Cash in Hand"
                  />
                </div>
                <div>
                  <Label htmlFor="ledgerCode">Ledger Code</Label>
                  <Input
                    id="ledgerCode"
                    value={formData.ledgerCode}
                    placeholder="Auto generated"
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Ledger Type</Label>
                  <RadioGroup
                    value={formData.ledgerType}
                    onValueChange={(value) => setFormData({ ...formData, ledgerType: value })}
                    className="grid grid-cols-2 gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="GENERAL" id="type-general" />
                      <Label htmlFor="type-general" className="font-normal">General</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CASH_BOOK" id="type-cash-book" />
                      <Label htmlFor="type-cash-book" className="font-normal">Cash Book</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="BANK" id="type-bank" />
                      <Label htmlFor="type-bank" className="font-normal">Bank</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PETTY_CASH" id="type-petty-cash" />
                      <Label htmlFor="type-petty-cash" className="font-normal">Petty Cash</Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.ledgerType === 'BANK' && <BankFields />}
                {formData.ledgerType === 'PETTY_CASH' && <PettyCashFields />}

              </div>
              <DialogFooter>
                <Button onClick={handleCreateLedger} >Create Ledger</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">All Ledgers</TabsTrigger>
            <TabsTrigger value="chart">Chart of Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardHeader>
                {/* <CardTitle>Ledger Accounts List</CardTitle> */}
                {/* <CardDescription>All active and inactive ledger accounts</CardDescription> */}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      placeholder="Search ledgers..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="max-w-sm"
                    />
                    <Button variant="outline" onClick={handleDownloadExcel}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>

                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading...
                    </div>
                  ) : ledgers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No ledger accounts found
                    </div>
                  ) : (
                    <>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Account Category</TableHead>
                              <TableHead>Account Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ledgers.map((ledger) => (
                              <TableRow key={ledger.id}>
                                <TableCell className="py-2 font-mono text-sm">{ledger.ledgerCode}</TableCell>
                                <TableCell className="py-2 font-medium">{ledger.name}</TableCell>
                                <TableCell className="py-2">
                                  <Badge variant="secondary">{ledger.ledgerType}</Badge>
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge variant="secondary">{ledger.AccountCategory?.name}</Badge>
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge variant="secondary">{ledger.AccountType?.name}</Badge>
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge variant={ledger.status === "Active" ? "default" : "secondary"}>
                                    {ledger.status}
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
                                      <DropdownMenuItem onClick={() => handleViewLedger(ledger)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleEditLedger(ledger)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
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
                                            <AlertDialogTitle>Delete Ledger Account</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to delete "{ledger.name}"? This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleDeleteLedger(ledger.id)}
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

                      {/* Pagination Controls */}
                      <div className="flex items-center justify-between px-2">
                        <div className="text-sm text-muted-foreground">
                          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} ledgers
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <div className="text-sm font-medium">
                            Page {currentPage} of {totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chart" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chart of Accounts</CardTitle>
                <CardDescription>Complete account hierarchy organized by type and category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chartOfAccounts.reduce((acc, ledger) => {
                    const typeName = ledger.accountType?.name || "Other"
                    const existing = acc.find(g => g.type === typeName)
                    if (existing) {
                      existing.ledgers.push(ledger)
                    } else {
                      acc.push({ type: typeName, ledgers: [ledger] })
                    }
                    return acc
                  }, [] as Array<{ type: string; ledgers: LedgerAccount[] }>).map((group) => (
                    <div key={group.type} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">{group.type}</h3>
                      <div className="space-y-2 ml-4">
                        {group.ledgers.map(ledger => (
                          <div key={ledger.id} className="text-sm flex justify-between items-start">
                            <div>
                              <div className="font-mono text-xs text-muted-foreground">{ledger.ledgerCode}</div>
                              <div>{ledger.name}</div>
                            </div>
                            <Badge variant="outline">{ledger.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ledger Account Details</DialogTitle>
            </DialogHeader>
            {selectedLedger && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Account Type and Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Account Type</Label>
                      <p className="font-medium mt-1">{selectedLedger.AccountType?.name || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Account Category</Label>
                      <p className="font-medium mt-1">{selectedLedger.AccountCategory?.name || "-"}</p>
                    </div>
                  </div>

                  {/* Control Account - Only show if active */}
                  {selectedLedger.isUseControlAccount && selectedLedger.ControlAccount && (
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Control Account</Label>
                        <p className="font-medium mt-1">{selectedLedger.ControlAccount.name} ({selectedLedger.ControlAccount.code})</p>
                      </div>
                    </div>
                  )}

                  {/* Name and Code */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Ledger Name</Label>
                      <p className="font-medium text-lg mt-1">{selectedLedger.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Ledger Code</Label>
                      <p className="font-mono font-medium text-lg mt-1">{selectedLedger.ledgerCode}</p>
                    </div>
                  </div>

                  {/* Type and Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Ledger Type</Label>
                      <Badge variant="secondary" className="mt-1">{selectedLedger.ledgerType}</Badge>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <Badge variant={selectedLedger.status === 'Active' ? 'default' : 'secondary'} className="mt-1">{selectedLedger.status}</Badge>
                    </div>
                  </div>

                  {/* Bank Details */}
                  {selectedLedger.ledgerType === 'BANK' && (
                    <div className="border-t pt-4 mt-2">
                      <h4 className="font-semibold mb-3">Bank Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Bank Name</Label>
                          <p className="font-medium mt-1">{selectedLedger.Bank?.name || "-"}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Branch</Label>
                          <p className="font-medium mt-1">{selectedLedger.Branch?.branchName || "-"} ({selectedLedger.Branch?.branchCode || "-"})</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Account Number</Label>
                          <p className="font-mono font-medium mt-1">{selectedLedger.accountNumber || "-"}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Account Holder</Label>
                          <p className="font-medium mt-1">{selectedLedger.accountHolderName || "-"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Petty Cash Details */}
                  {selectedLedger.ledgerType === 'PETTY_CASH' && (
                    <div className="border-t pt-4 mt-2">
                      <h4 className="font-semibold mb-3">Petty Cash Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Cash Book Ledger</Label>
                          <p className="font-medium mt-1">
                            {cashBookLedgers.find(l => l.id.toString() === selectedLedger.cashBookLedgerId)?.name || "-"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Petty Cash Amount</Label>
                          <p className="font-mono font-medium mt-1">
                            {selectedLedger.pettyCashAmount ? parseFloat(selectedLedger.pettyCashAmount).toFixed(2) : "0.00"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Opening Balance</Label>
                          <p className="font-mono font-medium mt-1">
                            {selectedLedger.openingBalance ? parseFloat(selectedLedger.openingBalance.toString()).toFixed(2) : "0.00"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Buffer Level</Label>
                          <p className="font-mono font-medium mt-1">
                            {selectedLedger.bufferLevel ? parseFloat(selectedLedger.bufferLevel).toFixed(2) : "0.00"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Ledger Account</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-accountTypeId">Account Type</Label>
                <Select
                  value={formData.accountTypeId}
                  onValueChange={(value) => setFormData({
                    ...formData, accountTypeId: value,
                    accountCategoryId: "",
                    isUseControlAccount: false,
                    controlAccountId: ""
                  })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.code} | {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-accountCategoryId">Account Category</Label>
                <Select
                  value={formData.accountCategoryId}
                  onValueChange={(value) => setFormData({ ...formData, accountCategoryId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(category => !formData.accountTypeId || category.accountTypeId.toString() === formData.accountTypeId)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.code} | {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="edit-isUseControlAccount"
                  checked={formData.isUseControlAccount}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isUseControlAccount: checked as boolean })
                  }
                />
                <Label htmlFor="edit-isUseControlAccount">Use Control Account</Label>
              </div>
              {formData.isUseControlAccount ? (
                <div>
                  <Label htmlFor="edit-controlAccountId">Control Account *</Label>
                  <Select value={formData.controlAccountId} onValueChange={(value) => setFormData({ ...formData, controlAccountId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select control account" />
                    </SelectTrigger>
                    <SelectContent>
                      {controlAccounts
                        .filter(account => !formData.accountCategoryId || account.accountCategoryId.toString() === formData.accountCategoryId)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.code} | {account.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div></div>
              )}

              <div>
                <Label htmlFor="edit-name">Ledger Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-ledgerCode">Ledger Code</Label>
                <Input
                  id="edit-ledgerCode"
                  value={formData.ledgerCode}
                  placeholder="Auto generated"
                  readOnly
                  disabled
                  className="bg-muted"
                />
              </div>

              <div>
                <Label className="mb-2 block">Ledger Type</Label>
                <RadioGroup
                  value={formData.ledgerType}
                  onValueChange={(value) => setFormData({ ...formData, ledgerType: value })}
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="GENERAL" id="edit-type-general" />
                    <Label htmlFor="edit-type-general" className="font-normal">General</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CASH_BOOK" id="edit-type-cash-book" />
                    <Label htmlFor="edit-type-cash-book" className="font-normal">Cash Book</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BANK" id="edit-type-bank" />
                    <Label htmlFor="edit-type-bank" className="font-normal">Bank</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PETTY_CASH" id="edit-type-petty-cash" />
                    <Label htmlFor="edit-type-petty-cash" className="font-normal">Petty Cash</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.ledgerType === 'BANK' && <EditBankFields />}
              {formData.ledgerType === 'PETTY_CASH' && <EditPettyCashFields />}

            </div>
            <DialogFooter>
              <Button onClick={handleUpdateLedger} >Update Ledger</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div >
    </ERPLayout>
  )
}
