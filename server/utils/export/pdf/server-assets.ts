import { Buffer } from 'node:buffer'
import { useStorage } from 'nitropack/runtime'

interface ReadServerAssetAsBase64Options {
  stringEncoding?: BufferEncoding
  entityLabel: string
}

function ensureAssetBuffer(value: unknown, key: string, options: Required<ReadServerAssetAsBase64Options>): Buffer {
  if (Buffer.isBuffer(value)) {
    return value
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value)
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value)
  }

  if (typeof value === 'string') {
    return Buffer.from(value, options.stringEncoding)
  }

  throw new Error(
    `Unable to load required ${options.entityLabel} "${key}": unexpected asset payload type "${typeof value}"`
  )
}

export async function readServerAssetAsBase64(key: string, options: ReadServerAssetAsBase64Options): Promise<string> {
  const resolvedOptions: Required<ReadServerAssetAsBase64Options> = {
    stringEncoding: options.stringEncoding ?? 'binary',
    entityLabel: options.entityLabel
  }

  const rawValue = await useStorage('assets:server').getItemRaw(key)
  if (rawValue === null || rawValue === undefined) {
    throw new Error(
      `Unable to load required ${resolvedOptions.entityLabel} "${key}": asset was not found in server/assets`
    )
  }

  return ensureAssetBuffer(rawValue, key, resolvedOptions).toString('base64')
}
