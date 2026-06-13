/**
 * Quick Auth State Test - Add this to any page to debug auth issues
 * Shows real-time auth state changes during page loads
 */
import { useAuth } from '@/lib/auth'
import { useEffect, useState } from 'react'

export function QuickAuthTest() {
  const { user, isLoading, token } = useAuth()
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString()
    const newLog = `${timestamp}: Loading=${isLoading}, User=${user ? (user.fullName || user.username) : 'null'}, Token=${token ? 'present' : 'null'}`
    
    setLogs(prev => [...prev.slice(-4), newLog]) // Keep last 5 logs
    console.log('🔍 Auth State:', newLog)
  }, [user, isLoading, token])

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded shadow-lg p-3 max-w-md z-50 text-xs">
      <div className="font-bold mb-2">🔐 Auth State Monitor</div>
      <div className="space-y-1">
        {logs.map((log, i) => (
          <div key={i} className="font-mono text-xs text-gray-600">
            {log}
          </div>
        ))}
      </div>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
      >
        Test Reload
      </button>
    </div>
  )
}

// To use: Add <QuickAuthTest /> to any page component
// It will show in bottom-right corner and track auth state changes