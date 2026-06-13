"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  ShoppingCart,
  Package,
  List,
  Menu,
  Store,
} from "lucide-react"

interface NavigationItem {
  name: string
  href: string
  icon: any
}

const navigation: NavigationItem[] = [
  {
    name: "Shop Items",
    href: "/customer-portal",
    icon: Store,
  },
  {
    name: "My Cart",
    href: "/customer-portal/cart",
    icon: ShoppingCart,
  },
  {
    name: "My Orders",
    href: "/customer-portal/orders",
    icon: List,
  },
]

interface CustomerSidebarProps {
  className?: string
}

export function CustomerSidebar({ className }: CustomerSidebarProps) {
  const pathname = usePathname()

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/customer-portal" className="flex items-center gap-2 font-semibold">
          <Package className="h-6 w-6" />
          <span className="">Customer Portal</span>
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname === item.href ? "bg-muted text-primary" : "",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </ScrollArea>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn("hidden border-r bg-muted/40 md:block w-64", className)}>
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden bg-transparent">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
