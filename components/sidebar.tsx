"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAuth } from "@/lib/auth"
import { useSidebar } from "@/lib/sidebar-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User } from "lucide-react"
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Snowflake,
  ShoppingBag,
  FileText,
  Truck,
  UserCheck,
  Settings,
  ChevronDown,
  Menu,
  Building2,
  MapPin,
  Route,
  Car,
  DollarSign,
  Factory,
  BarChart3,
  Ruler,
  RefreshCcw,
  Layers,
  Cog,
  ListOrdered,
  Component,
  Receipt,
  Landmark,
  Book,
  ClipboardCheck,
  TrendingUp,
  Coins,
  ChevronLeft,
  Wallet,
  Droplets,
  Leaf,
} from "lucide-react"

interface NavigationItem {
  name?: string
  href?: string
  icon?: any
  children?: NavigationItem[]
  section?: string
  items?: NavigationItem[]
  permissions?: string[]
  isHeader?: boolean
}

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    permissions: ["dashboard:view"],
  },
  {
    section: "Inventory Management",
    permissions: ["inventory:view", "cold-rooms:view", "batches:view"],
    items: []
  },
  {
    name: "Purchasing",
    icon: ShoppingBag,
    permissions: [
      "purchase-orders:view",
      "grn:view",
      "supplier-returns:view",
      "supplier-payments:view"
    ],
    children: [
      {
        name: "Suppliers",
        href: "/master/suppliers",
        icon: Factory,
        permissions: ["suppliers:view"],
      },
      {
        name: "Purchase Orders",
        href: "/purchase-orders",
        icon: ShoppingBag,
        permissions: ["purchase-orders:view"],
      },
      {
        name: "GRN",
        href: "/grn",
        icon: FileText,
        permissions: ["grn:view"],
      },
      {
        name: "Supplier Returns",
        href: "/supplier-returns",
        icon: RefreshCcw,
        permissions: ["supplier-returns:view"],
      },
      {
        name: "Supplier Payments",
        href: "/supplier-payments",
        icon: DollarSign,
        permissions: ["supplier-payments:view"],
      },
    ]
  },
  {
    name: "Stock & Inventory",
    icon: Building2,
    permissions: ["good-request-notes:view", "issue-notes:view", "transfer-in-notes:view", "stock-adjustment:view", "stock-reconciliation:view"],
    children: [
      {
        name: "Categories",
        href: "/master/categories",
        icon: Package,
        permissions: ["categories:view"],
      },
      {
        name: "Items",
        href: "/master/items",
        icon: Package,
        permissions: ["items:view"],
      },
      {
        name: "Batch Management",
        href: "/batches",
        icon: Layers,
        permissions: ["batches:view"],
      },
      {
        name: "Inventory",
        href: "/inventory",
        icon: Package,
        permissions: ["inventory:view"],
      },
      {
        name: "Good Request Notes",
        href: "/good-request-notes",
        icon: FileText,
        permissions: ["good-request-notes:view"],
      },
      {
        name: "Issue Notes",
        href: "/issue-notes",
        icon: Package,
        permissions: ["issue-notes:view"],
      },
      {
        name: "Transfer In Notes",
        href: "/transfer-in-notes",
        icon: Truck,
        permissions: ["transfer-in-notes:view"],
      },
      {
        name: "Stock Adjustment",
        href: "/stock-adjustment",
        icon: RefreshCcw,
        permissions: ["stock-adjustment:view"],
      },
      {
        name: "Stock Reconciliation",
        href: "/stock-reconciliation",
        icon: ClipboardCheck,
        permissions: ["stock-reconciliation:view"],
      },
    ]
  },
  // {
  //   name: "Production",
  //   icon: Package,
  //   permissions: ["production-configs:view", "boms:view", "production-orders:view"],
  //   children: [
  //     {
  //       name: "BOM",
  //       href: "/production/bom",
  //       icon: Component,
  //       permissions: ["boms:view"],
  //     },
  //     {
  //       name: "Production Orders",
  //       href: "/production/orders",
  //       icon: ListOrdered,
  //       permissions: ["production-orders:view"],
  //     },
  //     {
  //       name: "Production Configs",
  //       href: "/production/configs",
  //       icon: Cog,
  //       permissions: ["production-configs:view"],
  //     },
  //   ]
  // },
  {
    name: "Sales & Distribution",
    icon: Users,
    permissions: [
      "customers:view",
      "sales-orders:view",
      "delivery-orders:view",
      "dispatched-orders:view",
      "invoices:view",
      "receipts:view",
      "credit-notes:view",
      "customer-returns:view"
    ],
    children: [
      {
        name: "Customers",
        href: "/customers",
        icon: Users,
        permissions: ["customers:view"],
      },
      {
        name: "Sales Orders",
        href: "/sales",
        icon: ShoppingCart,
        permissions: ["sales-orders:view"],
      },
      {
        name: "Delivery Orders",
        href: "/delivery-orders",
        icon: Truck,
        permissions: ["delivery-orders:view"],
      },
      {
        name: "Dispatched orders",
        href: "/dispatched-orders",
        icon: Package,
        permissions: ["dispatched-orders:view"],
      },
      {
        name: "Invoices",
        href: "/invoices",
        icon: FileText,
        permissions: ["invoices:view"],
      },
      {
        name: "Receipts",
        href: "/receipts",
        icon: Receipt,
        permissions: ["receipts:view"],
      },
      {
        name: "Credit Notes",
        href: "/credit-notes",
        icon: FileText,
        permissions: ["credit-notes:view"],
      },
      {
        name: "Customer Returns",
        href: "/customer-returns",
        icon: RefreshCcw,
        permissions: ["customer-returns:view"],
      },
      {
        name: "Customer Codes",
        href: "/master/customer-item-codes",
        icon: FileText,
        permissions: ["customer-item-codes:view"],
      },
      {
        name: "Assign Customers",
        href: "/master/assign-customers",
        icon: Users,
        permissions: ["users:view"],
      },
      {
        name: "Routes",
        href: "/master/routes",
        icon: Route,
        permissions: ["routes:view"],
      },
      {
        name: "Vehicles",
        href: "/master/vehicles",
        icon: Car,
        permissions: ["vehicles:view"],
      },
    ]
  },
  {
    name: "Finance",
    icon: DollarSign,
    permissions: ["accounting:view"],
    children: [
      {
        name: "Account Types",
        href: "/accounting/account-types",
        icon: Landmark,
        permissions: ["accounting:view"],
      },
      {
        name: "Account Categories",
        href: "/accounting/account-categories",
        icon: Layers,
        permissions: ["accounting:view"],
      },
      {
        name: "Ledger Accounts",
        href: "/accounting/ledger-accounts",
        icon: Book,
        permissions: ["accounting:view"],
      },
      {
        name: "Control Accounts",
        href: "/accounting/control-accounts",
        icon: DollarSign,
        permissions: ["accounting:view"],
      },
      {
        name: "Banks",
        href: "/accounting/banks",
        icon: Building2,
        permissions: ["accounting:view"],
      },
      {
        name: "Bank Branches",
        href: "/accounting/bank-branches",
        icon: MapPin,
        permissions: ["accounting:view"],
      },
      {
        name: "Journal Entries",
        href: "/accounting/journal-entries",
        icon: FileText,
        permissions: ["accounting:view"],
      },
      {
        name: "Bill Entries",
        href: "/accounting/bill-entries",
        icon: FileText,
        permissions: ["accounting:view"],
      },
      {
        name: "Bill Payments",
        href: "/accounting/bill-payments",
        icon: DollarSign,
        permissions: ["accounting:view"],
      },
      {
        name: "One Time Payments",
        href: "/accounting/one-payments",
        icon: Receipt,
        permissions: ["accounting:view"],
      },
      {
        name: "Funds Transfers",
        href: "/accounting/funds-transfers",
        icon: TrendingUp,
        permissions: ["accounting:view"],
      },
      {
        name: "Petty Cash",
        href: "/accounting/petty-cash",
        icon: Coins,
        permissions: ["accounting:view"],
      },
      {
        name: "Bank Reconciliation",
        href: "/accounting/bank-reconciliations",
        icon: Receipt,
        permissions: ["accounting:view"],
      },
      {
        name: "Auto-Posting Rules",
        href: "/accounting/auto-posting-rules",
        icon: Settings,
        permissions: ["accounting:view"],
      },
      {
        name: "Cancel Cheques",
        href: "/accounting/cancel-cheques",
        icon: Receipt,
        permissions: ["accounting:view"],
      },
      {
        name: "Bank Deposits",
        href: "/accounting/bank-deposits",
        icon: Landmark,
        permissions: ["bank-deposits:view"],
      },
      {
        name: "Return Cheques",
        href: "/accounting/return-cheques",
        icon: RefreshCcw,
        permissions: ["accounting:view"],
      },
      {
        name: "Reports",
        href: "/accounting/reports",
        icon: BarChart3,
        permissions: ["accounting:view"],
      },
    ]
  },
  {
    name: "Reports & Analytics",
    icon: BarChart3,
    permissions: ["reports:view"],
    children: [
      {
        name: "Dashboard",
        href: "/reports",
        icon: LayoutDashboard,
        permissions: ["reports:view"],
      },
      {
        name: "Stock & Inventory",
        isHeader: true,
        permissions: ["reports:view"],
      },
      {
        name: "Stock Reports",
        href: "/reports/stock",
        icon: Package,
        permissions: ["reports:view"],
      },
      {
        name: "Stock Movements",
        href: "/reports/movements",
        icon: RefreshCcw,
        permissions: ["reports:view"],
      },
      {
        name: "Enhanced Movements",
        href: "/reports/enhanced-movements",
        icon: BarChart3,
        permissions: ["reports:view"],
      },
      {
        name: "GIN Reports",
        href: "/reports/gin",
        icon: FileText,
        permissions: ["reports:view"],
      },
      {
        name: "Inventory Valuation",
        href: "/reports/analytics",
        icon: DollarSign,
        permissions: ["reports:view"],
      },
      {
        name: "Sales & Distribution",
        isHeader: true,
        permissions: ["reports:view"],
      },
      {
        name: "General Sales",
        href: "/reports/general-sales",
        icon: TrendingUp,
        permissions: ["reports:view"],
      },
      {
        name: "Item Wise Sales",
        href: "/reports/item-wise-sales",
        icon: TrendingUp,
        permissions: ["reports:view"],
      },
      {
        name: "Item Detail Report",
        href: "/reports/sales-by-item",
        icon: Package,
        permissions: ["reports:view"],
      },
      {
        name: "Rep Wise Sales",
        href: "/reports/rep-wise-sales",
        icon: Users,
        permissions: ["reports:view"],
      },
      {
        name: "Rep Wise Orders",
        href: "/reports/rep-wise-orders",
        icon: Users,
        permissions: ["reports:view"],
      },
      {
        name: "Procurement & Purchasing",
        isHeader: true,
        permissions: ["reports:view"],
      },
      {
        name: "GRN Reports",
        href: "/reports/grn",
        icon: FileText,
        permissions: ["reports:view"],
      },
      {
        name: "Item-wise Purchasing",
        href: "/reports/item-wise-purchasing",
        icon: Package,
        permissions: ["reports:view"],
      },
      {
        name: "Supplier-wise PO",
        href: "/reports/supplier-wise-po",
        icon: Users,
        permissions: ["reports:view"],
      },
      {
        name: "Finance & Commission",
        isHeader: true,
        permissions: ["reports:view"],
      },
      {
        name: "Expenses",
        href: "/reports/expenses",
        icon: Wallet,
        permissions: ["reports:view"],
      },
      {
        name: "Commission",
        href: "/reports/salesperson-commission",
        icon: DollarSign,
        permissions: ["reports:view"],
      },
    ]
  },
  {
    name: "System Configuration",
    icon: Settings,
    permissions: [
      "warehouse:view",
      "units:view",
      "return-types:view"
    ],
    children: [
      {
        name: "Locations",
        href: "/master/locations",
        icon: MapPin,
        permissions: ["warehouse:view"],
      },
      {
        name: "Stores",
        href: "/master/stores",
        icon: Building2,
        permissions: ["warehouse:view"],
      },

      {
        name: "Units",
        href: "/master/units",
        icon: Ruler,
        permissions: ["units:view"],
      },
      {
        name: "Return Types",
        href: "/master/return-types",
        icon: RefreshCcw,
        permissions: ["return-types:view"],
      },

    ]
  },
  {
    name: "User Administration",
    icon: Settings,
    permissions: ["users:view", "roles:view"],
    children: [
      {
        name: "User Management",
        href: "/user-management",
        icon: UserCheck,
        permissions: ["users:view", "roles:view"],
      },
    ]
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [openItems, setOpenItems] = useState<string[]>([])
  const { hasPermission, user, isLoading, logout } = useAuth()
  const { isOpen, toggleSidebar } = useSidebar()
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-expand parent sections when child is active
  useEffect(() => {
    const visibleItems = getVisibleNavigationItems()
    const activeParent = visibleItems.find(item => {
      if (item.children) {
        return item.children.some(child => pathname === child.href)
      }
      return false
    })

    if (activeParent?.name && !openItems.includes(activeParent.name)) {
      setOpenItems(prev => [...prev, activeParent.name!])
    }
  }, [pathname])

  const toggleItem = useCallback((name: string) => {
    const currentScrollTop = scrollAreaRef.current?.scrollTop || 0
    setOpenItems((prev) => {
      const isCurrentlyOpen = prev.includes(name)
      if (isCurrentlyOpen) {
        return prev.filter((item) => item !== name)
      } else {
        return [...prev, name]
      }
    })
    requestAnimationFrame(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = currentScrollTop
      }
    })
  }, [])

  const hasAnyPermission = (permissions?: string[]): boolean => {
    if (isLoading || !user) return false
    if (!permissions || permissions.length === 0) return true
    return permissions.some(permission => hasPermission(permission))
  }

  const hasVisibleChildren = (children?: NavigationItem[]): boolean => {
    if (!children) return false
    return children.some(child => hasAnyPermission(child.permissions))
  }

  const hasVisibleSectionItems = (items?: NavigationItem[]): boolean => {
    if (!items) return false
    return items.some(item => hasAnyPermission(item.permissions))
  }

  const getVisibleNavigationItems = useCallback(() => {
    return navigation.filter(item => {
      if (item.section && item.items) {
        return hasVisibleSectionItems(item.items)
      }
      if (item.children && item.name) {
        return hasAnyPermission(item.permissions) && hasVisibleChildren(item.children)
      }
      return hasAnyPermission(item.permissions)
    })
  }, [hasPermission, user, isLoading])

  const SidebarContent = () => (
    <div className="flex h-full flex-col" style={{ background: 'linear-gradient(180deg, #063c2e 0%, #021f17 100%)' }}>

      {/* === LOGO HEADER === */}
      <div
        onClick={!isOpen ? toggleSidebar : undefined}
        className={cn(
          "relative flex items-center border-b px-4 transition-all duration-300 group/header",
          isOpen ? "h-14 justify-between" : "h-14 justify-center cursor-pointer"
        )}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <Link
          href={isOpen ? "/" : "#"}
          onClick={(e) => {
            if (!isOpen) {
              e.preventDefault();
            }
          }}
          className={cn(
            "flex items-center gap-2.5 min-w-0 transition-all duration-300",
            !isOpen ? "justify-center group-hover/header:opacity-0 group-hover/header:scale-75" : ""
          )}
        >
          {/* Logo Icon */}
          <div className="flex-shrink-0 relative">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-emerald-500/20 p-1"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>
              <img src="/assets/fruit_easy_logo.png" alt="Fruit Eazy Logo" className="h-5 w-auto object-contain flex-shrink-0" />
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl opacity-30 blur-sm"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }} />
          </div>

          {/* Brand Text */}
          <div className={cn("flex flex-col min-w-0 transition-all duration-300", !isOpen && "hidden")}>
            <span className="text-white font-bold text-sm leading-tight tracking-tight">Fruit Eazy</span>
            <span className="text-xs leading-tight font-medium" style={{ color: '#10B981' }}>ERP System</span>
          </div>
        </Link>

        {/* Collapse button */}
        {isOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-7 w-7 hidden md:flex flex-shrink-0 rounded-lg transition-all duration-200"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Expand button (collapsed state) */}
        {!isOpen && (
          <div
            className="absolute inset-0 flex items-center justify-center transition-all duration-300 opacity-0 scale-75 group-hover/header:opacity-100 group-hover/header:scale-100 pointer-events-none"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-emerald-500/20"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>
              <ChevronLeft className="h-4.5 w-4.5 text-white rotate-180" style={{ width: '18px', height: '18px' }} />
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl opacity-30 blur-sm"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }} />
          </div>
        )}
      </div>

      {/* === NAVIGATION === */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <nav className={cn(
          "py-3 transition-all duration-300",
          isOpen ? "px-3" : "px-2"
        )}>
          {getVisibleNavigationItems().map((item, index) => {

            // Section headers
            if (item.section && item.items) {
              const visibleItems = item.items.filter(navItem => hasAnyPermission(navItem.permissions))
              if (visibleItems.length === 0) return null
              return (
                <div key={item.section} className="space-y-0.5 mb-2">
                  <div className={cn(
                    "px-2 py-1 text-[9px] font-bold uppercase tracking-widest mb-1 transition-all duration-300",
                    isOpen ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                  )} style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {item.section}
                  </div>
                  {visibleItems.map((navItem) => (
                    <Link key={navItem.href} href={navItem.href!}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all duration-200 group relative",
                        pathname === navItem.href
                          ? "text-white"
                          : "hover:text-white",
                        !isOpen && "justify-center"
                      )}
                      style={{
                        color: pathname === navItem.href ? '#fff' : 'rgba(255,255,255,0.55)',
                        background: pathname === navItem.href ? 'rgba(16,185,129,0.15)' : 'transparent',
                      }}
                      title={!isOpen ? navItem.name : undefined}
                    >
                      {pathname === navItem.href && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                          style={{ background: '#10B981' }} />
                      )}
                      <navItem.icon className="h-4 w-4 flex-shrink-0" />
                      <span className={cn("font-medium transition-all duration-300", !isOpen && "hidden")}>{navItem.name}</span>
                    </Link>
                  ))}
                </div>
              )
            }

            // Collapsible menu groups
            if (item.children && item.name) {
              const visibleChildren = item.children.filter(child => hasAnyPermission(child.permissions))
              if (visibleChildren.length === 0) return null

              const isItemOpen = openItems.includes(item.name)
              const hasActiveChild = visibleChildren.some((child) => pathname === child.href)

              return (
                <div key={item.name} className="mb-0.5">
                  <Collapsible open={isItemOpen && isOpen} onOpenChange={() => isOpen && toggleItem(item.name!)}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all duration-200 group relative",
                          !isOpen && "justify-center"
                        )}
                        style={{
                          color: hasActiveChild ? '#fff' : 'rgba(255,255,255,0.55)',
                          background: hasActiveChild && !isItemOpen ? 'rgba(16,185,129,0.08)' : 'transparent',
                        }}
                        onMouseEnter={(e) => { if (!hasActiveChild) e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = hasActiveChild ? '#fff' : 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = hasActiveChild && !isItemOpen ? 'rgba(16,185,129,0.12)' : 'transparent' }}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (isOpen) toggleItem(item.name!)
                        }}
                        title={!isOpen ? item.name : undefined}
                      >
                        {/* Active indicator dot for collapsed state */}
                        {!isOpen && hasActiveChild && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
                        )}

                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className={cn(
                            "font-medium truncate transition-all duration-300",
                            !isOpen && "hidden"
                          )}>
                            {item.name}
                          </span>
                        </div>

                        <ChevronDown className={cn(
                          "h-3.5 w-3.5 flex-shrink-0 transition-all duration-300",
                          isItemOpen ? "rotate-180" : "",
                          !isOpen && "hidden"
                        )} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
                      <div className="mt-0.5 ml-3 pl-3 space-y-0.5 pb-1"
                        style={{ borderLeft: '1px solid rgba(16,185,129,0.2)' }}>
                        {visibleChildren.map((child) => {
                          if (child.isHeader) {
                            return (
                              <div key={child.name}
                                className="px-2 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest select-none"
                                style={{ color: 'rgba(255,255,255,0.25)' }}>
                                {child.name}
                              </div>
                            )
                          }
                          const isActive = pathname === child.href
                          return (
                            <Link key={child.href} href={child.href!}
                              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-200 group relative"
                              style={{
                                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                                background: isActive ? 'rgba(16,185,129,0.15)' : 'transparent',
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                                  e.currentTarget.style.background = 'transparent'
                                }
                              }}
                            >
                              {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                                  style={{ background: '#10B981' }} />
                              )}
                              {child.icon && (
                                <child.icon className="h-3.5 w-3.5 flex-shrink-0"
                                  style={{ color: isActive ? '#10B981' : 'inherit' }} />
                              )}
                              <span className="font-medium">{child.name}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )
            }

            // Regular items (Dashboard)
            if (item.href && item.icon) {
              const isActive = pathname === item.href
              return (
                <div key={item.href} className="mb-0.5">
                  <Link href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all duration-200 group relative",
                      !isOpen && "justify-center"
                    )}
                    style={{
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                      background: isActive ? 'rgba(16,185,129,0.15)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                    title={!isOpen ? item.name : undefined}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{ background: '#10B981' }} />
                    )}
                    <item.icon className="h-4 w-4 flex-shrink-0"
                      style={{ color: isActive ? '#10B981' : 'inherit' }} />
                    <span className={cn("font-medium transition-all duration-300", !isOpen && "hidden")}>
                      {item.name}
                    </span>
                  </Link>
                </div>
              )
            }

            return null
          })}
        </nav>
      </ScrollArea>

      {/* === SIDEBAR FOOTER === */}
      <div className="p-3 border-t animate-fade-in" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "w-full flex items-center gap-2.5 rounded-xl px-2 py-2 transition-all duration-300 text-left outline-none hover:bg-white/5 border border-transparent active:scale-[0.98]",
              !isOpen && "justify-center"
            )}>
              <Avatar className="h-8 w-8 border border-emerald-500/20 shadow-inner">
                <AvatarImage src="/placeholder-user.jpg" alt={user?.fullName || user?.username || "Guest"} />
                <AvatarFallback className="font-semibold text-white text-xs" style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>
                  {user?.fullName ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase() : user?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className={cn("flex flex-col min-w-0 transition-all duration-300 flex-1", !isOpen && "hidden")}>
                <span className="text-white font-semibold text-xs leading-none truncate">{user?.fullName || user?.username || "Guest"}</span>
                <span className="text-[10px] text-emerald-400 font-medium mt-1 truncate">{user?.email || "Operations Account"}</span>
              </div>
              <ChevronDown className={cn("h-3.5 w-3.5 text-white/40 transition-transform duration-300", !isOpen && "hidden")} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2 border border-emerald-500/20 bg-[#021f17] text-white shadow-2xl rounded-2xl p-1.5" align={isOpen ? "start" : "center"}>
            <DropdownMenuLabel className="font-normal text-xs py-2 px-3 border-b border-white/5">
              <p className="font-semibold text-white truncate">{user?.fullName || user?.username || "Guest"}</p>
              <p className="text-[10px] text-emerald-400 font-medium truncate mt-0.5">{user?.email || "Operations Account"}</p>
            </DropdownMenuLabel>
            <DropdownMenuItem className="cursor-pointer text-xs hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white rounded-xl py-2 px-3 m-0.5 transition-colors flex items-center" asChild>
              <Link href="/profile">
                <User className="mr-2.5 h-3.5 w-3.5 text-emerald-400" />
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-xs hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white rounded-xl py-2 px-3 m-0.5 transition-colors flex items-center" asChild>
              <Link href="/settings">
                <Settings className="mr-2.5 h-3.5 w-3.5 text-emerald-400" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5 my-1" />
            <DropdownMenuItem className="cursor-pointer text-xs hover:bg-red-500/10 focus:bg-red-500/10 rounded-xl py-2 px-3 m-0.5 transition-colors flex items-center" onClick={logout}>
              <LogOut className="mr-2.5 h-3.5 w-3.5 text-red-400" />
              <span className="text-red-400 font-medium">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:block shadow-xl transition-all duration-300 overflow-hidden flex-shrink-0",
        className,
        isOpen ? "w-64" : "w-[68px]"
      )}>
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden transition-colors duration-200"
            style={{ background: 'transparent', borderColor: 'rgba(16,185,129,0.3)', color: '#059669' }}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0 w-72 border-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
