import type { PostPdfPublicExportRequestDto } from '#shared/types/export/pdf-public'
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
import { PDF_VISUAL_COLORS, renderPdfTableBaseStyles } from '#server/utils/export/pdf/templates/visual-style'

const PDF_DOCUMENT_TITLE = 'Plán konání státních závěrečných zkoušek'
const CZECH_TIME_ZONE = 'Europe/Prague'
const PDF_EMPTY_VALUE = '—'
const pageGroupDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CZECH_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})
type PdfPublicStudentRow = Extract<
  PostPdfPublicExportRequestDto['sections'][number]['rows'][number],
  { kind: 'STUDENT' }
>

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

function collectTeacherNames(...names: string[]): string[] {
  return names.map((name) => name.trim()).filter((name) => name.length > 0)
}

function resolveTeacherNamesLine(names: string[]): string {
  return names.length > 0 ? names.join(', ') : PDF_EMPTY_VALUE
}

function renderTeacherCellHtml(row: PdfPublicStudentRow): string {
  const supervisorNames = collectTeacherNames(row.supervisorPrimaryLabel, row.supervisorAdditionalLabel)
  const reviewerNames = collectTeacherNames(row.reviewerPrimaryLabel, row.reviewerAdditionalLabel)
  const supervisorLine = resolveTeacherNamesLine(supervisorNames)
  const reviewerLine = resolveTeacherNamesLine(reviewerNames)
  const isSimpleOneToOne = supervisorNames.length === 1 && reviewerNames.length === 1

  if (isSimpleOneToOne) {
    return `<span class="teacher-line">${escapeHtml(supervisorLine)}</span>
      <span class="teacher-line">${escapeHtml(reviewerLine)}</span>`
  }

  return `<span class="teacher-line">${escapeHtml(supervisorLine)}</span>
    <span class="teacher-divider" aria-hidden="true"></span>
    <span class="teacher-line">${escapeHtml(reviewerLine)}</span>`
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
          ${renderTeacherCellHtml(row)}
        </td>
      </tr>`
    })
    .join('')
}

function renderInvigilatorsMetaHtml(section: PostPdfPublicExportRequestDto['sections'][number]): string {
  const membersHtml = section.invigilatorsMembers
    .map((member, index, members) => {
      const escapedMember = escapeHtml(member).replaceAll(' ', '&nbsp;')
      const suffix = index < members.length - 1 ? ',' : ''
      return `<span class="invigilators-member-item">${escapedMember}${suffix}</span>`
    })
    .join(' ')

  return `<p class="meta-line meta-line--small invigilators-meta">
    <span class="invigilators-label">${escapeHtml(section.invigilatorsLineLabel)}</span>
    ${membersHtml}
  </p>`
}

function resolveCommitteeDayKey(committeeDateIso: string): string {
  const parsedDate = new Date(committeeDateIso)
  if (Number.isNaN(parsedDate.getTime())) {
    return `invalid-${committeeDateIso}`
  }

  const parts = pageGroupDateFormatter.formatToParts(parsedDate)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  if (!year || !month || !day) {
    return `invalid-${committeeDateIso}`
  }

  return `${year}-${month}-${day}`
}

function resolveSectionPageGroupKey(section: PostPdfPublicExportRequestDto['sections'][number]): string {
  const dayKey = resolveCommitteeDayKey(section.committeeDateIso)
  const roomKey = section.committeeRoomValue.toLocaleLowerCase('cs-CZ')
  return `${dayKey}__${roomKey}`
}

function renderCommitteeSection(
  section: PostPdfPublicExportRequestDto['sections'][number],
  brandHeaderHtml: string,
  sectionClass: string
): string {
  const membersLines = section.membersLines.map((line) => `<p class="member-line">${escapeHtml(line)}</p>`).join('')

  return `<section class="${sectionClass}">
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
          ${renderInvigilatorsMetaHtml(section)}
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
          <th>${renderPdfTableHeaderLabelHtml(section.tablePreparationStartHeader)}</th>
          <th>${renderPdfTableHeaderLabelHtml(section.tableCommitteeExamHeader)}</th>
          <th>${renderPdfTableHeaderLabelHtml(section.tableStudentSpecializationHeader, { withDivider: true })}</th>
          <th>${renderPdfTableHeaderLabelHtml(section.tableThesisTitleHeader)}</th>
          <th>${renderPdfTableHeaderLabelHtml(section.tableSupervisorReviewerHeader, { withDivider: true })}</th>
        </tr>
      </thead>
      <tbody>
        ${renderSectionRows(section)}
      </tbody>
    </table>
  </section>`
}

export async function renderPdfPublicHtml(payload: PostPdfPublicExportRequestDto): Promise<string> {
  const { embeddedFontCss, brandLogoDataUrl } = await loadPdfTemplateRenderAssets()
  const layoutStyles = renderPdfLayoutStyles({
    embeddedFontCss,
    brandTitleWidthPercent: 54
  })
  const tableBaseStyles = renderPdfTableBaseStyles()
  let previousPageGroupKey: string | null = null
  const sectionsHtml = payload.sections
    .map((section, index) => {
      const pageGroupKey = resolveSectionPageGroupKey(section)
      const isNewPageGroup = pageGroupKey !== previousPageGroupKey
      previousPageGroupKey = pageGroupKey
      const sectionClass =
        isNewPageGroup && index > 0 ? 'committee-section committee-section--new-group' : 'committee-section'
      const brandHeaderHtml =
        index === 0
          ? renderPdfBrandHeaderHtml({
              brandLogoDataUrl,
              brandTitleHtml: renderDocumentHeaderTitleHtml(payload.documentHeaderTitle)
            })
          : ''

      return renderCommitteeSection(section, brandHeaderHtml, sectionClass)
    })
    .join('\n')

  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(PDF_DOCUMENT_TITLE)}</title>
    <style>
      ${layoutStyles}

      .committee-section {
        margin: 0 0 8mm;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .committee-section--new-group {
        break-before: page;
        page-break-before: always;
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

      .invigilators-meta {
        margin: 0.45mm 0 0;
        font-weight: 450;
      }

      .invigilators-member-item {
        display: inline-block;
        white-space: nowrap;
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

      .teacher-divider {
        display: block;
        width: 100%;
        height: 0.2mm;
        margin: 0.55mm 0;
        background-color: ${PDF_VISUAL_COLORS.lightBlueTint50};
      }

      .pause-cell {
        padding: 1.3mm 1.6mm;
        background-color: ${PDF_VISUAL_COLORS.lightBlueTint25};
        text-align: center;
        font-weight: 500;
      }

      ${renderPdfTableHeaderLabelStyles()}

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
        width: 22%;
      }

      th:nth-child(4),
      td:nth-child(4) {
        width: 29.8%;
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
