export type TimeScheduleTypeDto = 'MANUAL' | 'AUTO'
export type RepeatTypeDto = 'NONE' | 'THESIS_DEFENSE' | 'ORAL_EXAM' | 'BOTH'
export type ThesisLanguageDto = 'CZECH' | 'ENGLISH' | 'SLOVAK'
export type StudyProgramTypeDto = 'BACHELOR' | 'MASTER'
export type StudyLanguageDto = 'CZECH' | 'ENGLISH'
export type PauseTypeDto = 'BREAK' | 'LUNCH'

export interface TimeScheduleListItemDto {
  id: string
  name: string
  type: TimeScheduleTypeDto
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
  firstName: string
  lastName: string
  email: string | null
  titlesBefore: string | null
  titlesAfter: string | null
  thesisTitleLocal: string
  thesisTitleEn: string
  thesisLanguage: ThesisLanguageDto
  supervisorName: string
  reviewerName: string
  additionalSupervisorName: string | null
  additionalReviewerName: string | null
  studyProgramName: string
  studyProgramType: StudyProgramTypeDto
  specializationName: string
  specializationCode: string
  studyLanguage: StudyLanguageDto
  repeatType: RepeatTypeDto
  prepareMinutes: number
  examMinutes: number
}

export interface PauseItemDto {
  itemId: string
  label: string
  durationMinutes: number
  pauseType: PauseTypeDto
}

interface StudentCommitteeItemDto {
  id: string
  committeeId: string
  type: 'STUDENT'
  position: number
  student: StudentItemDto
  pause: null
}

interface PauseCommitteeItemDto {
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
  name: string
  startMinute: number
  date: string
  room: string | null
  preparationRoom: string | null
  secretaryName: string | null
  invigilators: string[]
  language: StudyLanguageDto
  studyProgramName: string
  studyProgramType: StudyProgramTypeDto
  specializationName: string
  specializationCode: string
  chairName: string
  viceChairName: string
  member1Name: string
  member2Name: string
  member3Name: string
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

type PostStudentCommitteeItemDto = Omit<StudentCommitteeItemDto, 'id' | 'committeeId' | 'student'> & {
  student: PostStudentItemDto
}

type PostPauseCommitteeItemDto = Omit<PauseCommitteeItemDto, 'id' | 'committeeId' | 'pause'> & {
  pause: PostPauseItemDto
}

export type PostCommitteeItemDto = PostStudentCommitteeItemDto | PostPauseCommitteeItemDto

export type PostCommitteeDto = Omit<CommitteeDto, 'id' | 'timeScheduleId' | 'items' | 'preparationRoom'> & {
  preparationRoom?: string | null
  items: PostCommitteeItemDto[]
}

export type PostTimeScheduleRequestDto = Omit<TimeScheduleDto, 'id' | 'createdAt' | 'committees'> & {
  committees: PostCommitteeDto[]
}

export interface PostTimeScheduleResponseDto {
  id: string
  createdAt: string
}
