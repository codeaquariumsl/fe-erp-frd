"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  accountTypesApi,
  accountCategoriesApi,
  ledgerAccountsApi,
  journalEntriesApi,
  autoPostingRulesApi,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import {
  Landmark,
  Book,
  FileText,
  Settings,
  ArrowRight,
  DollarSign,
} from "lucide-react"

interface StatsData {
  accountTypes: number
  categories: number
  ledgers: number
  journals: number
  rules: number
  pendingJournals: number
}

export default function AccountingDashboard() {
  const [stats, setStats] = useState<StatsData>({
    accountTypes: 0,
    categories: 0,
    ledgers: 0,
    journals: 0,
    rules: 0,
    pendingJournals: 0,
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const [types, categories, ledgers, journals, rules] = await Promise.all([
        accountTypesApi.getAll(),
        accountCategoriesApi.getAll(),
        ledgerAccountsApi.getAllAccounts(),
        journalEntriesApi.getAll({ limit: 1000 }),
        autoPostingRulesApi.getAll(),
      ])

      const journals_array = Array.isArray(journals) ? journals : []
      const pending = journals_array.filter(j => j.status === 'Submitted' || j.status === 'Draft').length

      setStats({
        accountTypes: Array.isArray(types) ? types.length : 0,
        categories: Array.isArray(categories) ? categories.length : 0,
        ledgers: Array.isArray(ledgers) ? ledgers.length : 0,
        journals: journals_array.length,
        rules: Array.isArray(rules) ? rules.length : 0,
        pendingJournals: pending,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load statistics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ icon: Icon, title, value, description, href }: any) => (
    <Link href={href}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )

  const ModuleCard = ({ icon: Icon, title, description, href }: any) => (
    <Link href={href}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">{title}</CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
      </Card>
    </Link>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Accounting Module</h1>
        <p className="text-muted-foreground mt-1">
          Manage your accounting system including charts of accounts, journal entries, and auto-posting rules
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Landmark}
          title="Account Types"
          value={stats.accountTypes}
          description="System account types configured"
          href="/accounting/account-types"
        />
        <StatCard
          icon={Book}
          title="Ledger Accounts"
          value={stats.ledgers}
          description="Total accounts in chart"
          href="/accounting/ledger-accounts"
        />
        <StatCard
          icon={DollarSign}
          title="Control Accounts"
          value={stats.categories}
          description="Aggregate accounts for automation"
          href="/accounting/control-accounts"
        />
        <StatCard
          icon={FileText}
          title="Total Journals"
          value={stats.journals}
          description="All journal entries recorded"
          href="/accounting/journal-entries"
        />
        <StatCard
          icon={FileText}
          title="Pending Approval"
          value={stats.pendingJournals}
          description="Journals awaiting action"
          href="/accounting/journal-entries"
        />
        <StatCard
          icon={Settings}
          title="Auto-Posting Rules"
          value={stats.rules}
          description="Rules configured for automation"
          href="/accounting/auto-posting-rules"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ModuleCard
            icon={Landmark}
            title="Account Types"
            description="Manage Asset, Liability, Income, Expense, Equity"
            href="/accounting/account-types"
          />
          <ModuleCard
            icon={Book}
            title="Ledger Accounts"
            description="View chart of accounts and create new ledgers"
            href="/accounting/ledger-accounts"
          />
          <ModuleCard
            icon={DollarSign}
            title="Control Accounts"
            description="Setup customer, supplier, and bank accounts"
            href="/accounting/control-accounts"
          />
          <ModuleCard
            icon={FileText}
            title="Journal Entries"
            description="Create, review, and post journal entries"
            href="/accounting/journal-entries"
          />
          <ModuleCard
            icon={Settings}
            title="Auto-Posting Rules"
            description="Configure automatic journal creation rules"
            href="/accounting/auto-posting-rules"
          />
          <ModuleCard
            icon={FileText}
            title="Account Categories"
            description="Organize ledgers by category"
            href="/accounting/account-categories"
          />
        </div>
      </div>

      {/* Feature Overview */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📊 Chart of Accounts</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>✓ Hierarchical account structure</p>
              <p>✓ Automatic ledger code generation</p>
              <p>✓ Multiple account types and categories</p>
              <p>✓ Opening balance tracking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">📝 Journal Management</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>✓ Double-entry bookkeeping validation</p>
              <p>✓ Approval workflow (Draft → Posted)</p>
              <p>✓ Audit trail tracking</p>
              <p>✓ Manual and automatic posting</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">🤖 Auto-Posting Rules</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>✓ GRN auto-posting to inventory</p>
              <p>✓ Sales invoice revenue recognition</p>
              <p>✓ COGS automatic calculation</p>
              <p>✓ Payment and receipt posting</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">💼 Control Accounts</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>✓ Customer receivables aggregation</p>
              <p>✓ Supplier payables tracking</p>
              <p>✓ Bank account management</p>
              <p>✓ Inventory valuation accounts</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Getting Started */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">🚀 Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="font-semibold text-blue-600 min-w-fit">1. Setup:</div>
            <p>Create account types and categories to organize your chart of accounts</p>
          </div>
          <div className="flex gap-3">
            <div className="font-semibold text-blue-600 min-w-fit">2. Create Ledgers:</div>
            <p>Add individual ledger accounts for specific accounts (Cash, Inventory, Income, etc.)</p>
          </div>
          <div className="flex gap-3">
            <div className="font-semibold text-blue-600 min-w-fit">3. Configure Rules:</div>
            <p>Setup auto-posting rules to automatically create journals from inventory transactions</p>
          </div>
          <div className="flex gap-3">
            <div className="font-semibold text-blue-600 min-w-fit">4. Post Entries:</div>
            <p>Create and approve journal entries. They'll post automatically once approved</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
