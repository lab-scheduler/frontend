// RotationDashboard.jsx (MODIFIED - preserves original structure, added fixes)
// Based on original file you uploaded — changes: department filter, numeric safeties, improved staff detail mapping & layout

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { apiFetch } from '../api/api'
import { OPENAPI_BASE, ORG_SLUG } from '../env'
import { useAuth } from '../context/AuthContext'
import { useShiftData } from '../context/ShiftDataContext'
import { useDashboardCache } from '../context/DashboardCacheContext'
import { useNavigate } from 'react-router-dom'


// Helper component for info icon with tooltip
function InfoTooltip({ text }) {
  const [showTooltip, setShowTooltip] = useState(false)
  return (
    <div className="relative inline-block ml-1">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>
      {showTooltip && (
        <div className="absolute z-10 w-64 p-2 mt-1 text-sm text-white bg-gray-800 rounded-lg shadow-lg">
          <div className="text-xs">{text}</div>
          <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 -top-1 left-3"></div>
        </div>
      )}
    </div>
  )
}

/* -------------------------
   Helpers (robust formatting to avoid NaN / [object Object])
   ------------------------- */
function isoDate(d) { return new Date(d).toISOString().slice(0, 10) }
function startOfMonth(d) { const c = new Date(d); c.setDate(1); return c }
function endOfMonth(d) { const c = new Date(d); c.setMonth(c.getMonth() + 1); c.setDate(0); return c }

// Try to coerce to number from many shapes: number, string, object {value:...}, etc.
function toNumber(v) {
  if (v == null) return null
  if (typeof v === 'number' && !isNaN(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n
  }
  if (typeof v === 'object') {
    // common shapes: { value: 12 } or { coverage: 12 }
    for (const key of ['value', 'v', 'amount', 'coverage', 'total', 'count', 'hours']) {
      if (v[key] != null && !isNaN(Number(v[key]))) return Number(v[key])
    }
    return null
  }
  return null
}

function fmtNumber(n) { const v = toNumber(n); return v == null ? '-' : new Intl.NumberFormat().format(v) }
function fmtCurrency(n) { const v = toNumber(n); if (v == null) return '-'; return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(v) }
function fmtHours(n) { const v = toNumber(n); return v == null ? '-' : `${fmtNumber(v)} hrs` }
function fmtPct(n, digits = 1) { const v = toNumber(n); return v == null ? '-' : `${Number(v).toFixed(digits)}%` }
function safe(v, def = null) { return typeof v === 'undefined' || v === null ? def : v }

function fairFmt(v) {
  const n = toNumber(v)
  if (n == null) return '-'
  if (Math.abs(n) >= 100) return fmtNumber(n)
  return Number(n).toFixed(1)
}

/* -------------------------
   UI subcomponents (same as before)
   ------------------------- */
function SeverityBadge({ severity }) {
  const map = { critical: 'bg-red-100 text-red-700', warning: 'bg-yellow-100 text-yellow-700', info: 'bg-blue-100 text-blue-700' }
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[severity] || 'bg-gray-100 text-gray-700'}`}>{(severity || '').toUpperCase()}</span>
}

function KPI({ title, value, sub }) {
  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

/* -------------------------
   Main component (kept original props/state but improved)
   ------------------------- */
export default function RotationDashboard() {
  const { token } = useAuth()
  const { fetchShifts } = useShiftData()
  const { cache, getCachedData, setCachedData, setDateRange, clearCache, isCacheValid } = useDashboardCache()
  const navigate = useNavigate()

  // State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [staff, setStaff] = useState(getCachedData('staff') || [])
  const [shifts, setShifts] = useState([])
  const [skills, setSkills] = useState([])
  const [leaves, setLeaves] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [scheduler, setScheduler] = useState(null)
  const [departments, setDepartments] = useState([])
  const [pipelines, setPipelines] = useState([])

  // UI state
  const [selectedDay, setSelectedDay] = useState(null) // { date, shifts: [...] }
  const [dayModalOpen, setDayModalOpen] = useState(false)
  const [staffDetail, setStaffDetail] = useState(null)
  const [staffModalOpen, setStaffModalOpen] = useState(false)
  const [calendarFullWidth, setCalendarFullWidth] = useState(true)

  // Calendar navigation state
  const [calendarDate, setCalendarDate] = useState(new Date()) // Currently viewing month
  // Removed todayShifts state - now computed from dashboardShifts

  // Memoize today's date to prevent re-renders
  const today = useMemo(() => new Date(), [])
  const todayStart = useMemo(() => isoDate(startOfMonth(today)), [today])
  const todayEnd = useMemo(() => isoDate(endOfMonth(today)), [today])
  const monthStart = useMemo(() => isoDate(startOfMonth(calendarDate)), [calendarDate])
  const monthEnd = useMemo(() => isoDate(endOfMonth(calendarDate)), [calendarDate])

  // Scheduler modal state
  const [schedulerModalOpen, setSchedulerModalOpen] = useState(false)
  const [schedulerLoading, setSchedulerLoading] = useState(false)
  const [schedulerResult, setSchedulerResult] = useState(null)

  // Department filter
  const [deptFilter, setDeptFilter] = useState('ALL')

  // Calendar navigation functions
  function navigateMonth(direction) {
    const newDate = new Date(calendarDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (direction === 'next') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (direction === 'today') {
      // Reset to current month
      return setCalendarDate(new Date())
    }
    setCalendarDate(newDate)
  }

  // State for dashboard data (never changes with month navigation)
  const [dashboardShifts, setDashboardShifts] = useState([])
  const [calendarShifts, setCalendarShifts] = useState([])

  // Load all data (dashboard + calendar) in a single optimized effect
  useEffect(() => {
    let mounted = true
    async function loadAllData() {
      if (!token) return

      const start = todayStart, end = todayEnd

      // Check if we have valid cached data
      if (isCacheValid(start, end, monthStart, monthEnd)) {
        console.log('📦 Using cached dashboard data')
        setStaff(getCachedData('staff') || [])
        setDashboardShifts(getCachedData('dashboardShifts') || [])
        setCalendarShifts(getCachedData('calendarShifts') || [])
        setAnalysis(getCachedData('analysis'))
        setSkills(getCachedData('skills') || [])
        setLeaves(getCachedData('leaves') || [])
        setDepartments(getCachedData('departments') || [])
        return
      }

      console.log('🔄 Fetching fresh dashboard data')
      setLoading(true)
      setError(null)
      try {
        // Fetch all data in parallel
        const staffP = apiFetch(`/api/v1/${ORG_SLUG}/staff`, {}, token)
        const dashboardShiftsP = fetchShifts(start, end) // Use context caching
        const calendarShiftsP = monthStart === start && monthEnd === end
          ? dashboardShiftsP // Same month, reuse same promise
          : fetchShifts(monthStart, monthEnd) // Different month, fetch separately
        const analysisP = apiFetch(`/api/v1/${ORG_SLUG}/analysis/range?start=${start}&end=${end}&detailed=true`, {}, token)

        // Also fetch analysis for calendar month if different from current month
        const calendarAnalysisP = monthStart === start && monthEnd === end
          ? analysisP // Same month, reuse same promise
          : apiFetch(`/api/v1/${ORG_SLUG}/analysis/range?start=${monthStart}&end=${monthEnd}&detailed=true`, {}, token)

        const skillsP = apiFetch(`/api/v1/${ORG_SLUG}/skills`, {}, token)
        const leavesP = apiFetch(`/api/v1/${ORG_SLUG}/leaves`, {}, token)
        const depsP = apiFetch(`/api/v1/${ORG_SLUG}/departments`, {}, token)

        const res = await Promise.allSettled([staffP, dashboardShiftsP, calendarShiftsP, analysisP, calendarAnalysisP, skillsP, leavesP, depsP])
        if (!mounted) return

        const [rStaff, rDashboardShifts, rCalendarShifts, rAnalysis, rCalendarAnalysis, rSkills, rLeaves, rDeps] = res

        const staffVal = rStaff.status === 'fulfilled' ? rStaff.value : []

        // Normalize shifts responses - ensure they are always arrays
        let dashboardShiftsVal = rDashboardShifts.status === 'fulfilled' ? rDashboardShifts.value : []
        if (!Array.isArray(dashboardShiftsVal)) {
          console.warn('Dashboard shifts is not an array:', dashboardShiftsVal)
          dashboardShiftsVal = dashboardShiftsVal?.shifts || dashboardShiftsVal?.data || []
        }

        let calendarShiftsVal = rCalendarShifts.status === 'fulfilled' ? rCalendarShifts.value : []
        if (!Array.isArray(calendarShiftsVal)) {
          console.warn('Calendar shifts is not an array:', calendarShiftsVal)
          calendarShiftsVal = calendarShiftsVal?.shifts || calendarShiftsVal?.data || []
        }

        const analysisVal = rAnalysis.status === 'fulfilled' ? rAnalysis.value : null
        const calendarAnalysisVal = rCalendarAnalysis.status === 'fulfilled' ? rCalendarAnalysis.value : null
        const skillsVal = rSkills.status === 'fulfilled' ? rSkills.value : []
        const leavesVal = rLeaves.status === 'fulfilled' ? (Array.isArray(rLeaves.value) ? rLeaves.value : (rLeaves.value?.items || [])) : []

        // Handle various response formats for departments
        let depsVal = []
        if (rDeps.status === 'fulfilled') {
          const deptRes = rDeps.value
          if (Array.isArray(deptRes)) {
            depsVal = deptRes
          } else if (deptRes?.departments && Array.isArray(deptRes.departments)) {
            depsVal = deptRes.departments
          } else if (deptRes?.data && Array.isArray(deptRes.data)) {
            depsVal = deptRes.data
          }
        }

        // Merge calendar analysis assignments into calendar shifts
        if (calendarAnalysisVal && calendarShiftsVal) {
          const calendarAnalysisShifts = calendarAnalysisVal?.data?.report?.shifts || calendarAnalysisVal?.shifts || []



          if (calendarAnalysisShifts.length > 0 && Array.isArray(calendarShiftsVal)) {
            calendarShiftsVal = calendarShiftsVal.map(shift => {
              // Find matching shift in calendar analysis data
              const analysisShift = calendarAnalysisShifts.find(as =>
                (as.id === shift.id) ||
                (as.shift_id === shift.id) ||
                (as.shift_type === shift.shift_type && as.department?.id === shift.department?.id) ||
                ((as.shift_date || as.date) === (shift.shift_date || shift.date) && as.shift_type === shift.shift_type)
              )

              // Merge assignments from analysis if found
              if (analysisShift && analysisShift.assignments) {
                return {
                  ...shift,
                  assignments: analysisShift.assignments,
                  assigned_staff: analysisShift.assignments
                }
              }

              return shift
            })

          } else {
            console.warn('⚠️ Cannot merge:', {
              analysisShiftsEmpty: calendarAnalysisShifts.length === 0,
              calendarShiftsNotArray: !Array.isArray(calendarShiftsVal)
            })
          }
        } else {
          console.warn('⚠️ Missing data for merge:', {
            hasCalendarAnalysis: !!calendarAnalysisVal,
            hasCalendarShifts: !!calendarShiftsVal
          })
        }

        // Set state and cache data
        setStaff(staffVal)
        setCachedData('staff', staffVal)

        setDashboardShifts(dashboardShiftsVal)
        setCachedData('dashboardShifts', dashboardShiftsVal)

        setCalendarShifts(calendarShiftsVal)
        setCachedData('calendarShifts', calendarShiftsVal)

        setAnalysis(analysisVal)
        setCachedData('analysis', analysisVal)

        setSkills(skillsVal)
        setCachedData('skills', skillsVal)

        setLeaves(leavesVal)
        setCachedData('leaves', leavesVal)

        setDepartments(depsVal)
        setCachedData('departments', depsVal)

        // Cache the date range
        setDateRange({ todayStart: start, todayEnd: end, monthStart, monthEnd })

        // if departments endpoint empty, synthesize from analysis staff (fallback)
        if ((depsVal || []).length === 0 && analysisVal) {
          const staffList = analysisVal?.data?.report?.staff || analysisVal?.staff || []
          const map = {}
            (staffList || []).forEach(s => {
              const d = s?.department
              if (d && d.id != null) map[d.id] = d.name
            })
          const synthesized = Object.keys(map).map(id => ({ id, name: map[id] }))
          setDepartments(synthesized)
          setCachedData('departments', synthesized)
        }
      } catch (err) {
        setError(String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadAllData()
    return () => mounted = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, todayStart, todayEnd, monthStart, monthEnd, isCacheValid, getCachedData, setCachedData, setDateRange])

  // Today's shifts - filter from dashboardShifts that already contains the data
  const todayShifts = useMemo(() => {
    const todayStr = isoDate(today)
    const shifts = (dashboardShifts || []).filter(shift => {
      const shiftDate = shift.shift_date || shift.date || ''
      return shiftDate.startsWith(todayStr)
    })
    return shifts
  }, [dashboardShifts, today])

  /* -------------------------
     helpers to read analysis (same as before)
  ------------------------- */
  const report = analysis?.data?.report || analysis?.report || null
  const exec = report?.executive_summary || {}
  const analytics = report?.analytics || {}
  const analysisShifts = report?.shifts || report?.data?.shifts || dashboardShifts || []


  // Memoize the buildScheduleByDate function to avoid recreating it
  const buildScheduleByDateMemo = useMemo(() => {
    return function (list) {
      const map = {}
      const arr = Array.isArray(list) ? list : []
      arr.forEach(s => {
        const raw = s.date || s.shift_date || s.shiftDate || ''
        const key = raw ? raw.slice(0, 10) : ''
        if (!key) return
        map[key] = map[key] || []
        map[key].push(s)
      })
      return map
    }
  }, [])

  // filtered shifts by department selection for calendar only
  const filteredCalendarShifts = useMemo(() => {
    if (deptFilter === 'ALL') return calendarShifts
    return (calendarShifts || []).filter(s => {
      const deptId = s?.department?.id ?? s?.department_id ?? s?.dept_id ?? (typeof s?.department === 'string' ? s.department : null)
      // compare as string to avoid type mismatch
      return String(deptId) === String(deptFilter)
    })
  }, [calendarShifts, deptFilter])

  const filteredAnalysisShifts = useMemo(() => {
    if (deptFilter === 'ALL') return analysisShifts
    return (analysisShifts || []).filter(s => {
      const deptId = s?.department?.id ?? s?.department_id ?? s?.dept_id ?? (typeof s?.department === 'string' ? s.department : null)
      // compare as string to avoid type mismatch
      return String(deptId) === String(deptFilter)
    })
  }, [analysisShifts, deptFilter])

  // Memoize scheduleMap and scheduleSeries to prevent recalculation
  // Use filteredCalendarShifts for the calendar view (not analysisShifts)
  const scheduleMap = useMemo(() => buildScheduleByDateMemo(filteredCalendarShifts), [filteredCalendarShifts, buildScheduleByDateMemo])
  const scheduleSeries = useMemo(() => Object.keys(scheduleMap).sort().map(k => ({ date: k, shifts: scheduleMap[k].length })), [scheduleMap])

  /* -------------------------
     high-level KPIs (from executive_summary)
     - support per-department recalculation using staff summary if available
  ------------------------- */
  // compute execFiltered when department filter applied
  const execFiltered = useMemo(() => {
    if (!exec) return {}
    if (deptFilter === 'ALL') return exec

    // Attempt to compute per-department totals from report.staff_details or staff_summary or staff
    const staffSummary = report?.staff_details || report?.staff_summary || report?.staff || []
    const filteredStaff = (staffSummary || []).filter(s => String(s?.department?.id) === String(deptFilter) || String(s?.department_id) === String(deptFilter))
    const total_staff = filteredStaff.length
    const total_scheduled_hours = filteredStaff.reduce((acc, s) => acc + (toNumber(s?.assignments?.total_hours) || 0), 0)
    // estimated cost: try to proportionally scale if overall total exists
    const estimated_cost = exec.total_scheduled_hours ? Math.round((total_scheduled_hours / Math.max(1, toNumber(exec.total_scheduled_hours))) * (toNumber(exec.estimated_cost) || 0)) : (toNumber(exec.estimated_cost) || 0)
    const quality_score = exec.quality_score ?? null
    const key_insights = exec.key_insights || []
    const critical_issues = (exec.critical_issues || []).filter(ci => {
      // optionally filter issue strings mentioning department id/name (we keep all for now)
      return true
    })
    return { total_staff, total_scheduled_hours, estimated_cost, quality_score, key_insights, critical_issues }
  }, [exec, report, deptFilter])

  const totalStaff = exec.total_staff ?? staff.length
  const totalScheduledHours = exec.total_scheduled_hours ?? null
  const estimatedCost = exec.estimated_cost ?? (report?.analytics?.cost_analysis?.total_estimated_cost ?? null)
  const qualityScore = exec.quality_score ?? report?.analytics?.quality_metrics?.overall_score ?? null
  const criticalIssues = exec.critical_issues ?? []
  const keyInsight = (exec.key_insights && exec.key_insights.length > 0) ? exec.key_insights[0] : null

  /* -------------------------
     modal / click handlers (FIXED staff fetching & mapping)
     - improved: handle response shapes -> res.data || res
     - prefer analysis.report.staff summary for offline details; fallback to API
  ------------------------- */
  async function openDayModal(dateKey) {
    // Use calendarShifts for the day modal (consistent with calendar view)
    const dayShifts = scheduleMap[dateKey] || (filteredCalendarShifts.filter(s => (s.shift_date || s.date || '').startsWith(dateKey)))

    // Fetch detailed shift data AND analysis data with assignments for this specific date
    try {


      // Fetch both shifts and analysis in parallel
      const [detailedShifts, analysisData] = await Promise.all([
        apiFetch(`/api/v1/${ORG_SLUG}/shifts?start_date=${dateKey}&end_date=${dateKey}`, {}, token),
        apiFetch(`/api/v1/${ORG_SLUG}/analysis/range?start=${dateKey}&end=${dateKey}&detailed=true`, {}, token)
      ])



      // Extract shifts from analysis if available
      const analysisShifts = analysisData?.data?.report?.shifts || analysisData?.shifts || []

      // Use detailed shifts if available, otherwise use calendar shifts
      let shiftsToShow = (Array.isArray(detailedShifts) && detailedShifts.length > 0) ? detailedShifts : dayShifts

      // If analysis has shifts with assignments, merge them
      if (analysisShifts.length > 0) {
        shiftsToShow = shiftsToShow.map(shift => {
          // Find matching shift in analysis data
          const analysisShift = analysisShifts.find(as =>
            (as.id === shift.id) ||
            (as.shift_id === shift.id) ||
            (as.shift_type === shift.shift_type && as.department?.id === shift.department?.id)
          )

          // Merge assignments from analysis if found
          if (analysisShift && analysisShift.assignments) {
            return {
              ...shift,
              assignments: analysisShift.assignments,
              assigned_staff: analysisShift.assignments // Also set as assigned_staff
            }
          }

          return shift
        })
      }


      setSelectedDay({ date: dateKey, shifts: shiftsToShow })
    } catch (err) {
      console.error('Error fetching detailed shifts:', err)
      // Fallback to calendar shifts if fetch fails
      setSelectedDay({ date: dateKey, shifts: dayShifts })
    }

    setDayModalOpen(true)
  }

  async function openStaffDetail(emp, date = null) {
    // emp: may be { employee_id, id, full_name, name } or plain id
    // date: optional date string (YYYY-MM-DD) for daily view
    setStaffDetail(null)
    setStaffModalOpen(true)
    try {
      const id = typeof emp === 'string' ? emp : (emp.employee_id || emp.id || emp.employeeId)
      if (!id) {
        // if object lacks id, just show what we have
        setStaffDetail(emp)
        return
      }

      // First try to find in analysis.report.staff_details or report.staff_summary or report.staff
      const staffSummary = report?.staff_details || report?.staff_summary || report?.staff || []
      let found = Array.isArray(staffSummary) ? staffSummary.find(x => (String(x.employee_id) === String(id) || String(x.id) === String(id))) : null

      // If we have a date, get daily shift details
      if (date && found) {
        // Try multiple possible shift data sources
        const shiftSources = [
          report?.shifts || [],
          report?.data?.shifts || [],
          analysisShifts || [],
          shifts || []
        ]

        const allShifts = shiftSources.flat()

        // First, filter shifts by date
        const dateShifts = allShifts.filter(s =>
          s.date === date || (s.shift_date && s.shift_date.startsWith(date))
        )

        // Then, find unique shifts where this staff is assigned
        const seenShiftIds = new Set()
        const dailyShifts = dateShifts.filter(s => {
          // Skip if we've already processed this shift ID
          if (s.shift_id && seenShiftIds.has(s.shift_id)) {
            return false
          }
          if (s.shift_id) {
            seenShiftIds.add(s.shift_id)
          }

          // Check if staff is assigned to this shift
          const isAssigned = s.assignments && s.assignments.some(a => a.employee_id === id)
          return isAssigned
        })

        // Debug logging
        if (import.meta.env.DEV) {
          // Calculate daily hours from shifts
          let dailyHours = 0
          dailyShifts.forEach(s => {
            const hours = toNumber(s.hours || s.duration || 8)
            if (hours) {
              dailyHours += hours
            }
          })

          // Get unique skills used today
          const dailySkills = new Set()
          dailyShifts.forEach(s => {
            const assignment = s.assignments.find(a => a.employee_id === id)
            if (assignment?.skills_matched) {
              assignment.skills_matched.forEach(skill => dailySkills.add(skill))
            }
          })

          // Create daily-specific view
          found = {
            ...found,
            _isDailyView: true,
            _date: date,
            _shifts: dailyShifts,
            daily_hours: Math.min(dailyHours, 24), // Cap at 24 hours
            daily_shifts: dailyShifts.length,
            daily_skills: Array.from(dailySkills),
            shift_details: dailyShifts.map(s => ({
              shift_id: s.shift_id,
              type: s.type,
              department: s.department,
              hours: s.requirements?.hours || 8,
              assignment: s.assignments.find(a => a.employee_id === id),
              coverage: s.assignments?.length || 0,
              required: s.requirements?.min_staff || 1
            }))
          }
        }
      }

      // If not found, call API staff detail endpoint
      if (!found) {
        const res = await apiFetch(`/api/v1/${ORG_SLUG}/staff/${id}`, {}, token)
        // some endpoints return { data: {...} } or full object; normalize
        found = res?.data || res || null
      }

      // Normalize mapping: ensure assignments, skills, preferences, performance exist at root for easier rendering
      const normalized = Object.assign({}, found)

      // If assignments nested, bring to normalized.assignments
      if (!normalized.assignments) {
        if (found?.assignments) normalized.assignments = found.assignments
        else if (found?.stats) normalized.assignments = found.stats
      }

      // Ensure skills object shape
      if (!normalized.skills && found?.skill_summary) normalized.skills = found.skill_summary

      // Ensure performance
      if (!normalized.performance && found?.performance_summary) normalized.performance = found.performance_summary

      if (import.meta.env.DEV) {

      }
      setStaffDetail(normalized)
    } catch (err) {
      // fallback: show emp object
      setStaffDetail(emp)
    }
  }

  // Function to run the enhanced scheduler
  async function runEnhancedScheduler(params) {
    setSchedulerLoading(true)
    setSchedulerResult(null)
    try {
      // First, check if there are any shifts in the specified date range
      const { start_date, end_date } = params
      const shiftsCheck = await fetchShifts(start_date, end_date) // Use context fetch

      const shifts = Array.isArray(shiftsCheck) ? shiftsCheck : (shiftsCheck?.shifts || [])

      // If no shifts exist, warn the user
      if (shifts.length === 0) {
        setSchedulerResult({
          success: false,
          error: `No shifts found for the selected period (${start_date} to ${end_date}). Please use the Pipeline Generator to create shift patterns before running the scheduler.`,
          needsShifts: true
        })
        setSchedulerLoading(false)
        return
      }

      // Simplified payload - only send required fields
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

      // Refresh data after successful run
      if (response.success || response.status === 'success' || response.message) {
        // Clear the shift cache immediately
        clearCache()

        // Show success message
        setSchedulerResult({
          ...response,
          success: true,
          message: response.message || 'Scheduler completed successfully! Refreshing data...'
        })

        // Wait a moment to show the success message, then reload data
        setTimeout(async () => {
          try {
            // Fetch shifts for the EXACT date range that was scheduled

            await fetchShifts(start_date, end_date, true) // Force refresh for scheduled range

            // Also refresh current calendar view if needed
            const scheduledRefresh = await fetchShifts(monthStart, monthEnd, true) // Force refresh calendar
            setCalendarShifts(scheduledRefresh || [])

            // Refresh dashboard if needed
            const dashboardRefresh = await fetchShifts(todayStart, todayEnd, true)
            setDashboardShifts(dashboardRefresh || [])



            // Close the modal after data is refreshed
            setTimeout(() => {
              setSchedulerModalOpen(false)
              setSchedulerResult(null)
            }, 1000)
          } catch (err) {
            console.error('Error refreshing data:', err)
            // Still close the modal even if refresh fails
            setTimeout(() => {
              window.location.reload()
            }, 1000)
          }
        }, 1500)
      }
    } catch (error) {
      console.error('Scheduler error:', error)
      setSchedulerResult({
        success: false,
        error: String(error)
      })
    } finally {
      setSchedulerLoading(false)
    }
  }

  /* -------------------------
     rendering components
  ------------------------- */

  // Analytics -> manager-friendly conversions
  const fairness = analytics.fairness_metrics || {}
  const skill = analytics.skill_analysis || {}
  const cost = analytics.cost_analysis || {}
  const quality = analytics.quality_metrics || {}
  const trends = analytics.trends || {}

  // small charts data
  const skillPie = [
    { name: 'Coverage', value: toNumber(skill.overall_coverage) ?? 0 },
    { name: 'Gaps', value: Math.max(0, 100 - (toNumber(skill.overall_coverage) ?? 0)) }
  ]
  const COLORS = ['#60A5FA', '#F97316']

  // Memoize calendar cells generation to prevent recalculation on every render
  const calendarCells = useMemo(() => {
    const first = startOfMonth(calendarDate)
    const last = endOfMonth(calendarDate)
    const startDay = first.getDay()
    const blanks = Array.from({ length: startDay })
    const cells = []

    blanks.forEach((_, i) => cells.push(<div key={`b-${i}`} className="p-3 bg-transparent" />))

    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      const key = isoDate(d)
      const dayShifts = scheduleMap[key] || []
      const count = dayShifts.length
      const isToday = isoDate(today) === key

      // Calculate average coverage for the day
      let coveragePercentage = 100 // Default to 100% if no shifts
      if (count > 0) {
        const coverages = dayShifts.map(s => toNumber(s.coverage || s.coverage_rate || s.metrics?.coverage)).filter(v => v != null)
        if (coverages.length > 0) {
          coveragePercentage = coverages.reduce((a, b) => a + b, 0) / coverages.length
        }
      }

      // Determine status color based on coverage and shift count
      let statusColor = count === 0 ? 'bg-gray-100 border-gray-300' : 'bg-green-100 border-green-300' // No shifts = grey, >70% (green)
      if (count > 0 && coveragePercentage <= 20) {
        statusColor = 'bg-red-100 border-red-300' // 0-20% (red)
      } else if (count > 0 && coveragePercentage <= 70) {
        statusColor = 'bg-yellow-100 border-yellow-300' // 21-70% (yellow)
      }

      // Highlight today's date
      if (isToday) {
        statusColor += ' ring-2 ring-indigo-500'
      }

      // Status indicator dot
      let statusDot = count === 0 ? 'bg-gray-400' : (coveragePercentage > 70 ? 'bg-green-500' :
        coveragePercentage > 20 ? 'bg-yellow-500' : 'bg-red-500')

      cells.push(
        <div key={key} onClick={() => openDayModal(key)} role="button" tabIndex={0}
          className={`p-3 border-2 rounded cursor-pointer hover:shadow-lg hover:scale-105 transition-all ${statusColor}`}
          style={{ aspectRatio: '1', minHeight: '100px', display: 'flex', flexDirection: 'column' }}>
          <div className="flex justify-between items-start">
            <div className="font-medium text-lg">{d.getDate()}</div>
            <div className="flex flex-col items-end gap-1">
              {isToday && <span className="text-xs text-indigo-600 font-bold">Today</span>}
              <div className={`w-2 h-2 rounded-full ${statusDot}`}></div>
              <div className="text-sm text-gray-600">{count} shift{count !== 1 ? 's' : ''}</div>
            </div>
          </div>
          {count > 0 && (
            <div className="mt-auto mb-2 text-sm text-gray-600 text-bottom">
              {coveragePercentage.toFixed(0)}% coverage
            </div>
          )}
        </div>
      )
    }
    return cells
  }, [calendarDate, today, scheduleMap, openDayModal])

  /* -------------------------
     layout: Analytics + Quality in one row; Optimization full row below;
             Calendar and Recent shifts side-by-side. (rearranged)
  ------------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rotation Dashboard</h1>
            <p className="text-gray-600 mt-1">Staff scheduling and shift management overview</p>
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
      </div>

      {error && (
        <div className="container mx-auto px-6 mt-6">
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl">
            {error}
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="px-6 py-8">
        {/* Executive Summary - 5 cards in a row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow-sm relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Total staff</div>
                <div className="text-2xl font-bold">{totalStaff}</div>
                <div className="text-xs text-gray-400 mt-1">Total scheduled hours</div>
              </div>
              <InfoTooltip text="Total number of employees in the organization" />
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow-sm relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Scheduled hours</div>
                <div className="text-2xl font-bold">{totalScheduledHours ? `${fmtNumber(totalScheduledHours)} hrs` : '—'}</div>
                <div className="text-xs text-gray-400 mt-1">Total scheduled hours</div>
              </div>
              <InfoTooltip text="Total number of hours scheduled for all staff in this period" />
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow-sm relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{estimatedCost ? fmtCurrency(estimatedCost) : '—'}</div>
                <div className="text-xs text-gray-400 mt-1">Window cost estimate</div>
              </div>
              <InfoTooltip text="Total estimated labor cost for the scheduled period" />
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow-sm ">
            <div className="text-xs text-gray-500">Quality score</div>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold">{qualityScore != null ? `${Number(qualityScore).toFixed(0)}` : '—'}</div>
              <div className="text-xs text-gray-400">Higher is better</div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-100 h-2 rounded overflow-hidden">
                <div style={{ width: `${Math.min(100, Math.max(0, toNumber(qualityScore) || 0))}%` }} className="h-2 bg-green-500"></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow-sm ">
            <div className="text-xs text-gray-500">Critical issues</div>
            {Array.isArray(criticalIssues) && criticalIssues.length > 0 ? (
              <ul className="list-disc ml-5 text-sm mt-2">
                {criticalIssues.map((c, i) => (<li key={i}>{c}</li>))}
              </ul>
            ) : (
              <div className="text-sm text-gray-600 mt-2">No critical issues detected</div>
            )}
          </div>
        </div>

        {/* Analytics + Quality row */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Analytics overview (left) */}
          <div className="md:col-span-1 space-y-4">
            <Card>
              <h3 className="font-semibold mb-2">Analytics overview</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center">
                  <div className="text-xs text-gray-500">Shift distribution variance</div>
                  <InfoTooltip text="How evenly shifts are distributed among all staff members" />
                </div>
                <div className="font-medium">{fairFmt(fairness.shift_distribution_variance)}</div>

                <div className="flex items-center">
                  <div className="text-xs text-gray-500">Hour distribution variance</div>
                  <InfoTooltip text="How evenly working hours are distributed across the team" />
                </div>
                <div className="font-medium">{fairFmt(fairness.hour_distribution_variance)}</div>

                <div className="flex items-center">
                  <div className="text-xs text-gray-500">Weekend distribution</div>
                  <InfoTooltip text="How fairly weekend shifts are assigned among staff" />
                </div>
                <div className="font-medium">{fmtPct(toNumber(fairness.weekend_distribution_score) ?? fairness.weekend_distribution_score ?? 0)}</div>

                <div className="flex items-center">
                  <div className="text-xs text-gray-500">Skill coverage</div>
                  <InfoTooltip text="Percentage of required skills that are covered by assigned staff" />
                </div>
                <div className="font-medium">{skill.overall_coverage ? `${Number(skill.overall_coverage).toFixed(1)}%` : '—'}</div>

                <div className="flex items-center">
                  <div className="text-xs text-gray-500">Optimization potential</div>
                  <InfoTooltip text="Potential cost savings from schedule optimization" />
                </div>
                <div className="font-medium">{cost.optimization_potential ? fmtCurrency(cost.optimization_potential) : '—'}</div>

                <div className="flex items-center">
                  <div className="text-xs text-gray-500">Overtime cost</div>
                  <InfoTooltip text="Total estimated cost of overtime hours in the schedule" />
                </div>
                <div className="font-medium">{cost.overtime_cost ? fmtCurrency(cost.overtime_cost) : '—'}</div>
              </div>
            </Card>
          </div>

          {/* Quality metrics (right) */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <h3 className="font-semibold mb-2">Quality metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3 relative">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-indigo-800">Preference Satisfaction</div>
                      <div className="text-2xl font-bold text-indigo-900">
                        {quality.preference_satisfaction ? `${Number(quality.preference_satisfaction).toFixed(1)}%` : '—'}
                      </div>
                    </div>
                    <InfoTooltip text="How well the schedule matches employee preferences for shifts, days, and working hours" />
                  </div>
                </div>

                <div className="bg-gray-50 border rounded-lg p-3 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">Skill utilization</div>
                      <div className="font-medium">{quality.skill_utilization ? `${Number(quality.skill_utilization).toFixed(1)}%` : '—'}</div>
                    </div>
                    <InfoTooltip text="How effectively staff skills are being used in assigned shifts" />
                  </div>
                </div>

                <div className="bg-gray-50 border rounded-lg p-3 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">Supervisor coverage</div>
                      <div className="font-medium">{quality.supervisor_coverage ? `${Number(quality.supervisor_coverage).toFixed(1)}%` : '—'}</div>
                    </div>
                    <InfoTooltip text="Percentage of shifts that have required supervisor coverage" />
                  </div>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 relative">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-green-800">Continuity Score</div>
                      <div className="text-2xl font-bold text-green-900">
                        {quality.continuity_score ? `${Number(quality.continuity_score).toFixed(1)}%` : '—'}
                      </div>
                    </div>
                    <InfoTooltip text="Measures how consistent the scheduling is for the same staff members in the same roles" />
                  </div>
                </div>
              </div>
            </Card>

          </div>
        </div>

        {/* Optimization opportunities - full width horizontal line */}
        <div className="mt-6">
          <Card>
            <h3 className="font-semibold mb-4">Optimization opportunities</h3>
            {(report?.optimization_opportunities || []).length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {report.optimization_opportunities.map((op, i) => (
                  <div key={i} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="font-semibold text-lg mb-2">{op.area}</div>
                    <div className="text-sm text-gray-600 mb-3">{op.implementation}</div>
                    <div className="text-sm text-indigo-600 font-semibold mb-3">{op.potential_savings}</div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50 transition-colors">Simulate</button>
                      <button className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">Apply</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-sm text-gray-500">No opportunities suggested</div>}
          </Card>
        </div>

        {/* Shift Details Section */}
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-800"></h1>

          {/* Calendar - Full Width */}
          <div>
            <Card>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigateMonth('prev')}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Previous month"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h3 className="font-semibold">{calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                    <button
                      onClick={() => navigateMonth('next')}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Next month"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  {calendarDate.getMonth() !== today.getMonth() && calendarDate.getFullYear() !== today.getFullYear() && (
                    <button
                      onClick={() => navigateMonth('today')}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      Today
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Filter by department:</label>
                  <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="border px-2 py-1 rounded text-sm">
                    <option value="ALL">All departments</option>
                    {departments && departments.map(d => (<option key={d.id || d.department_id || d.name} value={d.id || d.department_id || d.name}>{d.name || d.department_name || d.name}</option>))}
                  </select>
                </div>
              </div>
              {loading ? <LoadingSkeleton className="h-72 w-full" /> : (
                <div className="bg-white p-4 rounded">
                  <div className="grid grid-cols-7 gap-2 text-sm">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (<div key={d} className="text-xs text-gray-500 text-center">{d}</div>))}
                  </div>

                  <div className="grid grid-cols-7 gap-2 mt-2" style={{ minHeight: '420px' }}>
                    {calendarCells}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Day modal (fixed) - ensure numeric formatting and avoid [Object] */}
        {dayModalOpen && selectedDay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-30" onClick={() => { setDayModalOpen(false); setSelectedDay(null) }} />
            <div className="relative bg-white w-11/12 md:w-3/4 lg:w-2/3 max-h-[80vh] overflow-auto rounded shadow-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">Overview — {selectedDay.date}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    {(scheduleMap[selectedDay.date] || []).length} shift(s) • {(() => {
                      const arr = scheduleMap[selectedDay.date] || []
                      if (arr.length === 0) return 'No shifts'
                      const covs = arr.map(x => toNumber(x.coverage ?? x.coverage_rate ?? x.metrics?.coverage)).filter(v => v != null)
                      const avg = covs.length ? (covs.reduce((a, b) => a + b, 0) / covs.length) : null
                      return avg == null ? 'Avg coverage: N/A' : `Avg coverage: ${avg.toFixed(1)}%`
                    })()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setDayModalOpen(false); setSelectedDay(null) }} className="px-3 py-1 border rounded">Close</button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div className="md:col-span-2 space-y-3">
                  {(selectedDay.shifts || []).map((s, idx) => (
                    <div key={idx} className="border rounded p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{s.shift_type || s.type || s.shiftType || 'Shift'} — {s.department?.name || s.department || 'Dept'}</div>
                          <div className="text-xs text-gray-500">{(s.start_time && s.end_time) ? `${s.start_time} - ${s.end_time}` : ''}</div>
                        </div>
                        <div className="text-sm text-gray-500">{(() => { const c = toNumber(s.coverage ?? s.coverage_rate ?? s.metrics?.coverage); return c == null ? '—' : `${c}%` })()}</div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs text-gray-500">Assigned</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(() => {
                            // Try multiple possible field names for assignments
                            const assignments = s.assignments || s.assigned_staff || s.staff_assignments || s.employees || []
                            const assignmentArray = Array.isArray(assignments) ? assignments : []

                            if (assignmentArray.length > 0) {
                              return assignmentArray.map((a, i2) => (
                                <button
                                  key={i2}
                                  onClick={() => openStaffDetail(a, selectedDay.date)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded text-xs border"
                                >
                                  {a.full_name || a.name || a.employee_name || a.employee_id || a.staff_name || a.id || 'Staff'}
                                </button>
                              ))
                            }

                            // Check if there's an assigned_count or similar field
                            const assignedCount = s.assigned_count || s.staff_count || s.coverage_count
                            if (assignedCount > 0) {
                              return <div className="text-sm text-gray-600">{assignedCount} staff assigned (details not loaded)</div>
                            }

                            return <div className="text-sm text-gray-500">No staff assigned</div>
                          })()}
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        {s.metrics?.notes || s.notes || ''}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Day totals</div>
                    <div className="font-medium mt-1">{(selectedDay.shifts || []).length} shifts</div>
                    <div className="text-sm text-gray-500 mt-1">Coverage: {(() => {
                      const arr = selectedDay.shifts || []
                      if (!arr.length) return '—'
                      const covs = arr.map(x => toNumber(x.coverage || x.coverage_rate || x.metrics?.coverage)).filter(v => v != null)
                      const avg = covs.length ? (covs.reduce((a, b) => a + b, 0) / covs.length) : null
                      return avg == null ? '—' : `${avg.toFixed(1)}%`
                    })()}</div>
                    <div className="text-sm text-gray-500 mt-1">Cost (est): {(() => {
                      const arr = selectedDay.shifts || []
                      const sum = arr.reduce((acc, x) => acc + (toNumber(x.metrics?.estimated_cost) || toNumber(x.estimated_cost) || 0), 0)
                      return sum > 0 ? fmtCurrency(sum) : '—'
                    })()}</div>
                  </div>

                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Actions</div>
                    <div className="mt-2 flex gap-2">
                      <button className="px-2 py-1 border rounded text-xs">Auto-fill understaffed</button>
                      <button className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">Run schedule for day</button>
                    </div>
                  </div>

                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Flags</div>
                    {
                      (() => {
                        const shifts = selectedDay.shifts || []
                        if (shifts.length === 0) return <div className="text-sm text-gray-500 mt-2">No shifts scheduled</div>

                        const coverages = shifts.map(s => toNumber(s.coverage || s.coverage_rate || s.metrics?.coverage)).filter(v => v != null)
                        const avgCoverage = coverages.length > 0 ? coverages.reduce((a, b) => a + b, 0) / coverages.length : 100

                        if (avgCoverage <= 20) return <div className="text-sm text-red-600 mt-2">Critical coverage ({avgCoverage.toFixed(0)}%)</div>
                        if (avgCoverage <= 70) return <div className="text-sm text-yellow-600 mt-2">Low coverage ({avgCoverage.toFixed(0)}%)</div>
                        return <div className="text-sm text-green-600 mt-2">Good coverage ({avgCoverage.toFixed(0)}%)</div>
                      })()
                    }
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Staff modal - improved mapping for assignments, skills, preferences, performance */}
        {staffModalOpen && staffDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-30" onClick={() => { setStaffModalOpen(false); setStaffDetail(null) }} />
            <div className="relative bg-white w-11/12 md:w-2/3 max-h-[80vh] overflow-auto rounded shadow-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{staffDetail.full_name || staffDetail.name || staffDetail.employee_id}</h3>
                  <div className="text-sm text-gray-500 mt-1">{staffDetail.job_title || staffDetail.role || staffDetail.position || ''}</div>
                  <div className="text-xs text-gray-500 mt-1">{staffDetail.department?.name || (staffDetail.department && staffDetail.department) || ''}</div>
                  {staffDetail._isDailyView && <div className="text-xs text-indigo-600 mt-1 font-medium">View for {staffDetail._date}</div>}
                </div>
                <div>
                  <button onClick={() => { setStaffModalOpen(false); setStaffDetail(null) }} className="px-3 py-1 border rounded">Close</button>
                </div>
              </div>

              {/* Daily View vs Period View */}
              {staffDetail._isDailyView ? (
                <div className="mt-4 p-4 bg-indigo-50 rounded">
                  <h4 className="font-semibold text-sm mb-3">Daily Summary for {staffDetail._date}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Hours worked today</div>
                      <div className="font-medium text-lg">{staffDetail.daily_hours || 0} hrs</div>

                      <div className="text-xs text-gray-500 mt-3">Shifts today</div>
                      <div className="font-medium">{staffDetail.daily_shifts || 0} shift(s)</div>

                      <div className="text-xs text-gray-500 mt-3">Departments</div>
                      <div className="text-sm">
                        {[...new Set(staffDetail.shift_details?.map(s => s.department?.name).filter(Boolean))].join(', ') || '-'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">Skills utilized today</div>
                      <div className="mt-1 space-y-1">
                        {staffDetail.daily_skills?.length ? staffDetail.daily_skills.map((s, i) => (<div key={i} className="text-sm bg-white px-2 py-1 rounded inline-block mr-1 mb-1">{s}</div>)) : <div className="text-sm text-gray-500">No special skills today</div>}
                      </div>

                      <div className="text-xs text-gray-500 mt-3">Shift types</div>
                      <div className="text-sm">
                        {[...new Set(staffDetail.shift_details?.map(s => s.type).filter(Boolean))].join(', ') || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-xs text-gray-500">Total hours (period)</div>
                    <div className="font-medium">{staffDetail.total_hours ? `${fmtNumber(staffDetail.total_hours)} hrs` : (staffDetail.assignments?.total_hours ? fmtHours(staffDetail.assignments.total_hours) : '—')}</div>

                    <div className="text-xs text-gray-500 mt-3">Overtime</div>
                    <div className="font-medium">{staffDetail.overtime_hours ? `${fmtNumber(staffDetail.overtime_hours)} hrs` : (staffDetail.assignments?.overtime_hours ? fmtHours(staffDetail.assignments.overtime_hours) : '0 hrs')}</div>

                    <div className="text-xs text-gray-500 mt-3">Assigned shifts</div>
                    <div className="font-medium">{staffDetail.assigned_shifts ? staffDetail.assigned_shifts : (staffDetail.assignments?.total_shifts ? staffDetail.assignments.total_shifts : '—')}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Skills</div>
                    <div className="mt-2 space-y-1">
                      {/* Support either skills object or skills.proficient array */}
                      {staffDetail.skills ? (
                        // If skills.proficient exist, show them; else list keys
                        Array.isArray(staffDetail.skills.proficient) ? staffDetail.skills.proficient.map((s, i) => (<div key={i} className="text-sm">{s}</div>)) :
                          Object.keys(staffDetail.skills).map((k, i) => (<div key={i} className="text-sm">{k} • {JSON.stringify(staffDetail.skills[k])}</div>))
                      ) : <div className="text-sm text-gray-500">No skills listed</div>}
                    </div>

                    <div className="text-xs text-gray-500 mt-3">Preferences</div>
                    <div className="text-sm text-gray-700 mt-1">
                      Preferred shifts: {(staffDetail.preferences?.preferred_shifts || []).join(', ') || '-'} <br />
                      Preferred %: {staffDetail.preferences?.preferred_percentage != null ? `${staffDetail.preferences.preferred_percentage}%` : (staffDetail.preferences?.preferred_percentage === 0 ? '0%' : '-')} <br />
                      Satisfaction: {staffDetail.preferences?.satisfaction_score != null ? `${staffDetail.preferences.satisfaction_score}%` : '-'}
                    </div>
                  </div>
                </div>
              )}

              {/* Show shift details for daily view */}
              {staffDetail._isDailyView && staffDetail.shift_details && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm mb-2">Shift Details</h4>
                  <div className="space-y-2">
                    {staffDetail.shift_details.map((shift, i) => (
                      <div key={i} className="p-3 border rounded bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm">{shift.type} Shift</div>
                            <div className="text-xs text-gray-500">{shift.department?.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{shift.hours} hrs</div>
                            <div className="text-xs text-gray-500">{shift.coverage}/{shift.required} staff</div>
                          </div>
                        </div>
                        {shift.assignment && (
                          <div className="mt-2 text-xs text-gray-600">
                            Match Score: {shift.assignment.match_score || '-'}
                            {shift.assignment.is_supervisor && <span className="ml-2 px-2 py-0.5 bg-purple-100 rounded">Supervisor</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance & Recommendations - only show for period view or if performance data exists */}
              {(!staffDetail._isDailyView || staffDetail.performance) && (
                <div className="mt-4">
                  <h4 className="font-semibold">Performance & Recommendations</h4>
                  <div className="mt-2 text-sm text-gray-700">
                    Avg assignment score: {staffDetail.performance?.avg_assignment_score != null ? fmtNumber(staffDetail.performance.avg_assignment_score) : (staffDetail.performance?.avg_assignment_score === 0 ? '0' : '-')} <br />
                    Supervisor assignments: {staffDetail.performance?.supervisor_assignments ?? (staffDetail.performance?.supervisor_assignments === 0 ? 0 : '-')} <br />
                    Critical shifts: {staffDetail.performance?.critical_shifts ?? '-'}
                  </div>

                  <div className="mt-3 space-y-2">
                    {(staffDetail.performance?.recommendations || []).map((r, i) => (
                      <div key={i} className="p-2 border rounded">
                        <div className="text-xs text-gray-500">{r.type} • <span className="font-semibold">{r.priority}</span></div>
                        <div className="text-sm mt-1">{r.message}</div>
                      </div>
                    ))}
                    {!(staffDetail.performance?.recommendations || []).length && <div className="text-sm text-gray-500">No recommendations</div>}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Scheduler Modal */}
        {schedulerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-30" onClick={() => setSchedulerModalOpen(false)} />
            <div className="relative bg-white w-11/12 md:w-1/2 lg:w-1/3 rounded shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">Run Enhanced Scheduler</h3>
                <button
                  onClick={() => setSchedulerModalOpen(false)}
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
                      defaultValue={monthStart}
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
                      defaultValue={monthEnd}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> The scheduler will automatically assign staff to shifts based on skills, availability, and fairness constraints.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setSchedulerModalOpen(false)}
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
                      <div className="bg-green-50 border border-green-200 p-4 rounded text-sm space-y-3">
                        <p className="text-green-700">{schedulerResult.message || 'Staff assignments have been created.'}</p>
                        {schedulerResult.summary && (
                          <div className="bg-white rounded p-3 space-y-1 text-green-800">
                            <div><strong>Total Assignments:</strong> {schedulerResult.summary.total_assignments || 0}</div>
                            <div><strong>Shifts Covered:</strong> {schedulerResult.summary.shifts_covered || 0}</div>
                            {schedulerResult.summary.coverage_rate && (
                              <div><strong>Coverage Rate:</strong> {schedulerResult.summary.coverage_rate}%</div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center text-green-600 pt-2">
                          <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Refreshing calendar data...
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold text-red-600">Scheduler failed</span>
                      </div>
                      <div className="bg-red-50 p-3 rounded text-sm">
                        <p className="text-red-700">{schedulerResult.error || 'Unknown error occurred'}</p>
                        {schedulerResult.needsShifts && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => {
                                navigate('/pipeline-generator')
                                setSchedulerModalOpen(false)
                              }}
                              className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                            >
                              Go to Pipeline Generator
                            </button>
                            <button
                              onClick={() => setSchedulerResult(null)}
                              className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Try Different Dates
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setSchedulerModalOpen(false)
                        setSchedulerResult(null)
                      }}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

