import React, { useEffect } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import { useOrganization } from '../context/OrganizationContext'

export default function OrgSlugValidator() {
    const { orgSlug } = useParams()
    const { availableOrgs, setCurrentOrg, currentOrg, loading } = useOrganization()
    const navigate = useNavigate()

    useEffect(() => {
        // Wait until organizations are loaded before validating
        if (loading) return

        // Find the organization by slug
        const org = availableOrgs.find(o => o.slug === orgSlug)

        if (!org) {
            // Invalid org-slug, redirect to login
            console.warn(`Invalid org-slug: ${orgSlug}`)
            navigate('/login', { replace: true })
        } else if (!currentOrg || currentOrg.slug !== orgSlug) {
            // Valid org-slug, set as current organization
            setCurrentOrg(org)
        }
    }, [orgSlug, availableOrgs, currentOrg, setCurrentOrg, navigate, loading])

    // Render children routes
    return <Outlet />
}
