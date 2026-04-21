import { useEditorCommitteeFields } from '~/composables/editor/committee/useEditorCommitteeFields'
import { useEditorCommitteeItemsActions } from '~/composables/editor/committee/useEditorCommitteeItemsActions'
import { useEditorCommitteeList } from '~/composables/editor/committee/useEditorCommitteeList'
import { useEditorInvigilators } from '~/composables/editor/committee/useEditorInvigilators'
import { useEditorPauseCreation } from '~/composables/editor/dialogs/useEditorPauseCreation'
import { useEditorScheduleDialogs } from '~/composables/editor/dialogs/useEditorScheduleDialogs'
import { useEditorStudentCreation } from '~/composables/editor/students/useEditorStudentCreation'
import { useEditorStudentSearch } from '~/composables/editor/students/useEditorStudentSearch'
import { useEditorStudentTable } from '~/composables/editor/students/useEditorStudentTable'
import {
  EDITOR_CONSECUTIVE_STUDENTS_WITHOUT_PAUSE_ERROR_THRESHOLD,
  EDITOR_STUDENT_END_MINUTE_MAX,
  EDITOR_STUDENT_START_MINUTE_MIN
} from '~/constants/editor-validation-rules'
import { useEditorTablePreferencesStore } from '~/stores/editor-table-preferences'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import type {
  CommitteeSidebarItem,
  EditorCommitteeValidationIssue,
  EditorCommitteeValidationSection,
  EditorCommitteeValidationSectionView,
  EditorStudentValidationIssue,
  EditorStudentValidationIssueView,
  EditorStudentValidationStudentGroupView,
  EditorValidationSummaryCommitteeView,
  EditorStudentsTableViewMode
} from '~/types/editor'
import type { ScheduleDraftCommittee, ScheduleDraftThesisTitleDisplayMode } from '~/types/schedule-draft'
import {
  collectCommitteeValidationIssues,
  countCommitteeValidationIssuesByCommitteeId,
  groupCommitteeValidationIssuesByCommitteeId,
  groupCommitteeValidationIssuesBySection
} from '~/utils/editor/committee-validation'
import { formatEditorMinuteLabel } from '~/utils/editor/committee-timeline'
import { isStudentItem, normalizeRequiredText } from '~/utils/editor/draft-committee'
import {
  collectStudentValidationIssues,
  countStudentValidationIssuesByCommitteeId,
  groupStudentValidationIssuesByCommitteeId
} from '~/utils/editor/student-validation'

const VALIDATION_RECOMPUTE_DEBOUNCE_MS = import.meta.test ? 0 : 180

/**
 * Facade composable for the schedule editor page: composes committee list, student table,
 * field mutations, invigilators, and draft/cloud dialogs.
 *
 * Return value is grouped by domain so pages and dialog hosts can bind smaller surface areas
 * without a flat explosion of property names.
 */
export function useEditorPage() {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()
  const editorTablePreferencesStore = useEditorTablePreferencesStore()

  const committeeList = useEditorCommitteeList()
  const thesisTitleDisplayMode = computed<ScheduleDraftThesisTitleDisplayMode>(
    () => editorTablePreferencesStore.thesisTitleDisplayMode
  )
  const tableViewMode = computed<EditorStudentsTableViewMode>(() => editorTablePreferencesStore.tableViewMode)
  const studentTable = useEditorStudentTable(committeeList.selectedCommittee, thesisTitleDisplayMode, tableViewMode)
  const studentSearch = useEditorStudentSearch(committeeList.selectedCommitteeId)
  const committeeItemsActions = useEditorCommitteeItemsActions(
    committeeList.selectedCommittee,
    studentSearch.focusRowInCommittee
  )
  const committeeFields = useEditorCommitteeFields(committeeList.selectedCommittee)
  const invigilators = useEditorInvigilators(committeeList.selectedCommittee)
  const studentCreation = useEditorStudentCreation(committeeList.selectedCommittee, studentSearch.focusRowInCommittee)
  const pauseCreation = useEditorPauseCreation(committeeList.selectedCommittee, studentSearch.focusRowInCommittee)
  const scheduleDialogs = useEditorScheduleDialogs()
  const draftCommittees = computed(() => scheduleDraftStore.draft?.committees ?? [])
  const debouncedDraftCommittees = shallowRef<ScheduleDraftCommittee[]>(draftCommittees.value)
  let validationDebounceTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    draftCommittees,
    (nextCommittees) => {
      if (validationDebounceTimer !== null) {
        clearTimeout(validationDebounceTimer)
        validationDebounceTimer = null
      }

      if (VALIDATION_RECOMPUTE_DEBOUNCE_MS < 1) {
        debouncedDraftCommittees.value = nextCommittees
        return
      }

      validationDebounceTimer = setTimeout(() => {
        debouncedDraftCommittees.value = nextCommittees
        validationDebounceTimer = null
      }, VALIDATION_RECOMPUTE_DEBOUNCE_MS)
    },
    { deep: true, immediate: true }
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (validationDebounceTimer !== null) {
        clearTimeout(validationDebounceTimer)
        validationDebounceTimer = null
      }
    })
  }

  const committeeValidationIssues = computed(() => collectCommitteeValidationIssues(debouncedDraftCommittees.value))
  const committeeValidationIssuesByCommitteeId = computed(() =>
    groupCommitteeValidationIssuesByCommitteeId(committeeValidationIssues.value)
  )
  const committeeValidationCountByCommitteeId = computed(() =>
    countCommitteeValidationIssuesByCommitteeId(committeeValidationIssuesByCommitteeId.value)
  )
  const studentValidationIssues = computed(() => collectStudentValidationIssues(debouncedDraftCommittees.value))
  const studentValidationIssuesByCommitteeId = computed(() =>
    groupStudentValidationIssuesByCommitteeId(studentValidationIssues.value)
  )
  const studentValidationCountByCommitteeId = computed(() =>
    countStudentValidationIssuesByCommitteeId(studentValidationIssuesByCommitteeId.value)
  )
  const totalValidationCountByCommitteeId = computed<Record<string, number>>(() => {
    const countByCommitteeId: Record<string, number> = {}
    const allCommitteeIds = new Set<string>([
      ...Object.keys(committeeValidationCountByCommitteeId.value),
      ...Object.keys(studentValidationCountByCommitteeId.value)
    ])

    allCommitteeIds.forEach((committeeId) => {
      countByCommitteeId[committeeId] =
        (committeeValidationCountByCommitteeId.value[committeeId] ?? 0) +
        (studentValidationCountByCommitteeId.value[committeeId] ?? 0)
    })

    return countByCommitteeId
  })
  const committeeSidebarItemsWithErrors = computed<CommitteeSidebarItem[]>(() => {
    return committeeList.committeeSidebarItems.value.map((item) => {
      if (item.kind !== 'committee') {
        return item
      }

      return {
        ...item,
        errorCount: totalValidationCountByCommitteeId.value[item.value] ?? 0
      }
    })
  })
  const selectedCommitteeValidationIssues = computed<EditorCommitteeValidationIssue[]>(() => {
    const selectedCommittee = committeeList.selectedCommittee.value
    if (!selectedCommittee) {
      return []
    }

    return collectCommitteeValidationIssues([selectedCommittee])
  })
  const selectedCommitteeStudentValidationIssues = computed<EditorStudentValidationIssue[]>(() => {
    const selectedCommittee = committeeList.selectedCommittee.value
    if (!selectedCommittee) {
      return []
    }

    return collectStudentValidationIssues([selectedCommittee])
  })
  function buildStudentInfoById(committee: ScheduleDraftCommittee): Map<string, { order: number; fullName: string }> {
    const infoByStudentId = new Map<string, { order: number; fullName: string }>()
    const orderedItems = committee.items.slice().sort((left, right) => left.position - right.position)
    let studentOrder = 0

    orderedItems.forEach((item) => {
      if (!isStudentItem(item)) {
        return
      }

      studentOrder += 1
      const firstName = normalizeRequiredText(item.student.firstName)
      const lastName = normalizeRequiredText(item.student.lastName)
      const fullName = [firstName, lastName]
        .filter((value) => value.length > 0)
        .join(' ')
        .trim()

      infoByStudentId.set(item.localId, {
        order: studentOrder,
        fullName
      })
    })

    return infoByStudentId
  }

  const selectedCommitteeStudentInfoById = computed(() => {
    const selectedCommittee = committeeList.selectedCommittee.value
    if (!selectedCommittee) {
      return new Map<string, { order: number; fullName: string }>()
    }

    return buildStudentInfoById(selectedCommittee)
  })

  function resolveValidationSectionLabel(section: EditorCommitteeValidationSection): string {
    switch (section) {
      case 'BASICS':
        return t('editor.committee.validation.sections.basics')
      case 'STUDY':
        return t('editor.committee.validation.sections.study')
      case 'MEMBERS':
        return t('editor.committee.validation.sections.members')
      case 'INVIGILATORS':
        return t('editor.committee.validation.sections.invigilators')
      default:
        return section
    }
  }

  function resolveValidationFieldLabel(fieldKey: EditorCommitteeValidationIssue['fieldKey']): string {
    return t(`editor.committee.validation.fields.${fieldKey}`)
  }

  function resolveCommitteeValidationMessage(issue: EditorCommitteeValidationIssue): string {
    switch (issue.code) {
      case 'REQUIRED':
        if (issue.fieldKey === 'invigilatorName') {
          return t('editor.committee.validation.messages.invigilatorNameRequired', {
            index: (issue.invigilatorIndex ?? 0) + 1
          })
        }

        return t('editor.committee.validation.messages.required', {
          field: resolveValidationFieldLabel(issue.fieldKey)
        })
      case 'INVALID_DATE':
        return t('editor.committee.validation.messages.invalidDate', {
          field: resolveValidationFieldLabel(issue.fieldKey)
        })
      case 'DATE_IN_PAST':
        return t('editor.committee.validation.messages.dateInPast')
      case 'INVALID_START_MINUTE':
        return t('editor.committee.validation.messages.invalidStartMinute', {
          field: resolveValidationFieldLabel(issue.fieldKey)
        })
      case 'STUDENT_START_BEFORE_ALLOWED_TIME':
        return t('editor.committee.validation.messages.studentStartBeforeAllowedTime', {
          minTime: formatEditorMinuteLabel(EDITOR_STUDENT_START_MINUTE_MIN)
        })
      case 'STUDENT_END_AFTER_ALLOWED_TIME':
        return t('editor.committee.validation.messages.studentEndAfterAllowedTime', {
          maxTime: formatEditorMinuteLabel(EDITOR_STUDENT_END_MINUTE_MAX)
        })
      case 'CONSECUTIVE_STUDENTS_WITHOUT_PAUSE':
        return t('editor.committee.validation.messages.consecutiveStudentsWithoutPause', {
          count: EDITOR_CONSECUTIVE_STUDENTS_WITHOUT_PAUSE_ERROR_THRESHOLD
        })
      case 'UNRESOLVED_DEPARTMENT':
        return t('editor.committee.validation.messages.unresolvedDepartment')
      case 'MIN_INVIGILATORS':
        return t('editor.committee.validation.messages.minInvigilators')
      case 'INVALID_VALUE':
        return t('editor.committee.validation.messages.invalidValue', {
          field: resolveValidationFieldLabel(issue.fieldKey)
        })
      default:
        return t('editor.committee.validation.messages.invalidValue', {
          field: resolveValidationFieldLabel(issue.fieldKey)
        })
    }
  }

  function resolveStudentValidationFieldLabel(fieldKey: EditorStudentValidationIssue['fieldKey']): string {
    return t(`editor.student.validation.fields.${fieldKey}`)
  }

  function resolveCommitteeValueLabelForStudentValidationIssue(issue: EditorStudentValidationIssue): string {
    const committeeValue = issue.committeeValue?.trim() ?? ''
    if (committeeValue.length < 1) {
      return '—'
    }

    if (issue.fieldKey === 'studyLanguage') {
      switch (committeeValue) {
        case 'CZECH':
          return t('editor.table.studyLanguageOptions.czech')
        case 'ENGLISH':
          return t('editor.table.studyLanguageOptions.english')
        default:
          return committeeValue
      }
    }

    if (issue.fieldKey === 'studyProgramType') {
      switch (committeeValue) {
        case 'BACHELOR':
          return t('editor.table.studyProgramTypeOptions.bachelor')
        case 'MASTER':
          return t('editor.table.studyProgramTypeOptions.master')
        default:
          return committeeValue
      }
    }

    return committeeValue
  }

  function resolveStudentValidationMessage(issue: EditorStudentValidationIssue): string {
    switch (issue.code) {
      case 'REQUIRED':
        return t('editor.student.validation.messages.required', {
          field: resolveStudentValidationFieldLabel(issue.fieldKey)
        })
      case 'INVALID_VALUE':
        return t('editor.student.validation.messages.invalidValue', {
          field: resolveStudentValidationFieldLabel(issue.fieldKey)
        })
      case 'UNRESOLVED_DEPARTMENT':
        return t('editor.student.validation.messages.unresolvedDepartment')
      case 'COMMITTEE_PROFILE_MISMATCH':
        return t('editor.student.validation.messages.committeeProfileMismatch', {
          field: resolveStudentValidationFieldLabel(issue.fieldKey),
          committeeValue: resolveCommitteeValueLabelForStudentValidationIssue(issue)
        })
      case 'PREPARE_MINUTES_NEGATIVE':
        return t('editor.student.validation.messages.prepareMinutesNegative')
      case 'EXAM_MINUTES_NOT_POSITIVE':
        return t('editor.student.validation.messages.examMinutesNotPositive')
      case 'THESIS_TITLE_UNRESOLVED_MARKER':
        return t('editor.student.validation.messages.thesisTitleUnresolvedMarker', {
          field: resolveStudentValidationFieldLabel(issue.fieldKey)
        })
      default:
        return t('editor.student.validation.messages.invalidValue', {
          field: resolveStudentValidationFieldLabel(issue.fieldKey)
        })
    }
  }

  function buildCommitteeValidationSectionViews(
    issues: EditorCommitteeValidationIssue[]
  ): EditorCommitteeValidationSectionView[] {
    return groupCommitteeValidationIssuesBySection(issues).map((group) => ({
      section: group.section,
      label: resolveValidationSectionLabel(group.section),
      issues: group.issues.map((issue) => ({
        issueId: issue.issueId,
        fieldKey: issue.fieldKey,
        message: resolveCommitteeValidationMessage(issue)
      }))
    }))
  }

  function buildStudentValidationStudentGroups(
    issues: EditorStudentValidationIssue[],
    studentInfoById: Map<string, { order: number; fullName: string }>
  ): EditorStudentValidationStudentGroupView[] {
    const issuesByStudentId = new Map<string, EditorStudentValidationIssue[]>()

    issues.forEach((issue) => {
      const studentIssues = issuesByStudentId.get(issue.studentId) ?? []
      studentIssues.push(issue)
      issuesByStudentId.set(issue.studentId, studentIssues)
    })

    const fallbackStudentName = t('editor.student.validation.fallbackStudentName')
    return Array.from(issuesByStudentId.entries())
      .map(([studentId, studentIssues]) => {
        const studentInfo = studentInfoById.get(studentId)
        const studentOrder = studentInfo?.order ?? studentIssues[0]?.studentOrder ?? Number.MAX_SAFE_INTEGER
        const studentName = studentInfo && studentInfo.fullName.length > 0 ? studentInfo.fullName : fallbackStudentName

        const issueViews: EditorStudentValidationIssueView[] = studentIssues.map((issue) => ({
          issueId: issue.issueId,
          fieldKey: issue.fieldKey,
          message: resolveStudentValidationMessage(issue)
        }))

        return {
          studentId,
          studentOrder,
          studentLabel: t('editor.student.validation.studentLabel', { order: studentOrder, name: studentName }),
          issues: issueViews
        }
      })
      .sort((left, right) => left.studentOrder - right.studentOrder || left.studentId.localeCompare(right.studentId))
      .map(({ studentId, studentLabel, issues: studentIssues }) => ({
        studentId,
        studentLabel,
        issues: studentIssues
      }))
  }

  const selectedCommitteeValidationSections = computed<EditorCommitteeValidationSectionView[]>(() =>
    buildCommitteeValidationSectionViews(selectedCommitteeValidationIssues.value)
  )
  const selectedCommitteeValidationCount = computed(() => selectedCommitteeValidationIssues.value.length)
  const selectedCommitteeStudentValidationGroups = computed<EditorStudentValidationStudentGroupView[]>(() =>
    buildStudentValidationStudentGroups(
      selectedCommitteeStudentValidationIssues.value,
      selectedCommitteeStudentInfoById.value
    )
  )
  const selectedCommitteeStudentValidationCount = computed(() => selectedCommitteeStudentValidationIssues.value.length)
  const hasAnyValidationErrors = computed(() =>
    Object.values(totalValidationCountByCommitteeId.value).some((count) => count > 0)
  )
  const totalValidationErrorCount = computed(() =>
    Object.values(totalValidationCountByCommitteeId.value).reduce((sum, count) => sum + count, 0)
  )
  const validationSummaryCommitteesWithErrors = computed<EditorValidationSummaryCommitteeView[]>(() =>
    committeeList.committees.value.flatMap((entry) => {
      const committeeId = entry.committee.localId
      const committeeIssues = committeeValidationIssuesByCommitteeId.value[committeeId] ?? []
      const studentIssues = studentValidationIssuesByCommitteeId.value[committeeId] ?? []
      const totalErrorCount = committeeIssues.length + studentIssues.length
      if (totalErrorCount < 1) {
        return []
      }

      return [
        {
          committeeId,
          committeeLabel: entry.label,
          committeeDescription: t('editor.schedule.validationSummary.modal.committeeDescription', {
            date: entry.dateLabel,
            room: entry.roomLabel,
            start: entry.timelineStartLabel,
            end: entry.timelineEndLabel,
            students: t('editor.students.count', { count: entry.studentsCount })
          }),
          totalErrorCount,
          committeeErrorCount: committeeIssues.length,
          studentErrorCount: studentIssues.length,
          committeeSections: buildCommitteeValidationSectionViews(committeeIssues),
          studentGroups: buildStudentValidationStudentGroups(studentIssues, buildStudentInfoById(entry.committee))
        }
      ]
    })
  )

  function updateThesisTitleDisplayMode(nextMode: ScheduleDraftThesisTitleDisplayMode): void {
    editorTablePreferencesStore.setThesisTitleDisplayMode(nextMode)
  }

  function updateTableViewMode(nextMode: EditorStudentsTableViewMode): void {
    editorTablePreferencesStore.setTableViewMode(nextMode)
  }

  const draftName = computed(() => scheduleDraftStore.draft?.name ?? t('editor.untitled'))
  const studentsCountLabel = computed(() =>
    t('editor.students.count', { count: studentTable.selectedStudents.value.length })
  )
  const isPageLoading = computed(() => scheduleDraftStore.isDraftLoading)

  return {
    committeeList: {
      committees: committeeList.committees,
      selectedCommittee: committeeList.selectedCommittee,
      selectedCommitteeId: committeeList.selectedCommitteeId,
      selectedCommitteeLabel: committeeList.selectedCommitteeLabel,
      selectedCommitteeDate: committeeList.selectedCommitteeDate,
      committeeSidebarItems: committeeSidebarItemsWithErrors,
      isCreateCommitteeDialogOpen: committeeList.isCreateCommitteeDialogOpen,
      createCommitteeName: committeeList.createCommitteeName,
      createCommitteeDraft: committeeList.createCommitteeDraft,
      createCommitteeDateLabel: committeeList.createCommitteeDateLabel,
      isCreateCommitteeSubmitDisabled: committeeList.isCreateCommitteeSubmitDisabled,
      createCommitteeValidationError: committeeList.createCommitteeValidationError,
      isRenameCommitteeDialogOpen: committeeList.isRenameCommitteeDialogOpen,
      renameCommitteeName: committeeList.renameCommitteeName,
      renameCommitteeValidationError: committeeList.renameCommitteeValidationError,
      isDeleteCommitteeConfirmOpen: committeeList.isDeleteCommitteeConfirmOpen,
      renameCommitteeDialogDescription: committeeList.renameCommitteeDialogDescription,
      deleteCommitteeConfirmDescription: committeeList.deleteCommitteeConfirmDescription,
      openCreateCommitteeDialog: committeeList.openCreateCommitteeDialog,
      closeCreateCommitteeDialog: committeeList.closeCreateCommitteeDialog,
      updateCreateCommitteeDate: committeeList.updateCreateCommitteeDate,
      updateCreateCommitteeStartMinute: committeeList.updateCreateCommitteeStartMinute,
      updateCreateCommitteeLanguage: committeeList.updateCreateCommitteeLanguage,
      updateCreateCommitteeStudyProgramType: committeeList.updateCreateCommitteeStudyProgramType,
      updateCreateCommitteeStringField: committeeList.updateCreateCommitteeStringField,
      openRenameCommitteeDialog: committeeList.openRenameCommitteeDialog,
      closeRenameCommitteeDialog: committeeList.closeRenameCommitteeDialog,
      openDeleteCommitteeConfirm: committeeList.openDeleteCommitteeConfirm,
      closeDeleteCommitteeConfirm: committeeList.closeDeleteCommitteeConfirm,
      submitCreateCommittee: committeeList.submitCreateCommittee,
      submitRenameCommittee: committeeList.submitRenameCommittee,
      submitDeleteCommittee: committeeList.submitDeleteCommittee
    },

    studentTable: {
      selectedRows: studentTable.selectedRows,
      selectedStudents: studentTable.selectedStudents,
      columns: studentTable.columns
    },

    committeeItemsActions: {
      isDeleteItemConfirmOpen: committeeItemsActions.isDeleteItemConfirmOpen,
      deleteItemConfirmActionLabel: committeeItemsActions.deleteItemConfirmActionLabel,
      deleteItemConfirmDescription: committeeItemsActions.deleteItemConfirmDescription,
      isMoveStudentDialogOpen: committeeItemsActions.isMoveStudentDialogOpen,
      moveStudentDialogTitle: committeeItemsActions.moveStudentDialogTitle,
      moveStudentDialogDescription: committeeItemsActions.moveStudentDialogDescription,
      moveStudentSourceCommitteeId: committeeItemsActions.moveStudentSourceCommitteeId,
      selectedMoveStudentTargetCommitteeId: committeeItemsActions.selectedMoveStudentTargetCommitteeId,
      moveStudentCurrentCommitteeBadgeLabel: committeeItemsActions.moveStudentCurrentCommitteeBadgeLabel,
      moveStudentRewritePreview: committeeItemsActions.moveStudentRewritePreview,
      moveStudentHasRewriteChanges: committeeItemsActions.moveStudentHasRewriteChanges,
      moveStudentSubmitLabel: committeeItemsActions.moveStudentSubmitLabel,
      isMoveStudentSubmitDisabled: committeeItemsActions.isMoveStudentSubmitDisabled,
      openDeleteItemConfirm: committeeItemsActions.openDeleteItemConfirm,
      closeDeleteItemConfirm: committeeItemsActions.closeDeleteItemConfirm,
      submitDeleteItem: committeeItemsActions.submitDeleteItem,
      openMoveStudentDialog: committeeItemsActions.openMoveStudentDialog,
      selectMoveStudentTargetCommittee: committeeItemsActions.selectMoveStudentTargetCommittee,
      closeMoveStudentDialog: committeeItemsActions.closeMoveStudentDialog,
      submitMoveStudentToCommittee: committeeItemsActions.submitMoveStudentToCommittee,
      requestMoveStudentToAnotherCommittee: committeeItemsActions.requestMoveStudentToAnotherCommittee
    },

    draftSettings: {
      thesisTitleDisplayMode,
      updateThesisTitleDisplayMode,
      tableViewMode,
      updateTableViewMode
    },

    committeeFields: {
      updateSelectedCommitteeRoom: committeeFields.updateSelectedCommitteeRoom,
      updateSelectedCommitteePreparationRoom: committeeFields.updateSelectedCommitteePreparationRoom,
      updateSelectedCommitteeDate: committeeFields.updateSelectedCommitteeDate,
      updateSelectedCommitteeStartMinute: committeeFields.updateSelectedCommitteeStartMinute,
      updateSelectedCommitteeSecretary: committeeFields.updateSelectedCommitteeSecretary,
      updateSelectedCommitteeChairName: committeeFields.updateSelectedCommitteeChairName,
      updateSelectedCommitteeViceChairName: committeeFields.updateSelectedCommitteeViceChairName,
      updateSelectedCommitteeMember1Name: committeeFields.updateSelectedCommitteeMember1Name,
      updateSelectedCommitteeMember2Name: committeeFields.updateSelectedCommitteeMember2Name,
      updateSelectedCommitteeMember3Name: committeeFields.updateSelectedCommitteeMember3Name,
      updateSelectedCommitteeLanguage: committeeFields.updateSelectedCommitteeLanguage,
      updateSelectedCommitteeStudyProgramType: committeeFields.updateSelectedCommitteeStudyProgramType,
      updateSelectedCommitteeStudyProgramName: committeeFields.updateSelectedCommitteeStudyProgramName,
      updateSelectedCommitteeSpecializationCode: committeeFields.updateSelectedCommitteeSpecializationCode
    },

    committeeValidation: {
      allIssues: committeeValidationIssues,
      issuesByCommitteeId: committeeValidationIssuesByCommitteeId,
      countByCommitteeId: committeeValidationCountByCommitteeId,
      selectedCommitteeIssues: selectedCommitteeValidationIssues,
      selectedCommitteeSections: selectedCommitteeValidationSections,
      selectedCommitteeCount: selectedCommitteeValidationCount
    },

    studentValidation: {
      allIssues: studentValidationIssues,
      issuesByCommitteeId: studentValidationIssuesByCommitteeId,
      countByCommitteeId: studentValidationCountByCommitteeId,
      selectedCommitteeIssues: selectedCommitteeStudentValidationIssues,
      selectedCommitteeStudentGroups: selectedCommitteeStudentValidationGroups,
      selectedCommitteeCount: selectedCommitteeStudentValidationCount
    },

    validationSummary: {
      countByCommitteeId: totalValidationCountByCommitteeId,
      hasAnyErrors: hasAnyValidationErrors,
      totalErrorCount: totalValidationErrorCount,
      committeesWithErrors: validationSummaryCommitteesWithErrors
    },

    invigilators: {
      selectedInvigilators: invigilators.selectedInvigilators,
      invigilatorsCountLabel: invigilators.invigilatorsCountLabel,
      isAddInvigilatorDialogOpen: invigilators.isAddInvigilatorDialogOpen,
      newInvigilatorName: invigilators.newInvigilatorName,
      invigilatorValidationError: invigilators.invigilatorValidationError,
      isDeleteInvigilatorConfirmOpen: invigilators.isDeleteInvigilatorConfirmOpen,
      deleteInvigilatorConfirmDescription: invigilators.deleteInvigilatorConfirmDescription,
      isApplyPreparationRoomToAllConfirmOpen: invigilators.isApplyPreparationRoomToAllConfirmOpen,
      applyPreparationRoomToAllConfirmDescription: invigilators.applyPreparationRoomToAllConfirmDescription,
      openAddInvigilatorDialog: invigilators.openAddInvigilatorDialog,
      closeAddInvigilatorDialog: invigilators.closeAddInvigilatorDialog,
      openDeleteInvigilatorConfirm: invigilators.openDeleteInvigilatorConfirm,
      closeDeleteInvigilatorConfirm: invigilators.closeDeleteInvigilatorConfirm,
      openApplyPreparationRoomToAllConfirm: invigilators.openApplyPreparationRoomToAllConfirm,
      closeApplyPreparationRoomToAllConfirm: invigilators.closeApplyPreparationRoomToAllConfirm,
      submitAddInvigilator: invigilators.submitAddInvigilator,
      submitDeleteInvigilator: invigilators.submitDeleteInvigilator,
      submitApplyPreparationRoomToAll: invigilators.submitApplyPreparationRoomToAll
    },

    studentCreation: {
      isCreateStudentDialogOpen: studentCreation.isCreateStudentDialogOpen,
      createStudentDraft: studentCreation.createStudentDraft,
      createStudentValidationErrors: studentCreation.createStudentValidationErrors,
      createStudentCommitteeLabel: studentCreation.createStudentCommitteeLabel,
      createStudentStudyProgramNameOptions: studentCreation.createStudentStudyProgramNameOptions,
      createStudentSpecializationOptions: studentCreation.createStudentSpecializationOptions,
      openCreateStudentDialog: studentCreation.openCreateStudentDialog,
      closeCreateStudentDialog: studentCreation.closeCreateStudentDialog,
      submitCreateStudent: studentCreation.submitCreateStudent,
      updateCreateStudentTextField: studentCreation.updateCreateStudentTextField,
      updateCreateStudentMinutesField: studentCreation.updateCreateStudentMinutesField,
      updateCreateStudentStudyLanguage: studentCreation.updateCreateStudentStudyLanguage,
      updateCreateStudentStudyProgramType: studentCreation.updateCreateStudentStudyProgramType,
      updateCreateStudentStudyProgramName: studentCreation.updateCreateStudentStudyProgramName,
      updateCreateStudentSpecializationCode: studentCreation.updateCreateStudentSpecializationCode,
      updateCreateStudentThesisLanguage: studentCreation.updateCreateStudentThesisLanguage,
      updateCreateStudentRepeatType: studentCreation.updateCreateStudentRepeatType
    },

    pauseCreation: {
      isPauseDialogOpen: pauseCreation.isPauseDialogOpen,
      pauseDialogMode: pauseCreation.pauseDialogMode,
      pauseDraft: pauseCreation.pauseDraft,
      pauseValidationErrors: pauseCreation.pauseValidationErrors,
      openCreatePauseDialog: pauseCreation.openCreatePauseDialog,
      openEditPauseDialog: pauseCreation.openEditPauseDialog,
      closePauseDialog: pauseCreation.closePauseDialog,
      submitPauseDialog: pauseCreation.submitPauseDialog,
      updatePauseType: pauseCreation.updatePauseType,
      updatePauseCustomLabelEnabled: pauseCreation.updatePauseCustomLabelEnabled,
      updatePauseCustomLabel: pauseCreation.updatePauseCustomLabel,
      updatePauseDurationMinutes: pauseCreation.updatePauseDurationMinutes
    },

    scheduleDialogs: {
      isRenameDraftDialogOpen: scheduleDialogs.isRenameDraftDialogOpen,
      renameDraftName: scheduleDialogs.renameDraftName,
      renameDraftValidationError: scheduleDialogs.renameDraftValidationError,
      isCloudSaveDialogOpen: scheduleDialogs.isCloudSaveDialogOpen,
      cloudSaveName: scheduleDialogs.cloudSaveName,
      cloudSaveValidationError: scheduleDialogs.cloudSaveValidationError,
      isCloudSaveLoading: scheduleDialogs.isCloudSaveLoading,
      isValidationSummaryDialogOpen: scheduleDialogs.isValidationSummaryDialogOpen,
      isExportValidationWarningDialogOpen: scheduleDialogs.isExportValidationWarningDialogOpen,
      exportValidationWarningTarget: scheduleDialogs.exportValidationWarningTarget,
      isCsvExportDialogOpen: scheduleDialogs.isCsvExportDialogOpen,
      selectedCsvExportCommitteeIds: scheduleDialogs.selectedCsvExportCommitteeIds,
      csvExportStudyProgramTypeFilter: scheduleDialogs.csvExportStudyProgramTypeFilter,
      csvExportStudyLanguageFilter: scheduleDialogs.csvExportStudyLanguageFilter,
      csvExportErrorItems: scheduleDialogs.csvExportErrorItems,
      csvExportCommitteeItems: scheduleDialogs.csvExportCommitteeItems,
      isCsvExportSubmitDisabled: scheduleDialogs.isCsvExportSubmitDisabled,
      isPdfPublicExportDialogOpen: scheduleDialogs.isPdfPublicExportDialogOpen,
      selectedPdfPublicExportCommitteeIds: scheduleDialogs.selectedPdfPublicExportCommitteeIds,
      pdfPublicExportErrorItems: scheduleDialogs.pdfPublicExportErrorItems,
      isPdfPublicExportLoading: scheduleDialogs.isPdfPublicExportLoading,
      pdfPublicExportCommitteeItems: scheduleDialogs.pdfPublicExportCommitteeItems,
      isPdfPublicExportSubmitDisabled: scheduleDialogs.isPdfPublicExportSubmitDisabled,
      isPdfInvigilatorsExportDialogOpen: scheduleDialogs.isPdfInvigilatorsExportDialogOpen,
      selectedPdfInvigilatorsExportCommitteeIds: scheduleDialogs.selectedPdfInvigilatorsExportCommitteeIds,
      pdfInvigilatorsExportErrorItems: scheduleDialogs.pdfInvigilatorsExportErrorItems,
      isPdfInvigilatorsExportLoading: scheduleDialogs.isPdfInvigilatorsExportLoading,
      pdfInvigilatorsExportDayGroups: scheduleDialogs.pdfInvigilatorsExportDayGroups,
      hasPdfInvigilatorsQualifyingStudents: scheduleDialogs.hasPdfInvigilatorsQualifyingStudents,
      isPdfInvigilatorsExportSubmitDisabled: scheduleDialogs.isPdfInvigilatorsExportSubmitDisabled,
      openRenameDraftDialog: scheduleDialogs.openRenameDraftDialog,
      closeRenameDraftDialog: scheduleDialogs.closeRenameDraftDialog,
      openCloudSaveDialog: scheduleDialogs.openCloudSaveDialog,
      closeCloudSaveDialog: scheduleDialogs.closeCloudSaveDialog,
      openValidationSummaryDialog: scheduleDialogs.openValidationSummaryDialog,
      closeValidationSummaryDialog: scheduleDialogs.closeValidationSummaryDialog,
      openExportValidationWarningDialog: scheduleDialogs.openExportValidationWarningDialog,
      closeExportValidationWarningDialog: scheduleDialogs.closeExportValidationWarningDialog,
      continueExportAfterValidationWarning: scheduleDialogs.continueExportAfterValidationWarning,
      openValidationSummaryFromExportWarning: scheduleDialogs.openValidationSummaryFromExportWarning,
      openCsvExportDialog: scheduleDialogs.openCsvExportDialog,
      closeCsvExportDialog: scheduleDialogs.closeCsvExportDialog,
      updateSelectedCsvExportCommitteeIds: scheduleDialogs.updateSelectedCsvExportCommitteeIds,
      selectAllCsvExportCommittees: scheduleDialogs.selectAllCsvExportCommittees,
      clearCsvExportCommittees: scheduleDialogs.clearCsvExportCommittees,
      updateCsvExportStudyProgramTypeFilter: scheduleDialogs.updateCsvExportStudyProgramTypeFilter,
      updateCsvExportStudyLanguageFilter: scheduleDialogs.updateCsvExportStudyLanguageFilter,
      openPdfPublicExportDialog: scheduleDialogs.openPdfPublicExportDialog,
      closePdfPublicExportDialog: scheduleDialogs.closePdfPublicExportDialog,
      updateSelectedPdfPublicExportCommitteeIds: scheduleDialogs.updateSelectedPdfPublicExportCommitteeIds,
      selectAllPdfPublicExportCommittees: scheduleDialogs.selectAllPdfPublicExportCommittees,
      clearPdfPublicExportCommittees: scheduleDialogs.clearPdfPublicExportCommittees,
      openPdfInvigilatorsExportDialog: scheduleDialogs.openPdfInvigilatorsExportDialog,
      closePdfInvigilatorsExportDialog: scheduleDialogs.closePdfInvigilatorsExportDialog,
      updateSelectedPdfInvigilatorsExportCommitteeIds: scheduleDialogs.updateSelectedPdfInvigilatorsExportCommitteeIds,
      selectAllPdfInvigilatorsExportCommittees: scheduleDialogs.selectAllPdfInvigilatorsExportCommittees,
      clearPdfInvigilatorsExportCommittees: scheduleDialogs.clearPdfInvigilatorsExportCommittees,
      submitRenameDraft: scheduleDialogs.submitRenameDraft,
      submitCloudSave: scheduleDialogs.submitCloudSave,
      submitCsvExportSelection: scheduleDialogs.submitCsvExportSelection,
      submitPdfPublicExportSelection: scheduleDialogs.submitPdfPublicExportSelection,
      submitPdfInvigilatorsExportSelection: scheduleDialogs.submitPdfInvigilatorsExportSelection,
      draftNameMaxLength: scheduleDialogs.draftNameMaxLength
    },

    studentSearch: {
      isStudentSearchDialogOpen: studentSearch.isStudentSearchDialogOpen,
      studentSearchQuery: studentSearch.studentSearchQuery,
      isStudentSearchLoading: studentSearch.isStudentSearchLoading,
      studentSearchResults: studentSearch.studentSearchResults,
      highlightRequest: studentSearch.highlightRequest,
      openStudentSearchDialog: studentSearch.openStudentSearchDialog,
      closeStudentSearchDialog: studentSearch.closeStudentSearchDialog,
      updateStudentSearchQuery: studentSearch.updateStudentSearchQuery,
      focusStudentInCommittee: studentSearch.focusStudentInCommittee,
      selectStudentSearchResult: studentSearch.selectStudentSearchResult
    },

    draftName,
    studentsCountLabel,
    isPageLoading
  }
}
