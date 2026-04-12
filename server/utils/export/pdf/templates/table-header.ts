import { escapeHtml } from '#server/utils/export/pdf/templates/common'
import { PDF_VISUAL_COLORS } from '#server/utils/export/pdf/templates/visual-style'

interface RenderPdfTableHeaderLabelOptions {
  withDivider?: boolean
}

export function renderPdfTableHeaderLabelHtml(label: string, options: RenderPdfTableHeaderLabelOptions = {}): string {
  const withDivider = options.withDivider ?? false
  const lines = label
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length <= 1) {
    return escapeHtml(label)
  }

  const linesHtml = lines
    .map((line, index) => {
      const dividerHtml =
        index > 0 && withDivider ? '<span class="pdf-table-header-divider" aria-hidden="true"></span>' : ''
      return `${dividerHtml}<span class="pdf-table-header-line">${escapeHtml(line)}</span>`
    })
    .join('')

  return `<span class="pdf-table-header-multiline">${linesHtml}</span>`
}

export function renderPdfTableHeaderLabelStyles(): string {
  return `
.pdf-table-header-multiline {
  display: inline-flex;
  width: max-content;
  max-width: 100%;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25mm;
}

.pdf-table-header-line {
  display: block;
  white-space: pre-line;
  word-break: normal;
  overflow-wrap: normal;
  hyphens: manual;
}

.pdf-table-header-divider {
  display: block;
  height: 0.2mm;
  width: 100%;
  background-color: ${PDF_VISUAL_COLORS.primaryBlue};
}
`.trim()
}
