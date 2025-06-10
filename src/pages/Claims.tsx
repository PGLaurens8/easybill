import { useState } from 'react'

interface Claim {
  id: string
  projectId: string
  projectName: string
  subcontractorId: string
  subcontractorName: string
  trade: string
  description: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'disputed' | 'paid'
  submittedDate: string
  approvedDate?: string
  paidDate?: string
  notes?: string
}

const initialClaims: Claim[] = [
  {
    id: '1',
    projectId: '1',
    projectName: 'Sunset Heights Development',
    subcontractorId: '1',
    subcontractorName: 'ABC Construction',
    trade: 'Brickwork',
    description: 'Brickwork for Units 1-4',
    amount: 450000,
    status: 'pending',
    submittedDate: '2024-03-15',
  },
  {
    id: '2',
    projectId: '1',
    projectName: 'Sunset Heights Development',
    subcontractorId: '2',
    subcontractorName: 'XYZ Plastering',
    trade: 'Plastering',
    description: 'Internal plastering for Units 5-8',
    amount: 280000,
    status: 'approved',
    submittedDate: '2024-03-10',
    approvedDate: '2024-03-12',
  },
  {
    id: '3',
    projectId: '1',
    projectName: 'Sunset Heights Development',
    subcontractorId: '3',
    subcontractorName: 'Best Roofing',
    trade: 'Roofing',
    description: 'Roof installation for Units 9-12',
    amount: 850000,
    status: 'paid',
    submittedDate: '2024-03-01',
    approvedDate: '2024-03-03',
    paidDate: '2024-03-05',
  },
]

export default function Claims() {
  const [claims, setClaims] = useState<Claim[]>(initialClaims)
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const handleStatusChange = (claimId: string, newStatus: Claim['status']) => {
    setClaims(claims.map(claim => {
      if (claim.id === claimId) {
        const updatedClaim = { ...claim, status: newStatus }
        if (newStatus === 'approved') {
          updatedClaim.approvedDate = new Date().toISOString().split('T')[0]
        } else if (newStatus === 'paid') {
          updatedClaim.paidDate = new Date().toISOString().split('T')[0]
        }
        return updatedClaim
      }
      return claim
    }))
  }

  const filteredClaims = statusFilter === 'all'
    ? claims
    : claims.filter(claim => claim.status === statusFilter)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Claims Management</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="disputed">Disputed</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                        Project
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Subcontractor
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Trade
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Amount
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClaims.map((claim) => (
                      <tr key={claim.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">
                          {claim.projectName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {claim.subcontractorName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {claim.trade}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          R {claim.amount.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            claim.status === 'paid' ? 'bg-green-50 text-green-700' :
                            claim.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                            claim.status === 'approved' ? 'bg-blue-50 text-blue-700' :
                            claim.status === 'rejected' ? 'bg-red-50 text-red-700' :
                            'bg-gray-50 text-gray-700'
                          }`}>
                            {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex space-x-2">
                            {claim.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(claim.id, 'approved')}
                                  className="text-primary-600 hover:text-primary-900"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleStatusChange(claim.id, 'rejected')}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleStatusChange(claim.id, 'disputed')}
                                  className="text-yellow-600 hover:text-yellow-900"
                                >
                                  Dispute
                                </button>
                              </>
                            )}
                            {claim.status === 'approved' && (
                              <button
                                onClick={() => handleStatusChange(claim.id, 'paid')}
                                className="text-green-600 hover:text-green-900"
                              >
                                Mark as Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedClaim && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Claim Details</h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="mt-1 text-sm text-gray-900">{selectedClaim.description}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Submitted Date</p>
                <p className="mt-1 text-sm text-gray-900">{selectedClaim.submittedDate}</p>
              </div>
              {selectedClaim.approvedDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Approved Date</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedClaim.approvedDate}</p>
                </div>
              )}
              {selectedClaim.paidDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Paid Date</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedClaim.paidDate}</p>
                </div>
              )}
              {selectedClaim.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedClaim.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 