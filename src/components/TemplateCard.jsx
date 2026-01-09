import React, { useState } from 'react'

export default function TemplateCard({ template, onLoad, onApply, onDelete, onRunScheduler, isSelected }) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isApplying, setIsApplying] = useState(false)
    const [isRunningScheduler, setIsRunningScheduler] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await onDelete(template.id)
            setShowDeleteConfirm(false)
        } catch (err) {
            console.error('Delete failed:', err)
        } finally {
            setIsDeleting(false)
        }
    }

    const handleLoad = async () => {
        setIsLoading(true)
        try {
            await onLoad(template)
        } catch (err) {
            console.error('Load failed:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleApply = async () => {
        setIsApplying(true)
        try {
            await onApply(template)
        } catch (err) {
            console.error('Apply failed:', err)
        } finally {
            setIsApplying(false)
        }
    }

    const handleRunScheduler = async () => {
        if (!onRunScheduler) return
        setIsRunningScheduler(true)
        try {
            await onRunScheduler(template)
        } catch (err) {
            console.error('Run scheduler failed:', err)
        } finally {
            setIsRunningScheduler(false)
        }
    }

    const getSchedulerStatusBadge = () => {
        const status = template.config?.scheduler_status
        if (!status || status === 'pending') {
            return (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Pending
                </span>
            )
        } else if (status === 'completed') {
            return (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Scheduled
                </span>
            )
        } else if (status === 'failed') {
            return (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Failed
                </span>
            )
        }
        return null
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Never'
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const getPriorityColor = (config) => {
        // Get average priority from departments and pipelines
        const deptPriorities = config?.departments?.map(d => d.priority || 3) || []
        const pipePriorities = config?.pipelines?.map(p => p.priority || 3) || []
        const allPriorities = [...deptPriorities, ...pipePriorities]

        if (allPriorities.length === 0) return 'bg-gray-100 text-gray-700'

        const avgPriority = allPriorities.reduce((a, b) => a + b, 0) / allPriorities.length

        if (avgPriority >= 4.5) return 'bg-red-100 text-red-700'
        if (avgPriority >= 3.5) return 'bg-orange-100 text-orange-700'
        if (avgPriority >= 2.5) return 'bg-blue-100 text-blue-700'
        if (avgPriority >= 1.5) return 'bg-green-100 text-green-700'
        return 'bg-gray-100 text-gray-700'
    }

    const deptCount = template.config?.departments?.length || 0
    const pipelineCount = template.config?.pipelines?.length || 0

    return (
        <>
            <div
                className={`relative border rounded-lg p-4 bg-white hover:shadow-lg transition-all duration-200 ${isSelected ? 'ring-2 ring-indigo-500 shadow-md' : 'hover:border-indigo-300'
                    }`}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">{template.name}</h3>
                        {template.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {getSchedulerStatusBadge()}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(template.config)}`}>
                            {deptCount}D
                        </span>
                    </div>
                </div>

                {/* Date Range */}
                {template.config?.start_date && template.config?.end_date && (
                    <div className="mb-3 text-sm text-gray-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{template.config.start_date} → {template.config.end_date}</span>
                    </div>
                )}

                {/* Stats */}
                <div className="flex gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs">Used {template.use_count || 0}x</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">{formatDate(template.last_used)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={handleLoad}
                        disabled={isLoading}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Loading...' : 'Load'}
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={isApplying}
                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isApplying ? 'Applying...' : 'Apply'}
                    </button>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100 transition-colors"
                        title="Delete template"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                {/* Re-run Scheduler Button (if pending or failed) */}
                {onRunScheduler && template.config?.start_date && template.config?.end_date &&
                    template.config?.scheduler_status !== 'completed' && (
                        <button
                            onClick={handleRunScheduler}
                            disabled={isRunningScheduler}
                            className="w-full mt-2 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {isRunningScheduler ? 'Running...' : 'Run Scheduler'}
                        </button>
                    )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-2">Delete Template?</h3>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to delete "{template.name}"? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
