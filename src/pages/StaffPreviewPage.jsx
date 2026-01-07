import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOrganization } from '../context/OrganizationContext'
import { apiFetch } from '../api/api'
import Card from '../components/Card'

export default function StaffPreviewPage() {
    const { user, token } = useAuth()
    const { currentOrg } = useOrganization()
    const [staffData, setStaffData] = useState(null)
    const [shifts, setShifts] = useState([])
    const [leaves, setLeaves] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDay, setSelectedDay] = useState(null)
    const [dayModalOpen, setDayModalOpen] = useState(false)

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        max_hours_per_week: 0
    })

    const [leaveForm, setLeaveForm] = useState({
        start_date: '',
        end_date: '',
        reason: ''
    })
    const [showLeaveForm, setShowLeaveForm] = useState(false)

    // Helper to convert to number safely
    const toNumber = (v) => {
        if (v == null) return null
        if (typeof v === 'number' && !isNaN(v)) return v
        if (typeof v === 'string') {
            const n = Number(v.replace(/[^0-9.\-]/g, ''))
            return isNaN(n) ? null : n
        }
        if (typeof v === 'object') {
            for (const key of ['value', 'coverage', 'coverage_rate', 'total']) {
                if (v[key] != null && !isNaN(Number(v[key]))) return Number(v[key])
            }
            return null
        }
        return null
    }

    // Fetch staff data
    useEffect(() => {
        async function fetchStaffData() {
            if (!token || !currentOrg) return

            setLoading(true)
            setError(null)
            try {
                const orgSlug = currentOrg.slug

                const [staffRes, shiftsRes, leavesRes] = await Promise.allSettled([
                    apiFetch(`/api/v1/${orgSlug}/staff/me`, {}, token),
                    apiFetch(`/api/v1/${orgSlug}/shifts?employee_id=${user.employee_id}`, {}, token),
                    apiFetch(`/api/v1/${orgSlug}/leaves`, {}, token)
                ])

                if (staffRes.status === 'fulfilled') {
                    const data = staffRes.value
                    setStaffData(data)
                    setFormData({
                        full_name: data.full_name || '',
                        email: data.email || '',
                        phone: data.phone || '',
                        max_hours_per_week: data.max_hours_per_week || 0
                    })
                }

                if (shiftsRes.status === 'fulfilled') {
                    const shiftsData = Array.isArray(shiftsRes.value) ? shiftsRes.value : (shiftsRes.value?.shifts || [])
                    setShifts(shiftsData)
                }

                if (leavesRes.status === 'fulfilled') {
                    const leavesData = Array.isArray(leavesRes.value) ? leavesRes.value : (leavesRes.value?.items || [])
                    const myLeaves = leavesData.filter(l => l.employee_id === user.employee_id)
                    myLeaves.sort((a, b) => {
                        const dateA = a.submitted_at ? new Date(a.submitted_at) : new Date(0)
                        const dateB = b.submitted_at ? new Date(b.submitted_at) : new Date(0)
                        return dateB - dateA
                    })
                    setLeaves(myLeaves)
                }
            } catch (err) {
                setError(String(err))
            } finally {
                setLoading(false)
            }
        }

        fetchStaffData()
    }, [token, currentOrg, user])

    // Handle profile update
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!currentOrg) return

        try {
            const orgSlug = currentOrg.slug
            const payload = {
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone,
                role: 'STAFF',
                max_hours_per_week: parseInt(formData.max_hours_per_week) || 0,
                is_supervisor: staffData?.is_supervisor || false
            }

            const updated = await apiFetch(`/api/v1/${orgSlug}/staff/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, token)

            setStaffData(updated)
            setIsEditing(false)
            alert('Profile updated successfully!')
        } catch (err) {
            alert(`Failed to update profile: ${err.message}`)
        }
    }

    // Handle leave submission
    const handleLeaveSubmit = async (e) => {
        e.preventDefault()
        if (!currentOrg) return

        try {
            const orgSlug = currentOrg.slug
            const payload = {
                employee_id: user.employee_id,
                start_date: leaveForm.start_date,
                end_date: leaveForm.end_date,
                reason: leaveForm.reason,
                status: 'PENDING'
            }

            await apiFetch(`/api/v1/${orgSlug}/leaves`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, token)

            alert('Leave request submitted successfully!')
            setShowLeaveForm(false)
            setLeaveForm({ start_date: '', end_date: '', reason: '' })

            // Refresh leaves
            const leavesRes = await apiFetch(`/api/v1/${orgSlug}/leaves`, {}, token)
            const leavesData = Array.isArray(leavesRes) ? leavesRes : (leavesRes?.items || [])
            const myLeaves = leavesData.filter(l => l.employee_id === user.employee_id)
            myLeaves.sort((a, b) => {
                const dateA = a.submitted_at ? new Date(a.submitted_at) : new Date(0)
                const dateB = b.submitted_at ? new Date(b.submitted_at) : new Date(0)
                return dateB - dateA
            })
            setLeaves(myLeaves)
        } catch (err) {
            alert(`Failed to submit leave: ${err.message}`)
        }
    }

    // Calendar functions
    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()

        return { daysInMonth, startingDayOfWeek, year, month }
    }

    const getShiftsForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0]
        const dayShifts = shifts.filter(shift => {
            const shiftDate = shift.shift_date || shift.date
            return shiftDate && shiftDate.startsWith(dateStr)
        })

        // Calculate average coverage for color coding
        let coveragePercentage = 100
        if (dayShifts.length > 0) {
            const coverages = dayShifts
                .map(s => toNumber(s.coverage || s.coverage_rate || s.metrics?.coverage))
                .filter(v => v != null)
            if (coverages.length > 0) {
                coveragePercentage = coverages.reduce((a, b) => a + b, 0) / coverages.length
            }
        }

        return { shifts: dayShifts, coverage: coveragePercentage }
    }

    const getColorForCoverage = (count, coverage) => {
        if (count === 0) return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700', badgeBg: 'bg-gray-200', badgeText: 'text-gray-700' }
        if (coverage <= 20) return { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', badgeBg: 'bg-red-200', badgeText: 'text-red-800' }
        if (coverage <= 70) return { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700', badgeBg: 'bg-yellow-200', badgeText: 'text-yellow-800' }
        return { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', badgeBg: 'bg-green-200', badgeText: 'text-green-800' }
    }

    const handleDayClick = (date, dayShifts, coverage) => {
        setSelectedDay({ date, shifts: dayShifts, coverage })
        setDayModalOpen(true)
    }

    const navigateMonth = (direction) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev)
            newDate.setMonth(newDate.getMonth() + direction)
            return newDate
        })
    }

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)
    const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading your information...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl">
                    {error}
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Profile Header - Horizontal */}
            <Card>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                        {/* Profile Icon */}
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>

                        {/* Profile Info */}
                        {isEditing ? (
                            <form onSubmit={handleSubmit} className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="Full Name"
                                />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="Email"
                                />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="Phone"
                                />
                                <div className="flex space-x-2">
                                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                                        Save
                                    </button>
                                    <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500">Name</p>
                                    <p className="font-semibold text-gray-900">{staffData?.full_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Employee ID</p>
                                    <p className="font-semibold text-gray-900">{staffData?.employee_id || user.employee_id}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Role</p>
                                    <span className="inline-flex px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                                        {staffData?.role || user.role}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="font-semibold text-gray-900">{staffData?.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Phone</p>
                                    <p className="font-semibold text-gray-900">{staffData?.phone || 'N/A'}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Edit Button */}
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                        </button>
                    )}
                </div>
            </Card>

            {/* Calendar View */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">My Schedule</h2>
                    <div className="flex items-center space-x-4">
                        <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="font-semibold text-lg">{monthName}</span>
                        <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {/* Day headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center font-semibold text-gray-600 py-2 text-sm">
                            {day}
                        </div>
                    ))}

                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square bg-gray-50 rounded-lg" />
                    ))}

                    {/* Days of the month */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const date = new Date(year, month, day)
                        const { shifts: dayShifts, coverage } = getShiftsForDate(date)
                        const count = dayShifts.length
                        const isToday = new Date().toDateString() === date.toDateString()
                        const colors = getColorForCoverage(count, coverage)

                        return (
                            <div
                                key={day}
                                onClick={() => count > 0 && handleDayClick(date, dayShifts, coverage)}
                                className={`aspect-square border-2 rounded-lg p-2 transition-all ${isToday ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : `${colors.border} ${colors.bg}`
                                    } ${count > 0 ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''}`}
                            >
                                <div className={`text-sm font-semibold ${isToday ? 'text-indigo-600' : colors.text}`}>
                                    {day}
                                </div>
                                {count > 0 && (
                                    <div className="mt-1 text-center">
                                        <div className={`text-xs font-bold ${colors.text}`}>
                                            {count} shift{count !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Color Legend */}
                <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
                    <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
                        <span className="text-gray-600">0-20% Coverage</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
                        <span className="text-gray-600">21-70% Coverage</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                        <span className="text-gray-600">71-100% Coverage</span>
                    </div>
                </div>
            </Card>

            {/* Shift Detail Modal */}
            {dayModalOpen && selectedDay && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDayModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-800">
                                Shifts for {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </h2>
                            <button onClick={() => setDayModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="text-center py-12">
                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-gray-500 text-lg">Shift details will be displayed here</p>
                            <p className="text-gray-400 text-sm mt-2">Coming soon...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Requests */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">My Leave Requests</h2>
                    <button
                        onClick={() => setShowLeaveForm(!showLeaveForm)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        {showLeaveForm ? 'Cancel' : 'Request Leave'}
                    </button>
                </div>

                {showLeaveForm && (
                    <form onSubmit={handleLeaveSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={leaveForm.start_date}
                                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={leaveForm.end_date}
                                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                            <textarea
                                value={leaveForm.reason}
                                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                                required
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Submit Leave Request
                        </button>
                    </form>
                )}

                {leaves.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No leave requests</p>
                ) : (
                    <div className="space-y-3">
                        {leaves.map((leave, idx) => (
                            <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <p className="font-semibold text-gray-800">
                                                {leave.start_date} to {leave.end_date}
                                            </p>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${leave.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                leave.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {leave.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{leave.reason}</p>
                                        {leave.submitted_at && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                Submitted: {new Date(leave.submitted_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}
