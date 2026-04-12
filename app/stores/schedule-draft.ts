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
 * - Tracks whether the draft has unsaved changes with an explicit dirty flag
 * - Marks clean state after initialization and successful save operations
 *
 * 3) Autosave lifecycle
 * - Schedules debounced autosave for dirty drafts
 * - Applies min interval protection between autosaves
 * - Retries autosave after failures based on policy settings
 * - Ignores stale save responses if the draft changed while a request was in flight
 */

import { addMilliseconds, differenceInMilliseconds, format, isValid, parseISO } from 'date-fns'
import * as Sentry from '@sentry/nuxt'
import { resolveEditorSpecializationOptionForDepartment } from '#shared/constants/editor'
import type {
  PauseItemDto,
  PostCommitteeDto,
  PostCommitteeItemDto,
  PostPauseItemDto,
  PostStudentItemDto,
  PostTimeScheduleRequestDto,
  PostTimeScheduleResponseDto,
  StudentItemDto,
  TimeScheduleDto,
  TimeScheduleTypeDto
} from '#shared/types/time-schedules'
import type {
  DraftCommitteeSource,
  DraftItemSource,
  DraftScheduleSource,
  ScheduleAutoSavePolicy,
  ScheduleDraft,
  ScheduleDraftCommittee,
  ScheduleDraftInvigilator,
  ScheduleDraftItem,
  ScheduleDraftOperationErrorCode
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

const AUTO_SCHEDULE_TIMESTAMP_SUFFIXES_AT_END_REGEX = /(?:\s*\[\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2}\])+$/u

function stripAutoScheduleTimestampSuffix(name: string): string {
  const normalized = normalizedName(name, '')
  if (normalized.length < 1) {
    return ''
  }

  return normalized.replace(AUTO_SCHEDULE_TIMESTAMP_SUFFIXES_AT_END_REGEX, '').trim()
}

function createAutoScheduleName(draftName: string, now: Date = new Date()): string {
  const nameWithoutAutoSaveSuffix = stripAutoScheduleTimestampSuffix(draftName)
  const baseName = normalizedName(nameWithoutAutoSaveSuffix, createDefaultNewScheduleName(now))
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
    preparationRoom: committee.preparationRoom ?? null,
    secretaryName: committee.secretaryName,
    invigilators: invigilatorsFromApiStrings(committee.invigilators),
    language: committee.language,
    studyProgramName: committee.studyProgramName,
    studyProgramType: committee.studyProgramType,
    specializationName: committee.specializationName,
    specializationCode: committee.specializationCode,
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
  const sourceNameWithoutAutoSaveSuffix =
    source.type === 'AUTO' ? stripAutoScheduleTimestampSuffix(source.name) : source.name

  return {
    name: normalizedName(sourceNameWithoutAutoSaveSuffix, fallbackName),
    type: source.type,
    thesisTitleDisplayMode: 'AUTO',
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
    preparationRoom: committee.preparationRoom ?? null,
    secretaryName: committee.secretaryName,
    invigilators: committee.invigilators.map((invigilator) => invigilator.name),
    language: committee.language,
    studyProgramName: committee.studyProgramName,
    studyProgramType: committee.studyProgramType,
    specializationName: committee.specializationName,
    specializationCode: committee.specializationCode,
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

interface ScheduleDraftDepartmentResolutionIssue {
  scope: 'COMMITTEE' | 'STUDENT'
  committeeName: string
  studyProgramType: PostCommitteeDto['studyProgramType']
  studyProgramName: string
  specializationCode: string
  studentName: string | null
  studentEmail: string | null
}

class ScheduleDraftDepartmentResolutionError extends Error {
  readonly issues: ScheduleDraftDepartmentResolutionIssue[]

  constructor(issues: ScheduleDraftDepartmentResolutionIssue[]) {
    super('SCHEDULE_DRAFT_DEPARTMENT_RESOLUTION_FAILED')
    this.name = 'ScheduleDraftDepartmentResolutionError'
    this.issues = issues
  }
}

function resolveStudentDisplayName(student: PostStudentItemDto): string {
  const normalizedName = `${student.lastName.trim()} ${student.firstName.trim()}`.trim()
  return normalizedName.length > 0 ? normalizedName : 'Unknown student'
}

function collectDraftDepartmentResolutionIssues(draft: ScheduleDraft): ScheduleDraftDepartmentResolutionIssue[] {
  const issues: ScheduleDraftDepartmentResolutionIssue[] = []

  for (const committee of draft.committees) {
    const committeeDepartment = resolveEditorSpecializationOptionForDepartment(
      committee.studyProgramType,
      committee.studyProgramName,
      committee.specializationCode
    )
    if (!committeeDepartment) {
      issues.push({
        scope: 'COMMITTEE',
        committeeName: committee.name,
        studyProgramType: committee.studyProgramType,
        studyProgramName: committee.studyProgramName,
        specializationCode: committee.specializationCode,
        studentName: null,
        studentEmail: null
      })
    }

    for (const item of committee.items) {
      if (item.type !== 'STUDENT') {
        continue
      }

      const studentDepartment = resolveEditorSpecializationOptionForDepartment(
        item.student.studyProgramType,
        item.student.studyProgramName,
        item.student.specializationCode
      )
      if (studentDepartment) {
        continue
      }

      issues.push({
        scope: 'STUDENT',
        committeeName: committee.name,
        studyProgramType: item.student.studyProgramType,
        studyProgramName: item.student.studyProgramName,
        specializationCode: item.student.specializationCode,
        studentName: resolveStudentDisplayName(item.student),
        studentEmail: item.student.email
      })
    }
  }

  return issues
}

function assertDraftDepartmentsResolvable(draft: ScheduleDraft): void {
  const issues = collectDraftDepartmentResolutionIssues(draft)
  if (issues.length < 1) {
    return
  }

  const error = new ScheduleDraftDepartmentResolutionError(issues)
  Sentry.captureException(error, {
    tags: {
      workflow: 'schedule-draft-save'
    },
    extra: {
      issues
    }
  })

  throw createScheduleDraftOperationError('REQUEST_FAILED', error)
}

function toPostPayload(
  draft: ScheduleDraft,
  scheduleType: TimeScheduleTypeDto,
  explicitName?: string | null
): PostTimeScheduleRequestDto {
  assertDraftDepartmentsResolvable(draft)

  const payload = deepClone(draft)
  const targetName = explicitName !== undefined ? explicitName : payload.name

  return {
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

function isScheduleDraftDepartmentResolutionError(error: unknown): boolean {
  if (error instanceof ScheduleDraftDepartmentResolutionError) {
    return true
  }

  if (error instanceof ScheduleDraftOperationError) {
    return error.cause instanceof ScheduleDraftDepartmentResolutionError
  }

  return false
}

const PERSIST_THROTTLE_MS = import.meta.test ? 0 : 1_500

type PersistedLocalStorage = ReturnType<typeof piniaPluginPersistedstate.localStorage>

function createThrottledLocalStorage(throttleMs: number): PersistedLocalStorage {
  const pendingValuesByKey = new Map<string, string>()
  const timersByKey = new Map<string, ReturnType<typeof setTimeout>>()

  function flushPendingValue(key: string): void {
    if (!import.meta.client) {
      return
    }

    const pendingValue = pendingValuesByKey.get(key)
    if (pendingValue === undefined) {
      return
    }

    pendingValuesByKey.delete(key)
    window.localStorage.setItem(key, pendingValue)
  }

  return {
    getItem(key: string): string | null {
      if (!import.meta.client) {
        return null
      }

      return window.localStorage.getItem(key)
    },
    setItem(key: string, value: string): void {
      if (!import.meta.client) {
        return
      }

      if (throttleMs < 1) {
        window.localStorage.setItem(key, value)
        return
      }

      pendingValuesByKey.set(key, value)
      if (timersByKey.has(key)) {
        return
      }

      const timer = setTimeout(() => {
        timersByKey.delete(key)
        flushPendingValue(key)
      }, throttleMs)

      timersByKey.set(key, timer)
    }
  }
}

const scheduleDraftPersistStorage = createThrottledLocalStorage(PERSIST_THROTTLE_MS)

export const useScheduleDraftStore = defineStore(
  'schedule-draft',
  () => {
    const draft = ref<ScheduleDraft | null>(null)

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
    const isDirty = ref(false)

    let dirtyTrackingPauseDepth = 0
    let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

    const hasDraft = computed(() => draft.value !== null)

    function runWithoutDirtyTracking<T>(operation: () => T): T {
      dirtyTrackingPauseDepth += 1

      try {
        return operation()
      } finally {
        dirtyTrackingPauseDepth = Math.max(dirtyTrackingPauseDepth - 1, 0)
      }
    }

    function markDraftAsClean(): void {
      isDirty.value = false
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

      const mutableDraft = draft.value
      if (!mutableDraft) {
        return response
      }

      runWithoutDirtyTracking(() => {
        if (targetType === 'MANUAL') {
          const shouldSyncManualDraftName = options.syncManualDraftName ?? true

          if (shouldSyncManualDraftName) {
            mutableDraft.name = payload.name
          }

          mutableDraft.type = 'MANUAL'
        }

        markDraftAsClean()
      })

      clearAutoSaveTimer()

      lastSavedScheduleId.value = response.id
      lastSavedAt.value = response.createdAt
      lastSavedType.value = targetType

      return response
    }

    function replaceDraft(nextDraft: ScheduleDraft): void {
      runWithoutDirtyTracking(() => {
        draft.value = deepClone(nextDraft)
        markDraftAsClean()
      })

      manualSaveErrorCode.value = null
      autoSaveErrorCode.value = null
      clearLastSavedMetadata()
      clearAutoSaveTimer()
    }

    function clearDraft(): void {
      runWithoutDirtyTracking(() => {
        draft.value = null
        markDraftAsClean()
      })

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
        if (!isScheduleDraftDepartmentResolutionError(error)) {
          scheduleAutoSave(autoSavePolicy.value.retryAfterErrorMs)
        }
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
        manualSaveErrorCode.value = resolveScheduleDraftErrorCode(error, 'REQUEST_FAILED')

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
      (nextDraft, previousDraft) => {
        if (dirtyTrackingPauseDepth > 0) {
          return
        }

        if (!nextDraft) {
          markDraftAsClean()
          clearAutoSaveTimer()
          return
        }

        // The first assignment from null is treated as initialization/hydration.
        // Dirty flag is restored from persisted state in that case.
        if (previousDraft !== null) {
          isDirty.value = true
        }

        if (!autoSavePolicy.value.enabled) {
          clearAutoSaveTimer()
          return
        }

        if (!isDirty.value) {
          return
        }

        scheduleAutoSave(autoSavePolicy.value.debounceMs)
      },
      { deep: true, flush: 'sync' }
    )

    return {
      draft,
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
      storage: scheduleDraftPersistStorage,
      pick: ['draft', 'isDirty', 'lastSavedScheduleId', 'lastSavedAt', 'lastSavedType', 'autoSavePolicy']
    }
  }
)
