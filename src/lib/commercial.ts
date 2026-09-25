/** Read-model helpers shared by pages. Money arithmetic that matters is done by the API. */
import type {
  BoqRevision,
  CertificateBatch,
  ClaimBatch,
  ContraCharge,
  Contract,
  Project,
  VariationOrder,
} from '../types/api'
import { toNumber } from '../utils/format'

export function latestRevisionByContract(revisions: BoqRevision[]): Map<string, BoqRevision> {
  const latest = new Map<string, BoqRevision>()
  for (const revision of revisions) {
    const current = latest.get(revision.contract_id)
    if (!current || revision.revision_number > current.revision_number) {
      latest.set(revision.contract_id, revision)
    }
  }
  return latest
}

export function revisionValue(revision: BoqRevision | undefined): number {
  return revision ? revision.items.reduce((sum, item) => sum + toNumber(item.amount), 0) : 0
}

export function liveCertificates(certificates: CertificateBatch[], contractId: string): CertificateBatch[] {
  return certificates
    .filter((certificate) => certificate.contract_id === contractId && certificate.status !== 'Voided')
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
}

/** Cumulative certified quantity per item code (carries across BOQ revisions, like the API). */
export function certifiedQuantityByItemCode(certificates: CertificateBatch[], contractId: string): Map<string, number> {
  const totals = new Map<string, number>()
  for (const certificate of liveCertificates(certificates, contractId)) {
    for (const line of certificate.lines) {
      totals.set(line.item_code, (totals.get(line.item_code) ?? 0) + toNumber(line.certified_quantity_this_period))
    }
  }
  return totals
}

export type ContractSummary = {
  contract: Contract
  project: Project | undefined
  /** Revised value: the latest BOQ, including approved variations. */
  contractValue: number
  originalValue: number
  variationsValue: number
  pendingVariations: VariationOrder[]
  deductionsTotal: number
  pendingDeductions: number
  grossCertified: number
  retentionHeld: number
  netCertified: number
  paid: number
  percentComplete: number
  lastCertificate: CertificateBatch | undefined
  openClaims: ClaimBatch[]
}

export function summarizeContracts(
  contracts: Contract[],
  projects: Project[],
  revisions: BoqRevision[],
  claims: ClaimBatch[],
  certificates: CertificateBatch[],
  variations: VariationOrder[] = [],
  contraCharges: ContraCharge[] = [],
): ContractSummary[] {
  const latest = latestRevisionByContract(revisions)

  return contracts.map((contract) => {
    const live = liveCertificates(certificates, contract.id)
    const lastCertificate = live[live.length - 1]
    const revision = latest.get(contract.id)
    const contractValue = revisionValue(revision)
    const variationsValue = (revision?.items ?? [])
      .filter((item) => item.variation_order_id)
      .reduce((sum, item) => sum + toNumber(item.amount), 0)
    const charges = contraCharges.filter((charge) => charge.contract_id === contract.id)
    const grossCertified = toNumber(lastCertificate?.gross_value_to_date)
    const paid = live
      .filter((certificate) => certificate.status === 'Paid')
      .reduce((sum, certificate) => sum + toNumber(certificate.amount_due_this_certificate_incl_tax), 0)

    return {
      contract,
      project: projects.find((project) => project.id === contract.project_id),
      contractValue,
      originalValue: contractValue - variationsValue,
      variationsValue,
      pendingVariations: variations.filter(
        (variation) => variation.contract_id === contract.id && variation.status === 'Submitted',
      ),
      deductionsTotal: charges.reduce((sum, charge) => sum + toNumber(charge.amount), 0),
      pendingDeductions: charges
        .filter((charge) => !charge.certificate_batch_id)
        .reduce((sum, charge) => sum + toNumber(charge.amount), 0),
      grossCertified,
      retentionHeld: toNumber(lastCertificate?.retention_held_to_date),
      netCertified: toNumber(lastCertificate?.net_certified_to_date_excl_tax),
      paid,
      percentComplete: contractValue > 0 ? Math.min(100, (grossCertified / contractValue) * 100) : 0,
      lastCertificate,
      openClaims: claims.filter(
        (claim) => claim.contract_id === contract.id && !['Certified', 'Paid'].includes(claim.status),
      ),
    }
  })
}

export function contractLabel(contract: Contract | undefined): string {
  if (!contract) {
    return 'Unknown contract'
  }
  return contract.subcontractor_name ? `${contract.title} · ${contract.subcontractor_name}` : contract.title
}
