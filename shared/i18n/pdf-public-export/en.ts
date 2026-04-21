import type { PdfPublicExportDictionary } from './types'

export const PDF_PUBLIC_EXPORT_EN_DICTIONARY: PdfPublicExportDictionary = {
  documentHeaderTitle: 'PLAN OF STATE FINAL EXAMINATIONS',
  degreeTitleByStudyProgramType: {
    BACHELOR: 'BACHELOR STATE FINAL EXAMINATIONS',
    MASTER: 'MASTER STATE FINAL EXAMINATIONS'
  },
  semesterLabelByCode: {
    summer: (academicYear, monthLabel) => `Summer semester ${academicYear} (${monthLabel})`,
    winter: (academicYear, monthLabel) => `Winter semester ${academicYear} (${monthLabel})`,
    fallback: '—'
  },
  studyProgramLineByType: {
    BACHELOR: (studyProgramName) => `Bachelor Study Program ${studyProgramName}`,
    MASTER: (studyProgramName) => `Master Study Program ${studyProgramName}`
  },
  committeeLine: (committeeLabel) => `Committee ${committeeLabel}`,
  departmentLine: (departmentName) => `Department of defense: ${departmentName}`,
  secretaryLine: (secretaryName) => `Secretary: ${secretaryName}`,
  invigilatorsLineLabel: (preparationRoom) => `Invigilation of written preparation (${preparationRoom}):`,
  membersHeading: 'Members of committee:',
  memberRoleChair: 'Chair',
  memberRoleViceChair: 'Vice-Chair',
  topMeta: {
    roomLine: (room) => `classroom ${room}`
  },
  table: {
    preparationStart: 'Start of\nprep\u00ADa\u00ADration',
    committeeExam: 'Examination before committee',
    studentSpecialization: 'Student\nSpecialization',
    thesisTitle: 'Final thesis topic',
    supervisorReviewer: 'Supervisor\nReviewer',
    emptyRowsFallback: '—'
  },
  repeatTypeLabelByValue: {
    NONE: '',
    THESIS_DEFENSE: 'Repeats thesis defense',
    ORAL_EXAM: 'Repeats oral exam',
    BOTH: 'Repeats oral exam and thesis defense'
  },
  pause: {
    defaultBreakLabel: 'BREAK',
    defaultLunchLabel: 'LUNCH',
    durationUnit: 'minutes',
    formatLine: (label, durationMinutes, durationUnit) => `${label} (${durationMinutes} ${durationUnit})`
  }
}
