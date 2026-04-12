import type { PostPdfInvigilatorsExportRequestDto } from '#shared/types/export/pdf-invigilators'
import { PDF_INVIGILATORS_EXPORT_DICTIONARY } from '#shared/i18n/pdf-invigilators-export'
import { escapeHtml } from '#server/utils/export/pdf/templates/common'
import {
  loadPdfTemplateRenderAssets,
  renderPdfBrandHeaderHtml,
  renderPdfLayoutStyles
} from '#server/utils/export/pdf/templates/layout'
import {
  renderPdfTableHeaderLabelHtml,
  renderPdfTableHeaderLabelStyles
} from '#server/utils/export/pdf/templates/table-header'
import {
  renderPdfSectionHeadingStyles,
  renderPdfTableBaseStyles
} from '#server/utils/export/pdf/templates/visual-style'

const PDF_TABLE_COLUMNS = [
  PDF_INVIGILATORS_EXPORT_DICTIONARY.table.preparationStart,
  PDF_INVIGILATORS_EXPORT_DICTIONARY.table.committeeExam,
  PDF_INVIGILATORS_EXPORT_DICTIONARY.table.student,
  PDF_INVIGILATORS_EXPORT_DICTIONARY.table.thesisTitle
] as const
const PDF_TABLE_COMMITTEE_HEADER_LABEL = PDF_INVIGILATORS_EXPORT_DICTIONARY.table.committeeAndRoom
const PDF_DOCUMENT_TITLE = PDF_INVIGILATORS_EXPORT_DICTIONARY.documentHeaderTitle
const EMPTY_VALUE = PDF_INVIGILATORS_EXPORT_DICTIONARY.table.emptyRowsFallback

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
  const { embeddedFontCss, brandLogoDataUrl } = await loadPdfTemplateRenderAssets()
  const layoutStyles = renderPdfLayoutStyles({
    embeddedFontCss,
    brandTitleWidthPercent: 46
  })
  let previousDayKey: string | null = null

  const sectionsHtml = payload.sections
    .map((section, index) => {
      const isNewDay = section.dayKey !== previousDayKey
      previousDayKey = section.dayKey
      const sectionClass = isNewDay && index > 0 ? 'pdf-section pdf-section--new-day' : 'pdf-section'
      const brandHeader =
        index === 0
          ? renderPdfBrandHeaderHtml({
              brandLogoDataUrl,
              brandLogoAlt: PDF_INVIGILATORS_EXPORT_DICTIONARY.brandLogoAlt,
              brandTitleHtml: escapeHtml(PDF_DOCUMENT_TITLE)
            })
          : ''
      const sectionTitle = PDF_INVIGILATORS_EXPORT_DICTIONARY.sectionTitle(section.dayLabel, section.roomLabel)
      const invigilatorsLine = PDF_INVIGILATORS_EXPORT_DICTIONARY.invigilatorsLine(section.invigilatorsLabel)

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
              <th>${renderPdfTableHeaderLabelHtml(PDF_TABLE_COMMITTEE_HEADER_LABEL, { withDivider: true })}</th>
            </tr>
          </thead>
          <tbody>
            ${renderStudentsTableRows(section)}
          </tbody>
        </table>
      </section>`
    })
    .join('\n')

  const sectionHeadingStyles = renderPdfSectionHeadingStyles()
  const tableBaseStyles = renderPdfTableBaseStyles()

  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(PDF_DOCUMENT_TITLE)}</title>
    <style>
      ${layoutStyles}
      ${sectionHeadingStyles}

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
        font-weight: 450;
      }

      .thesis-title-value {
        display: block;
      }

      .committee-cell-name,
      .committee-cell-room {
        display: block;
      }

      .committee-cell-room {
        margin-top: 0.45mm;
      }

      ${renderPdfTableHeaderLabelStyles()}

      ${tableBaseStyles}

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
        width: 26.5%;
      }

      th:nth-child(4),
      td:nth-child(4) {
        width: 37.2%;
      }

      th:nth-child(5),
      td:nth-child(5) {
        width: 14%;
      }
    </style>
  </head>
  <body>
    ${sectionsHtml}
  </body>
</html>`
}
