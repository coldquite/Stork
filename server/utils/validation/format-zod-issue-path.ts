export function formatZodIssuePath(path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return 'payload'
  }

  let result = 'payload'
  for (const segment of path) {
    if (typeof segment === 'number') {
      result += `[${segment}]`
      continue
    }

    if (typeof segment === 'symbol') {
      result += '.[symbol]'
      continue
    }

    result += `.${segment}`
  }

  return result
}
