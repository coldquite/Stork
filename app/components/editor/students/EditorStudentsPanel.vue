<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import EditorCommitteeBasicsCard from '~/components/editor/committee/EditorCommitteeBasicsCard.vue'
import EditorCommitteeHeaderActions from '~/components/editor/committee/EditorCommitteeHeaderActions.vue'
import EditorCommitteeInvigilatorsCard from '~/components/editor/committee/EditorCommitteeInvigilatorsCard.vue'
import EditorCommitteeMembersCard from '~/components/editor/committee/EditorCommitteeMembersCard.vue'
import EditorCommitteeStartTimeRow from '~/components/editor/committee/EditorCommitteeStartTimeRow.vue'
import EditorCommitteeStudyProgramCard from '~/components/editor/committee/EditorCommitteeStudyProgramCard.vue'
import EditorStudentsSortableTable from '~/components/editor/students/EditorStudentsSortableTable.client.vue'
import type {
  EditorCommitteeStringFieldPayload,
  EditorStudentHighlightRequest,
  EditorStudentsTableViewMode,
  EditorTableRow,
  EditorStudentsPanelCommitteeLabels,
  EditorStudentsPanelInvigilatorLabels,
  EditorStudentsPanelStudentsEmptyLabels
} from '~/types/editor'
import type {
  ScheduleDraftCommittee,
  ScheduleDraftInvigilator,
  ScheduleDraftThesisTitleDisplayMode
} from '~/types/schedule-draft'
import type { StudyLanguageDto, StudyProgramTypeDto } from '#shared/types/time-schedules'

const props = defineProps<{
  cardRootClass: string
  selectedCommittee: ScheduleDraftCommittee | null
  thesisTitleDisplayMode: ScheduleDraftThesisTitleDisplayMode
  tableViewMode: EditorStudentsTableViewMode
  selectedCommitteeLabel?: string
  selectedCommitteeDate?: string
  studentsCountLabel: string
  students: EditorTableRow[]
  columns: TableColumn<EditorTableRow>[]
  committeeLabels: EditorStudentsPanelCommitteeLabels
  studentsEmpty: EditorStudentsPanelStudentsEmptyLabels
  invigilatorLabels: EditorStudentsPanelInvigilatorLabels
  invigilators: ScheduleDraftInvigilator[]
  invigilatorsCountLabel: string
  highlightRequest?: EditorStudentHighlightRequest | null
}>()

const emit = defineEmits<{
  (event: 'update:students', value: EditorTableRow[]): void
  (event: 'committeeStringField', payload: EditorCommitteeStringFieldPayload): void
  (
    event:
      | 'update:committeeDate'
      | 'deleteInvigilator'
      | 'renameCommittee'
      | 'deleteCommittee'
      | 'editPause'
      | 'requestDeleteItem'
      | 'requestMoveStudent',
    value: string
  ): void
  (event: 'update:committeeStartMinute', value: number): void
  (event: 'update:thesisTitleDisplayMode', value: ScheduleDraftThesisTitleDisplayMode): void
  (event: 'update:tableViewMode', value: EditorStudentsTableViewMode): void
  (event: 'update:committeeLanguage', value: StudyLanguageDto): void
  (event: 'update:committeeStudyProgramType', value: StudyProgramTypeDto): void
  (event: 'addStudent' | 'addPause' | 'addInvigilator'): void
}>()

const labels = computed(() => props.committeeLabels)

const hasSelectedCommittee = computed(() => Boolean(props.selectedCommittee))
const isInvigilatorsEmpty = computed(() => hasSelectedCommittee.value && props.invigilators.length < 1)
const thesisTitleDisplayMode = computed<ScheduleDraftThesisTitleDisplayMode>(() => props.thesisTitleDisplayMode)
const tableViewMode = computed<EditorStudentsTableViewMode>(() => props.tableViewMode)

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

function setThesisTitleDisplayMode(mode: ScheduleDraftThesisTitleDisplayMode): void {
  emit('update:thesisTitleDisplayMode', mode)
}

function setTableViewMode(mode: EditorStudentsTableViewMode): void {
  emit('update:tableViewMode', mode)
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
          :rename-committee-label="labels.renameCommitteeAction"
          :delete-committee-label="labels.deleteCommitteeAction"
          :rename-committee-aria-label="labels.renameCommitteeAria"
          :delete-committee-aria-label="labels.deleteCommitteeAria"
          :has-committee="hasSelectedCommittee"
          @rename-committee="requestRenameCommittee"
          @delete-committee="requestDeleteCommittee"
        />

        <div class="text-muted flex flex-wrap items-stretch gap-2">
          <EditorCommitteeBasicsCard
            class="self-stretch"
            :selected-committee="props.selectedCommittee"
            :selected-committee-date="props.selectedCommitteeDate"
            :date-label="labels.date"
            :room-label="labels.room"
            :preparation-room-label="labels.preparationRoom"
            :language-label="labels.language"
            :language-czech-label="labels.languageCzech"
            :language-english-label="labels.languageEnglish"
            :secretary-label="labels.secretary"
            :show-preparation-room-field="false"
            @committee-string-field="forwardStringField"
            @update:committee-date="emit('update:committeeDate', $event)"
            @update:committee-language="emit('update:committeeLanguage', $event)"
          />

          <EditorCommitteeStudyProgramCard
            class="self-stretch"
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
            class="self-stretch"
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
            class="self-stretch"
            :selected-committee="props.selectedCommittee"
            :preparation-room-label="labels.preparationRoom"
            :invigilators="props.invigilators"
            :invigilators-count-label="props.invigilatorsCountLabel"
            :add-action-label="props.invigilatorLabels.addAction"
            :delete-invigilator-aria-label="props.invigilatorLabels.deleteAria"
            :is-invigilators-empty="isInvigilatorsEmpty"
            @committee-string-field="forwardStringField"
            @add-invigilator="emit('addInvigilator')"
            @delete-invigilator="emit('deleteInvigilator', $event)"
          />
        </div>

        <div class="border-default w-full min-w-0 border-t pt-3">
          <div class="flex w-full min-w-0 flex-wrap items-center justify-between gap-3">
            <EditorCommitteeStartTimeRow
              :selected-committee="props.selectedCommittee"
              :start-time-label="labels.startTime"
              :start-time-hour-label="labels.startTimeHour"
              :start-time-minute-label="labels.startTimeMinute"
              @update:committee-start-minute="emit('update:committeeStartMinute', $event)"
            />

            <div aria-hidden="true" class="border-default hidden h-8 border-l sm:block" />

            <UButton
              color="primary"
              variant="soft"
              size="md"
              icon="i-lucide-user-plus"
              class="ring-primary/35 hover:ring-primary/55 min-w-0 shrink-0 cursor-pointer whitespace-nowrap ring-2"
              :aria-label="labels.addStudentAria"
              :disabled="!hasSelectedCommittee"
              @click="emit('addStudent')"
            >
              {{ labels.addStudentAction }}
            </UButton>

            <UButton
              color="primary"
              variant="soft"
              size="md"
              icon="i-lucide-hourglass"
              class="ring-primary/35 hover:ring-primary/55 min-w-0 shrink-0 cursor-pointer whitespace-nowrap ring-2"
              :aria-label="labels.addPauseAria"
              :disabled="!hasSelectedCommittee"
              @click="emit('addPause')"
            >
              {{ labels.addPauseAction }}
            </UButton>

            <UPopover :content="{ side: 'bottom', align: 'end' }" class="ml-auto">
              <UButton
                color="neutral"
                variant="ghost"
                size="md"
                icon="i-lucide-sliders-horizontal"
                class="bg-default min-w-0 shrink-0 cursor-pointer justify-center whitespace-nowrap ring-2 ring-slate-400/70 hover:bg-slate-100 hover:ring-slate-500 dark:ring-slate-500/80 dark:hover:bg-slate-800/45 dark:hover:ring-slate-400"
              >
                {{ labels.columnDisplaySettingsAction }}
              </UButton>

              <template #content>
                <div class="w-88 max-w-[90vw] space-y-4 p-3">
                  <div class="space-y-2">
                    <span class="text-sm font-medium whitespace-nowrap">{{ labels.thesisTitleDisplayMode }}:</span>
                    <div class="border-default flex min-w-0 items-center gap-1 rounded-md border p-1">
                      <UButton
                        color="primary"
                        size="xs"
                        :variant="thesisTitleDisplayMode === 'AUTO' ? 'solid' : 'ghost'"
                        class="min-w-0 flex-1 cursor-pointer justify-center whitespace-nowrap"
                        @click="setThesisTitleDisplayMode('AUTO')"
                      >
                        {{ labels.thesisTitleDisplayModeAuto }}
                      </UButton>
                      <UButton
                        color="primary"
                        size="xs"
                        :variant="thesisTitleDisplayMode === 'BOTH' ? 'solid' : 'ghost'"
                        class="min-w-0 flex-1 cursor-pointer justify-center whitespace-nowrap"
                        @click="setThesisTitleDisplayMode('BOTH')"
                      >
                        {{ labels.thesisTitleDisplayModeBoth }}
                      </UButton>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <span class="text-sm font-medium whitespace-nowrap">{{ labels.tableViewMode }}:</span>
                    <div class="border-default flex min-w-0 items-center gap-1 rounded-md border p-1">
                      <UButton
                        color="primary"
                        size="xs"
                        :variant="tableViewMode === 'OPTIMIZED' ? 'solid' : 'ghost'"
                        class="min-w-0 flex-1 cursor-pointer justify-center whitespace-nowrap"
                        @click="setTableViewMode('OPTIMIZED')"
                      >
                        {{ labels.tableViewModeOptimized }}
                      </UButton>
                      <UButton
                        color="primary"
                        size="xs"
                        :variant="tableViewMode === 'MAXIMIZED' ? 'solid' : 'ghost'"
                        class="min-w-0 flex-1 cursor-pointer justify-center whitespace-nowrap"
                        @click="setTableViewMode('MAXIMIZED')"
                      >
                        {{ labels.tableViewModeMaximized }}
                      </UButton>
                    </div>
                  </div>
                </div>
              </template>
            </UPopover>
          </div>
        </div>
      </div>
    </template>

    <EditorStudentsSortableTable
      :key="committeeLocalId"
      :committee-local-id="committeeLocalId"
      :model-value="props.students"
      :columns="props.columns"
      :empty-labels="props.studentsEmpty"
      :highlight-request="props.highlightRequest"
      @update:model-value="emit('update:students', $event)"
      @edit-pause="emit('editPause', $event)"
      @request-delete-item="emit('requestDeleteItem', $event)"
      @request-move-student="emit('requestMoveStudent', $event)"
    />
  </UCard>
</template>
