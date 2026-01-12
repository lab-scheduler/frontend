import React from 'react'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
    if (!isOpen) return null

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl'
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black opacity-30"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Content */}
            <div className={`relative bg-white w-full ${sizeClasses[size]} rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto`}>
                {title && (
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                )}
                {children}
            </div>
        </div>
    )
}
