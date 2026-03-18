export interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export interface OrganizationCreateInput {
  name: string
  slug: string
}

export interface Project {
  id: string
  organization_id: string
  code: string
  name: string
  description: string | null
  client_name: string | null
  currency_code: string
  retention_percent_default: string | null
  tax_percent_default: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface ProjectCreateInput {
  organization_id: string
  code: string
  name: string
  description?: string
  client_name?: string
  currency_code: string
  retention_percent_default?: string
  tax_percent_default?: string
}

export interface Contract {
  id: string
  organization_id: string
  project_id: string
  code: string
  title: string
  currency_code: string
  retention_percent: string
  retention_cap_percent: string | null
  tax_percent: string
  start_date: string | null
  end_date: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface ContractCreateInput {
  organization_id: string
  project_id: string
  code: string
  title: string
  currency_code: string
  retention_percent: string
  retention_cap_percent?: string
  tax_percent: string
  start_date?: string
  end_date?: string
}

export interface BoqItem {
  id: string
  boq_revision_id: string
  item_code: string
  trade_code: string | null
  description: string
  unit: string
  contract_quantity: string
  rate: string
  amount: string
  order_index: number
}

export interface BoqRevision {
  id: string
  organization_id: string
  project_id: string
  contract_id: string
  revision_number: number
  status: string
  published_at: string | null
  created_at: string
  updated_at: string
  items: BoqItem[]
}

export interface BoqRevisionItemCreateInput {
  item_code: string
  trade_code?: string
  description: string
  unit: string
  contract_quantity: string
  rate: string
  order_index: number
}

export interface BoqRevisionCreateInput {
  organization_id: string
  project_id: string
  contract_id: string
  revision_number: number
  items: BoqRevisionItemCreateInput[]
}

export interface ClaimLine {
  id: string
  boq_item_id: string
  item_code: string
  trade_code: string | null
  description: string
  unit: string
  rate: string
  previous_certified_quantity: string
  claimed_quantity_this_period: string
  claimed_materials_on_site_value: string | null
  line_value: string
  notes: string | null
}

export interface ClaimBatch {
  id: string
  organization_id: string
  project_id: string
  contract_id: string
  period_number: number
  status: string
  submitted_by_user_id: string | null
  submitted_at: string | null
  reviewed_by_user_id: string | null
  reviewed_at: string | null
  remarks: string | null
  created_at: string
  updated_at: string
  total_claimed_amount: string
  lines: ClaimLine[]
}

export interface ClaimLineCreateInput {
  boq_item_id: string
  previous_certified_quantity?: string
  claimed_quantity_this_period: string
  claimed_materials_on_site_value?: string
  notes?: string
}

export interface ClaimBatchCreateInput {
  organization_id: string
  project_id: string
  contract_id: string
  period_number: number
  remarks?: string
  lines: ClaimLineCreateInput[]
}
