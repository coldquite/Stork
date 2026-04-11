export interface PdfInvigilatorsStudentRowDto {
  prepareStartTime: string
  committeeExamRangeTime: string
  studentName: string
  repeatLabel: string
  thesisTitle: string
  committeeLabel: string
  roomLabel: string
}

export interface PdfInvigilatorsSectionDto {
  dayKey: string
  dayLabel: string
  roomLabel: string
  invigilatorsLabel: string
  students: PdfInvigilatorsStudentRowDto[]
}

export interface PostPdfInvigilatorsExportRequestDto {
  draftName: string
  sections: PdfInvigilatorsSectionDto[]
}
