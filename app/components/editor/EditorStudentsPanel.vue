<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  EditorCommitteeStringFieldPayload,
  EditorStudentsPanelCommitteeLabels,
  EditorStudentsPanelInvigilatorLabels,
  EditorStudentsPanelStudentsEmptyLabels,
  StudentRow
} from '~/types/editor'
import type { ScheduleDraftCommittee, ScheduleDraftInvigilator } from '~/types/schedule-draft'
import type { StudyLanguageDto, StudyProgramTypeDto } from '#shared/types/time-schedules'

const props = defineProps<{
  cardRootClass: string
  selectedCommittee: ScheduleDraftCommittee | null
  selectedCommitteeLabel?: string
  selectedCommitteeDate?: string
  studentsCountLabel: string
  students: StudentRow[]
  columns: TableColumn<StudentRow>[]
  committeeLabels: EditorStudentsPanelCommitteeLabels
  studentsEmpty: EditorStudentsPanelStudentsEmptyLabels
  invigilatorLabels: EditorStudentsPanelInvigilatorLabels
  invigilators: ScheduleDraftInvigilator[]
  invigilatorsCountLabel: string
}>()

const emit = defineEmits<{
  (event: 'update:students', value: StudentRow[]): void
  (event: 'committeeStringField', payload: EditorCommitteeStringFieldPayload): void
  (event: 'update:committeeDate' | 'deleteInvigilator' | 'renameCommittee' | 'deleteCommittee', value: string): void
  (event: 'update:committeeStartMinute', value: number): void
  (event: 'update:committeeLanguage', value: StudyLanguageDto): void
  (event: 'update:committeeStudyProgramType', value: StudyProgramTypeDto): void
  (event: 'addInvigilator'): void
}>()

const labels = computed(() => props.committeeLabels)

const hasSelectedCommittee = computed(() => Boolean(props.selectedCommittee))
const isInvigilatorsEmpty = computed(() => hasSelectedCommittee.value && props.invigilators.length < 1)

const committeeLocalId = computed(() => props.selectedCommittee?.localId ?? '')

function forwardStringField(payload: EditorCommitteeStringFieldPayload): void {
  emit('committeeStringField', payload)
}

function requestRenameCommittee(): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('renameCommittee', props.selectedCommittee.localId)
}

function requestDeleteCommittee(): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('deleteCommittee', props.selectedCommittee.localId)
}
</script>

<template>
  <UCard :ui="{ root: props.cardRootClass }">
    <template #header>
      <div class="flex flex-col gap-3">
        <EditorCommitteeHeaderActions
          :committee-title-label="labels.committeeTitle"
          :committee-label="props.selectedCommitteeLabel"
          :students-count-label="props.studentsCountLabel"
          :rename-committee-aria-label="labels.renameCommitteeAria"
          :delete-committee-aria-label="labels.deleteCommitteeAria"
          :has-committee="hasSelectedCommittee"
          @rename-committee="requestRenameCommittee"
          @delete-committee="requestDeleteCommittee"
        />

        <div class="text-muted flex flex-wrap items-start gap-2">
          <EditorCommitteeBasicsCard
            :selected-committee="props.selectedCommittee"
            :selected-committee-date="props.selectedCommitteeDate"
            :date-label="labels.date"
            :room-label="labels.room"
            :language-label="labels.language"
            :language-czech-label="labels.languageCzech"
            :language-english-label="labels.languageEnglish"
            :secretary-label="labels.secretary"
            @committee-string-field="forwardStringField"
            @update:committee-date="emit('update:committeeDate', $event)"
            @update:committee-language="emit('update:committeeLanguage', $event)"
          />

          <EditorCommitteeStudyProgramCard
            :selected-committee="props.selectedCommittee"
            :study-program-type-label="labels.studyProgramType"
            :study-program-type-bachelor-label="labels.studyProgramTypeBachelor"
            :study-program-type-master-label="labels.studyProgramTypeMaster"
            :study-program-name-label="labels.studyProgramName"
            :specialization-code-label="labels.specializationCode"
            :department-label="labels.department"
            @committee-string-field="forwardStringField"
            @update:committee-study-program-type="emit('update:committeeStudyProgramType', $event)"
          />

          <EditorCommitteeMembersCard
            :selected-committee="props.selectedCommittee"
            :members-section-label="labels.members"
            :chair-label="labels.chair"
            :vice-chair-label="labels.viceChair"
            :member1-label="labels.member1"
            :member2-label="labels.member2"
            :member3-label="labels.member3"
            @committee-string-field="forwardStringField"
          />

          <EditorCommitteeInvigilatorsCard
            :selected-committee="props.selectedCommittee"
            :invigilators="props.invigilators"
            :invigilators-count-label="props.invigilatorsCountLabel"
            :add-action-label="props.invigilatorLabels.addAction"
            :delete-invigilator-aria-label="props.invigilatorLabels.deleteAria"
            :is-invigilators-empty="isInvigilatorsEmpty"
            @add-invigilator="emit('addInvigilator')"
            @delete-invigilator="emit('deleteInvigilator', $event)"
          />
        </div>

        <div class="border-default w-full min-w-0 border-t pt-3">
          <EditorCommitteeStartTimeRow
            :selected-committee="props.selectedCommittee"
            :start-time-label="labels.startTime"
            :start-time-hour-label="labels.startTimeHour"
            :start-time-minute-label="labels.startTimeMinute"
            @update:committee-start-minute="emit('update:committeeStartMinute', $event)"
          />
        </div>
      </div>
    </template>

    <EditorStudentsSortableTable
      :committee-local-id="committeeLocalId"
      :model-value="props.students"
      :columns="props.columns"
      :empty-labels="props.studentsEmpty"
      @update:model-value="emit('update:students', $event)"
    />
  </UCard>
</template>
