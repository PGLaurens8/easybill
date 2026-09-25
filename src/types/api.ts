export type MembershipRole =
  | 'OrgAdmin'
  | 'CommercialManager'
  | 'QuantitySurveyor'
  | 'Contractor'
  | 'Accounts'

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

export interface OrganizationMembership {
  id: string
  organization_id: string
  user_id: string
  email: string | null
  role: MembershipRole
  created_at: string
  updated_at: string
}

export interface OrganizationInvitation {
  id: string
  organization_id: string
  email: string
  role: MembershipRole
  status: 'Pending' | 'Accepted' | 'Declined' | 'Revoked'
  invited_by_user_id: string
  responded_at: string | null
  created_at: string
}

export interface OrganizationInvitationCreateInput {
  email: string
  role: MembershipRole
}

/** An invitation addressed to the signed-in user. */
export interface MyInvitation {
  id: string
  organization_id: string
  organization_name: string
  role: MembershipRole
  created_at: string
}

export interface OrganizationMembershipUpdateInput {
  role: MembershipRole
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
  subcontractor_name: string | null
  subcontractor_user_id: string | null
  currency_code: string
  retention_percent: string
  retention_cap_percent: string | null
  tax_percent: string
  start_date: string | null
  end_date: string | null
  practical_completion_date: string | null
  final_completion_date: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface ContractCreateInput {
  organization_id: string
  project_id: string
  code: string
  title: string
  subcontractor_name?: string
  subcontractor_user_id?: string
  currency_code: string
  retention_percent: string
  retention_cap_percent?: string
  tax_percent: string
  start_date?: string
  end_date?: string
}

export interface ContractUpdateInput {
  title?: string
  subcontractor_name?: string | null
  subcontractor_user_id?: string | null
  retention_percent?: string
  retention_cap_percent?: string | null
  tax_percent?: string
  status?: string
  practical_completion_date?: string | null
  final_completion_date?: string | null
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
  variation_order_id: string | null
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
  variation_order_id?: string | null
}

export interface BoqRevisionCreateInput {
  organization_id: string
  project_id: string
  contract_id: string
  revision_number?: number
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
  contract_quantity: string
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
  valuation_date: string | null
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
  period_number?: number
  valuation_date?: string
  remarks?: string
  lines: ClaimLineCreateInput[]
}

export interface ClaimBatchUpdateInput {
  valuation_date?: string
  remarks?: string
  lines: ClaimLineCreateInput[]
}

export interface CertificateLineValuation {
  boq_item_id: string
  item_code: string
  description: string
  unit: string
  rate: string
  contract_quantity: string
  previous_certified_quantity: string
  claimed_quantity_this_period: string
  certified_quantity_this_period: string
  work_value_to_date: string
  materials_on_site_value_to_date: string | null
  notes: string | null
}

export interface CertificateLine extends CertificateLineValuation {
  id: string
  variation_value_to_date: string | null
  preliminaries_value_to_date: string | null
  dayworks_value_to_date: string | null
  escalation_value_to_date: string | null
  contra_charge_value_to_date: string | null
  other_deduction_value_to_date: string | null
}

export interface CertificateTotals {
  previous_net_certified_excl_tax: string
  gross_value_to_date: string
  retention_held_to_date: string
  retention_released_to_date: string
  contra_charges_to_date: string
  net_certified_to_date_excl_tax: string
  amount_due_this_certificate_excl_tax: string
  tax_this_certificate: string
  amount_due_this_certificate_incl_tax: string
}

export interface CertificateBatch extends CertificateTotals {
  id: string
  organization_id: string
  project_id: string
  contract_id: string
  claim_batch_id: string | null
  certificate_number: string
  status: string
  issue_date: string
  issued_by_user_id: string | null
  created_at: string
  updated_at: string
  lines: CertificateLine[]
}

export interface CertificateLineAdjustment {
  boq_item_id: string
  certified_quantity_this_period: string
  certified_materials_on_site_value?: string
  notes?: string
}

export interface CertificateValuation extends CertificateTotals {
  claim_batch_id: string | null
  contract_id: string
  contract_value: string
  lines: CertificateLineValuation[]
}

/** For a claim, or (claim_batch_id omitted) a certificate without a claim such as a retention release. */
export interface CertificateValuationInput {
  claim_batch_id?: string
  contract_id?: string
  issue_date?: string
  adjustments: CertificateLineAdjustment[]
}

export interface CertificateBatchCreateInput extends CertificateValuationInput {
  organization_id: string
  project_id: string
  contract_id: string
  certificate_number?: string
  issue_date: string
}

export interface VariationItem {
  item_code: string
  description: string
  unit: string
  quantity: string
  rate: string
}

export interface VariationOrder {
  id: string
  organization_id: string
  project_id: string
  contract_id: string
  number: string
  title: string
  description: string | null
  status: 'Submitted' | 'Approved' | 'Rejected'
  items: VariationItem[]
  value: string
  submitted_by_user_id: string
  decided_by_user_id: string | null
  decided_at: string | null
  decision_remarks: string | null
  created_at: string
}

export interface VariationOrderCreateInput {
  contract_id: string
  title: string
  description?: string
  items: VariationItem[]
  approve_now?: boolean
}

export interface ContraCharge {
  id: string
  contract_id: string
  description: string
  amount: string
  charge_date: string
  certificate_batch_id: string | null
  created_by_user_id: string
  created_at: string
}

export interface ContraChargeCreateInput {
  contract_id: string
  description: string
  amount: string
  charge_date?: string
}
