import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Topbar from './components/Topbar'
import RequireAuth from './routes/RequireAuth'
import OrgSlugValidator from './routes/OrgSlugValidator'
import LoginPage from './pages/LoginPage'
import RotationDashboard from './pages/RotationDashboardDemo'
import LeaveSubmissionPage from './pages/LeaveSubmissionPage'
import StaffManagementPage from './pages/StaffManagementPage'
import DepartmentAndSkills from './pages/DepartmentAndSkills'
import Scheduler from './pages/Scheduler'
import DashboardV2 from './pages/DashboardV2'
// import StaffListPage from './pages/StaffListPage'
// import DataEntryPage from './pages/DataEntryPage'

import StaffPreviewPage from './pages/StaffPreviewPage'
import { useOrganization } from './context/OrganizationContext'

function DefaultOrgRedirect() {
  const { currentOrg } = useOrganization()
  const defaultSlug = currentOrg?.slug || 'bio-dev'
  return <Navigate to={`/${defaultSlug}/dashboard`} replace />
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <div className="container mx-auto p-4">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Organization-scoped routes */}
          <Route path="/:orgSlug" element={<OrgSlugValidator />}>
            <Route path="dashboard" element={<RequireAuth><RotationDashboard /></RequireAuth>} />
            <Route path="leaves" element={<RequireAuth><LeaveSubmissionPage /></RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth><DashboardV2 /></RequireAuth>} />

            {/* Staff routes */}
            <Route path="staff/management" element={<RequireAuth><StaffManagementPage /></RequireAuth>} />
            <Route path="staff/portal" element={<RequireAuth><StaffPreviewPage /></RequireAuth>} />

            {/* Settings routes */}
            <Route path="settings/departments-skills" element={<RequireAuth><DepartmentAndSkills /></RequireAuth>} />

            {/* Scheduling routes */}
            <Route path="scheduling/scheduler" element={<RequireAuth><Scheduler /></RequireAuth>} />

            {/* Redirect org root to dashboard */}
            <Route path="" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Redirects for backward compatibility */}
          <Route path="/" element={<DefaultOrgRedirect />} />
          <Route path="/leaves" element={<DefaultOrgRedirect />} />
          <Route path="/staff" element={<DefaultOrgRedirect />} />
          <Route path="/departments-skills" element={<DefaultOrgRedirect />} />
          <Route path="/pipeline-generator" element={<DefaultOrgRedirect />} />
          <Route path="/staff-preview" element={<DefaultOrgRedirect />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </div>
  )
}