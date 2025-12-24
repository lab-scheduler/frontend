import React, { useState } from 'react'

export default function ApplyTemplateModal({ isOpen, onClose, onApply, template }) {
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
    const [endDate, setEndDate] = useState(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    )
    const [isApplying, setIsApplying] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (new Date(startDate) >= new Date(endDate)) {
            setError('End date must be after start date')
            return
        }

        setIsApplying(true)
        setError(null)

        try {
            await onApply(template.id, startDate, endDate)
            onClose()
        } catch (err) {
            setError(String(err))
        } finally {
            setIsApplying(false)
        }
    }

    if (!isOpen || !template) return null

    const deptCount = template.config?.departments?.length || 0
    const pipelineCount = template.config?.pipelines?.length || 0

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full">
                <div className="border-b px-6 py-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Apply Template</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                            disabled={isApplying}
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

                    {/* Template Info */}
                    <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <h3 className="font-semibold text-indigo-900 mb-1">{template.name}</h3>
                        {template.description && (
                            <p className="text-sm text-indigo-700 mb-3">{template.description}</p>
                        )}
                        <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-1 text-indigo-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span>{deptCount} Department{deptCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-1 text-indigo-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span>{pipelineCount} Pipeline{pipelineCount !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Select Date Range for Shift Generation
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Start Date *</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    disabled={isApplying}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">End Date *</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    disabled={isApplying}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Info Message */}
                    <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                        <div className="flex gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                This will generate shifts based on the template configuration for the selected date range.
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isApplying}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isApplying}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isApplying ? 'Applying Template...' : 'Apply Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
