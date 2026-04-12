import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'

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
      firstName: 'Jan',
      lastName: 'Novak',
      email: 'student@example.test',
      titlesBefore: null,
      titlesAfter: null,
      thesisTitleLocal: 'Lokální název',
      thesisTitleEn: 'English title',
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

function createPauseItem(
  localId: string,
  position: number,
  options: { label?: string; pauseType?: 'BREAK' | 'LUNCH'; durationMinutes?: number } = {}
): ScheduleDraftItem {
  return {
    localId,
    type: 'PAUSE',
    position,
    student: null,
    pause: {
      label: options.label ?? 'Přestávka',
      pauseType: options.pauseType ?? 'BREAK',
      durationMinutes: options.durationMinutes ?? 20
    }
  }
}

function createCommittee(): ScheduleDraftCommittee {
  return {
    localId: 'committee-1',
    name: '1-BI-SI.21',
    startMinute: 525,
    date: '2026-06-10T00:00:00.000Z',
    room: null,
    secretaryName: null,
    invigilators: [],
    language: 'CZECH',
    studyProgramName: 'Informatika',
    studyProgramType: 'BACHELOR',
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

describe('useEditorPauseCreation', () => {
  beforeEach(() => {
    i18nTranslateMock.mockClear()
  })

  it('opens create dialog with defaults and resets duration by pause type toggle', async () => {
    const selectedCommittee = ref<ScheduleDraftCommittee | null>(createCommittee())
    const { useEditorPauseCreation } = await import('~/composables/editor/dialogs/useEditorPauseCreation')
    const pauseCreation = useEditorPauseCreation(computed(() => selectedCommittee.value))

    pauseCreation.openCreatePauseDialog()

    expect(pauseCreation.isPauseDialogOpen.value).toBe(true)
    expect(pauseCreation.pauseDialogMode.value).toBe('create')
    expect(pauseCreation.pauseDraft.value).toEqual({
      pauseType: 'BREAK',
      durationMinutes: 20,
      useCustomLabel: false,
      customLabel: ''
    })

    pauseCreation.updatePauseDurationMinutes(33)
    expect(pauseCreation.pauseDraft.value?.durationMinutes).toBe(33)

    pauseCreation.updatePauseType('LUNCH')
    expect(pauseCreation.pauseDraft.value?.durationMinutes).toBe(60)

    pauseCreation.updatePauseDurationMinutes(41)
    pauseCreation.updatePauseType('BREAK')
    expect(pauseCreation.pauseDraft.value?.durationMinutes).toBe(20)
  })

  it('creates pause at end, enforces validation rules and persists empty label when custom name is disabled', async () => {
    const selectedCommittee = ref<ScheduleDraftCommittee | null>(createCommittee())
    const { useEditorPauseCreation } = await import('~/composables/editor/dialogs/useEditorPauseCreation')
    const pauseCreation = useEditorPauseCreation(computed(() => selectedCommittee.value))

    pauseCreation.openCreatePauseDialog()
    pauseCreation.updatePauseDurationMinutes(0)
    pauseCreation.submitPauseDialog()
    expect(pauseCreation.pauseValidationErrors.value.durationMinutes).toBe('editor.pause.validation.durationMinutesMin')

    pauseCreation.updatePauseDurationMinutes(25)
    pauseCreation.updatePauseCustomLabelEnabled(true)
    pauseCreation.updatePauseCustomLabel(' ')
    pauseCreation.submitPauseDialog()
    expect(pauseCreation.pauseValidationErrors.value.customLabel).toBe('editor.pause.validation.customLabelRequired')

    pauseCreation.updatePauseCustomLabel(' Vlastní ')
    pauseCreation.submitPauseDialog()
    expect(pauseCreation.pauseValidationErrors.value.customLabel).toBe(
      'editor.pause.validation.customLabelLeadingTrailingWhitespace'
    )

    pauseCreation.updatePauseCustomLabelEnabled(false)
    pauseCreation.updatePauseType('LUNCH')
    pauseCreation.submitPauseDialog()

    const committee = selectedCommittee.value
    expect(committee).toBeTruthy()
    if (!committee) {
      throw new Error('Expected committee to exist')
    }

    const createdItem = committee.items.at(-1)
    expect(createdItem?.type).toBe('PAUSE')
    expect(createdItem?.position).toBe(5)
    if (!createdItem || createdItem.type !== 'PAUSE') {
      throw new Error('Expected created pause item')
    }

    expect(createdItem.pause.label).toBe('')
    expect(createdItem.pause.pauseType).toBe('LUNCH')
    expect(createdItem.pause.durationMinutes).toBe(60)
    expect(pauseCreation.isPauseDialogOpen.value).toBe(false)
  })

  it('opens edit mode from existing pause and clears label when custom name is disabled', async () => {
    const selectedCommittee = ref<ScheduleDraftCommittee | null>(createCommittee())
    const committee = selectedCommittee.value
    if (!committee) {
      throw new Error('Expected committee to exist')
    }

    const pause = committee.items.find((item) => item.localId === 'pause-1')
    if (!pause || pause.type !== 'PAUSE') {
      throw new Error('Expected pause item')
    }
    pause.pause.label = 'Oběd s vedením'

    const { useEditorPauseCreation } = await import('~/composables/editor/dialogs/useEditorPauseCreation')
    const pauseCreation = useEditorPauseCreation(computed(() => selectedCommittee.value))

    pauseCreation.openEditPauseDialog('pause-1')

    expect(pauseCreation.isPauseDialogOpen.value).toBe(true)
    expect(pauseCreation.pauseDialogMode.value).toBe('edit')
    expect(pauseCreation.pauseDraft.value?.useCustomLabel).toBe(true)
    expect(pauseCreation.pauseDraft.value?.customLabel).toBe('Oběd s vedením')

    pauseCreation.updatePauseCustomLabelEnabled(false)
    pauseCreation.updatePauseType('LUNCH')
    pauseCreation.submitPauseDialog()

    const updatedPause = committee.items.find((item) => item.localId === 'pause-1')
    expect(updatedPause?.type).toBe('PAUSE')
    if (!updatedPause || updatedPause.type !== 'PAUSE') {
      throw new Error('Expected updated pause item')
    }

    expect(updatedPause.pause.label).toBe('')
    expect(updatedPause.pause.pauseType).toBe('LUNCH')
    expect(updatedPause.pause.durationMinutes).toBe(60)
    expect(pauseCreation.isPauseDialogOpen.value).toBe(false)
  })
})
