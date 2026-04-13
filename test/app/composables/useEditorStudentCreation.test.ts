import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StudyProgramTypeDto } from '#shared/types/time-schedules'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'
import type { EditorCreateStudentTextField } from '~/types/editor'

const { i18nTranslateMock } = vi.hoisted(() => ({
  i18nTranslateMock: vi.fn((key: string) => key)
}))

mockNuxtImport('useI18n', () => {
  return () => ({
    t: i18nTranslateMock
  })
})

function createStudentItem(localId: string, position: number): ScheduleDraftItem {
  return {
    localId,
    type: 'STUDENT',
    position,
    student: {
      firstName: 'Existující',
      lastName: 'Student',
      email: null,
      titlesBefore: null,
      titlesAfter: null,
      thesisTitleLocal: 'Lokální název',
      thesisTitleEn: 'English title',
      thesisLanguage: 'CZECH',
      supervisorName: 'Vedoucí 1',
      reviewerName: 'Oponent 1',
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

function createCommittee(options: { studyProgramType?: StudyProgramTypeDto } = {}): ScheduleDraftCommittee {
  const studyProgramType = options.studyProgramType ?? 'BACHELOR'

  return {
    localId: 'committee-1',
    name: '1-BI-SI.21',
    startMinute: 540,
    date: '2026-06-10T00:00:00.000Z',
    room: 'TH:A-1435',
    secretaryName: 'Sekretář',
    invigilators: [],
    language: 'CZECH',
    studyProgramName: 'Informatika',
    studyProgramType,
    specializationName: 'Softwarové inženýrství 2021',
    specializationCode: 'BI-SI.21',
    chairName: 'Předseda',
    viceChairName: 'Místopředseda',
    member1Name: 'Člen 1',
    member2Name: 'Člen 2',
    member3Name: 'Člen 3',
    items: [createStudentItem('student-1', 1), createPauseItem('pause-1', 2), createStudentItem('student-2', 4)]
  }
}

function fillMinimalRequiredFields(
  updateTextField: (field: EditorCreateStudentTextField, value: string) => void
): void {
  updateTextField('firstName', 'Jan')
  updateTextField('lastName', 'Novák')
  updateTextField('thesisTitleLocal', 'Lokální název práce')
  updateTextField('thesisTitleEn', 'English thesis title')
  updateTextField('supervisorName', 'Vedoucí práce')
  updateTextField('reviewerName', 'Oponent práce')
}

describe('useEditorStudentCreation', () => {
  beforeEach(() => {
    i18nTranslateMock.mockClear()
  })

  it('opens with committee defaults', async () => {
    const selectedCommittee = ref<ScheduleDraftCommittee | null>(createCommittee())
    const { useEditorStudentCreation } = await import('~/composables/editor/students/useEditorStudentCreation')
    const creation = useEditorStudentCreation(computed(() => selectedCommittee.value))

    creation.openCreateStudentDialog()

    expect(creation.isCreateStudentDialogOpen.value).toBe(true)
    expect(creation.createStudentCommitteeLabel.value).toBe('1-BI-SI.21')
    expect(creation.createStudentDraft.value?.studyProgramType).toBe('BACHELOR')
    expect(creation.createStudentDraft.value?.studyProgramName).toBe('Informatika')
    expect(creation.createStudentDraft.value?.specializationCode).toBe('')
    expect(creation.createStudentDraft.value?.studyLanguage).toBe('CZECH')
    expect(creation.createStudentDraft.value?.repeatType).toBe('NONE')
    expect(creation.createStudentDraft.value?.prepareMinutes).toBe(45)
    expect(creation.createStudentDraft.value?.examMinutes).toBe(30)
  })

  it('opens with mapped duration defaults for master committee', async () => {
    const selectedCommittee = ref<ScheduleDraftCommittee | null>(createCommittee({ studyProgramType: 'MASTER' }))
    const { useEditorStudentCreation } = await import('~/composables/editor/students/useEditorStudentCreation')
    const creation = useEditorStudentCreation(computed(() => selectedCommittee.value))

    creation.openCreateStudentDialog()

    expect(creation.createStudentDraft.value?.studyProgramType).toBe('MASTER')
    expect(creation.createStudentDraft.value?.repeatType).toBe('NONE')
    expect(creation.createStudentDraft.value?.prepareMinutes).toBe(45)
    expect(creation.createStudentDraft.value?.examMinutes).toBe(35)
  })

  it('applies table-equivalent profile cleanup when language changes', async () => {
    const selectedCommittee = ref<ScheduleDraftCommittee | null>(createCommittee())
    const { useEditorStudentCreation } = await import('~/composables/editor/students/useEditorStudentCreation')
    const creation = useEditorStudentCreation(computed(() => selectedCommittee.value))

    creation.openCreateStudentDialog()
    creation.updateCreateStudentStudyLanguage('ENGLISH')

    expect(creation.createStudentDraft.value?.studyLanguage).toBe('ENGLISH')
    expect(creation.createStudentDraft.value?.studyProgramName).toBe('')
    expect(creation.createStudentDraft.value?.specializationCode).toBe('')
  })

  it('validates required fields for leading and trailing whitespace', async () => {
    const selectedCommittee = ref<ScheduleDraftCommittee | null>(createCommittee())
    const { useEditorStudentCreation } = await import('~/composables/editor/students/useEditorStudentCreation')
    const creation = useEditorStudentCreation(computed(() => selectedCommittee.value))

    creation.openCreateStudentDialog()
    fillMinimalRequiredFields(creation.updateCreateStudentTextField)
    creation.updateCreateStudentTextField('firstName', ' Jan')
    creation.submitCreateStudent()

    expect(creation.createStudentValidationErrors.value.firstName).toBe(
      'editor.students.add.validation.leadingTrailingWhitespace'
    )
    expect(selectedCommittee.value?.items).toHaveLength(3)
  })

  it('creates new student at the end of committee students sequence', async () => {
    const selectedCommittee = ref<ScheduleDraftCommittee | null>(createCommittee())
    const { useEditorStudentCreation } = await import('~/composables/editor/students/useEditorStudentCreation')
    const creation = useEditorStudentCreation(computed(() => selectedCommittee.value))

    creation.openCreateStudentDialog()
    fillMinimalRequiredFields(creation.updateCreateStudentTextField)
    creation.updateCreateStudentTextField('titlesBefore', 'Bc.')
    creation.updateCreateStudentTextField('titlesAfter', 'DiS.')
    creation.updateCreateStudentTextField('email', 'student@fit.cvut.cz')
    creation.updateCreateStudentSpecializationCode('BI-SI.21')
    creation.updateCreateStudentMinutesField('prepareMinutes', '50')
    creation.updateCreateStudentMinutesField('examMinutes', '35')
    creation.submitCreateStudent()

    const committee = selectedCommittee.value
    expect(committee).toBeTruthy()
    if (!committee) {
      throw new Error('Expected committee')
    }

    const createdItem = committee.items.at(-1)
    expect(createdItem).toBeTruthy()
    expect(createdItem?.type).toBe('STUDENT')
    expect(createdItem?.position).toBe(5)
    if (!createdItem || createdItem.type !== 'STUDENT') {
      throw new Error('Expected created student item')
    }

    expect(createdItem.student.firstName).toBe('Jan')
    expect(createdItem.student.lastName).toBe('Novák')
    expect(createdItem.student.email).toBe('student@fit.cvut.cz')
    expect(createdItem.student.specializationCode).toBe('BI-SI.21')
    expect(createdItem.student.specializationName).toBe('Softwarové inženýrství 2021')
    expect(createdItem.student.prepareMinutes).toBe(50)
    expect(createdItem.student.examMinutes).toBe(35)
    expect(creation.isCreateStudentDialogOpen.value).toBe(false)
  })

  it('overwrites minutes when repeatType changes but keeps values for the same repeatType', async () => {
    const selectedCommittee = ref<ScheduleDraftCommittee | null>(createCommittee())
    const { useEditorStudentCreation } = await import('~/composables/editor/students/useEditorStudentCreation')
    const creation = useEditorStudentCreation(computed(() => selectedCommittee.value))

    creation.openCreateStudentDialog()
    creation.updateCreateStudentMinutesField('prepareMinutes', '50')
    creation.updateCreateStudentMinutesField('examMinutes', '35')

    creation.updateCreateStudentRepeatType('NONE')
    expect(creation.createStudentDraft.value?.prepareMinutes).toBe(50)
    expect(creation.createStudentDraft.value?.examMinutes).toBe(35)

    creation.updateCreateStudentRepeatType('THESIS_DEFENSE')
    expect(creation.createStudentDraft.value?.repeatType).toBe('THESIS_DEFENSE')
    expect(creation.createStudentDraft.value?.prepareMinutes).toBe(45)
    expect(creation.createStudentDraft.value?.examMinutes).toBe(15)

    creation.updateCreateStudentMinutesField('prepareMinutes', '44')
    creation.updateCreateStudentMinutesField('examMinutes', '14')
    creation.updateCreateStudentRepeatType('THESIS_DEFENSE')
    expect(creation.createStudentDraft.value?.prepareMinutes).toBe(44)
    expect(creation.createStudentDraft.value?.examMinutes).toBe(14)
  })

  it('overwrites minutes when studyProgramType changes', async () => {
    const selectedCommittee = ref<ScheduleDraftCommittee | null>(createCommittee())
    const { useEditorStudentCreation } = await import('~/composables/editor/students/useEditorStudentCreation')
    const creation = useEditorStudentCreation(computed(() => selectedCommittee.value))

    creation.openCreateStudentDialog()
    creation.updateCreateStudentRepeatType('THESIS_DEFENSE')
    creation.updateCreateStudentMinutesField('prepareMinutes', '51')
    creation.updateCreateStudentMinutesField('examMinutes', '12')

    creation.updateCreateStudentStudyProgramType('MASTER')

    expect(creation.createStudentDraft.value?.studyProgramType).toBe('MASTER')
    expect(creation.createStudentDraft.value?.repeatType).toBe('THESIS_DEFENSE')
    expect(creation.createStudentDraft.value?.prepareMinutes).toBe(45)
    expect(creation.createStudentDraft.value?.examMinutes).toBe(20)
  })

  it('keeps negative minutes during input and relies on validation to block submit', async () => {
    const selectedCommittee = ref<ScheduleDraftCommittee | null>(createCommittee())
    const { useEditorStudentCreation } = await import('~/composables/editor/students/useEditorStudentCreation')
    const creation = useEditorStudentCreation(computed(() => selectedCommittee.value))

    creation.openCreateStudentDialog()
    creation.updateCreateStudentMinutesField('prepareMinutes', '-2')
    creation.updateCreateStudentMinutesField('examMinutes', '-1')

    expect(creation.createStudentDraft.value?.prepareMinutes).toBe(-2)
    expect(creation.createStudentDraft.value?.examMinutes).toBe(-1)
  })

  it('validates prepare/exam minutes and blocks submit when values are invalid', async () => {
    const selectedCommittee = ref<ScheduleDraftCommittee | null>(createCommittee())
    const { useEditorStudentCreation } = await import('~/composables/editor/students/useEditorStudentCreation')
    const creation = useEditorStudentCreation(computed(() => selectedCommittee.value))

    creation.openCreateStudentDialog()
    fillMinimalRequiredFields(creation.updateCreateStudentTextField)
    creation.updateCreateStudentSpecializationCode('BI-SI.21')
    creation.updateCreateStudentMinutesField('examMinutes', '0')
    if (creation.createStudentDraft.value) {
      creation.createStudentDraft.value.prepareMinutes = -1
    }

    creation.submitCreateStudent()

    expect(creation.createStudentValidationErrors.value.prepareMinutes).toBe(
      'editor.students.add.validation.prepareMinutesNegative'
    )
    expect(creation.createStudentValidationErrors.value.examMinutes).toBe(
      'editor.students.add.validation.examMinutesNotPositive'
    )
    expect(selectedCommittee.value?.items).toHaveLength(3)
  })
})
