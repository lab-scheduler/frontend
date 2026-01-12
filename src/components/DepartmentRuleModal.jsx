import React, { useState } from 'react'

export default function DepartmentRuleModal({ isOpen, onClose, onSave, rule, departments, skills }) {
    const [formData, setFormData] = useState(rule || {
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
