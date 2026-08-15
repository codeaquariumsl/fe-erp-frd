"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  HelpCircle,
  Moon,
  Sun,
  Palette,
  Home,
  ChevronRight,
  MapPin
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useLocation } from "@/hooks/use-location"
import { useState, useMemo } from "react"

export function Header() {
  const { user, logout, hasPermission, isLoading: authLoading } = useAuth()
  const { locations, selectedLocation, loading: loadingLocations, updateLocation } = useLocation({
    autoRefresh: true,
    refreshType: 'reload' // Use page reload on location change
  })
  const pathname = usePathname()
  const [notifications] = useState(0) // Mock notification count
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Route mapping for breadcrumb labels
  const routeLabels: Record<string, string> = {
    '/': 'Dashboard',
    '/customers': 'Customers',
    '/delivery-orders': 'Delivery Orders',
    '/delivery-order-summary': 'Delivery Summary',
    '/purchase-orders': 'Purchase Orders',
    '/sales': 'Sales',
    '/inventory': 'Inventory',
    '/grn': 'GRN',
    '/invoices': 'Invoices',
    '/gins': 'GINs',
    '/batch-schedule': 'Batch Schedule',
    '/reports': 'Reports',
    '/reports/customer-outstanding': 'Customer Outstanding Report',
    '/users': 'Users',

    '/user-management': 'User Management',
    '/roles': 'Roles',
    '/profile': 'Profile',
    '/master': 'Master Data',
    '/master/categories': 'Categories',
    '/master/items': 'Items',
    '/master/suppliers': 'Suppliers',
    '/master/locations': 'Locations',
    '/master/stores': 'Stores',
    '/master/vehicles': 'Vehicles',
    '/master/drivers': 'Drivers',
    '/master/routes': 'Routes',
    '/master/item-prices': 'Item Prices',
    '/master/document-codes': 'Document Codes',
  }

  // Generate breadcrumb items from current path
  const breadcrumbItems = useMemo(() => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const items = []

    // Always start with Dashboard
    items.push({
      href: '/',
      label: 'Dashboard',
      isActive: pathname === '/'
    })

    // Build path progressively
    let currentPath = ''
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === pathSegments.length - 1

      items.push({
        href: currentPath,
        label: routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1),
        isActive: isLast
      })
    })

    return items
  }, [pathname])

  const getUserInitials = () => {
    // Show loading during auth restoration or when no user but token exists
    if (authLoading || (!user && typeof window !== 'undefined' && localStorage.getItem('auth_token'))) {
      return "..."
    }
    if (user?.fullName) {
      return user.fullName
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
    }
    return user?.username?.[0]?.toUpperCase() || "G"
  }

  const getDisplayName = () => {
    // Show loading during auth restoration or when no user but token exists
    if (authLoading || (!user && typeof window !== 'undefined' && localStorage.getItem('auth_token'))) {
      return "Loading..."
    }

    return user?.fullName || user?.username || (user ? `User ${user.id}` : "Guest")
  }

  const getRoleName = () => {
    // Map role IDs to role names (adjust based on your backend)
    const roleMap: Record<number, string> = {
      1: 'Administrator',
      2: 'Manager',
      3: 'User'
    }
    return user?.roleId ? roleMap[user.roleId] || 'User' : 'User'
  }

  const getRoleBadgeColor = () => {
    const role = getRoleName().toLowerCase()
    switch (role) {
      case 'administrator':
        return 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200'
      case 'manager':
        return 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'
      default:
        return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
    }
  }

  // Route permissions requirement for breadcrumb links
  const routePermissions: Record<string, string[]> = {
    '/': ['dashboard:view'],
    '/reports': ['reports:view'],
    '/reports/customer-outstanding': ['reports-sales-customer-outstanding:view'],

    '/master': ['categories:view', 'items:view', 'suppliers:view', 'locations:view'],
    '/accounting': ['accounting:view'],
    '/sales': ['sales-orders:view'],
    '/purchase-orders': ['purchase-orders:view'],
    '/inventory': ['inventory:view'],
    '/grn': ['grn:view'],
    '/invoices': ['invoices:view'],
    '/user-management': ['users:view', 'roles:view'],
  }

  const canNavigateBreadcrumb = (href: string) => {
    if (!user) return true
    if (user.roleId === 1) return true
    const required = routePermissions[href]
    if (!required || required.length === 0) return true
    return required.some(permission => hasPermission(permission))
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-11 items-center justify-between px-6">
        {/* Left Section - Breadcrumb */}
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbItems.map((item, index) => (
                <div key={item.href} className="flex items-center">
                  <BreadcrumbItem>
                    {item.isActive ? (
                      <BreadcrumbPage className="font-medium text-foreground">
                        {item.label}
                      </BreadcrumbPage>
                    ) : canNavigateBreadcrumb(item.href) ? (
                      <BreadcrumbLink asChild>
                        <Link
                          href={item.href}
                          className="transition-colors hover:text-foreground text-muted-foreground"
                        >
                          {index === 0 ? (
                            <div className="flex items-center gap-1">
                              <Home className="h-4 w-4" />
                              <span className="sr-only">{item.label}</span>
                            </div>
                          ) : (
                            item.label
                          )}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <span className="text-muted-foreground/60 cursor-not-allowed select-none">
                        {index === 0 ? (
                          <div className="flex items-center gap-1">
                            <Home className="h-4 w-4" />
                            <span className="sr-only">{item.label}</span>
                          </div>
                        ) : (
                          item.label
                        )}
                      </span>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbItems.length - 1 && (
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-4 w-4" />
                    </BreadcrumbSeparator>
                  )}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>


        {/* Right Section - Actions & User */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-accent transition-colors"
          >
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-medium"
              >
                {notifications > 9 ? '9+' : notifications}
              </Badge>
            )}
          </Button>

          <Separator orientation="vertical" className="h-6" />
          {/* Location Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 gap-1.5 px-2.5 hover:bg-slate-100 transition-colors border border-slate-200/60 rounded-lg text-xs"
                disabled={loadingLocations}
              >
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                <div className="flex items-center gap-1">
                  <span className="font-medium text-slate-700 max-w-[120px] truncate">
                    {loadingLocations
                      ? "Loading..."
                      : selectedLocation
                        ? selectedLocation.name
                        : "Location"
                    }
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64" align="end">
              <DropdownMenuLabel className="font-normal text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Select Active Location</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {loadingLocations ? (
                <DropdownMenuItem disabled className="text-xs">
                  Loading locations...
                </DropdownMenuItem>
              ) : locations.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs">
                  No locations available
                </DropdownMenuItem>
              ) : (
                locations.map((location) => (
                  <DropdownMenuItem
                    key={location.id}
                    onClick={() => updateLocation(location)}
                    className={`cursor-pointer text-xs ${selectedLocation?.id === location.id
                      ? 'bg-slate-100 font-semibold text-slate-900'
                      : ''
                      }`}
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{location.name}</span>
                        {selectedLocation?.id === location.id && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-emerald-50 text-emerald-700">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {location.city}, {location.country}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* <Separator orientation="vertical" className="h-4" /> */}

          {/* User Profile */}
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 gap-2 px-2 hover:bg-slate-100 transition-colors rounded-lg"
              >
                <Avatar className="h-6 w-6 border border-slate-200">
                  <AvatarFallback className="bg-emerald-600 text-white font-bold text-[10px]">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start text-left leading-none">
                  <span className="text-xs font-semibold text-slate-800">{getDisplayName()}</span>
                  <span className="text-[10px] text-slate-400">{getRoleName()}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-semibold text-slate-800">{getDisplayName()}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getRoleBadgeColor()}`}>
                      {getRoleName()}
                    </Badge>
                    <span className="text-[10px] text-slate-400 truncate">{user?.username}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer text-xs">
                <Link href="/profile">
                  <User className="mr-2 h-3.5 w-3.5 text-slate-500" />
                  <span>Profile & Account</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-xs text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-3.5 w-3.5 text-red-600" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>
      </div>
    </header>
  )
}

