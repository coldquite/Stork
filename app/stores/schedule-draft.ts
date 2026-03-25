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

import { addMilliseconds, differenceInMilliseconds, isValid, parseISO } from 'date-fns'
import type {
  CommitteeItemDto,
  CommitteeDto,
  PostCommitteeDto,
  PostCommitteeItemDto,
  PostTimeScheduleRequestDto,
  PostTimeScheduleResponseDto,
  TimeScheduleDto,
  TimeScheduleTypeDto
} from '#shared/types/time-schedules'

export interface ScheduleAutoSavePolicy {
  enabled: boolean
  debounceMs: number
  minIntervalMs: number
  retryAfterErrorMs: number
}

const DEFAULT_SCHEDULE_AUTOSAVE_POLICY: Readonly<ScheduleAutoSavePolicy> = Object.freeze({
  enabled: true,
  debounceMs: 45_000,
  minIntervalMs: 300_000,
  retryAfterErrorMs: 60_000
})
const DEFAULT_NEW_SCHEDULE_NAME_PREFIX = 'Nový plán '

export type ScheduleDraft = Omit<PostTimeScheduleRequestDto, 'committees'> & {
  committees: ScheduleDraftCommittee[]
}

export type ScheduleDraftCommittee = Omit<PostCommitteeDto, 'items'> & {
  localId: string
  items: ScheduleDraftItem[]
}

export type ScheduleDraftItem = PostCommitteeItemDto & { localId: string }

function createLocalId(): string {
  return crypto.randomUUID()
}

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

function createAutoScheduleName(now: Date = new Date()): string {
  return `AUTO-${now.toISOString()}`
}

function createDefaultNewScheduleName(now: Date = new Date()): string {
  return `${DEFAULT_NEW_SCHEDULE_NAME_PREFIX}${now.toISOString()}`
}

function toDraftItem(item: CommitteeItemDto | PostCommitteeItemDto): ScheduleDraftItem {
  if (item.type === 'STUDENT') {
    return {
      localId: createLocalId(),
      type: 'STUDENT',
      position: item.position,
      student: deepClone(item.student),
      pause: null
    }
  }

  return {
    localId: createLocalId(),
    type: 'PAUSE',
    position: item.position,
    student: null,
    pause: deepClone(item.pause)
  }
}

function toDraftCommittee(committee: CommitteeDto | PostCommitteeDto): ScheduleDraftCommittee {
  return {
    localId: createLocalId(),
    code: committee.code,
    sortOrder: committee.sortOrder,
    startMinute: committee.startMinute,
    date: committee.date,
    room: committee.room,
    secretaryName: committee.secretaryName,
    invigilators: deepClone(committee.invigilators),
    items: committee.items
      .slice()
      .sort((left, right) => left.position - right.position)
      .map((item) => toDraftItem(item))
  }
}

type DraftScheduleSource = Pick<PostTimeScheduleRequestDto, 'name' | 'type' | 'committees'>

function toDraftFromSource(source: DraftScheduleSource): ScheduleDraft {
  const fallbackName = createDefaultNewScheduleName()

  return {
    name: normalizedName(source.name, fallbackName),
    type: source.type,
    committees: source.committees
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((committee) => toDraftCommittee(committee))
  }
}

function serializeDraft(draft: ScheduleDraft | null): string | null {
  if (!draft) {
    return null
  }

  return JSON.stringify(draft)
}

function toPostCommitteeItem(item: ScheduleDraftItem): PostCommitteeItemDto {
  const { localId: _localId, ...postItem } = deepClone(item)
  return postItem as PostCommitteeItemDto
}

function toPostCommittee(committee: ScheduleDraftCommittee): PostCommitteeDto {
  const { localId: _localId, items, ...rest } = deepClone(committee)

  return {
    ...rest,
    items: items
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
    committees: payload.committees
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((committee) => toPostCommittee(committee))
  }
}

function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return fallbackMessage
}

export const useScheduleDraftStore = defineStore('schedule-draft', () => {
  const draft = ref<ScheduleDraft | null>(null)
  const baseSnapshot = ref<string | null>(null)

  const isDraftLoading = ref(false)
  const isManualSaveLoading = ref(false)
  const isAutoSaveRunning = ref(false)

  const manualSaveError = ref<string | null>(null)
  const autoSaveError = ref<string | null>(null)

  const lastSavedScheduleId = ref<string | null>(null)
  const lastSavedAt = ref<string | null>(null)
  const lastSavedType = ref<TimeScheduleTypeDto | null>(null)
  const lastAutoSaveAt = ref<string | null>(null)
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

  function resolveUnexpectedErrorMessage(): string {
    return useNuxtApp().$i18n.t('common.errors.unexpected') as string
  }

  function resolveDraftNotInitializedErrorMessage(): string {
    return useNuxtApp().$i18n.t('common.errors.draftNotInitialized') as string
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
    explicitName?: string | null
  ): Promise<PostTimeScheduleResponseDto> {
    if (!draft.value) {
      throw new Error(resolveDraftNotInitializedErrorMessage())
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
      draft.value.name = payload.name
      draft.value.type = 'MANUAL'
    }

    syncBaseSnapshot()

    lastSavedScheduleId.value = response.id
    lastSavedAt.value = response.createdAt
    lastSavedType.value = targetType

    if (targetType === 'AUTO') {
      lastAutoSaveAt.value = response.createdAt
    }

    return response
  }

  function replaceDraft(nextDraft: ScheduleDraft): void {
    draft.value = deepClone(nextDraft)
    manualSaveError.value = null
    autoSaveError.value = null
    syncBaseSnapshot()
    clearAutoSaveTimer()
  }

  function clearDraft(): void {
    draft.value = null
    baseSnapshot.value = null
    manualSaveError.value = null
    autoSaveError.value = null
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

    if (lastAutoSaveAt.value) {
      const lastAutoSaveDate = parseISO(lastAutoSaveAt.value)

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
    autoSaveError.value = null

    try {
      return await persistDraft('AUTO', createAutoScheduleName())
    } catch (error: unknown) {
      autoSaveError.value = resolveErrorMessage(error, resolveUnexpectedErrorMessage())
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

  async function saveManualDraft(name?: string | null): Promise<PostTimeScheduleResponseDto> {
    isManualSaveLoading.value = true
    manualSaveError.value = null

    try {
      return await persistDraft('MANUAL', name)
    } catch (error: unknown) {
      manualSaveError.value = resolveErrorMessage(error, resolveUnexpectedErrorMessage())
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
    hasDraft,
    isDirty,
    isDraftLoading,
    isManualSaveLoading,
    isAutoSaveRunning,
    manualSaveError,
    autoSaveError,
    lastSavedScheduleId,
    lastSavedAt,
    lastSavedType,
    lastAutoSaveAt,
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
})
