const LOOKUP_KEY_EXTRA_PUNCTUATION_PATTERN = /[;:()[\]{}"'`]/g
const LOOKUP_KEY_NON_BREAKING_SPACES_PATTERN = /[\u00A0\u202F]/g
const LOOKUP_KEY_SPLIT_PATTERN = /\s+/g
const LOOKUP_KEY_LOCALE = 'cs-CZ'

export function buildTeachersDictionaryLookupKey(canonicalName: string): string {
  const tokens = canonicalName
    .normalize('NFKC')
    .replace(LOOKUP_KEY_NON_BREAKING_SPACES_PATTERN, ' ')
    .replace(/\./g, '')
    .replace(/,/g, ' ')
    .replace(LOOKUP_KEY_EXTRA_PUNCTUATION_PATTERN, ' ')
    .trim()
    .split(LOOKUP_KEY_SPLIT_PATTERN)
    .map((token) => token.toLocaleLowerCase(LOOKUP_KEY_LOCALE))
    .filter((token) => token.length > 0)
    .sort((left, right) => left.localeCompare(right, LOOKUP_KEY_LOCALE))

  return tokens.join(' ')
}
