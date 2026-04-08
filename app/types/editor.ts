import type {
  RepeatTypeDto,
  StudyLanguageDto,
  StudyProgramTypeDto,
  ThesisLanguageDto
} from '#shared/types/time-schedules'

export interface StudentRow {
  id: string
  prepareTime: string
  examTime: string
  titlesBefore: string
  lastName: string
  firstName: string
  email: string
  titlesAfter: string
  studyLanguage: StudyLanguageDto
  studyProgramType: StudyProgramTypeDto
  studyProgramName: string
  specializationCode: string
  thesisTitle: string
  thesisTitleLocal: string
  thesisTitleEn: string
  thesisLanguage: ThesisLanguageDto
  supervisorName: string
  additionalSupervisorName: string
  reviewerName: string
  additionalReviewerName: string
  repeatType: RepeatTypeDto
  prepareMinutes: number
  examMinutes: number
}

export interface EditorStudentSearchResult {
  studentId: string
  committeeId: string
  fullName: string
  email: string
  committeeLabel: string
  committeeDateLabel: string
  orderLabel: string
}

export interface EditorStudentHighlightRequest {
  requestId: number
  committeeId: string
  studentId: string
}

export interface CommitteeSidebarDayBookmarkItem {
  kind: 'day-bookmark'
  id: string
  dayLabel: string
}

export interface CommitteeSidebarCommitteeItem {
  kind: 'committee'
  label: string
  value: string
  studentsCount: number
}

export type CommitteeSidebarItem = CommitteeSidebarDayBookmarkItem | CommitteeSidebarCommitteeItem

/** i18n strings for committee form blocks inside EditorStudentsPanel */
export interface EditorStudentsPanelCommitteeLabels {
  committeeTitle: string
  startTime: string
  startTimeHour: string
  startTimeMinute: string
  columnDisplaySettingsAction: string
  thesisTitleDisplayMode: string
  thesisTitleDisplayModeAuto: string
  thesisTitleDisplayModeBoth: string
  tableViewMode: string
  tableViewModeOptimized: string
  tableViewModeMaximized: string
  room: string
  date: string
  secretary: string
  members: string
  chair: string
  viceChair: string
  member1: string
  member2: string
  member3: string
  language: string
  languageCzech: string
  languageEnglish: string
  studyProgramType: string
  studyProgramTypeBachelor: string
  studyProgramTypeMaster: string
  studyProgramName: string
  specializationCode: string
  department: string
  renameCommitteeAction: string
  deleteCommitteeAction: string
  renameCommitteeAria: string
  deleteCommitteeAria: string
}

export interface EditorStudentsPanelStudentsEmptyLabels {
  emptyTitle: string
  emptyDescription: string
}

export interface EditorStudentsPanelInvigilatorLabels {
  addAction: string
  deleteAria: string
}

/** String committee fields emitted as a single event (date/language/type use dedicated emits). */
export type EditorCommitteeStringField =
  | 'room'
  | 'secretary'
  | 'chair'
  | 'viceChair'
  | 'member1'
  | 'member2'
  | 'member3'
  | 'studyProgramName'
  | 'specializationCode'

export interface EditorCommitteeStringFieldPayload {
  field: EditorCommitteeStringField
  value: string
}

/** Pre-translated strings for [EditorScheduleDialogsHost.vue](app/components/editor/EditorScheduleDialogsHost.vue). */
export interface EditorScheduleDialogsCopy {
  commonCancel: string
  renameCommittee: {
    title: string
    placeholder: string
    hint: string
    submit: string
  }
  createCommittee: {
    title: string
    description: string
    placeholder: string
    hint: string
    submit: string
  }
  renameDraft: {
    title: string
    description: string
    placeholder: string
    hint: string
    submit: string
  }
  cloudSave: {
    title: string
    description: string
    placeholder: string
    hint: string
    submit: string
  }
  addInvigilator: {
    title: string
    description: string
    placeholder: string
    hint: string
    submit: string
  }
  deleteCommitteeConfirmAction: string
  deleteInvigilatorConfirmAction: string
}
