import React from 'react'

export default function Tabs({ tabs, activeTab, onChange, className = '' }) {
    return (
        <div className={`border-b border-gray-200 mb-6 ${className}`}>
            <nav className="-mb-px flex space-x-8">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
    )
}
