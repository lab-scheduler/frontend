// RotationDashboard.jsx (MODIFIED - preserves original structure, added fixes)
// Based on original file you uploaded — changes: department filter, numeric safeties, improved staff detail mapping & layout

import React, { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { apiFetch } from '../api/api'
import { OPENAPI_BASE, ORG_SLUG } from '../env'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts'

/* -------------------------
   Helpers (robust formatting to avoid NaN / [object Object])
   ------------------------- */
function isoDate(d){ return new Date(d).toISOString().slice(0,10) }
function startOfMonth(d){ const c=new Date(d); c.setDate(1); return c }
function endOfMonth(d){ const c=new Date(d); c.setMonth(c.getMonth()+1); c.setDate(0); return c }

// Try to coerce to number from many shapes: number, string, object {value:...}, etc.
function toNumber(v){
  if (v == null) return null
  if (typeof v === 'number' && !isNaN(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.\-]/g,'')); return isNaN(n) ? null : n
  }
  if (typeof v === 'object') {
    // common shapes: { value: 12 } or { coverage: 12 }
    for (const key of ['value','v','amount','coverage','total','count','hours']) {
      if (v[key] != null && !isNaN(Number(v[key]))) return Number(v[key])
    }
    return null
  }
  return null
}

function fmtNumber(n){ const v = toNumber(n); return v==null ? '—' : new Intl.NumberFormat().format(v) }
function fmtCurrency(n){ const v = toNumber(n); if(v==null) return '—'; return new Intl.NumberFormat('en-US',{style:'currency',currency:'SGD',maximumFractionDigits:0}).format(v) }
function fmtHours(n){ const v = toNumber(n); return v==null ? '—' : `${fmtNumber(v)} hrs` }
function fmtPct(n, digits=1){ const v = toNumber(n); return v==null ? '—' : `${Number(v).toFixed(digits)}%` }
function safe(v, def=null){ return typeof v === 'undefined' || v === null ? def : v }

/* -------------------------
   UI subcomponents (same as before)
   ------------------------- */
function SeverityBadge({ severity }) {
  const map = { critical: 'bg-red-100 text-red-700', warning: 'bg-yellow-100 text-yellow-700', info: 'bg-blue-100 text-blue-700' }
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[severity]||'bg-gray-100 text-gray-700'}`}>{(severity||'').toUpperCase()}</span>
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
export default function RotationDashboard(){
  const { token } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [staff, setStaff] = useState([])
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

  // Department filter
  const [deptFilter, setDeptFilter] = useState('ALL')

  // default month window
  const today = new Date()
  const monthStart = isoDate(startOfMonth(today))
  const monthEnd = isoDate(endOfMonth(today))

  /* -------------------------
     load data (unchanged but collect departments for dropdown)
  ------------------------- */
  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true); setError(null)
      try{
        const start = monthStart, end = monthEnd
        const staffP = apiFetch(`/api/v1/${ORG_SLUG}/staff`, {}, token)
        const shiftsP = apiFetch(`/api/v1/${ORG_SLUG}/shifts?start_date=${start}&end_date=${end}`, {}, token)
        const analysisP = apiFetch(`/api/v1/${ORG_SLUG}/analysis/range?start=${start}&end=${end}&detailed=true`, {}, token)
        const schedulerP = apiFetch(`/api/v1/${ORG_SLUG}/scheduler/run?start=${start}&end=${end}`, {}, token)
        const skillsP = apiFetch(`/api/v1/${ORG_SLUG}/skills`, {}, token)
        const leavesP = apiFetch(`/api/v1/${ORG_SLUG}/leaves`, {}, token)
        const depsP = apiFetch(`/api/v1/${ORG_SLUG}/departments`, {}, token)

        const res = await Promise.allSettled([staffP,shiftsP,analysisP,schedulerP,skillsP,leavesP,depsP])
        if(!mounted) return

        const [rStaff, rShifts, rAnalysis, rSched, rSkills, rLeaves, rDeps] = res

        const staffVal = rStaff.status==='fulfilled'? rStaff.value : []
        const shiftsVal = rShifts.status==='fulfilled'? rShifts.value : []
        const analysisVal = rAnalysis.status==='fulfilled'? rAnalysis.value : null
        const schedulerVal = rSched.status==='fulfilled'? rSched.value : null
        const skillsVal = rSkills.status==='fulfilled'? rSkills.value : []
        const leavesVal = rLeaves.status==='fulfilled'? (Array.isArray(rLeaves.value)? rLeaves.value : (rLeaves.value?.items||[])) : []
        const depsVal = rDeps.status==='fulfilled'? rDeps.value : []

        setStaff(staffVal)
        setShifts(shiftsVal)
        setAnalysis(analysisVal)
        setScheduler(schedulerVal)
        setSkills(skillsVal)
        setLeaves(leavesVal)
        setDepartments(depsVal)

        // if departments endpoint empty, synthesize from analysis staff (fallback)
        if((depsVal||[]).length === 0 && analysisVal){
          const staffList = analysisVal?.data?.report?.staff || analysisVal?.staff || []
          const map = {}
          (staffList||[]).forEach(s=>{
            const d = s?.department
            if(d && d.id != null) map[d.id] = d.name
          })
          const synthesized = Object.keys(map).map(id=>({ id, name: map[id] }))
          setDepartments(synthesized)
        }
      }catch(err){
        setError(String(err))
      }finally{
        if(mounted) setLoading(false)
      }
    }
    load()
    return ()=> mounted=false
  },[token])

  /* -------------------------
     helpers to read analysis (same as before)
  ------------------------- */
  const report = analysis?.data?.report || analysis?.report || null
  const exec = report?.executive_summary || {}
  const analytics = report?.analytics || {}
  const analysisShifts = report?.shifts || report?.data?.shifts || shifts || []

  // Debug: Log data structure in development
  if (import.meta.env.DEV && analysis) {
    console.log('Analysis data structure:', analysis)
    console.log('Report data:', report)
    console.log('Staff details available:', report?.staff_details?.length || 0)
    console.log('Shifts available:', analysisShifts?.length || 0)
    // Log first staff detail structure for debugging
    if (report?.staff_details?.[0]) {
      console.log('Sample staff detail structure:', report.staff_details[0])
    }
  }

  // build schedule counts per date (kept original, we'll use filteredScheduleMap)
  function buildScheduleByDate(list){
    const map = {}
    const arr = Array.isArray(list) ? list : []
    arr.forEach(s=>{
      const raw = s.date || s.shift_date || s.shiftDate || ''
      const key = raw ? raw.slice(0,10) : ''
      if(!key) return
      map[key] = map[key] || []
      map[key].push(s)
    })
    return map
  }

  // filtered shifts by department selection
  const filteredAnalysisShifts = useMemo(()=>{
    if(deptFilter === 'ALL') return analysisShifts
    return (analysisShifts || []).filter(s=>{
      const deptId = s?.department?.id ?? s?.department_id ?? s?.dept_id ?? (typeof s?.department === 'string' ? s.department : null)
      // compare as string to avoid type mismatch
      return String(deptId) === String(deptFilter)
    })
  },[analysisShifts, deptFilter])

  const scheduleMap = buildScheduleByDate(filteredAnalysisShifts)
  const scheduleSeries = Object.keys(scheduleMap).sort().map(k=>({ date:k, shifts: scheduleMap[k].length }))

  /* -------------------------
     high-level KPIs (from executive_summary)
     - support per-department recalculation using staff summary if available
  ------------------------- */
  // compute execFiltered when department filter applied
  const execFiltered = useMemo(()=>{
    if(!exec) return {}
    if(deptFilter === 'ALL') return exec

    // Attempt to compute per-department totals from report.staff_details or staff_summary or staff
    const staffSummary = report?.staff_details || report?.staff_summary || report?.staff || []
    const filteredStaff = (staffSummary||[]).filter(s=> String(s?.department?.id) === String(deptFilter) || String(s?.department_id) === String(deptFilter))
    const total_staff = filteredStaff.length
    const total_scheduled_hours = filteredStaff.reduce((acc,s)=> acc + (toNumber(s?.assignments?.total_hours) || 0), 0)
    // estimated cost: try to proportionally scale if overall total exists
    const estimated_cost = exec.total_scheduled_hours ? Math.round((total_scheduled_hours / Math.max(1, toNumber(exec.total_scheduled_hours))) * (toNumber(exec.estimated_cost) || 0)) : (toNumber(exec.estimated_cost) || 0)
    const quality_score = exec.quality_score ?? null
    const key_insights = exec.key_insights || []
    const critical_issues = (exec.critical_issues || []).filter(ci=>{
      // optionally filter issue strings mentioning department id/name (we keep all for now)
      return true
    })
    return { total_staff, total_scheduled_hours, estimated_cost, quality_score, key_insights, critical_issues }
  },[exec, report, deptFilter])

  const totalStaff = execFiltered.total_staff ?? exec.total_staff ?? staff.length
  const totalScheduledHours = execFiltered.total_scheduled_hours ?? exec.total_scheduled_hours ?? null
  const estimatedCost = execFiltered.estimated_cost ?? exec.estimated_cost ?? (report?.analytics?.cost_analysis?.total_estimated_cost ?? null)
  const qualityScore = execFiltered.quality_score ?? exec.quality_score ?? report?.analytics?.quality_metrics?.overall_score ?? null
  const criticalIssues = execFiltered.critical_issues ?? exec.critical_issues ?? []
  const keyInsight = (execFiltered.key_insights && execFiltered.key_insights.length>0) ? execFiltered.key_insights[0] : (exec.key_insights && exec.key_insights.length>0 ? exec.key_insights[0] : null)

  /* -------------------------
     modal / click handlers (FIXED staff fetching & mapping)
     - improved: handle response shapes -> res.data || res
     - prefer analysis.report.staff summary for offline details; fallback to API
  ------------------------- */
  function openDayModal(dateKey){
    const dayShifts = scheduleMap[dateKey] || (shifts.filter(s=>(s.shift_date||s.date||'').startsWith(dateKey)))
    setSelectedDay({ date: dateKey, shifts: dayShifts })
    setDayModalOpen(true)
  }

  async function openStaffDetail(emp, date = null){
    // emp: may be { employee_id, id, full_name, name } or plain id
    // date: optional date string (YYYY-MM-DD) for daily view
    setStaffDetail(null)
    setStaffModalOpen(true)
    try{
      const id = typeof emp === 'string' ? emp : (emp.employee_id || emp.id || emp.employeeId)
      if(!id){
        // if object lacks id, just show what we have
        setStaffDetail(emp)
        return
      }

      // First try to find in analysis.report.staff_details or report.staff_summary or report.staff
      const staffSummary = report?.staff_details || report?.staff_summary || report?.staff || []
      let found = Array.isArray(staffSummary) ? staffSummary.find(x=> (String(x.employee_id) === String(id) || String(x.id) === String(id))) : null

      // If we have a date, get daily shift details
      if(date && found){
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
          console.log(`Looking for staff ${id} on ${date}:`)
          console.log(`Found ${dailyShifts.length} matching shifts`)
          console.log('All shifts for this date:', allShifts.filter(s => s.date === date || (s.shift_date && s.shift_date.startsWith(date))))
          console.log('Daily shifts found:', dailyShifts)
          dailyShifts.forEach((s, i) => {
            console.log(`Shift ${i}:`, {
              shift_id: s.shift_id,
              date: s.date,
              type: s.type,
              department: s.department?.name,
              assignments: s.assignments?.filter(a => a.employee_id === id)
            })
          })
        }

        if(dailyShifts.length > 0){
          // Calculate daily totals from shifts
          const dailyHours = dailyShifts.reduce((sum, s) => {
            const assignment = s.assignments.find(a => a.employee_id === id)
            const hours = assignment?.assigned_hours || s.requirements?.hours || 8
            if (import.meta.env.DEV) {
              console.log(`Adding ${hours} hours for shift ${s.shift_id}`)
            }
            return sum + hours
          }, 0)

          if (import.meta.env.DEV) {
            console.log(`Total daily hours calculated: ${dailyHours}`)
          }

          // Get unique skills used today
          const dailySkills = new Set()
          dailyShifts.forEach(s => {
            const assignment = s.assignments.find(a => a.employee_id === id)
            if(assignment?.skills_matched){
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
      if(!found){
        const res = await apiFetch(`/api/v1/${ORG_SLUG}/staff/${id}`, {}, token)
        // some endpoints return { data: {...} } or full object; normalize
        found = res?.data || res || null
      }

      // Normalize mapping: ensure assignments, skills, preferences, performance exist at root for easier rendering
      const normalized = Object.assign({}, found)

      // If assignments nested, bring to normalized.assignments
      if(!normalized.assignments){
        if(found?.assignments) normalized.assignments = found.assignments
        else if(found?.stats) normalized.assignments = found.stats
      }

      // Ensure skills object shape
      if(!normalized.skills && found?.skill_summary) normalized.skills = found.skill_summary

      // Ensure performance
      if(!normalized.performance && found?.performance_summary) normalized.performance = found.performance_summary

      if (import.meta.env.DEV) {
        console.log('Setting staff detail:', normalized)
      }
      setStaffDetail(normalized)
    }catch(err){
      // fallback: show emp object
      setStaffDetail(emp)
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
  const COLORS = ['#60A5FA','#F97316']

  /* -------------------------
     layout: Analytics + Quality in one row; Optimization full row below;
             Calendar and Recent shifts side-by-side. (rearranged)
  ------------------------- */

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Rotation Dashboard</h1>
          {keyInsight && <div className="text-sm text-gray-600 mt-1">{keyInsight}</div>}
        </div>

        <div className="flex gap-2 items-center">
          <select value={deptFilter} onChange={(e)=>setDeptFilter(e.target.value)} className="border px-2 py-1 rounded">
            <option value="ALL">All departments</option>
            {departments && departments.map(d=>(<option key={d.id || d.department_id || d.name} value={d.id || d.department_id || d.name}>{d.name || d.department_name || d.name}</option>))}
          </select>
          <button onClick={()=>window.location.reload()} className="px-3 py-2 rounded border">Refresh</button>
          <button onClick={()=>{ /* run with CPSAT option maybe */ }} className="px-3 py-2 rounded bg-indigo-600 text-white">Run Scheduler</button>
        </div>
      </div>

      {error && <div className="text-red-600 bg-red-50 p-2 rounded">{error}</div>}

      {/* Executive summary cards - full width */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPI title="Total staff" value={ totalStaff } sub="Employees in org" />
        <KPI title="Scheduled hours" value={ totalScheduledHours ? `${fmtNumber(totalScheduledHours)} hrs` : '—' } sub="Total scheduled hours" />
        <KPI title="Estimated cost" value={ fmtCurrency(estimatedCost) } sub="Window cost estimate" />
        <div className="bg-white p-4 rounded shadow-sm">
          <div className="text-xs text-gray-500">Quality score</div>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">{ qualityScore != null ? `${Number(qualityScore).toFixed(0)}` : '—' }</div>
            <div className="text-xs text-gray-400">Higher is better</div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-100 h-2 rounded overflow-hidden">
              <div style={{width: `${Math.min(100, Math.max(0, toNumber(qualityScore)||0))}%`}} className="h-2 bg-green-500"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow-sm">
          <div className="text-xs text-gray-500">Critical issues</div>
          {Array.isArray(criticalIssues) && criticalIssues.length>0 ? (
            <ul className="list-disc ml-5 text-sm mt-2">
              {criticalIssues.map((c,i)=>(<li key={i}>{c}</li>))}
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
              <div className="text-xs text-gray-500">Shift distribution variance</div>
              <div className="font-medium">{ fairFmt(fairness.shift_distribution_variance) }</div>

              <div className="text-xs text-gray-500">Hour distribution variance</div>
              <div className="font-medium">{ fairFmt(fairness.hour_distribution_variance) }</div>

              <div className="text-xs text-gray-500">Weekend distribution</div>
              <div className="font-medium">{ fmtPct(toNumber(fairness.weekend_distribution_score) ?? fairness.weekend_distribution_score ?? 0) }</div>

              <div className="text-xs text-gray-500">Skill coverage</div>
              <div className="font-medium">{ skill.overall_coverage ? `${Number(skill.overall_coverage).toFixed(1)}%` : '—' }</div>

              <div className="text-xs text-gray-500">Optimization potential</div>
              <div className="font-medium">{ cost.optimization_potential ? fmtCurrency(cost.optimization_potential) : '—' }</div>

              <div className="text-xs text-gray-500">Overtime cost</div>
              <div className="font-medium">{ cost.overtime_cost ? fmtCurrency(cost.overtime_cost) : '—' }</div>
            </div>
          </Card>
        </div>

        {/* Quality metrics (right) */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <h3 className="font-semibold mb-2">Quality metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Preference satisfaction</div>
                <div className="font-medium">{ quality.preference_satisfaction ? `${Number(quality.preference_satisfaction).toFixed(1)}%` : '—' }</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Skill utilization</div>
                <div className="font-medium">{ quality.skill_utilization ? `${Number(quality.skill_utilization).toFixed(1)}%` : '—' }</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Supervisor coverage</div>
                <div className="font-medium">{ quality.supervisor_coverage ? `${Number(quality.supervisor_coverage).toFixed(1)}%` : '—' }</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Continuity score</div>
                <div className="font-medium">{ quality.continuity_score ? `${Number(quality.continuity_score).toFixed(1)}%` : '—' }</div>
              </div>
            </div>
          </Card>

          {/* Optimization opportunities full width here */}
          <Card>
            <h3 className="font-semibold mb-2">Optimization opportunities</h3>
            { (report?.optimization_opportunities || []).length ? (
              <div className="space-y-2">
                {report.optimization_opportunities.map((op,i)=>(
                  <div key={i} className="p-2 border rounded">
                    <div className="font-medium">{op.area}</div>
                    <div className="text-sm text-gray-600">{op.implementation}</div>
                    <div className="text-sm text-indigo-600 font-semibold mt-1">{op.potential_savings}</div>
                    <div className="mt-2 flex gap-2">
                      <button className="px-2 py-1 text-xs border rounded">Simulate</button>
                      <button className="px-2 py-1 text-xs bg-indigo-600 text-white rounded">Apply</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-sm text-gray-500">No opportunities suggested</div>}
          </Card>
        </div>
      </div>

      {/* Calendar and Recent shifts side-by-side */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <h3 className="font-semibold mb-2">December — click a day for details</h3>
            {loading ? <LoadingSkeleton className="h-72 w-full" /> : (
              <div className="bg-white p-4 rounded">
                <div className="grid grid-cols-7 gap-2 text-sm">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(<div key={d} className="text-xs text-gray-500 text-center">{d}</div>))}
                </div>

                <div className="grid grid-cols-7 gap-2 mt-2">
                  {(() => {
                    const first = startOfMonth(today)
                    const last = endOfMonth(today)
                    const startDay = first.getDay()
                    const blanks = Array.from({length:startDay})
                    const cells = []

                    blanks.forEach((_,i)=> cells.push(<div key={`b-${i}`} className="p-3 bg-transparent" />))

                    for(let d=new Date(first); d<=last; d.setDate(d.getDate()+1)){
                      const key = isoDate(d)
                      const dayShifts = scheduleMap[key] || []
                      const count = dayShifts.length
                      cells.push(
                        <div key={key} onClick={()=>openDayModal(key)} role="button" tabIndex={0}
                             className="p-3 bg-white border rounded cursor-pointer hover:shadow-lg hover:bg-indigo-50 transition">
                          <div className="flex justify-between">
                            <div className="font-medium">{d.getDate()}</div>
                            <div className="text-xs text-gray-400">{count} shift{count!==1 ? 's' : ''}</div>
                          </div>
                          <div className="mt-2 space-y-1">
                            {dayShifts.slice(0,3).map((s,idx)=>(
                              <div key={idx} className="inline-block text-xs px-2 py-1 rounded bg-gray-100">{String(s.shift_type || s.type || s.shiftType || 'Shift')}</div>
                            ))}
                            {dayShifts.length>3 && <div className="text-xs text-gray-400">+{dayShifts.length-3} more</div>}
                          </div>
                        </div>
                      )
                    }
                    return cells
                  })()}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card>
            <h3 className="font-semibold mb-2">Recent shifts (sample)</h3>
            {loading ? <LoadingSkeleton className="h-40 w-full" /> : (
              <div className="space-y-2">
                {(filteredAnalysisShifts || []).slice(0,6).map((s,i)=>(
                  <div key={i} className="p-2 border rounded flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.department?.name || s.department || s.dept || 'Dept' } • { (s.date||s.shift_date||'').slice(0,10) }</div>
                      <div className="text-xs text-gray-500">{s.shift_type || s.type || s.shiftType || 'Shift' } — { (() => {
                        const cov = toNumber(s.coverage ?? s.coverage_rate ?? s.metrics?.coverage)
                        return cov == null ? '—' : `${cov}% coverage`
                      })() }</div>
                    </div>
                    <div className="text-xs">
                      {Array.isArray(s.assignments) && s.assignments.length ? s.assignments.slice(0,3).map(a=>(a.full_name||a.name)).join(', ') : (Array.isArray(s.assigned_staff) ? s.assigned_staff.slice(0,3).map(a=>a.full_name||a.name).join(', ') : 'Unassigned')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Day modal (fixed) - ensure numeric formatting and avoid [Object] */}
      {dayModalOpen && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>{ setDayModalOpen(false); setSelectedDay(null) }} />
          <div className="relative bg-white w-11/12 md:w-3/4 lg:w-2/3 max-h-[80vh] overflow-auto rounded shadow-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold">Overview — {selectedDay.date}</h3>
                <div className="text-sm text-gray-500 mt-1">
                  { (scheduleMap[selectedDay.date] || []).length } shift(s) • { /* compute day coverage safely */ ( () => {
                    const arr = scheduleMap[selectedDay.date] || []
                    if(arr.length===0) return 'No shifts'
                    const covs = arr.map(x=> toNumber(x.coverage ?? x.coverage_rate ?? x.metrics?.coverage ) ).filter(v=>v!=null)
                    const avg = covs.length ? (covs.reduce((a,b)=>a+b,0)/covs.length) : null
                    return avg==null ? 'Avg coverage: N/A' : `Avg coverage: ${avg.toFixed(1)}%`
                  })() }
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>{ setDayModalOpen(false); setSelectedDay(null) }} className="px-3 py-1 border rounded">Close</button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="md:col-span-2 space-y-3">
                {(selectedDay.shifts || []).map((s,idx)=>(
                  <div key={idx} className="border rounded p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{s.shift_type || s.type || s.shiftType || 'Shift'} — { s.department?.name || s.department || 'Dept' }</div>
                        <div className="text-xs text-gray-500">{ (s.start_time && s.end_time) ? `${s.start_time} - ${s.end_time}` : '' }</div>
                      </div>
                      <div className="text-sm text-gray-500">{ (() => { const c = toNumber(s.coverage ?? s.coverage_rate ?? s.metrics?.coverage); return c==null ? '—' : `${c}%` })() }</div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xs text-gray-500">Assigned</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {/* assignment may exist as s.assignments (array) or s.assigned_staff */}
                        {(Array.isArray(s.assignments) ? s.assignments : (Array.isArray(s.assigned_staff)? s.assigned_staff : [])).length ? ( (Array.isArray(s.assignments) ? s.assignments : s.assigned_staff).map((a,i2)=>(
                          <button key={i2} onClick={()=>openStaffDetail(a, selectedDay.date)} className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded text-xs border">
                            {a.full_name || a.name || a.employee_id || 'Staff'}
                          </button>
                        ))) : <div className="text-sm text-gray-500">No staff assigned</div>}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      { s.metrics?.notes || s.notes || '' }
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="p-3 border rounded">
                  <div className="text-xs text-gray-500">Day totals</div>
                  <div className="font-medium mt-1">{ (selectedDay.shifts || []).length } shifts</div>
                  <div className="text-sm text-gray-500 mt-1">Coverage: { (() => {
                    const arr = selectedDay.shifts || []
                    if(!arr.length) return '—'
                    const covs = arr.map(x=> toNumber(x.coverage || x.coverage_rate || x.metrics?.coverage ) ).filter(v=>v!=null)
                    const avg = covs.length ? (covs.reduce((a,b)=>a+b,0)/covs.length) : null
                    return avg==null ? '—' : `${avg.toFixed(1)}%`
                  })() }</div>
                  <div className="text-sm text-gray-500 mt-1">Cost (est): { (() => {
                    const arr = selectedDay.shifts || []
                    const sum = arr.reduce((acc,x)=>acc + (toNumber(x.metrics?.estimated_cost) || toNumber(x.estimated_cost) || 0),0)
                    return fmtCurrency(sum)
                  })() }</div>
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
                  {(selectedDay.shifts || []).some(s=> (toNumber(s.coverage || s.coverage_rate || s.metrics?.coverage) || 0) < 100) ? <div className="text-sm text-red-600 mt-2">One or more shifts below 100% coverage</div> : <div className="text-sm text-gray-500 mt-2">No immediate flags</div>}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Staff modal - improved mapping for assignments, skills, preferences, performance */}
      {staffModalOpen && staffDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>{ setStaffModalOpen(false); setStaffDetail(null) }} />
          <div className="relative bg-white w-11/12 md:w-2/3 max-h-[80vh] overflow-auto rounded shadow-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold">{staffDetail.full_name || staffDetail.name || staffDetail.employee_id}</h3>
                <div className="text-sm text-gray-500 mt-1">{ staffDetail.job_title || staffDetail.role || staffDetail.position || '' }</div>
                <div className="text-xs text-gray-500 mt-1">{ staffDetail.department?.name || (staffDetail.department && staffDetail.department) || '' }</div>
                {staffDetail._isDailyView && <div className="text-xs text-indigo-600 mt-1 font-medium">View for {staffDetail._date}</div>}
              </div>
              <div>
                <button onClick={()=>{ setStaffModalOpen(false); setStaffDetail(null) }} className="px-3 py-1 border rounded">Close</button>
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
                      {staffDetail.daily_skills?.length ? staffDetail.daily_skills.map((s,i)=>(<div key={i} className="text-sm bg-white px-2 py-1 rounded inline-block mr-1 mb-1">{s}</div>)) : <div className="text-sm text-gray-500">No special skills today</div>}
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
                  <div className="font-medium">{ staffDetail.total_hours ? `${fmtNumber(staffDetail.total_hours)} hrs` : (staffDetail.assignments?.total_hours ? fmtHours(staffDetail.assignments.total_hours) : '—') }</div>

                  <div className="text-xs text-gray-500 mt-3">Overtime</div>
                  <div className="font-medium">{ staffDetail.overtime_hours ? `${fmtNumber(staffDetail.overtime_hours)} hrs` : (staffDetail.assignments?.overtime_hours ? fmtHours(staffDetail.assignments.overtime_hours) : '0 hrs') }</div>

                  <div className="text-xs text-gray-500 mt-3">Assigned shifts</div>
                  <div className="font-medium">{ staffDetail.assigned_shifts ? staffDetail.assigned_shifts : (staffDetail.assignments?.total_shifts ? staffDetail.assignments.total_shifts : '—') }</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Skills</div>
                  <div className="mt-2 space-y-1">
                    {/* Support either skills object or skills.proficient array */}
                    { staffDetail.skills ? (
                      // If skills.proficient exist, show them; else list keys
                      Array.isArray(staffDetail.skills.proficient) ? staffDetail.skills.proficient.map((s,i)=>(<div key={i} className="text-sm">{s}</div>)) :
                      Object.keys(staffDetail.skills).map((k,i)=>(<div key={i} className="text-sm">{k} • {JSON.stringify(staffDetail.skills[k])}</div>))
                    ) : <div className="text-sm text-gray-500">No skills listed</div>}
                  </div>

                  <div className="text-xs text-gray-500 mt-3">Preferences</div>
                  <div className="text-sm text-gray-700 mt-1">
                    Preferred shifts: {(staffDetail.preferences?.preferred_shifts || []).join(', ') || '-'} <br />
                    Preferred %: { staffDetail.preferences?.preferred_percentage != null ? `${staffDetail.preferences.preferred_percentage}%` : (staffDetail.preferences?.preferred_percentage === 0 ? '0%' : '-') } <br />
                    Satisfaction: { staffDetail.preferences?.satisfaction_score != null ? `${staffDetail.preferences.satisfaction_score}%` : '-' }
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
                  Avg assignment score: { staffDetail.performance?.avg_assignment_score != null ? fmtNumber(staffDetail.performance.avg_assignment_score) : (staffDetail.performance?.avg_assignment_score === 0 ? '0' : '-') } <br />
                  Supervisor assignments: { staffDetail.performance?.supervisor_assignments ?? (staffDetail.performance?.supervisor_assignments === 0 ? 0 : '-') } <br />
                  Critical shifts: { staffDetail.performance?.critical_shifts ?? '-' }
                </div>

                <div className="mt-3 space-y-2">
                  {(staffDetail.performance?.recommendations || []).map((r,i)=>(
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

    </div>
  )
}

/* -------------------------
   small formatting helper used above
   ------------------------- */
function fairFmt(v){
  const n = toNumber(v)
  if(n == null) return '—'
  if(Math.abs(n) >= 100) return fmtNumber(n)
  return Number(n).toFixed(1)
}
