<script setup lang="ts">
import type { ImportMappingError, ImportMappingErrorCode } from '~/types/import-mapper'

interface ImportMappingErrorDialogProps {
  error: ImportMappingError | null
}

const props = defineProps<ImportMappingErrorDialogProps>()
const open = defineModel<boolean>('open', { default: false })
const { t, te } = useI18n()

const reasonTranslationKeyByCode: Record<ImportMappingErrorCode, string> = {
  MISSING_DATASET: 'homepage.actions.create.import.mappingError.reasons.missingDataset',
  MISSING_REQUIRED_VALUE: 'homepage.actions.create.import.mappingError.reasons.missingRequiredValue',
  INVALID_COMMITTEE_NAME: 'homepage.actions.create.import.mappingError.reasons.invalidCommitteeName',
  DUPLICATE_COMMITTEE_NAME: 'homepage.actions.create.import.mappingError.reasons.duplicateCommitteeName',
  COMMITTEE_NOT_FOUND_IN_STUDENTS: 'homepage.actions.create.import.mappingError.reasons.committeeNotFoundInStudents',
  COMMITTEE_NOT_FOUND_IN_COMMITTEES:
    'homepage.actions.create.import.mappingError.reasons.committeeNotFoundInCommittees',
  COMMITTEE_GROUP_INCONSISTENT: 'homepage.actions.create.import.mappingError.reasons.committeeGroupInconsistent',
  COMMITTEE_FIELD_MISMATCH: 'homepage.actions.create.import.mappingError.reasons.committeeFieldMismatch',
  COMMITTEE_SZZ_TYPE_MISMATCH: 'homepage.actions.create.import.mappingError.reasons.committeeSzzTypeMismatch',
  INVALID_COMMITTEE_DATE: 'homepage.actions.create.import.mappingError.reasons.invalidCommitteeDate',
  INVALID_STUDY_PROGRAM_TYPE: 'homepage.actions.create.import.mappingError.reasons.invalidStudyProgramType',
  INVALID_LANGUAGE: 'homepage.actions.create.import.mappingError.reasons.invalidLanguage',
  STUDENT_MATCH_NOT_FOUND: 'homepage.actions.create.import.mappingError.reasons.studentMatchNotFound',
  STUDENT_MATCH_AMBIGUOUS: 'homepage.actions.create.import.mappingError.reasons.studentMatchAmbiguous',
  STUDENT_COMMITTEE_NOT_FOUND: 'homepage.actions.create.import.mappingError.reasons.studentCommitteeNotFound',
  STUDENT_VALUE_MISMATCH: 'homepage.actions.create.import.mappingError.reasons.studentValueMismatch',
  INVALID_THESIS_SUBMISSION_DATE: 'homepage.actions.create.import.mappingError.reasons.invalidThesisSubmissionDate',
  INVALID_FIRST_TERM_GRADE: 'homepage.actions.create.import.mappingError.reasons.invalidFirstTermGrade',
  INVALID_FIRST_TERM_RESULT_STATE: 'homepage.actions.create.import.mappingError.reasons.invalidFirstTermResultState',
  INVALID_REPEAT_TYPE_STATE: 'homepage.actions.create.import.mappingError.reasons.invalidRepeatTypeState',
  STUDENT_REPEAT_NOT_ALLOWED: 'homepage.actions.create.import.mappingError.reasons.studentRepeatNotAllowed',
  STUDENT_COMMITTEE_MISMATCH: 'homepage.actions.create.import.mappingError.reasons.studentCommitteeMismatch',
  TEACHERS_DICTIONARY_REQUEST_FAILED:
    'homepage.actions.create.import.mappingError.reasons.teachersDictionaryRequestFailed'
}

const reasonText = computed(() => {
  if (!props.error) {
    return t('homepage.actions.create.import.mappingError.reasons.unknown')
  }

  const reasonKey = reasonTranslationKeyByCode[props.error.code]
  return t(reasonKey)
})

function formatContextKey(key: string): string {
  const translationKey = `homepage.actions.create.import.mappingError.contextKeys.${key}`
  return te(translationKey) ? t(translationKey) : key
}

function formatContextValue(key: string, value: string | number | boolean): string {
  if (key === 'reason') {
    const translationKey = `homepage.actions.create.import.mappingError.contextReasons.${value}`
    if (te(translationKey)) {
      return t(translationKey)
    }
  }

  const directTranslationKey = `homepage.actions.create.import.mappingError.contextValues.${key}.${value}`
  if (te(directTranslationKey)) {
    return t(directTranslationKey)
  }

  return String(value)
}

const contextEntries = computed(() => {
  if (!props.error) {
    return []
  }

  return Object.entries(props.error.context)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => ({
      key,
      label: formatContextKey(key),
      value: formatContextValue(key, value as string | number | boolean)
    }))
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('homepage.actions.create.import.mappingError.title')"
    :description="$t('homepage.actions.create.import.mappingError.description')"
    :dismissible="true"
  >
    <template #body>
      <div class="space-y-4 text-sm">
        <UAlert
          icon="i-lucide-triangle-alert"
          color="error"
          variant="soft"
          :title="$t('homepage.actions.create.import.mappingError.reasonLabel')"
          :description="reasonText"
        />

        <div class="space-y-1">
          <p>
            <span class="font-medium">{{ $t('homepage.actions.create.import.mappingError.fileLabel') }}:</span>
            {{ error?.fileName || $t('homepage.actions.create.import.mappingError.missingValue') }}
          </p>

          <p>
            <span class="font-medium">{{ $t('homepage.actions.create.import.mappingError.rowLabel') }}:</span>
            {{ error?.rowNumber || $t('homepage.actions.create.import.mappingError.missingValue') }}
          </p>

          <p>
            <span class="font-medium">{{ $t('homepage.actions.create.import.mappingError.columnLabel') }}:</span>
            {{ error?.column || $t('homepage.actions.create.import.mappingError.missingValue') }}
          </p>
        </div>

        <div v-if="contextEntries.length > 0" class="space-y-2">
          <p class="font-medium">
            {{ $t('homepage.actions.create.import.mappingError.contextLabel') }}
          </p>

          <div class="bg-elevated divide-default border-default divide-y rounded-md border text-xs">
            <div
              v-for="entry of contextEntries"
              :key="entry.key"
              class="flex items-start justify-between gap-3 px-3 py-2"
            >
              <span class="text-muted">{{ entry.label }}</span>
              <span class="text-highlighted text-right break-all">{{ entry.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="ml-auto">
        <UButton color="neutral" variant="solid" class="cursor-pointer" @click="open = false">
          {{ $t('homepage.actions.create.import.mappingError.closeAction') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
