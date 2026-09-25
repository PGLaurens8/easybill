const currencyFormatters = new Map<string, Intl.NumberFormat>()

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatCurrency(value: string | number | null | undefined, currencyCode = 'ZAR'): string {
  let formatter = currencyFormatters.get(currencyCode)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    currencyFormatters.set(currencyCode, formatter)
  }
  return formatter.format(toNumber(value))
}

/** Quantities: up to 3 decimals, trailing zeros dropped (12.5 not 12.5000). */
export function formatQuantity(value: string | number | null | undefined): string {
  return new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 3 }).format(toNumber(value))
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 1 }).format(value)}%`
}

export function formatDate(value: string | null | undefined, fallback = 'Not set'): string {
  if (!value) {
    return fallback
  }
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(new Date(value))
}

export function formatDateTime(value: string | null | undefined, fallback = 'Not set'): string {
  if (!value) {
    return fallback
  }
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function todayIsoDate(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

/** "2026-02" for a date string or today. */
export function toMonthInput(value?: string | null): string {
  return (value ?? todayIsoDate()).slice(0, 7)
}

/** Last day of the month from an <input type="month"> value, e.g. "2026-02" -> "2026-02-28". */
export function monthEndIsoDate(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthIndex, 0)).toISOString().slice(0, 10)
}

export function formatMonth(value: string | null | undefined, fallback = ''): string {
  if (!value) {
    return fallback
  }
  return new Intl.DateTimeFormat('en-ZA', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  )
}
