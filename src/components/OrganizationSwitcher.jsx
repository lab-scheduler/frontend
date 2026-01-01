import React, { useState, useRef, useEffect } from 'react'
import { useOrganization } from '../context/OrganizationContext'
import { useAuth } from '../context/AuthContext'

export default function OrganizationSwitcher() {
    const { user } = useAuth()
    const { currentOrg, availableOrgs, setCurrentOrg, loading } = useOrganization()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    // Only show for ADMIN and MANAGER roles
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
        return null
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const handleOrgSwitch = (org) => {
        setCurrentOrg(org)
        setIsOpen(false)
        // Reload the page to refresh all data with new organization
        window.location.reload()
    }

    if (loading || !currentOrg) {
        return null
    }

    // Generate color based on org name
    const getOrgColor = (name) => {
        const colors = [
            'bg-blue-500',
            'bg-purple-500',
            'bg-pink-500',
            'bg-green-500',
            'bg-yellow-500',
            'bg-red-500',
            'bg-indigo-500',
            'bg-teal-500'
        ]
        const index = (name?.charCodeAt(0) || 0) % colors.length
        return colors[index]
    }

    // Get initials from org name
    const getInitials = (name) => {
        if (!name) return '?'
        const words = name.split(' ')
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase()
        }
        return name.substring(0, 2).toUpperCase()
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Organization Selector Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
                <div className={`w-8 h-8 ${getOrgColor(currentOrg.name)} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                    {getInitials(currentOrg.name)}
                </div>
                <div className="hidden md:block text-left">
                    <p className="text-xs text-white/70">Organization</p>
                    <p className="text-sm font-medium text-white">{currentOrg.name}</p>
                </div>
                <svg className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Switch Organization</p>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {availableOrgs.map((org) => {
                            const isSelected = org.id === currentOrg.id
                            return (
                                <button
                                    key={org.id}
                                    onClick={() => !isSelected && handleOrgSwitch(org)}
                                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors ${isSelected ? 'bg-indigo-50' : ''
                                        }`}
                                    disabled={isSelected}
                                >
                                    <div className={`w-10 h-10 ${getOrgColor(org.name)} rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0`}>
                                        {getInitials(org.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-medium truncate ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                                            {org.name}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{org.slug}</p>
                                    </div>
                                    {isSelected && (
                                        <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
