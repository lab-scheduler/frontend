import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { apiFetch } from '../api/api'
import { ORG_SLUG } from '../env'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/ui/PageLayout'
import Tabs from '../components/ui/Tabs'
import Alert from '../components/ui/Alert'
import Modal from '../components/ui/Modal'

export default function DepartmentAndSkills() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('departments')

  // Data states
  const [departments, setDepartments] = useState([])
  const [skills, setSkills] = useState([])

  // Modal states
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [showSkillModal, setShowSkillModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  // Form states
  const [deptForm, setDeptForm] = useState({
    name: ''
  })

  const [skillForm, setSkillForm] = useState({
    department_id: '',
    skill_name: '',
    required_certification: ''
  })

  // Load data
  useEffect(() => {
    loadData()
  }, [token])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [deptRes, skillRes] = await Promise.all([
        apiFetch(`/api/v1/${ORG_SLUG}/departments`, {}, token).catch(err => {
          console.error('Departments API error:', err)
          return { departments: [] } // Return empty array on error
        }),
        apiFetch(`/api/v1/${ORG_SLUG}/skills`, {}, token).catch(err => {
          console.error('Skills API error:', err)
          return { skills: [] } // Return empty array on error
        })
      ])

      // Handle various response formats for departments
      let departmentsData = []
      if (Array.isArray(deptRes)) {
        departmentsData = deptRes
      } else if (deptRes?.departments && Array.isArray(deptRes.departments)) {
        departmentsData = deptRes.departments
      } else if (deptRes?.data && Array.isArray(deptRes.data)) {
        departmentsData = deptRes.data
      }

      // Handle various response formats for skills
      let skillsData = []
      if (Array.isArray(skillRes)) {
        skillsData = skillRes
      } else if (skillRes?.skills && Array.isArray(skillRes.skills)) {
        skillsData = skillRes.skills
      } else if (skillRes?.data && Array.isArray(skillRes.data)) {
        skillsData = skillRes.data
      }

      setDepartments(departmentsData)
      setSkills(skillsData)
    } catch (err) {
      console.error('Error loading data:', err)
      setError(String(err))
      // Set empty arrays even on error to prevent undefined issues
      setDepartments([])
      setSkills([])
    } finally {
      setLoading(false)
    }
  }

  // Department handlers
  async function handleAddDepartment(e) {
    e.preventDefault()
    setModalLoading(true)
    setModalError(null)

    try {
      const payload = {
        name: deptForm.name
      }

      await apiFetch(`/api/v1/${ORG_SLUG}/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }, token)

      setShowDeptModal(false)
      setDeptForm({
        name: ''
      })
      loadData() // Reload data
    } catch (err) {
      setModalError(String(err))
    } finally {
      setModalLoading(false)
    }
  }

  // Skills handlers
  async function handleAddSkill(e) {
    e.preventDefault()
    setModalLoading(true)
    setModalError(null)

    try {
      const payload = {
        department_id: parseInt(skillForm.department_id) || null,
        skill_name: skillForm.skill_name,
        required_certification: skillForm.required_certification
      }

      await apiFetch(`/api/v1/${ORG_SLUG}/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }, token)

      setShowSkillModal(false)
      setSkillForm({
        department_id: '',
        skill_name: '',
        required_certification: ''
      })
      loadData() // Reload data
    } catch (err) {
      setModalError(String(err))
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <PageLayout
      title="Departments and Skills Management"
      description="Manage departments and skills for the organization"
    >
      {error && <Alert type="error">{error}</Alert>}

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'departments', label: 'Departments' },
          { id: 'skills', label: 'Skills' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Departments</h2>
            <button
              onClick={() => setShowDeptModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Add Department
            </button>
          </div>

          {loading ? (
            <LoadingSkeleton className="h-64 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan="1" className="px-6 py-4 text-center text-gray-500">
                        No departments found
                      </td>
                    </tr>
                  ) : (
                    departments.map((dept) => (
                      <tr key={dept.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {dept.name}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Skills</h2>
            <button
              onClick={() => setShowSkillModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Add Skill
            </button>
          </div>

          {loading ? (
            <LoadingSkeleton className="h-64 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skill Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Required Certification
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {skills.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                        No skills found
                      </td>
                    </tr>
                  ) : (
                    skills.map((skill) => (
                      <tr key={skill.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {skill.skill_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {skill.department_id ?
                            departments.find(d => d.id === skill.department_id)?.name || `Dept ID: ${skill.department_id}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {skill.required_certification || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Add Department Modal */}
      <Modal
        isOpen={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        title="Add New Department"
      >
        {modalError && <Alert type="error">{modalError}</Alert>}

        <form onSubmit={handleAddDepartment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department Name *
            </label>
            <input
              type="text"
              required
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Laboratory, Radiology, Emergency"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowDeptModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {modalLoading ? 'Adding...' : 'Add Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Skill Modal */}
      <Modal
        isOpen={showSkillModal}
        onClose={() => setShowSkillModal(false)}
        title="Add New Skill"
      >
        {modalError && <Alert type="error">{modalError}</Alert>}

        <form onSubmit={handleAddSkill} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={skillForm.department_id}
              onChange={(e) => setSkillForm({ ...skillForm, department_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a department (optional)</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skill Name *
            </label>
            <input
              type="text"
              required
              value={skillForm.skill_name}
              onChange={(e) => setSkillForm({ ...skillForm, skill_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required Certification
            </label>
            <input
              type="text"
              value={skillForm.required_certification}
              onChange={(e) => setSkillForm({ ...skillForm, required_certification: e.target.value })}
              placeholder="e.g., Phlebotomy Certificate, BLS Certification"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Enter any required certifications for this skill</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowSkillModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {modalLoading ? 'Adding...' : 'Add Skill'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  )
}