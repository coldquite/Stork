import type { StudyProgramTypeDto } from '#shared/types/time-schedules'

export interface PdfPublicExportDictionary {
  documentHeaderTitle: string
  degreeTitleByStudyProgramType: Record<StudyProgramTypeDto, string>
  semesterLabelByCode: {
    summer: (academicYear: string, monthLabel: string) => string
    winter: (academicYear: string, monthLabel: string) => string
    fallback: string
  }
  studyProgramLineByType: Record<StudyProgramTypeDto, (studyProgramName: string) => string>
  committeeLine: (committeeLabel: string) => string
  departmentLine: (departmentName: string) => string
  secretaryLine: (secretaryName: string) => string
  invigilatorsLineLabel: (preparationRoom: string) => string
  membersHeading: string
  memberRoleChair: string
  memberRoleViceChair: string
  topMeta: {
    roomLine: (room: string) => string
  }
  table: {
    preparationStart: string
    committeeExam: string
    studentSpecialization: string
    thesisTitle: string
    supervisorReviewer: string
    emptyRowsFallback: string
  }
  pause: {
    defaultBreakLabel: string
    defaultLunchLabel: string
    durationUnit: string
    formatLine: (label: string, durationMinutes: number, durationUnit: string) => string
  }
}
