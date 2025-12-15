import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { apiFetch } from '../api/api'
import { ORG_SLUG } from '../env'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function PipelineGenerator() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Data states
  const [departments, setDepartments] = useState([])
  const [skills, setSkills] = useState([])

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

      setSuccess(`Successfully generated ${response.summary?.total || 0} shifts (${response.summary?.department_shifts_created || 0} department shifts, ${response.summary?.pipeline_shifts_created || 0} pipeline shifts)`)

      // Optionally redirect to dashboard after success
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const shiftTypes = ['DAY', 'EVENING', 'NIGHT']

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold">Pipeline Generator</h1>
        <p className="text-gray-600 mt-1">Generate recurring shifts and pipelines for your departments</p>
      </div>

      {error && <div className="text-red-600 bg-red-50 p-4 rounded">{error}</div>}
      {success && <div className="text-green-600 bg-green-50 p-4 rounded">{success}</div>}

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
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
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
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
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
                          className={`px-3 py-1 rounded text-sm ${
                            dept.shift_types?.includes(type)
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
                          className={`px-3 py-1 rounded text-sm ${
                            dept.recurrence_days?.includes(dayIndex)
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
                          className={`px-3 py-1 rounded text-sm text-left ${
                            dept.required_skill_ids?.includes(skill.id)
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
                          className={`px-3 py-1 rounded text-sm ${
                            pipeline.recurrence_days?.includes(dayIndex)
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
                          className={`px-3 py-1 rounded text-sm text-left ${
                            pipeline.required_skill_ids?.includes(skill.id)
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
                  onChange={(e) => setFormData({...formData, options: {...formData.options, skip_existing: e.target.checked}})}
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
                  onChange={(e) => setFormData({...formData, options: {...formData.options, auto_assign: e.target.checked}})}
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
                  onChange={(e) => setFormData({...formData, options: {...formData.options, balance_workload: e.target.checked}})}
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
                  onChange={(e) => setFormData({...formData, options: {...formData.options, allow_weekends: e.target.checked}})}
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
                  onChange={(e) => setFormData({...formData, options: {...formData.options, max_hours_per_staff: parseInt(e.target.value)}})}
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
                  onChange={(e) => setFormData({...formData, options: {...formData.options, max_days_per_week: parseInt(e.target.value)}})}
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
    </div>
  )
}