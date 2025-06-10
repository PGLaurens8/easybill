import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { materialPriceScraper } from '../utils/materialPriceScraper'

interface BOQItem {
  id: string
  code: string
  description: string
  unit: string
  quantity: number
  unitRate: number
  amount: number
  trade: string
  category: string
  notes?: string
}

interface BOQItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (item: Omit<BOQItem, 'id' | 'amount'>) => void
  item?: BOQItem
  trades: Array<{
    id: string
    name: string
    code: string
  }>
}

export default function BOQItemModal({
  isOpen,
  onClose,
  onSave,
  item,
  trades,
}: BOQItemModalProps) {
  const [formData, setFormData] = useState<Omit<BOQItem, 'id' | 'amount'>>({
    code: '',
    description: '',
    unit: '',
    quantity: 0,
    unitRate: 0,
    trade: '',
    category: '',
    notes: '',
  })
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)
  const [priceHistory, setPriceHistory] = useState<Array<{
    supplier: string
    price: number
    unit: string
    date: string
  }> | null>(null)

  useEffect(() => {
    if (item) {
      setFormData({
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitRate: item.unitRate,
        trade: item.trade,
        category: item.category,
        notes: item.notes,
      })
    } else {
      setFormData({
        code: '',
        description: '',
        unit: '',
        quantity: 0,
        unitRate: 0,
        trade: '',
        category: '',
        notes: '',
      })
    }
  }, [item])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' || name === 'unitRate' ? parseFloat(value) || 0 : value,
    }))
  }

  const handleFetchPrice = async () => {
    if (!formData.description) return

    setIsLoadingPrice(true)
    try {
      const price = await materialPriceScraper.getAveragePrice(formData.description)
      if (price !== null) {
        setFormData((prev) => ({ ...prev, unitRate: price }))
      }

      const history = await materialPriceScraper.getPriceHistory(formData.description)
      setPriceHistory(history)
    } catch (error) {
      console.error('Error fetching price:', error)
    } finally {
      setIsLoadingPrice(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{item ? 'Edit BOQ Item' : 'Add BOQ Item'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trade
              </label>
              <select
                name="trade"
                value={formData.trade}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a trade</option>
                {trades.map((trade) => (
                  <option key={trade.id} value={trade.code}>
                    {trade.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={handleFetchPrice}
                  disabled={isLoadingPrice || !formData.description}
                  className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isLoadingPrice ? 'Loading...' : 'Get Price'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Rate
              </label>
              <input
                type="number"
                name="unitRate"
                value={formData.unitRate}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {priceHistory && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Price History</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500 mb-2">
                  <div>Supplier</div>
                  <div>Price</div>
                  <div>Unit</div>
                  <div>Date</div>
                </div>
                {priceHistory.map((price, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>{price.supplier}</div>
                    <div>R {price.price.toFixed(2)}</div>
                    <div>{price.unit}</div>
                    <div>{price.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {item ? 'Update' : 'Add'} Item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 