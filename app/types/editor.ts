export interface StudentRow {
  id: string
  fullName: string
  personalNumber: string
  specialization: string
  thesisTitle: string
}

export interface CommitteeTabItem {
  label: string
  value: string
  studentsCount: number
}

/** i18n strings for committee form blocks inside EditorStudentsPanel */
export interface EditorStudentsPanelCommitteeLabels {
  committeeTitle: string
  startTime: string
  startTimeHour: string
  startTimeMinute: string
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
