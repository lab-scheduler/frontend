import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAnalyticsCache } from '../context/AnalyticsCacheContext'
import { apiFetch } from '../api/api'
import { ORG_SLUG } from '../env'
import Card from '../components/Card'

export default function DashboardV2() {
    const { token } = useAuth()
    const { cache, getCachedData, setCachedData, setDateRange, clearCache, isCacheValid } = useAnalyticsCache()

    const [dateRange, setDateRangeState] = useState({
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    })

    // Analytics data states - initialize from cache if available
    const [safetyData, setSafetyData] = useState(getCachedData('safety'))
    const [alertsData, setAlertsData] = useState(getCachedData('alerts'))
    const [burnoutData, setBurnoutData] = useState(getCachedData('burnout'))
    const [shiftRisksData, setShiftRisksData] = useState(getCachedData('shiftRisks'))
    const [dependencyData, setDependencyData] = useState(getCachedData('dependency'))
    const [fairnessData, setFairnessData] = useState(getCachedData('fairness'))
    const [recommendationsData, setRecommendationsData] = useState(getCachedData('recommendations'))

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Fetch all analytics data
    useEffect(() => {
        async function loadAnalytics() {
            if (!token) return

            // Check if we have valid cached data for this date range
            if (isCacheValid(dateRange)) {
                console.log('📦 Using cached analytics data')
                setSafetyData(getCachedData('safety'))
                setAlertsData(getCachedData('alerts'))
                setBurnoutData(getCachedData('burnout'))
                setShiftRisksData(getCachedData('shiftRisks'))
                setDependencyData(getCachedData('dependency'))
                setFairnessData(getCachedData('fairness'))
                setRecommendationsData(getCachedData('recommendations'))
                return
            }

            console.log('🔄 Fetching fresh analytics data')
            setLoading(true)
            setError(null)

            try {
                const [safety, alerts, burnout, shiftRisks, dependency, fairness, recommendations] = await Promise.allSettled([
                    apiFetch(`/api/v1/${ORG_SLUG}/analytics/safety?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`, {}, token).catch(e => ({ error: e.message })),
                    apiFetch(`/api/v1/${ORG_SLUG}/analytics/alerts`, {}, token).catch(e => ({ error: e.message })),
                    apiFetch(`/api/v1/${ORG_SLUG}/analytics/burnout-risk?period_days=30`, {}, token).catch(e => ({ error: e.message })),
                    apiFetch(`/api/v1/${ORG_SLUG}/analytics/shift-risks?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`, {}, token).catch(e => ({ error: e.message })),
                    apiFetch(`/api/v1/${ORG_SLUG}/analytics/dependencies?period_days=30`, {}, token).catch(e => ({ error: e.message })),
                    apiFetch(`/api/v1/${ORG_SLUG}/analytics/fairness?period=30d`, {}, token).catch(e => ({ error: e.message })),
                    apiFetch(`/api/v1/${ORG_SLUG}/analytics/recommendations`, {}, token).catch(e => ({ error: e.message }))
                ])

                // Check if all endpoints failed
                const allFailed = [safety, alerts, burnout, shiftRisks, dependency, fairness, recommendations]
                    .every(result => result.status === 'rejected' || result.value?.error)

                if (allFailed) {
                    setError('Analytics endpoints are not yet implemented on the backend. Please implement the 7 analytics endpoints first.')
                } else {
                    // Set data and cache it
                    if (safety.status === 'fulfilled' && !safety.value?.error) {
                        setSafetyData(safety.value)
                        setCachedData('safety', safety.value)
                    }
                    if (alerts.status === 'fulfilled' && !alerts.value?.error) {
                        setAlertsData(alerts.value)
                        setCachedData('alerts', alerts.value)
                    }
                    if (burnout.status === 'fulfilled' && !burnout.value?.error) {
                        setBurnoutData(burnout.value)
                        setCachedData('burnout', burnout.value)
                    }
                    if (shiftRisks.status === 'fulfilled' && !shiftRisks.value?.error) {
                        setShiftRisksData(shiftRisks.value)
                        setCachedData('shiftRisks', shiftRisks.value)
                    }
                    if (dependency.status === 'fulfilled' && !dependency.value?.error) {
                        setDependencyData(dependency.value)
                        setCachedData('dependency', dependency.value)
                    }
                    if (fairness.status === 'fulfilled' && !fairness.value?.error) {
                        setFairnessData(fairness.value)
                        setCachedData('fairness', fairness.value)
                    }
                    if (recommendations.status === 'fulfilled' && !recommendations.value?.error) {
                        setRecommendationsData(recommendations.value)
                        setCachedData('recommendations', recommendations.value)
                    }

                    // Cache the date range
                    setDateRange(dateRange)
                }

            } catch (err) {
                console.error('Analytics error:', err)
                setError('Failed to load analytics data. Please check if the backend analytics endpoints are implemented.')
            } finally {
                setLoading(false)
            }
        }

        loadAnalytics()
    }, [token, dateRange, isCacheValid, getCachedData, setCachedData, setDateRange])

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-32 bg-gray-200 rounded"></div>
                        <div className="h-32 bg-gray-200 rounded"></div>
                        <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-gray-600 mt-1">Comprehensive insights and recommendations</p>
                </div>
                <button
                    onClick={() => {
                        clearCache()
                        window.location.reload()
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Data
                </button>
            </div>

            {/* Date Range Selector */}
            <Card className="mb-6">
                <div className="flex items-center gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.start_date}
                            onChange={(e) => setDateRangeState({ ...dateRange, start_date: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={dateRange.end_date}
                            onChange={(e) => setDateRangeState({ ...dateRange, end_date: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </Card>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Primary Metrics */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Safety Analysis */}
                    <SafetyPanel data={safetyData} />

                    {/* Shift Risk Analysis */}
                    <ShiftRiskPanel data={shiftRisksData} />

                    {/* Burnout Risk */}
                    <BurnoutPanel data={burnoutData} />

                    {/* Fairness Metrics */}
                    <FairnessPanel data={fairnessData} />
                </div>

                {/* Right Column - Alerts & Recommendations */}
                <div className="space-y-6">
                    {/* Alerts */}
                    <AlertsPanel data={alertsData} />

                    {/* Dependencies */}
                    <DependencyPanel data={dependencyData} />

                    {/* Recommendations */}
                    <RecommendationsPanel data={recommendationsData} />
                </div>
            </div>
        </div>
    )
}

// Safety Analysis Panel
function SafetyPanel({ data }) {
    if (!data) return null

    const getStatusColor = (status) => {
        switch (status) {
            case 'SAFE': return 'bg-green-100 text-green-800 border-green-200'
            case 'CAUTION': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600'
        if (score >= 60) return 'text-yellow-600'
        return 'text-red-600'
    }

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Safety Analysis</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getStatusColor(data.status)}`}>
                    {data.status}
                </span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(data.safety_score)}`}>
                        {data.safety_score}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Safety Score</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{data.coverage_rate}%</div>
                    <div className="text-xs text-gray-500 mt-1">Coverage</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{data.supervisor_coverage_rate}%</div>
                    <div className="text-xs text-gray-500 mt-1">Supervisors</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{data.skill_coverage_rate}%</div>
                    <div className="text-xs text-gray-500 mt-1">Skills</div>
                </div>
            </div>

            {/* Critical Gaps */}
            {data.critical_gaps && data.critical_gaps.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Critical Gaps ({data.critical_gaps.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {data.critical_gaps.map((gap, idx) => (
                            <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">
                                            {gap.department_name} - {gap.shift_type}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            {gap.date} • Gap: {gap.gap} staff ({gap.assigned_staff}/{gap.required_staff})
                                        </div>
                                        {gap.missing_skills.length > 0 && (
                                            <div className="text-xs text-red-700 mt-1">
                                                Missing skills: {gap.missing_skills.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${gap.severity === 'HIGH' ? 'bg-red-200 text-red-800' :
                                        gap.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                                            'bg-blue-200 text-blue-800'
                                        }`}>
                                        {gap.severity}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    )
}

// Alerts Panel
function AlertsPanel({ data }) {
    if (!data) return null

    const [filter, setFilter] = useState('ALL')

    const filteredAlerts = filter === 'ALL'
        ? data.alerts
        : data.alerts.filter(a => a.severity === filter)

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300'
            case 'WARNING': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
            case 'INFO': return 'bg-blue-100 text-blue-800 border-blue-300'
            default: return 'bg-gray-100 text-gray-800 border-gray-300'
        }
    }

    return (
        <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Alerts</h2>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-red-50 rounded">
                    <div className="text-2xl font-bold text-red-600">{data.summary.critical}</div>
                    <div className="text-xs text-gray-600">Critical</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                    <div className="text-2xl font-bold text-yellow-600">{data.summary.warning}</div>
                    <div className="text-xs text-gray-600">Warning</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">{data.summary.info}</div>
                    <div className="text-xs text-gray-600">Info</div>
                </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-4">
                {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map(severity => (
                    <button
                        key={severity}
                        onClick={() => setFilter(severity)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${filter === severity
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {severity}
                    </button>
                ))}
            </div>

            {/* Alert List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredAlerts.map(alert => (
                    <div key={alert.id} className={`p-3 border rounded-lg ${getSeverityColor(alert.severity)}`}>
                        <div className="flex items-start justify-between mb-2">
                            <div className="font-semibold text-sm">{alert.title}</div>
                            <span className="text-xs px-2 py-0.5 bg-white rounded">{alert.category}</span>
                        </div>
                        <div className="text-sm mb-2">{alert.description}</div>
                        {alert.recommended_action && (
                            <div className="text-xs bg-white bg-opacity-50 p-2 rounded">
                                💡 {alert.recommended_action}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    )
}

// Burnout Risk Panel
function BurnoutPanel({ data }) {
    if (!data) return null

    const [riskFilter, setRiskFilter] = useState('ALL')

    const filteredStaff = riskFilter === 'ALL'
        ? data.staff_risks
        : data.staff_risks.filter(s => s.risk_level === riskFilter)

    return (
        <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Burnout Risk Analysis</h2>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{data.summary.high_risk}</div>
                    <div className="text-xs text-gray-500 mt-1">High Risk</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">{data.summary.medium_risk}</div>
                    <div className="text-xs text-gray-500 mt-1">Medium Risk</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{data.summary.low_risk}</div>
                    <div className="text-xs text-gray-500 mt-1">Low Risk</div>
                </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-4">
                {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
                    <button
                        key={level}
                        onClick={() => setRiskFilter(level)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${riskFilter === level
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {level}
                    </button>
                ))}
            </div>

            {/* Staff List */}
            {filteredStaff.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-900 mb-3">
                        {riskFilter === 'ALL' ? 'All Staff' : `${riskFilter} Risk Staff`} ({filteredStaff.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredStaff.map(staff => (
                            <div key={staff.employee_id} className={`p-3 border rounded-lg ${staff.risk_level === 'HIGH' ? 'bg-red-50 border-red-200' :
                                staff.risk_level === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
                                    'bg-green-50 border-green-200'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-medium text-gray-900">{staff.full_name}</div>
                                    <div className={`text-lg font-bold ${staff.risk_level === 'HIGH' ? 'text-red-600' :
                                        staff.risk_level === 'MEDIUM' ? 'text-yellow-600' :
                                            'text-green-600'
                                        }`}>
                                        {staff.risk_score}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                                    <div>Overtime: {staff.factors.overtime_hours}h</div>
                                    <div>Consecutive: {staff.factors.consecutive_days}d</div>
                                    <div>Night shifts: {staff.factors.night_shift_count}</div>
                                    <div>Weekends: {staff.factors.weekend_count}</div>
                                </div>
                                {staff.recommendations.length > 0 && (
                                    <div className="text-xs bg-white p-2 rounded">
                                        💡 {staff.recommendations[0]}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    )
}

// Shift Risk Panel
function ShiftRiskPanel({ data }) {
    if (!data) return null

    const highRiskShifts = data.shift_risks.filter(s => s.risk_score >= 70)

    return (
        <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Shift Risk Analysis</h2>

            {/* Department Risks */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {Object.values(data.department_risks).map(dept => (
                    <div key={dept.department_id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="font-medium text-gray-900 mb-2">{dept.department_name}</div>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-gray-900">{dept.risk_score}</div>
                            <div className="text-sm text-gray-600">{dept.coverage_rate}% coverage</div>
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                            {dept.high_risk_shifts} high-risk shifts
                        </div>
                    </div>
                ))}
            </div>

            {/* High Risk Shifts */}
            {highRiskShifts.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-900 mb-3">High Risk Shifts</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {highRiskShifts.map(shift => (
                            <div key={shift.shift_id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {shift.department_name} - {shift.shift_type}
                                        </div>
                                        <div className="text-sm text-gray-600">{shift.date}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {shift.assigned_count}/{shift.required_count} staff
                                        </div>
                                    </div>
                                    <div className="text-lg font-bold text-yellow-600">{shift.risk_score}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    )
}

// Dependency Panel
function DependencyPanel({ data }) {
    if (!data) return null

    return (
        <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Dependencies</h2>

            {/* Bus Factor */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                <div className="text-sm text-gray-600 mb-1">Bus Factor</div>
                <div className="text-4xl font-bold text-purple-600">{data.bus_factor}</div>
                <div className="text-xs text-gray-500 mt-1">
                    {data.bus_factor < 3 ? '⚠️ Critical risk!' : 'Acceptable resilience'}
                </div>
            </div>

            {/* Key Staff */}
            <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Key Staff</h3>
                {data.key_staff.slice(0, 5).map(staff => (
                    <div key={staff.employee_id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-gray-900">{staff.full_name}</div>
                            <div className="text-lg font-bold text-indigo-600">{staff.dependency_score}</div>
                        </div>
                        <div className="text-xs text-gray-600 mb-1">
                            {staff.shift_percentage}% of shifts
                        </div>
                        {staff.unique_skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {staff.unique_skills.map(skill => (
                                    <span key={skill} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    )
}

// Fairness Panel
function FairnessPanel({ data }) {
    if (!data) return null

    const getDeviationColor = (deviation) => {
        if (Math.abs(deviation) < 10) return 'text-green-600'
        if (Math.abs(deviation) < 25) return 'text-yellow-600'
        return 'text-red-600'
    }

    return (
        <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Fairness Metrics</h2>

            {/* Overall Score */}
            <div className="mb-6 text-center">
                <div className="text-5xl font-bold text-indigo-600">{data.fairness_score}</div>
                <div className="text-sm text-gray-500 mt-1">Fairness Score</div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${data.fairness_score}%` }}
                    ></div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-500">Gini Coefficient</div>
                    <div className="text-lg font-bold">{data.metrics.gini_coefficient.toFixed(3)}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-500">Weekend Distribution</div>
                    <div className="text-lg font-bold">{data.metrics.weekend_distribution_score}</div>
                </div>
            </div>

            {/* Staff with High Deviation */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-3">Workload Distribution</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.staff_distribution
                        .filter(s => Math.abs(s.fairness_deviation) > 15)
                        .sort((a, b) => Math.abs(b.fairness_deviation) - Math.abs(a.fairness_deviation))
                        .map(staff => (
                            <div key={staff.employee_id} className="p-2 bg-gray-50 rounded border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium text-gray-900">{staff.full_name}</div>
                                    <div className={`text-sm font-bold ${getDeviationColor(staff.fairness_deviation)}`}>
                                        {staff.fairness_deviation > 0 ? '+' : ''}{staff.fairness_deviation.toFixed(1)}%
                                    </div>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                    {staff.total_hours}h • {staff.total_shifts} shifts
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </Card>
    )
}

// Recommendations Panel
function RecommendationsPanel({ data }) {
    if (!data) return null

    const [priorityFilter, setPriorityFilter] = useState('HIGH')

    const filteredRecs = data.recommendations.filter(r =>
        priorityFilter === 'ALL' || r.priority === priorityFilter
    )

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'HIGH': return 'bg-red-100 text-red-800 border-red-300'
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
            case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-300'
            default: return 'bg-gray-100 text-gray-800 border-gray-300'
        }
    }

    return (
        <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h2>

            {/* Priority Filter */}
            <div className="flex gap-2 mb-4">
                {['HIGH', 'MEDIUM', 'LOW'].map(priority => (
                    <button
                        key={priority}
                        onClick={() => setPriorityFilter(priority)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${priorityFilter === priority
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {priority}
                    </button>
                ))}
            </div>

            {/* Recommendations List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredRecs.map(rec => (
                    <div key={rec.id} className={`p-3 border rounded-lg ${getPriorityColor(rec.priority)}`}>
                        <div className="flex items-start justify-between mb-2">
                            <div className="font-semibold text-sm">{rec.title}</div>
                            <span className="text-xs px-2 py-0.5 bg-white rounded">{rec.category}</span>
                        </div>
                        <div className="text-sm mb-2">{rec.description}</div>
                        <div className="text-xs bg-white bg-opacity-50 p-2 rounded mb-2">
                            📊 Impact: {rec.impact}
                        </div>
                        <div className="text-xs text-gray-600">
                            Effort: {rec.effort}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}
