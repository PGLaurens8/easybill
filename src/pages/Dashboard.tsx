import React, { useState } from 'react'
import {
  CurrencyDollarIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CalculatorIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  TruckIcon,
  ChartBarIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline'

const stats = [
  {
    name: 'Total Projects',
    value: '3',
    icon: BuildingOfficeIcon,
    change: '+1',
    changeType: 'positive',
  },
  {
    name: 'Active Claims',
    value: '5',
    icon: ClipboardDocumentCheckIcon,
    change: '+2',
    changeType: 'positive',
  },
  {
    name: 'Total Value',
    value: 'R 4.2M',
    icon: CurrencyDollarIcon,
    change: '+15%',
    changeType: 'positive',
  },
  {
    name: 'Subcontractors',
    value: '8',
    icon: UserGroupIcon,
    change: '+2',
    changeType: 'positive',
  },
]

const recentActivity = [
  {
    id: 1,
    type: 'claim',
    title: 'New claim submitted',
    description: 'Brickwork claim for Unit 12 - Sunset Heights',
    time: '2 hours ago',
    amount: 'R 45,000',
    status: 'Pending Approval'
  },
  {
    id: 2,
    type: 'project',
    title: 'New project created',
    description: 'Sunset Heights Development - 24 Units',
    time: '4 hours ago',
    amount: 'R 2.8M',
    status: 'In Progress'
  },
  {
    id: 3,
    type: 'payment',
    title: 'Payment processed',
    description: 'Payment to ABC Construction - Plastering',
    time: '1 day ago',
    amount: 'R 85,000',
    status: 'Paid'
  },
  {
    id: 4,
    type: 'claim',
    title: 'Claim approved',
    description: 'Roofing work - Unit 5-8',
    time: '2 days ago',
    amount: 'R 120,000',
    status: 'Approved'
  }
]

interface QuickAction {
  id: string
  name: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  route: string
}

interface ProcessStep {
  id: string
  name: string
  description: string
  status: 'completed' | 'in_progress' | 'pending'
  duration: string
  dependencies: string[]
}

export default function Dashboard() {
  const [isRecording, setIsRecording] = useState(false)

  const quickActions: QuickAction[] = [
    {
      id: 'create-boq',
      name: 'Create BOQ',
      description: 'Create a new Bill of Quantities',
      icon: CalculatorIcon,
      route: '/boq-builder',
    },
    {
      id: 'add-subcontractor',
      name: 'Add Subcontractor',
      description: 'Register a new subcontractor',
      icon: UserGroupIcon,
      route: '/project',
    },
    {
      id: 'create-claim',
      name: 'Create Claim',
      description: 'Submit a new progress claim',
      icon: DocumentTextIcon,
      route: '/claims',
    },
    {
      id: 'order-materials',
      name: 'Order Materials',
      description: 'Place a new material order',
      icon: TruckIcon,
      route: '/materials',
    },
    {
      id: 'view-reports',
      name: 'View Reports',
      description: 'Access project reports',
      icon: ChartBarIcon,
      route: '/reports',
    },
  ]

  const processSteps: ProcessStep[] = [
    {
      id: 'site-preparation',
      name: 'Site Preparation',
      description: 'Clear and prepare the construction site',
      status: 'completed',
      duration: '2 weeks',
      dependencies: [],
    },
    {
      id: 'foundation',
      name: 'Foundation Work',
      description: 'Excavation and foundation construction',
      status: 'in_progress',
      duration: '4 weeks',
      dependencies: ['site-preparation'],
    },
    {
      id: 'structure',
      name: 'Structural Work',
      description: 'Building the main structure',
      status: 'pending',
      duration: '8 weeks',
      dependencies: ['foundation'],
    },
    {
      id: 'enclosure',
      name: 'Building Enclosure',
      description: 'Roofing and external walls',
      status: 'pending',
      duration: '6 weeks',
      dependencies: ['structure'],
    },
    {
      id: 'interior',
      name: 'Interior Work',
      description: 'Internal finishes and fixtures',
      status: 'pending',
      duration: '10 weeks',
      dependencies: ['enclosure'],
    },
    {
      id: 'final',
      name: 'Final Touches',
      description: 'Landscaping and final inspections',
      status: 'pending',
      duration: '4 weeks',
      dependencies: ['interior'],
    },
  ]

  const handleVoiceInput = () => {
    setIsRecording(!isRecording)
    // Implement voice input logic here
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to your construction project management dashboard</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => {/* Navigate to route */}}
              className="flex items-start p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0">
                <action.icon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 text-left">
                <h3 className="text-lg font-medium text-gray-900">{action.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Input */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Voice Input</h2>
              <p className="text-gray-600 mt-1">Use voice commands to quickly perform actions</p>
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
              <p className="text-sm text-gray-600">Listening...</p>
            </div>
          )}
        </div>
      </div>

      {/* Process Flow */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Project Process Flow</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="space-y-6">
              {processSteps.map((step, index) => (
                <div key={step.id} className="relative">
                  {/* Connector Line */}
                  {index < processSteps.length - 1 && (
                    <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-gray-200" />
                  )}
                  
                  <div className="relative flex items-start">
                    {/* Status Circle */}
                    <div
                      className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                        step.status === 'completed'
                          ? 'bg-green-100 text-green-600'
                          : step.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {step.status === 'completed' ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">{step.name}</h3>
                        <span className="text-sm text-gray-500">{step.duration}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{step.description}</p>
                      
                      {/* Dependencies */}
                      {step.dependencies.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">
                            Depends on: {step.dependencies.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {/* Add recent activity content */}
            <p className="text-gray-600">No recent activity to display</p>
          </div>
        </div>
      </div>
    </div>
  )
} 