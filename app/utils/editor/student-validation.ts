import {
  resolveEditorSpecializationOptionForDepartment,
  resolveEditorStudyProgramNameOptions
} from '#shared/constants/editor'
import type {
  EditorStudentValidationFieldKey,
  EditorStudentValidationIssue,
  EditorStudentValidationIssueCode
} from '~/types/editor'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import { isStudentItem, normalizeRequiredText } from '~/utils/editor/draft-committee'
import { isValidRepeatType } from '~/utils/editor/repeat-type'
import { isValidStudyLanguage } from '~/utils/editor/study-language'
import { isValidStudyProgramType } from '~/utils/editor/study-program-type'
import { isValidThesisLanguage } from '~/utils/editor/thesis-language'

const THESIS_TITLE_WARNING_MARKER = '[?]'

function isBlankText(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length < 1
}

function buildIssueId(
  committeeId: string,
  studentId: string,
  fieldKey: EditorStudentValidationFieldKey,
  code: EditorStudentValidationIssueCode
): string {
  return `${committeeId}:${studentId}:${fieldKey}:${code}`
}

function createIssue(
  committeeId: string,
  studentId: string,
  studentOrder: number,
  fieldKey: EditorStudentValidationFieldKey,
  code: EditorStudentValidationIssueCode
): EditorStudentValidationIssue {
  return {
    issueId: buildIssueId(committeeId, studentId, fieldKey, code),
    committeeId,
    studentId,
    studentOrder,
    fieldKey,
    code,
    severity: 'error'
  }
}

function appendRequiredIssue(
  issues: EditorStudentValidationIssue[],
  committeeId: string,
  studentId: string,
  studentOrder: number,
  fieldKey: EditorStudentValidationFieldKey
): void {
  issues.push(createIssue(committeeId, studentId, studentOrder, fieldKey, 'REQUIRED'))
}

function appendInvalidValueIssue(
  issues: EditorStudentValidationIssue[],
  committeeId: string,
  studentId: string,
  studentOrder: number,
  fieldKey: EditorStudentValidationFieldKey
): void {
  issues.push(createIssue(committeeId, studentId, studentOrder, fieldKey, 'INVALID_VALUE'))
}

function validateStudentProfileIssues(
  committeeId: string,
  studentId: string,
  studentOrder: number,
  studyProgramType: unknown,
  studyLanguage: unknown,
  studyProgramName: string,
  specializationCode: string,
  issues: EditorStudentValidationIssue[]
): void {
  const hasValidStudyProgramType = isValidStudyProgramType(String(studyProgramType))
  if (!hasValidStudyProgramType) {
    appendInvalidValueIssue(issues, committeeId, studentId, studentOrder, 'studyProgramType')
  }

  const hasValidStudyLanguage = isValidStudyLanguage(String(studyLanguage))
  if (!hasValidStudyLanguage) {
    appendInvalidValueIssue(issues, committeeId, studentId, studentOrder, 'studyLanguage')
  }

  const normalizedStudyProgramName = normalizeRequiredText(studyProgramName)
  if (normalizedStudyProgramName.length < 1) {
    appendRequiredIssue(issues, committeeId, studentId, studentOrder, 'studyProgramName')
  }

  const normalizedSpecializationCode = normalizeRequiredText(specializationCode)
  if (normalizedSpecializationCode.length < 1) {
    appendRequiredIssue(issues, committeeId, studentId, studentOrder, 'specializationCode')
  }

  if (hasValidStudyProgramType && hasValidStudyLanguage && normalizedStudyProgramName.length > 0) {
    const validatedStudyProgramType = studyProgramType as 'BACHELOR' | 'MASTER'
    const validatedStudyLanguage = studyLanguage as 'CZECH' | 'ENGLISH'
    const allowedStudyProgramNames = resolveEditorStudyProgramNameOptions(
      validatedStudyProgramType,
      validatedStudyLanguage
    )
    if (!allowedStudyProgramNames.includes(normalizedStudyProgramName)) {
      appendInvalidValueIssue(issues, committeeId, studentId, studentOrder, 'studyProgramName')
    }
  }

  if (!hasValidStudyProgramType || normalizedStudyProgramName.length < 1 || normalizedSpecializationCode.length < 1) {
    return
  }

  const validatedStudyProgramType = studyProgramType as 'BACHELOR' | 'MASTER'
  const resolvedDepartment = resolveEditorSpecializationOptionForDepartment(
    validatedStudyProgramType,
    normalizedStudyProgramName,
    normalizedSpecializationCode
  )
  if (!resolvedDepartment) {
    issues.push(createIssue(committeeId, studentId, studentOrder, 'specializationCode', 'UNRESOLVED_DEPARTMENT'))
  }
}

function validateStudentThesisIssues(
  committeeId: string,
  studentId: string,
  studentOrder: number,
  thesisTitleLocal: string,
  thesisTitleEn: string,
  thesisLanguage: unknown,
  supervisorName: string,
  reviewerName: string,
  issues: EditorStudentValidationIssue[]
): void {
  if (isBlankText(thesisTitleLocal)) {
    appendRequiredIssue(issues, committeeId, studentId, studentOrder, 'thesisTitleLocal')
  }
  if (isBlankText(thesisTitleEn)) {
    appendRequiredIssue(issues, committeeId, studentId, studentOrder, 'thesisTitleEn')
  }

  if (String(thesisTitleLocal).includes(THESIS_TITLE_WARNING_MARKER)) {
    issues.push(createIssue(committeeId, studentId, studentOrder, 'thesisTitleLocal', 'THESIS_TITLE_UNRESOLVED_MARKER'))
  }
  if (String(thesisTitleEn).includes(THESIS_TITLE_WARNING_MARKER)) {
    issues.push(createIssue(committeeId, studentId, studentOrder, 'thesisTitleEn', 'THESIS_TITLE_UNRESOLVED_MARKER'))
  }

  if (!isValidThesisLanguage(String(thesisLanguage))) {
    appendInvalidValueIssue(issues, committeeId, studentId, studentOrder, 'thesisLanguage')
  }

  if (isBlankText(supervisorName)) {
    appendRequiredIssue(issues, committeeId, studentId, studentOrder, 'supervisorName')
  }
  if (isBlankText(reviewerName)) {
    appendRequiredIssue(issues, committeeId, studentId, studentOrder, 'reviewerName')
  }
}

function validateStudentRepeatAndDurationIssues(
  committeeId: string,
  studentId: string,
  studentOrder: number,
  repeatType: unknown,
  prepareMinutes: unknown,
  examMinutes: unknown,
  issues: EditorStudentValidationIssue[]
): void {
  const repeatTypeAsString = String(repeatType)
  if (!isValidRepeatType(repeatTypeAsString)) {
    appendInvalidValueIssue(issues, committeeId, studentId, studentOrder, 'repeatType')
  } else if (repeatTypeAsString === 'UNKNOWN') {
    issues.push(createIssue(committeeId, studentId, studentOrder, 'repeatType', 'REPEAT_TYPE_UNKNOWN'))
  }

  if (!Number.isFinite(prepareMinutes) || Number(prepareMinutes) < 0) {
    issues.push(createIssue(committeeId, studentId, studentOrder, 'prepareMinutes', 'PREPARE_MINUTES_NEGATIVE'))
  }
  if (!Number.isFinite(examMinutes) || Number(examMinutes) <= 0) {
    issues.push(createIssue(committeeId, studentId, studentOrder, 'examMinutes', 'EXAM_MINUTES_NOT_POSITIVE'))
  }
}

export function collectStudentValidationIssues(
  draftCommittees: ScheduleDraftCommittee[]
): EditorStudentValidationIssue[] {
  const issues: EditorStudentValidationIssue[] = []

  draftCommittees.forEach((committee) => {
    const orderedItems = committee.items.slice().sort((left, right) => left.position - right.position)
    let studentOrder = 0

    orderedItems.forEach((item) => {
      if (!isStudentItem(item)) {
        return
      }

      studentOrder += 1
      const { student } = item

      if (isBlankText(student.firstName)) {
        appendRequiredIssue(issues, committee.localId, item.localId, studentOrder, 'firstName')
      }
      if (isBlankText(student.lastName)) {
        appendRequiredIssue(issues, committee.localId, item.localId, studentOrder, 'lastName')
      }

      validateStudentProfileIssues(
        committee.localId,
        item.localId,
        studentOrder,
        student.studyProgramType,
        student.studyLanguage,
        student.studyProgramName,
        student.specializationCode,
        issues
      )
      validateStudentThesisIssues(
        committee.localId,
        item.localId,
        studentOrder,
        student.thesisTitleLocal,
        student.thesisTitleEn,
        student.thesisLanguage,
        student.supervisorName,
        student.reviewerName,
        issues
      )
      validateStudentRepeatAndDurationIssues(
        committee.localId,
        item.localId,
        studentOrder,
        student.repeatType,
        student.prepareMinutes,
        student.examMinutes,
        issues
      )
    })
  })

  return issues
}

export function groupStudentValidationIssuesByCommitteeId(
  issues: EditorStudentValidationIssue[]
): Record<string, EditorStudentValidationIssue[]> {
  const groupedIssues: Record<string, EditorStudentValidationIssue[]> = {}

  issues.forEach((issue) => {
    const committeeIssues = groupedIssues[issue.committeeId] ?? []
    committeeIssues.push(issue)
    groupedIssues[issue.committeeId] = committeeIssues
  })

  return groupedIssues
}

export function countStudentValidationIssuesByCommitteeId(
  issuesByCommitteeId: Record<string, EditorStudentValidationIssue[]>
): Record<string, number> {
  const countByCommitteeId: Record<string, number> = {}

  Object.entries(issuesByCommitteeId).forEach(([committeeId, issues]) => {
    countByCommitteeId[committeeId] = issues.length
  })

  return countByCommitteeId
}
