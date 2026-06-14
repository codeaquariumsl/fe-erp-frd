"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

import { useAuth } from "@/lib/auth"
import { LoginForm } from "./login-form"
import { LockKeyhole, ArrowLeft, LogOut, ShieldAlert, User as UserIcon, Citrus } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: string
  requiredRole?: string
}

export function ProtectedRoute({ children, requiredPermission, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, hasPermission, hasRole, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [loadingStep, setLoadingStep] = useState(0)
  const [progress, setProgress] = useState(10)

  const loadingMessages = [
    "Establishing secure connection...",
    "Verifying session credentials...",
    "Retrieving workspace parameters...",
    "Authorizing user permissions...",
    "Loading real-time dashboards...",
    "Ready to roll!"
  ]

  useEffect(() => {
    // Only redirect customer users if they're not already on customer portal pages
    if (user && user.Role?.name === 'customer' && !pathname.startsWith('/customer-portal')) {
      router.push('/customer-portal')
      return
    }
  }, [user, router, pathname])

  // Manage loading text & progress animation
  useEffect(() => {
    if (!isLoading) return

    const messageInterval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev))
    }, 1200)

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95
        const increment = Math.floor(Math.random() * 12) + 6
        return Math.min(prev + increment, 95)
      })
    }, 350)

    return () => {
      clearInterval(messageInterval)
      clearInterval(progressInterval)
    }
  }, [isLoading])

  const handleHomeRedirect = () => {
    if (user?.Role?.name === 'customer') {
      router.push('/customer-portal')
    } else {
      router.push('/')
    }
  }

  const renderAccessDenied = (type: "permission" | "role", value: string) => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50/40 via-slate-50 to-amber-50/20 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Decorative Background Circles */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-rose-100/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-100/20 rounded-full blur-[120px]" />

        <div className="max-w-lg w-full relative z-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white/75 backdrop-blur-xl border border-rose-100/80 shadow-[0_20px_50px_rgba(225,29,72,0.04)] rounded-3xl p-8 md:p-10 flex flex-col items-center text-center">
            
            {/* Pulsing Lock Icon */}
            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-rose-100/60 animate-ping opacity-60 duration-1000"></div>
              <div className="relative w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200/50 flex items-center justify-center shadow-inner text-rose-500">
                <LockKeyhole className="w-8 h-8" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2 mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                <ShieldAlert className="w-3.5 h-3.5" /> Security Constraint
              </span>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                Access Restricted
              </h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Your account credentials do not grant access to this section. Please check your system authorizations.
              </p>
            </div>

            {/* User Details box */}
            <div className="w-full bg-slate-50/80 border border-slate-200/50 rounded-2xl p-4 mb-8 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 text-xs">
                <span className="text-slate-400 font-medium">Logged in as</span>
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <UserIcon className="w-3 h-3 text-emerald-600" /> {user?.fullName || user?.username}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 text-xs">
                <span className="text-slate-400 font-medium">Account Role</span>
                <span className="font-bold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">
                  {user?.Role?.name || `Role ID: ${user?.roleId}`}
                </span>
              </div>
              <div className="flex items-start justify-between text-xs pt-0.5">
                <span className="text-slate-400 font-medium">Required Authorization</span>
                <span className="font-mono bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded font-semibold break-all text-right max-w-[200px]">
                  {type === "permission" ? `Permission: ${value}` : `Role: ${value}`}
                </span>
              </div>
            </div>

            {/* Control Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98] transition-all duration-200 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Go Back
              </button>
              
              <button
                onClick={handleHomeRedirect}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl text-sm font-bold active:scale-[0.98] transition-all duration-200 shadow-md shadow-emerald-100"
              >
                Dashboard
              </button>

              <button
                onClick={() => logout()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:border-rose-200 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 active:scale-[0.98] transition-all duration-200 shadow-sm"
              >
                <LogOut className="w-4 h-4" /> Switch User
              </button>
            </div>

          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-slate-50 to-amber-50/40 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-100/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-100/30 rounded-full blur-[120px]" />
        
        <div className="flex flex-col items-center max-w-md w-full relative z-10 animate-in fade-in duration-500">
          {/* Glassmorphic card */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-3xl p-8 w-full flex flex-col items-center text-center">
            
            {/* Brand Logo */}
            <div className="flex items-center space-x-2.5 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-lime-400 flex items-center justify-center shadow-md shadow-emerald-100/50">
                <Citrus className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-emerald-500 to-lime-600 bg-clip-text text-transparent">
                Fruit Eazy
              </span>
            </div>

            {/* Glowing outer spin loader */}
            <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[3px] border-emerald-100/40"></div>
              <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-500 border-r-lime-500 animate-spin"></div>
              <div className="w-16 h-16 rounded-full bg-white shadow-lg border border-emerald-50/50 flex items-center justify-center scale-95 hover:scale-100 transition-transform duration-300">
                <Citrus className="w-8 h-8 text-emerald-500 animate-bounce duration-1000" />
              </div>
            </div>

            {/* Status Messages */}
            <div className="space-y-2.5 w-full">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                Securing Workspace
              </h3>
              <p className="text-sm text-slate-500 h-10 flex items-center justify-center px-4 transition-all duration-300 font-medium">
                {loadingMessages[loadingStep]}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full mt-6 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-lime-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            <div className="text-[10px] font-semibold text-slate-400 mt-2.5 uppercase tracking-wider font-mono">
              Loading: {progress}%
            </div>
          </div>
        </div>
      </div>
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/20 via-slate-50 to-amber-50/20 flex items-center justify-center p-4">
        <div className="bg-white/50 backdrop-blur-lg border border-white/30 p-8 rounded-2xl shadow-xl flex flex-col items-center space-y-4 max-w-xs text-center">
          <div className="w-12 h-12 rounded-full border-[3px] border-emerald-100 border-t-emerald-600 animate-spin flex items-center justify-center">
            <Citrus className="w-6 h-6 text-emerald-500 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 text-sm">Redirecting Portal</h4>
            <p className="text-xs text-slate-500">Routing you to the Customer Workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return renderAccessDenied("permission", requiredPermission)
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return renderAccessDenied("role", requiredRole)
  }

  return <>{children}</>
}

