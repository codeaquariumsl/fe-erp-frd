/**
 * Test component to verify location change behavior
 * This can be used to test the location reload functionality
 */
import { useLocation } from '@/hooks/use-location'
import { useEffect, useState } from 'react'

export function LocationTestComponent() {
  const { selectedLocation, updateLocation, locations, manualRefresh } = useLocation({ 
    autoRefresh: true, 
    refreshType: 'navigate' // Use navigate to preserve auth
  })
  const [timestamp, setTimestamp] = useState(Date.now())
  const [authStatus, setAuthStatus] = useState<string>('')

  // Update timestamp on component mount to track reloads
  useEffect(() => {
    setTimestamp(Date.now())
    console.log('LocationTestComponent mounted at:', new Date().toISOString())
    
    // Check auth status
    const token = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('user_data')
    setAuthStatus(token && userData ? 'Authenticated' : 'Not authenticated')
  }, [])

  const handleLocationChange = (location: any) => {
    console.log('Changing location to:', location.name)
    console.log('Current timestamp before change:', timestamp)
    updateLocation(location)
    // After this call, the page should fully reload
  }

  return (
    <div className="p-4 border rounded">
      <h3>Location Test Component</h3>
      <p>Component mounted at: {new Date(timestamp).toLocaleTimeString()}</p>
      <p>Current location: {selectedLocation?.name || 'None'}</p>
      <p>Auth status: <span className={authStatus === 'Authenticated' ? 'text-green-600' : 'text-red-600'}>{authStatus}</span></p>
      
      <div className="mt-2">
        <button
          onClick={manualRefresh}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm mr-2"
        >
          Manual Refresh (Test)
        </button>
      </div>
      
      <div className="mt-4">
        <h4>Available Locations:</h4>
        {locations.map((location) => (
          <button
            key={location.id}
            onClick={() => handleLocationChange(location)}
            className={`mr-2 mb-2 px-3 py-1 border rounded ${
              selectedLocation?.id === location.id 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200'
            }`}
            disabled={selectedLocation?.id === location.id}
          >
            {location.name}
            {selectedLocation?.id === location.id && ' (Current)'}
          </button>
        ))}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>When you click a different location:</p>
        <ol className="list-decimal ml-4">
          <li>Location will be saved to localStorage</li>
          <li>Page will completely reload (window.location.reload())</li>
          <li>Component will remount with new timestamp</li>
          <li>New location-filtered data will be loaded</li>
        </ol>
      </div>
    </div>
  )
}

// Usage in any page:
// import { LocationTestComponent } from './path/to/LocationTestComponent'
// 
// export default function TestPage() {
//   return (
//     <div>
//       <h1>Location Reload Test</h1>
//       <LocationTestComponent />
//     </div>
//   )
// }