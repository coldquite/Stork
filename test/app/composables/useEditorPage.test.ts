import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScheduleDraft, ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'

const { i18nTranslateMock } = vi.hoisted(() => ({
  i18nTranslateMock: vi.fn((key: string) => key)
}))

const { saveManualDraftMock } = vi.hoisted(() => ({
  saveManualDraftMock: vi.fn()
}))

const scheduleDraftStoreMock = reactive({
  draft: null as ScheduleDraft | null,
  isDraftLoading: false,
  isManualSaveLoading: false,
  isAutoSaveRunning: false,
  saveManualDraft: saveManualDraftMock
})

mockNuxtImport('useI18n', () => {
  return () => ({
    t: i18nTranslateMock
  })
})

vi.mock('~/stores/schedule-draft', () => {
  return {
    useScheduleDraftStore: () => scheduleDraftStoreMock
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
      studyProgramName: 'Study Program',
      studyProgramType: 'BACHELOR',
      specializationName: 'SI',
      specializationCode: 'SI',
      studyLanguage: 'CZECH',
      thesisSubmissionAt: null,
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
}): ScheduleDraftCommittee {
  return {
    localId: options.localId,
    name: options.name,
    startMinute: options.startMinute,
    date: options.date,
    room: 'TH:A-1435',
    secretaryName: 'Sekretář',
    invigilators: options.invigilators ?? [{ localId: 'invigilator-dozor', name: 'Dozor' }],
    language: 'CZECH',
    studyProgramName: 'Informatika',
    studyProgramType: 'BACHELOR',
    specializationName: 'Softwarové inženýrství 2021',
    specializationCode: 'BI-SI.21',
    defenseDepartmentCode: '18102',
    defenseDepartmentName: 'Katedra softwarového inženýrství',
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
    saveManualDraftMock.mockResolvedValue({
      id: 'saved-auto',
      createdAt: '2026-06-12T09:00:00.000Z'
    })
    scheduleDraftStoreMock.isDraftLoading = false
    scheduleDraftStoreMock.isManualSaveLoading = false
    scheduleDraftStoreMock.isAutoSaveRunning = false
    scheduleDraftStoreMock.draft = createDraftWithTwoCommittees()
  })

  it('reorders only student items and keeps pauses in place', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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

  it('updates editable student row fields in draft', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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
    expect(firstStudentItem.student.prepareMinutes).toBe(50)
    expect(firstStudentItem.student.examMinutes).toBe(25)

    expect(page.studentTable.selectedStudents.value[0]?.prepareTime).toBe('07:40')
    expect(page.studentTable.selectedStudents.value[0]?.examTime).toBe('08:30 - 08:55')
    expect(page.studentTable.selectedStudents.value[1]?.examTime).toBe('09:15 - 09:45')
  })

  it('updates english thesis title when committee language is english', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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
    expect(scheduleDraftStoreMock.draft?.thesisTitleDisplayMode).toBe('BOTH')
  })

  it('creates committee with trimmed name and selects it', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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

  it('creates committee with selected study fields and auto-filled department', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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
    expect(createdCommittee?.defenseDepartmentCode).toBe('18102')
    expect(createdCommittee?.defenseDepartmentName).toBe('Katedra softwarového inženýrství')
    expect(createdCommittee?.room).toBeNull()
    expect(createdCommittee?.secretaryName).toBeNull()
    expect(createdCommittee?.chairName).toBe('')
    expect(createdCommittee?.viceChairName).toBe('')
    expect(createdCommittee?.member1Name).toBe('')
    expect(createdCommittee?.member2Name).toBe('')
    expect(createdCommittee?.member3Name).toBe('')
  })

  it('shows duplicate validation when renaming committee to existing name', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommitteeId.value).toBe('committee-early')

    page.committeeList.openDeleteCommitteeConfirm('committee-early')
    page.committeeList.submitDeleteCommittee()

    expect(scheduleDraftStoreMock.draft?.committees.map((entry) => entry.localId)).toEqual(['committee-late'])
    expect(page.committeeList.selectedCommitteeId.value).toBe('committee-late')
    expect(page.committeeList.isDeleteCommitteeConfirmOpen.value).toBe(false)
  })

  it('renames draft with trimmed value', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openRenameDraftDialog()
    page.scheduleDialogs.renameDraftName.value = 'Upravený plán'
    page.scheduleDialogs.submitRenameDraft()

    expect(scheduleDraftStoreMock.draft?.name).toBe('Upravený plán')
    expect(page.scheduleDialogs.isRenameDraftDialogOpen.value).toBe(false)
    expect(page.scheduleDialogs.renameDraftValidationError.value).toBeNull()
  })

  it('rejects draft rename with leading or trailing whitespace', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.scheduleDialogs.openCloudSaveDialog()

    expect(page.scheduleDialogs.isCloudSaveDialogOpen.value).toBe(true)
    expect(page.scheduleDialogs.cloudSaveName.value).toBe('Plán')
    expect(page.scheduleDialogs.cloudSaveValidationError.value).toBeNull()
  })

  it('adds invigilator with trimmed value to selected committee', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(scheduleDraftStoreMock.draft?.committees[0]?.invigilators.map((entry) => entry.name)).toEqual(['Dozor'])

    page.invigilators.openDeleteInvigilatorConfirm('invigilator-dozor')
    expect(page.invigilators.isDeleteInvigilatorConfirmOpen.value).toBe(true)

    page.invigilators.submitDeleteInvigilator()

    expect(scheduleDraftStoreMock.draft?.committees[0]?.invigilators).toEqual([])
    expect(page.invigilators.isDeleteInvigilatorConfirmOpen.value).toBe(false)
  })

  it('updates selected committee language in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.language).toBe('CZECH')

    page.committeeFields.updateSelectedCommitteeLanguage('ENGLISH')

    expect(page.committeeList.selectedCommittee.value?.language).toBe('ENGLISH')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.language
    ).toBe('ENGLISH')
  })

  it('updates selected committee start minute in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.startMinute).toBe(510)

    page.committeeFields.updateSelectedCommitteeStartMinute(585)

    expect(page.committeeList.selectedCommittee.value?.startMinute).toBe(585)
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.startMinute
    ).toBe(585)
  })

  it('updates committee members in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.committeeFields.updateSelectedCommitteeChairName('  doc. Předseda  ')
    page.committeeFields.updateSelectedCommitteeSecretary('   ')
    page.committeeFields.updateSelectedCommitteeRoom('  TH:A-1500  ')

    const selectedCommittee = scheduleDraftStoreMock.draft?.committees.find(
      (entry) => entry.localId === 'committee-early'
    )
    expect(selectedCommittee?.chairName).toBe('doc. Předseda')
    expect(selectedCommittee?.secretaryName).toBeNull()
    expect(selectedCommittee?.room).toBe('TH:A-1500')
  })

  it('updates selected committee study program type in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.studyProgramType).toBe('BACHELOR')

    page.committeeFields.updateSelectedCommitteeStudyProgramType('MASTER')

    expect(page.committeeList.selectedCommittee.value?.studyProgramType).toBe('MASTER')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.studyProgramType
    ).toBe('MASTER')
  })

  it('updates selected committee study program name in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.language).toBe('CZECH')
    expect(page.committeeList.selectedCommittee.value?.studyProgramType).toBe('BACHELOR')
    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('Informatika')

    page.committeeFields.updateSelectedCommitteeStudyProgramName('Informatics')

    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('Informatika')
  })

  it('clears study program, specialization and department when language changes to incompatible one', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('Informatika')
    expect(page.committeeList.selectedCommittee.value?.specializationCode).toBe('BI-SI.21')
    expect(page.committeeList.selectedCommittee.value?.defenseDepartmentCode).toBe('18102')

    page.committeeFields.updateSelectedCommitteeLanguage('ENGLISH')

    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('')
    expect(page.committeeList.selectedCommittee.value?.specializationCode).toBe('')
    expect(page.committeeList.selectedCommittee.value?.specializationName).toBe('')
    expect(page.committeeList.selectedCommittee.value?.defenseDepartmentCode).toBe('')
    expect(page.committeeList.selectedCommittee.value?.defenseDepartmentName).toBe('')
  })

  it('clears specialization and department when study program type changes', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.committeeList.selectedCommittee.value?.studyProgramType).toBe('BACHELOR')
    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('Informatika')
    expect(page.committeeList.selectedCommittee.value?.specializationCode).toBe('BI-SI.21')

    page.committeeFields.updateSelectedCommitteeStudyProgramType('MASTER')

    expect(page.committeeList.selectedCommittee.value?.studyProgramType).toBe('MASTER')
    expect(page.committeeList.selectedCommittee.value?.studyProgramName).toBe('Informatika')
    expect(page.committeeList.selectedCommittee.value?.specializationCode).toBe('')
    expect(page.committeeList.selectedCommittee.value?.specializationName).toBe('')
    expect(page.committeeList.selectedCommittee.value?.defenseDepartmentCode).toBe('')
    expect(page.committeeList.selectedCommittee.value?.defenseDepartmentName).toBe('')
  })

  it('updates selected committee specialization from selected study program', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.committeeFields.updateSelectedCommitteeStudyProgramType('BACHELOR')
    page.committeeFields.updateSelectedCommitteeStudyProgramName('Informatika')
    page.committeeFields.updateSelectedCommitteeSpecializationCode('BI-SI.21')

    expect(page.committeeList.selectedCommittee.value?.specializationCode).toBe('BI-SI.21')
    expect(page.committeeList.selectedCommittee.value?.specializationName).toBe('Softwarové inženýrství 2021')
    expect(page.committeeList.selectedCommittee.value?.defenseDepartmentCode).toBe('18102')
    expect(page.committeeList.selectedCommittee.value?.defenseDepartmentName).toBe('Katedra softwarového inženýrství')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.specializationCode
    ).toBe('BI-SI.21')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.specializationName
    ).toBe('Softwarové inženýrství 2021')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
        ?.defenseDepartmentCode
    ).toBe('18102')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
        ?.defenseDepartmentName
    ).toBe('Katedra softwarového inženýrství')
  })

  it('saves to cloud using modal name and keeps current draft name unchanged', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
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
