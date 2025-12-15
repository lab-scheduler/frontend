import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { ORG_SLUG } from '../env'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'

const LEAVE_TYPES = ['ANNUAL', 'SICK', 'EMERGENCY', 'URGENT', 'PLANNED']

export default function LeaveSubmissionPage() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('submit')
  const [leaves, setLeaves] = useState([])
  const [allLeaves, setAllLeaves] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    employee_id: user?.employee_id || '',
    start_date: '',
    end_date: '',
    leave_type: 'ANNUAL',
    reason: ''
  })

  // Fetch all leaves
  const fetchAllLeaves = async () => {
    try {
      setLoading(true)
      const response = await apiFetch(`/api/v1/${ORG_SLUG}/leaves`, {}, token)
      // Handle API response structure
      if (response && response.data && Array.isArray(response.data)) {
        setAllLeaves(response.data)
      } else if (Array.isArray(response)) {
        setAllLeaves(response)
      } else {
        console.warn('Unexpected API response format:', response)
        setAllLeaves([])
      }
    } catch (err) {
      setError(err.message)
      setAllLeaves([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch leaves for approval
  const fetchPendingLeaves = async () => {
    try {
      setLoading(true)
      const response = await apiFetch(`/api/v1/${ORG_SLUG}/leaves/PENDING`, {}, token)
      // Handle API response structure
      if (response && response.data && Array.isArray(response.data)) {
        setLeaves(response.data)
      } else if (Array.isArray(response)) {
        setLeaves(response)
      } else {
        console.warn('Unexpected API response format:', response)
        setLeaves([])
      }
    } catch (err) {
      setError(err.message)
      setLeaves([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'all') {
      fetchAllLeaves()
    } else if (activeTab === 'approval' && (user?.role === 'MANAGER' || user?.role === 'ADMIN')) {
      fetchPendingLeaves()
    }
  }, [activeTab, token, user])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle leave submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      setLoading(true)
      const submissionData = {
        employee_id: formData.employee_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        leave_type: formData.leave_type,
        reason: formData.reason
      }
      await apiFetch(`/api/v1/${ORG_SLUG}/leaves`, {
        method: 'POST',
        body: JSON.stringify(submissionData)
      }, token)

      setSuccess('Leave request submitted successfully!')
      setFormData({
        employee_id: user?.employee_id || '',
        start_date: '',
        end_date: '',
        leave_type: 'ANNUAL',
        reason: ''
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle leave approval/rejection
  const handleLeaveReview = async (leaveCode, action) => {
    setError('')
    setSuccess('')

    try {
      setLoading(true)
      const actionValue = action.toLowerCase() // 'approve' or 'reject'
      await apiFetch(`/api/v1/${ORG_SLUG}/leaves/${leaveCode}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: actionValue })
      }, token)

      setSuccess(`Leave ${action.toLowerCase()}ed successfully!`)
      fetchPendingLeaves() // Refresh the list
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Leave Management</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'submit'
            ? 'border-b-2 border-indigo-600 text-indigo-600'
            : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('submit')}
        >
          Submit Leave Request
        </button>
        <button
          className={`px-4 py-2 font-medium ml-6 ${activeTab === 'all'
            ? 'border-b-2 border-indigo-600 text-indigo-600'
            : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('all')}
        >
          All Leaves
        </button>
        {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
          <button
            className={`px-4 py-2 font-medium ml-6 ${activeTab === 'approval'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600 hover:text-gray-800'}`}
            onClick={() => setActiveTab('approval')}
          >
            Pending Approvals
          </button>
        )}
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

      {/* Submit Leave Tab */}
      {activeTab === 'submit' && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Submit Leave Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  min={formData.start_date}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leave Type
              </label>
              <select
                name="leave_type"
                value={formData.leave_type}
                onChange={handleInputChange}
                className="w-full border border-gray-300 p-2 rounded-md"
              >
                {LEAVE_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows={4}
                className="w-full border border-gray-300 p-2 rounded-md"
                placeholder="Please provide a reason for your leave request..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </Card>
      )}

      {/* Approval Tab */}
      {activeTab === 'approval' && (user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Pending Leave Approvals</h2>

          {loading ? (
            <LoadingSkeleton />
          ) : leaves.length === 0 ? (
            <p className="text-gray-500">No pending leave requests</p>
          ) : (
            <div className="space-y-4">
              {leaves.map(leave => (
                <div key={leave.leave_code || leave.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Employee ID</p>
                      <p className="font-medium">{leave.employee_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Leave Type</p>
                      <p className="font-medium">{leave.leave_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Leave Code</p>
                      <p className="font-medium font-mono bg-gray-100 px-2 py-1 rounded">
                        {leave.leave_code || 'N/A'}
                      </p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-4">
                      <p className="text-sm text-gray-600 mb-1">Reason</p>
                      <p className="text-gray-800">{leave.reason}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleLeaveReview(leave.leave_code, 'APPROVE')}
                      disabled={loading}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleLeaveReview(leave.leave_code, 'REJECT')}
                      disabled={loading}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* All Leaves Tab */}
      {activeTab === 'all' && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">All Leave Requests</h2>

          {loading ? (
            <LoadingSkeleton />
          ) : allLeaves.length === 0 ? (
            <p className="text-gray-500">No leave requests found</p>
          ) : (
            <div className="space-y-4">
              {allLeaves.map(leave => (
                <div key={leave.leave_code || leave.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Employee ID</p>
                      <p className="font-medium">{leave.employee_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Leave Type</p>
                      <p className="font-medium">{leave.leave_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className={`font-medium ${
                        leave.status === 'APPROVED' ? 'text-green-600' :
                        leave.status === 'REJECTED' ? 'text-red-600' :
                        leave.status === 'PENDING' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {leave.status || 'PENDING'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Leave Code</p>
                      <p className="font-medium font-mono bg-gray-100 px-2 py-1 rounded">
                        {leave.leave_code || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Submitted</p>
                      <p className="font-medium">
                        {leave.submitted_at ? new Date(leave.submitted_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    {(leave.status === 'APPROVED' || leave.status === 'REJECTED') && (
                      <>
                        {leave.approved_by && (
                          <div>
                            <p className="text-sm text-gray-600">Approved By</p>
                            <p className="font-medium">{leave.approved_by}</p>
                          </div>
                        )}
                        {leave.approved_at && (
                          <div>
                            <p className="text-sm text-gray-600">Approved At</p>
                            <p className="font-medium">
                              {new Date(leave.approved_at).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    <div className="md:col-span-2 lg:col-span-3">
                      <p className="text-sm text-gray-600 mb-1">Reason</p>
                      <p className="text-gray-800">{leave.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}