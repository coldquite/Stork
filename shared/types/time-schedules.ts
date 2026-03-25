export type TimeScheduleTypeDto = 'MANUAL' | 'AUTO'
export type CommitteeItemTypeDto = 'STUDENT' | 'PAUSE'
export type RepeatTypeDto = 'NONE' | 'THESIS_DEFENSE' | 'ORAL_EXAM' | 'BOTH' | 'UNKNOWN'
export type ThesisLanguageDto = 'CZECH' | 'ENGLISH' | 'SLOVAK'

export interface TimeScheduleListItemDto {
  id: string
  name: string
  createdAt: string
  counts: {
    committees: number
    items: number
    students: number
    pauses: number
  }
}

export interface StudentItemDto {
  itemId: string
  personalNumber: string | null
  firstName: string
  lastName: string
  email: string
  mobilePhone: string | null
  titlesBefore: string | null
  titlesAfter: string | null
  specialization: string
  thesisTitleLocal: string
  thesisTitleEn: string
  thesisLanguage: ThesisLanguageDto
  supervisorName: string
  reviewerName: string
  repeatType: RepeatTypeDto
  elsa: boolean
  prepareMinutes: number
  examMinutes: number
}

export interface PauseItemDto {
  itemId: string
  label: string
  durationMinutes: number
}

export interface StudentCommitteeItemDto {
  id: string
  committeeId: string
  type: 'STUDENT'
  position: number
  student: StudentItemDto
  pause: null
}

export interface PauseCommitteeItemDto {
  id: string
  committeeId: string
  type: 'PAUSE'
  position: number
  student: null
  pause: PauseItemDto
}

export type CommitteeItemDto = StudentCommitteeItemDto | PauseCommitteeItemDto

export interface CommitteeDto {
  id: string
  timeScheduleId: string
  code: string
  sortOrder: number
  startMinute: number
  date: string
  room: string | null
  secretaryName: string | null
  invigilators: string[]
  items: CommitteeItemDto[]
}

export interface TimeScheduleDto {
  id: string
  name: string
  type: TimeScheduleTypeDto
  createdAt: string
  committees: CommitteeDto[]
}

export type PostStudentItemDto = Omit<StudentItemDto, 'itemId'>

export type PostPauseItemDto = Omit<PauseItemDto, 'itemId'>

export type PostStudentCommitteeItemDto = Omit<StudentCommitteeItemDto, 'id' | 'committeeId' | 'student'> & {
  student: PostStudentItemDto
}

export type PostPauseCommitteeItemDto = Omit<PauseCommitteeItemDto, 'id' | 'committeeId' | 'pause'> & {
  pause: PostPauseItemDto
}

export type PostCommitteeItemDto = PostStudentCommitteeItemDto | PostPauseCommitteeItemDto

export type PostCommitteeDto = Omit<CommitteeDto, 'id' | 'timeScheduleId' | 'items'> & {
  items: PostCommitteeItemDto[]
}

export type PostTimeScheduleRequestDto = Omit<TimeScheduleDto, 'id' | 'createdAt' | 'committees'> & {
  committees: PostCommitteeDto[]
}

export interface PostTimeScheduleResponseDto {
  id: string
  createdAt: string
}
