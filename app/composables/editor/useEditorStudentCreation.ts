import type { StudyLanguageDto, ThesisLanguageDto } from '#shared/types/time-schedules'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'
import type {
  EditorCreateStudentDraft,
  EditorCreateStudentMinutesField,
  EditorCreateStudentTextField,
  EditorCreateStudentValidationErrors,
  EditorCreateStudentValidationField
} from '~/types/editor'
import {
  normalizeOptionalText,
  normalizeRequiredText,
  resolveCommitteeLabel,
  resolveNextCommitteeItemPosition
} from '~/utils/editor/draft-committee'
import { resolveRepeatTypeFromSelectValue } from '~/utils/editor/repeat-type'
import {
  applySpecializationCodeChange,
  applyStudyLanguageChange,
  applyStudyProgramNameChange,
  applyStudyProgramTypeChange,
  resolveSpecializationNameForStudyProfile,
  resolveSpecializationOptionsForStudyProfile,
  resolveStudyProgramNameOptionsForStudyProfile
} from '~/utils/editor/student-study-profile'
import { resolveStudyLanguageFromSelectValue } from '~/utils/editor/study-language'
import { resolveStudyProgramTypeFromSelectValue } from '~/utils/editor/study-program-type'
import { resolveThesisLanguageFromSelectValue } from '~/utils/editor/thesis-language'
import { createLocalId } from '~/utils/id'
import { resolveStudentDurationByStudyProgramAndRepeat } from '~/utils/student-duration'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const TEXT_FIELD_TO_VALIDATION_FIELD: Partial<
  Record<EditorCreateStudentTextField, EditorCreateStudentValidationField>
> = {
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  thesisTitleLocal: 'thesisTitleLocal',
  thesisTitleEn: 'thesisTitleEn',
  supervisorName: 'supervisorName',
  reviewerName: 'reviewerName'
}

function resolveStudyProgramNameFromSelectValue(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    return value
  }

  return fallback
}

function resolveSpecializationCodeFromSelectValue(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object' && value !== null && 'specializationCode' in value) {
    return String(value.specializationCode)
  }

  return fallback
}

function resolveDefaultStudyLanguage(committee: ScheduleDraftCommittee): StudyLanguageDto {
  return committee.language === 'ENGLISH' ? 'ENGLISH' : 'CZECH'
}

function resolveDefaultThesisLanguage(committee: ScheduleDraftCommittee): ThesisLanguageDto {
  return committee.language === 'ENGLISH' ? 'ENGLISH' : 'CZECH'
}

function resolveIntegerFromInput(value: unknown, fallback: number): number {
  const parsedValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN

  if (!Number.isFinite(parsedValue)) {
    return fallback
  }

  return Math.max(Math.trunc(parsedValue), 0)
}

function createInitialStudentDraft(committee: ScheduleDraftCommittee): EditorCreateStudentDraft {
  const repeatType = 'NONE' as const
  const defaultDuration = resolveStudentDurationByStudyProgramAndRepeat(committee.studyProgramType, repeatType)

  return {
    firstName: '',
    lastName: '',
    email: '',
    titlesBefore: '',
    titlesAfter: '',
    thesisTitleLocal: '',
    thesisTitleEn: '',
    thesisLanguage: resolveDefaultThesisLanguage(committee),
    supervisorName: '',
    reviewerName: '',
    additionalSupervisorName: '',
    additionalReviewerName: '',
    studyProgramName: committee.studyProgramName,
    studyProgramType: committee.studyProgramType,
    specializationCode: '',
    studyLanguage: resolveDefaultStudyLanguage(committee),
    repeatType,
    prepareMinutes: defaultDuration.prepareMinutes,
    examMinutes: defaultDuration.examMinutes
  }
}

/**
 * Create-student dialog state and mutations for the selected committee.
 */
export function useEditorStudentCreation(selectedCommittee: ComputedRef<ScheduleDraftCommittee | null>) {
  const { t } = useI18n()

  const isCreateStudentDialogOpen = ref(false)
  const createStudentDraft = ref<EditorCreateStudentDraft | null>(null)
  const createStudentValidationErrors = ref<EditorCreateStudentValidationErrors>({})

  const fallbackCommitteeLabel = computed(() => t('editor.untitled'))
  const createStudentCommitteeLabel = computed(() => {
    const committee = selectedCommittee.value
    if (!committee) {
      return ''
    }

    return resolveCommitteeLabel(committee, fallbackCommitteeLabel.value)
  })

  const createStudentStudyProgramNameOptions = computed(() => {
    const draft = createStudentDraft.value
    if (!draft) {
      return []
    }

    return resolveStudyProgramNameOptionsForStudyProfile(
      draft.studyProgramType,
      draft.studyLanguage,
      draft.studyProgramName
    )
  })

  const createStudentSpecializationOptions = computed(() => {
    const draft = createStudentDraft.value
    if (!draft) {
      return []
    }

    return resolveSpecializationOptionsForStudyProfile(
      draft.studyProgramType,
      draft.studyProgramName,
      draft.specializationCode
    )
  })

  function clearValidationError(field: EditorCreateStudentValidationField): void {
    if (!createStudentValidationErrors.value[field]) {
      return
    }

    const { [field]: _removed, ...nextErrors } = createStudentValidationErrors.value
    createStudentValidationErrors.value = nextErrors
  }

  function setValidationError(field: EditorCreateStudentValidationField, message: string): void {
    createStudentValidationErrors.value = {
      ...createStudentValidationErrors.value,
      [field]: message
    }
  }

  function validateRequiredField(value: string): string | null {
    const normalizedValue = normalizeRequiredText(value)
    if (normalizedValue.length < 1) {
      return t('editor.students.add.validation.required')
    }

    if (value !== normalizedValue) {
      return t('editor.students.add.validation.leadingTrailingWhitespace')
    }

    return null
  }

  function validateEmailField(value: string): string | null {
    const normalizedValue = normalizeRequiredText(value)
    if (normalizedValue.length < 1) {
      return null
    }

    if (value !== normalizedValue) {
      return t('editor.students.add.validation.leadingTrailingWhitespace')
    }

    if (!EMAIL_REGEX.test(normalizedValue)) {
      return t('editor.students.add.validation.emailInvalid')
    }

    return null
  }

  function validateCreateStudentDraft(draft: EditorCreateStudentDraft): boolean {
    createStudentValidationErrors.value = {}

    const requiredFieldChecks: Array<{ field: EditorCreateStudentValidationField; value: string }> = [
      { field: 'firstName', value: draft.firstName },
      { field: 'lastName', value: draft.lastName },
      { field: 'thesisTitleLocal', value: draft.thesisTitleLocal },
      { field: 'thesisTitleEn', value: draft.thesisTitleEn },
      { field: 'supervisorName', value: draft.supervisorName },
      { field: 'reviewerName', value: draft.reviewerName },
      { field: 'studyProgramName', value: draft.studyProgramName },
      { field: 'specializationCode', value: draft.specializationCode }
    ]

    for (const check of requiredFieldChecks) {
      const validationError = validateRequiredField(check.value)
      if (validationError) {
        setValidationError(check.field, validationError)
      }
    }

    const emailValidationError = validateEmailField(draft.email)
    if (emailValidationError) {
      setValidationError('email', emailValidationError)
    }

    return Object.keys(createStudentValidationErrors.value).length < 1
  }

  function openCreateStudentDialog(): void {
    const committee = selectedCommittee.value
    if (!committee) {
      return
    }

    createStudentDraft.value = createInitialStudentDraft(committee)
    createStudentValidationErrors.value = {}
    isCreateStudentDialogOpen.value = true
  }

  function closeCreateStudentDialog(): void {
    isCreateStudentDialogOpen.value = false
    createStudentDraft.value = null
    createStudentValidationErrors.value = {}
  }

  function updateCreateStudentTextField(field: EditorCreateStudentTextField, value: string): void {
    const draft = createStudentDraft.value
    if (!draft) {
      return
    }

    draft[field] = value

    const validationField = TEXT_FIELD_TO_VALIDATION_FIELD[field]
    if (validationField) {
      clearValidationError(validationField)
    }
  }

  function updateCreateStudentMinutesField(field: EditorCreateStudentMinutesField, value: unknown): void {
    const draft = createStudentDraft.value
    if (!draft) {
      return
    }

    draft[field] = resolveIntegerFromInput(value, draft[field])
  }

  function updateCreateStudentStudyLanguage(value: unknown): void {
    const draft = createStudentDraft.value
    if (!draft) {
      return
    }

    const nextStudyLanguage = resolveStudyLanguageFromSelectValue(value, draft.studyLanguage)
    const nextStudyProfile = applyStudyLanguageChange(
      {
        studyLanguage: draft.studyLanguage,
        studyProgramType: draft.studyProgramType,
        studyProgramName: draft.studyProgramName,
        specializationCode: draft.specializationCode
      },
      nextStudyLanguage
    )

    draft.studyLanguage = nextStudyProfile.studyLanguage
    draft.studyProgramType = nextStudyProfile.studyProgramType
    draft.studyProgramName = nextStudyProfile.studyProgramName
    draft.specializationCode = nextStudyProfile.specializationCode
    clearValidationError('studyProgramName')
    clearValidationError('specializationCode')
  }

  function updateCreateStudentStudyProgramType(value: unknown): void {
    const draft = createStudentDraft.value
    if (!draft) {
      return
    }

    const previousStudyProgramType = draft.studyProgramType
    const nextStudyProgramType = resolveStudyProgramTypeFromSelectValue(value, draft.studyProgramType)
    const nextStudyProfile = applyStudyProgramTypeChange(
      {
        studyLanguage: draft.studyLanguage,
        studyProgramType: draft.studyProgramType,
        studyProgramName: draft.studyProgramName,
        specializationCode: draft.specializationCode
      },
      nextStudyProgramType
    )

    draft.studyLanguage = nextStudyProfile.studyLanguage
    draft.studyProgramType = nextStudyProfile.studyProgramType
    draft.studyProgramName = nextStudyProfile.studyProgramName
    draft.specializationCode = nextStudyProfile.specializationCode

    if (nextStudyProfile.studyProgramType !== previousStudyProgramType) {
      const mappedDuration = resolveStudentDurationByStudyProgramAndRepeat(
        nextStudyProfile.studyProgramType,
        draft.repeatType
      )
      draft.prepareMinutes = mappedDuration.prepareMinutes
      draft.examMinutes = mappedDuration.examMinutes
    }

    clearValidationError('studyProgramName')
    clearValidationError('specializationCode')
  }

  function updateCreateStudentStudyProgramName(value: unknown): void {
    const draft = createStudentDraft.value
    if (!draft) {
      return
    }

    const nextStudyProgramName = resolveStudyProgramNameFromSelectValue(value, draft.studyProgramName)
    const nextStudyProfile = applyStudyProgramNameChange(
      {
        studyLanguage: draft.studyLanguage,
        studyProgramType: draft.studyProgramType,
        studyProgramName: draft.studyProgramName,
        specializationCode: draft.specializationCode
      },
      nextStudyProgramName
    )

    draft.studyLanguage = nextStudyProfile.studyLanguage
    draft.studyProgramType = nextStudyProfile.studyProgramType
    draft.studyProgramName = nextStudyProfile.studyProgramName
    draft.specializationCode = nextStudyProfile.specializationCode
    clearValidationError('studyProgramName')
    clearValidationError('specializationCode')
  }

  function updateCreateStudentSpecializationCode(value: unknown): void {
    const draft = createStudentDraft.value
    if (!draft) {
      return
    }

    const nextSpecializationCode = resolveSpecializationCodeFromSelectValue(value, draft.specializationCode)
    const nextStudyProfile = applySpecializationCodeChange(
      {
        studyLanguage: draft.studyLanguage,
        studyProgramType: draft.studyProgramType,
        studyProgramName: draft.studyProgramName,
        specializationCode: draft.specializationCode
      },
      nextSpecializationCode
    )

    draft.studyLanguage = nextStudyProfile.studyLanguage
    draft.studyProgramType = nextStudyProfile.studyProgramType
    draft.studyProgramName = nextStudyProfile.studyProgramName
    draft.specializationCode = nextStudyProfile.specializationCode
    clearValidationError('specializationCode')
  }

  function updateCreateStudentThesisLanguage(value: unknown): void {
    const draft = createStudentDraft.value
    if (!draft) {
      return
    }

    draft.thesisLanguage = resolveThesisLanguageFromSelectValue(value, draft.thesisLanguage)
  }

  function updateCreateStudentRepeatType(value: unknown): void {
    const draft = createStudentDraft.value
    if (!draft) {
      return
    }

    const nextRepeatType = resolveRepeatTypeFromSelectValue(value, draft.repeatType)
    if (nextRepeatType === draft.repeatType) {
      return
    }

    draft.repeatType = nextRepeatType
    const mappedDuration = resolveStudentDurationByStudyProgramAndRepeat(draft.studyProgramType, nextRepeatType)
    draft.prepareMinutes = mappedDuration.prepareMinutes
    draft.examMinutes = mappedDuration.examMinutes
  }

  function submitCreateStudent(): void {
    const committee = selectedCommittee.value
    const draft = createStudentDraft.value
    if (!committee || !draft) {
      closeCreateStudentDialog()
      return
    }

    if (!validateCreateStudentDraft(draft)) {
      return
    }

    const normalizedStudyProgramName = normalizeRequiredText(draft.studyProgramName)
    const normalizedSpecializationCode = normalizeRequiredText(draft.specializationCode)
    const nextStudentItem: ScheduleDraftItem = {
      localId: createLocalId(),
      type: 'STUDENT',
      position: resolveNextCommitteeItemPosition(committee),
      student: {
        firstName: normalizeRequiredText(draft.firstName),
        lastName: normalizeRequiredText(draft.lastName),
        email: normalizeOptionalText(draft.email),
        titlesBefore: normalizeOptionalText(draft.titlesBefore),
        titlesAfter: normalizeOptionalText(draft.titlesAfter),
        thesisTitleLocal: normalizeRequiredText(draft.thesisTitleLocal),
        thesisTitleEn: normalizeRequiredText(draft.thesisTitleEn),
        thesisLanguage: draft.thesisLanguage,
        supervisorName: normalizeRequiredText(draft.supervisorName),
        reviewerName: normalizeRequiredText(draft.reviewerName),
        additionalSupervisorName: normalizeOptionalText(draft.additionalSupervisorName),
        additionalReviewerName: normalizeOptionalText(draft.additionalReviewerName),
        studyProgramName: normalizedStudyProgramName,
        studyProgramType: draft.studyProgramType,
        specializationName: resolveSpecializationNameForStudyProfile(
          draft.studyProgramType,
          normalizedStudyProgramName,
          normalizedSpecializationCode
        ),
        specializationCode: normalizedSpecializationCode,
        studyLanguage: draft.studyLanguage,
        repeatType: draft.repeatType,
        prepareMinutes: draft.prepareMinutes,
        examMinutes: draft.examMinutes
      },
      pause: null
    }

    committee.items.push(nextStudentItem)
    closeCreateStudentDialog()
  }

  return {
    isCreateStudentDialogOpen,
    createStudentDraft,
    createStudentValidationErrors,
    createStudentCommitteeLabel,
    createStudentStudyProgramNameOptions,
    createStudentSpecializationOptions,
    openCreateStudentDialog,
    closeCreateStudentDialog,
    submitCreateStudent,
    updateCreateStudentTextField,
    updateCreateStudentMinutesField,
    updateCreateStudentStudyLanguage,
    updateCreateStudentStudyProgramType,
    updateCreateStudentStudyProgramName,
    updateCreateStudentSpecializationCode,
    updateCreateStudentThesisLanguage,
    updateCreateStudentRepeatType
  }
}
