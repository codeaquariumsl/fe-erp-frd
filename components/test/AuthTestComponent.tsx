"use client"

/**
 * Auth Test Component to verify authentication restoration on page reload
 * This component helps test and debug authentication issues
 */
import { useAuth } from '@/lib/auth'
import { useEffect, useState } from 'react'

export function AuthTestComponent() {
  const { user, isLoading, error, token } = useAuth()
  const [authData, setAuthData] = useState<any>({})
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    // Update auth data state whenever auth context changes
    setAuthData({
      hasUser: !!user,
      userName: user?.username || user?.fullName || 'None',
      hasToken: !!token,
      tokenLength: token?.length || 0,
      isLoading,
      error: error || 'None',
      timestamp: new Date().toLocaleTimeString()
    })
  }, [user, token, isLoading, error])

  useEffect(() => {
    // Track page reloads
    const count = sessionStorage.getItem('authTestReloadCount')
    const newCount = count ? parseInt(count) + 1 : 1
    setReloadCount(newCount)
    sessionStorage.setItem('authTestReloadCount', newCount.toString())

    // Log auth restoration process
    console.log('🔍 Auth Test Component - Page Load #' + newCount)
    console.log('📱 LocalStorage Auth Token:', localStorage.getItem('auth_token') ? 'Present' : 'Missing')
    console.log('👤 LocalStorage User Data:', localStorage.getItem('user_data') ? 'Present' : 'Missing')
  }, [])

  const handleManualReload = () => {
    console.log('🔄 Manual page reload initiated')
    window.location.reload()
  }

  const handleClearAuth = () => {
    console.log('🗑️ Clearing auth data manually')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    localStorage.removeItem('customer_data')
    localStorage.removeItem('selected_child_customer')
    localStorage.removeItem('user_permissions')
    window.location.reload()
  }

  const checkLocalStorage = () => {
    const authToken = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('user_data')
    
    console.log('🔍 Current LocalStorage State:')
    console.log('  Auth Token:', authToken ? `Present (${authToken.length} chars)` : 'Missing')
    console.log('  User Data:', userData ? JSON.parse(userData) : 'Missing')
    
    alert(`Auth Token: ${authToken ? 'Present' : 'Missing'}\nUser Data: ${userData ? 'Present' : 'Missing'}`)
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-bold text-lg mb-3">🔐 Authentication Test Component</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-semibold">Auth Status:</h4>
          <div className="text-sm space-y-1">
            <p>Page Loads: <span className="font-mono">{reloadCount}</span></p>
            <p>Loading: <span className={`font-mono ${isLoading ? 'text-orange-600' : 'text-green-600'}`}>{isLoading ? 'Yes' : 'No'}</span></p>
            <p>Has User: <span className={`font-mono ${authData.hasUser ? 'text-green-600' : 'text-red-600'}`}>{authData.hasUser ? 'Yes' : 'No'}</span></p>
            <p>User Name: <span className="font-mono">{authData.userName}</span></p>
            <p>Has Token: <span className={`font-mono ${authData.hasToken ? 'text-green-600' : 'text-red-600'}`}>{authData.hasToken ? 'Yes' : 'No'}</span></p>
            <p>Error: <span className={`font-mono text-sm ${error ? 'text-red-600' : 'text-green-600'}`}>{authData.error}</span></p>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold">Last Update:</h4>
          <p className="font-mono text-sm">{authData.timestamp}</p>
          
          <div className="mt-3 space-y-2">
            <button
              onClick={handleManualReload}
              className="block w-full px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              🔄 Manual Reload Test
            </button>
            
            <button
              onClick={checkLocalStorage}
              className="block w-full px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              🔍 Check LocalStorage
            </button>
            
            <button
              onClick={handleClearAuth}
              className="block w-full px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              🗑️ Clear Auth & Reload
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-white rounded border text-xs">
        <h5 className="font-semibold mb-2">Testing Steps:</h5>
        <ol className="list-decimal ml-4 space-y-1">
          <li>Ensure you're logged in (Has User: Yes)</li>
          <li>Click "Manual Reload Test" - user should remain after reload</li>
          <li>Use browser refresh button (F5/Ctrl+R) - user should remain</li>
          <li>Check browser console for auth restoration logs</li>
          <li>If user becomes "Guest", check localStorage and console errors</li>
        </ol>
      </div>
      
      {user && (
        <div className="mt-3 p-2 bg-green-50 rounded text-sm">
          ✅ <strong>Auth Working:</strong> Welcome {user.fullName || user.username}!
        </div>
      )}
      
      {!user && !isLoading && (
        <div className="mt-3 p-2 bg-red-50 rounded text-sm">
          ❌ <strong>Auth Issue:</strong> No user data found. Check console for errors.
        </div>
      )}
      
      {isLoading && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
          ⏳ <strong>Loading:</strong> Authentication is being restored...
        </div>
      )}
    </div>
  )
}

// Usage in any page:
// import { AuthTestComponent } from './path/to/AuthTestComponent'
// 
// export default function TestPage() {
//   return (
//     <div>
//       <h1>Auth Test Page</h1>
//       <AuthTestComponent />
//     </div>
//   )
// }