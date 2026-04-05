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
      personalNumber: `A-${localId}`,
      firstName,
      lastName: 'Novák',
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
      defenseDepartmentCode: 'KSI',
      defenseDepartmentName: 'KSI',
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

    expect(page.selectedCommittee.value?.localId).toBe('committee-early')
    expect(page.selectedStudents.value.map((row) => row.id)).toEqual(['student-a', 'student-b'])

    page.selectedStudents.value = [page.selectedStudents.value[1]!, page.selectedStudents.value[0]!]

    const committee = scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')
    expect(committee).toBeDefined()
    if (!committee) {
      throw new Error('Expected committee to exist')
    }

    expect(committee.items.map((item) => item.localId)).toEqual(['student-b', 'pause-a', 'student-a'])
    expect(committee.items.map((item) => item.position)).toEqual([1, 2, 3])
  })

  it('creates committee with trimmed name and selects it', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.openCreateCommitteeDialog()
    page.createCommitteeName.value = '  Nová komise  '
    page.submitCreateCommittee()

    const draftCommittees = scheduleDraftStoreMock.draft?.committees ?? []
    expect(draftCommittees).toHaveLength(3)

    const createdCommittee = draftCommittees.find((entry) => entry.name === 'Nová komise')
    expect(createdCommittee).toBeDefined()
    expect(page.selectedCommitteeId.value).toBe(createdCommittee?.localId ?? '')
    expect(page.isCreateCommitteeDialogOpen.value).toBe(false)
    expect(page.createCommitteeValidationError.value).toBeNull()
  })

  it('shows duplicate validation when renaming committee to existing name', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.openRenameCommitteeDialog('committee-early')
    page.renameCommitteeName.value = '1-NI-SI'
    page.submitRenameCommittee()

    expect(page.renameCommitteeValidationError.value).toBe('editor.committees.rename.validation.duplicate')
    expect(scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.name).toBe(
      '2-NI-SI'
    )
    expect(page.isRenameCommitteeDialogOpen.value).toBe(true)
  })

  it('deletes selected committee and switches selection to next available tab', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.selectedCommitteeId.value).toBe('committee-early')

    page.openDeleteCommitteeConfirm('committee-early')
    page.submitDeleteCommittee()

    expect(scheduleDraftStoreMock.draft?.committees.map((entry) => entry.localId)).toEqual(['committee-late'])
    expect(page.selectedCommitteeId.value).toBe('committee-late')
    expect(page.isDeleteCommitteeConfirmOpen.value).toBe(false)
  })

  it('renames draft with trimmed value', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.openRenameDraftDialog()
    page.renameDraftName.value = 'Upravený plán'
    page.submitRenameDraft()

    expect(scheduleDraftStoreMock.draft?.name).toBe('Upravený plán')
    expect(page.isRenameDraftDialogOpen.value).toBe(false)
    expect(page.renameDraftValidationError.value).toBeNull()
  })

  it('rejects draft rename with leading or trailing whitespace', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.openRenameDraftDialog()
    page.renameDraftName.value = '  Upravený plán  '
    page.submitRenameDraft()

    expect(scheduleDraftStoreMock.draft?.name).toBe('Plán')
    expect(page.isRenameDraftDialogOpen.value).toBe(true)
    expect(page.renameDraftValidationError.value).toBe('editor.schedule.rename.validation.leadingTrailingWhitespace')
  })

  it('opens cloud save dialog with current draft name prefilled', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.openCloudSaveDialog()

    expect(page.isCloudSaveDialogOpen.value).toBe(true)
    expect(page.cloudSaveName.value).toBe('Plán')
    expect(page.cloudSaveValidationError.value).toBeNull()
  })

  it('adds invigilator with trimmed value to selected committee', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.openAddInvigilatorDialog()
    page.newInvigilatorName.value = 'Novák Jan, Ing.'
    page.submitAddInvigilator()

    expect(page.isAddInvigilatorDialogOpen.value).toBe(false)
    expect(page.invigilatorValidationError.value).toBeNull()
    expect(scheduleDraftStoreMock.draft?.committees[0]?.invigilators.map((entry) => entry.name)).toEqual([
      'Dozor',
      'Novák Jan, Ing.'
    ])
  })

  it('validates invigilator name when it is blank or has outer whitespace', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.openAddInvigilatorDialog()
    page.newInvigilatorName.value = '   '
    page.submitAddInvigilator()
    expect(page.invigilatorValidationError.value).toBe('editor.committee.invigilators.add.validation.required')

    page.newInvigilatorName.value = '  Novák Jan, Ing.'
    page.submitAddInvigilator()
    expect(page.invigilatorValidationError.value).toBe(
      'editor.committee.invigilators.add.validation.leadingTrailingWhitespace'
    )
  })

  it('deletes invigilator from selected committee after confirm', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(scheduleDraftStoreMock.draft?.committees[0]?.invigilators.map((entry) => entry.name)).toEqual(['Dozor'])

    page.openDeleteInvigilatorConfirm('invigilator-dozor')
    expect(page.isDeleteInvigilatorConfirmOpen.value).toBe(true)

    page.submitDeleteInvigilator()

    expect(scheduleDraftStoreMock.draft?.committees[0]?.invigilators).toEqual([])
    expect(page.isDeleteInvigilatorConfirmOpen.value).toBe(false)
  })

  it('updates selected committee language in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.selectedCommittee.value?.language).toBe('CZECH')

    page.updateSelectedCommitteeLanguage('ENGLISH')

    expect(page.selectedCommittee.value?.language).toBe('ENGLISH')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.language
    ).toBe('ENGLISH')
  })

  it('updates committee members in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.updateSelectedCommitteeChairName('doc. Předseda Nový')
    page.updateSelectedCommitteeViceChairName('doc. Místopředseda Nový')
    page.updateSelectedCommitteeMember1Name('Člen A')
    page.updateSelectedCommitteeMember2Name('Člen B')
    page.updateSelectedCommitteeMember3Name('Člen C')

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

    page.updateSelectedCommitteeChairName('  doc. Předseda  ')
    page.updateSelectedCommitteeSecretary('   ')
    page.updateSelectedCommitteeRoom('  TH:A-1500  ')

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

    expect(page.selectedCommittee.value?.studyProgramType).toBe('BACHELOR')

    page.updateSelectedCommitteeStudyProgramType('MASTER')

    expect(page.selectedCommittee.value?.studyProgramType).toBe('MASTER')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.studyProgramType
    ).toBe('MASTER')
  })

  it('updates selected committee study program name in draft store', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.selectedCommittee.value?.studyProgramName).toBe('Informatika')

    page.updateSelectedCommitteeLanguage('ENGLISH')
    page.updateSelectedCommitteeStudyProgramName('Informatics')

    expect(page.selectedCommittee.value?.studyProgramName).toBe('Informatics')
    expect(
      scheduleDraftStoreMock.draft?.committees.find((entry) => entry.localId === 'committee-early')?.studyProgramName
    ).toBe('Informatics')
  })

  it('ignores study program name that is not allowed for selected language', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.selectedCommittee.value?.language).toBe('CZECH')
    expect(page.selectedCommittee.value?.studyProgramType).toBe('BACHELOR')
    expect(page.selectedCommittee.value?.studyProgramName).toBe('Informatika')

    page.updateSelectedCommitteeStudyProgramName('Informatics')

    expect(page.selectedCommittee.value?.studyProgramName).toBe('Informatika')
  })

  it('clears study program, specialization and department when language changes to incompatible one', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.selectedCommittee.value?.studyProgramName).toBe('Informatika')
    expect(page.selectedCommittee.value?.specializationCode).toBe('BI-SI.21')
    expect(page.selectedCommittee.value?.defenseDepartmentCode).toBe('18102')

    page.updateSelectedCommitteeLanguage('ENGLISH')

    expect(page.selectedCommittee.value?.studyProgramName).toBe('')
    expect(page.selectedCommittee.value?.specializationCode).toBe('')
    expect(page.selectedCommittee.value?.specializationName).toBe('')
    expect(page.selectedCommittee.value?.defenseDepartmentCode).toBe('')
    expect(page.selectedCommittee.value?.defenseDepartmentName).toBe('')
  })

  it('clears specialization and department when study program type changes', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    expect(page.selectedCommittee.value?.studyProgramType).toBe('BACHELOR')
    expect(page.selectedCommittee.value?.studyProgramName).toBe('Informatika')
    expect(page.selectedCommittee.value?.specializationCode).toBe('BI-SI.21')

    page.updateSelectedCommitteeStudyProgramType('MASTER')

    expect(page.selectedCommittee.value?.studyProgramType).toBe('MASTER')
    expect(page.selectedCommittee.value?.studyProgramName).toBe('Informatika')
    expect(page.selectedCommittee.value?.specializationCode).toBe('')
    expect(page.selectedCommittee.value?.specializationName).toBe('')
    expect(page.selectedCommittee.value?.defenseDepartmentCode).toBe('')
    expect(page.selectedCommittee.value?.defenseDepartmentName).toBe('')
  })

  it('updates selected committee specialization from selected study program', async () => {
    const { useEditorPage } = await import('~/composables/editor/useEditorPage')
    const page = useEditorPage()

    page.updateSelectedCommitteeStudyProgramType('BACHELOR')
    page.updateSelectedCommitteeStudyProgramName('Informatika')
    page.updateSelectedCommitteeSpecializationCode('BI-SI.21')

    expect(page.selectedCommittee.value?.specializationCode).toBe('BI-SI.21')
    expect(page.selectedCommittee.value?.specializationName).toBe('Softwarové inženýrství 2021')
    expect(page.selectedCommittee.value?.defenseDepartmentCode).toBe('18102')
    expect(page.selectedCommittee.value?.defenseDepartmentName).toBe('Katedra softwarového inženýrství')
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

    page.openCloudSaveDialog()
    page.cloudSaveName.value = 'Archivní plán SZZ'

    await page.submitCloudSave()

    expect(saveManualDraftMock).toHaveBeenCalledWith('Archivní plán SZZ', true)
    expect(scheduleDraftStoreMock.draft?.name).toBe('Plán')
    expect(page.isCloudSaveDialogOpen.value).toBe(false)
    expect(page.cloudSaveValidationError.value).toBeNull()
  })
})
