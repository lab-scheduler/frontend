import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { apiFetch } from '../api/api'
import { ORG_SLUG } from '../env'
import { useAuth } from '../context/AuthContext'

export default function DepartmentAndSkills() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Data states
  const [departments, setDepartments] = useState([])
  const [skills, setSkills] = useState([])
  const [expandedDepts, setExpandedDepts] = useState(new Set())

  // Modal states
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [showSkillModal, setShowSkillModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  // Editing states
  const [editingDept, setEditingDept] = useState(null)
  const [editingSkill, setEditingSkill] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)

  // Form states
  const [deptForm, setDeptForm] = useState({ name: '' })
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
        apiFetch(`/api/v1/${ORG_SLUG}/departments`, {}, token).catch(() => ({ departments: [] })),
        apiFetch(`/api/v1/${ORG_SLUG}/skills`, {}, token).catch(() => ({ skills: [] }))
      ])

      // Handle various response formats
      let departmentsData = Array.isArray(deptRes) ? deptRes : (deptRes?.departments || deptRes?.data || [])
      let skillsData = Array.isArray(skillRes) ? skillRes : (skillRes?.skills || skillRes?.data || [])

      // Sort by ID descending (newest first)
      departmentsData = departmentsData.sort((a, b) => (b.id || 0) - (a.id || 0))
      skillsData = skillsData.sort((a, b) => (b.id || 0) - (a.id || 0))

      setDepartments(departmentsData)
      setSkills(skillsData)
    } catch (err) {
      setError(String(err))
      setDepartments([])
      setSkills([])
    } finally {
      setLoading(false)
    }
  }

  // Toggle department expansion
  const toggleDept = (deptId) => {
    const newExpanded = new Set(expandedDepts)
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId)
    } else {
      newExpanded.add(deptId)
    }
    setExpandedDepts(newExpanded)
  }

  // Department handlers
  const handleAddDept = () => {
    setEditingDept(null)
    setDeptForm({ name: '' })
    setShowDeptModal(true)
  }

  const handleEditDept = (dept) => {
    setEditingDept(dept)
    setDeptForm({ name: dept.name })
    setShowDeptModal(true)
  }

  const handleDeptSubmit = async (e) => {
    e.preventDefault()
    setModalLoading(true)
    setModalError(null)

    try {
      const payload = { name: deptForm.name }

      if (editingDept) {
        await apiFetch(`/api/v1/${ORG_SLUG}/departments/${editingDept.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }, token)
        setSuccess('Department updated successfully!')
      } else {
        await apiFetch(`/api/v1/${ORG_SLUG}/departments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }, token)
        setSuccess('Department added successfully!')
      }

      setShowDeptModal(false)
      setDeptForm({ name: '' })
      setEditingDept(null)
      loadData()
    } catch (err) {
      setModalError(String(err))
    } finally {
      setModalLoading(false)
    }
  }

  // Skill handlers
  const handleAddSkill = (deptId = null) => {
    setEditingSkill(null)
    setSkillForm({
      department_id: deptId || '',
      skill_name: '',
      required_certification: ''
    })
    setShowSkillModal(true)
  }

  const handleEditSkill = (skill) => {
    setEditingSkill(skill)
    setSkillForm({
      department_id: skill.department_id || '',
      skill_name: skill.skill_name || '',
      required_certification: skill.required_certification || ''
    })
    setShowSkillModal(true)
  }

  const handleSkillSubmit = async (e) => {
    e.preventDefault()
    setModalLoading(true)
    setModalError(null)

    try {
      const payload = {
        department_id: parseInt(skillForm.department_id) || null,
        skill_name: skillForm.skill_name,
        required_certification: skillForm.required_certification
      }

      if (editingSkill) {
        await apiFetch(`/api/v1/${ORG_SLUG}/skills/${editingSkill.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }, token)
        setSuccess('Skill updated successfully!')
      } else {
        await apiFetch(`/api/v1/${ORG_SLUG}/skills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }, token)
        setSuccess('Skill added successfully!')
      }

      setShowSkillModal(false)
      setSkillForm({ department_id: '', skill_name: '', required_certification: '' })
      setEditingSkill(null)
      loadData()
    } catch (err) {
      setModalError(String(err))
    } finally {
      setModalLoading(false)
    }
  }

  // Delete handlers
  const handleDelete = (item, type) => {
    setDeletingItem({ ...item, type })
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    setModalLoading(true)
    setModalError(null)

    try {
      const endpoint = deletingItem.type === 'department'
        ? `/api/v1/${ORG_SLUG}/departments/${deletingItem.id}`
        : `/api/v1/${ORG_SLUG}/skills/${deletingItem.id}`

      await apiFetch(endpoint, { method: 'DELETE' }, token)
      setSuccess(`${deletingItem.type === 'department' ? 'Department' : 'Skill'} deleted successfully!`)
      setShowDeleteModal(false)
      setDeletingItem(null)
      loadData()
    } catch (err) {
      setModalError(String(err))
    } finally {
      setModalLoading(false)
    }
  }

  // Get skills for a department
  const getSkillsForDept = (deptId) => {
    return skills.filter(s => s.department_id === deptId)
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold">Departments and Skills Management</h1>
        <p className="text-gray-600 mt-1">Manage departments and their associated skills</p>
      </div>

      {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}
      {success && <div className="text-green-600 bg-green-50 p-3 rounded">{success}</div>}

      <Card>
        <div className="flex justify-end items-center mb-4">
          <button
            onClick={handleAddDept}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Add Department
          </button>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-2">
            {departments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No departments found</p>
            ) : (
              departments.map((dept) => {
                const deptSkills = getSkillsForDept(dept.id)
                const isExpanded = expandedDepts.has(dept.id)

                return (
                  <div key={dept.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Department Row */}
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100">
                      <div className="flex items-center space-x-3 flex-1">
                        <button
                          onClick={() => toggleDept(dept.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <span className="font-semibold text-gray-900">{dept.name}</span>
                        <span className="text-sm text-gray-500">({deptSkills.length} skill{deptSkills.length !== 1 ? 's' : ''})</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAddSkill(dept.id)}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          title="Add skill to this department"
                        >
                          + Add Skill
                        </button>
                        <button
                          onClick={() => handleEditDept(dept)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit department"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(dept, 'department')}
                          className="text-red-600 hover:text-red-900"
                          title="Delete department"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Skills List (Nested) */}
                    {isExpanded && (
                      <div className="bg-white">
                        {deptSkills.length === 0 ? (
                          <div className="px-12 py-4 text-gray-500 text-sm">No skills in this department</div>
                        ) : (
                          deptSkills.map((skill) => (
                            <div key={skill.id} className="px-12 py-3 border-t border-gray-100 flex items-center justify-between hover:bg-gray-50">
                              <div className="flex-1">
                                <span className="text-gray-900 font-medium">{skill.skill_name}</span>
                                {skill.required_certification && (
                                  <span className="ml-3 text-sm text-gray-500">
                                    Certification: {skill.required_certification}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEditSkill(skill)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                  title="Edit skill"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(skill, 'skill')}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete skill"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </Card>

      {/* Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeptModal(false)}>
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editingDept ? 'Edit Department' : 'Add New Department'}</h3>

            {modalError && <div className="text-red-600 bg-red-50 p-2 rounded mb-4">{modalError}</div>}

            <form onSubmit={handleDeptSubmit} className="space-y-4">
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
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : (editingDept ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Skill Modal */}
      {showSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSkillModal(false)}>
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editingSkill ? 'Edit Skill' : 'Add New Skill'}</h3>

            {modalError && <div className="text-red-600 bg-red-50 p-2 rounded mb-4">{modalError}</div>}

            <form onSubmit={handleSkillSubmit} className="space-y-4">
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
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : (editingSkill ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteModal(false)}>
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Delete {deletingItem.type === 'department' ? 'Department' : 'Skill'}</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            {modalError && <div className="text-red-600 bg-red-50 p-2 rounded mb-4">{modalError}</div>}

            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{deletingItem.name || deletingItem.skill_name}</strong>?
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={modalLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {modalLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}