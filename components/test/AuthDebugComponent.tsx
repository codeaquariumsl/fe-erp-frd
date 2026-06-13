/**
 * Advanced Auth Debug Component
 * This component provides detailed debugging for the "Guest" issue
 */
import { useAuth } from '@/lib/auth'
import { useEffect, useState } from 'react'

export function AuthDebugComponent() {
  const { user, isLoading, token, error } = useAuth()
  const [debugData, setDebugData] = useState<any>({})
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    // Track page reloads
    const count = sessionStorage.getItem('authDebugReloadCount')
    const newCount = count ? parseInt(count) + 1 : 1
    setReloadCount(newCount)
    sessionStorage.setItem('authDebugReloadCount', newCount.toString())

    console.log(`🔍 [RELOAD #${newCount}] Auth Debug Component initialized`)
  }, [])

  useEffect(() => {
    // Update debug data whenever auth state changes
    const now = new Date()
    const timestamp = now.toLocaleTimeString()
    
    // Get localStorage data
    const storedToken = localStorage.getItem('auth_token')
    const storedUserData = localStorage.getItem('user_data')
    
    let parsedUserData = null
    try {
      parsedUserData = storedUserData ? JSON.parse(storedUserData) : null
    } catch (e) {
      parsedUserData = 'INVALID_JSON'
    }

    const newDebugData = {
      timestamp,
      authState: {
        isLoading,
        hasUser: !!user,
        hasToken: !!token,
        error: error || 'none'
      },
      userObject: user ? {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        roleId: user.roleId,
        usernameType: typeof user.username,
        fullNameType: typeof user.fullName
      } : null,
      localStorage: {
        hasToken: !!storedToken,
        tokenLength: storedToken?.length || 0,
        hasUserData: !!storedUserData,
        userDataLength: storedUserData?.length || 0,
        parsedUserData: parsedUserData
      },
      displayValues: {
        expectedDisplayName: user?.fullName || user?.username || (user ? `User ${user.id}` : "Guest"),
        fullNameExists: !!user?.fullName,
        usernameExists: !!user?.username,
        userIdExists: !!user?.id
      }
    }
    
    setDebugData(newDebugData)
    
    // Log to console for debugging
    console.log(`🔍 [${timestamp}] Auth State Update:`, newDebugData)
    
    // Special logging for the specific issue
    if (user) {
      console.log(`🔍 [${timestamp}] User object analysis:`)
      console.log('  - user.username:', user.username, typeof user.username)
      console.log('  - user.fullName:', user.fullName, typeof user.fullName)
      console.log('  - Should show:', user.fullName || user.username || `User ${user.id}`)
    }
    
  }, [user, isLoading, token, error])

  const clearAllAuth = () => {
    console.log('🗑️ Clearing all auth data')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    localStorage.removeItem('customer_data')
    localStorage.removeItem('selected_child_customer')
    localStorage.removeItem('user_permissions')
    sessionStorage.removeItem('authDebugReloadCount')
    window.location.reload()
  }

  const forceReload = () => {
    console.log('🔄 Forcing page reload')
    window.location.reload()
  }

  const testTokenValidation = async () => {
    console.log('🧪 Testing token validation manually')
    const token = localStorage.getItem('auth_token')
    if (token) {
      try {
        const response = await fetch('/api/proxy/users/profile', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        const data = await response.json()
        console.log('🧪 Manual API call result:', data)
        alert(`API Response: ${JSON.stringify(data, null, 2)}`)
      } catch (error) {
        console.error('🧪 Manual API call failed:', error)
        alert(`API Error: ${error}`)
      }
    } else {
      alert('No token found in localStorage')
    }
  }

  return (
    <div className="fixed top-4 right-4 bg-white border-2 border-red-200 rounded-lg shadow-lg p-4 max-w-md z-50 text-xs max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-red-600">🔍 Auth Debug Panel</h3>
        <span className="text-xs text-gray-500">Reload #{reloadCount}</span>
      </div>
      
      <div className="space-y-3">
        {/* Current State */}
        <div className="bg-gray-50 p-2 rounded">
          <h4 className="font-semibold mb-1">Current State</h4>
          <div className="space-y-1 text-xs">
            <div>Loading: <span className={isLoading ? 'text-orange-600' : 'text-green-600'}>{String(isLoading)}</span></div>
            <div>Has User: <span className={debugData.authState?.hasUser ? 'text-green-600' : 'text-red-600'}>{String(debugData.authState?.hasUser)}</span></div>
            <div>Has Token: <span className={debugData.authState?.hasToken ? 'text-green-600' : 'text-red-600'}>{String(debugData.authState?.hasToken)}</span></div>
            <div>Error: <span className={error ? 'text-red-600' : 'text-green-600'}>{debugData.authState?.error}</span></div>
          </div>
        </div>

        {/* User Object Analysis */}
        {debugData.userObject && (
          <div className="bg-blue-50 p-2 rounded">
            <h4 className="font-semibold mb-1">User Object</h4>
            <div className="space-y-1 text-xs">
              <div>ID: {debugData.userObject.id}</div>
              <div>Username: <span className={debugData.userObject.username ? 'text-green-600' : 'text-red-600'}>"{debugData.userObject.username}" ({debugData.userObject.usernameType})</span></div>
              <div>Full Name: <span className={debugData.userObject.fullName ? 'text-green-600' : 'text-red-600'}>"{debugData.userObject.fullName}" ({debugData.userObject.fullNameType})</span></div>
              <div>Email: {debugData.userObject.email}</div>
              <div>Role ID: {debugData.userObject.roleId}</div>
            </div>
          </div>
        )}

        {/* Display Analysis */}
        <div className="bg-yellow-50 p-2 rounded">
          <h4 className="font-semibold mb-1">Display Analysis</h4>
          <div className="space-y-1 text-xs">
            <div>Expected Display: <span className="font-bold text-blue-600">"{debugData.displayValues?.expectedDisplayName}"</span></div>
            <div>Full Name Exists: <span className={debugData.displayValues?.fullNameExists ? 'text-green-600' : 'text-red-600'}>{String(debugData.displayValues?.fullNameExists)}</span></div>
            <div>Username Exists: <span className={debugData.displayValues?.usernameExists ? 'text-green-600' : 'text-red-600'}>{String(debugData.displayValues?.usernameExists)}</span></div>
            <div>User ID Exists: <span className={debugData.displayValues?.userIdExists ? 'text-green-600' : 'text-red-600'}>{String(debugData.displayValues?.userIdExists)}</span></div>
          </div>
        </div>

        {/* LocalStorage */}
        <div className="bg-green-50 p-2 rounded">
          <h4 className="font-semibold mb-1">LocalStorage</h4>
          <div className="space-y-1 text-xs">
            <div>Has Token: <span className={debugData.localStorage?.hasToken ? 'text-green-600' : 'text-red-600'}>{String(debugData.localStorage?.hasToken)}</span></div>
            <div>Token Length: {debugData.localStorage?.tokenLength}</div>
            <div>Has User Data: <span className={debugData.localStorage?.hasUserData ? 'text-green-600' : 'text-red-600'}>{String(debugData.localStorage?.hasUserData)}</span></div>
            {debugData.localStorage?.parsedUserData && debugData.localStorage.parsedUserData !== 'INVALID_JSON' && (
              <div className="mt-1">
                <div>Stored Username: "{debugData.localStorage.parsedUserData.username}"</div>
                <div>Stored Full Name: "{debugData.localStorage.parsedUserData.fullName}"</div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={forceReload}
            className="w-full px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            🔄 Force Reload
          </button>
          
          <button
            onClick={testTokenValidation}
            className="w-full px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
          >
            🧪 Test API Call
          </button>
          
          <button
            onClick={clearAllAuth}
            className="w-full px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
          >
            🗑️ Clear All & Reload
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-2">
          Last Update: {debugData.timestamp}
        </div>
      </div>
    </div>
  )
}

// Usage: Add <AuthDebugComponent /> to any page temporarily