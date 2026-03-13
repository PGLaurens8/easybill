export type ProjectStatus = 'Planned' | 'Ongoing' | 'Completed' | 'OnHold';
export type ClaimStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Certified' | 'Paid';
export type CertificateStatus = 'Draft' | 'Certified' | 'Issued' | 'Paid' | 'Voided';
export type UserRole = 'OrgAdmin' | 'CommercialManager' | 'QuantitySurveyor' | 'Contractor' | 'Accounts';

export interface ProjectUnit {
  id: string;
  name: string;
  status: string;
  areaSqm?: number;
}

export interface Project {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  clientName?: string;
  currencyCode: string;
  retentionPercentDefault?: number;
  taxPercentDefault?: number;
  units: ProjectUnit[];
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  projectId: string;
  contractorId: string;
  code: string;
  title: string;
  currencyCode: string;
  retentionPercent: number;
  retentionCapPercent?: number;
  taxPercent: number;
  status: 'Draft' | 'Active' | 'Closed';
  startDate?: string;
  endDate?: string;
}

export interface BoqItem {
  id: string;
  projectId: string;
  contractId: string;
  boqRevisionId: string;
  itemCode: string;
  tradeCode?: string;
  description: string;
  unit: string;
  contractQuantity: number;
  rate: number;
  amount: number;
  orderIndex: number;
}

export interface ClaimLine {
  id: string;
  claimId: string;
  boqItemId: string;
  claimedQuantityThisPeriod: number;
  claimedMaterialsOnSiteValue?: number;
  notes?: string;
}

export interface Claim {
  id: string;
  projectId: string;
  contractId: string;
  periodNumber: number;
  submittedByUserId: string;
  submissionDate: string;
  status: ClaimStatus;
  remarks?: string;
}

export interface CertifiedLine {
  id: string;
  certificateId: string;
  boqItemId: string;
  claimedQuantityThisPeriod: number;
  certifiedQuantityThisPeriod: number;
  previousCertifiedQuantity: number;
  rate: number;
  materialsOnSiteValueToDate?: number;
  variationValueToDate?: number;
  preliminariesValueToDate?: number;
  dayworksValueToDate?: number;
  escalationValueToDate?: number;
  contraChargeValueToDate?: number;
  otherDeductionValueToDate?: number;
  notes?: string;
}

export interface PaymentCertificate {
  id: string;
  projectId: string;
  contractId: string;
  certificateNumber: string;
  issueDate: string;
  status: CertificateStatus;
  previousNetCertifiedExclTax: number;
  grossValueToDate: number;
  retentionHeldToDate: number;
  netCertifiedToDateExclTax: number;
  amountDueThisCertificateExclTax: number;
  taxThisCertificate: number;
  amountDueThisCertificateInclTax: number;
}

export interface AuditEvent {
  id: string;
  entityType: 'Project' | 'Contract' | 'BoqRevision' | 'Claim' | 'Certificate' | 'Payment';
  entityId: string;
  actorUserId: string;
  action: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}
