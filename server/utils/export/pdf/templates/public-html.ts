import type { PostPdfPublicExportRequestDto } from '#shared/types/export/pdf-public'
import { getPdfEmbeddedFontCss } from '#server/utils/export/pdf/embedded-font-css'
import { escapeHtml, getPdfBrandLogoDataUrl } from '#server/utils/export/pdf/templates/common'
import {
  PDF_VISUAL_COLORS,
  renderPdfBaseDocumentStyles,
  renderPdfBrandHeaderStyles,
  renderPdfBrandTitleStyles,
  renderPdfTableBaseStyles
} from '#server/utils/export/pdf/templates/visual-style'

const PDF_DOCUMENT_TITLE = 'Plán konání státních závěrečných zkoušek'
const PDF_BRAND_LOGO_WIDTH_MM = 50
const PDF_BRAND_HEADER_MARGIN_BOTTOM_MM = 2.8
const PDF_BRAND_DIVIDER_MARGIN_TOP_MM = 1.2
const PDF_BRAND_DIVIDER_HEIGHT_MM = 0.6

function renderDocumentHeaderTitleHtml(title: string): string {
  const words = title
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
  if (words.length <= 2) {
    return escapeHtml(title)
  }

  const firstLine = words.slice(0, 2).join(' ')
  const secondLine = words.slice(2).join(' ')
  return `${escapeHtml(firstLine)}<br />${escapeHtml(secondLine)}`
}

function renderTableHeaderLabelHtml(label: string): string {
  const lines = label
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length <= 1) {
    return escapeHtml(label)
  }

  const linesHtml = lines
    .map((line, index) => {
      const dividerHtml = index > 0 ? '<span class="table-header-divider" aria-hidden="true"></span>' : ''
      return `${dividerHtml}<span class="table-header-line">${escapeHtml(line)}</span>`
    })
    .join('')

  return `<span class="table-header-multiline">${linesHtml}</span>`
}

function renderSectionRows(section: PostPdfPublicExportRequestDto['sections'][number]): string {
  if (section.rows.length < 1) {
    return `<tr><td colspan="5" class="empty-cell">${escapeHtml(section.rowsEmptyFallback)}</td></tr>`
  }

  return section.rows
    .map((row) => {
      if (row.kind === 'PAUSE') {
        return `<tr class="pause-row"><td colspan="5" class="pause-cell">${escapeHtml(row.pauseLine)}</td></tr>`
      }

      return `<tr>
        <td>${escapeHtml(row.preparationStartTime)}</td>
        <td>${escapeHtml(row.committeeExamRangeTime)}</td>
        <td>
          <span class="student-name">${escapeHtml(row.studentName)}</span>
          <span class="student-specialization">${escapeHtml(row.specializationLabel)}</span>
        </td>
        <td>${escapeHtml(row.thesisTitle)}</td>
        <td>
          <span class="teacher-line">${escapeHtml(row.supervisorLabel)}</span>
          <span class="teacher-line">${escapeHtml(row.reviewerLabel)}</span>
        </td>
      </tr>`
    })
    .join('')
}

function renderCommitteeSection(
  section: PostPdfPublicExportRequestDto['sections'][number],
  brandHeaderHtml: string
): string {
  const membersLines = section.membersLines.map((line) => `<p class="member-line">${escapeHtml(line)}</p>`).join('')

  return `<section class="committee-section">
    <div class="section-heading-block">
      ${brandHeaderHtml}
      <h2 class="degree-title">${escapeHtml(section.degreeTitle)}</h2>
      <p class="center-line">${escapeHtml(section.semesterLabel)}</p>
      <p class="center-line center-line--program">${escapeHtml(section.studyProgramLine)}</p>

      <div class="section-details-columns">
        <div class="section-details-left">
          <p class="committee-line">${escapeHtml(section.committeeLine)}</p>
          <p class="department-line">${escapeHtml(section.departmentLine)}</p>
          <p class="committee-top-meta-line">
            ${escapeHtml(section.topMetaDayLabel)}&nbsp;–&nbsp;${escapeHtml(section.topMetaRoomLine)}
          </p>
          <p class="meta-line meta-line--small">${escapeHtml(section.secretaryLine)}</p>
          <p class="meta-line meta-line--small">${escapeHtml(section.invigilatorsLine)}</p>
        </div>

        <div class="section-details-right">
          <div class="members-block">
            <p class="members-heading">${escapeHtml(section.membersHeading)}</p>
            ${membersLines}
          </div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>${renderTableHeaderLabelHtml(section.tablePreparationStartHeader)}</th>
          <th>${renderTableHeaderLabelHtml(section.tableCommitteeExamHeader)}</th>
          <th>${renderTableHeaderLabelHtml(section.tableStudentSpecializationHeader)}</th>
          <th>${renderTableHeaderLabelHtml(section.tableThesisTitleHeader)}</th>
          <th>${renderTableHeaderLabelHtml(section.tableSupervisorReviewerHeader)}</th>
        </tr>
      </thead>
      <tbody>
        ${renderSectionRows(section)}
      </tbody>
    </table>
  </section>`
}

export async function renderPdfPublicHtml(payload: PostPdfPublicExportRequestDto): Promise<string> {
  const [embeddedFontCss, brandLogoDataUrl] = await Promise.all([getPdfEmbeddedFontCss(), getPdfBrandLogoDataUrl()])
  const baseDocumentStyles = renderPdfBaseDocumentStyles(embeddedFontCss)
  const brandHeaderStyles = renderPdfBrandHeaderStyles({
    logoWidthMm: PDF_BRAND_LOGO_WIDTH_MM,
    headerMarginBottomMm: PDF_BRAND_HEADER_MARGIN_BOTTOM_MM,
    dividerMarginTopMm: PDF_BRAND_DIVIDER_MARGIN_TOP_MM,
    dividerHeightMm: PDF_BRAND_DIVIDER_HEIGHT_MM
  })
  const tableBaseStyles = renderPdfTableBaseStyles()
  const brandTitleStyles = renderPdfBrandTitleStyles({
    titleWidthPercent: 54
  })
  const sectionsHtml = payload.sections
    .map((section, index) => {
      const brandHeaderHtml =
        index === 0
          ? `<header class="brand-header">
            <div class="brand-header-top">
              <img src="${brandLogoDataUrl}" class="brand-logo" alt="Fakulta informačních technologií ČVUT v Praze" />
              <h1 class="brand-title">${renderDocumentHeaderTitleHtml(payload.documentHeaderTitle)}</h1>
            </div>
            <div class="brand-divider"></div>
          </header>`
          : ''

      return renderCommitteeSection(section, brandHeaderHtml)
    })
    .join('\n')

  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(PDF_DOCUMENT_TITLE)}</title>
    <style>
      ${baseDocumentStyles}
      ${brandHeaderStyles}
      ${brandTitleStyles}

      .committee-section {
        margin: 0 0 8mm;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .section-heading-block {
        break-after: avoid-page;
        page-break-after: avoid;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .section-heading-block h2,
      .section-heading-block p,
      .section-heading-block .members-block,
      .section-heading-block .members-block .member-line {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .committee-top-meta-line {
        margin: 0.45mm 0 0;
        font-size: 9pt;
        font-weight: 600;
        line-height: 1.25;
        letter-spacing: 0.02em;
      }

      .degree-title {
        margin: 0;
        color: ${PDF_VISUAL_COLORS.primaryBlue};
        font-size: 12pt;
        font-weight: 700;
        line-height: 1.25;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        text-align: center;
      }

      .center-line {
        margin: 0.8mm 0 0;
        text-align: center;
      }

      .center-line--program {
        margin-top: 0.45mm;
        font-size: 9.1pt;
      }

      .section-details-columns {
        margin: 2.8mm 0 2.6mm;
        display: flex;
        gap: 7mm;
        align-items: start;
      }

      .section-details-left {
        flex: 1 1 auto;
        min-width: 0;
      }

      .section-details-right {
        flex: 0 0 38%;
        min-width: 0;
      }

      .committee-line {
        margin: 0;
        color: ${PDF_VISUAL_COLORS.primaryBlue};
        font-size: 10pt;
        font-weight: 700;
        line-height: 1.25;
      }

      .department-line {
        margin: 0.25mm 0 0;
        color: ${PDF_VISUAL_COLORS.primaryBlue};
        font-size: 8.4pt;
        font-weight: 400;
        line-height: 1.25;
      }

      .meta-line {
        margin: 0.45mm 0 0;
        font-size: 9pt;
        line-height: 1.3;
      }

      .meta-line--small {
        font-size: 8.4pt;
        line-height: 1.25;
      }

      .members-block {
        margin: 0;
      }

      .members-heading {
        margin: 0;
        font-weight: 600;
      }

      .member-line {
        margin: 0.25mm 0 0;
        font-size: 8.4pt;
        line-height: 1.25;
      }

      ${tableBaseStyles}

      .section-heading-block + table {
        break-before: avoid-page;
        page-break-before: avoid;
      }

      .section-heading-block + table thead,
      .section-heading-block + table thead tr,
      .section-heading-block + table tbody tr:first-child,
      table tbody tr {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .student-name,
      .student-specialization,
      .teacher-line {
        display: block;
      }

      .student-specialization {
        margin-top: 0.5mm;
      }

      .teacher-line + .teacher-line {
        margin-top: 0.5mm;
      }

      .pause-cell {
        padding: 1.3mm 1.6mm;
        background-color: ${PDF_VISUAL_COLORS.lightBlueTint25};
        text-align: center;
        font-weight: 500;
      }

      .table-header-multiline {
        display: inline-flex;
        width: max-content;
        max-width: 100%;
        flex-direction: column;
        align-items: stretch;
        gap: 0.25mm;
      }

      .table-header-line {
        display: block;
        white-space: normal;
        word-break: break-word;
        overflow-wrap: anywhere;
        hyphens: auto;
      }

      .table-header-divider {
        display: block;
        height: 0.2mm;
        width: 100%;
        background-color: ${PDF_VISUAL_COLORS.primaryBlue};
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
        width: 17%;
      }

      th:nth-child(4),
      td:nth-child(4) {
        width: 34.8%;
      }

      th:nth-child(5),
      td:nth-child(5) {
        width: 25.7%;
      }
    </style>
  </head>
  <body>
    ${sectionsHtml}
  </body>
</html>`
}
