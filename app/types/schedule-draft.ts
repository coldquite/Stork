import type {
  CommitteeItemDto,
  CommitteeDto,
  PostCommitteeDto,
  PostCommitteeItemDto,
  PostTimeScheduleRequestDto
} from '#shared/types/time-schedules'

export interface ScheduleAutoSavePolicy {
  enabled: boolean
  debounceMs: number
  minIntervalMs: number
  retryAfterErrorMs: number
}

export type ScheduleDraftOperationErrorCode = 'DRAFT_NOT_INITIALIZED' | 'REQUEST_FAILED'

export type ScheduleDraft = Omit<PostTimeScheduleRequestDto, 'committees'> & {
  committees: ScheduleDraftCommittee[]
}

export type ScheduleDraftCommittee = Omit<PostCommitteeDto, 'items'> & {
  localId: string
  items: ScheduleDraftItem[]
}

export type ScheduleDraftItem = PostCommitteeItemDto & { localId: string }

export type DraftScheduleSource = Pick<PostTimeScheduleRequestDto, 'name' | 'type' | 'committees'>

export type DraftCommitteeSource = CommitteeDto | PostCommitteeDto

export type DraftItemSource = CommitteeItemDto | PostCommitteeItemDto
