import type { CertificateBatch, ClaimBatch, Contract, Organization, Project } from '../types/api'
import { escapeHtml } from '../utils/download'
import { formatCurrency, formatDate, formatQuantity, toNumber } from '../utils/format'

/** A printable, self-contained payment certificate (valuation schedule + summary + sign-off). */
export function buildCertificateDocumentHtml(
  certificate: CertificateBatch,
  project: Project | null,
  contract: Contract | null,
  claim: ClaimBatch | null,
  organization: Organization | null,
) {
  const currency = contract?.currency_code || 'ZAR'
  const money = (value: string | number | null | undefined) => formatCurrency(value, currency)
  const rows = certificate.lines
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(line.item_code)}</td>
          <td>${escapeHtml(line.description)}</td>
          <td>${escapeHtml(line.unit)}</td>
          <td class="n">${formatQuantity(line.contract_quantity)}</td>
          <td class="n">${formatQuantity(line.previous_certified_quantity)}</td>
          <td class="n">${formatQuantity(line.certified_quantity_this_period)}</td>
          <td class="n">${formatQuantity(toNumber(line.previous_certified_quantity) + toNumber(line.certified_quantity_this_period))}</td>
          <td class="n">${money(line.rate)}</td>
          <td class="n">${money(line.work_value_to_date)}</td>
        </tr>`,
    )
    .join('')
  const mosTotal = certificate.lines.reduce((sum, line) => sum + toNumber(line.materials_on_site_value_to_date), 0)
  const retentionNote = contract
    ? `${formatQuantity(contract.retention_percent)}%${
        contract.retention_cap_percent ? `, capped at ${formatQuantity(contract.retention_cap_percent)}% of contract value` : ''
      }`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(certificate.certificate_number)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1c1917; margin: 28px; font-size: 12px; }
  h1 { font-size: 22px; margin: 0; } p { margin: 0; }
  .muted { color: #57534e; }
  .head { display: flex; justify-content: space-between; border-bottom: 2px solid #30473e; padding-bottom: 12px; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 16px; margin-top: 16px; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #78716c; }
  .value { font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th, td { border-bottom: 1px solid #e7e5e4; padding: 6px 5px; text-align: left; vertical-align: top; }
  th { font-size: 10px; text-transform: uppercase; color: #57534e; background: #f5f5f4; }
  .n { text-align: right; white-space: nowrap; }
  .totals { margin: 18px 0 0 auto; width: 360px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e7e5e4; }
  .totals .due { font-size: 15px; font-weight: 700; border-top: 2px solid #1c1917; border-bottom: none; }
  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; }
  .sign div { border-top: 1px solid #1c1917; padding-top: 6px; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      <p class="label">Payment certificate</p>
      <h1>${escapeHtml(certificate.certificate_number)}</h1>
      <p class="muted">${escapeHtml(organization?.name ?? '')}</p>
    </div>
    <div style="text-align:right">
      <p class="label">Issue date</p><p class="value">${escapeHtml(formatDate(certificate.issue_date))}</p>
      <p class="label" style="margin-top:6px">Status</p><p class="value">${escapeHtml(certificate.status)}</p>
    </div>
  </div>
  <div class="meta">
    <div><p class="label">Project</p><p class="value">${escapeHtml(project ? `${project.code} · ${project.name}` : '')}</p></div>
    <div><p class="label">Contract</p><p class="value">${escapeHtml(contract ? `${contract.code} · ${contract.title}` : '')}</p></div>
    <div><p class="label">Subcontractor</p><p class="value">${escapeHtml(contract?.subcontractor_name ?? '—')}</p></div>
    <div><p class="label">Valuation</p><p class="value">${claim ? `Period ${claim.period_number}` : '—'}</p></div>
  </div>
  <table>
    <thead><tr>
      <th>Item</th><th>Description</th><th>Unit</th><th class="n">Contract qty</th><th class="n">Previous</th>
      <th class="n">This cert</th><th class="n">To date</th><th class="n">Rate</th><th class="n">Value to date</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="9">No lines.</td></tr>'}</tbody>
  </table>
  <div class="totals">
    <div><span>Work done to date</span><span>${money(toNumber(certificate.gross_value_to_date) - mosTotal)}</span></div>
    ${mosTotal ? `<div><span>Materials on site</span><span>${money(mosTotal)}</span></div>` : ''}
    <div><span>Gross value to date</span><span>${money(certificate.gross_value_to_date)}</span></div>
    <div><span>Less retention (${escapeHtml(retentionNote)})</span><span>(${money(certificate.retention_held_to_date)})</span></div>
    <div><span>Net value to date</span><span>${money(certificate.net_certified_to_date_excl_tax)}</span></div>
    <div><span>Less previously certified</span><span>(${money(certificate.previous_net_certified_excl_tax)})</span></div>
    <div><span>Amount due excl VAT</span><span>${money(certificate.amount_due_this_certificate_excl_tax)}</span></div>
    <div><span>VAT (${formatQuantity(contract?.tax_percent ?? 0)}%)</span><span>${money(certificate.tax_this_certificate)}</span></div>
    <div class="due"><span>Amount due incl VAT</span><span>${money(certificate.amount_due_this_certificate_incl_tax)}</span></div>
  </div>
  <div class="sign">
    <div>Certified by (Quantity Surveyor) &nbsp; Date</div>
    <div>Approved for payment &nbsp; Date</div>
  </div>
</body>
</html>`
}
