import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiFetch } from '../api/api'
import { useAuth } from './AuthContext'
import { ORG_SLUG } from '../env'

const OrganizationContext = createContext(null)

export function useOrganization() {
  return useContext(OrganizationContext)
}

export function OrganizationProvider({ children }) {
  const { token } = useAuth()
  const [currentOrg, setCurrentOrg] = useState(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem('selected_org')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    return null
  })
  const [availableOrgs, setAvailableOrgs] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch available organizations when user is authenticated
  useEffect(() => {
    async function fetchOrganizations() {
      if (!token) {
        setAvailableOrgs([])
        setLoading(false)
        return
      }

      try {
        const orgs = await apiFetch('/api/v1/organizations', {}, token)
        const orgList = Array.isArray(orgs) ? orgs : (orgs?.organizations || orgs?.data || [])
        setAvailableOrgs(orgList)

        // If no current org is set, use the first one or the default from env
        if (!currentOrg && orgList.length > 0) {
          const defaultOrg = orgList.find(o => o.slug === ORG_SLUG) || orgList[0]
          setCurrentOrg(defaultOrg)
          localStorage.setItem('selected_org', JSON.stringify(defaultOrg))
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error)
        // Fallback to env default if API fails
        if (!currentOrg) {
          const fallback = { id: 0, slug: ORG_SLUG, name: ORG_SLUG }
          setCurrentOrg(fallback)
          setAvailableOrgs([fallback])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchOrganizations()
  }, [token])

  // Update localStorage when currentOrg changes
  const switchOrganization = (org) => {
    setCurrentOrg(org)
    localStorage.setItem('selected_org', JSON.stringify(org))
  }

  const value = {
    currentOrg,
    setCurrentOrg: switchOrganization,
    availableOrgs,
    loading
  }

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}
