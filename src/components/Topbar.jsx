import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrganization } from '../context/OrganizationContext'
import ProfileDropdown from './ProfileDropdown'
import OrganizationSwitcher from './OrganizationSwitcher'

export default function Topbar() {
  const { user, token, logout } = useAuth()
  const { currentOrg } = useOrganization()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const prevTokenRef = useRef(token)

  // Build base path with org-slug
  const basePath = currentOrg?.slug ? `/${currentOrg.slug}` : '/bio-dev'

  // Navigate to login only when logging out (token goes from truthy to null)
  useEffect(() => {
    const prevToken = prevTokenRef.current
    prevTokenRef.current = token

    // Only navigate if we HAD a token and now we don't (logout scenario)
    if (prevToken && !token && location.pathname !== '/login') {
      navigate('/login', { replace: true })
    }
  }, [token, navigate, location.pathname])

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg">
      <div className="px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to={`${basePath}/dashboard`} className="flex items-center space-x-3">
            <img
              src="/sims_api.png"
              alt="Lab Scheduler Logo"
              className="h-12 w-auto object-contain"
            />
            <h1 className="text-2xl font-bold text-white">Lab Scheduler</h1>
          </Link>

          {/* Mobile button */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1">
            {[
              { to: `${basePath}/dashboard`, label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
              { to: `${basePath}/dashboard/analytics`, label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
              { to: `${basePath}/dashboard/scheduler`, label: "Scheduler", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
              { to: `${basePath}/dashboard/leaves`, label: "Leave Management", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
              { to: `${basePath}/dashboard/staff`, label: "Staff Management", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" },
              { to: `${basePath}/dashboard/departments-skills`, label: "Departments & Skills", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" }
            ].map((item) => {
              const isActive = location.pathname === item.to || (item.to !== `${basePath}/dashboard` && location.pathname.startsWith(item.to))
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${isActive
                    ? 'bg-white/20 text-white shadow-md'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                <OrganizationSwitcher />
                <ProfileDropdown user={user} logout={logout} />
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-white text-indigo-600 font-medium rounded-lg hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Dropdown */}
        {open && (
          <div className="md:hidden mt-4 pb-2 space-y-1">
            {[
              { to: `${basePath}/dashboard`, label: "Dashboard" },
              { to: `${basePath}/dashboard/analytics`, label: "Analytics" },
              { to: `${basePath}/dashboard/scheduler`, label: "Scheduler" },
              { to: `${basePath}/dashboard/leaves`, label: "Leave Management" },
              { to: `${basePath}/dashboard/staff`, label: "Staff Management" },
              { to: `${basePath}/dashboard/departments-skills`, label: "Departments & Skills" }
            ].map((item) => {
              const isActive = location.pathname === item.to || location.pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${isActive
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </Link>
              )
            })}

            <div className="pt-2 mt-2 border-t border-white/20">
              {user ? (
                <div className="px-4 pb-2 space-y-2">
                  <p className="text-sm font-medium text-white mb-1">{user.username || user.employee_id}</p>
                  <p className="text-xs text-white/70 mb-3">{user.role}</p>

                  {/* Organization Switcher for Mobile */}
                  {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
                    <div className="mb-3">
                      <OrganizationSwitcher />
                    </div>
                  )}

                  {/* Profile Menu Options */}
                  <Link
                    to={`${basePath}/dashboard/staff-preview`}
                    onClick={() => setOpen(false)}
                    className="block w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors text-center mb-2"
                  >
                    Staff Page Preview
                  </Link>

                  <button
                    onClick={() => { logout(); setOpen(false) }}
                    className="w-full px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 bg-white text-indigo-600 font-medium rounded-lg text-center hover:bg-gray-100 transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}