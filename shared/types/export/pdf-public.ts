import type { StudyLanguageDto } from '#shared/types/time-schedules'

export interface PdfPublicStudentRowDto {
  kind: 'STUDENT'
  preparationStartTime: string
  committeeExamRangeTime: string
  studentName: string
  specializationLabel: string
  thesisTitle: string
  supervisorPrimaryLabel: string
  supervisorAdditionalLabel: string
  reviewerPrimaryLabel: string
  reviewerAdditionalLabel: string
}

export interface PdfPublicPauseRowDto {
  kind: 'PAUSE'
  pauseLine: string
}

export type PdfPublicRowDto = PdfPublicStudentRowDto | PdfPublicPauseRowDto

export interface PdfPublicSectionDto {
  committeeId: string
  committeeDateIso: string
  committeeRoomValue: string
  language: StudyLanguageDto
  topMetaDayLabel: string
  topMetaRoomLine: string
  degreeTitle: string
  semesterLabel: string
  studyProgramLine: string
  committeeLine: string
  departmentLine: string
  secretaryLine: string
  invigilatorsLineLabel: string
  invigilatorsMembers: string[]
  membersHeading: string
  membersLines: string[]
  tablePreparationStartHeader: string
  tableCommitteeExamHeader: string
  tableStudentSpecializationHeader: string
  tableThesisTitleHeader: string
  tableSupervisorReviewerHeader: string
  rowsEmptyFallback: string
  rows: PdfPublicRowDto[]
}

export interface PostPdfPublicExportRequestDto {
  draftName: string
  documentHeaderTitle: string
  sections: PdfPublicSectionDto[]
}
