import type { PdfPublicExportDictionary } from './types'

export const PDF_PUBLIC_EXPORT_EN_DICTIONARY: PdfPublicExportDictionary = {
  documentHeaderTitle: 'PLAN OF STATE FINAL EXAMINATIONS',
  degreeTitleByStudyProgramType: {
    BACHELOR: 'BACHELOR STATE FINAL EXAMINATIONS',
    MASTER: 'MASTER STATE FINAL EXAMINATIONS'
  },
  semesterLabelByCode: {
    summerJune: (academicYear) => `summer semester ${academicYear} (June)`,
    summerAugust: (academicYear) => `summer semester ${academicYear} (August)`,
    winterFebruary: (academicYear) => `winter semester ${academicYear} (February)`,
    fallback: '—'
  },
  studyProgramLineByType: {
    BACHELOR: (studyProgramName) => `Bachelor Study Program ${studyProgramName}`,
    MASTER: (studyProgramName) => `Master Study Program ${studyProgramName}`
  },
  committeeLine: (committeeLabel) => `Committee ${committeeLabel}`,
  departmentLine: (departmentName) => `department of defense: ${departmentName}`,
  secretaryLine: (secretaryName) => `Secretary: ${secretaryName}`,
  invigilatorsLineLabel: (preparationRoom) => `Invigilation of written preparation (${preparationRoom}):`,
  membersHeading: 'members of committee:',
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
  pause: {
    defaultBreakLabel: 'BREAK',
    defaultLunchLabel: 'LUNCH',
    durationUnit: 'minutes',
    formatLine: (label, durationMinutes, durationUnit) => `${label} (${durationMinutes} ${durationUnit})`
  }
}
