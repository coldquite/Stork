import type { PostPdfInvigilatorsExportRequestDto } from '#shared/types/export/pdf-invigilators'
import { getPdfEmbeddedFontCss } from '#server/utils/export/pdf/embedded-font-css'
import { readServerAssetAsBase64 } from '#server/utils/export/pdf/server-assets'
import {
  renderPdfBaseDocumentStyles,
  renderPdfBrandHeaderStyles,
  renderPdfSectionHeadingStyles,
  renderPdfTableBaseStyles
} from '#server/utils/export/pdf/templates/visual-style'

const PDF_TABLE_COLUMNS = ['Začátek přípravy', 'Zkouška před komisí', 'Student/ka', 'Název závěrečné práce'] as const
const PDF_TABLE_COMMITTEE_HEADER_TITLE = 'Komise'
const PDF_TABLE_COMMITTEE_HEADER_ROOM = 'místnost'
const PDF_DOCUMENT_TITLE = 'Seznam studentů pro účely dozoru u písemné přípravy'

const EMPTY_VALUE = '—'
const FIT_LOGO_CZ_ASSET_KEY = 'pdf-export/logo/logo-fit-cs-modra.svg'
const PDF_BRAND_LOGO_WIDTH_MM = 50
const PDF_BRAND_HEADER_MARGIN_BOTTOM_MM = 2.8
const PDF_BRAND_DIVIDER_MARGIN_TOP_MM = 1.2
const PDF_BRAND_DIVIDER_HEIGHT_MM = 0.6

let cachedPdfBrandLogoDataUrlPromise: Promise<string> | null = null

async function buildPdfBrandLogoDataUrl(): Promise<string> {
  const base64 = await readServerAssetAsBase64(FIT_LOGO_CZ_ASSET_KEY, {
    entityLabel: 'PDF asset',
    stringEncoding: 'utf8'
  })
  return `data:image/svg+xml;base64,${base64}`
}

async function getPdfBrandLogoDataUrl(): Promise<string> {
  if (!cachedPdfBrandLogoDataUrlPromise) {
    cachedPdfBrandLogoDataUrlPromise = buildPdfBrandLogoDataUrl().catch((error: unknown) => {
      cachedPdfBrandLogoDataUrlPromise = null
      throw error
    })
  }

  return cachedPdfBrandLogoDataUrlPromise
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderStudentsTableRows(section: PostPdfInvigilatorsExportRequestDto['sections'][number]): string {
  if (section.students.length < 1) {
    return `<tr><td colspan="5" class="empty-cell">${escapeHtml(EMPTY_VALUE)}</td></tr>`
  }

  return section.students
    .map((student) => {
      return `<tr>
        <td>${escapeHtml(student.prepareStartTime)}</td>
        <td>${escapeHtml(student.committeeExamRangeTime)}</td>
        <td>
          <span class="student-name">${escapeHtml(student.studentName)}</span>
          <span class="student-repeat">${escapeHtml(student.repeatLabel)}</span>
        </td>
        <td><span class="thesis-title-value">${escapeHtml(student.thesisTitle)}</span></td>
        <td>
          <span class="committee-cell-name">${escapeHtml(student.committeeLabel)}</span>
          <span class="committee-cell-room">${escapeHtml(student.roomLabel)}</span>
        </td>
      </tr>`
    })
    .join('')
}

export async function renderPdfInvigilatorsHtml(payload: PostPdfInvigilatorsExportRequestDto): Promise<string> {
  const [embeddedFontCss, brandLogoDataUrl] = await Promise.all([getPdfEmbeddedFontCss(), getPdfBrandLogoDataUrl()])
  let previousDayKey: string | null = null

  const sectionsHtml = payload.sections
    .map((section, index) => {
      const isNewDay = section.dayKey !== previousDayKey
      previousDayKey = section.dayKey
      const sectionClass = isNewDay && index > 0 ? 'pdf-section pdf-section--new-day' : 'pdf-section'
      const brandHeader =
        index === 0
          ? `<header class="brand-header">
            <div class="brand-header-top">
              <img src="${brandLogoDataUrl}" class="brand-logo" alt="Fakulta informačních technologií ČVUT v Praze" />
              <h1 class="brand-title">${escapeHtml(PDF_DOCUMENT_TITLE)}</h1>
            </div>
            <div class="brand-divider"></div>
          </header>`
          : ''
      const sectionTitle = `Dozor u písemné přípravy, ${section.dayLabel} (místnost přípravy ${section.roomLabel})`
      const invigilatorsLine = `Dozor: ${section.invigilatorsLabel}`

      return `<section class="${sectionClass}">
        <div class="section-heading-block">
          ${brandHeader}
          <h2>${escapeHtml(sectionTitle)}</h2>
          <p class="invigilators-line">${escapeHtml(invigilatorsLine)}</p>
        </div>
        <table>
          <thead>
            <tr>
              ${PDF_TABLE_COLUMNS.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}
              <th>
                <span class="committee-header-name">${escapeHtml(PDF_TABLE_COMMITTEE_HEADER_TITLE)}</span>
                <span class="committee-header-room">${escapeHtml(PDF_TABLE_COMMITTEE_HEADER_ROOM)}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            ${renderStudentsTableRows(section)}
          </tbody>
        </table>
      </section>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(PDF_DOCUMENT_TITLE)}</title>
    <style>
      ${renderPdfBaseDocumentStyles(embeddedFontCss)}
      ${renderPdfBrandHeaderStyles({
        logoWidthMm: PDF_BRAND_LOGO_WIDTH_MM,
        headerMarginBottomMm: PDF_BRAND_HEADER_MARGIN_BOTTOM_MM,
        dividerMarginTopMm: PDF_BRAND_DIVIDER_MARGIN_TOP_MM,
        dividerHeightMm: PDF_BRAND_DIVIDER_HEIGHT_MM
      })}
      ${renderPdfSectionHeadingStyles()}

      .brand-header-top {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 8mm;
      }

      .brand-title {
        margin: 0;
        flex: 0 0 46%;
        max-width: 46%;
        font-size: 12pt;
        font-weight: 700;
        line-height: 1.5;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        text-align: right;
      }

      .pdf-section {
        margin: 0 0 10mm;
      }

      .pdf-section--new-day {
        break-before: page;
      }

      .section-heading-block {
        break-after: avoid-page;
        page-break-after: avoid;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .section-heading-block h2,
      .section-heading-block .invigilators-line {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .section-heading-block .invigilators-line {
        break-before: avoid-page;
        page-break-before: avoid;
      }

      .section-heading-block + table {
        break-before: avoid-page;
        page-break-before: avoid;
      }

      .section-heading-block + table thead,
      .section-heading-block + table thead tr,
      .section-heading-block + table tbody tr:first-child {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .invigilators-line {
        margin: 2.8mm 0 3.5mm;
        font-weight: 500;
      }

      .student-name,
      .student-repeat {
        display: block;
      }

      .student-repeat {
        margin-top: 0.6mm;
        font-size: 8pt;
        font-style: italic;
        font-weight: 400;
      }

      .thesis-title-value {
        display: block;
      }

      .committee-header-name,
      .committee-header-room,
      .committee-cell-name,
      .committee-cell-room {
        display: block;
      }

      .committee-header-room,
      .committee-cell-room {
        margin-top: 0.45mm;
      }

      ${renderPdfTableBaseStyles()}

      thead th {
        font-weight: 700;
      }

      tbody tr {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      th:nth-child(1),
      td:nth-child(1) {
        width: 9.5%;
      }

      th:nth-child(2),
      td:nth-child(2) {
        width: 13%;
      }

      th:nth-child(3),
      td:nth-child(3) {
        width: 27.5%;
      }

      th:nth-child(4),
      td:nth-child(4) {
        width: 37.2%;
      }

      th:nth-child(5),
      td:nth-child(5) {
        width: 12%;
      }
    </style>
  </head>
  <body>
    ${sectionsHtml}
  </body>
</html>`
}
