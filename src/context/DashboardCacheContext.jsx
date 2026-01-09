import React, { createContext, useContext, useState, useCallback } from 'react'

const DashboardCacheContext = createContext()

export function DashboardCacheProvider({ children }) {
    const [cache, setCache] = useState({
        staff: null,
        dashboardShifts: null,
        calendarShifts: null,
        analysis: null,
        calendarAnalysis: null,
        skills: null,
        leaves: null,
        departments: null,
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
            staff: null,
            dashboardShifts: null,
            calendarShifts: null,
            analysis: null,
            calendarAnalysis: null,
            skills: null,
            leaves: null,
            departments: null,
            lastFetch: null,
            dateRange: null
        })
    }, [])

    const isCacheValid = useCallback((todayStart, todayEnd, monthStart, monthEnd) => {
        if (!cache.lastFetch) return false
        if (!cache.dateRange) return false

        return (
            cache.dateRange.todayStart === todayStart &&
            cache.dateRange.todayEnd === todayEnd &&
            cache.dateRange.monthStart === monthStart &&
            cache.dateRange.monthEnd === monthEnd
        )
    }, [cache])

    return (
        <DashboardCacheContext.Provider value={{
            cache,
            getCachedData,
            setCachedData,
            setDateRange,
            clearCache,
            isCacheValid
        }}>
            {children}
        </DashboardCacheContext.Provider>
    )
}

export function useDashboardCache() {
    const context = useContext(DashboardCacheContext)
    if (!context) {
        throw new Error('useDashboardCache must be used within DashboardCacheProvider')
    }
    return context
}
