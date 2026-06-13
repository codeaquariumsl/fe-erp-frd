"use client"

import React from "react"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

import { useAuth } from "@/lib/auth"
import { LoginForm } from "./login-form"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: string
  requiredRole?: string
}

export function ProtectedRoute({ children, requiredPermission, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, hasPermission, hasRole } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only redirect customer users if they're not already on customer portal pages
    if (user && user.Role?.name === 'customer' && !pathname.startsWith('/customer-portal')) {
      router.push('/customer-portal')
      return
    }
  }, [user, router, pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEFDF3] via-[#FAF9F5] to-[#FFF5E6] flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-8 max-w-md w-full">
          {/* Modern logo/brand area with glow effect */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-emerald-500 to-lime-600 bg-clip-text text-transparent">
              Fruit Eazy
            </div>
          </div>

          {/* Loading text with better typography */}
          <div className="text-center space-y-3">
            <h2 className="text-xl font-semibold text-slate-800">
              Loading Your Workspace
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Preparing your personalized dashboard and<br />
              loading the latest data...
            </p>
          </div>

          {/* Enhanced loading dots animation */}
          <div className="flex space-x-2">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce"></div>
            <div className="w-2.5 h-2.5 bg-lime-500 rounded-full animate-bounce animation-delay-75"></div>
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce animation-delay-150"></div>
          </div>

          {/* Progress bar simulation */}
          {/* <div className="w-full max-w-xs">
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-full animate-pulse" 
                   style={{
                     width: '10%',
                     animation: 'loading-progress 2s ease-in-out infinite alternate'
                   }}>
              </div>
            </div>
          </div> */}
        </div >

        {/* Add the progress animation keyframes */}
        < style jsx > {`
          @keyframes loading-progress {
            0% { width: 20%; }
            50% { width: 70%; }
            100% { width: 95%; }
          }
        `}</style >
      </div >
    )
  }

  if (!user) {
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search
      const isAlreadyOnLogin = currentPath === "/" || currentPath.includes("/auth/login") || currentPath.includes("/login")
      if (!isAlreadyOnLogin) {
        localStorage.setItem("redirect_after_login", currentPath)
      }
    }
    return <LoginForm />
  }

  // Allow customer users to access customer portal pages
  if (user.Role?.name === 'customer' && pathname.startsWith('/customer-portal')) {
    return <>{children}</>
  }

  // If user is a customer trying to access ERP pages, show loading (they'll be redirected)
  if (user.Role?.name === 'customer') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this resource.</p>
        </div>
      </div>
    )
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You don't have the required role to access this resource.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
