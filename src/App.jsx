import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Topbar from './components/Topbar'
import RequireAuth from './routes/RequireAuth'
import LoginPage from './pages/LoginPage'
import RotationDashboard from './pages/RotationDashboardDemo'
import LeaveSubmissionPage from './pages/LeaveSubmissionPage'
import StaffManagementPage from './pages/StaffManagementPage'
import DepartmentAndSkills from './pages/DepartmentAndSkills'
import PipelineGenerator from './pages/PipelineGenerator'
// import StaffListPage from './pages/StaffListPage'
// import DataEntryPage from './pages/DataEntryPage'

export default function App(){
  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><RotationDashboard /></RequireAuth>} />
          <Route path="/leaves" element={<RequireAuth><LeaveSubmissionPage /></RequireAuth>} />
          <Route path="/staff" element={<RequireAuth><StaffManagementPage /></RequireAuth>} />
          <Route path="/departments-skills" element={<RequireAuth><DepartmentAndSkills /></RequireAuth>} />
          <Route path="/pipeline-generator" element={<RequireAuth><PipelineGenerator /></RequireAuth>} />
          {/* <Route path="/staff" element={<RequireAuth><StaffListPage /></RequireAuth>} />/ */}
          {/* <Route path="/entry" element={<RequireAuth allowedRoles={["MANAGER","ADMIN"]}><DataEntryPage /></RequireAuth>} /> */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}