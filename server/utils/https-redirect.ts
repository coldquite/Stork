/**
 * Business rules for HTTP -> HTTPS redirect decisions.
 *
 * Redirect is enabled only for production traffic, because local development
 * runs without TLS and must stay accessible over plain HTTP
 *
 * Requests that already arrived through HTTPS (directly or reported by
 * reverse proxy via `x-forwarded-proto`) must not be redirected again
 *
 * Localhost/loopback hosts are excluded to keep local probes and healthchecks
 * stable when they intentionally call internal HTTP endpoints.
 */
interface HttpsRedirectDecisionInput {
  nodeEnv: string | undefined
  requestProtocol: string
  requestHostname: string
  forwardedProtoHeader: string | undefined
}

function normalizeForwardedProto(headerValue: string | undefined): string | null {
  if (!headerValue) {
    return null
  }

  const firstValue = headerValue.split(',')[0]
  if (!firstValue) {
    return null
  }

  return firstValue.trim().toLowerCase() || null
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]'
}

export function shouldRedirectToHttps(input: HttpsRedirectDecisionInput): boolean {
  if (input.nodeEnv !== 'production') {
    return false
  }

  if (isLocalHostname(input.requestHostname)) {
    return false
  }

  if (input.requestProtocol === 'https:') {
    return false
  }

  const forwardedProto = normalizeForwardedProto(input.forwardedProtoHeader)
  return forwardedProto !== 'https'
}
