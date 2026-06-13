import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { locationsApi, type Location } from '@/lib/api'

/**
 * Custom hook for managing user location selection
 * This hook provides the currently selected location and methods to update it
 */
interface UseLocationOptions {
  autoRefresh?: boolean; // Automatically refresh the page when location changes
  refreshType?: 'reload' | 'navigate' | 'soft'; // 'reload' = window reload, 'navigate' = router navigate (safer), 'soft' = router refresh
}

export function useLocation(options: UseLocationOptions = {}) {
  const { autoRefresh = false, refreshType = 'navigate' } = options
  const router = useRouter()
  const pathname = usePathname()
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoading(true)
        const locationsData = await locationsApi.getAll<Location>()
        const activeLocations = locationsData.filter((loc: Location) => loc.isActive)
        setLocations(activeLocations)
        
        // Load saved location from localStorage
        const savedLocationId = localStorage.getItem('selectedLocationId')
        if (savedLocationId) {
          const savedLocation = activeLocations.find((loc: Location) => loc.id.toString() === savedLocationId)
          if (savedLocation) {
            setSelectedLocation(savedLocation)
          } else if (activeLocations.length > 0) {
            // Fallback to first active location
            setSelectedLocation(activeLocations[0])
            localStorage.setItem('selectedLocationId', activeLocations[0].id.toString())
          }
        } else if (activeLocations.length > 0) {
          // Set first active location as default
          setSelectedLocation(activeLocations[0])
          localStorage.setItem('selectedLocationId', activeLocations[0].id.toString())
        }
      } catch (error) {
        console.error('Failed to load locations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLocations()

    // Listen for location changes from other components/tabs
    const handleLocationChange = (event: StorageEvent) => {
      if (event.key === 'selectedLocationId' && event.newValue) {
        const newLocationId = event.newValue
        const newLocation = locations.find(loc => loc.id.toString() === newLocationId)
        if (newLocation) {
          setSelectedLocation(newLocation)
        }
      }
    }

    window.addEventListener('storage', handleLocationChange)
    return () => window.removeEventListener('storage', handleLocationChange)
  }, [])

  const updateLocation = (location: Location) => {
    setSelectedLocation(location)
    localStorage.setItem('selectedLocationId', location.id.toString())
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('locationChanged', { 
      detail: { location } 
    }))

    // Auto-refresh the page if enabled
    if (autoRefresh) {
      // Ensure all localStorage operations are completed and auth data is preserved
      setTimeout(() => {
        // Verify auth data is still in localStorage before reload
        const authToken = localStorage.getItem('auth_token')
        const userData = localStorage.getItem('user_data')
        
        if (!authToken || !userData) {
          console.warn('Auth data missing before reload. Location change cancelled to prevent logout.')
          return
        }
        
        // Force localStorage sync by accessing it
        localStorage.getItem('selectedLocationId')
        
        try {
          if (refreshType === 'reload') {
            // Full page reload - ensures all data is fresh and location context is applied
            window.location.reload()
          } else if (refreshType === 'navigate') {
            // Navigate to current page - safer for auth preservation
            // First refresh the router cache
            router.refresh()
            
            // Then navigate to the same page to trigger a fresh load
            // Use replace to avoid adding to history
            router.replace(pathname)
            
            // Additional refresh to ensure server components update
            setTimeout(() => {
              router.refresh()
            }, 100)
          } else {
            // Soft refresh - only refreshes server components and data
            router.refresh()
          }
        } catch (error) {
          console.error('Error during location change refresh:', error)
          // Fallback to soft refresh if navigation fails
          router.refresh()
        }
      }, 300) // Increased timeout to ensure localStorage operations complete properly
    }
  }

  // Manual refresh function for backup control
  const manualRefresh = () => {
    try {
      router.refresh()
      setTimeout(() => {
        router.replace(pathname)
      }, 100)
    } catch (error) {
      console.error('Manual refresh failed:', error)
      window.location.reload()
    }
  }

  return {
    locations,
    selectedLocation,
    loading,
    updateLocation,
    manualRefresh,
    isLocationSelected: !!selectedLocation
  }
}