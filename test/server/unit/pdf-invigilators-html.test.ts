// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PostPdfInvigilatorsExportRequestDto } from '#shared/types/export/pdf-invigilators'
import { renderPdfInvigilatorsHtml } from '#server/utils/export/pdf/templates/invigilators-html'

const { loadPdfTemplateRenderAssetsMock } = vi.hoisted(() => ({
  loadPdfTemplateRenderAssetsMock: vi.fn()
}))

vi.mock('#server/utils/export/pdf/templates/layout', async () => {
  const actual = await vi.importActual<typeof import('#server/utils/export/pdf/templates/layout')>(
    '#server/utils/export/pdf/templates/layout'
  )

  return {
    ...actual,
    loadPdfTemplateRenderAssets: loadPdfTemplateRenderAssetsMock
  }
})

function createPayload(): PostPdfInvigilatorsExportRequestDto {
  return {
    draftName: 'SZZ test',
    sections: [
      {
        dayKey: '2025-08-28',
        dayLabel: 'CTVRTEK 28. 8. 2025',
        roomLabel: 'TH:PR-200',
        invigilatorsLabel: 'Jan Novak',
        students: [
          {
            prepareStartTime: '08:00',
            committeeExamRangeTime: '08:45-09:15',
            studentName: 'Student Bez Opakovani',
            repeatLabel: '',
            committeeLabel: 'Komise A',
            roomLabel: 'TH:A-1600',
            secretaryLabel: 'Tajemnik'
          },
          {
            prepareStartTime: '09:00',
            committeeExamRangeTime: '09:45-10:15',
            studentName: 'Student Opakuje',
            repeatLabel: 'Opakuje obhajobu',
            committeeLabel: 'Komise B',
            roomLabel: 'TH:A-1700',
            secretaryLabel: 'Tajemnik'
          }
        ]
      }
    ]
  }
}

describe('invigilators pdf html template', () => {
  beforeEach(() => {
    loadPdfTemplateRenderAssetsMock.mockReset()
    loadPdfTemplateRenderAssetsMock.mockResolvedValue({
      embeddedFontCss: '',
      brandLogoDataUrl: 'data:image/png;base64,AAAA'
    })
  })

  it('renders repeat label only when row repeatLabel is non-empty', async () => {
    const html = await renderPdfInvigilatorsHtml(createPayload())

    expect(html).toContain('<span class="student-name">Student Bez Opakovani</span>')
    expect(html).toContain('<span class="student-name">Student Opakuje</span>')
    expect(html).toContain('<span class="student-repeat">Opakuje obhajobu</span>')

    const repeatLabelElements = Array.from(html.matchAll(/class="student-repeat"/g))
    expect(repeatLabelElements).toHaveLength(1)
  })
})
