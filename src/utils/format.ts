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
