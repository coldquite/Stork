import { getPdfEmbeddedFontCss } from '#server/utils/export/pdf/embedded-font-css'
import { escapeHtml, getPdfBrandLogoDataUrl } from '#server/utils/export/pdf/templates/common'
import {
  renderPdfBaseDocumentStyles,
  renderPdfBrandHeaderStyles,
  renderPdfBrandTitleStyles
} from '#server/utils/export/pdf/templates/visual-style'

const DEFAULT_PDF_BRAND_LOGO_ALT = 'Fakulta informačních technologií ČVUT v Praze'
const DEFAULT_PDF_BRAND_LOGO_WIDTH_MM = 50
const DEFAULT_PDF_BRAND_HEADER_MARGIN_BOTTOM_MM = 2.8
const DEFAULT_PDF_BRAND_DIVIDER_MARGIN_TOP_MM = 1.2
const DEFAULT_PDF_BRAND_DIVIDER_HEIGHT_MM = 0.6

export interface PdfTemplateRenderAssets {
  embeddedFontCss: string
  brandLogoDataUrl: string
}

interface RenderPdfBrandHeaderHtmlOptions {
  brandLogoDataUrl: string
  brandTitleHtml: string
  brandLogoAlt?: string
}

interface RenderPdfLayoutStylesOptions {
  embeddedFontCss: string
  brandTitleWidthPercent: number
}

export async function loadPdfTemplateRenderAssets(): Promise<PdfTemplateRenderAssets> {
  const [embeddedFontCss, brandLogoDataUrl] = await Promise.all([getPdfEmbeddedFontCss(), getPdfBrandLogoDataUrl()])
  return {
    embeddedFontCss,
    brandLogoDataUrl
  }
}

export function renderPdfBrandHeaderHtml(options: RenderPdfBrandHeaderHtmlOptions): string {
  const brandLogoAlt = options.brandLogoAlt ?? DEFAULT_PDF_BRAND_LOGO_ALT

  return `<header class="brand-header">
    <div class="brand-header-top">
      <img src="${options.brandLogoDataUrl}" class="brand-logo" alt="${escapeHtml(brandLogoAlt)}" />
      <h1 class="brand-title">${options.brandTitleHtml}</h1>
    </div>
    <div class="brand-divider"></div>
  </header>`
}

export function renderPdfLayoutStyles(options: RenderPdfLayoutStylesOptions): string {
  const baseDocumentStyles = renderPdfBaseDocumentStyles(options.embeddedFontCss)
  const brandHeaderStyles = renderPdfBrandHeaderStyles({
    logoWidthMm: DEFAULT_PDF_BRAND_LOGO_WIDTH_MM,
    headerMarginBottomMm: DEFAULT_PDF_BRAND_HEADER_MARGIN_BOTTOM_MM,
    dividerMarginTopMm: DEFAULT_PDF_BRAND_DIVIDER_MARGIN_TOP_MM,
    dividerHeightMm: DEFAULT_PDF_BRAND_DIVIDER_HEIGHT_MM
  })
  const brandTitleStyles = renderPdfBrandTitleStyles({
    titleWidthPercent: options.brandTitleWidthPercent
  })

  return [baseDocumentStyles, brandHeaderStyles, brandTitleStyles].join('\n')
}
