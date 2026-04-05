/**
 * Schedule Draft Store
 *
 * This store is the single source of truth for the editable schedule draft in the UI.
 * It is responsible for three main areas:
 *
 * 1) Draft data model for editing
 * - Holds a frontend-friendly draft shape with stable local IDs for committees and items, so the UI can safely reorder
 *   and mutate rows => https://vuejs.org/guide/essentials/list.html#maintaining-state-with-key
 * - Converts incoming sources (import payloads or loaded schedules) into draft representation
 *
 * 2) Save state and dirty tracking
 * - Tracks whether the draft has unsaved changes by comparing current draft content with the last saved snapshot
 *
 * 3) Autosave lifecycle
 * - Schedules debounced autosave for dirty drafts
 * - Applies min interval protection between autosaves
 * - Retries autosave after failures based on policy settings
 * - Ignores stale save responses if the draft changed while a request was in flight
 */

import { addMilliseconds, differenceInMilliseconds, format, isValid, parseISO } from 'date-fns'
import type {
  PostCommitteeDto,
  PostCommitteeItemDto,
  PostPauseItemDto,
  PostStudentItemDto,
  PauseItemDto,
  StudentItemDto,
  PostTimeScheduleRequestDto,
  PostTimeScheduleResponseDto,
  TimeScheduleDto,
  TimeScheduleTypeDto
} from '#shared/types/time-schedules'
import type {
  DraftCommitteeSource,
  DraftItemSource,
  DraftScheduleSource,
  ScheduleAutoSavePolicy,
  ScheduleDraftOperationErrorCode,
  ScheduleDraft,
  ScheduleDraftCommittee,
  ScheduleDraftInvigilator,
  ScheduleDraftItem
} from '~/types/schedule-draft'
import { DEFAULT_NEW_SCHEDULE_NAME_PREFIX, DEFAULT_SCHEDULE_AUTOSAVE_POLICY } from '~/constants/schedule-draft'
import { createLocalId } from '~/utils/id'

function deepClone<T>(value: T): T {
  return structuredClone(toRaw(value))
}

function normalizedName(name: string | null | undefined, fallback = ''): string {
  if (name === null || name === undefined) {
    return fallback
  }

  const normalized = name.trim()
  return normalized.length > 0 ? normalized : fallback
}

function createAutoScheduleName(draftName: string, now: Date = new Date()): string {
  const baseName = normalizedName(draftName, createDefaultNewScheduleName(now))
  const readableTimestamp = format(now, 'dd.MM.yyyy HH:mm')
  return `${baseName} [${readableTimestamp}]`
}

function createDefaultNewScheduleName(now: Date = new Date()): string {
  return `${DEFAULT_NEW_SCHEDULE_NAME_PREFIX}${now.toISOString()}`
}

function invigilatorsFromApiStrings(names: string[]): ScheduleDraftInvigilator[] {
  return names.map((name) => ({
    localId: createLocalId(),
    name
  }))
}

function toDraftItem(item: DraftItemSource): ScheduleDraftItem {
  if (item.type === 'STUDENT') {
    return {
      localId: createLocalId(),
      type: 'STUDENT',
      position: item.position,
      student: toPostStudentItem(item.student),
      pause: null
    }
  }

  return {
    localId: createLocalId(),
    type: 'PAUSE',
    position: item.position,
    student: null,
    pause: toPostPauseItem(item.pause)
  }
}

function toDraftCommittee(committee: DraftCommitteeSource): ScheduleDraftCommittee {
  return {
    localId: createLocalId(),
    name: committee.name,
    startMinute: committee.startMinute,
    date: committee.date,
    room: committee.room,
    secretaryName: committee.secretaryName,
    invigilators: invigilatorsFromApiStrings(committee.invigilators),
    language: committee.language,
    studyProgramName: committee.studyProgramName,
    studyProgramType: committee.studyProgramType,
    specializationName: committee.specializationName,
    specializationCode: committee.specializationCode,
    defenseDepartmentCode: committee.defenseDepartmentCode,
    defenseDepartmentName: committee.defenseDepartmentName,
    chairName: committee.chairName,
    viceChairName: committee.viceChairName,
    member1Name: committee.member1Name,
    member2Name: committee.member2Name,
    member3Name: committee.member3Name,
    items: committee.items
      .slice()
      .sort((left, right) => left.position - right.position)
      .map((item) => toDraftItem(item))
  }
}

function toDraftFromSource(source: DraftScheduleSource): ScheduleDraft {
  const fallbackName = createDefaultNewScheduleName()

  return {
    name: normalizedName(source.name, fallbackName),
    type: source.type,
    committees: source.committees.map((committee) => toDraftCommittee(committee))
  }
}

function serializeDraft(draft: ScheduleDraft | null): string | null {
  if (!draft) {
    return null
  }

  return JSON.stringify(draft)
}

function toPostStudentItem(student: StudentItemDto | PostStudentItemDto): PostStudentItemDto {
  const clonedStudent = deepClone(student) as PostStudentItemDto & { itemId?: string }
  const { itemId: _itemId, ...postStudent } = clonedStudent
  return postStudent
}

function toPostPauseItem(pause: PauseItemDto | PostPauseItemDto): PostPauseItemDto {
  const clonedPause = deepClone(pause) as PostPauseItemDto & { itemId?: string }
  const { itemId: _itemId, ...postPause } = clonedPause
  return postPause
}

function toPostCommitteeItem(item: ScheduleDraftItem): PostCommitteeItemDto {
  if (item.type === 'STUDENT') {
    return {
      type: 'STUDENT',
      position: item.position,
      student: toPostStudentItem(item.student),
      pause: null
    }
  }

  return {
    type: 'PAUSE',
    position: item.position,
    student: null,
    pause: toPostPauseItem(item.pause)
  }
}

function toPostCommittee(committee: ScheduleDraftCommittee): PostCommitteeDto {
  return {
    name: committee.name,
    startMinute: committee.startMinute,
    date: committee.date,
    room: committee.room,
    secretaryName: committee.secretaryName,
    invigilators: committee.invigilators.map((invigilator) => invigilator.name),
    language: committee.language,
    studyProgramName: committee.studyProgramName,
    studyProgramType: committee.studyProgramType,
    specializationName: committee.specializationName,
    specializationCode: committee.specializationCode,
    defenseDepartmentCode: committee.defenseDepartmentCode,
    defenseDepartmentName: committee.defenseDepartmentName,
    chairName: committee.chairName,
    viceChairName: committee.viceChairName,
    member1Name: committee.member1Name,
    member2Name: committee.member2Name,
    member3Name: committee.member3Name,
    items: committee.items
      .slice()
      .sort((left, right) => left.position - right.position)
      .map((item) => toPostCommitteeItem(item))
  }
}

function toPostPayload(
  draft: ScheduleDraft,
  scheduleType: TimeScheduleTypeDto,
  explicitName?: string | null
): PostTimeScheduleRequestDto {
  const payload = deepClone(draft)
  const targetName = explicitName !== undefined ? explicitName : payload.name

  return {
    ...payload,
    name: normalizedName(targetName, ''),
    type: scheduleType,
    committees: payload.committees.map((committee) => toPostCommittee(committee))
  }
}

class ScheduleDraftOperationError extends Error {
  readonly code: ScheduleDraftOperationErrorCode

  constructor(code: ScheduleDraftOperationErrorCode, options?: ErrorOptions) {
    super(code, options)
    this.name = 'ScheduleDraftOperationError'
    this.code = code
  }
}

function createScheduleDraftOperationError(code: ScheduleDraftOperationErrorCode, cause?: unknown): Error {
  if (cause === undefined) {
    return new ScheduleDraftOperationError(code)
  }

  return new ScheduleDraftOperationError(code, { cause })
}

function resolveScheduleDraftErrorCode(
  error: unknown,
  fallbackCode: ScheduleDraftOperationErrorCode
): ScheduleDraftOperationErrorCode {
  if (error instanceof ScheduleDraftOperationError) {
    return error.code
  }

  return fallbackCode
}

export const useScheduleDraftStore = defineStore(
  'schedule-draft',
  () => {
    const draft = ref<ScheduleDraft | null>(null)
    const baseSnapshot = ref<string | null>(null)

    const isDraftLoading = ref(false)
    const isManualSaveLoading = ref(false)
    const isAutoSaveRunning = ref(false)

    // Store keeps stable error codes only, UI/composables are responsible for localization.
    const manualSaveErrorCode = ref<ScheduleDraftOperationErrorCode | null>(null)
    const autoSaveErrorCode = ref<ScheduleDraftOperationErrorCode | null>(null)

    const lastSavedScheduleId = ref<string | null>(null)
    const lastSavedAt = ref<string | null>(null)
    const lastSavedType = ref<TimeScheduleTypeDto | null>(null)
    const nextAutoSaveAt = ref<string | null>(null)

    const autoSavePolicy = ref<ScheduleAutoSavePolicy>({ ...DEFAULT_SCHEDULE_AUTOSAVE_POLICY })
    let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

    const hasDraft = computed(() => draft.value !== null)
    const isDirty = computed(() => {
      if (!draft.value) {
        return false
      }

      if (baseSnapshot.value === null) {
        return true
      }

      return serializeDraft(draft.value) !== baseSnapshot.value
    })

    function syncBaseSnapshot(): void {
      baseSnapshot.value = serializeDraft(draft.value)
    }

    function clearAutoSaveTimer(): void {
      if (autoSaveTimer !== null) {
        clearTimeout(autoSaveTimer)
        autoSaveTimer = null
      }

      nextAutoSaveAt.value = null
    }

    function clearLastSavedMetadata(): void {
      lastSavedScheduleId.value = null
      lastSavedAt.value = null
      lastSavedType.value = null
    }

    /** Persists the current draft via POST /api/time-schedules
     *
     * To avoid applying outdated save results, it remembers draft state before
     * the request and checks it again after await:
     * - if draft changed while waiting, this response is treated as stale
     * - for AUTO save, autosave is scheduled again when draft is still dirty
     */
    async function persistDraft(
      targetType: TimeScheduleTypeDto,
      explicitName?: string | null,
      options: { syncManualDraftName?: boolean } = {}
    ): Promise<PostTimeScheduleResponseDto> {
      if (!draft.value) {
        throw createScheduleDraftOperationError('DRAFT_NOT_INITIALIZED')
      }

      const draftSnapshotBeforeRequest = serializeDraft(draft.value)
      const requestFetch = useRequestFetch()
      const payload = toPostPayload(draft.value, targetType, explicitName)
      const response = await requestFetch<PostTimeScheduleResponseDto>('/api/time-schedules', {
        method: 'POST',
        body: payload
      })

      const currentDraftSnapshot = serializeDraft(draft.value)
      if (currentDraftSnapshot !== draftSnapshotBeforeRequest) {
        if (targetType === 'AUTO' && isDirty.value) {
          scheduleAutoSave(autoSavePolicy.value.debounceMs)
        }

        return response
      }

      if (targetType === 'MANUAL') {
        const shouldSyncManualDraftName = options.syncManualDraftName ?? true

        if (shouldSyncManualDraftName) {
          draft.value.name = payload.name
        }

        draft.value.type = 'MANUAL'
      }

      syncBaseSnapshot()

      lastSavedScheduleId.value = response.id
      lastSavedAt.value = response.createdAt
      lastSavedType.value = targetType

      return response
    }

    function replaceDraft(nextDraft: ScheduleDraft): void {
      draft.value = deepClone(nextDraft)
      manualSaveErrorCode.value = null
      autoSaveErrorCode.value = null
      clearLastSavedMetadata()
      syncBaseSnapshot()
      clearAutoSaveTimer()
    }

    function clearDraft(): void {
      draft.value = null
      baseSnapshot.value = null
      manualSaveErrorCode.value = null
      autoSaveErrorCode.value = null
      clearLastSavedMetadata()
      clearAutoSaveTimer()
    }

    function setAutoSavePolicy(nextPolicy: Partial<ScheduleAutoSavePolicy>): void {
      autoSavePolicy.value = { ...autoSavePolicy.value, ...nextPolicy }

      if (!autoSavePolicy.value.enabled || !isDirty.value) {
        clearAutoSaveTimer()
        return
      }

      scheduleAutoSave(autoSavePolicy.value.debounceMs)
    }

    function scheduleAutoSave(delayMs: number): void {
      if (import.meta.server || !autoSavePolicy.value.enabled || !draft.value || !isDirty.value) {
        clearAutoSaveTimer()
        return
      }

      clearAutoSaveTimer()
      const delay = Math.max(0, delayMs)
      nextAutoSaveAt.value = addMilliseconds(new Date(), delay).toISOString()

      autoSaveTimer = setTimeout(() => {
        void runAutoSave()
      }, delay)
    }

    async function runAutoSave(): Promise<PostTimeScheduleResponseDto | null> {
      clearAutoSaveTimer()

      if (import.meta.server || !autoSavePolicy.value.enabled || !draft.value || !isDirty.value) {
        return null
      }

      if (isAutoSaveRunning.value) {
        return null
      }

      if (lastSavedAt.value) {
        const lastAutoSaveDate = parseISO(lastSavedAt.value)

        if (isValid(lastAutoSaveDate)) {
          const elapsedMs = differenceInMilliseconds(new Date(), lastAutoSaveDate)
          const remainingMs = autoSavePolicy.value.minIntervalMs - elapsedMs

          if (remainingMs > 0) {
            scheduleAutoSave(remainingMs)
            return null
          }
        }
      }

      isAutoSaveRunning.value = true
      autoSaveErrorCode.value = null

      try {
        return await persistDraft('AUTO', createAutoScheduleName(draft.value.name))
      } catch (error: unknown) {
        autoSaveErrorCode.value = resolveScheduleDraftErrorCode(error, 'REQUEST_FAILED')
        scheduleAutoSave(autoSavePolicy.value.retryAfterErrorMs)
        return null
      } finally {
        isAutoSaveRunning.value = false
      }
    }

    function initializeNewDraft(initialDraft?: Partial<ScheduleDraft>): void {
      replaceDraft({
        name: normalizedName(initialDraft?.name, createDefaultNewScheduleName()),
        type: 'MANUAL',
        committees: deepClone(initialDraft?.committees ?? [])
      })
    }

    function initializeFromSource(source: DraftScheduleSource): void {
      replaceDraft(toDraftFromSource(source))
    }

    async function loadDraftByScheduleId(scheduleId: string): Promise<TimeScheduleDto> {
      isDraftLoading.value = true

      try {
        const requestFetch = useRequestFetch()
        const schedule = await requestFetch<TimeScheduleDto>(`/api/time-schedules/${scheduleId}`)
        initializeFromSource(schedule)
        return schedule
      } finally {
        isDraftLoading.value = false
      }
    }

    async function saveManualDraft(
      name?: string | null,
      preserveDraftName = false
    ): Promise<PostTimeScheduleResponseDto> {
      isManualSaveLoading.value = true
      manualSaveErrorCode.value = null

      try {
        return await persistDraft('MANUAL', name, {
          syncManualDraftName: !preserveDraftName
        })
      } catch (error: unknown) {
        const resolvedErrorCode = resolveScheduleDraftErrorCode(error, 'REQUEST_FAILED')
        manualSaveErrorCode.value = resolvedErrorCode

        throw error
      } finally {
        isManualSaveLoading.value = false
      }
    }

    async function forceAutoSave(): Promise<PostTimeScheduleResponseDto | null> {
      return runAutoSave()
    }

    watch(
      draft,
      () => {
        if (!isDirty.value) {
          clearAutoSaveTimer()
          return
        }

        scheduleAutoSave(autoSavePolicy.value.debounceMs)
      },
      { deep: true }
    )

    return {
      draft,
      // Exposed only for persisted-state plugin to restore clean/dirty baseline.
      baseSnapshot,
      hasDraft,
      isDirty,
      isDraftLoading,
      isManualSaveLoading,
      isAutoSaveRunning,
      manualSaveErrorCode,
      autoSaveErrorCode,
      lastSavedScheduleId,
      lastSavedAt,
      lastSavedType,
      nextAutoSaveAt,
      autoSavePolicy,
      initializeNewDraft,
      initializeFromSource,
      loadDraftByScheduleId,
      saveManualDraft,
      forceAutoSave,
      setAutoSavePolicy,
      clearDraft
    }
  },
  {
    persist: {
      storage: piniaPluginPersistedstate.localStorage(),
      pick: ['draft', 'baseSnapshot', 'lastSavedScheduleId', 'lastSavedAt', 'lastSavedType', 'autoSavePolicy']
    }
  }
)
