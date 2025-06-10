export interface UnitType {
  id: string
  name: string
  description: string
  area: number
  specifications: {
    bedrooms: number
    bathrooms: number
    parking: number
    [key: string]: any // Additional specifications
  }
  createdAt: Date
  updatedAt: Date
}

export interface Unit {
  id: string
  unitTypeId: string
  name: string
  status: 'planned' | 'in_progress' | 'completed'
  progress: number
  startDate?: Date
  completionDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  description: string
  location: string
  client: string
  startDate: Date
  endDate: Date
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
  unitTypes: UnitType[]
  units: Unit[]
  totalUnits: number
  totalArea: number
  budget: number
  createdAt: Date
  updatedAt: Date
}

export interface Subcontractor {
  id: string
  name: string
  trade: string
  contactPerson: string
  email: string
  phone: string
  registrationNumber: string
  vatNumber: string
  status: 'active' | 'inactive'
  rating: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface SubcontractorAssignment {
  id: string
  projectId: string
  subcontractorId: string
  trade: string
  startDate: Date
  endDate: Date
  status: 'pending' | 'active' | 'completed' | 'terminated'
  contractValue: number
  paymentTerms: string
  notes?: string
  createdAt: Date
  updatedAt: Date
} 