import type { PdfPublicExportDictionary } from './types'

export const PDF_PUBLIC_EXPORT_CS_DICTIONARY: PdfPublicExportDictionary = {
  documentHeaderTitle: 'PLÁN KONÁNÍ STÁTNÍCH ZÁVĚREČNÝCH ZKOUŠEK',
  degreeTitleByStudyProgramType: {
    BACHELOR: 'BAKALÁŘSKÉ STÁTNÍ ZÁVĚREČNÉ ZKOUŠKY',
    MASTER: 'MAGISTERSKÉ STÁTNÍ ZÁVĚREČNÉ ZKOUŠKY'
  },
  semesterLabelByCode: {
    summerJune: (academicYear) => `letní semestr ${academicYear} (červen)`,
    summerAugust: (academicYear) => `letní semestr ${academicYear} (srpen)`,
    winterFebruary: (academicYear) => `zimní semestr ${academicYear} (únor)`,
    fallback: '—'
  },
  studyProgramLineByType: {
    BACHELOR: (studyProgramName) => `bakalářský studijní program ${studyProgramName}`,
    MASTER: (studyProgramName) => `magisterský studijní program ${studyProgramName}`
  },
  committeeLine: (committeeLabel) => `Komise ${committeeLabel}`,
  departmentLine: (departmentName) => `katedra obhajoby: ${departmentName}`,
  secretaryLine: (secretaryName) => `Tajemník: ${secretaryName}`,
  invigilatorsLine: (preparationRoom, invigilatorsLabel) =>
    `Dozor u písemné přípravy (${preparationRoom}): ${invigilatorsLabel}`,
  membersHeading: 'složení komise:',
  memberRoleChair: 'předseda',
  memberRoleViceChair: 'místopředseda',
  topMeta: {
    roomLine: (room) => `učebna ${room}`
  },
  table: {
    preparationStart: 'Začátek přípravy',
    committeeExam: 'Zkouška před komisí',
    studentSpecialization: 'Student\nSpecializace',
    thesisTitle: 'Téma závěrečné práce',
    supervisorReviewer: 'Vedoucí\nOponent',
    emptyRowsFallback: '—'
  },
  pause: {
    defaultBreakLabel: 'PŘESTÁVKA',
    defaultLunchLabel: 'OBĚD',
    durationUnit: 'minut',
    formatLine: (label, durationMinutes, durationUnit) => `${label} (${durationMinutes} ${durationUnit})`
  }
}
