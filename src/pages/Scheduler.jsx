import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'
import TemplateCard from '../components/TemplateCard'
import TemplateModal from '../components/TemplateModal'
import ApplyTemplateModal from '../components/ApplyTemplateModal'
import DepartmentRuleModal from '../components/DepartmentRuleModal'
import { apiFetch } from '../api/api'
import { fetchTemplates, createTemplate, deleteTemplate, applyTemplate } from '../api/templateApi'
import { deleteShiftsByRange } from '../api/shiftsApi'
import { ORG_SLUG } from '../env'
import { useAuth } from '../context/AuthContext'
import { useShiftData } from '../context/ShiftDataContext'
import { useNavigate } from 'react-router-dom'

export default function Scheduler() {
    const { token } = useAuth()
    const { clearCache } = useShiftData()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    // Data states
    const [departments, setDepartments] = useState([])
    const [skills, setSkills] = useState([])
    const [staff, setStaff] = useState([]) // Staff list
    const [staffSkills, setStaffSkills] = useState({}) // Cached staff skills {staff_id: [skill_ids]}
    const [templates, setTemplates] = useState([])
    const [loadingTemplates, setLoadingTemplates] = useState(false)

    // Template states
    const [showTemplateModal, setShowTemplateModal] = useState(false)
    const [showApplyModal, setShowApplyModal] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState(null)
    const [showTemplates, setShowTemplates] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showAllHistory, setShowAllHistory] = useState(false) // For showing top 3 vs all history

    // Department rule modal states
    const [showRuleModal, setShowRuleModal] = useState(false)
    const [editingRuleIndex, setEditingRuleIndex] = useState(null)

    // Run Scheduler states
    const [showRunSchedulerButton, setShowRunSchedulerButton] = useState(false)
    const [lastGeneratedRange, setLastGeneratedRange] = useState(null)
    const [showSchedulerModal, setShowSchedulerModal] = useState(false)
    const [schedulerLoading, setSchedulerLoading] = useState(false)
    const [schedulerResult, setSchedulerResult] = useState(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [successData, setSuccessData] = useState(null)

    // Form state
    const [formData, setFormData] = useState({
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        departments: [],
        options: {
            skip_existing: false,
            auto_assign: false,
            balance_workload: true,
            max_hours_per_staff: 40,
            max_days_per_week: 5,
            allow_weekends: true,
            autoRunScheduler: false  // NEW: Auto-run scheduler after shift generation
        }
    })

    // Load data
    useEffect(() => {
        loadData()
        loadTemplates()
    }, [token])

    async function loadData() {
        try {
            const [deptRes, skillRes, staffRes, staffSkillsRes] = await Promise.all([
                apiFetch(`/api/v1/${ORG_SLUG}/departments`, {}, token),
                apiFetch(`/api/v1/${ORG_SLUG}/skills`, {}, token),
                apiFetch(`/api/v1/${ORG_SLUG}/staff`, {}, token),
                apiFetch(`/api/v1/${ORG_SLUG}/staff-skills`, {}, token) // NEW: Get all staff skills in one call
            ])

            const deptData = deptRes?.departments || deptRes || []
            const skillData = skillRes?.skills || skillRes || []
            const staffData = staffRes?.staff || staffRes || []

            setDepartments(deptData)
            setSkills(skillData)
            setStaff(staffData)

            // Process staff skills response and cache it
            processStaffSkillsResponse(staffSkillsRes)
        } catch (err) {
            setError(String(err))
        }
    }

    // NEW: Process the staff-skills response and cache it
    function processStaffSkillsResponse(response) {
        // Handle different response shapes
        let staffSkillsList = []

        // Case 1: Response is an array (flat array of staff-skill relationships)
        if (Array.isArray(response)) {
            staffSkillsList = response
        }
        // Case 2: Response has data property
        else if (response?.data && Array.isArray(response.data)) {
            staffSkillsList = response.data
        }
        // Case 3: Response has staff_skills property
        else if (response?.staff_skills && Array.isArray(response.staff_skills)) {
            staffSkillsList = response.staff_skills
        }
        // Case 4: Response has items property
        else if (response?.items && Array.isArray(response.items)) {
            staffSkillsList = response.items
        }

        // Build cache: { employee_id: [skill_ids] }
        // The API returns a flat array where each item is one skill assignment:
        // { id: 30, employee_id: "BD111", skill_id: 2, proficiency_level: "EXPERT" }
        const skillsMap = {}
        staffSkillsList.forEach(item => {
            // Get the employee ID (this is the key field from the API)
            const employeeId = item.employee_id || item.staff_id || item.staffId || item.id

            // Get the skill ID
            const skillId = item.skill_id || item.skillId || item.skill

            if (employeeId && skillId !== undefined && skillId !== null) {
                if (!skillsMap[employeeId]) {
                    skillsMap[employeeId] = []
                }
                skillsMap[employeeId].push(skillId)
            }
        })

        setStaffSkills(skillsMap)
    }

    async function loadTemplates() {
        if (!token) return
        setLoadingTemplates(true)
        try {
            const data = await fetchTemplates(token, true)
            setTemplates(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to load templates:', err)
        } finally {
            setLoadingTemplates(false)
        }
    }

    // Template handlers
    function handleLoadTemplate(template) {
        const mappedDepartments = (template.config?.departments || []).map(dept => ({
            department_id: dept.department_id,
            required_skill_ids: dept.required_skill_ids || [],
            shift_types: dept.shift_types || ['DAY'],
            min_staff: dept.min_staff || 1,
            max_staff: dept.max_staff || 2,
            priority: dept.priority || 3,
            estimated_hours: dept.hours || 8,
            recurrence_days: dept.recurrence_days || [0, 1, 2, 3, 4],
            notes: ''
        }))

        setFormData({
            ...formData,
            departments: mappedDepartments
        })

        setSuccess(`Loaded template: ${template.name}`)
        setTimeout(() => setSuccess(null), 3000)
    }

    async function handleSaveAsTemplate(templateData) {
        try {
            const config = {
                departments: formData.departments.map(dept => ({
                    department_id: dept.department_id,
                    shift_types: dept.shift_types,
                    min_staff: dept.min_staff,
                    max_staff: dept.max_staff,
                    priority: dept.priority,
                    hours: dept.estimated_hours,
                    required_skill_ids: dept.required_skill_ids,
                    recurrence_days: dept.recurrence_days
                }))
            }

            await createTemplate(token, {
                name: templateData.name,
                description: templateData.description,
                config: config
            })

            setSuccess('Template saved successfully!')
            setTimeout(() => setSuccess(null), 3000)
            loadTemplates()
        } catch (err) {
            throw err
        }
    }

    async function handleDeleteTemplate(templateId) {
        try {
            await deleteTemplate(token, templateId)
            setSuccess('Template deleted successfully')
            setTimeout(() => setSuccess(null), 3000)
            loadTemplates()
        } catch (err) {
            setError(String(err))
            setTimeout(() => setError(null), 5000)
        }
    }

    async function handleApplyTemplate(templateId, startDate, endDate) {
        try {
            const result = await applyTemplate(token, templateId, startDate, endDate)
            setSuccess(`Successfully generated ${result.summary?.total || 0} shifts`)
            setTimeout(() => navigate('/'), 2000)
        } catch (err) {
            throw err
        }
    }

    async function handleDeleteShifts(startDate, endDate) {
        try {
            setError(null)
            const result = await deleteShiftsByRange(token, startDate, endDate)
            const deletedCount = result?.deleted_count || result?.count || 0
            setSuccess(`✅ Successfully deleted ${deletedCount} shift${deletedCount !== 1 ? 's' : ''} from ${startDate} to ${endDate}`)
            setTimeout(() => setSuccess(null), 5000)

            // Optionally reload templates to refresh any cached data
            loadTemplates()
        } catch (err) {
            const errorMessage = err.message || String(err)
            setError(`Failed to delete shifts: ${errorMessage}`)
            setTimeout(() => setError(null), 5000)
            throw err
        }
    }

    // Department rule handlers
    function openAddRuleModal() {
        setEditingRuleIndex(null)
        setShowRuleModal(true)
    }

    function openEditRuleModal(index) {
        setEditingRuleIndex(index)
        setShowRuleModal(true)
    }

    function handleSaveRule(ruleData) {
        if (editingRuleIndex !== null) {
            // Edit existing rule
            const updated = [...formData.departments]
            updated[editingRuleIndex] = ruleData
            setFormData({ ...formData, departments: updated })
        } else {
            // Add new rule
            setFormData({
                ...formData,
                departments: [...formData.departments, ruleData]
            })
        }
        setShowRuleModal(false)
        setEditingRuleIndex(null)
    }

    function removeDepartmentRule(index) {
        setFormData({
            ...formData,
            departments: formData.departments.filter((_, i) => i !== index)
        })
    }

    // Duplicate department rule
    function duplicateDepartmentRule(index) {
        const ruleToDuplicate = formData.departments[index]
        const duplicatedRule = { ...ruleToDuplicate }
        setFormData({
            ...formData,
            departments: [...formData.departments, duplicatedRule]
        })
        setSuccess('Department rule duplicated successfully')
        setTimeout(() => setSuccess(null), 3000)
    }

    // Use last configuration
    function useLastConfiguration() {
        if (templates.length === 0) {
            setError('No previous configurations found')
            setTimeout(() => setError(null), 3000)
            return
        }
        const lastTemplate = templates[0] // Most recent template
        handleLoadTemplate(lastTemplate)
    }

    // Date range presets
    function setWeeklyRotation() {
        const today = new Date()
        const nextWeek = new Date(today)
        nextWeek.setDate(today.getDate() + 7)

        setFormData({
            ...formData,
            start_date: today.toISOString().slice(0, 10),
            end_date: nextWeek.toISOString().slice(0, 10)
        })
        setSuccess('Date range set to next 7 days (Weekly)')
        setTimeout(() => setSuccess(null), 2000)
    }

    function setMonthlyRotation() {
        const today = new Date()
        const nextMonth = new Date(today)
        nextMonth.setMonth(today.getMonth() + 1)

        setFormData({
            ...formData,
            start_date: today.toISOString().slice(0, 10),
            end_date: nextMonth.toISOString().slice(0, 10)
        })
        setSuccess('Date range set to next 30 days (Monthly)')
        setTimeout(() => setSuccess(null), 2000)
    }

    function setYearlyRotation() {
        const today = new Date()
        const nextYear = new Date(today)
        nextYear.setFullYear(today.getFullYear() + 1)

        setFormData({
            ...formData,
            start_date: today.toISOString().slice(0, 10),
            end_date: nextYear.toISOString().slice(0, 10)
        })
        setSuccess('Date range set to next 365 days (Yearly)')
        setTimeout(() => setSuccess(null), 2000)
    }

    // Run Scheduler handler
    async function runEnhancedScheduler(params) {
        setSchedulerLoading(true)
        setSchedulerResult(null)
        try {
            const { start_date, end_date } = params

            // Check if shifts exist in the date range
            const shiftsCheck = await apiFetch(`/api/v1/${ORG_SLUG}/shifts?start_date=${start_date}&end_date=${end_date}`, {}, token)

            // Extract shifts from response - API returns {ok: true, data: [...], pagination: {...}}
            const shifts = Array.isArray(shiftsCheck)
                ? shiftsCheck
                : (shiftsCheck?.data || shiftsCheck?.shifts || [])

            if (shifts.length === 0) {
                setSchedulerResult({
                    success: false,
                    error: `No shifts found for the selected period (${start_date} to ${end_date}). Please generate shifts first using the form above.`,
                    needsShifts: true
                })
                setSchedulerLoading(false)
                return
            }

            // Run the scheduler
            const payload = {
                start_date: start_date,
                end_date: end_date
            }

            const response = await apiFetch(`/api/v1/${ORG_SLUG}/schedule/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }, token)

            setSchedulerResult(response)

            // Update the template/history with scheduler success status
            if (response && response.success !== false) {
                // Find and update the most recent template for this date range
                const matchingTemplate = templates.find(t =>
                    t.config?.start_date === start_date &&
                    t.config?.end_date === end_date
                )
                if (matchingTemplate) {
                    try {
                        await apiFetch(`/api/v1/${ORG_SLUG}/templates/${matchingTemplate.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                config: {
                                    ...matchingTemplate.config,
                                    scheduler_status: 'completed',
                                    scheduler_run_at: new Date().toISOString()
                                }
                            })
                        }, token)
                        loadTemplates() // Reload to show updated status
                    } catch (err) {
                        console.error('Failed to update template status:', err)
                    }
                }
            }
        } catch (err) {
            console.error('❌ Scheduler error:', err)
            console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                response: err.response
            })
            const errorMessage = err.message || String(err)
            const errorDetails = err.response ? JSON.stringify(err.response) : ''

            setSchedulerResult({
                success: false,
                error: `${errorMessage}${errorDetails ? '\n\nDetails: ' + errorDetails : ''}`
            })
        } finally {
            setSchedulerLoading(false)
        }
    }

    // Submit form
    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const payload = {
                ...formData,
                departments: formData.departments.filter(d => d.department_id)
            }

            const response = await apiFetch(`/api/v1/${ORG_SLUG}/shift-generator`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }, token)

            setSuccess(`Successfully generated ${response.summary?.total || 0} shifts`)

            // Auto-refresh shift data to show new shifts immediately
            clearCache()

            // Auto-save to shift history with scheduler status
            const historyName = `Shifts ${formData.start_date} to ${formData.end_date}`
            try {
                await createTemplate(token, {
                    name: historyName,
                    description: `Auto-saved on ${new Date().toLocaleString()}`,
                    config: {
                        start_date: formData.start_date,
                        end_date: formData.end_date,
                        scheduler_status: 'pending',
                        created_at: new Date().toISOString(),
                        departments: formData.departments.map(dept => ({
                            department_id: dept.department_id,
                            shift_types: dept.shift_types,
                            min_staff: dept.min_staff,
                            max_staff: dept.max_staff,
                            priority: dept.priority,
                            hours: dept.estimated_hours,
                            required_skill_ids: dept.required_skill_ids,
                            recurrence_days: dept.recurrence_days
                        }))
                    }
                })
                loadTemplates() // Reload history
            } catch (err) {
                console.error('Failed to save to history:', err)
            }

            // Check if auto-run scheduler is enabled
            if (formData.options.autoRunScheduler) {
                // Automatically run scheduler
                setLastGeneratedRange({
                    start_date: formData.start_date,
                    end_date: formData.end_date
                })
                await runEnhancedScheduler({
                    start_date: formData.start_date,
                    end_date: formData.end_date
                })
            } else {
                // Show success modal with Run Scheduler option
                setSuccessData({
                    shiftsCreated: response.summary?.total || 0,
                    dateRange: {
                        start_date: formData.start_date,
                        end_date: formData.end_date
                    }
                })
                setLastGeneratedRange({
                    start_date: formData.start_date,
                    end_date: formData.end_date
                })
                setShowSuccessModal(true)
            }
        } catch (err) {
            setError(String(err))
        } finally {
            setLoading(false)
        }
    }

    // Helper to get department name
    function getDepartmentName(deptId) {
        const dept = departments.find(d => d.id === deptId)
        return dept ? dept.name : 'Unknown Department'
    }

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return (
        <div className="space-y-6 p-4">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Scheduler</h1>
                    <p className="text-gray-600 mt-1">Generate shifts for your departments</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={useLastConfiguration}
                        disabled={templates.length === 0}
                        className="px-4 py-2 text-green-600 hover:text-green-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Load the most recent configuration"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Use Last Config
                    </button>
                    <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {showTemplates ? 'Hide Shift History' : 'Show Shift History'}
                    </button>
                </div>
            </div>

            {error && <div className="text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">{error}</div>}
            {success && (
                <div className="space-y-3">
                    <div className="text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">{success}</div>
                    {showRunSchedulerButton && lastGeneratedRange && (
                        <div className="bg-indigo-50 border-2 border-indigo-200 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-indigo-900">Next Step: Assign Staff to Shifts</h4>
                                    <p className="text-sm text-indigo-700 mt-1">Run the scheduler to automatically assign staff to the shifts you just created</p>
                                </div>
                                <button
                                    onClick={() => setShowSchedulerModal(true)}
                                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Run Scheduler
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Shift History Section (Collapsible) */}
            {showTemplates && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Shift History</h2>
                        <button
                            onClick={() => setShowTemplateModal(true)}
                            disabled={formData.departments.length === 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            💾 Save Configuration
                        </button>
                    </div>

                    {templates.length > 0 && (
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Search shift history..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {loadingTemplates ? (
                        <div className="text-center py-8 text-gray-500">Loading templates...</div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-2">No shift history yet</p>
                            <p className="text-sm text-gray-400">Your shift configurations will be automatically saved here after generation</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {templates
                                    .filter(t =>
                                        searchQuery === '' ||
                                        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
                                    )
                                    .slice(0, showAllHistory || searchQuery !== '' ? undefined : 3)
                                    .map(template => (
                                        <TemplateCard
                                            key={template.id}
                                            template={template}
                                            onLoad={handleLoadTemplate}
                                            onApply={(template) => {
                                                setSelectedTemplate(template)
                                                setShowApplyModal(true)
                                            }}
                                            onDelete={handleDeleteTemplate}
                                            onDeleteShifts={handleDeleteShifts}
                                            onRunScheduler={async (template) => {
                                                if (template.config?.start_date && template.config?.end_date) {
                                                    setLastGeneratedRange({
                                                        start_date: template.config.start_date,
                                                        end_date: template.config.end_date
                                                    })
                                                    setShowSchedulerModal(true)
                                                }
                                            }}
                                        />
                                    ))}
                            </div>

                            {/* Show More/Less Button */}
                            {!searchQuery && templates.length > 3 && (
                                <div className="mt-4 text-center">
                                    <button
                                        onClick={() => setShowAllHistory(!showAllHistory)}
                                        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                                    >
                                        {showAllHistory ? (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                                Show Less
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                                Show {templates.length - 3} More
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </Card>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date Range & Generate Button */}
                <Card>
                    <div className="space-y-4">
                        {/* Date Range Presets */}
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-sm font-semibold text-blue-900">Quick Date Ranges</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={setWeeklyRotation}
                                        className="px-3 py-1.5 bg-white border-2 border-green-300 text-green-700 rounded-md hover:bg-green-50 text-xs font-medium transition-all hover:scale-105"
                                    >
                                        📅 Weekly (7 days)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={setMonthlyRotation}
                                        className="px-3 py-1.5 bg-white border-2 border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 text-xs font-medium transition-all hover:scale-105"
                                    >
                                        📆 Monthly (30 days)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={setYearlyRotation}
                                        className="px-3 py-1.5 bg-white border-2 border-purple-300 text-purple-700 rounded-md hover:bg-purple-50 text-xs font-medium transition-all hover:scale-105"
                                    >
                                        🗓️ Yearly (365 days)
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || formData.departments.length === 0}
                                className="px-8 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium h-[42px]"
                            >
                                {loading ? 'Generating...' : 'Generate Shifts'}
                            </button>
                        </div>

                        {/* Auto-run Scheduler Option */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                            <input
                                type="checkbox"
                                id="autoRunScheduler"
                                checked={formData.options.autoRunScheduler}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    options: { ...formData.options, autoRunScheduler: e.target.checked }
                                })}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="autoRunScheduler" className="text-sm text-gray-700 cursor-pointer">
                                Automatically run scheduler after generating shifts
                            </label>
                        </div>
                    </div>
                </Card>

                {/* Department Rules */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold text-gray-800">Department Rules</h2>
                        <button
                            type="button"
                            onClick={openAddRuleModal}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Department Rule
                        </button>
                    </div>

                    {formData.departments.length === 0 ? (
                        <Card>
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="text-gray-500 text-lg mb-2">No department rules added yet</p>
                                <p className="text-sm text-gray-400 mb-4">Add at least one department rule to generate shifts</p>
                                <button
                                    type="button"
                                    onClick={openAddRuleModal}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                >
                                    Add Your First Rule
                                </button>
                            </div>
                        </Card>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {formData.departments.map((dept, index) => (
                                <Card key={index}>
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-lg text-gray-800">
                                            {getDepartmentName(dept.department_id)}
                                        </h3>

                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                                                {dept.shift_types?.length || 0} shift type{dept.shift_types?.length !== 1 ? 's' : ''}
                                            </span>
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                                {dept.recurrence_days?.length || 0} day{dept.recurrence_days?.length !== 1 ? 's' : ''}/week
                                            </span>
                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                                {dept.required_skill_ids?.length || 0} skill{dept.required_skill_ids?.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        <div className="text-sm text-gray-600 space-y-1">
                                            <div className="flex justify-between">
                                                <span>Staff:</span>
                                                <span className="font-medium">{dept.min_staff} - {dept.max_staff}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Hours:</span>
                                                <span className="font-medium">{dept.estimated_hours}h</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => openEditRuleModal(index)}
                                                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => duplicateDepartmentRule(index)}
                                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-1"
                                                title="Duplicate this rule"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Duplicate
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeDepartmentRule(index)}
                                                className="px-3 py-2 text-red-600 hover:text-red-700 text-sm font-medium"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </form>

            {/* Modals */}
            <DepartmentRuleModal
                isOpen={showRuleModal}
                onClose={() => {
                    setShowRuleModal(false)
                    setEditingRuleIndex(null)
                }}
                onSave={handleSaveRule}
                rule={editingRuleIndex !== null ? formData.departments[editingRuleIndex] : null}
                departments={departments}
                skills={skills}
                staff={staff}
                staffSkills={staffSkills}
            />

            <TemplateModal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                onSave={handleSaveAsTemplate}
                currentConfig={{
                    departments: formData.departments
                }}
            />

            <ApplyTemplateModal
                isOpen={showApplyModal}
                onClose={() => {
                    setShowApplyModal(false)
                    setSelectedTemplate(null)
                }}
                onApply={handleApplyTemplate}
                template={selectedTemplate}
            />

            {/* Run Scheduler Modal */}
            {showSchedulerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black opacity-30" onClick={() => !schedulerLoading && setShowSchedulerModal(false)} />
                    <div className="relative bg-white w-11/12 md:w-1/2 lg:w-1/3 rounded-lg shadow-xl p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-semibold">Run Enhanced Scheduler</h3>
                            <button
                                onClick={() => {
                                    setShowSchedulerModal(false)
                                    setSchedulerResult(null)
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {!schedulerResult ? (
                            <form onSubmit={(e) => {
                                e.preventDefault()
                                const formData = new FormData(e.target)
                                runEnhancedScheduler({
                                    start_date: formData.get('start_date'),
                                    end_date: formData.get('end_date')
                                })
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        name="start_date"
                                        required
                                        defaultValue={lastGeneratedRange?.start_date || formData.start_date}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        required
                                        defaultValue={lastGeneratedRange?.end_date || formData.end_date}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowSchedulerModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={schedulerLoading}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {schedulerLoading ? 'Running...' : 'Run Scheduler'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                {schedulerResult.success !== false ? (
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-semibold text-green-600">Scheduler completed successfully!</span>
                                        </div>
                                        <div className="bg-green-50 border border-green-200 p-4 rounded text-sm">
                                            <p className="text-green-700">{schedulerResult.message || 'Staff assignments have been created.'}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowSchedulerModal(false)
                                                setSchedulerResult(null)
                                                navigate('/')
                                            }}
                                            className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md"
                                        >
                                            View Dashboard
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-semibold text-red-600">Scheduler failed</span>
                                        </div>
                                        <div className="bg-red-50 border border-red-200 p-4 rounded text-sm">
                                            <p className="text-red-700">{schedulerResult.error}</p>
                                        </div>
                                        <button
                                            onClick={() => setSchedulerResult(null)}
                                            className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Success Modal - Appears after shift generation */}
            {showSuccessModal && successData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black opacity-30" />
                    <div className="relative bg-white w-11/12 md:w-2/3 lg:w-1/2 rounded-lg shadow-xl p-8">
                        <div className="text-center">
                            {/* Success Icon */}
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>

                            {/* Success Message */}
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Shifts Created Successfully!</h3>
                            <p className="text-gray-600 mb-6">
                                {successData.shiftsCreated} shifts have been generated for {successData.dateRange.start_date} to {successData.dateRange.end_date}
                            </p>

                            {/* Next Step */}
                            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-6 mb-6">
                                <h4 className="font-semibold text-indigo-900 mb-2 flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Next Step: Assign Staff to Shifts
                                </h4>
                                <p className="text-sm text-indigo-700 mb-4">
                                    Run the scheduler to automatically assign staff members to the shifts you just created
                                </p>
                                <button
                                    onClick={() => {
                                        setShowSuccessModal(false)
                                        setShowSchedulerModal(true)
                                    }}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                                >
                                    Run Scheduler Now
                                </button>
                            </div>

                            {/* Alternative Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowSuccessModal(false)
                                        navigate('/')
                                    }}
                                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium"
                                >
                                    View Dashboard
                                </button>
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                                >
                                    Create More Shifts
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
