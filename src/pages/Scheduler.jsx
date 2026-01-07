import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'
import TemplateCard from '../components/TemplateCard'
import TemplateModal from '../components/TemplateModal'
import ApplyTemplateModal from '../components/ApplyTemplateModal'
import { apiFetch } from '../api/api'
import { fetchTemplates, createTemplate, deleteTemplate, applyTemplate } from '../api/templateApi'
import { ORG_SLUG } from '../env'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Scheduler() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Scheduler modal states
  const [showSchedulerModal, setShowSchedulerModal] = useState(false)
  const [schedulerLoading, setSchedulerLoading] = useState(false)
  const [schedulerResult, setSchedulerResult] = useState(null)
  const [useCpsat, setUseCpsat] = useState(true)
  const [createdShiftsSummary, setCreatedShiftsSummary] = useState(null)

  // Data states
  const [departments, setDepartments] = useState([])
  const [skills, setSkills] = useState([])
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Template states
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showTemplates, setShowTemplates] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    departments: [],
    pipelines: [],
    options: {
      skip_existing: false,
      auto_assign: false,
      balance_workload: true,
      max_hours_per_staff: 40,
      max_days_per_week: 5,
      allow_weekends: true
    }
  })

  // Load data
  useEffect(() => {
    loadData()
    loadTemplates()
  }, [token])

  async function loadData() {
    try {
      const [deptRes, skillRes] = await Promise.all([
        apiFetch(`/api/v1/${ORG_SLUG}/departments`, {}, token),
        apiFetch(`/api/v1/${ORG_SLUG}/skills`, {}, token)
      ])

      setDepartments(deptRes?.departments || deptRes || [])
      setSkills(skillRes?.skills || skillRes || [])
    } catch (err) {
      setError(String(err))
    }
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
    // Map template config to form data
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

    const mappedPipelines = (template.config?.pipelines || []).map(pipe => ({
      name: pipe.name,
      department_id: pipe.department_id,
      required_skill_ids: pipe.required_skill_ids || [],
      estimated_staff_hours: pipe.estimated_staff_hours || 8,
      recurrence_days: pipe.recurrence_days || [0, 1, 2, 3, 4],
      priority: pipe.priority || 3,
      is_recurring: true,
      notes: ''
    }))

    setFormData({
      ...formData,
      departments: mappedDepartments,
      pipelines: mappedPipelines
    })

    setSuccess(`Loaded template: ${template.name}`)
    setTimeout(() => setSuccess(null), 3000)
  }

  async function handleSaveAsTemplate(templateData) {
    try {
      // Map form data to template config
      const config = {
        departments: formData.departments.map(dept => ({
          department_id: dept.department_id,
          shift_types: dept.shift_types,
          min_staff: dept.min_staff,
          max_staff: dept.max_staff,
          priority: dept.priority,
          hours: dept.estimated_hours,
          required_skill_ids: dept.required_skill_ids
        })),
        pipelines: formData.pipelines.map(pipe => ({
          name: pipe.name,
          department_id: pipe.department_id,
          required_skill_ids: pipe.required_skill_ids,
          estimated_staff_hours: pipe.estimated_staff_hours,
          recurrence_days: pipe.recurrence_days,
          priority: pipe.priority
        }))
      }

      await createTemplate(token, {
        name: templateData.name,
        description: templateData.description,
        config: config
      })

      setSuccess('Template saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
      loadTemplates() // Reload templates
    } catch (err) {
      throw err
    }
  }

  async function handleDeleteTemplate(templateId) {
    try {
      await deleteTemplate(token, templateId)
      setSuccess('Template deleted successfully')
      setTimeout(() => setSuccess(null), 3000)
      loadTemplates() // Reload templates
    } catch (err) {
      setError(String(err))
      setTimeout(() => setError(null), 5000)
    }
  }

  async function handleApplyTemplate(templateId, startDate, endDate) {
    try {
      const result = await applyTemplate(token, templateId, startDate, endDate)
      setSuccess(`Successfully generated ${result.summary?.total || 0} shifts (${result.summary?.department_shifts_created || 0} department shifts, ${result.summary?.pipeline_shifts_created || 0} pipeline shifts)`)

      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err) {
      throw err
    }
  }

  // Add new department rule
  function addDepartmentRule() {
    setFormData({
      ...formData,
      departments: [...formData.departments, {
        department_id: '',
        required_skill_ids: [],
        shift_types: ['DAY'],
        min_staff: 1,
        max_staff: 2,
        priority: 3,
        estimated_hours: 8,
        recurrence_days: [0, 1, 2, 3, 4],
        notes: ''
      }]
    })
  }

  // Remove department rule
  function removeDepartmentRule(index) {
    setFormData({
      ...formData,
      departments: formData.departments.filter((_, i) => i !== index)
    })
  }

  // Update department rule
  function updateDepartmentRule(index, field, value) {
    const updated = [...formData.departments]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, departments: updated })
  }

  // Add new pipeline
  function addPipeline() {
    setFormData({
      ...formData,
      pipelines: [...formData.pipelines, {
        name: '',
        department_id: '',
        required_skill_ids: [],
        estimated_staff_hours: 8,
        recurrence_days: [0, 1, 2, 3, 4],
        priority: 3,
        is_recurring: true,
        notes: ''
      }]
    })
  }

  // Remove pipeline
  function removePipeline(index) {
    setFormData({
      ...formData,
      pipelines: formData.pipelines.filter((_, i) => i !== index)
    })
  }

  // Update pipeline
  function updatePipeline(index, field, value) {
    const updated = [...formData.pipelines]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, pipelines: updated })
  }

  // Handle checkbox for recurrence days
  function toggleRecurrenceDay(listType, index, day) {
    const list = listType === 'departments' ? formData.departments : formData.pipelines
    const item = list[index]
    const days = item.recurrence_days || []

    if (days.includes(day)) {
      days.splice(days.indexOf(day), 1)
    } else {
      days.push(day)
    }

    days.sort() // Keep days in order

    if (listType === 'departments') {
      updateDepartmentRule(index, 'recurrence_days', [...days])
    } else {
      updatePipeline(index, 'recurrence_days', [...days])
    }
  }

  // Handle shift types
  function toggleShiftType(index, shiftType) {
    const types = formData.departments[index].shift_types || []
    if (types.includes(shiftType)) {
      updateDepartmentRule(index, 'shift_types', types.filter(t => t !== shiftType))
    } else {
      updateDepartmentRule(index, 'shift_types', [...types, shiftType])
    }
  }

  // Handle skill selection
  function toggleSkill(listType, index, skillId) {
    const list = listType === 'departments' ? formData.departments : formData.pipelines
    const item = list[index]
    const skills = item.required_skill_ids || []

    if (skills.includes(skillId)) {
      skills.splice(skills.indexOf(skillId), 1)
    } else {
      skills.push(skillId)
    }

    if (listType === 'departments') {
      updateDepartmentRule(index, 'required_skill_ids', [...skills])
    } else {
      updatePipeline(index, 'required_skill_ids', [...skills])
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
        departments: formData.departments.filter(d => d.department_id),
        pipelines: formData.pipelines.filter(p => p.name && p.department_id)
      }

      const response = await apiFetch(`/api/v1/${ORG_SLUG}/shift-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }, token)

      const summary = {
        total: response.summary?.total || 0,
        department_shifts: response.summary?.department_shifts_created || 0,
        pipeline_shifts: response.summary?.pipeline_shifts_created || 0,
        start_date: formData.start_date,
        end_date: formData.end_date
      }

      setCreatedShiftsSummary(summary)
      setSuccess(`Successfully generated ${summary.total} shifts (${summary.department_shifts} department shifts, ${summary.pipeline_shifts} pipeline shifts)`)

      // Show scheduler modal instead of navigating away
      setShowSchedulerModal(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  // Run scheduler function
  async function runScheduler() {
    if (!createdShiftsSummary) return

    setSchedulerLoading(true)
    setSchedulerResult(null)

    try {
      const { start_date, end_date } = createdShiftsSummary

      const payload = {
        start_date,
        end_date,
        use_cpsat: useCpsat
      }

      const response = await apiFetch(`/api/v1/${ORG_SLUG}/schedule/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }, token)

      setSchedulerResult({
        ...response,
        success: true
      })

      // Navigate to dashboard after a short delay
      setTimeout(() => {
        navigate(`/${ORG_SLUG}/dashboard`)
      }, 2000)
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


  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const shiftTypes = ['DAY', 'EVENING', 'NIGHT']

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold">Scheduler</h1>
        <p className="text-gray-600 mt-1">Create shift schedules and run the automated scheduler to assign staff</p>
      </div>

      {error && <div className="text-red-600 bg-red-50 p-4 rounded">{error}</div>}
      {success && <div className="text-green-600 bg-green-50 p-4 rounded">{success}</div>}

      {/* Templates Section */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Shift Templates</h2>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              {showTemplates ? 'Hide' : 'Show'}
            </button>
          </div>
          <button
            onClick={() => setShowTemplateModal(true)}
            disabled={formData.departments.length === 0 && formData.pipelines.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title={formData.departments.length === 0 && formData.pipelines.length === 0 ? 'Add at least one department rule or pipeline to save as template' : ''}
          >
            💾 Save as Template
          </button>
        </div>

        {showTemplates && (
          <>
            {/* Search Bar */}
            {templates.length > 0 && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Templates Grid */}
            {loadingTemplates ? (
              <div className="text-center py-8 text-gray-500">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 mb-2">No templates yet</p>
                <p className="text-sm text-gray-400">Create your first template by configuring shifts below and clicking "Save as Template"</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates
                  .filter(t =>
                    searchQuery === '' ||
                    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
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
                    />
                  ))}
              </div>
            )}

            {templates.length > 0 && templates.filter(t =>
              searchQuery === '' ||
              t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
            ).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No templates match your search
                </div>
              )}
          </>
        )}
      </Card>


      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date Range */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Date Range</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </Card>

        {/* Department Rules */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Department Rules</h2>
            <button
              type="button"
              onClick={addDepartmentRule}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Add Department Rule
            </button>
          </div>

          {formData.departments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No department rules added. Add at least one to generate shifts.</p>
          ) : (
            <div className="space-y-4">
              {formData.departments.map((dept, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">Department Rule #{index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeDepartmentRule(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department *
                      </label>
                      <select
                        required
                        value={dept.department_id}
                        onChange={(e) => updateDepartmentRule(index, 'department_id', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Department</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={dept.priority}
                        onChange={(e) => updateDepartmentRule(index, 'priority', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={1}>Very Low</option>
                        <option value={2}>Low</option>
                        <option value={3}>Normal</option>
                        <option value={4}>High</option>
                        <option value={5}>Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Staff
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={dept.min_staff}
                        onChange={(e) => updateDepartmentRule(index, 'min_staff', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Staff
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={dept.max_staff}
                        onChange={(e) => updateDepartmentRule(index, 'max_staff', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={dept.estimated_hours}
                        onChange={(e) => updateDepartmentRule(index, 'estimated_hours', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shift Types
                    </label>
                    <div className="flex gap-2">
                      {shiftTypes.map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleShiftType(index, type)}
                          className={`px-3 py-1 rounded text-sm ${dept.shift_types?.includes(type)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recurrence Days
                    </label>
                    <div className="flex gap-2">
                      {weekDays.map((day, dayIndex) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleRecurrenceDay('departments', index, dayIndex)}
                          className={`px-3 py-1 rounded text-sm ${dept.recurrence_days?.includes(dayIndex)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Skills
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {skills.map(skill => (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill('departments', index, skill.id)}
                          className={`px-3 py-1 rounded text-sm text-left ${dept.required_skill_ids?.includes(skill.id)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                          {skill.skill_name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={dept.notes}
                      onChange={(e) => updateDepartmentRule(index, 'notes', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pipelines */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Pipelines</h2>
            <button
              type="button"
              onClick={addPipeline}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Add Pipeline
            </button>
          </div>

          {formData.pipelines.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No pipelines added. Pipelines are optional.</p>
          ) : (
            <div className="space-y-4">
              {formData.pipelines.map((pipeline, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">Pipeline #{index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removePipeline(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pipeline Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={pipeline.name}
                        onChange={(e) => updatePipeline(index, 'name', e.target.value)}
                        placeholder="e.g., Morning Lab Testing"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department *
                      </label>
                      <select
                        required
                        value={pipeline.department_id}
                        onChange={(e) => updatePipeline(index, 'department_id', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Department</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={pipeline.priority}
                        onChange={(e) => updatePipeline(index, 'priority', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={1}>Very Low</option>
                        <option value={2}>Low</option>
                        <option value={3}>Normal</option>
                        <option value={4}>High</option>
                        <option value={5}>Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Staff Hours
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={pipeline.estimated_staff_hours}
                        onChange={(e) => updatePipeline(index, 'estimated_staff_hours', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center mt-4">
                    <input
                      type="checkbox"
                      id={`recurring-${index}`}
                      checked={pipeline.is_recurring}
                      onChange={(e) => updatePipeline(index, 'is_recurring', e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor={`recurring-${index}`} className="text-sm text-gray-700">
                      Recurring Pipeline
                    </label>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recurrence Days
                    </label>
                    <div className="flex gap-2">
                      {weekDays.map((day, dayIndex) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleRecurrenceDay('pipelines', index, dayIndex)}
                          className={`px-3 py-1 rounded text-sm ${pipeline.recurrence_days?.includes(dayIndex)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Skills
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {skills.map(skill => (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill('pipelines', index, skill.id)}
                          className={`px-3 py-1 rounded text-sm text-left ${pipeline.required_skill_ids?.includes(skill.id)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                          {skill.skill_name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={pipeline.notes}
                      onChange={(e) => updatePipeline(index, 'notes', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Options */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Generation Options</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="skip_existing"
                  checked={formData.options.skip_existing}
                  onChange={(e) => setFormData({ ...formData, options: { ...formData.options, skip_existing: e.target.checked } })}
                  className="mr-2"
                />
                <label htmlFor="skip_existing" className="text-sm text-gray-700">
                  Skip existing shifts
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_assign"
                  checked={formData.options.auto_assign}
                  onChange={(e) => setFormData({ ...formData, options: { ...formData.options, auto_assign: e.target.checked } })}
                  className="mr-2"
                />
                <label htmlFor="auto_assign" className="text-sm text-gray-700">
                  Auto-assign staff
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="balance_workload"
                  checked={formData.options.balance_workload}
                  onChange={(e) => setFormData({ ...formData, options: { ...formData.options, balance_workload: e.target.checked } })}
                  className="mr-2"
                />
                <label htmlFor="balance_workload" className="text-sm text-gray-700">
                  Balance workload
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allow_weekends"
                  checked={formData.options.allow_weekends}
                  onChange={(e) => setFormData({ ...formData, options: { ...formData.options, allow_weekends: e.target.checked } })}
                  className="mr-2"
                />
                <label htmlFor="allow_weekends" className="text-sm text-gray-700">
                  Allow weekends
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max hours per staff
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={formData.options.max_hours_per_staff}
                  onChange={(e) => setFormData({ ...formData, options: { ...formData.options, max_hours_per_staff: parseInt(e.target.value) } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max days per week
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={formData.options.max_days_per_week}
                  onChange={(e) => setFormData({ ...formData, options: { ...formData.options, max_days_per_week: parseInt(e.target.value) } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading || (formData.departments.length === 0 && formData.pipelines.length === 0)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating Shifts...' : 'Generate Shifts'}
          </button>
        </div>
      </form>

      {/* Template Modals */}
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSave={handleSaveAsTemplate}
        currentConfig={{
          departments: formData.departments,
          pipelines: formData.pipelines
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

      {/* Scheduler Modal */}
      {showSchedulerModal && createdShiftsSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowSchedulerModal(false)} />
          <div className="relative bg-white w-11/12 md:w-1/2 lg:w-1/3 rounded-lg shadow-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">Shifts Created Successfully!</h3>
              <button
                onClick={() => setShowSchedulerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!schedulerResult ? (
              <div className="space-y-4">
                {/* Success Summary */}
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-green-700">
                      {createdShiftsSummary.total} shifts created
                    </span>
                  </div>
                  <div className="text-sm text-green-600 space-y-1">
                    <div>• Department shifts: {createdShiftsSummary.department_shifts}</div>
                    <div>• Pipeline shifts: {createdShiftsSummary.pipeline_shifts}</div>
                    <div>• Date range: {createdShiftsSummary.start_date} to {createdShiftsSummary.end_date}</div>
                  </div>
                </div>

                {/* Scheduler Options */}
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    Would you like to run the automated scheduler to assign staff to these shifts?
                  </p>

                  {/* use_cpsat Toggle */}
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-700">Use CP-SAT Solver</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {useCpsat
                            ? 'More optimal assignments (slower)'
                            : 'Faster greedy algorithm (less optimal)'}
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={useCpsat}
                          onChange={(e) => setUseCpsat(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          onClick={() => setUseCpsat(!useCpsat)}
                          className={`w-11 h-6 rounded-full transition-colors ${useCpsat ? 'bg-indigo-600' : 'bg-gray-300'
                            }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${useCpsat ? 'translate-x-6' : 'translate-x-1'
                              } mt-1`}
                          />
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowSchedulerModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Skip for Now
                  </button>
                  <button
                    onClick={runScheduler}
                    disabled={schedulerLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {schedulerLoading ? 'Running...' : 'Run Scheduler'}
                  </button>
                </div>
              </div>
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
                          {schedulerResult.summary.total_assignments !== undefined && (
                            <div><strong>Total Assignments:</strong> {schedulerResult.summary.total_assignments}</div>
                          )}
                          {schedulerResult.summary.shifts_covered !== undefined && (
                            <div><strong>Shifts Covered:</strong> {schedulerResult.summary.shifts_covered}</div>
                          )}
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
                        Redirecting to dashboard...
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
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setSchedulerResult(null)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => {
                          setShowSchedulerModal(false)
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}
