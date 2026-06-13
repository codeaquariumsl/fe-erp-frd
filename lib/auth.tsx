"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { authApi, type User } from "./api"
import { PERMISSIONS } from "./permissions"

interface Customer {
  id: number
  name: string
  type: string
  parentId: number | null
  address: string
  contactPerson: string
  contactNumber: string
  email: string
  deliveryTime: number
  status: string
  createdAt: string
  updatedAt: string
  childCustomers?: Customer[]
}

interface AuthContextType {
  user: User | null
  customer: Customer | null
  selectedChildCustomer: Customer | null
  token: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  error: string | null
  hasPermission: (...permissions: string[]) => boolean
  hasRole: (role: string) => boolean
  userPermissions: string[]
  setSelectedChildCustomer: (customer: Customer | null) => void
  getCurrentCustomer: () => Customer | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [selectedChildCustomer, setSelectedChildCustomer] = useState<Customer | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userPermissions, setUserPermissions] = useState<string[]>([])

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem("auth_token")
    const storedUserData = localStorage.getItem("user_data")
    const storedCustomerData = localStorage.getItem("customer_data")
    const storedSelectedChild = localStorage.getItem("selected_child_customer")
    const storedPermissions = localStorage.getItem("user_permissions")
    
    if (storedToken && storedUserData) {
      setToken(storedToken)
      
      // Load stored user data if available
      try {
        const userData = JSON.parse(storedUserData)
        
        // Validate that user data has required fields
        if (userData && (userData.fullName || userData.username)) {
          setUser(userData)
          
          // Set loading to false immediately since we have user data
          // The token validation will run in background
          setIsLoading(false)
        } else {
          console.warn("⚠️ Invalid user data in localStorage:", userData)
        }
      } catch (error) {
        console.error("❌ Failed to parse stored user data:", error)
        // Clear invalid data
        localStorage.removeItem("user_data")
      }
      
      // Load stored customer data if available
      if (storedCustomerData) {
        try {
          const customerData = JSON.parse(storedCustomerData)
          setCustomer(customerData)
        } catch (error) {
          console.error("Failed to parse stored customer data:", error)
        }
      }
      
      // Load stored selected child customer if available
      if (storedSelectedChild) {
        try {
          const selectedChild = JSON.parse(storedSelectedChild)
          setSelectedChildCustomer(selectedChild)
        } catch (error) {
          console.error("Failed to parse stored selected child customer:", error)
        }
      }
      
      // Load stored permissions if available
      if (storedPermissions) {
        try {
          const permissions = JSON.parse(storedPermissions)
          setUserPermissions(permissions)
        } catch (error) {
          console.error("Failed to parse stored permissions:", error)
        }
      }
      
      // Validate token with server in background (don't wait for it)
      // This maintains the user session while validating
      validateToken(storedToken)
    } else if (storedUserData) {
      // Have user data but no token - this is inconsistent, clear everything
      console.warn("⚠️ Found user data without token, clearing session")
      localStorage.removeItem("user_data")
      localStorage.removeItem("customer_data")
      localStorage.removeItem("selected_child_customer")
      localStorage.removeItem("user_permissions")
      setIsLoading(false)
    } else {
      // No token and no user data - user is not logged in
      console.log("ℹ️ No authentication data found, user needs to login")
      setIsLoading(false)
    }
  }, [])

  // Load user permissions when user changes
  useEffect(() => {
    if (user) {
      loadUserPermissions()
    } else {
      setUserPermissions([])
    }
  }, [user])

  const loadUserPermissions = async () => {
    if (!user || !token) return
    
    // First try to use stored permissions
    const storedPermissions = localStorage.getItem("user_permissions")
    if (storedPermissions) {
      try {
        const permissions = JSON.parse(storedPermissions)
        if (permissions && permissions.length > 0) {
          setUserPermissions(permissions)
          return
        }
      } catch (error) {
        console.error("Failed to parse stored permissions:", error)
      }
    }
    
    try {
      // Try to get permissions from API as fallback
      const permissions = await authApi.getUserPermissions(user.id, token)
      setUserPermissions(permissions)
      localStorage.setItem("user_permissions", JSON.stringify(permissions))
    } catch (error) {
      console.warn("Could not load user permissions from API, using default role permissions")
      // Fallback to default permissions based on role
      const defaultPermissions = getDefaultPermissionsForRole(user.roleId)
      setUserPermissions(defaultPermissions)
    }
  }

  const getDefaultPermissionsForRole = (roleId: number): string[] => {
    // Map role IDs to role names (you may need to adjust these based on your backend)
    const roleMap: Record<number, string> = {
      1: 'admin',
      2: 'manager', 
      3: 'user'
    }
    
    const roleName = roleMap[roleId] || 'user'
    
    // Import DEFAULT_ROLE_PERMISSIONS from permissions file
    const { DEFAULT_ROLE_PERMISSIONS } = require('./permissions')
    return DEFAULT_ROLE_PERMISSIONS[roleName] || []
  }

  const hasPermission = (...permissions: string[]): boolean => {
    if (!user || userPermissions.length === 0) return false
    
    // Admin role (roleId 1) has all permissions
    if (user.roleId === 1) return true
    
    // Check if user has any of the required permissions
    return permissions.some(permission => userPermissions.includes(permission))
  }

  const hasRole = (role: string): boolean => {
    if (!user) return false
    
    // Map role names to role IDs (adjust based on your backend)
    const roleMap: Record<string, number> = {
      'admin': 1,
      'manager': 2,
      'user': 3
    }
    
    return user.roleId === roleMap[role]
  }

  const validateToken = async (rawToken: string) => {
    const hasExistingUser = user !== null
    
    try {
      // API now handles the wrapped response and returns clean User object
      const userData = await authApi.validateToken(rawToken)

      // Store updated user data in localStorage
      localStorage.setItem("user_data", JSON.stringify(userData))

      setUser(userData)
      setError(null)
    } catch (error) {
      console.error("❌ Token validation failed:", error)
      
      // Check if we have existing user data to preserve during network issues
      const existingUserData = localStorage.getItem("user_data")
      
      if (existingUserData) {
        try {
          const userData = JSON.parse(existingUserData)
          // If validation failed but we have valid stored data, keep the user logged in
          // This handles network issues gracefully
          if (userData && (userData.fullName || userData.username)) {
            setUser(userData)
            setError("Connection issue. Some features may be limited.")
            // Don't set loading false if we already had a user (background validation)
            if (!hasExistingUser) {
              setIsLoading(false)
            }
            return
          }
        } catch (parseError) {
          console.error("❌ Failed to parse existing user data:", parseError)
        }
      }
      
      // Only clear session if token is actually invalid (not just network issues)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isNetworkError = errorMessage.includes('fetch') || 
                           errorMessage.includes('network') || 
                           errorMessage.includes('Failed to fetch')
      
      if (isNetworkError) {
        console.warn("⚠️ Network error during token validation, preserving session")
        setError("Connection issue. Please check your internet connection.")
      } else {
        console.error("🔑 Token is invalid, clearing session. Token:", rawToken)
        localStorage.removeItem("auth_token")
        localStorage.removeItem("user_data")
        localStorage.removeItem("customer_data")
        localStorage.removeItem("selected_child_customer")
        localStorage.removeItem("user_permissions")
        setToken(null)
        setUser(null)
        setError("Session expired. Please login again.")
      }
    } finally {
      // Only set loading false if we didn't have a user before (initial load)
      // For background validation, keep the current loading state
      if (!hasExistingUser) {
        setIsLoading(false)
      }
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // setIsLoading(true)
      setError(null)

      const response = await authApi.login(username, password)

      // Extract data from the new API response structure
      const { token, user, permissions, customer } = response.data
      const rawToken = token.startsWith("Bearer ")
        ? token.slice(7) // drop the prefix
        : token

      localStorage.setItem("auth_token", rawToken)

      // Store user data
      if (user) {
        localStorage.setItem("user_data", JSON.stringify(user))
      }

      // Store customer data (includes childCustomers for parent customers)
      if (customer) {
        localStorage.setItem("customer_data", JSON.stringify(customer))
        setCustomer(customer)
        
        // If customer has parentId null and childCustomers, set first child as default
        if (customer.parentId === null && customer.childCustomers && customer.childCustomers.length > 0) {
          const firstChild = customer.childCustomers[0]
          localStorage.setItem("selected_child_customer", JSON.stringify(firstChild))
          setSelectedChildCustomer(firstChild)
        }
      }

      // Store permissions directly from API response
      if (permissions && permissions.length > 0) {
        localStorage.setItem("user_permissions", JSON.stringify(permissions))
        setUserPermissions(permissions)
      }

      setToken(rawToken)
      setUser(user || null)

      return true
    } catch (error) {
      console.error("Login failed:", error)
      console.error("Error type:", typeof error)
      console.error("Error message:", error instanceof Error ? error.message : error)
      
      // Handle different types of errors with user-friendly messages
      let errorMessage = "Login failed"
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase()
        console.log("Processing error message:", message)
        
        // Handle specific backend connection errors from proxy
        if (message.includes('backend_connection_refused') || 
            message.includes('backend_timeout') ||
            message.includes('backend_dns_error') ||
            message.includes('request failed (503)') ||
            message.includes('request failed (504)') ||
            message.includes('request failed (502)')) {
          errorMessage = "Unable to connect to the server. Please check your internet connection or contact your system administrator."
        }
        // Handle generic connection errors (fallback)
        else if (message.includes('econnrefused') || 
            message.includes('connection refused') || 
            message.includes('fetch failed') ||
            message.includes('connect econnrefused') ||
            message.includes('request failed (500)') ||
            message === 'request failed (500)' ||  // Exact match for proxy error
            (message.includes('500') && message.includes('internal server error')) ||
            message.includes('network error') ||
            message.includes('failed to fetch')) {
          errorMessage = "Unable to connect to the server. Please check your internet connection or contact your system administrator."
        }
        // Handle timeout errors
        else if (message.includes('timeout') || message.includes('etimedout')) {
          errorMessage = "The server is taking too long to respond. Please try again."
        }
        // Handle invalid credentials (401 responses from working server)
        else if (message.includes('invalid') || message.includes('unauthorized') || message.includes('401')) {
          errorMessage = "Invalid username or password. Please try again."
        }
        // Handle other server errors
        else if (message.includes('502') || message.includes('503') || message.includes('504')) {
          errorMessage = "Server is temporarily unavailable. Please try again later."
        }
        // Use the original error message if it doesn't contain technical jargon
        else if (error.message && 
                 !error.message.includes('TypeError') && 
                 !error.message.includes('ReferenceError') &&
                 !error.message.includes('at async') &&
                 !error.message.includes('webpack-internal') &&
                 error.message.length < 200) {
          errorMessage = error.message
        }
      }
      
      console.log("Final error message:", errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentCustomer = (): Customer | null => {
    if (selectedChildCustomer) {
      return selectedChildCustomer
    }
    return customer
  }

  const logout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
    localStorage.removeItem("user_permissions")
    localStorage.removeItem("customer_data")
    localStorage.removeItem("selected_child_customer")
    setToken(null)
    setUser(null)
    setError(null)
    setUserPermissions([])
    setCustomer(null)
    setSelectedChildCustomer(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isLoading,
        error,
        hasPermission,
        hasRole,
        userPermissions,
        customer,
        selectedChildCustomer,
        setSelectedChildCustomer,
        getCurrentCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
