import React, { useState } from 'react'
import { Subcontractor, SubcontractorAssignment } from '../../types/project'
import { formatCurrency } from '../../utils/format'

interface SubcontractorManagerProps {
  subcontractors: Subcontractor[]
  assignments: SubcontractorAssignment[]
  onAddSubcontractor: (subcontractor: Omit<Subcontractor, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateSubcontractor: (id: string, updates: Partial<Subcontractor>) => void
  onAddAssignment: (assignment: Omit<SubcontractorAssignment, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateAssignment: (id: string, updates: Partial<SubcontractorAssignment>) => void
}

export const SubcontractorManager: React.FC<SubcontractorManagerProps> = ({
  subcontractors,
  assignments,
  onAddSubcontractor,
  onUpdateSubcontractor,
  onAddAssignment,
  onUpdateAssignment,
}) => {
  const [showSubcontractorForm, setShowSubcontractorForm] = useState(false)
  const [showAssignmentForm, setShowAssignmentForm] = useState(false)
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<SubcontractorAssignment | null>(null)

  const [subcontractorForm, setSubcontractorForm] = useState<Partial<Subcontractor>>({
    name: '',
    trade: '',
    contactPerson: '',
    email: '',
    phone: '',
    registrationNumber: '',
    vatNumber: '',
    status: 'active',
    rating: 0,
  })

  const [assignmentForm, setAssignmentForm] = useState<Partial<SubcontractorAssignment>>({
    subcontractorId: '',
    trade: '',
    startDate: new Date(),
    endDate: new Date(),
    status: 'pending',
    contractValue: 0,
    paymentTerms: '',
  })

  const handleSubcontractorSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSubcontractor) {
      onUpdateSubcontractor(selectedSubcontractor.id, subcontractorForm)
    } else {
      onAddSubcontractor(subcontractorForm as Omit<Subcontractor, 'id' | 'createdAt' | 'updatedAt'>)
    }
    setShowSubcontractorForm(false)
    setSelectedSubcontractor(null)
    setSubcontractorForm({
      name: '',
      trade: '',
      contactPerson: '',
      email: '',
      phone: '',
      registrationNumber: '',
      vatNumber: '',
      status: 'active',
      rating: 0,
    })
  }

  const handleAssignmentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedAssignment) {
      onUpdateAssignment(selectedAssignment.id, assignmentForm)
    } else {
      onAddAssignment(assignmentForm as Omit<SubcontractorAssignment, 'id' | 'createdAt' | 'updatedAt'>)
    }
    setShowAssignmentForm(false)
    setSelectedAssignment(null)
    setAssignmentForm({
      subcontractorId: '',
      trade: '',
      startDate: new Date(),
      endDate: new Date(),
      status: 'pending',
      contractValue: 0,
      paymentTerms: '',
    })
  }

  return (
    <div className="space-y-8">
      {/* Subcontractors Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Subcontractors</h2>
          <button
            onClick={() => setShowSubcontractorForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Add Subcontractor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subcontractors.map((subcontractor) => (
            <div
              key={subcontractor.id}
              className="bg-white rounded-lg shadow p-6 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{subcontractor.name}</h3>
                  <p className="text-sm text-gray-600">{subcontractor.trade}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedSubcontractor(subcontractor)
                      setSubcontractorForm(subcontractor)
                      setShowSubcontractorForm(true)
                    }}
                    className="text-primary hover:text-primary-dark"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAssignment(null)
                      setAssignmentForm({
                        ...assignmentForm,
                        subcontractorId: subcontractor.id,
                        trade: subcontractor.trade,
                      })
                      setShowAssignmentForm(true)
                    }}
                    className="text-primary hover:text-primary-dark"
                  >
                    Add Assignment
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Contact</p>
                  <p className="font-medium">{subcontractor.contactPerson}</p>
                  <p className="text-sm">{subcontractor.email}</p>
                  <p className="text-sm">{subcontractor.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      subcontractor.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {subcontractor.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignments Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Assignments</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcontractor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contract Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {subcontractors.find((s) => s.id === assignment.subcontractorId)?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{assignment.trade}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(assignment.contractValue)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        assignment.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : assignment.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : assignment.status === 'terminated'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {assignment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedAssignment(assignment)
                        setAssignmentForm(assignment)
                        setShowAssignmentForm(true)
                      }}
                      className="text-primary hover:text-primary-dark"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subcontractor Form Modal */}
      {showSubcontractorForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {selectedSubcontractor ? 'Edit Subcontractor' : 'Add Subcontractor'}
              </h3>
              <form onSubmit={handleSubcontractorSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    value={subcontractorForm.name}
                    onChange={(e) =>
                      setSubcontractorForm({ ...subcontractorForm, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Trade
                  </label>
                  <input
                    type="text"
                    value={subcontractorForm.trade}
                    onChange={(e) =>
                      setSubcontractorForm({ ...subcontractorForm, trade: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={subcontractorForm.contactPerson}
                    onChange={(e) =>
                      setSubcontractorForm({ ...subcontractorForm, contactPerson: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={subcontractorForm.email}
                    onChange={(e) =>
                      setSubcontractorForm({ ...subcontractorForm, email: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={subcontractorForm.phone}
                    onChange={(e) =>
                      setSubcontractorForm({ ...subcontractorForm, phone: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={subcontractorForm.registrationNumber}
                    onChange={(e) =>
                      setSubcontractorForm({
                        ...subcontractorForm,
                        registrationNumber: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={subcontractorForm.vatNumber}
                    onChange={(e) =>
                      setSubcontractorForm({ ...subcontractorForm, vatNumber: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={subcontractorForm.status}
                    onChange={(e) =>
                      setSubcontractorForm({
                        ...subcontractorForm,
                        status: e.target.value as 'active' | 'inactive',
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubcontractorForm(false)
                      setSelectedSubcontractor(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md"
                  >
                    {selectedSubcontractor ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Form Modal */}
      {showAssignmentForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {selectedAssignment ? 'Edit Assignment' : 'Add Assignment'}
              </h3>
              <form onSubmit={handleAssignmentSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Subcontractor
                  </label>
                  <select
                    value={assignmentForm.subcontractorId}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        subcontractorId: e.target.value,
                        trade: subcontractors.find((s) => s.id === e.target.value)?.trade || '',
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  >
                    <option value="">Select Subcontractor</option>
                    {subcontractors.map((subcontractor) => (
                      <option key={subcontractor.id} value={subcontractor.id}>
                        {subcontractor.name} ({subcontractor.trade})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={assignmentForm.startDate?.toISOString().split('T')[0]}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        startDate: new Date(e.target.value),
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={assignmentForm.endDate?.toISOString().split('T')[0]}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        endDate: new Date(e.target.value),
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Contract Value
                  </label>
                  <input
                    type="number"
                    value={assignmentForm.contractValue}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        contractValue: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Terms
                  </label>
                  <textarea
                    value={assignmentForm.paymentTerms}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        paymentTerms: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={assignmentForm.status}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        status: e.target.value as SubcontractorAssignment['status'],
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignmentForm(false)
                      setSelectedAssignment(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md"
                  >
                    {selectedAssignment ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 