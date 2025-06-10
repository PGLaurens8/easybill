export type MeasurementUnit = 
  | 'm'      // meter
  | 'm²'     // square meter
  | 'm³'     // cubic meter
  | 'nr'     // number
  | 'kg'     // kilogram
  | 'l'      // liter
  | 'hr'     // hour
  | 'day'    // day
  | 'lump'   // lump sum
  | 'pc'     // prime cost
  | 'ps'     // provisional sum

export type PricingMethod = 
  | 'unit_rate'    // per unit (e.g., per brick, per m²)
  | 'lump_sum'     // fixed amount
  | 'prime_cost'   // prime cost item
  | 'provisional'  // provisional sum

export interface BOQItem {
  id: string
  code: string
  description: string
  unit: MeasurementUnit
  quantity: number
  unitRate: number
  total: number
  pricingMethod: PricingMethod
  trade: string
  subcontractorId?: string
  status: 'pending' | 'in_progress' | 'completed'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface TradeBOQ {
  id: string
  trade: string
  items: BOQItem[]
  total: number
  status: 'draft' | 'approved' | 'in_progress' | 'completed'
  createdAt: Date
  updatedAt: Date
}

export interface MasterBOQ {
  id: string
  projectId: string
  trades: TradeBOQ[]
  total: number
  status: 'draft' | 'approved' | 'in_progress' | 'completed'
  createdAt: Date
  updatedAt: Date
}

export interface ProgressClaim {
  id: string
  boqItemId: string
  subcontractorId: string
  period: {
    start: Date
    end: Date
  }
  quantity: number
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  certificateNumber?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface PaymentCertificate {
  id: string
  projectId: string
  subcontractorId: string
  period: {
    start: Date
    end: Date
  }
  claims: ProgressClaim[]
  total: number
  status: 'draft' | 'approved' | 'rejected' | 'paid'
  certificateNumber: string
  notes?: string
  createdAt: Date
  updatedAt: Date
} 