export class ApiError extends Error {
  status: number
  details: unknown
  requestId: string | null

  constructor(message: string, status: number, details: unknown, requestId: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    this.requestId = requestId
  }
}

interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  accessToken?: string | null
  organizationId?: string | null
  body?: unknown
  headers?: HeadersInit
}

/**
 * By default the API is served from the same origin as the app (one Vercel project, or the Vite dev
 * proxy locally). Set VITE_API_BASE_URL only when the API is hosted separately.
 */
function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.NEXT_PUBLIC_API_BASE_URL || ''
  return configuredBaseUrl.replace(/\/$/, '')
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

function getResponseRequestId(response: Response, payload: unknown) {
  const headerRequestId = response.headers.get('x-request-id')
  if (headerRequestId) {
    return headerRequestId
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'request_id' in payload &&
    typeof payload.request_id === 'string'
  ) {
    return payload.request_id
  }

  return null
}

export function formatApiError(error: unknown, fallbackMessage = 'Request failed.') {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallbackMessage
  }

  const parts = [error.message]

  if (error.status > 0) {
    parts.push(`HTTP ${error.status}`)
  }

  if (error.requestId) {
    parts.push(`request ${error.requestId}`)
  }

  return parts.join(' · ')
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { accessToken, organizationId, body, headers, ...init } = options
  const requestHeaders = new Headers(headers)

  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  if (organizationId) {
    requestHeaders.set('X-Organization-Id', organizationId)
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const payload = await parseResponse(response)

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'detail' in payload &&
      typeof payload.detail === 'string'
        ? payload.detail
        : `Request failed with status ${response.status}`

    throw new ApiError(message, response.status, payload, getResponseRequestId(response, payload))
  }

  return payload as T
}

export function getApiOrigin() {
  return getApiBaseUrl()
}
