import { createPinia, setActivePinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  PostTimeScheduleRequestDto,
  PostTimeScheduleResponseDto,
  TimeScheduleDto
} from '#shared/types/time-schedules'
import type { ScheduleDraftOperationErrorCode } from '~/types/schedule-draft'
import { useScheduleDraftStore } from '~/stores/schedule-draft'

const { requestFetchMock } = vi.hoisted(() => ({
  requestFetchMock: vi.fn()
}))

mockNuxtImport('useRequestFetch', () => {
  return () => requestFetchMock
})

async function expectRejectsWithCode(promise: Promise<unknown>, code: ScheduleDraftOperationErrorCode): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code })
}

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
        name: `1-NI-SI-${seed}`,
        startMinute: 525,
        date: '2026-06-10T00:00:00.000Z',
        room: 'TH:A-1435',
        secretaryName: 'Sekretář 1',
        invigilators: ['Dozor A'],
        language: 'CZECH',
        studyProgramName: `Study program ${seed}`,
        studyProgramType: 'BACHELOR',
        specializationName: `Specialization ${seed}`,
        specializationCode: `SPEC-${seed}`,
        defenseDepartmentCode: `KAT-${seed}`,
        defenseDepartmentName: `Department ${seed}`,
        chairName: 'Předseda',
        viceChairName: 'Místopředseda',
        member1Name: 'Člen 1',
        member2Name: 'Člen 2',
        member3Name: 'Člen 3',
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
              titlesBefore: 'Bc.',
              titlesAfter: null,
              thesisTitleLocal: `Lokální název ${seed}`,
              thesisTitleEn: `English title ${seed}`,
              thesisLanguage: 'CZECH',
              supervisorName: 'Vedoucí',
              reviewerName: 'Oponent',
              additionalSupervisorName: null,
              additionalReviewerName: null,
              studyProgramName: `Study program ${seed}`,
              studyProgramType: 'BACHELOR',
              specializationName: 'Softwarové inženýrství',
              specializationCode: `SPEC-${seed}`,
              defenseDepartmentCode: `KAT-${seed}`,
              defenseDepartmentName: `Department ${seed}`,
              studyLanguage: 'CZECH',
              thesisSubmissionAt: '2026-06-10T12:15:00.000Z',
              repeatType: 'NONE',
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

  it('resets last saved metadata when replacing draft source', async () => {
    const store = useScheduleDraftStore()
    store.setAutoSavePolicy({ enabled: false })
    store.initializeFromSource(createApiSchedule('D1'))

    requestFetchMock.mockResolvedValueOnce({
      id: 'saved-manual-D1',
      createdAt: '2026-06-11T10:45:00.000Z'
    })

    await store.saveManualDraft('Uložení D1')

    expect(store.lastSavedScheduleId).toBe('saved-manual-D1')
    expect(store.lastSavedAt).toBe('2026-06-11T10:45:00.000Z')
    expect(store.lastSavedType).toBe('MANUAL')

    store.initializeFromSource(createApiSchedule('D2'))

    expect(store.lastSavedScheduleId).toBeNull()
    expect(store.lastSavedAt).toBeNull()
    expect(store.lastSavedType).toBeNull()
  })

  it('clears last saved metadata when clearing draft', async () => {
    const store = useScheduleDraftStore()
    store.setAutoSavePolicy({ enabled: false })
    store.initializeFromSource(createApiSchedule('D3'))

    requestFetchMock.mockResolvedValueOnce({
      id: 'saved-manual-D3',
      createdAt: '2026-06-11T10:50:00.000Z'
    })

    await store.saveManualDraft('Uložení D3')

    expect(store.lastSavedScheduleId).toBe('saved-manual-D3')
    expect(store.lastSavedAt).toBe('2026-06-11T10:50:00.000Z')
    expect(store.lastSavedType).toBe('MANUAL')

    store.clearDraft()

    expect(store.lastSavedScheduleId).toBeNull()
    expect(store.lastSavedAt).toBeNull()
    expect(store.lastSavedType).toBeNull()
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
    expect(payload.name).toMatch(/^Autosave změna \[\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\]$/)
    expect(payload.name.includes('AUTO-')).toBe(false)
    expect(store.isDirty).toBe(false)
    expect(store.lastSavedType).toBe('AUTO')
    expect(store.lastSavedAt).toBe('2026-06-11T11:00:00.000Z')
  })

  it('returns DRAFT_NOT_INITIALIZED code when saving without initialized draft', async () => {
    const store = useScheduleDraftStore()

    await expectRejectsWithCode(store.saveManualDraft(), 'DRAFT_NOT_INITIALIZED')
    expect(store.manualSaveErrorCode).toBe('DRAFT_NOT_INITIALIZED')
    expect(store.isManualSaveLoading).toBe(false)
    expect(requestFetchMock).not.toHaveBeenCalled()
  })

  it('keeps thrown backend error but stores REQUEST_FAILED code for manual save state', async () => {
    const store = useScheduleDraftStore()
    store.initializeFromSource(createApiSchedule('F'))

    requestFetchMock.mockRejectedValueOnce(new Error('Dumb error msg'))

    await expect(store.saveManualDraft()).rejects.toThrow('Dumb error msg')
    expect(store.manualSaveErrorCode).toBe('REQUEST_FAILED')
    expect(store.isManualSaveLoading).toBe(false)
  })

  it('stores REQUEST_FAILED code for non-Error manual save failures', async () => {
    const store = useScheduleDraftStore()
    store.initializeFromSource(createApiSchedule('G'))

    requestFetchMock.mockRejectedValueOnce('network-down')

    await expect(store.saveManualDraft()).rejects.toBe('network-down')
    expect(store.manualSaveErrorCode).toBe('REQUEST_FAILED')
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
    expect(store.autoSaveErrorCode).toBe('REQUEST_FAILED')
    expect(store.nextAutoSaveAt).not.toBeNull()
    expect(store.isDirty).toBe(true)

    await vi.advanceTimersByTimeAsync(220)

    expect(requestFetchMock).toHaveBeenCalledTimes(2)
    expect(store.autoSaveErrorCode).toBeNull()
    expect(store.isDirty).toBe(false)
    expect(store.lastSavedAt).toBe('2026-06-11T12:00:00.000Z')
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

  it('saves manual draft with preserveDraftName and keeps draft name untouched', async () => {
    const store = useScheduleDraftStore()
    store.initializeFromSource(createApiSchedule('I2'))

    if (!store.draft) {
      throw new Error('Expected draft to be initialized')
    }

    store.draft.name = 'Aktuální draft I2'

    requestFetchMock.mockResolvedValueOnce({
      id: 'saved-manual-I2',
      createdAt: '2026-06-11T10:30:00.000Z'
    })

    await expect(store.saveManualDraft('  Název pouze pro cloud  ', true)).resolves.toEqual({
      id: 'saved-manual-I2',
      createdAt: '2026-06-11T10:30:00.000Z'
    })

    expect(requestFetchMock).toHaveBeenCalledTimes(1)
    const manualCloudSaveCall = requestFetchMock.mock.calls.at(0)
    expect(manualCloudSaveCall).toBeDefined()
    if (!manualCloudSaveCall) {
      throw new Error('Expected saveManualDraft call payload')
    }

    const [, requestOptions] = manualCloudSaveCall
    const body = requestOptions?.body as PostTimeScheduleRequestDto
    expect(body.name).toBe('Název pouze pro cloud')
    expect(body.type).toBe('MANUAL')
    expect(store.draft?.name).toBe('Aktuální draft I2')
    expect(store.lastSavedType).toBe('MANUAL')
    expect(store.lastSavedAt).toBe('2026-06-11T10:30:00.000Z')
    expect(store.isDirty).toBe(false)
  })

  it('stores manual save error code in preserveDraftName mode', async () => {
    const store = useScheduleDraftStore()
    store.initializeFromSource(createApiSchedule('I3'))

    requestFetchMock.mockRejectedValueOnce(new Error('Cloud save failed'))

    await expect(store.saveManualDraft('Cloud fail', true)).rejects.toThrow('Cloud save failed')

    expect(store.manualSaveErrorCode).toBe('REQUEST_FAILED')
    expect(store.autoSaveErrorCode).toBeNull()
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
    expect(store.lastSavedAt).toBe('2026-06-11T10:00:00.000Z')

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
    expect(store.manualSaveErrorCode).toBeNull()
    expect(store.isManualSaveLoading).toBe(false)
    expect(store.lastSavedScheduleId).toBeNull()
    expect(store.lastSavedAt).toBeNull()
    expect(store.lastSavedType).toBeNull()
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
    expect(store.draft?.committees[0]?.name).toBe('1-NI-SI-M2')
    expect(store.isDirty).toBe(false)
    expect(store.lastSavedScheduleId).toBeNull()
    expect(store.lastSavedAt).toBeNull()
    expect(store.lastSavedType).toBeNull()
  })
})
