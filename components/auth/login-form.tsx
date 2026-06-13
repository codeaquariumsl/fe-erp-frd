"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth"
import { Loader2, AlertCircle, Eye, EyeOff, Leaf, Sparkles, TrendingUp } from "lucide-react"

export function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(false)
  const { login, isLoading, error } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const success = await login(username, password);
    if (success) {
      // Check if there's a redirect path stored (from unauthorized access)
      const redirectPath = localStorage.getItem("redirect_after_login")
      localStorage.removeItem("redirect_after_login")

      if (redirectPath && !redirectPath.includes("/login") && !redirectPath.includes("/auth/login")) {
        router.push(redirectPath)
      } else {
        router.push("/")
      }
    }

    setIsSubmitting(false)
  }

  const handleRetry = () => {
    if (!isSubmitting && username && password) {
      handleSubmit({ preventDefault: () => { } } as React.FormEvent)
    }
  }

  const checkConnection = async () => {
    setIsCheckingConnection(true)
    try {
      // Simple health check to the proxy endpoint
      const response = await fetch('/api/proxy/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      if (response.ok) {
        // Connection restored, user can try login again
        return true
      }
    } catch (error) {
      console.log('Connection check failed:', error)
    }
    setIsCheckingConnection(false)
    return false
  }

  const isConnectionError = error && (
    error.includes('Unable to connect to the server') ||
    error.includes('Network error occurred') ||
    error.includes('server is taking too long')
  )

  // Periodically check connection when there's a connection error
  useEffect(() => {
    if (!isConnectionError) return

    const interval = setInterval(async () => {
      if (!isSubmitting && !isCheckingConnection) {
        const connected = await checkConnection()
        if (connected) {
          // Connection restored - could show a success message
          clearInterval(interval)
        }
      }
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [isConnectionError, isSubmitting, isCheckingConnection])

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#EEFDF3] via-[#FAF9F5] to-[#FFF5E6]">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#059669] p-12 text-white relative overflow-hidden">
        {/* Background glow and decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent opacity-85"></div>
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -right-16 -top-16 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col justify-between w-full">
          {/* Logo container */}
          <div className="flex items-center space-x-4">
            <div className="p-0.5 bg-green-800/95 rounded-xl shadow-md backdrop-blur-sm transition-transform hover:scale-105 duration-300">
              <img src="/assets/fruit_easy_logo.png" alt="Fruit Eazy Logo" className="h-12 w-auto object-contain flex-shrink-0" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Fruit Eazy <Leaf className="h-5 w-5 text-lime-400 fill-lime-400/20" />
              </h1>
              <p className="text-emerald-100/80 text-xs font-medium uppercase tracking-wider">ERP System</p>
            </div>
          </div>
          {/* Center Brand Taglines & Stats Grid */}
          <div className="my-auto space-y-8 py-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-lime-300">
                <Sparkles className="h-3.5 w-3.5" /> Next-Gen ERP Platform
              </span>
              <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight lg:text-5xl">
                Pure Fruit.<br />
                <span className="bg-gradient-to-r from-lime-300 to-emerald-200 bg-clip-text text-transparent">Made Eazy.</span>
              </h2>
              <p className="text-emerald-100/85 leading-relaxed text-sm max-w-md">
                Simplifying tropical fruit logistics. Manage frozen fruit pulp supply chain, batch quality indexes, inventory control, and cold room logistics in one premium dashboard.
              </p>
            </div>

            {/* Micro Stats Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <span className="text-2xl font-bold text-lime-300">99.8%</span>
                <p className="text-xs text-emerald-100/70 mt-1">Freshness Index Sourced</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <span className="text-2xl font-bold text-lime-300">&lt; 4°C</span>
                <p className="text-xs text-emerald-100/70 mt-1">Cold Chain Monitoring</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <span className="text-2xl font-bold text-lime-300">100%</span>
                <p className="text-xs text-emerald-100/70 mt-1">Batch Traceability</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <span className="text-2xl font-bold text-lime-300">Real-Time</span>
                <p className="text-xs text-emerald-100/70 mt-1">Distribution Logistics</p>
              </div>
            </div>

            {/* Highlights block */}
            <div className="flex items-center space-x-4 p-4 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-sm shadow-sm hover:bg-white/15 transition-all duration-300 max-w-md">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                <TrendingUp className="h-6 w-6 text-lime-300" />
              </div>
              <div>
                <p className="font-semibold text-white flex items-center gap-1 text-sm">
                  Convenience & Quality, Guaranteed
                </p>
                <p className="text-xs text-emerald-100/70">Shelf-life parameter logs and automated dispatch orders</p>
              </div>
            </div>
          </div>

          {/* Footer branding */}
          <div className="text-xs text-emerald-200/80 flex justify-between items-center">
            <span>© 2026 Code Aqua (Pvt) Ltd. All rights reserved.</span>
            <span className="font-medium text-emerald-300">v3.2.0</span>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <div className="inline-flex items-center space-x-3 mb-6 bg-white/80 p-3 rounded-2xl border border-emerald-100/40 shadow-sm">
              <div className="p-1.5 bg-white rounded-lg shadow-sm">
                <img src="/assets/fruit_easy_logo.png" alt="Fruit Eazy Logo" className="h-8 w-auto object-contain" />
              </div>
              <div className="text-left">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Fruit Eazy</h1>
                <p className="text-xs text-slate-500">Operations Portal</p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome back</h2>
            <p className="text-sm text-slate-500">Sign in to your account to manage operations</p>
          </div>

          <Card className="shadow-2xl border border-emerald-100/50 bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden">
            <CardContent className="p-8">
              {isConnectionError && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="flex items-center space-x-2 text-amber-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Server Connection Issue</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    The ERP system server appears to be offline or unreachable. Please contact your system administrator.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex flex-col space-y-2">
                      <span className="text-sm font-medium">{error}</span>
                      {isConnectionError && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRetry}
                            disabled={isSubmitting || isCheckingConnection || !username || !password}
                            className="text-xs rounded-xl"
                          >
                            {isSubmitting || isCheckingConnection ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                {isCheckingConnection ? 'Checking...' : 'Retrying...'}
                              </>
                            ) : (
                              'Try Again'
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={checkConnection}
                            disabled={isSubmitting || isCheckingConnection}
                            className="text-xs rounded-xl"
                          >
                            {isCheckingConnection ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Checking...
                              </>
                            ) : (
                              'Test Connection'
                            )}
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Make sure the server is running
                          </span>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-semibold text-slate-700">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-12 px-4 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 hover:border-emerald-300 transition-all duration-200 rounded-xl bg-white/60 backdrop-blur-sm"
                    placeholder="Enter your username"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                      Password
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 px-4 pr-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 hover:border-emerald-300 transition-all duration-200 rounded-xl bg-white/60 backdrop-blur-sm"
                      placeholder="Enter your password"
                      disabled={isSubmitting}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 via-emerald-500 to-lime-600 hover:from-emerald-700 hover:to-lime-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-emerald-700/10 hover:shadow-xl hover:shadow-emerald-700/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-slate-400 space-y-4">
            {/* <p>Secure login powered by Code Aqua Solutions</p> */}
            {isConnectionError && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-left">
                <p className="font-semibold text-slate-600 mb-1.5">Troubleshooting Tips:</p>
                <ul className="text-[11px] text-slate-500 space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Verify the server is running on port 5000</li>
                  <li>• Contact your system administrator</li>
                  <li>• Try refreshing the page</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
