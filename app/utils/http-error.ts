interface HttpErrorLike {
  data?: {
    statusMessage?: unknown
    message?: unknown
  }
  statusMessage?: unknown
  message?: unknown
}

function pickMessage(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function extractHttpErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const candidate = error as HttpErrorLike

  return (
    pickMessage(candidate.data?.statusMessage) ??
    pickMessage(candidate.data?.message) ??
    pickMessage(candidate.statusMessage) ??
    pickMessage(candidate.message)
  )
}
