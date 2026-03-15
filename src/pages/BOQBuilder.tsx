import { useState, useEffect } from 'react'
import {
  PlusIcon,
  DocumentDuplicateIcon,
  CalculatorIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline'
import { boqTemplates, commonTrades } from '../data/boqTemplates'
import { speechToText } from '../utils/speechToText'
import { materialPriceScraper } from '../utils/materialPriceScraper'
import BOQItemModal from '../components/BOQItemModal'
import UnitModal from '../components/UnitModal'
import BOQExport from '../components/BOQExport'

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

interface Unit {
  id: string
  name: string
  type: string
  area: number
  boqItems: BOQItem[]
}

interface Trade {
  id: string
  name: string
  code: string
  items: Array<{
    code: string
    description: string
    unit: string
    category: string
  }>
}

export default function BOQBuilder() {
  const [units, setUnits] = useState<Unit[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [activeTab, setActiveTab] = useState('units')
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('residential')
  const [isLoadingPrices, setIsLoadingPrices] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<BOQItem | undefined>()
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false)
  const [selectedUnitForEdit, setSelectedUnitForEdit] = useState<Unit | undefined>()

  useEffect(() => {
    // Initialize trades from templates
    const initializedTrades = commonTrades.map(trade => ({
      ...trade,
      items: trade.items.map(item => ({
        ...item,
        id: crypto.randomUUID(),
        quantity: 0,
        unitRate: 0,
        amount: 0,
        trade: trade.code
      }))
    }))
    setTrades(initializedTrades)
  }, [])

  const handleAddUnit = () => {
    setSelectedUnitForEdit(undefined)
    setIsUnitModalOpen(true)
  }

  const handleEditUnit = (unit: Unit) => {
    setSelectedUnitForEdit(unit)
    setIsUnitModalOpen(true)
  }

  const handleSaveUnit = (unitData: Omit<Unit, 'id' | 'boqItems'>) => {
    if (selectedUnitForEdit) {
      setUnits(
        units.map((unit) =>
          unit.id === selectedUnitForEdit.id
            ? {
                ...unit,
                ...unitData,
              }
            : unit
        )
      )
    } else {
      const newUnit: Unit = {
        ...unitData,
        id: crypto.randomUUID(),
        boqItems: [],
      }
      setUnits([...units, newUnit])
    }
  }

  const handleDeleteUnit = (unitId: string) => {
    setUnits(units.filter((unit) => unit.id !== unitId))
    if (selectedUnit === unitId) {
      setSelectedUnit(null)
    }
  }

  const handleAddBOQItem = (unitId: string, item: Omit<BOQItem, 'id' | 'amount'>) => {
    const newItem: BOQItem = {
      ...item,
      id: crypto.randomUUID(),
      amount: item.quantity * item.unitRate,
    }
    setUnits(
      units.map((unit) =>
        unit.id === unitId
          ? { ...unit, boqItems: [...unit.boqItems, newItem] }
          : unit
      )
    )
  }

  const handleUpdateBOQItem = (unitId: string, itemId: string, updates: Partial<BOQItem>) => {
    setUnits(
      units.map((unit) =>
        unit.id === unitId
          ? {
              ...unit,
              boqItems: unit.boqItems.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      ...updates,
                      amount: (updates.quantity || item.quantity) * (updates.unitRate || item.unitRate),
                    }
                  : item
              ),
            }
          : unit
      )
    )
  }

  const handleVoiceInput = () => {
    if (isRecording) {
      speechToText.stop()
      setIsRecording(false)
    } else {
      setIsRecording(true)
      speechToText.start({
        onResult: (text) => {
          setTranscript(text)
          // Process voice command
          processVoiceCommand(text)
        },
        onError: (error) => {
          console.error('Speech recognition error:', error)
          setIsRecording(false)
        },
        onEnd: () => {
          setIsRecording(false)
        },
      })
    }
  }

  const processVoiceCommand = (text: string) => {
    const command = text.toLowerCase()
    if (command.includes('add unit')) {
      // Extract unit details from command
      const nameMatch = command.match(/name (\w+)/)
      const typeMatch = command.match(/type (\w+)/)
      const areaMatch = command.match(/area (\d+)/)
      
      if (nameMatch && typeMatch && areaMatch) {
        handleSaveUnit({
          name: nameMatch[1],
          type: typeMatch[1],
          area: parseInt(areaMatch[1]),
        })
      }
    } else if (command.includes('add item')) {
      // Extract item details from command
      const codeMatch = command.match(/code (\w+)/)
      const descriptionMatch = command.match(/description (.+?)(?=\s+(?:unit|quantity|rate|$))/)
      const unitMatch = command.match(/unit (\w+)/)
      const quantityMatch = command.match(/quantity (\d+)/)
      const rateMatch = command.match(/rate (\d+)/)
      
      if (codeMatch && descriptionMatch && unitMatch && quantityMatch && rateMatch && selectedUnit) {
        handleAddBOQItem(selectedUnit, {
          code: codeMatch[1],
          description: descriptionMatch[1],
          unit: unitMatch[1],
          quantity: parseInt(quantityMatch[1]),
          unitRate: parseInt(rateMatch[1]),
          trade: 'general',
          category: 'general',
        })
      }
    }
  }

  const handleApplyTemplate = (templateType: string) => {
    const templates = boqTemplates[templateType]
    if (!templates) return

    // Create a new unit for each template
    templates.forEach((template) => {
      const newUnit: Unit = {
        id: crypto.randomUUID(),
        name: template.name,
        type: templateType,
        area: 0,
        boqItems: template.items.map((item) => ({
          id: crypto.randomUUID(),
          code: item.code,
          description: item.description,
          unit: item.unit,
          quantity: 0,
          unitRate: 0,
          amount: 0,
          trade: template.code,
          category: item.category,
          notes: item.notes,
        })),
      }
      setUnits([...units, newUnit])
    })
  }

  const handleFetchMaterialPrice = async (item: BOQItem) => {
    setIsLoadingPrices(true)
    try {
      const price = await materialPriceScraper.getAveragePrice(item.description)
      if (price !== null) {
        handleUpdateBOQItem(selectedUnit!, item.id, { unitRate: price })
      }
    } catch (error) {
      console.error('Error fetching material price:', error)
    } finally {
      setIsLoadingPrices(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const tabs = [
    { id: 'units', name: 'Units', icon: BuildingOffice2Icon },
    { id: 'trades', name: 'Trades', icon: ClipboardDocumentListIcon },
    { id: 'summary', name: 'Summary', icon: CalculatorIcon },
  ]

  const handleAddItem = () => {
    setSelectedItem(undefined)
    setIsModalOpen(true)
  }

  const handleEditItem = (item: BOQItem) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const handleSaveItem = (itemData: Omit<BOQItem, 'id' | 'amount'>) => {
    if (selectedItem) {
      handleUpdateBOQItem(selectedUnit!, selectedItem.id, itemData)
    } else {
      handleAddBOQItem(selectedUnit!, itemData)
    }
  }

  const handleDeleteItem = (itemId: string) => {
    if (!selectedUnit) return

    setUnits(
      units.map((unit) =>
        unit.id === selectedUnit
          ? {
              ...unit,
              boqItems: unit.boqItems.filter((item) => item.id !== itemId),
            }
          : unit
      )
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">BOQ Builder</h1>
            <p className="text-gray-600 mt-2">Create and manage Bills of Quantities for your project</p>
          </div>
          <BOQExport units={units} trades={trades} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Total Units</h3>
          <p className="text-3xl font-bold mt-2">{units.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Total Trades</h3>
          <p className="text-3xl font-bold mt-2">{trades.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Total Items</h3>
          <p className="text-3xl font-bold mt-2">
            {units.reduce((sum, unit) => sum + unit.boqItems.length, 0)}
          </p>
        </div>
      </div>

      {/* Template Selection */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Apply Template</h2>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
            </select>
            <button
              onClick={() => handleApplyTemplate(selectedTemplate)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
              Apply Template
            </button>
          </div>
        </div>
      </div>

      {/* Voice Input */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Voice Input</h2>
              <p className="text-gray-600 mt-1">Use voice commands to quickly add units and items</p>
            </div>
            <button
              onClick={handleVoiceInput}
              className={`p-3 rounded-full ${
                isRecording ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              }`}
            >
              <MicrophoneIcon className="h-6 w-6" />
            </button>
          </div>
          {isRecording && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Listening... {transcript}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'units' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Unit Management</h2>
              <button
                onClick={handleAddUnit}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Unit
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className="border rounded-lg p-4 cursor-pointer hover:border-blue-500"
                  onClick={() => setSelectedUnit(unit.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{unit.name}</h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>Type: {unit.type}</p>
                        <p>Area: {unit.area} m²</p>
                        <p>Items: {unit.boqItems.length}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditUnit(unit)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteUnit(unit.id)
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedUnit && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">BOQ Items</h3>
                  <button
                    onClick={handleAddItem}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Item
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {units
                        .find((u) => u.id === selectedUnit)
                        ?.boqItems.map((item) => (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.code}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(item.unitRate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleFetchMaterialPrice(item)}
                                disabled={isLoadingPrices}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                {isLoadingPrices ? 'Loading...' : 'Update Price'}
                              </button>
                              <button
                                onClick={() => handleEditItem(item)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="border rounded-lg p-4 cursor-pointer hover:border-blue-500"
                >
                  <h3 className="text-lg font-semibold">{trade.name}</h3>
                  <p className="text-sm text-gray-600">Code: {trade.code}</p>
                  <p className="text-sm text-gray-600 mt-2">Items: {trade.items.length}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">BOQ Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Total Cost by Trade</h3>
                <div className="space-y-2">
                  {trades.map((trade) => {
                    const tradeTotal = units.reduce((sum, unit) => {
                      const tradeItems = unit.boqItems.filter((item) => item.trade === trade.code)
                      return sum + tradeItems.reduce((itemSum, item) => itemSum + item.amount, 0)
                    }, 0)
                    return (
                      <div key={trade.id} className="flex justify-between">
                        <span>{trade.name}</span>
                        <span>{formatCurrency(tradeTotal)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Total Cost by Unit</h3>
                <div className="space-y-2">
                  {units.map((unit) => {
                    const unitTotal = unit.boqItems.reduce((sum, item) => sum + item.amount, 0)
                    return (
                      <div key={unit.id} className="flex justify-between">
                        <span>{unit.name}</span>
                        <span>{formatCurrency(unitTotal)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BOQItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        item={selectedItem}
        trades={trades}
      />

      <UnitModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        onSave={handleSaveUnit}
        unit={selectedUnitForEdit}
      />
    </div>
  )
} 
