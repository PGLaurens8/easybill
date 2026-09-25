/**
 * Turn rows copied from Excel (tab separated) into BOQ lines.
 *
 * Expected column order: Item code | Description | Unit | Quantity | Rate, with an optional leading
 * Trade column (6 columns). A header row and blank rows are skipped. Quantities and rates may use
 * thousands separators ("1 250,50" or "1,250.50") and currency symbols.
 */
export type PastedBoqLine = {
  item_code: string
  trade_code: string
  description: string
  unit: string
  contract_quantity: string
  rate: string
}

export type BoqPasteResult = {
  lines: PastedBoqLine[]
  skipped: number
}

export function parseSpreadsheetNumber(raw: string): number | null {
  let value = raw.replace(/[R$\u20ac\u00a3\s\u00a0]/g, '').trim()
  if (value === '' || value === '-') {
    return 0
  }

  const lastComma = value.lastIndexOf(',')
  const lastDot = value.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal separator.
    value = lastComma > lastDot ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '')
  } else if (lastComma > -1) {
    const decimals = value.length - lastComma - 1
    value = decimals === 3 && value.indexOf(',') === lastComma ? value.replace(',', '') : value.replace(/,/g, '.')
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseBoqPaste(text: string): BoqPasteResult {
  const lines: PastedBoqLine[] = []
  let skipped = 0

  for (const row of text.split(/\r?\n/)) {
    if (row.trim() === '') {
      continue
    }

    const cells = row.split('\t').map((cell) => cell.trim())
    const withTrade = cells.length >= 6
    const [trade, code, description, unit, quantityRaw, rateRaw] = withTrade ? cells : ['', ...cells]

    const quantity = parseSpreadsheetNumber(quantityRaw ?? '')
    const rate = parseSpreadsheetNumber(rateRaw ?? '')

    if (!code || !description || quantity === null || rate === null) {
      skipped += 1
      continue
    }

    lines.push({
      item_code: code,
      trade_code: trade ?? '',
      description,
      unit: unit || 'item',
      contract_quantity: String(quantity),
      rate: String(rate),
    })
  }

  return { lines, skipped }
}
