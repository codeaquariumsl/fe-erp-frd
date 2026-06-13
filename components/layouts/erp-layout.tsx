"use client"

import type React from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

interface ERPLayoutProps {
  children: React.ReactNode
}

export function ERPLayout({ children }: ERPLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-2">{children}</main>
      </div>
    </div>
  )
}
