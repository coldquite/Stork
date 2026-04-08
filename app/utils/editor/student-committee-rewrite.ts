import type { PostStudentItemDto } from '#shared/types/time-schedules'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import { resolveStudentDurationByStudyProgramAndRepeat } from '~/utils/student-duration'

type StudentCommitteeProfileSource = Pick<
  ScheduleDraftCommittee,
  'studyProgramName' | 'studyProgramType' | 'specializationName' | 'specializationCode' | 'language'
>

type StudentCommitteeRewriteStudent = Pick<
  PostStudentItemDto,
  | 'studyProgramName'
  | 'studyProgramType'
  | 'specializationName'
  | 'specializationCode'
  | 'studyLanguage'
  | 'repeatType'
  | 'prepareMinutes'
  | 'examMinutes'
>

export interface StudentCommitteeRewriteValuesByField {
  studyProgramName: PostStudentItemDto['studyProgramName']
  studyProgramType: PostStudentItemDto['studyProgramType']
  specializationName: PostStudentItemDto['specializationName']
  specializationCode: PostStudentItemDto['specializationCode']
  studyLanguage: PostStudentItemDto['studyLanguage']
  prepareMinutes: PostStudentItemDto['prepareMinutes']
  examMinutes: PostStudentItemDto['examMinutes']
}

export type StudentCommitteeRewriteFieldKey = keyof StudentCommitteeRewriteValuesByField

export const STUDENT_COMMITTEE_REWRITE_FIELD_ORDER: readonly StudentCommitteeRewriteFieldKey[] = [
  'studyProgramName',
  'studyProgramType',
  'specializationName',
  'specializationCode',
  'studyLanguage',
  'prepareMinutes',
  'examMinutes'
] as const

export interface StudentCommitteeRewriteFieldPreview<K extends StudentCommitteeRewriteFieldKey> {
  field: K
  currentValue: StudentCommitteeRewriteValuesByField[K]
  nextValue: StudentCommitteeRewriteValuesByField[K]
  willChange: boolean
}

export type StudentCommitteeRewritePreview = {
  [K in StudentCommitteeRewriteFieldKey]: StudentCommitteeRewriteFieldPreview<K>
}

export type StudentCommitteeRewritePreviewList = {
  [K in StudentCommitteeRewriteFieldKey]: StudentCommitteeRewriteFieldPreview<K>
}[StudentCommitteeRewriteFieldKey][]

function createFieldPreview<K extends StudentCommitteeRewriteFieldKey>(
  field: K,
  currentValue: StudentCommitteeRewriteValuesByField[K],
  nextValue: StudentCommitteeRewriteValuesByField[K]
): StudentCommitteeRewriteFieldPreview<K> {
  return {
    field,
    currentValue,
    nextValue,
    willChange: currentValue !== nextValue
  }
}

export function resolveStudentCommitteeRewriteValues(
  student: StudentCommitteeRewriteStudent,
  targetCommittee: StudentCommitteeProfileSource
): StudentCommitteeRewriteValuesByField {
  const mappedDuration = resolveStudentDurationByStudyProgramAndRepeat(
    targetCommittee.studyProgramType,
    student.repeatType
  )

  return {
    studyProgramName: targetCommittee.studyProgramName,
    studyProgramType: targetCommittee.studyProgramType,
    specializationName: targetCommittee.specializationName,
    specializationCode: targetCommittee.specializationCode,
    studyLanguage: targetCommittee.language,
    prepareMinutes: mappedDuration.prepareMinutes,
    examMinutes: mappedDuration.examMinutes
  }
}

export function buildStudentCommitteeRewritePreview(
  student: StudentCommitteeRewriteStudent,
  targetCommittee: StudentCommitteeProfileSource
): StudentCommitteeRewritePreview {
  const nextValues = resolveStudentCommitteeRewriteValues(student, targetCommittee)

  return {
    studyProgramName: createFieldPreview('studyProgramName', student.studyProgramName, nextValues.studyProgramName),
    studyProgramType: createFieldPreview('studyProgramType', student.studyProgramType, nextValues.studyProgramType),
    specializationName: createFieldPreview(
      'specializationName',
      student.specializationName,
      nextValues.specializationName
    ),
    specializationCode: createFieldPreview(
      'specializationCode',
      student.specializationCode,
      nextValues.specializationCode
    ),
    studyLanguage: createFieldPreview('studyLanguage', student.studyLanguage, nextValues.studyLanguage),
    prepareMinutes: createFieldPreview('prepareMinutes', student.prepareMinutes, nextValues.prepareMinutes),
    examMinutes: createFieldPreview('examMinutes', student.examMinutes, nextValues.examMinutes)
  }
}

export function toStudentCommitteeRewritePreviewList(
  preview: StudentCommitteeRewritePreview
): StudentCommitteeRewritePreviewList {
  return STUDENT_COMMITTEE_REWRITE_FIELD_ORDER.map((field) => preview[field])
}

export function hasStudentCommitteeRewriteChanges(preview: StudentCommitteeRewritePreview): boolean {
  return STUDENT_COMMITTEE_REWRITE_FIELD_ORDER.some((field) => preview[field].willChange)
}

export function applyStudentCommitteeRewrite(
  student: StudentCommitteeRewriteStudent,
  targetCommittee: StudentCommitteeProfileSource
): StudentCommitteeRewritePreview {
  const preview = buildStudentCommitteeRewritePreview(student, targetCommittee)

  student.studyProgramName = preview.studyProgramName.nextValue
  student.studyProgramType = preview.studyProgramType.nextValue
  student.specializationName = preview.specializationName.nextValue
  student.specializationCode = preview.specializationCode.nextValue
  student.studyLanguage = preview.studyLanguage.nextValue
  student.prepareMinutes = preview.prepareMinutes.nextValue
  student.examMinutes = preview.examMinutes.nextValue

  return preview
}
