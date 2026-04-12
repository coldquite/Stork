import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EditorStudentsTableViewMode } from '~/types/editor'
import type {
  ScheduleDraft,
  ScheduleDraftCommittee,
  ScheduleDraftItem,
  ScheduleDraftThesisTitleDisplayMode
} from '~/types/schedule-draft'

const { i18nTranslateMock } = vi.hoisted(() => ({
  i18nTranslateMock: vi.fn((key: string) => key)
}))

const { saveManualDraftMock } = vi.hoisted(() => ({
  saveManualDraftMock: vi.fn()
}))

const { exportQuestionsEnvelopeCsvMock } = vi.hoisted(() => ({
  exportQuestionsEnvelopeCsvMock: vi.fn()
}))

const {
  requestFetchMock,
  buildPdfPublicExportPayloadMock,
  buildPdfPublicFileNameMock,
  buildPdfInvigilatorsExportPayloadMock,
  buildPdfInvigilatorsFileNameMock,
  downloadPdfFileMock
} = vi.hoisted(() => ({
  requestFetchMock: vi.fn(),
  buildPdfPublicExportPayloadMock: vi.fn(),
  buildPdfPublicFileNameMock: vi.fn(),
  buildPdfInvigilatorsExportPayloadMock: vi.fn(),
  buildPdfInvigilatorsFileNameMock: vi.fn(),
  downloadPdfFileMock: vi.fn()
}))

const { QuestionsEnvelopeCsvDepartmentMappingErrorMock } = vi.hoisted(() => ({
  QuestionsEnvelopeCsvDepartmentMappingErrorMock: class QuestionsEnvelopeCsvDepartmentMappingError extends Error {
    readonly issues: Array<{
      studentFullName: string
      committeeLabel: string
      specializationCode: string
      studyProgramName: string
      studyProgramType: 'BACHELOR' | 'MASTER'
    }>

    constructor(
      issues: Array<{
        studentFullName: string
        committeeLabel: string
        specializationCode: string
        studyProgramName: string
        studyProgramType: 'BACHELOR' | 'MASTER'
      }>
    ) {
      super('QUESTIONS_ENVELOPE_CSV_DEPARTMENT_MAPPING_FAILED')
      this.name = 'QuestionsEnvelopeCsvDepartmentMappingError'
      this.issues = issues
    }
  }
}))

const scheduleDraftStoreMock = reactive({
  draft: null as ScheduleDraft | null,
  isDraftLoading: false,
  isManualSaveLoading: false,
  isAutoSaveRunning: false,
  saveManualDraft: saveManualDraftMock
})

const editorTablePreferencesStoreMock = reactive({
  thesisTitleDisplayMode: 'AUTO' as ScheduleDraftThesisTitleDisplayMode,
  tableViewMode: 'OPTIMIZED' as EditorStudentsTableViewMode,
  setThesisTitleDisplayMode: vi.fn((nextMode: ScheduleDraftThesisTitleDisplayMode) => {
    editorTablePreferencesStoreMock.thesisTitleDisplayMode = nextMode
  }),
  setTableViewMode: vi.fn((nextMode: EditorStudentsTableViewMode) => {
    editorTablePreferencesStoreMock.tableViewMode = nextMode
  })
})

mockNuxtImport('useI18n', () => {
  return () => ({
    t: i18nTranslateMock
  })
})

mockNuxtImport('useRequestFetch', () => {
  return () => requestFetchMock
})

vi.mock('~/stores/schedule-draft', () => {
  return {
    useScheduleDraftStore: () => scheduleDraftStoreMock
  }
})

vi.mock('~/stores/editor-table-preferences', () => {
  return {
    useEditorTablePreferencesStore: () => editorTablePreferencesStoreMock
  }
})

vi.mock('~/utils/export/questions-envelope-csv-export', () => {
  return {
    exportQuestionsEnvelopeCsv: exportQuestionsEnvelopeCsvMock,
    QuestionsEnvelopeCsvDepartmentMappingError: QuestionsEnvelopeCsvDepartmentMappingErrorMock
  }
})

vi.mock('~/utils/export/pdf-public-export', () => {
  return {
    buildPdfPublicExportPayload: buildPdfPublicExportPayloadMock,
    buildPdfPublicFileName: buildPdfPublicFileNameMock
  }
})

vi.mock('~/utils/export/pdf-invigilators-export', () => {
  return {
    buildPdfInvigilatorsExportPayload: buildPdfInvigilatorsExportPayloadMock,
    buildPdfInvigilatorsFileName: buildPdfInvigilatorsFileNameMock,
    downloadPdfFile: downloadPdfFileMock
  }
})

function createStudentItem(localId: string, position: number, firstName: string): ScheduleDraftItem {
  return {
    localId,
    type: 'STUDENT',
    position,
    student: {
      firstName,
      lastName: 'Novák',
      email: `${localId}@fit.cvut.cz`,
      titlesBefore: 'Bc.',
      titlesAfter: null,
      thesisTitleLocal: `Local ${localId}`,
      thesisTitleEn: `English ${localId}`,
      thesisLanguage: 'CZECH',
      supervisorName: 'Vedoucí',
      reviewerName: 'Oponent',
      additionalSupervisorName: null,
      additionalReviewerName: null,
      studyProgramName: 'Informatika',
      studyProgramType: 'BACHELOR',
      specializationName: 'Softwarové inženýrství 2021',
      specializationCode: 'BI-SI.21',
      studyLanguage: 'CZECH',
      repeatType: 'NONE',
      prepareMinutes: 45,
      examMinutes: 30
    },
    pause: null
  }
}

function createPauseItem(localId: string, position: number): ScheduleDraftItem {
  return {
    localId,
    type: 'PAUSE',
    position,
    student: null,
    pause: {
      label: 'Přestávka',
      pauseType: 'BREAK',
      durationMinutes: 20
    }
  }
}

function createCommittee(options: {
  localId: string
  name: string
  startMinute: number
  date: string
  items?: ScheduleDraftItem[]
  invigilators?: ScheduleDraftCommittee['invigilators']
  language?: ScheduleDraftCommittee['language']
  studyProgramName?: ScheduleDraftCommittee['studyProgramName']
  studyProgramType?: ScheduleDraftCommittee['studyProgramType']
  specializationName?: ScheduleDraftCommittee['specializationName']
  specializationCode?: ScheduleDraftCommittee['specializationCode']
}): ScheduleDraftCommittee {
  return {
    localId: options.localId,
    name: options.name,
    startMinute: options.startMinute,
    date: options.date,
    room: 'TH:A-1435',
    secretaryName: 'Sekretář',
    invigilators: options.invigilators ?? [{ localId: 'invigilator-dozor', name: 'Dozor' }],
    language: options.language ?? 'CZECH',
    studyProgramName: options.studyProgramName ?? 'Informatika',
    studyProgramType: options.studyProgramType ?? 'BACHELOR',
    specializationName: options.specializationName ?? 'Softwarové inženýrství 2021',
    specializationCode: options.specializationCode ?? 'BI-SI.21',
    chairName: 'Předseda',
    viceChairName: 'Místopředseda',
    member1Name: 'Člen 1',
    member2Name: 'Člen 2',
    member3Name: 'Člen 3',
    items: options.items ?? []
  }
}

function createDraftWithTwoCommittees(): ScheduleDraft {
  return {
    name: 'Plán',
    type: 'MANUAL',
    thesisTitleDisplayMode: 'AUTO',
    committees: [
      createCommittee({
        localId: 'committee-early',
        name: '2-NI-SI',
        date: '2026-06-10T00:00:00.000Z',
        startMinute: 510,
        items: [
          createStudentItem('student-a', 1, 'Jan'),
          createPauseItem('pause-a', 2),
          createStudentItem('student-b', 3, 'Eva')
        ]
      }),
      createCommittee({
        localId: 'committee-late',
        name: '1-NI-SI',
        date: '2026-06-11T00:00:00.000Z',
        startMinute: 525,
        items: [],
        invigilators: []
      })
    ]
  }
}

describe('useEditorPage', () => {
  beforeEach(() => {
    i18nTranslateMock.mockClear()
    saveManualDraftMock.mockReset()
    exportQuestionsEnvelopeCsvMock.mockReset()
    requestFetchMock.mockReset()
    buildPdfPublicExportPayloadMock.mockReset()
    buildPdfPublicFileNameMock.mockReset()
    buildPdfInvigilatorsExportPayloadMock.mockReset()
    buildPdfInvigilatorsFileNameMock.mockReset()
    downloadPdfFileMock.mockReset()
    saveManualDraftMock.mockResolvedValue({
      id: 'saved-auto',
      createdAt: '2026-06-12T09:00:00.000Z'
    })
    buildPdfPublicExportPayloadMock.mockReturnValue({
      draftName: 'Plán',
      documentHeaderTitle: 'PLÁN KONÁNÍ STÁTNÍCH ZÁVĚREČNÝCH ZKOUŠEK',
      sections: [{ committeeId: 'committee-late' }]
    })
    buildPdfPublicFileNameMock.mockReturnValue('Časový plán SZZ export.pdf')
    buildPdfInvigilatorsExportPayloadMock.mockReturnValue({
      draftName: 'Plán',
      sections: [{ dayKey: '2026-06-10' }]
    })
    buildPdfInvigilatorsFileNameMock.mockReturnValue('Dozor_export.pdf')
    scheduleDraftStoreMock.isDraftLoading = false
    scheduleDraftStoreMock.isManualSaveLoading = false
    scheduleDraftStoreMock.isAutoSaveRunning = false
    scheduleDraftStoreMock.draft = createDraftWithTwoCommittees()
    editorTablePreferencesStoreMock.thesisTitleDisplayMode = 'AUTO'
    editorTablePreferencesStoreMock.tableViewMode = 'OPTIMIZED'
    editorTablePreferencesStoreMock.setThesisTitleDisplayMode.mockClear()
    editorTablePreferencesStoreMock.setTableViewMode.mockClear()
  })

  it('reorders only student items and keeps pauses in place', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.localId).toBe('committee-early')
    expect(page.studentTable.selectedStudents.value.map((row) => row.id)).toEqual(['student-a', 'student-b'])

    page.studentTable.selectedStudents.value = [
      page.studentTable.selectedStudents.value[1]!,
      page.studentTable.selectedStudents.value[0]!
    ]

    const committee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
    expect(committee).toBeDefined()
    if (!committee) {
      throw new Error('Expected committee to exist')
    }

    expect(committee.items.map((item) => item.localId)).toEqual(['student-b', 'pause-a', 'student-a'])
    expect(committee.items.map((item) => item.position)).toEqual([1, 2, 3])
  })

  it('reorders mixed rows including pauses through selectedRows setter', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    const rows = page.studentTable.selectedRows.value
    expect(rows.map((row) => row.id)).toEqual(['student-a', 'pause-a', 'student-b'])

    const [studentA, pauseA, studentB] = rows
    expect(studentA?.kind).toBe('STUDENT')
    expect(pauseA?.kind).toBe('PAUSE')
    expect(studentB?.kind).toBe('STUDENT')
    if (!studentA || studentA.kind !== 'STUDENT' || !pauseA || !studentB) {
      throw new Error('Expected initial mixed rows')
    }

    page.studentTable.selectedRows.value = [pauseA, { ...studentA, lastName: '  Alenov  ' }, studentB]

    const committee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
    expect(committee).toBeDefined()
    if (!committee) {
      throw new Error('Expected committee to exist')
    }

    expect(committee.items.map((item) => item.localId)).toEqual(['pause-a', 'student-a', 'student-b'])
    expect(committee.items.map((item) => item.position)).toEqual([1, 2, 3])

    const updatedStudentA = committee.items.find((item) => item.localId === 'student-a')
    expect(updatedStudentA?.type).toBe('STUDENT')
    if (!updatedStudentA || updatedStudentA.type !== 'STUDENT') {
      throw new Error('Expected updated student item')
    }

    expect(updatedStudentA.student.lastName).toBe('Alenov')
  })

  it('updates editable student row fields in draft and overwrites minutes on repeatType change', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    const [firstStudentRow, secondStudentRow] = page.studentTable.selectedStudents.value
    expect(firstStudentRow).toBeDefined()
    expect(secondStudentRow).toBeDefined()
    if (!firstStudentRow || !secondStudentRow) {
      throw new Error('Expected student rows to exist')
    }

    page.studentTable.selectedStudents.value = [
      {
        ...firstStudentRow,
        lastName: '  Alenov',
        firstName: 'Damir  ',
        specializationCode: 'BI-SI.21',
        thesisTitle: 'Nový český název',
        thesisLanguage: 'ENGLISH',
        supervisorName: 'Ing. Vedoucí Nový',
        additionalSupervisorName: 'Ing. Druhý Vedoucí',
        reviewerName: 'Ing. Oponent Nový',
        additionalReviewerName: 'Ing. Druhý Oponent',
        repeatType: 'BOTH',
        prepareMinutes: 50,
        examMinutes: 25
      },
      secondStudentRow
    ]

    const committee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
    const firstStudentItem = committee?.items.find((item) => item.localId === 'student-a')
    expect(firstStudentItem).toBeDefined()
    if (!firstStudentItem || firstStudentItem.type !== 'STUDENT') {
      throw new Error('Expected first student item')
    }

    expect(firstStudentItem.student.lastName).toBe('Alenov')
    expect(firstStudentItem.student.firstName).toBe('Damir')
    expect(firstStudentItem.student.specializationCode).toBe('BI-SI.21')
    expect(firstStudentItem.student.specializationName).toBe('Softwarové inženýrství 2021')
    expect(firstStudentItem.student.thesisTitleLocal).toBe('Nový český název')
    expect(firstStudentItem.student.thesisLanguage).toBe('ENGLISH')
    expect(firstStudentItem.student.supervisorName).toBe('Ing. Vedoucí Nový')
    expect(firstStudentItem.student.additionalSupervisorName).toBe('Ing. Druhý Vedoucí')
    expect(firstStudentItem.student.reviewerName).toBe('Ing. Oponent Nový')
    expect(firstStudentItem.student.additionalReviewerName).toBe('Ing. Druhý Oponent')
    expect(firstStudentItem.student.repeatType).toBe('BOTH')
    expect(firstStudentItem.student.prepareMinutes).toBe(45)
    expect(firstStudentItem.student.examMinutes).toBe(30)

    expect(page.studentTable.selectedStudents.value[0]?.prepareTime).toBe('07:45')
    expect(page.studentTable.selectedStudents.value[0]?.examTime).toBe('08:30 - 09:00')
    expect(page.studentTable.selectedStudents.value[1]?.examTime).toBe('09:20 - 09:50')
  })

  it('keeps custom minutes when repeatType and studyProgramType do not change', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    const [firstStudentRow, secondStudentRow] = page.studentTable.selectedStudents.value
    expect(firstStudentRow).toBeDefined()
    expect(secondStudentRow).toBeDefined()
    if (!firstStudentRow || !secondStudentRow) {
      throw new Error('Expected student rows to exist')
    }

    page.studentTable.selectedStudents.value = [
      {
        ...firstStudentRow,
        repeatType: 'NONE',
        studyProgramType: 'BACHELOR',
        prepareMinutes: 52,
        examMinutes: 28
      },
      secondStudentRow
    ]

    const committee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
    const firstStudentItem = committee?.items.find((item) => item.localId === 'student-a')
    expect(firstStudentItem).toBeDefined()
    if (!firstStudentItem || firstStudentItem.type !== 'STUDENT') {
      throw new Error('Expected first student item')
    }

    expect(firstStudentItem.student.repeatType).toBe('NONE')
    expect(firstStudentItem.student.studyProgramType).toBe('BACHELOR')
    expect(firstStudentItem.student.prepareMinutes).toBe(52)
    expect(firstStudentItem.student.examMinutes).toBe(28)
  })

  it('overwrites minutes when student studyProgramType changes in table editing', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    const [firstStudentRow, secondStudentRow] = page.studentTable.selectedStudents.value
    expect(firstStudentRow).toBeDefined()
    expect(secondStudentRow).toBeDefined()
    if (!firstStudentRow || !secondStudentRow) {
      throw new Error('Expected student rows to exist')
    }

    page.studentTable.selectedStudents.value = [
      {
        ...firstStudentRow,
        studyProgramType: 'MASTER',
        prepareMinutes: 44,
        examMinutes: 22
      },
      secondStudentRow
    ]

    const committee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
    const firstStudentItem = committee?.items.find((item) => item.localId === 'student-a')
    expect(firstStudentItem).toBeDefined()
    if (!firstStudentItem || firstStudentItem.type !== 'STUDENT') {
      throw new Error('Expected first student item')
    }

    expect(firstStudentItem.student.repeatType).toBe('NONE')
    expect(firstStudentItem.student.studyProgramType).toBe('MASTER')
    expect(firstStudentItem.student.prepareMinutes).toBe(45)
    expect(firstStudentItem.student.examMinutes).toBe(35)
  })

  it('updates student study profile independently from committee and resolves specialization by student context', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    const [firstStudentRow, secondStudentRow] = page.studentTable.selectedStudents.value
    expect(firstStudentRow).toBeDefined()
    expect(secondStudentRow).toBeDefined()
    if (!firstStudentRow || !secondStudentRow) {
      throw new Error('Expected student rows to exist')
    }

    page.studentTable.selectedStudents.value = [
      {
        ...firstStudentRow,
        studyLanguage: 'ENGLISH',
        studyProgramType: 'BACHELOR',
        studyProgramName: 'Informatics',
        specializationCode: 'BIE-SI.21'
      },
      secondStudentRow
    ]

    const committee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
    const firstStudentItem = committee?.items.find((item) => item.localId === 'student-a')
    expect(firstStudentItem).toBeDefined()
    if (!firstStudentItem || firstStudentItem.type !== 'STUDENT') {
      throw new Error('Expected first student item')
    }

    expect(committee?.studyProgramName).toBe('Informatika')
    expect(committee?.studyProgramType).toBe('BACHELOR')
    expect(firstStudentItem.student.studyLanguage).toBe('ENGLISH')
    expect(firstStudentItem.student.studyProgramName).toBe('Informatics')
    expect(firstStudentItem.student.studyProgramType).toBe('BACHELOR')
    expect(firstStudentItem.student.specializationCode).toBe('BIE-SI.21')
    expect(firstStudentItem.student.specializationName).toBe('Software Engineering 2021')
  })

  it('clears student study program and specialization when language becomes incompatible', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    const [firstStudentRow, secondStudentRow] = page.studentTable.selectedStudents.value
    expect(firstStudentRow).toBeDefined()
    expect(secondStudentRow).toBeDefined()
    if (!firstStudentRow || !secondStudentRow) {
      throw new Error('Expected student rows to exist')
    }

    page.studentTable.selectedStudents.value = [
      {
        ...firstStudentRow,
        studyLanguage: 'ENGLISH',
        studyProgramType: 'BACHELOR',
        studyProgramName: 'Informatics',
        specializationCode: 'BIE-SI.21'
      },
      secondStudentRow
    ]

    const [updatedFirstStudentRow, updatedSecondStudentRow] = page.studentTable.selectedStudents.value
    expect(updatedFirstStudentRow).toBeDefined()
    expect(updatedSecondStudentRow).toBeDefined()
    if (!updatedFirstStudentRow || !updatedSecondStudentRow) {
      throw new Error('Expected updated student rows to exist')
    }

    page.studentTable.selectedStudents.value = [
      {
        ...updatedFirstStudentRow,
        studyLanguage: 'CZECH'
      },
      updatedSecondStudentRow
    ]

    const committee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
    const firstStudentItem = committee?.items.find((item) => item.localId === 'student-a')
    expect(firstStudentItem).toBeDefined()
    if (!firstStudentItem || firstStudentItem.type !== 'STUDENT') {
      throw new Error('Expected first student item')
    }

    expect(firstStudentItem.student.studyLanguage).toBe('CZECH')
    expect(firstStudentItem.student.studyProgramName).toBe('')
    expect(firstStudentItem.student.specializationCode).toBe('')
    expect(firstStudentItem.student.specializationName).toBe('')
  })

  it('updates english thesis title when committee language is english', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.committeeFields.updateSelectedCommitteeLanguage('ENGLISH')
    const [firstStudentRow, secondStudentRow] = page.studentTable.selectedStudents.value
    expect(firstStudentRow).toBeDefined()
    expect(secondStudentRow).toBeDefined()
    if (!firstStudentRow || !secondStudentRow) {
      throw new Error('Expected student rows to exist')
    }

    page.studentTable.selectedStudents.value = [
      {
        ...firstStudentRow,
        thesisTitle: 'Edited English Thesis'
      },
      secondStudentRow
    ]

    const committee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
    const firstStudentItem = committee?.items.find((item) => item.localId === 'student-a')
    expect(firstStudentItem).toBeDefined()
    if (!firstStudentItem || firstStudentItem.type !== 'STUDENT') {
      throw new Error('Expected first student item')
    }

    expect(firstStudentItem.student.thesisTitleEn).toBe('Edited English Thesis')
    expect(firstStudentItem.student.thesisTitleLocal).toBe('Local student-a')
  })

  it('updates both thesis title variants when display mode is BOTH', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.draftSettings.updateThesisTitleDisplayMode('BOTH')
    const [firstStudentRow, secondStudentRow] = page.studentTable.selectedStudents.value
    expect(firstStudentRow).toBeDefined()
    expect(secondStudentRow).toBeDefined()
    if (!firstStudentRow || !secondStudentRow) {
      throw new Error('Expected student rows to exist')
    }

    page.studentTable.selectedStudents.value = [
      {
        ...firstStudentRow,
        thesisTitleLocal: 'Nový lokální název',
        thesisTitleEn: 'New English title'
      },
      secondStudentRow
    ]

    const committee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
    const firstStudentItem = committee?.items.find((item) => item.localId === 'student-a')
    expect(firstStudentItem).toBeDefined()
    if (!firstStudentItem || firstStudentItem.type !== 'STUDENT') {
      throw new Error('Expected first student item')
    }

    expect(firstStudentItem.student.thesisTitleLocal).toBe('Nový lokální název')
    expect(firstStudentItem.student.thesisTitleEn).toBe('New English title')
    expect(editorTablePreferencesStoreMock.thesisTitleDisplayMode).toBe('BOTH')
  })

  it('updates table view mode in preferences store', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.draftSettings.updateTableViewMode('MAXIMIZED')

    expect(editorTablePreferencesStoreMock.setTableViewMode).toHaveBeenCalledWith('MAXIMIZED')
    expect(editorTablePreferencesStoreMock.tableViewMode).toBe('MAXIMIZED')
  })

  it('creates committee with trimmed name and selects it', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.committeeList.openCreateCommitteeDialog()
    page.committeeList.createCommitteeName.value = '  Nová komise  '
    page.committeeList.submitCreateCommittee()

    const draftCommittees = scheduleDraftStoreMock.draft?.committees ?? []
    expect(draftCommittees).toHaveLength(3)

    const createdCommittee = draftCommittees.find((entry) => entry.name === 'Nová komise')
    expect(createdCommittee).toBeDefined()
    expect(page.committeeList.selectedCommitteeId.value).toBe(createdCommittee?.localId ?? '')
    expect(page.committeeList.isCreateCommitteeDialogOpen.value).toBe(false)
    expect(page.committeeList.createCommitteeValidationError.value).toBeNull()
  })

  it('blocks create submit until study program, specialization and department are resolved', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.committeeList.openCreateCommitteeDialog()
    page.committeeList.createCommitteeName.value = 'Komise bez oboru'
    page.committeeList.updateCreateCommitteeStringField({ field: 'specializationCode', value: '' })

    expect(page.committeeList.isCreateCommitteeSubmitDisabled.value).toBe(true)
    page.committeeList.submitCreateCommittee()
    expect(scheduleDraftStoreMock.draft?.committees).toHaveLength(2)

    page.committeeList.updateCreateCommitteeStringField({ field: 'studyProgramName', value: 'Informatika' })
    expect(page.committeeList.isCreateCommitteeSubmitDisabled.value).toBe(true)

    page.committeeList.updateCreateCommitteeStringField({ field: 'specializationCode', value: 'BI-SI.21' })
    expect(page.committeeList.isCreateCommitteeSubmitDisabled.value).toBe(false)

    page.committeeList.submitCreateCommittee()
    expect(scheduleDraftStoreMock.draft?.committees).toHaveLength(3)
  })

  it('creates committee with selected study fields', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.committeeList.openCreateCommitteeDialog()
    page.committeeList.updateCreateCommitteeLanguage('ENGLISH')
    page.committeeList.updateCreateCommitteeStudyProgramType('MASTER')
    page.committeeList.updateCreateCommitteeStartMinute(600)
    page.committeeList.updateCreateCommitteeStringField({ field: 'studyProgramName', value: 'Informatics' })
    page.committeeList.updateCreateCommitteeStringField({ field: 'specializationCode', value: 'NIE-SI' })
    page.committeeList.createCommitteeName.value = 'Komise EN'
    page.committeeList.submitCreateCommittee()

    const createdCommittee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.name === 'Komise EN')
    expect(createdCommittee).toBeDefined()
    expect(createdCommittee?.language).toBe('ENGLISH')
    expect(createdCommittee?.startMinute).toBe(600)
    expect(createdCommittee?.studyProgramType).toBe('MASTER')
    expect(createdCommittee?.studyProgramName).toBe('Informatics')
    expect(createdCommittee?.specializationCode).toBe('NIE-SI')
    expect(createdCommittee?.specializationName).toBe('Software Engineering 2021')
    expect(createdCommittee?.room).toBeNull()
    expect(createdCommittee?.preparationRoom).toBeNull()
    expect(createdCommittee?.secretaryName).toBeNull()
    expect(createdCommittee?.chairName).toBe('')
    expect(createdCommittee?.viceChairName).toBe('')
    expect(createdCommittee?.member1Name).toBe('')
    expect(createdCommittee?.member2Name).toBe('')
    expect(createdCommittee?.member3Name).toBe('')
  })

  it('shows duplicate validation when renaming committee to existing name', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.committeeList.openRenameCommitteeDialog('committee-early')
    page.committeeList.renameCommitteeName.value = '1-NI-SI'
    page.committeeList.submitRenameCommittee()

    expect(page.committeeList.renameCommitteeValidationError.value).toBe(
      'editor.committees.rename.validation.duplicate'
    )
    expect(scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.name).toBe(
      '2-NI-SI'
    )
    expect(page.committeeList.isRenameCommitteeDialogOpen.value).toBe(true)
  })

  it('deletes selected committee and switches selection to next available tab', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommitteeId.value).toBe('committee-early')

    page.committeeList.openDeleteCommitteeConfirm('committee-early')
    page.committeeList.submitDeleteCommittee()

    expect(scheduleDraftStoreMock.draft?.committees.map((entry) => entry.localId)).toEqual(['committee-late'])
    expect(page.committeeList.selectedCommitteeId.value).toBe('committee-late')
    expect(page.committeeList.isDeleteCommitteeConfirmOpen.value).toBe(false)
  })

  it('exposes committee validation counts for sidebar badges and selected committee sections', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    const sidebarCommitteeItems = page.committeeList.committeeSidebarItems.value.filter(
      (item) => item.kind === 'committee'
    )
    expect(sidebarCommitteeItems.map((item) => ({ committeeId: item.value, errorCount: item.errorCount }))).toEqual([
      { committeeId: 'committee-early', errorCount: 1 },
      { committeeId: 'committee-late', errorCount: 2 }
    ])
    expect(page.committeeValidation.countByCommitteeId.value).toEqual({
      'committee-early': 1,
      'committee-late': 2
    })

    expect(page.committeeValidation.selectedCommitteeCount.value).toBe(1)
    expect(page.committeeValidation.selectedCommitteeSections.value).toEqual([
      {
        section: 'INVIGILATORS',
        label: 'editor.committee.validation.sections.invigilators',
        issues: [
          {
            issueId: 'committee-early:preparationRoom:REQUIRED',
            fieldKey: 'preparationRoom',
            message: 'editor.committee.validation.messages.required'
          }
        ]
      }
    ])

    page.committeeList.selectedCommitteeId.value = 'committee-late'
    await nextTick()

    expect(page.committeeValidation.selectedCommitteeCount.value).toBe(2)
    expect(page.committeeValidation.selectedCommitteeSections.value).toEqual([
      {
        section: 'INVIGILATORS',
        label: 'editor.committee.validation.sections.invigilators',
        issues: [
          {
            issueId: 'committee-late:preparationRoom:REQUIRED',
            fieldKey: 'preparationRoom',
            message: 'editor.committee.validation.messages.required'
          },
          {
            issueId: 'committee-late:invigilators:MIN_INVIGILATORS',
            fieldKey: 'invigilators',
            message: 'editor.committee.validation.messages.minInvigilators'
          }
        ]
      }
    ])
  })

  it('deletes pause item from selected committee after confirm', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    const committee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
    expect(committee?.items.map((item) => item.localId)).toEqual(['student-a', 'pause-a', 'student-b'])

    page.committeeItemsActions.openDeleteItemConfirm('pause-a')
    expect(page.committeeItemsActions.isDeleteItemConfirmOpen.value).toBe(true)
    expect(page.committeeItemsActions.deleteItemConfirmDescription.value).toBe('editor.items.delete.pauseDescription')

    page.committeeItemsActions.submitDeleteItem()

    expect(committee?.items.map((item) => item.localId)).toEqual(['student-a', 'student-b'])
    expect(committee?.items.map((item) => item.position)).toEqual([1, 2])
    expect(page.committeeItemsActions.isDeleteItemConfirmOpen.value).toBe(false)
  })

  it('deletes student item from selected committee after confirm', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    const committee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
    expect(committee?.items.map((item) => item.localId)).toEqual(['student-a', 'pause-a', 'student-b'])

    page.committeeItemsActions.openDeleteItemConfirm('student-a')
    expect(page.committeeItemsActions.isDeleteItemConfirmOpen.value).toBe(true)
    expect(page.committeeItemsActions.deleteItemConfirmDescription.value).toBe('editor.items.delete.studentDescription')

    page.committeeItemsActions.submitDeleteItem()

    expect(committee?.items.map((item) => item.localId)).toEqual(['pause-a', 'student-b'])
    expect(committee?.items.map((item) => item.position)).toEqual([1, 2])
    expect(page.studentTable.selectedStudents.value.map((row) => row.id)).toEqual(['student-b'])
    expect(page.committeeItemsActions.isDeleteItemConfirmOpen.value).toBe(false)
  })

  it('moves student to target committee, switches selection and emits highlight request', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    const sourceCommittee = scheduleDraftStoreMock.draft?.committees.find(
      (entry) => entry.localId === 'committee-early'
    )
    const targetCommittee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-late')
    expect(sourceCommittee?.items.map((item) => item.localId)).toEqual(['student-a', 'pause-a', 'student-b'])
    expect(targetCommittee?.items.map((item) => item.localId)).toEqual([])
    if (!targetCommittee) {
      throw new Error('Expected target committee to exist')
    }

    targetCommittee.language = 'ENGLISH'
    targetCommittee.studyProgramName = 'Applied Informatics'
    targetCommittee.studyProgramType = 'MASTER'
    targetCommittee.specializationName = 'Knowledge Engineering'
    targetCommittee.specializationCode = 'NI-ZI.24'

    page.committeeItemsActions.openMoveStudentDialog('student-a')
    expect(page.committeeItemsActions.isMoveStudentDialogOpen.value).toBe(true)
    expect(page.committeeItemsActions.moveStudentSourceCommitteeId.value).toBe('committee-early')
    expect(page.committeeItemsActions.moveStudentDialogDescription.value).toBe('editor.items.move.description')
    expect(page.committeeItemsActions.selectedMoveStudentTargetCommitteeId.value).toBeNull()
    expect(page.committeeItemsActions.isMoveStudentSubmitDisabled.value).toBe(true)

    page.committeeItemsActions.selectMoveStudentTargetCommittee('committee-late')

    expect(page.committeeItemsActions.selectedMoveStudentTargetCommitteeId.value).toBe('committee-late')
    expect(page.committeeItemsActions.moveStudentRewritePreview.value?.length).toBe(7)
    expect(page.committeeItemsActions.moveStudentHasRewriteChanges.value).toBe(true)
    expect(page.committeeItemsActions.moveStudentSubmitLabel.value).toBe('editor.items.move.submitWithOverwrite')
    expect(page.committeeItemsActions.isMoveStudentSubmitDisabled.value).toBe(false)

    page.committeeItemsActions.submitMoveStudentToCommittee()

    expect(sourceCommittee?.items.map((item) => item.localId)).toEqual(['pause-a', 'student-b'])
    expect(sourceCommittee?.items.map((item) => item.position)).toEqual([1, 2])
    expect(targetCommittee?.items.map((item) => item.localId)).toEqual(['student-a'])
    expect(targetCommittee?.items.map((item) => item.position)).toEqual([1])
    if (targetCommittee?.items[0]?.type !== 'STUDENT') {
      throw new Error('Expected moved student row in target committee')
    }

    expect(targetCommittee.items[0].student.studyProgramName).toBe('Applied Informatics')
    expect(targetCommittee.items[0].student.studyProgramType).toBe('MASTER')
    expect(targetCommittee.items[0].student.specializationName).toBe('Knowledge Engineering')
    expect(targetCommittee.items[0].student.specializationCode).toBe('NI-ZI.24')
    expect(targetCommittee.items[0].student.studyLanguage).toBe('ENGLISH')
    expect(targetCommittee.items[0].student.prepareMinutes).toBe(45)
    expect(targetCommittee.items[0].student.examMinutes).toBe(35)
    expect(page.committeeList.selectedCommitteeId.value).toBe('committee-late')
    expect(page.committeeItemsActions.isMoveStudentDialogOpen.value).toBe(false)

    await nextTick()
    expect(page.studentSearch.highlightRequest.value).toEqual({
      requestId: 1,
      committeeId: 'committee-late',
      studentId: 'student-a'
    })
  })

  it('ignores move submit when target committee is source committee', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    const sourceCommittee = scheduleDraftStoreMock.draft?.committees.find(
      (entry) => entry.localId === 'committee-early'
    )
    const initialIds = sourceCommittee?.items.map((item) => item.localId)
    const initialPositions = sourceCommittee?.items.map((item) => item.position)

    page.committeeItemsActions.openMoveStudentDialog('student-a')
    page.committeeItemsActions.submitMoveStudentToCommittee('committee-early')

    expect(sourceCommittee?.items.map((item) => item.localId)).toEqual(initialIds)
    expect(sourceCommittee?.items.map((item) => item.position)).toEqual(initialPositions)
    expect(page.committeeItemsActions.isMoveStudentDialogOpen.value).toBe(true)
  })

  it('keeps move dialog open and does nothing when submit is called without selected target', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    const sourceCommittee = scheduleDraftStoreMock.draft?.committees.find(
      (entry) => entry.localId === 'committee-early'
    )
    const targetCommittee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-late')

    const initialSourceIds = sourceCommittee?.items.map((item) => item.localId)
    const initialTargetIds = targetCommittee?.items.map((item) => item.localId)

    page.committeeItemsActions.openMoveStudentDialog('student-a')
    page.committeeItemsActions.submitMoveStudentToCommittee()

    expect(sourceCommittee?.items.map((item) => item.localId)).toEqual(initialSourceIds)
    expect(targetCommittee?.items.map((item) => item.localId)).toEqual(initialTargetIds)
    expect(page.committeeItemsActions.isMoveStudentDialogOpen.value).toBe(true)
    expect(page.committeeItemsActions.isMoveStudentSubmitDisabled.value).toBe(true)
    expect(page.committeeItemsActions.moveStudentRewritePreview.value).toBeNull()
    expect(page.committeeItemsActions.moveStudentHasRewriteChanges.value).toBe(false)
    expect(page.committeeItemsActions.moveStudentSubmitLabel.value).toBe('editor.items.move.submit')
  })

  it('renames draft with trimmed value', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openRenameDraftDialog()
    page.scheduleDialogs.renameDraftName.value = 'Upravený plán'
    page.scheduleDialogs.submitRenameDraft()

    expect(scheduleDraftStoreMock.draft?.name).toBe('Upravený plán')
    expect(page.scheduleDialogs.isRenameDraftDialogOpen.value).toBe(false)
    expect(page.scheduleDialogs.renameDraftValidationError.value).toBeNull()
  })

  it('rejects draft rename with leading or trailing whitespace', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openRenameDraftDialog()
    page.scheduleDialogs.renameDraftName.value = '  Upravený plán  '
    page.scheduleDialogs.submitRenameDraft()

    expect(scheduleDraftStoreMock.draft?.name).toBe('Plán')
    expect(page.scheduleDialogs.isRenameDraftDialogOpen.value).toBe(true)
    expect(page.scheduleDialogs.renameDraftValidationError.value).toBe(
      'editor.schedule.rename.validation.leadingTrailingWhitespace'
    )
  })

  it('opens cloud save dialog with current draft name prefilled', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openCloudSaveDialog()

    expect(page.scheduleDialogs.isCloudSaveDialogOpen.value).toBe(true)
    expect(page.scheduleDialogs.cloudSaveName.value).toBe('Plán')
    expect(page.scheduleDialogs.cloudSaveValidationError.value).toBeNull()
  })

  it('opens csv export dialog with all committees preselected and clears selection on close', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openCsvExportDialog()

    expect(page.scheduleDialogs.isCsvExportDialogOpen.value).toBe(true)
    expect(page.scheduleDialogs.selectedCsvExportCommitteeIds.value).toEqual(['committee-early', 'committee-late'])
    expect(page.scheduleDialogs.isCsvExportSubmitDisabled.value).toBe(false)

    page.scheduleDialogs.clearCsvExportCommittees()
    expect(page.scheduleDialogs.selectedCsvExportCommitteeIds.value).toEqual([])
    expect(page.scheduleDialogs.isCsvExportSubmitDisabled.value).toBe(true)

    page.scheduleDialogs.selectAllCsvExportCommittees()
    expect(page.scheduleDialogs.selectedCsvExportCommitteeIds.value).toEqual(['committee-early', 'committee-late'])
    expect(page.scheduleDialogs.isCsvExportSubmitDisabled.value).toBe(false)

    page.scheduleDialogs.closeCsvExportDialog()
    expect(page.scheduleDialogs.isCsvExportDialogOpen.value).toBe(false)
    expect(page.scheduleDialogs.selectedCsvExportCommitteeIds.value).toEqual([])
  })

  it('exports selected committees to questions-envelope csv and closes dialog', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openCsvExportDialog()
    page.scheduleDialogs.updateSelectedCsvExportCommitteeIds(['committee-late'])
    page.scheduleDialogs.submitCsvExportSelection()

    expect(exportQuestionsEnvelopeCsvMock).toHaveBeenCalledTimes(1)
    expect(exportQuestionsEnvelopeCsvMock).toHaveBeenCalledWith(
      expect.objectContaining({
        draftName: 'Plán',
        fallbackCommitteeLabel: 'editor.untitled',
        committees: [expect.objectContaining({ localId: 'committee-late' })]
      })
    )
    expect(page.scheduleDialogs.isCsvExportDialogOpen.value).toBe(false)
    expect(page.scheduleDialogs.selectedCsvExportCommitteeIds.value).toEqual([])
  })

  it('keeps csv export dialog open and lists all problematic students when department mapping fails', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    exportQuestionsEnvelopeCsvMock.mockImplementationOnce(() => {
      throw new QuestionsEnvelopeCsvDepartmentMappingErrorMock([
        {
          studentFullName: 'Novák Jan',
          committeeLabel: '2-NI-SI',
          specializationCode: 'UNKNOWN-1',
          studyProgramName: 'Informatika',
          studyProgramType: 'BACHELOR'
        },
        {
          studentFullName: 'Svobodová Eva',
          committeeLabel: '2-NI-SI',
          specializationCode: 'UNKNOWN-2',
          studyProgramName: 'Informatika',
          studyProgramType: 'MASTER'
        }
      ])
    })

    page.scheduleDialogs.openCsvExportDialog()
    page.scheduleDialogs.submitCsvExportSelection()

    expect(page.scheduleDialogs.isCsvExportDialogOpen.value).toBe(true)
    expect(page.scheduleDialogs.csvExportErrorItems.value).toHaveLength(2)
    expect(page.scheduleDialogs.csvExportErrorItems.value).toEqual([
      'editor.schedule.export.questionsEnvelopeCsvExport.errors.departmentMappingIssue',
      'editor.schedule.export.questionsEnvelopeCsvExport.errors.departmentMappingIssue'
    ])
    expect(i18nTranslateMock).toHaveBeenCalledWith(
      'editor.schedule.export.questionsEnvelopeCsvExport.errors.departmentMappingIssue',
      expect.objectContaining({ student: 'Novák Jan', specializationCode: 'UNKNOWN-1' })
    )
    expect(i18nTranslateMock).toHaveBeenCalledWith(
      'editor.schedule.export.questionsEnvelopeCsvExport.errors.departmentMappingIssue',
      expect.objectContaining({ student: 'Svobodová Eva', specializationCode: 'UNKNOWN-2' })
    )
  })

  it('keeps csv export submit disabled when there are no committees', async () => {
    scheduleDraftStoreMock.draft = {
      ...createDraftWithTwoCommittees(),
      committees: []
    }

    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openCsvExportDialog()

    expect(page.scheduleDialogs.isCsvExportDialogOpen.value).toBe(true)
    expect(page.scheduleDialogs.csvExportCommitteeItems.value).toEqual([])
    expect(page.scheduleDialogs.selectedCsvExportCommitteeIds.value).toEqual([])
    expect(page.scheduleDialogs.isCsvExportSubmitDisabled.value).toBe(true)

    page.scheduleDialogs.submitCsvExportSelection()
    expect(page.scheduleDialogs.isCsvExportDialogOpen.value).toBe(true)
    expect(exportQuestionsEnvelopeCsvMock).not.toHaveBeenCalled()
  })

  it('opens public pdf export dialog with all committees preselected and clears selection on close', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openPdfPublicExportDialog()

    expect(page.scheduleDialogs.isPdfPublicExportDialogOpen.value).toBe(true)
    expect(page.scheduleDialogs.selectedPdfPublicExportCommitteeIds.value).toEqual([
      'committee-early',
      'committee-late'
    ])
    expect(page.scheduleDialogs.isPdfPublicExportSubmitDisabled.value).toBe(false)

    page.scheduleDialogs.clearPdfPublicExportCommittees()
    expect(page.scheduleDialogs.selectedPdfPublicExportCommitteeIds.value).toEqual([])
    expect(page.scheduleDialogs.isPdfPublicExportSubmitDisabled.value).toBe(true)

    page.scheduleDialogs.selectAllPdfPublicExportCommittees()
    expect(page.scheduleDialogs.selectedPdfPublicExportCommitteeIds.value).toEqual([
      'committee-early',
      'committee-late'
    ])

    page.scheduleDialogs.closePdfPublicExportDialog()
    expect(page.scheduleDialogs.isPdfPublicExportDialogOpen.value).toBe(false)
    expect(page.scheduleDialogs.selectedPdfPublicExportCommitteeIds.value).toEqual([])
  })

  it('submits public pdf export, keeps loading state during request and closes dialog on success', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()
    const expectedPdfBuffer = new ArrayBuffer(32)

    const pendingRequest = new Promise<ArrayBuffer>((resolve) => {
      setTimeout(() => resolve(expectedPdfBuffer), 0)
    })
    requestFetchMock.mockReturnValueOnce(pendingRequest)

    page.scheduleDialogs.openPdfPublicExportDialog()
    page.scheduleDialogs.updateSelectedPdfPublicExportCommitteeIds(['committee-late'])
    const submitPromise = page.scheduleDialogs.submitPdfPublicExportSelection()

    expect(page.scheduleDialogs.isPdfPublicExportLoading.value).toBe(true)
    expect(buildPdfPublicExportPayloadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        draftName: 'Plán',
        fallbackCommitteeLabel: 'editor.untitled',
        committees: [expect.objectContaining({ localId: 'committee-late' })]
      })
    )
    expect(requestFetchMock).toHaveBeenCalledWith('/api/editor/export/pdf/public', {
      method: 'POST',
      body: expect.objectContaining({
        sections: [{ committeeId: 'committee-late' }]
      }),
      responseType: 'arrayBuffer'
    })

    await submitPromise

    expect(downloadPdfFileMock).toHaveBeenCalledWith(expectedPdfBuffer, 'Časový plán SZZ export.pdf')
    expect(buildPdfPublicFileNameMock).toHaveBeenCalledWith('Plán')
    expect(page.scheduleDialogs.isPdfPublicExportLoading.value).toBe(false)
    expect(page.scheduleDialogs.isPdfPublicExportDialogOpen.value).toBe(false)
  })

  it('skips public pdf request when payload has no sections', async () => {
    buildPdfPublicExportPayloadMock.mockReturnValueOnce({
      draftName: 'Plán',
      documentHeaderTitle: 'PLÁN KONÁNÍ STÁTNÍCH ZÁVĚREČNÝCH ZKOUŠEK',
      sections: []
    })

    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openPdfPublicExportDialog()
    await page.scheduleDialogs.submitPdfPublicExportSelection()

    expect(requestFetchMock).not.toHaveBeenCalled()
    expect(downloadPdfFileMock).not.toHaveBeenCalled()
    expect(page.scheduleDialogs.isPdfPublicExportDialogOpen.value).toBe(true)
    expect(page.scheduleDialogs.isPdfPublicExportLoading.value).toBe(false)
  })

  it('keeps public pdf dialog open and shows request error', async () => {
    requestFetchMock.mockRejectedValueOnce({
      data: {
        statusMessage: 'Public PDF export failed'
      }
    })

    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openPdfPublicExportDialog()
    await page.scheduleDialogs.submitPdfPublicExportSelection()

    expect(downloadPdfFileMock).not.toHaveBeenCalled()
    expect(page.scheduleDialogs.isPdfPublicExportDialogOpen.value).toBe(true)
    expect(page.scheduleDialogs.isPdfPublicExportLoading.value).toBe(false)
    expect(page.scheduleDialogs.pdfPublicExportErrorItems.value).toEqual(['Public PDF export failed'])
  })

  it('opens invigilators pdf export dialog with day groups and supports per-selection updates', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openPdfInvigilatorsExportDialog()

    expect(page.scheduleDialogs.isPdfInvigilatorsExportDialogOpen.value).toBe(true)
    expect(page.scheduleDialogs.selectedPdfInvigilatorsExportCommitteeIds.value).toEqual([
      'committee-early',
      'committee-late'
    ])
    expect(page.scheduleDialogs.isPdfInvigilatorsExportSubmitDisabled.value).toBe(false)

    expect(page.scheduleDialogs.pdfInvigilatorsExportDayGroups.value).toHaveLength(2)
    expect(page.scheduleDialogs.pdfInvigilatorsExportDayGroups.value[0]?.committees.map((entry) => entry.id)).toEqual([
      'committee-early'
    ])
    expect(page.scheduleDialogs.pdfInvigilatorsExportDayGroups.value[1]?.committees.map((entry) => entry.id)).toEqual([
      'committee-late'
    ])

    page.scheduleDialogs.updateSelectedPdfInvigilatorsExportCommitteeIds(['committee-late', 'missing-id'])
    expect(page.scheduleDialogs.selectedPdfInvigilatorsExportCommitteeIds.value).toEqual(['committee-late'])

    page.scheduleDialogs.clearPdfInvigilatorsExportCommittees()
    expect(page.scheduleDialogs.selectedPdfInvigilatorsExportCommitteeIds.value).toEqual([])
    expect(page.scheduleDialogs.isPdfInvigilatorsExportSubmitDisabled.value).toBe(true)

    page.scheduleDialogs.closePdfInvigilatorsExportDialog()
    expect(page.scheduleDialogs.isPdfInvigilatorsExportDialogOpen.value).toBe(false)
    expect(page.scheduleDialogs.selectedPdfInvigilatorsExportCommitteeIds.value).toEqual([])
  })

  it('keeps invigilators pdf dialog open and shows fallback error when request message is missing', async () => {
    requestFetchMock.mockRejectedValueOnce(new Error())

    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openPdfInvigilatorsExportDialog()
    await page.scheduleDialogs.submitPdfInvigilatorsExportSelection()

    expect(downloadPdfFileMock).not.toHaveBeenCalled()
    expect(page.scheduleDialogs.isPdfInvigilatorsExportDialogOpen.value).toBe(true)
    expect(page.scheduleDialogs.isPdfInvigilatorsExportLoading.value).toBe(false)
    expect(page.scheduleDialogs.pdfInvigilatorsExportErrorItems.value).toEqual([
      'editor.schedule.export.pdfInvigilatorsDialog.errors.unknown'
    ])
  })

  it('adds invigilator with trimmed value to selected committee', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.invigilators.openAddInvigilatorDialog()
    page.invigilators.newInvigilatorName.value = 'Novák Jan, Ing.'
    page.invigilators.submitAddInvigilator()

    expect(page.invigilators.isAddInvigilatorDialogOpen.value).toBe(false)
    expect(page.invigilators.invigilatorValidationError.value).toBeNull()
    expect(scheduleDraftStoreMock.draft?.committees[0]?.invigilators.map((entry) => entry.name)).toEqual([
      'Dozor',
      'Novák Jan, Ing.'
    ])
  })

  it('validates invigilator name when it is blank or has outer whitespace', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.invigilators.openAddInvigilatorDialog()
    page.invigilators.newInvigilatorName.value = '   '
    page.invigilators.submitAddInvigilator()
    expect(page.invigilators.invigilatorValidationError.value).toBe(
      'editor.committee.invigilators.add.validation.required'
    )

    page.invigilators.newInvigilatorName.value = '  Novák Jan, Ing.'
    page.invigilators.submitAddInvigilator()
    expect(page.invigilators.invigilatorValidationError.value).toBe(
      'editor.committee.invigilators.add.validation.leadingTrailingWhitespace'
    )
  })

  it('deletes invigilator from selected committee after confirm', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    expect(scheduleDraftStoreMock.draft?.committees[0]?.invigilators.map((entry) => entry.name)).toEqual(['Dozor'])

    page.invigilators.openDeleteInvigilatorConfirm('invigilator-dozor')
    expect(page.invigilators.isDeleteInvigilatorConfirmOpen.value).toBe(true)

    page.invigilators.submitDeleteInvigilator()

    expect(scheduleDraftStoreMock.draft?.committees[0]?.invigilators).toEqual([])
    expect(page.invigilators.isDeleteInvigilatorConfirmOpen.value).toBe(false)
  })

  it('updates selected committee language in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.language).toBe('CZECH')

    page.committeeFields.updateSelectedCommitteeLanguage('ENGLISH')

    expect(page.committeeList.selectedCommittee.value?.language).toBe('ENGLISH')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.language
    ).toBe('ENGLISH')
  })

  it('updates selected committee start minute in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.startMinute).toBe(510)

    page.committeeFields.updateSelectedCommitteeStartMinute(585)

    expect(page.committeeList.selectedCommittee.value?.startMinute).toBe(585)
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.startMinute
    ).toBe(585)
  })

  it('updates committee members in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.committeeFields.updateSelectedCommitteeChairName('doc. Předseda Nový')
    page.committeeFields.updateSelectedCommitteeViceChairName('doc. Místopředseda Nový')
    page.committeeFields.updateSelectedCommitteeMember1Name('Člen A')
    page.committeeFields.updateSelectedCommitteeMember2Name('Člen B')
    page.committeeFields.updateSelectedCommitteeMember3Name('Člen C')

    const selectedCommittee = scheduleDraftStoreMock.draft?.committees.find(
      (entry) => entry.localId === 'committee-early'
    )
    expect(selectedCommittee?.chairName).toBe('doc. Předseda Nový')
    expect(selectedCommittee?.viceChairName).toBe('doc. Místopředseda Nový')
    expect(selectedCommittee?.member1Name).toBe('Člen A')
    expect(selectedCommittee?.member2Name).toBe('Člen B')
    expect(selectedCommittee?.member3Name).toBe('Člen C')
  })

  it('normalizes whitespace for committee text fields', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.committeeFields.updateSelectedCommitteeChairName('  doc. Předseda  ')
    page.committeeFields.updateSelectedCommitteeSecretary('   ')
    page.committeeFields.updateSelectedCommitteeRoom('  TH:A-1500  ')
    page.committeeFields.updateSelectedCommitteePreparationRoom('  TH:A-1510  ')

    const selectedCommittee = scheduleDraftStoreMock.draft?.committees.find(
      (entry) => entry.localId === 'committee-early'
    )
    expect(selectedCommittee?.chairName).toBe('doc. Předseda')
    expect(selectedCommittee?.secretaryName).toBeNull()
    expect(selectedCommittee?.room).toBe('TH:A-1500')
    expect(selectedCommittee?.preparationRoom).toBe('TH:A-1510')
  })

  it('updates selected committee study program type in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.studyProgramType).toBe('BACHELOR')

    page.committeeFields.updateSelectedCommitteeStudyProgramType('MASTER')

    expect(page.committeeList.selectedCommittee.value?.studyProgramType).toBe('MASTER')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.studyProgramType
    ).toBe('MASTER')
  })

  it('updates selected committee study program name in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('Informatika')

    page.committeeFields.updateSelectedCommitteeLanguage('ENGLISH')
    page.committeeFields.updateSelectedCommitteeStudyProgramName('Informatics')

    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('Informatics')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.studyProgramName
    ).toBe('Informatics')
  })

  it('ignores study program name that is not allowed for selected language', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.language).toBe('CZECH')
    expect(page.committeeList.selectedCommittee.value?.studyProgramType).toBe('BACHELOR')
    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('Informatika')

    page.committeeFields.updateSelectedCommitteeStudyProgramName('Informatics')

    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('Informatika')
  })

  it('clears study program and specialization when language changes to incompatible one', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('Informatika')
    expect(page.committeeList.selectedCommittee.value?.specializationCode).toBe('BI-SI.21')

    page.committeeFields.updateSelectedCommitteeLanguage('ENGLISH')

    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('')
    expect(page.committeeList.selectedCommittee.value?.specializationCode).toBe('')
    expect(page.committeeList.selectedCommittee.value?.specializationName).toBe('')
  })

  it('clears specialization when study program type changes', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.studyProgramType).toBe('BACHELOR')
    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('Informatika')
    expect(page.committeeList.selectedCommittee.value?.specializationCode).toBe('BI-SI.21')

    page.committeeFields.updateSelectedCommitteeStudyProgramType('MASTER')

    expect(page.committeeList.selectedCommittee.value?.studyProgramType).toBe('MASTER')
    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('Informatika')
    expect(page.committeeList.selectedCommittee.value?.specializationCode).toBe('')
    expect(page.committeeList.selectedCommittee.value?.specializationName).toBe('')
  })

  it('updates selected committee specialization from selected study program', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.committeeFields.updateSelectedCommitteeStudyProgramType('BACHELOR')
    page.committeeFields.updateSelectedCommitteeStudyProgramName('Informatika')
    page.committeeFields.updateSelectedCommitteeSpecializationCode('BI-SI.21')

    expect(page.committeeList.selectedCommittee.value?.specializationCode).toBe('BI-SI.21')
    expect(page.committeeList.selectedCommittee.value?.specializationName).toBe('Softwarové inženýrství 2021')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.specializationCode
    ).toBe('BI-SI.21')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.specializationName
    ).toBe('Softwarové inženýrství 2021')
  })

  it('saves to cloud using modal name and keeps current draft name unchanged', async () => {
    const { useEditorPage } = await import('~/composables/editor/page/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openCloudSaveDialog()
    page.scheduleDialogs.cloudSaveName.value = 'Archivní plán SZZ'

    await page.scheduleDialogs.submitCloudSave()

    expect(saveManualDraftMock).toHaveBeenCalledWith('Archivní plán SZZ', true)
    expect(scheduleDraftStoreMock.draft?.name).toBe('Plán')
    expect(page.scheduleDialogs.isCloudSaveDialogOpen.value).toBe(false)
    expect(page.scheduleDialogs.cloudSaveValidationError.value).toBeNull()
  })
})
