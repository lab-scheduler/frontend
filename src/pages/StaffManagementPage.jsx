import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { ORG_SLUG } from '../env'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'
import PageLayout from '../components/ui/PageLayout'
import Tabs from '../components/ui/Tabs'
import Alert from '../components/ui/Alert'

const ROLES = ['STAFF', 'MANAGER', 'ADMIN']

export default function StaffManagementPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('list')
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  return (
    <PageLayout
      title="Staff Management"
      description="Manage staff members and their information"
    >
      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'list', label: 'Staff List' },
          { id: 'add', label: 'Add Staff' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Error and Success Messages */}
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staff.map(member => (
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
    </PageLayout>
  )
}