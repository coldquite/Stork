import { readServerAssetAsBase64 } from '#server/utils/export/pdf/server-assets'

let cachedEmbeddedFontCssPromise: Promise<string> | null = null

function buildEmbeddedFontFace(options: {
  family: string
  style: 'normal' | 'italic'
  weight: number
  base64: string
}): string {
  return `
@font-face {
  font-family: '${options.family}';
  font-style: ${options.style};
  font-weight: ${String(options.weight)};
  font-display: block;
  src: url("data:font/woff2;base64,${options.base64}") format('woff2');
}`.trim()
}

export const PDF_EMBEDDED_FONT_FAMILY = 'StorkPdfTechnika'
export const PDF_EMBEDDED_STENCIL_FONT_FAMILY = 'StorkPdfTechnikaStencil'

interface EmbeddedFontVariant {
  key: string
  family: string
  weight: number
  style: 'normal' | 'italic'
}

const TECHNIKA_FONT_VARIANTS: EmbeddedFontVariant[] = [
  {
    key: 'pdf-export/font/Technika-Light.woff2',
    family: PDF_EMBEDDED_FONT_FAMILY,
    weight: 300,
    style: 'normal'
  },
  {
    key: 'pdf-export/font/Technika-LightItalic.woff2',
    family: PDF_EMBEDDED_FONT_FAMILY,
    weight: 300,
    style: 'italic'
  },
  {
    key: 'pdf-export/font/Technika-Regular.woff2',
    family: PDF_EMBEDDED_FONT_FAMILY,
    weight: 400,
    style: 'normal'
  },
  {
    key: 'pdf-export/font/Technika-Italic.woff2',
    family: PDF_EMBEDDED_FONT_FAMILY,
    weight: 400,
    style: 'italic'
  },
  {
    key: 'pdf-export/font/Technika-Book.woff2',
    family: PDF_EMBEDDED_FONT_FAMILY,
    weight: 500,
    style: 'normal'
  },
  {
    key: 'pdf-export/font/Technika-BookItalic.woff2',
    family: PDF_EMBEDDED_FONT_FAMILY,
    weight: 500,
    style: 'italic'
  },
  {
    key: 'pdf-export/font/Technika-Bold.woff2',
    family: PDF_EMBEDDED_FONT_FAMILY,
    weight: 700,
    style: 'normal'
  },
  {
    key: 'pdf-export/font/Technika-BoldItalic.woff2',
    family: PDF_EMBEDDED_FONT_FAMILY,
    weight: 700,
    style: 'italic'
  },
  {
    key: 'pdf-export/font/TechnikaStencil-Bold.woff2',
    family: PDF_EMBEDDED_STENCIL_FONT_FAMILY,
    weight: 700,
    style: 'normal'
  }
]

async function buildPdfEmbeddedFontCss(): Promise<string> {
  const variantsWithBase64 = await Promise.all(
    TECHNIKA_FONT_VARIANTS.map(async (variant) => {
      return {
        ...variant,
        base64: await readServerAssetAsBase64(variant.key, {
          entityLabel: 'PDF font'
        })
      }
    })
  )

  return variantsWithBase64
    .map((variant) => {
      return buildEmbeddedFontFace(variant)
    })
    .join('\n')
}

export function getPdfEmbeddedFontCss(): Promise<string> {
  if (!cachedEmbeddedFontCssPromise) {
    cachedEmbeddedFontCssPromise = buildPdfEmbeddedFontCss().catch((error: unknown) => {
      cachedEmbeddedFontCssPromise = null
      throw error
    })
  }

  return cachedEmbeddedFontCssPromise
}
