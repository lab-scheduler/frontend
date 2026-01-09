import React, { createContext, useContext, useState, useCallback } from 'react'

const AnalyticsCacheContext = createContext()

export function AnalyticsCacheProvider({ children }) {
    const [cache, setCache] = useState({
        safety: null,
        alerts: null,
        burnout: null,
        shiftRisks: null,
        dependency: null,
        fairness: null,
        recommendations: null,
        lastFetch: null,
        dateRange: null
    })

    const getCachedData = useCallback((key) => {
        return cache[key]
    }, [cache])

    const setCachedData = useCallback((key, data) => {
        setCache(prev => ({
            ...prev,
            [key]: data,
            lastFetch: new Date().toISOString()
        }))
    }, [])

    const setDateRange = useCallback((dateRange) => {
        setCache(prev => ({
            ...prev,
            dateRange
        }))
    }, [])

    const clearCache = useCallback(() => {
        setCache({
            safety: null,
            alerts: null,
            burnout: null,
            shiftRisks: null,
            dependency: null,
            fairness: null,
            recommendations: null,
            lastFetch: null,
            dateRange: null
        })
    }, [])

    const isCacheValid = useCallback((dateRange) => {
        // Cache is valid if:
        // 1. We have cached data
        // 2. The date range matches
        if (!cache.lastFetch) return false
        if (!cache.dateRange) return false

        return (
            cache.dateRange.start_date === dateRange.start_date &&
            cache.dateRange.end_date === dateRange.end_date
        )
    }, [cache])

    return (
        <AnalyticsCacheContext.Provider value={{
            cache,
            getCachedData,
            setCachedData,
            setDateRange,
            clearCache,
            isCacheValid
        }}>
            {children}
        </AnalyticsCacheContext.Provider>
    )
}

export function useAnalyticsCache() {
    const context = useContext(AnalyticsCacheContext)
    if (!context) {
        throw new Error('useAnalyticsCache must be used within AnalyticsCacheProvider')
    }
    return context
}
