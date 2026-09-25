import { describe, expect, it } from 'vitest'

import { buildCertificate, buildCertificateLine, buildClaim, buildContract, buildProject, buildRevision } from '../test/fixtures'
import { certifiedQuantityByItemCode, summarizeContracts } from './commercial'
import { claimActionsFor } from './permissions'

describe('certifiedQuantityByItemCode', () => {
  it('sums certified quantities across live certificates and ignores voided ones', () => {
    const certificates = [
      buildCertificate({ id: 'c1', created_at: '2026-01-01T00:00:00Z' }),
      buildCertificate({
        id: 'c2',
        created_at: '2026-02-01T00:00:00Z',
        lines: [buildCertificateLine({ certified_quantity_this_period: '10.0000' })],
      }),
      buildCertificate({
        id: 'c3',
        status: 'Voided',
        lines: [buildCertificateLine({ certified_quantity_this_period: '99.0000' })],
      }),
    ]

    expect(certifiedQuantityByItemCode(certificates, 'contract-1').get('B1')).toBe(50)
  })
})

describe('summarizeContracts', () => {
  it('uses the latest live certificate for cumulative values and the BOQ for contract value', () => {
    const [summary] = summarizeContracts(
      [buildContract()],
      [buildProject()],
      [buildRevision()],
      [buildClaim({ status: 'Submitted' })],
      [
        buildCertificate({ id: 'c1', status: 'Paid', created_at: '2026-01-01T00:00:00Z' }),
        buildCertificate({ id: 'c2', gross_value_to_date: '12000.00', retention_held_to_date: '1200.00', created_at: '2026-02-01T00:00:00Z' }),
      ],
    )

    expect(summary.contractValue).toBe(30000)
    expect(summary.grossCertified).toBe(12000)
    expect(summary.retentionHeld).toBe(1200)
    expect(summary.percentComplete).toBe(40)
    expect(summary.paid).toBe(8280)
    expect(summary.openClaims).toHaveLength(1)
  })
})

describe('claimActionsFor', () => {
  it('lets a QS approve a submitted claim in one step', () => {
    expect(claimActionsFor('Submitted', 'QuantitySurveyor').map((action) => action.to)).toEqual(['Approved', 'Rejected'])
  })

  it('only lets a subcontractor submit or reopen', () => {
    expect(claimActionsFor('Draft', 'Contractor').map((action) => action.to)).toEqual(['Submitted'])
    expect(claimActionsFor('Submitted', 'Contractor')).toEqual([])
    expect(claimActionsFor('Rejected', 'Contractor').map((action) => action.to)).toEqual(['Draft'])
  })

  it('requires a reason to reject', () => {
    expect(claimActionsFor('Submitted', 'OrgAdmin').find((action) => action.to === 'Rejected')?.needsReason).toBe(true)
  })
})
