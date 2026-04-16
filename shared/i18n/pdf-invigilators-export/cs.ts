import type { PdfInvigilatorsExportDictionary } from './types'

export const PDF_INVIGILATORS_EXPORT_CS_DICTIONARY: PdfInvigilatorsExportDictionary = {
  documentHeaderTitle: 'Seznam studentů pro účely dozoru u písemné přípravy',
  brandLogoAlt: 'Fakulta informačních technologií ČVUT v Praze',
  sectionTitle: (dayLabel, preparationRoomLabel) =>
    `Dozor u písemné přípravy, ${dayLabel} (místnost přípravy ${preparationRoomLabel})`,
  invigilatorsLine: (invigilatorsLabel) => `Dozor: ${invigilatorsLabel}`,
  table: {
    preparationStart: 'Začátek přípravy',
    committeeExam: 'Zkouška před komisí',
    student: 'Student',
    committeeAndRoom: 'Komise\nmístnost',
    secretary: 'Tajemník',
    emptyRowsFallback: '—'
  },
  fileNamePrefix: 'Dozor',
  downloadFileName: 'Dozor_export.pdf'
}
