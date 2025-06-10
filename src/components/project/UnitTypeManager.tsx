import React, { useState } from 'react'
import { UnitType } from '../../types/project'
import { formatNumber } from '../../utils/format'

interface UnitTypeManagerProps {
  unitTypes: UnitType[]
  onAdd: (unitType: Omit<UnitType, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdate: (id: string, updates: Partial<UnitType>) => void
  onDelete: (id: string) => void
}

export const UnitTypeManager: React.FC<UnitTypeManagerProps> = ({
  unitTypes,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState<UnitType | null>(null)
  const [formData, setFormData] = useState<Partial<UnitType>>({
    name: '',
    description: '',
    area: 0,
    specifications: {
      bedrooms: 0,
      bathrooms: 0,
      parking: 0,
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedType) {
      onUpdate(selectedType.id, formData)
    } else {
      onAdd(formData as Omit<UnitType, 'id' | 'createdAt' | 'updatedAt'>)
    }
    setShowForm(false)
    setSelectedType(null)
    setFormData({
      name: '',
      description: '',
      area: 0,
      specifications: {
        bedrooms: 0,
        bathrooms: 0,
        parking: 0,
      },
    })
  }

  const handleEdit = (unitType: UnitType) => {
    setSelectedType(unitType)
    setFormData(unitType)
    setShowForm(true)
  }

  const updateSpecification = (key: keyof UnitType['specifications'], value: number) => {
    setFormData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value,
      } as UnitType['specifications'],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Unit Types</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
        >
          Add Unit Type
        </button>
      </div>

      {/* Unit Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {unitTypes.map((type) => (
          <div
            key={type.id}
            className="bg-white rounded-lg shadow p-6 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{type.name}</h3>
                <p className="text-sm text-gray-600">{type.description}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(type)}
                  className="text-primary hover:text-primary-dark"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(type.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Area</p>
                <p className="font-medium">{formatNumber(type.area)} m²</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Bedrooms</p>
                <p className="font-medium">{type.specifications.bedrooms}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Bathrooms</p>
                <p className="font-medium">{type.specifications.bathrooms}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Parking</p>
                <p className="font-medium">{type.specifications.parking}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {selectedType ? 'Edit Unit Type' : 'Add Unit Type'}
              </h3>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Area (m²)
                  </label>
                  <input
                    type="number"
                    value={formData.area}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        area: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      value={formData.specifications?.bedrooms}
                      onChange={(e) =>
                        updateSpecification('bedrooms', parseInt(e.target.value) || 0)
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      value={formData.specifications?.bathrooms}
                      onChange={(e) =>
                        updateSpecification('bathrooms', parseInt(e.target.value) || 0)
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Parking
                    </label>
                    <input
                      type="number"
                      value={formData.specifications?.parking}
                      onChange={(e) =>
                        updateSpecification('parking', parseInt(e.target.value) || 0)
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setSelectedType(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md"
                  >
                    {selectedType ? 'Update' : 'Add'}
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