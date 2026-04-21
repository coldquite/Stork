// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PdfPublicSectionDto, PostPdfPublicExportRequestDto } from '#shared/types/export/pdf-public'
import { renderPdfPublicHtml } from '#server/utils/export/pdf/templates/public-html'

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

function createSection(overrides: Partial<PdfPublicSectionDto> = {}): PdfPublicSectionDto {
  return {
    committeeId: 'committee-1',
    committeeDateIso: '2025-06-23T00:00:00.000Z',
    committeeRoomValue: 'TH:A-1455',
    language: 'CZECH',
    topMetaDayLabel: 'Pondeli 23.6.2025',
    topMetaRoomLine: 'ucebna TH:A-1455',
    degreeTitle: 'BAKALARSKE STATNI ZAVERECNE ZKOUSKY',
    semesterLabel: 'Letni semestr 2024/2025 (cerven)',
    studyProgramLine: 'Bakalarsky studijni program Informatika',
    committeeLine: 'Komise 1-BI-SI.21',
    departmentLine: 'Katedra obhajoby: KSI',
    secretaryLine: 'Tajemnik: Ing. Jan Novak',
    invigilatorsLineLabel: 'Dozor u pisemne pripravy (TH:A-1146):',
    invigilatorsMembers: ['Ing. Jan Novak'],
    membersHeading: 'slozeni komise:',
    membersLines: ['Predseda', 'Mistopredseda', 'Clen 1', 'Clen 2', 'Clen 3'],
    tablePreparationStartHeader: 'Zacatek pripravy',
    tableCommitteeExamHeader: 'Zkouska pred komisi',
    tableStudentSpecializationHeader: 'Student\\nStudijní plán',
    tableThesisTitleHeader: 'Tema zaverecne prace',
    tableSupervisorReviewerHeader: 'Vedouci\\nOponent',
    rowsEmptyFallback: '—',
    rows: [],
    ...overrides
  }
}

function createStudentRow(
  overrides: Partial<Extract<PdfPublicSectionDto['rows'][number], { kind: 'STUDENT' }>> = {}
): Extract<PdfPublicSectionDto['rows'][number], { kind: 'STUDENT' }> {
  return {
    kind: 'STUDENT',
    preparationStartTime: '08:00',
    committeeExamRangeTime: '08:45–09:15',
    studentName: 'Student Example',
    specializationLabel: 'BI-SI.21',
    repeatLabel: '',
    thesisTitle: 'Thesis title',
    supervisorPrimaryLabel: 'Vedoucí 1',
    supervisorAdditionalLabel: '',
    reviewerPrimaryLabel: 'Oponent 1',
    reviewerAdditionalLabel: '',
    ...overrides
  }
}

function createPayload(sections: PdfPublicSectionDto[]): PostPdfPublicExportRequestDto {
  return {
    draftName: 'SZZ test',
    documentHeaderTitle: 'PLAN KONANI STATNICH ZAVERECNYCH ZKOUSEK',
    sections
  }
}

describe('public pdf html template', () => {
  beforeEach(() => {
    loadPdfTemplateRenderAssetsMock.mockReset()
    loadPdfTemplateRenderAssetsMock.mockResolvedValue({
      embeddedFontCss: '',
      brandLogoDataUrl: 'data:image/png;base64,AAAA'
    })
  })

  it('forces new page only when day or room changes', async () => {
    const html = await renderPdfPublicHtml(
      createPayload([
        createSection({
          committeeId: 'committee-1',
          committeeDateIso: '2025-06-17T00:00:00.000Z',
          committeeRoomValue: 'TH:A-1435',
          topMetaDayLabel: 'Tuesday June 17, 2025',
          topMetaRoomLine: 'classroom TH:A-1435'
        }),
        createSection({
          committeeId: 'committee-2',
          committeeDateIso: '2025-06-17T00:00:00.000Z',
          committeeRoomValue: 'TH:A-1435',
          topMetaDayLabel: 'Úterý 17. 6. 2025',
          topMetaRoomLine: 'učebna TH:A-1435'
        }),
        createSection({
          committeeId: 'committee-3',
          committeeDateIso: '2025-06-17T00:00:00.000Z',
          committeeRoomValue: 'TH:A-1456',
          topMetaDayLabel: 'Úterý 17. 6. 2025',
          topMetaRoomLine: 'učebna TH:A-1456'
        }),
        createSection({
          committeeId: 'committee-4',
          committeeDateIso: '2025-06-18T00:00:00.000Z',
          committeeRoomValue: 'TH:A-1456',
          topMetaDayLabel: 'Wednesday June 18, 2025',
          topMetaRoomLine: 'classroom TH:A-1456'
        }),
        createSection({
          committeeId: 'committee-5',
          committeeDateIso: '2025-06-18T00:00:00.000Z',
          committeeRoomValue: 'TH:A-1456',
          topMetaDayLabel: 'Středa 18. 6. 2025',
          topMetaRoomLine: 'učebna TH:A-1456'
        })
      ])
    )

    const sectionClasses = Array.from(html.matchAll(/<section class="([^"]+)">/g)).map((match) => match[1])
    expect(sectionClasses).toEqual([
      'committee-section',
      'committee-section',
      'committee-section committee-section--new-group',
      'committee-section committee-section--new-group',
      'committee-section'
    ])
    expect(html).toContain('.committee-section--new-group')
    expect(html).toContain('break-before: page;')
  })

  it('renders teacher cell without divider only for 1 supervisor and 1 reviewer', async () => {
    const html = await renderPdfPublicHtml(
      createPayload([
        createSection({
          rows: [
            createStudentRow({
              supervisorPrimaryLabel: 'Vedoucí 1',
              supervisorAdditionalLabel: '',
              reviewerPrimaryLabel: 'Oponent 1',
              reviewerAdditionalLabel: ''
            }),
            createStudentRow({
              supervisorPrimaryLabel: 'Vedoucí 1',
              supervisorAdditionalLabel: 'Vedoucí 2',
              reviewerPrimaryLabel: 'Oponent 1',
              reviewerAdditionalLabel: ''
            }),
            createStudentRow({
              supervisorPrimaryLabel: 'Vedoucí 1',
              supervisorAdditionalLabel: '',
              reviewerPrimaryLabel: '',
              reviewerAdditionalLabel: ''
            }),
            createStudentRow({
              supervisorPrimaryLabel: '',
              supervisorAdditionalLabel: '',
              reviewerPrimaryLabel: 'Oponent 1',
              reviewerAdditionalLabel: 'Oponent 2'
            })
          ]
        })
      ])
    )

    expect(html).toContain('<span class="teacher-line">Vedoucí 1</span>')
    expect(html).toContain('<span class="teacher-line">Oponent 1</span>')
    expect(html).toContain('Vedoucí 1, Vedoucí 2')
    expect(html).toContain('Oponent 1, Oponent 2')
    expect(html).toContain('<span class="teacher-line">—</span>')

    const dividerMatches = Array.from(html.matchAll(/<span class="teacher-divider" aria-hidden="true"><\/span>/g))
    expect(dividerMatches).toHaveLength(3)
    expect(html).toContain('.teacher-divider')
  })
})
