import React, { useState } from 'react'
import { SubcontractorManager } from '../components/project/SubcontractorManager'
import { Subcontractor, SubcontractorAssignment } from '../types/project'
import { 
  BuildingOffice2Icon, 
  ClipboardDocumentListIcon, 
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

interface ProjectSummary {
  totalUnits: number
  completedUnits: number
  totalBudget: number
  spentToDate: number
  timeline: {
    startDate: Date
    endDate: Date
    currentPhase: string
  }
}

export default function ProjectPage() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [assignments, setAssignments] = useState<SubcontractorAssignment[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [projectSummary] = useState<ProjectSummary>({
    totalUnits: 24,
    completedUnits: 8,
    totalBudget: 15000000,
    spentToDate: 6500000,
    timeline: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      currentPhase: 'Foundation Work'
    }
  })

  const handleAddSubcontractor = (subcontractor: Omit<Subcontractor, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSubcontractor: Subcontractor = {
      ...subcontractor,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setSubcontractors([...subcontractors, newSubcontractor])
  }

  const handleUpdateSubcontractor = (id: string, updates: Partial<Subcontractor>) => {
    setSubcontractors(
      subcontractors.map((subcontractor) =>
        subcontractor.id === id
          ? { ...subcontractor, ...updates, updatedAt: new Date() }
          : subcontractor
      )
    )
  }

  const handleAddAssignment = (assignment: Omit<SubcontractorAssignment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAssignment: SubcontractorAssignment = {
      ...assignment,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setAssignments([...assignments, newAssignment])
  }

  const handleUpdateAssignment = (id: string, updates: Partial<SubcontractorAssignment>) => {
    setAssignments(
      assignments.map((assignment) =>
        assignment.id === id
          ? { ...assignment, ...updates, updatedAt: new Date() }
          : assignment
      )
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BuildingOffice2Icon },
    { id: 'units', name: 'Units', icon: ClipboardDocumentListIcon },
    { id: 'subcontractors', name: 'Subcontractors', icon: UserGroupIcon },
    { id: 'documents', name: 'Documents', icon: DocumentTextIcon },
    { id: 'reports', name: 'Reports', icon: ChartBarIcon },
    { id: 'timeline', name: 'Timeline', icon: CalendarIcon },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Project Management</h1>
        <p className="text-gray-600 mt-2">Manage your construction project efficiently</p>
      </div>

      {/* Project Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Units Progress</h3>
          <div className="mt-2">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{projectSummary.completedUnits}/{projectSummary.totalUnits}</span>
              <span className="text-green-600">
                {Math.round((projectSummary.completedUnits / projectSummary.totalUnits) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${(projectSummary.completedUnits / projectSummary.totalUnits) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Budget Status</h3>
          <div className="mt-2">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{formatCurrency(projectSummary.spentToDate)}</span>
              <span className="text-gray-600">of {formatCurrency(projectSummary.totalBudget)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(projectSummary.spentToDate / projectSummary.totalBudget) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Current Phase</h3>
          <div className="mt-2">
            <span className="text-2xl font-bold">{projectSummary.timeline.currentPhase}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Timeline</h3>
          <div className="mt-2">
            <div className="text-sm text-gray-600">
              <div>Start: {projectSummary.timeline.startDate.toLocaleDateString()}</div>
              <div>End: {projectSummary.timeline.endDate.toLocaleDateString()}</div>
            </div>
          </div>
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
        {activeTab === 'overview' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Project Overview</h2>
            {/* Add overview content */}
          </div>
        )}

        {activeTab === 'units' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Units Management</h2>
            {/* Add units management content */}
          </div>
        )}

        {activeTab === 'subcontractors' && (
          <div className="p-6">
            <SubcontractorManager
              subcontractors={subcontractors}
              assignments={assignments}
              onAddSubcontractor={handleAddSubcontractor}
              onUpdateSubcontractor={handleUpdateSubcontractor}
              onAddAssignment={handleAddAssignment}
              onUpdateAssignment={handleUpdateAssignment}
            />
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Project Documents</h2>
            {/* Add documents content */}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Project Reports</h2>
            {/* Add reports content */}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Project Timeline</h2>
            {/* Add timeline content */}
          </div>
        )}
      </div>
    </div>
  )
} 