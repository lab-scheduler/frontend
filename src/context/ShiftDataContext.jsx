import React, { createContext, useContext, useState, useCallback } from 'react'
import { apiFetch } from '../api/api'
import { ORG_SLUG } from '../env'
import { useAuth } from './AuthContext'

const ShiftDataContext = createContext()

export function useShiftData() {
  const context = useContext(ShiftDataContext)
  if (!context) {
    throw new Error('useShiftData must be used within a ShiftDataProvider')
  }
  return context
}

export function ShiftDataProvider({ children }) {
  const { token } = useAuth()
  const [shiftsCache, setShiftsCache] = useState(new Map())
  const [loading, setLoading] = useState(false)

  // Fetch shifts with caching
  const fetchShifts = useCallback(async (startDate, endDate, forceRefresh = false) => {
    if (!token) return []

    const cacheKey = `${startDate}-${endDate}`

    // Check cache using functional update to avoid dependency on shiftsCache
    let cachedData = null
    if (!forceRefresh) {
      setShiftsCache(prev => {
        if (prev.has(cacheKey)) {
          cachedData = prev.get(cacheKey)
        }
        return prev // Don't modify cache, just read
      })
    }

    // Return cached data if available
    if (cachedData) return cachedData

    try {
      setLoading(true)

      // Fetch all pages if pagination is present
      let allShifts = []
      let skip = 0
      let hasMore = true
      const limit = 50 // API default limit

      while (hasMore) {
        const url = `/api/v1/${ORG_SLUG}/shifts?start_date=${startDate}&end_date=${endDate}&skip=${skip}&limit=${limit}`
        const response = await apiFetch(url, {}, token)

        // Normalize response - handle various formats
        let shifts = []
        if (Array.isArray(response)) {
          shifts = response
          hasMore = false // No pagination info, assume single page
        } else if (response && typeof response === 'object') {
          // Try common response formats
          shifts = response.shifts || response.data || response.items || []

          // Check for pagination
          if (response.pagination) {
            hasMore = response.pagination.has_more || false
            skip += limit
          } else {
            hasMore = false
          }
        } else {
          hasMore = false
        }

        // Ensure we have an array
        if (!Array.isArray(shifts)) {
          console.warn('Shifts API returned non-array response:', response)
          shifts = []
        }

        allShifts = [...allShifts, ...shifts]

        // Safety check: prevent infinite loop
        if (skip > 1000) {
          console.warn('Pagination limit reached (1000 shifts), stopping fetch')
          hasMore = false
        }
      }

      // Cache the complete result
      setShiftsCache(prev => new Map(prev).set(cacheKey, allShifts))

      return allShifts
    } catch (error) {
      console.error('Error fetching shifts:', error)
      return []
    } finally {
      setLoading(false)
    }
  }, [token]) // Only token dependency - prevents infinite loop

  // Clear cache
  const clearCache = useCallback(() => {
    setShiftsCache(new Map())
  }, [])

  // Check if data exists in cache
  const hasCachedData = useCallback((startDate, endDate) => {
    const cacheKey = `${startDate}-${endDate}`
    let hasData = false
    setShiftsCache(prev => {
      hasData = prev.has(cacheKey)
      return prev // Don't modify cache, just read
    })
    return hasData
  }, []) // No dependencies - uses functional setState

  const value = {
    fetchShifts,
    clearCache,
    hasCachedData,
    loading
  }

  return (
    <ShiftDataContext.Provider value={value}>
      {children}
    </ShiftDataContext.Provider>
  )
}