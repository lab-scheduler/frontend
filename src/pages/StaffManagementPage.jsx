import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { ORG_SLUG } from '../env'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'

const ROLES = ['STAFF', 'MANAGER', 'ADMIN']

export default function StaffManagementPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('list')
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [deletingStaff, setDeletingStaff] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    org_id: 0,
    full_name: '',
    email: '',
    phone: '',
    role: 'STAFF',
    max_hours_per_week: 40,
    is_supervisor: false
  })

  // Fetch all staff
  const fetchStaff = async () => {
    try {
      setLoading(true)
      const response = await apiFetch(`/api/v1/${ORG_SLUG}/staff`, {}, token)
      // Handle different response formats
      if (Array.isArray(response)) {
        setStaff(response)
      } else if (response && Array.isArray(response.staff)) {
        setStaff(response.staff)
      } else if (response && Array.isArray(response.data)) {
        setStaff(response.data)
      } else {
        console.warn('Unexpected API response format:', response)
        setStaff([])
      }
    } catch (err) {
      setError(err.message)
      setStaff([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [token])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
        type === 'number' ? Number(value) :
          value
    }))
  }

  // Handle staff submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      setLoading(true)
      await apiFetch(`/api/v1/${ORG_SLUG}/staff`, {
        method: 'POST',
        body: JSON.stringify(formData)
      }, token)

      setSuccess('Staff member added successfully!')
      setFormData({
        employee_id: '',
        org_id: 0,
        full_name: '',
        email: '',
        phone: '',
        role: 'STAFF',
        max_hours_per_week: 40,
        is_supervisor: false
      })
      fetchStaff() // Refresh the staff list
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle edit staff
  const handleEditClick = (member) => {
    setEditingStaff(member)
    setFormData({
      employee_id: member.employee_id,
      org_id: member.org_id || 0,
      full_name: member.full_name || '',
      email: member.email || '',
      phone: member.phone || '',
      role: member.role || 'STAFF',
      max_hours_per_week: member.max_hours_per_week || 40,
      is_supervisor: member.is_supervisor || false
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      setLoading(true)
      await apiFetch(`/api/v1/${ORG_SLUG}/staff/${editingStaff.employee_id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData)
      }, token)

      setSuccess('Staff member updated successfully!')
      setShowEditModal(false)
      setEditingStaff(null)
      fetchStaff() // Refresh the staff list
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle delete staff
  const handleDeleteClick = (member) => {
    setDeletingStaff(member)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    setError('')
    setSuccess('')

    try {
      setLoading(true)
      await apiFetch(`/api/v1/${ORG_SLUG}/staff/${deletingStaff.employee_id}`, {
        method: 'DELETE'
      }, token)

      setSuccess('Staff member deleted successfully!')
      setShowDeleteModal(false)
      setDeletingStaff(null)
      fetchStaff() // Refresh the staff list
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Sort staff by employee_id
  const sortedStaff = [...staff].sort((a, b) => {
    const idA = String(a.employee_id || '')
    const idB = String(b.employee_id || '')
    return idA.localeCompare(idB, undefined, { numeric: true })
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Staff Management</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'list'
            ? 'border-b-2 border-indigo-600 text-indigo-600'
            : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('list')}
        >
          Staff List
        </button>
        <button
          className={`px-4 py-2 font-medium ml-6 ${activeTab === 'add'
            ? 'border-b-2 border-indigo-600 text-indigo-600'
            : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('add')}
        >
          Add Staff
        </button>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Staff List Tab */}
      {activeTab === 'list' && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">All Staff Members</h2>

          {loading ? (
            <LoadingSkeleton />
          ) : staff.length === 0 ? (
            <p className="text-gray-500">No staff members found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Full Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max Hours/Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supervisor
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedStaff.map(member => (
                    <tr key={member.id || member.employee_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {member.employee_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${member.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                          member.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.max_hours_per_week || 40}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.is_supervisor ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditClick(member)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="Edit staff member"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(member)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete staff member"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Add Staff Tab */}
      {activeTab === 'add' && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Add New Staff Member</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization ID
                </label>
                <input
                  type="number"
                  name="org_id"
                  value={formData.org_id}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  min="0"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className="w-full border border-gray-300 p-2 rounded-md"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 p-2 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 p-2 rounded-md"
                >
                  {ROLES.map(role => (
                    <option key={role} value={role}>
                      {role.charAt(0) + role.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Hours Per Week
                </label>
                <input
                  type="number"
                  name="max_hours_per_week"
                  value={formData.max_hours_per_week}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  min="0"
                  max="168"
                  required
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_supervisor"
                id="is_supervisor"
                checked={formData.is_supervisor}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="is_supervisor" className="ml-2 block text-sm text-gray-900">
                This staff member is a supervisor
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Staff Member'}
            </button>
          </form>
        </Card>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && editingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Edit Staff Member</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    name="employee_id"
                    value={formData.employee_id}
                    className="w-full border border-gray-300 p-2 rounded-md bg-gray-100"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization ID
                  </label>
                  <input
                    type="number"
                    name="org_id"
                    value={formData.org_id}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-2 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-2 rounded-md"
                  >
                    {ROLES.map(role => (
                      <option key={role} value={role}>
                        {role.charAt(0) + role.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Hours Per Week
                  </label>
                  <input
                    type="number"
                    name="max_hours_per_week"
                    value={formData.max_hours_per_week}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    min="0"
                    max="168"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_supervisor"
                  id="edit_is_supervisor"
                  checked={formData.is_supervisor}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="edit_is_supervisor" className="ml-2 block text-sm text-gray-900">
                  This staff member is a supervisor
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Delete Staff Member</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{deletingStaff.full_name}</strong> (ID: {deletingStaff.employee_id})?
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
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}