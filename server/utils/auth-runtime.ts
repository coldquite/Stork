import { createError } from 'h3'

function toPositiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return Math.floor(parsed)
}

function parseRequiredAuthTtl(value: unknown, key: string): number {
  const parsed = toPositiveInteger(value)

  if (parsed === null) {
    throw createError({
      statusCode: 500,
      statusMessage: `Invalid runtime auth config: ${key} must be a positive integer`
    })
  }

  return parsed
}

export function resolveSessionMaxAgeSeconds(value: unknown): number {
  return parseRequiredAuthTtl(value, 'authSessionMaxAgeSeconds')
}

export function resolveSessionAbsoluteMaxAgeSeconds(value: unknown): number {
  return parseRequiredAuthTtl(value, 'authSessionAbsoluteMaxAgeSeconds')
}

export function resolveOAuthStateMaxAgeSeconds(value: unknown): number {
  return parseRequiredAuthTtl(value, 'authOAuthStateMaxAgeSeconds')
}
