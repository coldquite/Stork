import { extractNonIndividualSpecializationCode } from '#shared/utils/specialization-code'

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizeNullable(value: string): string | null {
  const normalized = normalizeWhitespace(value)
  return normalized.length > 0 ? normalized : null
}

export function normalizeCompareValue(value: string): string {
  return normalizeWhitespace(value).toLowerCase()
}

// Normalizes specialization code to a consistent shape.
// KOS exports use different formats for the same value across export types.
// Example: BI-IB21 => BI-IB.21
export function normalizeSpecializationCode(value: string): string {
  const normalized = normalizeWhitespace(value)
  if (/-isp/i.test(normalized)) {
    return normalized
  }

  const matched = normalized.match(/^(.*?)(\d+)$/)
  if (!matched) {
    return normalized
  }

  const prefix = matched[1] ?? ''
  const digits = matched[2] ?? ''
  if (prefix.endsWith('.')) {
    return `${prefix}${digits}`
  }

  return `${prefix}.${digits}`
}

// Normalizes specialization code for tolerant comparisons across combined-study tracks.
//
// Example:
//   - "BIK-SI.21" -> "bi-si"
//   - "BI-SI.21" -> "bi-si"
//   - "BIE-SI.21" -> "bie-si"
export function normalizeSpecializationCodeForComparison(value: string): string {
  const normalized = normalizeCompareValue(value).replace(/k-/g, '-')
  const normalizedIndividualCode = extractNonIndividualSpecializationCode(normalized)
  if (normalizedIndividualCode) {
    return normalizeCompareValue(normalizedIndividualCode)
  }

  const withoutVersionSuffix = normalized.replace(/\.\d+$/u, '').replace(/\d+$/u, '')
  return withoutVersionSuffix.replace(/[.-]+$/u, '')
}

// Normalizes committee name into canonical form used in student rows.
// KOS committee labels can look like "242-BI, 5-BI-PI.21".
//
// Example: "242-BI, 5-BI-PI.21" -> "5-BI-PI.21"
export function preprocessCommitteeName(value: string): string {
  const normalized = normalizeWhitespace(value)
  if (normalized.length === 0) {
    return ''
  }

  const splitByComma = normalized.split(',')
  if (splitByComma.length < 2) {
    return normalized
  }

  const suffix = normalizeWhitespace(splitByComma[1] ?? '')
  return suffix.length > 0 ? suffix : normalized
}
