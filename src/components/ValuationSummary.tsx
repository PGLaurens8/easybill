import type { CertificateTotals } from '../types/api'
import { formatCurrency, toNumber } from '../utils/format'

/** The payment calculation, laid out the way a QS reads a certificate. */
export default function ValuationSummary({
  totals,
  contractValue,
  currency,
}: {
  totals: CertificateTotals
  contractValue?: string
  currency: string
}) {
  const money = (value: string) => formatCurrency(value, currency)
  const released = toNumber(totals.retention_released_to_date)
  const deductions = toNumber(totals.contra_charges_to_date)
  const rows: Array<[string, string]> = [
    ['Gross value to date', money(totals.gross_value_to_date)],
    [released > 0 ? 'Less retention held (after release)' : 'Less retention', `(${money(totals.retention_held_to_date)})`],
    ...(deductions > 0 ? ([['Less deductions (contra-charges)', `(${money(totals.contra_charges_to_date)})`]] as Array<[string, string]>) : []),
    ['Net value to date', money(totals.net_certified_to_date_excl_tax)],
    ['Less previously certified', `(${money(totals.previous_net_certified_excl_tax)})`],
    ['Amount due excl VAT', money(totals.amount_due_this_certificate_excl_tax)],
    ['VAT', money(totals.tax_this_certificate)],
  ]
  return (
    <div className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
      {contractValue ? (
        <p className="mb-2 text-xs text-stone-500">
          Contract value {money(contractValue)}
          {toNumber(contractValue) > 0
            ? ` · ${Math.round((toNumber(totals.gross_value_to_date) / toNumber(contractValue)) * 1000) / 10}% complete`
            : ''}
        </p>
      ) : null}
      {released > 0 ? (
        <p className="mb-2 text-xs font-medium text-emerald-800">Retention released to date: {money(totals.retention_released_to_date)}</p>
      ) : null}
      <dl className="space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-stone-600">{label}</dt>
            <dd className="tabular-nums text-stone-900">{value}</dd>
          </div>
        ))}
        <div className="mt-2 flex justify-between gap-4 border-t border-stone-300 pt-2">
          <dt className="font-semibold text-stone-900">Amount due incl VAT</dt>
          <dd className="text-lg font-bold tabular-nums text-stone-900" data-testid="amount-due">
            {money(totals.amount_due_this_certificate_incl_tax)}
          </dd>
        </div>
      </dl>
    </div>
  )
}
