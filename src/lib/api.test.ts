import { describe, expect, it } from 'vitest'

import { ApiError, formatApiError } from './api'

describe('formatApiError', () => {
  it('includes status and request id for API failures', () => {
    const error = new ApiError('Database request failed', 500, null, 'req-123')

    expect(formatApiError(error, 'Fallback')).toBe('Database request failed · HTTP 500 · request req-123')
  })

  it('falls back to plain error messages for non-api errors', () => {
    expect(formatApiError(new Error('Plain failure'), 'Fallback')).toBe('Plain failure')
  })

  it('uses the fallback when the thrown value is not an error', () => {
    expect(formatApiError(null, 'Fallback')).toBe('Fallback')
  })
})
