import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { i18nTranslateMock, toastAddMock } = vi.hoisted(() => ({
  i18nTranslateMock: vi.fn((key: string) => key),
  toastAddMock: vi.fn()
}))

mockNuxtImport('useI18n', () => {
  return () => ({
    t: i18nTranslateMock
  })
})

mockNuxtImport('useToast', () => {
  return () => ({
    add: toastAddMock
  })
})

describe('useDeletionToasts', () => {
  beforeEach(() => {
    i18nTranslateMock.mockClear()
    toastAddMock.mockReset()
  })

  it('shows success toast for manual schedule deletion', async () => {
    const { useDeletionToasts } = await import('~/composables/notifications/useDeletionToasts')
    const deletionToasts = useDeletionToasts()

    deletionToasts.showManualScheduleDeleted('SZZ Plan A')

    expect(toastAddMock).toHaveBeenCalledTimes(1)
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'homepage.schedulesModal.delete.toast.successTitle',
      description: 'homepage.schedulesModal.delete.toast.successDescription',
      color: 'success',
      icon: 'i-lucide-trash-2',
      duration: 10000
    })
  })

  it('shows success toast for teachers dictionary deletion', async () => {
    const { useDeletionToasts } = await import('~/composables/notifications/useDeletionToasts')
    const deletionToasts = useDeletionToasts()

    deletionToasts.showTeachersDictionaryEntryDeleted('Ing. Jan Novák')

    expect(toastAddMock).toHaveBeenCalledTimes(1)
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'teachersDictionary.table.delete.toast.successTitle',
      description: 'teachersDictionary.table.delete.toast.successDescription',
      color: 'success',
      icon: 'i-lucide-trash-2',
      duration: 10000
    })
  })

  it('shows success toast for committee deletion', async () => {
    const { useDeletionToasts } = await import('~/composables/notifications/useDeletionToasts')
    const deletionToasts = useDeletionToasts()

    deletionToasts.showCommitteeDeleted('1-BI-SI.21')

    expect(toastAddMock).toHaveBeenCalledTimes(1)
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'editor.committees.delete.toast.successTitle',
      description: 'editor.committees.delete.toast.successDescription',
      color: 'success',
      icon: 'i-lucide-trash-2',
      duration: 10000
    })
  })

  it('shows success toast for student and pause deletion', async () => {
    const { useDeletionToasts } = await import('~/composables/notifications/useDeletionToasts')
    const deletionToasts = useDeletionToasts()

    deletionToasts.showCommitteeItemDeleted('STUDENT', 'Jan Novák')
    deletionToasts.showCommitteeItemDeleted('PAUSE', 'Oběd')

    expect(toastAddMock).toHaveBeenCalledTimes(2)
    expect(toastAddMock).toHaveBeenNthCalledWith(1, {
      title: 'editor.items.delete.toast.successTitle',
      description: 'editor.items.delete.toast.studentSuccessDescription',
      color: 'success',
      icon: 'i-lucide-trash-2',
      duration: 10000
    })
    expect(toastAddMock).toHaveBeenNthCalledWith(2, {
      title: 'editor.items.delete.toast.successTitle',
      description: 'editor.items.delete.toast.pauseSuccessDescription',
      color: 'success',
      icon: 'i-lucide-trash-2',
      duration: 10000
    })
  })
})
