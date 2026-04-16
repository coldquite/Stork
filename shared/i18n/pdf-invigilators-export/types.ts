export interface PdfInvigilatorsExportDictionary {
  documentHeaderTitle: string
  brandLogoAlt: string
  sectionTitle: (dayLabel: string, preparationRoomLabel: string) => string
  invigilatorsLine: (invigilatorsLabel: string) => string
  table: {
    preparationStart: string
    committeeExam: string
    student: string
    committeeAndRoom: string
    secretary: string
    emptyRowsFallback: string
  }
  fileNamePrefix: string
  downloadFileName: string
}
