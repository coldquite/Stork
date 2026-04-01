import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { EffectScope } from 'vue'
import { effectScope, nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScheduleDraftOperationErrorCode } from '~/types/schedule-draft'

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

interface MockScheduleDraftStore {
  lastSavedAt: string | null
  lastSavedType: 'AUTO' | 'MANUAL' | null
  autoSaveErrorCode: ScheduleDraftOperationErrorCode | null
  manualSaveErrorCode: ScheduleDraftOperationErrorCode | null
}

let scheduleDraftStoreMock: MockScheduleDraftStore

vi.mock('~/stores/schedule-draft', () => {
  return {
    useScheduleDraftStore: () => scheduleDraftStoreMock
  }
})

async function flushWatchers(): Promise<void> {
  await nextTick()
  await Promise.resolve()
}

describe('useScheduleAutoSaveToasts', () => {
  let scope: EffectScope

  beforeEach(() => {
    i18nTranslateMock.mockClear()
    toastAddMock.mockReset()

    scheduleDraftStoreMock = reactive({
      lastSavedAt: null,
      lastSavedType: null,
      autoSaveErrorCode: null,
      manualSaveErrorCode: null
    }) as MockScheduleDraftStore

    scope = effectScope()
  })

  afterEach(() => {
    scope.stop()
  })

  it('shows success toast when autosave succeeds', async () => {
    const { useScheduleAutoSaveToasts } = await import('~/composables/useScheduleAutoSaveToasts')
    scope.run(() => {
      useScheduleAutoSaveToasts()
    })

    scheduleDraftStoreMock.lastSavedType = 'AUTO'
    scheduleDraftStoreMock.lastSavedAt = '2026-03-29T11:42:00.000Z'
    await flushWatchers()

    expect(toastAddMock).toHaveBeenCalledTimes(1)
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'editor.autosave.toast.successTitle',
      description: 'editor.autosave.toast.successDescription',
      color: 'success',
      icon: 'i-lucide-cloud-upload',
      duration: 10000
    })
  })

  it('shows success toast when manual save succeeds', async () => {
    const { useScheduleAutoSaveToasts } = await import('~/composables/useScheduleAutoSaveToasts')
    scope.run(() => {
      useScheduleAutoSaveToasts()
    })

    scheduleDraftStoreMock.lastSavedType = 'MANUAL'
    scheduleDraftStoreMock.lastSavedAt = '2026-03-29T11:43:00.000Z'
    await flushWatchers()

    expect(toastAddMock).toHaveBeenCalledTimes(1)
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'editor.schedule.cloudSave.toast.successTitle',
      description: 'editor.schedule.cloudSave.toast.successDescription',
      color: 'success',
      icon: 'i-lucide-cloud-upload',
      duration: 10000
    })
  })

  it('shows request-failed toast when autosave request fails', async () => {
    const { useScheduleAutoSaveToasts } = await import('~/composables/useScheduleAutoSaveToasts')
    scope.run(() => {
      useScheduleAutoSaveToasts()
    })

    scheduleDraftStoreMock.autoSaveErrorCode = 'REQUEST_FAILED'
    await flushWatchers()

    expect(toastAddMock).toHaveBeenCalledTimes(1)
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'editor.autosave.toast.errorTitle',
      description: 'editor.autosave.toast.errorRequestFailedDescription',
      color: 'error',
      icon: 'i-lucide-cloud-alert',
      duration: 10000
    })
  })

  it('shows request-failed toast when manual save request fails', async () => {
    const { useScheduleAutoSaveToasts } = await import('~/composables/useScheduleAutoSaveToasts')
    scope.run(() => {
      useScheduleAutoSaveToasts()
    })

    scheduleDraftStoreMock.manualSaveErrorCode = 'REQUEST_FAILED'
    await flushWatchers()

    expect(toastAddMock).toHaveBeenCalledTimes(1)
    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'editor.schedule.cloudSave.toast.errorTitle',
      description: 'editor.schedule.cloudSave.toast.errorRequestFailedDescription',
      color: 'error',
      icon: 'i-lucide-cloud-alert',
      duration: 10000
    })
  })

  it('does not show toast for null and unchanged values', async () => {
    const { useScheduleAutoSaveToasts } = await import('~/composables/useScheduleAutoSaveToasts')
    scope.run(() => {
      useScheduleAutoSaveToasts()
    })

    scheduleDraftStoreMock.lastSavedAt = null
    scheduleDraftStoreMock.lastSavedType = null
    scheduleDraftStoreMock.autoSaveErrorCode = null
    scheduleDraftStoreMock.manualSaveErrorCode = null
    await flushWatchers()

    expect(toastAddMock).not.toHaveBeenCalled()

    scheduleDraftStoreMock.lastSavedType = 'AUTO'
    scheduleDraftStoreMock.lastSavedAt = '2026-03-29T11:50:00.000Z'
    await flushWatchers()

    expect(toastAddMock).toHaveBeenCalledTimes(1)
    toastAddMock.mockClear()

    scheduleDraftStoreMock.lastSavedAt = '2026-03-29T11:50:00.000Z'
    await flushWatchers()

    expect(toastAddMock).not.toHaveBeenCalled()
  })
})
