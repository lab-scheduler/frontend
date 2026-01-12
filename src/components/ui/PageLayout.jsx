import React from 'react'

export default function PageLayout({ title, description, children, className = '' }) {
    return (
        <div className={`p-6 bg-gray-50 min-h-screen ${className}`}>
            {(title || description) && (
                <div className="mb-6">
                    {title && <h1 className="text-3xl font-bold text-gray-900">{title}</h1>}
                    {description && <p className="text-gray-600 mt-1">{description}</p>}
                </div>
            )}
            {children}
        </div>
    )
}
