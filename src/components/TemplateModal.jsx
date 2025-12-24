import React, { useState, useEffect } from 'react'

export default function TemplateModal({ isOpen, onClose, onSave, currentConfig }) {
    const [templateName, setTemplateName] = useState('')
    const [templateDescription, setTemplateDescription] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState(null)

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setTemplateName('')
            setTemplateDescription('')
            setError(null)
        }
    }, [isOpen])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!templateName.trim()) {
            setError('Template name is required')
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            await onSave({
                name: templateName.trim(),
                description: templateDescription.trim() || undefined,
                config: currentConfig
            })
            onClose()
        } catch (err) {
            setError(String(err))
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    const deptCount = currentConfig?.departments?.length || 0
    const pipelineCount = currentConfig?.pipelines?.length || 0

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Save as Template</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                            disabled={isSaving}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Template Name */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Template Name *
                        </label>
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="e.g., Standard Weekday Coverage"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isSaving}
                            autoFocus
                        />
                    </div>

                    {/* Template Description */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description (Optional)
                        </label>
                        <textarea
                            value={templateDescription}
                            onChange={(e) => setTemplateDescription(e.target.value)}
                            placeholder="Describe when to use this template..."
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isSaving}
                        />
                    </div>

                    {/* Config Preview */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Configuration Preview
                        </label>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <div className="text-sm text-gray-600">Department Rules</div>
                                    <div className="text-2xl font-semibold text-indigo-600">{deptCount}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600">Pipelines</div>
                                    <div className="text-2xl font-semibold text-green-600">{pipelineCount}</div>
                                </div>
                            </div>

                            {deptCount === 0 && pipelineCount === 0 && (
                                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                                    ⚠️ Warning: Template has no department rules or pipelines
                                </div>
                            )}

                            {/* Department Details */}
                            {deptCount > 0 && (
                                <div className="mt-3">
                                    <div className="text-xs font-medium text-gray-700 mb-1">Departments:</div>
                                    <div className="space-y-1">
                                        {currentConfig.departments.map((dept, idx) => (
                                            <div key={idx} className="text-xs text-gray-600 bg-white rounded px-2 py-1">
                                                Dept #{dept.department_id} • {dept.shift_types?.join(', ') || 'DAY'} •
                                                {dept.min_staff}-{dept.max_staff} staff •
                                                Priority {dept.priority || 3}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pipeline Details */}
                            {pipelineCount > 0 && (
                                <div className="mt-3">
                                    <div className="text-xs font-medium text-gray-700 mb-1">Pipelines:</div>
                                    <div className="space-y-1">
                                        {currentConfig.pipelines.map((pipe, idx) => (
                                            <div key={idx} className="text-xs text-gray-600 bg-white rounded px-2 py-1">
                                                {pipe.name} • Dept #{pipe.department_id} •
                                                {pipe.estimated_staff_hours}h • Priority {pipe.priority || 3}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !templateName.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
