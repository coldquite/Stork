import { PDF_EMBEDDED_FONT_FAMILY } from '#server/utils/export/pdf/embedded-font-css'

export const PDF_VISUAL_COLORS = {
  primaryBlue: '#0065BD',
  tableGridBlue: '#4A99D8',
  lightBlue: '#6AADE4',
  lightBlueTint50: '#B5D7F2',
  lightBlueTint25: '#DAEAF8',
  black: '#000000',
  gray: '#9B9B9B'
} as const

const DEFAULT_PDF_BRAND_LOGO_WIDTH_MM = 50
const DEFAULT_PDF_BRAND_HEADER_MARGIN_BOTTOM_MM = 2.8
const DEFAULT_PDF_BRAND_DIVIDER_MARGIN_TOP_MM = 1.2
const DEFAULT_PDF_BRAND_DIVIDER_HEIGHT_MM = 0.6
const DEFAULT_PDF_BRAND_TITLE_GAP_MM = 8
const DEFAULT_PDF_BRAND_TITLE_FONT_SIZE_PT = 11.6
const DEFAULT_PDF_BRAND_TITLE_FONT_WEIGHT = 700
const DEFAULT_PDF_BRAND_TITLE_LINE_HEIGHT = 1.35
const DEFAULT_PDF_BRAND_TITLE_LETTER_SPACING_EM = 0.03
const DEFAULT_PDF_BRAND_TITLE_COLOR = PDF_VISUAL_COLORS.primaryBlue
const DEFAULT_PDF_BRAND_TITLE_TEXT_TRANSFORM = 'uppercase'
const PDF_TABLE_BORDER_WIDTH_MM = 0.28

type RenderPdfBrandHeaderStylesOptions = {
  logoWidthMm?: number
  headerMarginBottomMm?: number
  dividerMarginTopMm?: number
  dividerHeightMm?: number
}

type RenderPdfBrandTitleStylesOptions = {
  titleWidthPercent: number
  titleColor?: string
  titleTextTransform?: 'uppercase' | 'none'
}

function formatMillimeters(value: number): string {
  const fixed = value.toFixed(2)
  const trimmed = fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
  return `${trimmed}mm`
}

function formatPercent(value: number): string {
  const fixed = value.toFixed(2)
  const trimmed = fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
  return `${trimmed}%`
}

export function renderPdfBaseDocumentStyles(embeddedFontCss: string): string {
  return `
${embeddedFontCss}

@page {
  size: A4 portrait;
  margin: 15mm;
}

:root {
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  color: ${PDF_VISUAL_COLORS.black};
  font-family: '${PDF_EMBEDDED_FONT_FAMILY}';
  font-size: 10pt;
  line-height: 1.35;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
`.trim()
}

export function renderPdfBrandHeaderStyles(options: RenderPdfBrandHeaderStylesOptions = {}): string {
  const logoWidthMm = options.logoWidthMm ?? DEFAULT_PDF_BRAND_LOGO_WIDTH_MM
  const headerMarginBottomMm = options.headerMarginBottomMm ?? DEFAULT_PDF_BRAND_HEADER_MARGIN_BOTTOM_MM
  const dividerMarginTopMm = options.dividerMarginTopMm ?? DEFAULT_PDF_BRAND_DIVIDER_MARGIN_TOP_MM
  const dividerHeightMm = options.dividerHeightMm ?? DEFAULT_PDF_BRAND_DIVIDER_HEIGHT_MM

  return `
.brand-header {
  margin: 0 0 ${formatMillimeters(headerMarginBottomMm)};
}

.brand-logo {
  display: block;
  width: ${formatMillimeters(logoWidthMm)};
  max-width: 100%;
  height: auto;
}

.brand-divider {
  margin-top: ${formatMillimeters(dividerMarginTopMm)};
  width: 100%;
  height: ${formatMillimeters(dividerHeightMm)};
  background: ${PDF_VISUAL_COLORS.primaryBlue};
}
`.trim()
}

export function renderPdfBrandTitleStyles(options: RenderPdfBrandTitleStylesOptions): string {
  const titleWidth = formatPercent(options.titleWidthPercent)
  const titleColor = options.titleColor ?? DEFAULT_PDF_BRAND_TITLE_COLOR
  const titleTextTransform = options.titleTextTransform ?? DEFAULT_PDF_BRAND_TITLE_TEXT_TRANSFORM

  return `
.brand-header-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${formatMillimeters(DEFAULT_PDF_BRAND_TITLE_GAP_MM)};
}

.brand-title {
  margin: 0;
  flex: 0 0 ${titleWidth};
  max-width: ${titleWidth};
  color: ${titleColor};
  font-size: ${DEFAULT_PDF_BRAND_TITLE_FONT_SIZE_PT}pt;
  font-weight: ${DEFAULT_PDF_BRAND_TITLE_FONT_WEIGHT};
  line-height: ${DEFAULT_PDF_BRAND_TITLE_LINE_HEIGHT};
  letter-spacing: ${DEFAULT_PDF_BRAND_TITLE_LETTER_SPACING_EM}em;
  text-transform: ${titleTextTransform};
  text-align: right;
}
`.trim()
}

export function renderPdfSectionHeadingStyles(): string {
  return `
h2 {
  margin: 0;
  color: ${PDF_VISUAL_COLORS.primaryBlue};
  font-size: 12pt;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.3;
}
`.trim()
}

export function renderPdfTableBaseStyles(): string {
  const tableBorderWidth = formatMillimeters(PDF_TABLE_BORDER_WIDTH_MM)
  const bodyFontWeight = 450
  const headerFontWeight = 400

  return `
table {
  width: 99.2%;
  max-width: 99.2%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-synthesis: none;
}

thead {
  display: table-header-group;
}

tbody tr {
  break-inside: avoid;
}

th,
td {
  border: 0;
  border-right: ${tableBorderWidth} solid ${PDF_VISUAL_COLORS.tableGridBlue};
  border-bottom: ${tableBorderWidth} solid ${PDF_VISUAL_COLORS.tableGridBlue};
  font-size: 9pt;
  font-weight: ${bodyFontWeight};
  line-height: 1.3;
  padding: 1.8mm 1.7mm;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}

tr > *:first-child {
  border-left: ${tableBorderWidth} solid ${PDF_VISUAL_COLORS.tableGridBlue};
}

thead th {
  border-top: ${tableBorderWidth} solid ${PDF_VISUAL_COLORS.tableGridBlue};
}

th {
  background-color: ${PDF_VISUAL_COLORS.lightBlueTint50};
  color: ${PDF_VISUAL_COLORS.black};
  font-weight: ${headerFontWeight};
  word-break: keep-all;
  overflow-wrap: normal;
  hyphens: none;
}

td.empty-cell {
  color: ${PDF_VISUAL_COLORS.gray};
  text-align: center;
  font-style: italic;
}
`.trim()
}
