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

  // Return loading state if token is not available
  if (token === null || token === undefined) {
    return <>{children}</> // Just render children without context functionality
  }

  // Fetch shifts with caching
  const fetchShifts = useCallback(async (startDate, endDate, forceRefresh = false) => {
    if (!token) return []

    const cacheKey = `${startDate}-${endDate}`

    // Check cache first (unless force refresh)
    if (!forceRefresh && shiftsCache.has(cacheKey)) {
      return shiftsCache.get(cacheKey)
    }

    try {
      setLoading(true)
      const shifts = await apiFetch(`/api/v1/${ORG_SLUG}/shifts?start_date=${startDate}&end_date=${endDate}`, {}, token)

      // Cache the result
      setShiftsCache(prev => new Map(prev).set(cacheKey, shifts))

      return shifts
    } catch (error) {
      console.error('Error fetching shifts:', error)
      return []
    } finally {
      setLoading(false)
    }
  }, [token, shiftsCache])

  // Clear cache
  const clearCache = useCallback(() => {
    setShiftsCache(new Map())
  }, [])

  // Check if data exists in cache
  const hasCachedData = useCallback((startDate, endDate) => {
    const cacheKey = `${startDate}-${endDate}`
    return shiftsCache.has(cacheKey)
  }, [shiftsCache])

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