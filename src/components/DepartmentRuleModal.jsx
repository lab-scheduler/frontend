import React, { useState, useEffect } from 'react'

export default function DepartmentRuleModal({ isOpen, onClose, onSave, rule, departments, skills, staff, staffSkills }) {
    // Initialize with defaults - will be overwritten by useEffect when rule changes
    const [formData, setFormData] = useState({
        department_id: '',
        required_skill_ids: [],
        shift_types: ['DAY'],
        min_staff: 1,
        max_staff: 2,
        priority: 3,
        estimated_hours: 8,
        recurrence_days: [0, 1, 2, 3, 4],
        notes: ''
    })

    const [errors, setErrors] = useState({})

    // CRITICAL FIX: Sync formData with rule prop when it changes
    // This fixes the bug where configuration disappears when clicking edit
    useEffect(() => {
        if (rule) {
            // Deep clone the rule to avoid reference issues
            setFormData({
                department_id: rule.department_id || '',
                required_skill_ids: rule.required_skill_ids || [],
                shift_types: rule.shift_types || ['DAY'],
                min_staff: rule.min_staff ?? 1,
                max_staff: rule.max_staff ?? 2,
                priority: rule.priority ?? 3,
                estimated_hours: rule.estimated_hours ?? 8,
                recurrence_days: rule.recurrence_days || [0, 1, 2, 3, 4],
                notes: rule.notes || ''
            })
        } else {
            // Reset to defaults when adding new rule
            setFormData({
                department_id: '',
                required_skill_ids: [],
                shift_types: ['DAY'],
                min_staff: 1,
                max_staff: 2,
                priority: 3,
                estimated_hours: 8,
                recurrence_days: [0, 1, 2, 3, 4],
                notes: ''
            })
        }
    }, [rule, isOpen])

    // Calculate staff availability for selected skills
    // Staff are assigned to skills via the staffSkills cache: {employee_id: [skill_ids]}
    const getStaffCountForSkill = (skillId) => {
        if (!staff || !Array.isArray(staff) || !staffSkills) {
            return 0
        }

        // Count staff who have this skill using the cached staffSkills data
        const count = staff.filter(s => {
            // Use employee_id first, then id as fallback
            const staffId = s.employee_id || s.id
            const skillIds = staffSkills[staffId] || []
            // Handle both number and string skill IDs
            return skillIds.some(id => String(id) === String(skillId) || Number(id) === Number(skillId))
        }).length

        return count
    }

    // Get staff names for a specific skill (for detailed view)
    const getStaffForSkill = (skillId) => {
        if (!staff || !Array.isArray(staff) || !staffSkills) return []
        return staff.filter(s => {
            const staffId = s.employee_id || s.id
            const skillIds = staffSkills[staffId] || []
            return skillIds.some(id => String(id) === String(skillId) || Number(id) === Number(skillId))
        }).map(s => s.full_name || s.name || s.employee_id || 'Unknown')
    }

    // Get staff with ALL selected skills (intersection)
    const getStaffWithAllSelectedSkills = () => {
        if (!staff || !Array.isArray(staff) || !staffSkills || formData.required_skill_ids.length === 0) {
            return []
        }

        const result = staff.filter(s => {
            const staffId = s.employee_id || s.id
            const skillIds = staffSkills[staffId] || []

            // Check if staff has ALL required skills (handle type conversion)
            return formData.required_skill_ids.every(requiredSkillId =>
                skillIds.some(id => String(id) === String(requiredSkillId) || Number(id) === Number(requiredSkillId))
            )
        })

        return result
    }

    // Get staff with ANY of the selected skills (union)
    const getStaffWithAnySelectedSkill = () => {
        if (!staff || !Array.isArray(staff) || !staffSkills || formData.required_skill_ids.length === 0) {
            return []
        }

        const result = staff.filter(s => {
            const staffId = s.employee_id || s.id
            const skillIds = staffSkills[staffId] || []

            // Check if staff has ANY of the required skills
            return formData.required_skill_ids.some(requiredSkillId =>
                skillIds.some(id => String(id) === String(requiredSkillId) || Number(id) === Number(requiredSkillId))
            )
        })

        return result
    }

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const shiftTypes = ['DAY', 'EVENING', 'NIGHT']

    // Quick presets
    const PRESETS = {
        STANDARD_WEEKDAY: {
            shift_types: ['DAY'],
            recurrence_days: [0, 1, 2, 3, 4],
            min_staff: 1,
            max_staff: 2,
            estimated_hours: 8,
            priority: 3
        },
        COVERAGE_24_7: {
            shift_types: ['DAY', 'EVENING', 'NIGHT'],
            recurrence_days: [0, 1, 2, 3, 4, 5, 6],
            min_staff: 2,
            max_staff: 4,
            estimated_hours: 8,
            priority: 4
        },
        WEEKEND_ONLY: {
            shift_types: ['DAY'],
            recurrence_days: [5, 6],
            min_staff: 1,
            max_staff: 2,
            estimated_hours: 8,
            priority: 3
        }
    }

    function applyPreset(presetKey) {
        setFormData({
            ...formData,
            ...PRESETS[presetKey]
        })
    }

    function toggleShiftType(type) {
        const types = formData.shift_types || []
        if (types.includes(type)) {
            setFormData({ ...formData, shift_types: types.filter(t => t !== type) })
        } else {
            setFormData({ ...formData, shift_types: [...types, type] })
        }
    }

    function toggleRecurrenceDay(dayIndex) {
        const days = formData.recurrence_days || []
        if (days.includes(dayIndex)) {
            const filtered = days.filter(d => d !== dayIndex)
            setFormData({ ...formData, recurrence_days: filtered })
        } else {
            const updated = [...days, dayIndex].sort()
            setFormData({ ...formData, recurrence_days: updated })
        }
    }

    function toggleSkill(skillId) {
        const skills = formData.required_skill_ids || []
        if (skills.includes(skillId)) {
            setFormData({ ...formData, required_skill_ids: skills.filter(s => s !== skillId) })
        } else {
            setFormData({ ...formData, required_skill_ids: [...skills, skillId] })
        }
    }

    // Bulk selection functions
    function selectWeekdays() {
        setFormData({ ...formData, recurrence_days: [0, 1, 2, 3, 4] })
    }

    function selectWeekend() {
        setFormData({ ...formData, recurrence_days: [5, 6] })
    }

    function selectAllDays() {
        setFormData({ ...formData, recurrence_days: [0, 1, 2, 3, 4, 5, 6] })
    }

    function selectAllShifts() {
        setFormData({ ...formData, shift_types: ['DAY', 'EVENING', 'NIGHT'] })
    }

    function selectAllSkills() {
        setFormData({ ...formData, required_skill_ids: skills.map(s => s.id) })
    }

    function clearAllSkills() {
        setFormData({ ...formData, required_skill_ids: [] })
    }

    function validate() {
        const newErrors = {}
        if (!formData.department_id) newErrors.department_id = 'Department is required'
        if (!formData.shift_types || formData.shift_types.length === 0) newErrors.shift_types = 'Select at least one shift type'
        if (!formData.recurrence_days || formData.recurrence_days.length === 0) newErrors.recurrence_days = 'Select at least one day'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    function handleSave() {
        if (validate()) {
            onSave(formData)
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {rule ? 'Edit Department Rule' : 'Add Department Rule'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Quick Presets */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <h3 className="font-semibold text-indigo-900">Quick Presets</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => applyPreset('STANDARD_WEEKDAY')}
                                className="px-3 py-2 bg-white border-2 border-indigo-300 text-indigo-700 rounded-md hover:bg-indigo-50 text-sm font-medium transition-all hover:scale-105"
                            >
                                📅 Standard Weekday
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('COVERAGE_24_7')}
                                className="px-3 py-2 bg-white border-2 border-purple-300 text-purple-700 rounded-md hover:bg-purple-50 text-sm font-medium transition-all hover:scale-105"
                            >
                                🌙 24/7 Coverage
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('WEEKEND_ONLY')}
                                className="px-3 py-2 bg-white border-2 border-green-300 text-green-700 rounded-md hover:bg-green-50 text-sm font-medium transition-all hover:scale-105"
                            >
                                🎉 Weekend Only
                            </button>
                        </div>
                        <p className="text-xs text-indigo-600 mt-2">Click a preset to auto-fill common configurations</p>
                    </div>
                    {/* Department and Priority */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Department *
                            </label>
                            <select
                                value={formData.department_id}
                                onChange={(e) => setFormData({ ...formData, department_id: parseInt(e.target.value) })}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.department_id ? 'border-red-500' : 'border-gray-300'}`}
                            >
                                <option value="">Select Department</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            {errors.department_id && <p className="text-red-500 text-xs mt-1">{errors.department_id}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Priority
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
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

                    {/* Staff Availability Info */}
                    {formData.department_id && (
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <h3 className="font-semibold text-blue-900">Staff Availability by Skill</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const detailSection = document.getElementById('staff-detail-section')
                                        detailSection?.classList.toggle('hidden')
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    {formData.required_skill_ids.length > 0 ? 'Show Staff Details ▼' : 'Select skills to see details'}
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="grid md:grid-cols-2 gap-4 text-sm mb-3">
                                {formData.required_skill_ids.length === 0 ? (
                                    <div className="text-gray-600 italic">
                                        Select skills below to see available staff
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <span className="text-gray-600">Staff with ANY selected skill:</span>
                                            <span className="ml-2 font-semibold text-blue-700">{getStaffWithAnySelectedSkill().length} staff</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Staff with ALL selected skills:</span>
                                            <span className="ml-2 font-semibold text-indigo-700">{getStaffWithAllSelectedSkills().length} staff</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Individual skill breakdown */}
                            {formData.required_skill_ids.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-xs text-gray-600 mb-2">Staff per skill:</div>
                                    <div className="grid md:grid-cols-3 gap-2">
                                        {formData.required_skill_ids.map(skillId => {
                                            const skill = skills.find(s => s.id === skillId)
                                            const count = getStaffCountForSkill(skillId)
                                            return (
                                                <div key={skillId} className="bg-white px-3 py-2 rounded border border-gray-200">
                                                    <div className="font-medium text-sm text-gray-800">{skill?.skill_name || 'Unknown'}</div>
                                                    <div className={`text-lg font-bold ${count >= formData.min_staff ? 'text-green-600' : 'text-orange-600'}`}>
                                                        {count} staff
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Detailed staff list (collapsible) */}
                            {formData.required_skill_ids.length > 0 && (
                                <div id="staff-detail-section" className="hidden">
                                    <div className="border-t border-blue-200 pt-3 mt-3">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Staff with ALL selected skills:</div>
                                        {getStaffWithAllSelectedSkills().length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {getStaffWithAllSelectedSkills().map(s => (
                                                    <span key={s.employee_id || s.id} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                        {s.full_name || s.name || s.employee_id}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-orange-600 italic">No staff have all selected skills</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Warning for insufficient staff */}
                            {formData.required_skill_ids.length > 0 && getStaffWithAllSelectedSkills().length < formData.min_staff && (
                                <div className="mt-3 p-2 bg-orange-100 border border-orange-300 rounded-md">
                                    <p className="text-xs text-orange-800">
                                        ⚠️ Warning: You require {formData.min_staff} staff but only {getStaffWithAllSelectedSkills().length} staff have all selected skills.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Staffing */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Min Staff
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.min_staff}
                                onChange={(e) => setFormData({ ...formData, min_staff: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Staff
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.max_staff}
                                onChange={(e) => setFormData({ ...formData, max_staff: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Estimated Hours
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="24"
                                value={formData.estimated_hours}
                                onChange={(e) => setFormData({ ...formData, estimated_hours: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Shift Types */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Shift Types *
                            </label>
                            <button
                                type="button"
                                onClick={selectAllShifts}
                                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                Select All
                            </button>
                        </div>
                        <div className="flex gap-2">
                            {shiftTypes.map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => toggleShiftType(type)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${formData.shift_types?.includes(type)
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        {errors.shift_types && <p className="text-red-500 text-xs mt-1">{errors.shift_types}</p>}
                    </div>

                    {/* Recurrence Days */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Recurrence Days *
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={selectWeekdays}
                                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                                >
                                    Weekdays
                                </button>
                                <button
                                    type="button"
                                    onClick={selectWeekend}
                                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                                >
                                    Weekend
                                </button>
                                <button
                                    type="button"
                                    onClick={selectAllDays}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    All Days
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {weekDays.map((day, index) => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleRecurrenceDay(index)}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${formData.recurrence_days?.includes(index)
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                        {errors.recurrence_days && <p className="text-red-500 text-xs mt-1">{errors.recurrence_days}</p>}
                    </div>

                    {/* Required Skills */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Required Skills
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={selectAllSkills}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={clearAllSkills}
                                    className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-md">
                            {skills.map(skill => (
                                <button
                                    key={skill.id}
                                    type="button"
                                    onClick={() => toggleSkill(skill.id)}
                                    className={`px-3 py-2 rounded text-sm text-left transition-colors ${formData.required_skill_ids?.includes(skill.id)
                                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {skill.skill_name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Add any additional notes or comments..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
                    >
                        Save Rule
                    </button>
                </div>
            </div>
        </div>
    )
}
