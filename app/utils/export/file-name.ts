export const CZECH_TIME_ZONE = 'Europe/Prague'

const FILE_NAME_UNSAFE_CHARACTERS_REGEX = /[<>:"/\\|?*]/g
const FILE_NAME_TRAILING_DOTS_REGEX = /\.+$/u

function resolveFormatPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '00'
}

export function buildCzechTimestampForFileName(now: Date): string {
  const formatter = new Intl.DateTimeFormat('cs-CZ', {
    timeZone: CZECH_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  const parts = formatter.formatToParts(now)
  const day = resolveFormatPart(parts, 'day')
  const month = resolveFormatPart(parts, 'month')
  const year = resolveFormatPart(parts, 'year')
  const hour = resolveFormatPart(parts, 'hour')
  const minute = resolveFormatPart(parts, 'minute')
  const second = resolveFormatPart(parts, 'second')

  return `${day}.${month}.${year}_${hour}-${minute}-${second}`
}

export function sanitizeFileNamePart(value: string, fallbackValue: string): string {
  const normalizedValue = value.trim().replace(/\s+/g, ' ')
  const sanitizedValue = normalizedValue
    .replace(FILE_NAME_UNSAFE_CHARACTERS_REGEX, '-')
    .replace(FILE_NAME_TRAILING_DOTS_REGEX, '')

  return sanitizedValue.length > 0 ? sanitizedValue : fallbackValue
}
