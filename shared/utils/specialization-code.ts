function normalizeInput(value: string): string {
  return value.trim().toUpperCase()
}

/**
 * Normalizes specialization code to a consistent shape.
 * Example: BI-IB21 => BI-IB.21
 */
export function normalizeSpecializationCodeWithVersion(value: string): string {
  const normalizedValue = normalizeInput(value)
  const matchedValue = normalizedValue.match(/^(.*?)(\d+)$/)
  if (!matchedValue) {
    return normalizedValue
  }

  const prefix = matchedValue[1] ?? ''
  const digits = matchedValue[2] ?? ''
  if (prefix.endsWith('.')) {
    return `${prefix}${digits}`
  }

  return `${prefix}.${digits}`
}

function stripTrailingVersionOrSeparators(value: string): string {
  return value
    .replace(/\.\d+$/u, '')
    .replace(/\d+$/u, '')
    .replace(/[.-]+$/u, '')
}

/**
 * Extracts non-individual specialization code from individual study-plan code.
 * Examples:
 *   - BI-PS-ISP-515623 => BI-PS
 *   - BI-PS.21-ISP-515623 => BI-PS
 *   - BI-PS21-ISP-515623 => BI-PS
 */
export function extractNonIndividualSpecializationCode(value: string): string | null {
  const normalizedValue = normalizeInput(value)
  const ispMatch = normalizedValue.match(/^(.*?)-ISP.*$/u)
  if (!ispMatch) {
    return null
  }

  const candidatePrefix = ispMatch[1] ?? ''
  const normalizedPrefix = stripTrailingVersionOrSeparators(candidatePrefix)
  if (normalizedPrefix.length < 1) {
    return null
  }

  return normalizedPrefix
}

/**
 * Normalizes specialization code for department lookup.
 * Examples:
 *   - BI-SI21 => BI-SI
 *   - BI-SI.2027 => BI-SI
 *   - BI-PS-ISP-515623 => BI-PS
 */
export function normalizeSpecializationCodeForDepartmentLookup(value: string): string {
  const nonIndividualSpecializationCode = extractNonIndividualSpecializationCode(value)
  if (nonIndividualSpecializationCode) {
    return nonIndividualSpecializationCode
  }

  const withNormalizedVersion = normalizeSpecializationCodeWithVersion(value)
  return stripTrailingVersionOrSeparators(withNormalizedVersion)
}
