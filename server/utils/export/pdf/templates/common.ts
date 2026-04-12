import escapeHtml from 'escape-html'
import { readServerAssetAsBase64 } from '#server/utils/export/pdf/server-assets'

const FIT_LOGO_CZ_ASSET_KEY = 'pdf-export/logo/logo-fit-cs-modra.svg'

let cachedPdfBrandLogoDataUrlPromise: Promise<string> | null = null

async function buildPdfBrandLogoDataUrl(): Promise<string> {
  const base64 = await readServerAssetAsBase64(FIT_LOGO_CZ_ASSET_KEY, {
    entityLabel: 'PDF asset',
    stringEncoding: 'utf8'
  })
  return `data:image/svg+xml;base64,${base64}`
}

export async function getPdfBrandLogoDataUrl(): Promise<string> {
  if (!cachedPdfBrandLogoDataUrlPromise) {
    cachedPdfBrandLogoDataUrlPromise = buildPdfBrandLogoDataUrl().catch((error: unknown) => {
      cachedPdfBrandLogoDataUrlPromise = null
      throw error
    })
  }

  return cachedPdfBrandLogoDataUrlPromise
}

export { escapeHtml }
