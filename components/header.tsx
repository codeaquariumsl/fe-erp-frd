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

    // Always start with home
    items.push({
      href: '/',
      label: 'Home',
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
                    ) : (
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
                className="h-10 gap-2 px-3 hover:bg-accent transition-colors"
                disabled={loadingLocations}
              >
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">
                    {loadingLocations
                      ? "Loading..."
                      : selectedLocation
                        ? selectedLocation.name
                        : "Select Location"
                    }
                  </span>
                  {selectedLocation && (
                    <span className="text-xs text-muted-foreground">
                      {selectedLocation.city}, {selectedLocation.country}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-72" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Select Location</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {loadingLocations ? (
                <DropdownMenuItem disabled>
                  Loading locations...
                </DropdownMenuItem>
              ) : locations.length === 0 ? (
                <DropdownMenuItem disabled>
                  No locations available
                </DropdownMenuItem>
              ) : (
                locations.map((location) => (
                  <DropdownMenuItem
                    key={location.id}
                    onClick={() => updateLocation(location)}
                    className={`cursor-pointer ${selectedLocation?.id === location.id
                      ? 'bg-accent text-accent-foreground'
                      : ''
                      }`}
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{location.name}</span>
                        {selectedLocation?.id === location.id && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {location.address}, {location.city}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {location.state}, {location.country} {location.postalCode}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>



        </div>
      </div>
    </header>
  )
}
