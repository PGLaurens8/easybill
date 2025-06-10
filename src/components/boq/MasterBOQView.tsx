import React, { useState } from 'react'
import { MasterBOQ, TradeBOQ } from '../../types/boq'
import { formatCurrency } from '../../utils/format'

interface MasterBOQViewProps {
  masterBOQ: MasterBOQ
  onTradeSelect: (tradeId: string) => void
  onStatusChange: (status: MasterBOQ['status']) => void
}

export const MasterBOQView: React.FC<MasterBOQViewProps> = ({
  masterBOQ,
  onTradeSelect,
  onStatusChange,
}) => {
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null)

  const handleTradeSelect = (tradeId: string) => {
    setSelectedTrade(tradeId)
    onTradeSelect(tradeId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Master Bill of Quantities</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Status:</span>
          <select
            value={masterBOQ.status}
            onChange={(e) => onStatusChange(e.target.value as MasterBOQ['status'])}
            className="border rounded px-3 py-1"
          >
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Value</h3>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(masterBOQ.total)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Number of Trades</h3>
          <p className="text-2xl font-bold text-primary">
            {masterBOQ.trades.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Progress</h3>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full"
              style={{
                width: `${(masterBOQ.trades.filter(t => t.status === 'completed').length / masterBOQ.trades.length) * 100}%`
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Value
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
            {masterBOQ.trades.map((trade) => (
              <tr
                key={trade.id}
                className={selectedTrade === trade.id ? 'bg-gray-50' : ''}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {trade.trade}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{trade.items.length}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(trade.total)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${trade.status === 'completed' ? 'bg-green-100 text-green-800' :
                      trade.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      trade.status === 'approved' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'}`}>
                    {trade.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleTradeSelect(trade.id)}
                    className="text-primary hover:text-primary-dark"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 