import { createPinia, setActivePinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  PostTimeScheduleRequestDto,
  PostTimeScheduleResponseDto,
  TimeScheduleDto
} from '#shared/types/time-schedules'
import { useScheduleDraftStore } from '~/stores/schedule-draft'

const { requestFetchMock, i18nTranslateMock } = vi.hoisted(() => ({
  requestFetchMock: vi.fn(),
  i18nTranslateMock: vi.fn((key: string) => {
    if (key === 'common.errors.unexpected') {
      return 'Došlo k neočekávané chybě.'
    }

    if (key === 'common.errors.draftNotInitialized') {
      return 'Koncept harmonogramu není inicializovaný.'
    }

    return key
  })
}))

mockNuxtImport('useRequestFetch', () => {
  return () => requestFetchMock
})

mockNuxtImport('useNuxtApp', () => {
  return () => ({
    $i18n: {
      t: i18nTranslateMock
    }
  })
})

function createApiSchedule(seed = 'A'): TimeScheduleDto {
  return {
    id: `schedule-${seed}`,
    name: `Plán ${seed}`,
    type: 'MANUAL',
    createdAt: '2026-06-10T08:00:00.000Z',
    committees: [
      {
        id: `committee-${seed}`,
        timeScheduleId: `schedule-${seed}`,
        code: `1-NI-SI-${seed}`,
        sortOrder: 1,
        startMinute: 525,
        date: '2026-06-10T00:00:00.000Z',
        room: 'TH:A-1435',
        secretaryName: 'Sekretář 1',
        invigilators: ['Dozor A'],
        items: [
          {
            id: `item-student-${seed}`,
            committeeId: `committee-${seed}`,
            type: 'STUDENT',
            position: 0,
            student: {
              itemId: `student-${seed}`,
              personalNumber: `A123${seed}`,
              firstName: 'Jan',
              lastName: 'Novák',
              email: `jan.${seed}@example.test`,
              mobilePhone: '+420777123456',
              titlesBefore: 'Bc.',
              titlesAfter: null,
              specialization: 'Softwarové inženýrství',
              thesisTitleLocal: `Lokální název ${seed}`,
              thesisTitleEn: `English title ${seed}`,
              thesisLanguage: 'CZECH',
              supervisorName: 'Vedoucí',
              reviewerName: 'Oponent',
              repeatType: 'NONE',
              elsa: false,
              prepareMinutes: 45,
              examMinutes: 30
            },
            pause: null
          },
          {
            id: `item-pause-${seed}`,
            committeeId: `committee-${seed}`,
            type: 'PAUSE',
            position: 1,
            student: null,
            pause: {
              itemId: `pause-${seed}`,
              label: 'Přestávka',
              durationMinutes: 20
            }
          }
        ]
      }
    ]
  }
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

describe('useScheduleDraftStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    requestFetchMock.mockReset()
    i18nTranslateMock.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes draft from API schedule and keeps clean state', () => {
    const store = useScheduleDraftStore()

    store.initializeFromSource(createApiSchedule('B'))

    expect(store.hasDraft).toBe(true)
    expect(store.isDirty).toBe(false)
    expect(store.draft?.committees).toHaveLength(1)
    expect(store.draft?.committees[0]?.items).toHaveLength(2)
    expect(store.draft?.committees[0]?.items[0]?.student).not.toHaveProperty('itemId')
    expect(store.draft?.committees[0]?.items[1]?.pause).not.toHaveProperty('itemId')
  })

  it('marks draft as dirty after local mutation', async () => {
    const store = useScheduleDraftStore()
    store.setAutoSavePolicy({ enabled: false })
    store.initializeFromSource(createApiSchedule('C'))

    if (!store.draft) {
      throw new Error('Expected draft to be initialized')
    }

    store.draft.name = 'Změněný název'
    await nextTick()

    expect(store.isDirty).toBe(true)
  })

  it('saves manual draft using POST /api/time-schedules with MANUAL type', async () => {
    const store = useScheduleDraftStore()
    store.setAutoSavePolicy({ enabled: false })
    store.initializeFromSource(createApiSchedule('D'))

    requestFetchMock.mockImplementationOnce(async () => {
      return {
        id: 'saved-manual-1',
        createdAt: '2026-06-11T10:30:00.000Z'
      }
    })

    if (!store.draft) {
      throw new Error('Expected draft to be initialized')
    }

    store.draft.name = 'Ruční uložení'
    await nextTick()
    expect(store.isDirty).toBe(true)

    await store.saveManualDraft()

    expect(requestFetchMock).toHaveBeenCalledTimes(1)
    const manualSaveCall = requestFetchMock.mock.calls.at(0)
    expect(manualSaveCall).toBeDefined()

    if (!manualSaveCall) {
      throw new Error('Expected manual save call to be captured')
    }

    const [requestUrl, requestOptions] = manualSaveCall
    expect(requestOptions).toBeDefined()

    if (!requestOptions) {
      throw new Error('Expected request options in manual save call')
    }

    const payload = requestOptions.body as PostTimeScheduleRequestDto

    expect(requestUrl).toBe('/api/time-schedules')
    expect(requestOptions.method).toBe('POST')
    expect(payload.type).toBe('MANUAL')
    expect(payload.name).toBe('Ruční uložení')
    expect(payload.committees[0]?.items[0]?.student).not.toHaveProperty('itemId')
    expect(payload.committees[0]?.items[1]?.pause).not.toHaveProperty('itemId')

    expect(store.isDirty).toBe(false)
    expect(store.lastSavedScheduleId).toBe('saved-manual-1')
    expect(store.lastSavedType).toBe('MANUAL')
  })

  it('runs autosave with AUTO type based on policy debounce', async () => {
    vi.useFakeTimers()

    const store = useScheduleDraftStore()
    store.setAutoSavePolicy({
      enabled: true,
      debounceMs: 100,
      minIntervalMs: 0,
      retryAfterErrorMs: 200
    })
    store.initializeFromSource(createApiSchedule('E'))

    requestFetchMock.mockImplementationOnce(async () => {
      return {
        id: 'saved-auto-1',
        createdAt: '2026-06-11T11:00:00.000Z'
      }
    })

    if (!store.draft) {
      throw new Error('Expected draft to be initialized')
    }

    store.draft.name = 'Autosave změna'
    await nextTick()

    expect(store.isDirty).toBe(true)
    expect(store.nextAutoSaveAt).not.toBeNull()

    await vi.advanceTimersByTimeAsync(120)

    expect(requestFetchMock).toHaveBeenCalledTimes(1)
    const autoSaveCall = requestFetchMock.mock.calls.at(0)
    expect(autoSaveCall).toBeDefined()

    if (!autoSaveCall) {
      throw new Error('Expected autosave call to be captured')
    }

    const [, requestOptions] = autoSaveCall
    expect(requestOptions).toBeDefined()

    if (!requestOptions) {
      throw new Error('Expected request options in autosave call')
    }

    const payload = requestOptions.body as { type: string; name: string }

    expect(payload.type).toBe('AUTO')
    expect(payload.name.startsWith('AUTO-')).toBe(true)
    expect(store.isDirty).toBe(false)
    expect(store.lastSavedType).toBe('AUTO')
    expect(store.lastAutoSaveAt).toBe('2026-06-11T11:00:00.000Z')
  })

  it('returns localized error when saving without initialized draft', async () => {
    const store = useScheduleDraftStore()

    await expect(store.saveManualDraft()).rejects.toThrow('Koncept harmonogramu není inicializovaný.')
    expect(store.manualSaveError).toBe('Koncept harmonogramu není inicializovaný.')
    expect(store.isManualSaveLoading).toBe(false)
    expect(requestFetchMock).not.toHaveBeenCalled()
  })

  it('keeps explicit backend message for manual save errors', async () => {
    const store = useScheduleDraftStore()
    store.initializeFromSource(createApiSchedule('F'))

    requestFetchMock.mockRejectedValueOnce(new Error('Dumb error msg'))

    await expect(store.saveManualDraft()).rejects.toThrow('Dumb error msg')
    expect(store.manualSaveError).toBe('Dumb error msg')
    expect(store.isManualSaveLoading).toBe(false)
  })

  it('uses localized fallback for non-Error manual save failures', async () => {
    const store = useScheduleDraftStore()
    store.initializeFromSource(createApiSchedule('G'))

    requestFetchMock.mockRejectedValueOnce('network-down')

    await expect(store.saveManualDraft()).rejects.toBe('network-down')
    expect(store.manualSaveError).toBe('Došlo k neočekávané chybě.')
    expect(store.isManualSaveLoading).toBe(false)
  })

  it('schedules autosave retry and recovers after transient autosave error', async () => {
    vi.useFakeTimers()

    const store = useScheduleDraftStore()
    store.setAutoSavePolicy({
      enabled: true,
      debounceMs: 50,
      minIntervalMs: 0,
      retryAfterErrorMs: 200
    })
    store.initializeFromSource(createApiSchedule('H'))

    requestFetchMock.mockRejectedValueOnce(new Error('Autosave failed')).mockResolvedValueOnce({
      id: 'saved-auto-retry',
      createdAt: '2026-06-11T12:00:00.000Z'
    })

    if (!store.draft) {
      throw new Error('Expected draft to be initialized')
    }

    store.draft.name = 'Autosave retry'
    await nextTick()

    await vi.advanceTimersByTimeAsync(60)

    expect(requestFetchMock).toHaveBeenCalledTimes(1)
    expect(store.autoSaveError).toBe('Autosave failed')
    expect(store.nextAutoSaveAt).not.toBeNull()
    expect(store.isDirty).toBe(true)

    await vi.advanceTimersByTimeAsync(220)

    expect(requestFetchMock).toHaveBeenCalledTimes(2)
    expect(store.autoSaveError).toBeNull()
    expect(store.isDirty).toBe(false)
    expect(store.lastAutoSaveAt).toBe('2026-06-11T12:00:00.000Z')
  })

  it('resets isDraftLoading when load by id fails', async () => {
    const store = useScheduleDraftStore()
    requestFetchMock.mockRejectedValueOnce(new Error('Load failed'))

    const loadPromise = store.loadDraftByScheduleId('schedule-missing')

    expect(store.isDraftLoading).toBe(true)
    await expect(loadPromise).rejects.toThrow('Load failed')
    expect(store.isDraftLoading).toBe(false)
  })

  it('returns null from forceAutoSave when draft is missing', async () => {
    const store = useScheduleDraftStore()

    await expect(store.forceAutoSave()).resolves.toBeNull()
    expect(requestFetchMock).not.toHaveBeenCalled()
  })

  it('returns null from forceAutoSave when draft is clean', async () => {
    const store = useScheduleDraftStore()
    store.initializeFromSource(createApiSchedule('I'))

    await expect(store.forceAutoSave()).resolves.toBeNull()
    expect(requestFetchMock).not.toHaveBeenCalled()
  })

  it('clears pending autosave timer when autosave gets disabled', async () => {
    vi.useFakeTimers()

    const store = useScheduleDraftStore()
    store.setAutoSavePolicy({
      enabled: true,
      debounceMs: 100,
      minIntervalMs: 0,
      retryAfterErrorMs: 200
    })
    store.initializeFromSource(createApiSchedule('J'))

    if (!store.draft) {
      throw new Error('Expected draft to be initialized')
    }

    store.draft.name = 'Pending autosave'
    await nextTick()

    expect(store.nextAutoSaveAt).not.toBeNull()

    store.setAutoSavePolicy({ enabled: false })
    expect(store.nextAutoSaveAt).toBeNull()

    await vi.advanceTimersByTimeAsync(150)
    expect(requestFetchMock).not.toHaveBeenCalled()
  })

  it('respects minInterval between autosaves', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-11T10:00:00.000Z'))

    const store = useScheduleDraftStore()
    store.setAutoSavePolicy({
      enabled: true,
      debounceMs: 0,
      minIntervalMs: 1_000,
      retryAfterErrorMs: 200
    })
    store.initializeFromSource(createApiSchedule('K'))

    requestFetchMock.mockResolvedValueOnce({
      id: 'saved-auto-min-1',
      createdAt: '2026-06-11T10:00:00.000Z'
    })

    if (!store.draft) {
      throw new Error('Expected draft to be initialized')
    }

    store.draft.name = 'Autosave min 1'
    await nextTick()
    await vi.advanceTimersByTimeAsync(0)

    expect(requestFetchMock).toHaveBeenCalledTimes(1)
    expect(store.lastAutoSaveAt).toBe('2026-06-11T10:00:00.000Z')

    requestFetchMock.mockResolvedValueOnce({
      id: 'saved-auto-min-2',
      createdAt: '2026-06-11T10:00:01.100Z'
    })

    store.draft.name = 'Autosave min 2'
    await nextTick()

    await expect(store.forceAutoSave()).resolves.toBeNull()
    expect(requestFetchMock).toHaveBeenCalledTimes(1)
    expect(store.nextAutoSaveAt).not.toBeNull()

    await vi.advanceTimersByTimeAsync(999)
    expect(requestFetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(2)
    expect(requestFetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps store consistent if draft is cleared during pending manual save', async () => {
    const store = useScheduleDraftStore()
    store.initializeFromSource(createApiSchedule('L'))

    const deferred = createDeferred<PostTimeScheduleResponseDto>()
    requestFetchMock.mockImplementationOnce(() => deferred.promise)

    const savePromise = store.saveManualDraft('Uložení L')

    expect(store.isManualSaveLoading).toBe(true)
    store.clearDraft()
    expect(store.draft).toBeNull()

    deferred.resolve({
      id: 'saved-manual-L',
      createdAt: '2026-06-11T13:00:00.000Z'
    })

    await expect(savePromise).resolves.toEqual({
      id: 'saved-manual-L',
      createdAt: '2026-06-11T13:00:00.000Z'
    })

    expect(store.draft).toBeNull()
    expect(store.manualSaveError).toBeNull()
    expect(store.isManualSaveLoading).toBe(false)
    expect(store.lastSavedScheduleId).toBeNull()
  })

  it('ignores stale manual save response after switching to another source', async () => {
    const store = useScheduleDraftStore()
    store.initializeFromSource(createApiSchedule('M1'))

    const deferred = createDeferred<PostTimeScheduleResponseDto>()
    requestFetchMock.mockImplementationOnce(() => deferred.promise)

    const savePromise = store.saveManualDraft('Uložený M1')

    store.initializeFromSource(createApiSchedule('M2'))
    expect(store.draft?.name).toBe('Plán M2')

    deferred.resolve({
      id: 'saved-manual-M1',
      createdAt: '2026-06-11T14:00:00.000Z'
    })

    await expect(savePromise).resolves.toEqual({
      id: 'saved-manual-M1',
      createdAt: '2026-06-11T14:00:00.000Z'
    })

    expect(store.draft?.name).toBe('Plán M2')
    expect(store.draft?.committees[0]?.code).toBe('1-NI-SI-M2')
    expect(store.isDirty).toBe(false)
    expect(store.lastSavedScheduleId).toBeNull()
  })
})
