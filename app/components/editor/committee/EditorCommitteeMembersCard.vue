<script setup lang="ts">
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import type { EditorCommitteeStringFieldPayload } from '~/types/editor'

const props = defineProps<{
  selectedCommittee: ScheduleDraftCommittee | null
  chairLabel: string
  viceChairLabel: string
  member1Label: string
  member2Label: string
  member3Label: string
}>()

const emit = defineEmits<{
  (e: 'committeeStringField', payload: EditorCommitteeStringFieldPayload): void
}>()

const chairInputValue = computed(() => props.selectedCommittee?.chairName ?? '')
const viceChairInputValue = computed(() => props.selectedCommittee?.viceChairName ?? '')
const member1InputValue = computed(() => props.selectedCommittee?.member1Name ?? '')
const member2InputValue = computed(() => props.selectedCommittee?.member2Name ?? '')
const member3InputValue = computed(() => props.selectedCommittee?.member3Name ?? '')

const hasSelectedCommittee = computed(() => Boolean(props.selectedCommittee))
const isEmptyValue = (value: string) => value.trim().length < 1
const isChairInvalid = computed(() => hasSelectedCommittee.value && isEmptyValue(chairInputValue.value))
const isViceChairInvalid = computed(() => hasSelectedCommittee.value && isEmptyValue(viceChairInputValue.value))
const isMember1Invalid = computed(() => hasSelectedCommittee.value && isEmptyValue(member1InputValue.value))
const isMember2Invalid = computed(() => hasSelectedCommittee.value && isEmptyValue(member2InputValue.value))
const isMember3Invalid = computed(() => hasSelectedCommittee.value && isEmptyValue(member3InputValue.value))

const committeeRoleLabelWidthCh = computed(() => {
  const longestLabelLength = Math.max(
    props.chairLabel.length,
    props.viceChairLabel.length,
    props.member1Label.length,
    props.member2Label.length,
    props.member3Label.length
  )
  return longestLabelLength + 1
})
const committeeMemberInputWidthCh = computed(() => {
  const longestMemberLength = Math.max(
    chairInputValue.value.length,
    viceChairInputValue.value.length,
    member1InputValue.value.length,
    member2InputValue.value.length,
    member3InputValue.value.length
  )
  return Math.max(14, longestMemberLength)
})

const invalidInputUi = {
  base: 'ring-2 ring-inset ring-error/70 dark:ring-error/85'
} as const
const inputWidthPadding = '1.25rem + 2px'
const memberInputWidthStyle = computed(() => {
  return {
    width: `calc(${committeeMemberInputWidthCh.value}ch + ${inputWidthPadding})`
  }
})

function emitField(field: EditorCommitteeStringFieldPayload['field'], value: string | number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('committeeStringField', { field, value: String(value) })
}
</script>

<template>
  <div class="border-default w-fit max-w-full min-w-0 rounded-md border p-2">
    <div class="space-y-2">
      <div class="w-fit space-y-2">
        <div class="flex items-center gap-2">
          <span
            class="shrink-0 text-left text-sm whitespace-nowrap"
            :style="{ width: `${committeeRoleLabelWidthCh}ch` }"
          >
            {{ props.chairLabel }}:
          </span>
          <UInput
            :model-value="chairInputValue"
            class="w-auto"
            :style="memberInputWidthStyle"
            :ui="isChairInvalid ? invalidInputUi : undefined"
            placeholder="—"
            :disabled="!props.selectedCommittee"
            @update:model-value="emitField('chair', $event)"
          />
        </div>

        <div class="flex items-center gap-2">
          <span
            class="shrink-0 text-left text-sm whitespace-nowrap"
            :style="{ width: `${committeeRoleLabelWidthCh}ch` }"
          >
            {{ props.viceChairLabel }}:
          </span>
          <UInput
            :model-value="viceChairInputValue"
            class="w-auto"
            :style="memberInputWidthStyle"
            :ui="isViceChairInvalid ? invalidInputUi : undefined"
            placeholder="—"
            :disabled="!props.selectedCommittee"
            @update:model-value="emitField('viceChair', $event)"
          />
        </div>

        <div class="flex items-center gap-2">
          <span
            class="shrink-0 text-left text-sm whitespace-nowrap"
            :style="{ width: `${committeeRoleLabelWidthCh}ch` }"
          >
            {{ props.member1Label }}:
          </span>
          <UInput
            :model-value="member1InputValue"
            class="w-auto"
            :style="memberInputWidthStyle"
            :ui="isMember1Invalid ? invalidInputUi : undefined"
            placeholder="—"
            :disabled="!props.selectedCommittee"
            @update:model-value="emitField('member1', $event)"
          />
        </div>

        <div class="flex items-center gap-2">
          <span
            class="shrink-0 text-left text-sm whitespace-nowrap"
            :style="{ width: `${committeeRoleLabelWidthCh}ch` }"
          >
            {{ props.member2Label }}:
          </span>
          <UInput
            :model-value="member2InputValue"
            class="w-auto"
            :style="memberInputWidthStyle"
            :ui="isMember2Invalid ? invalidInputUi : undefined"
            placeholder="—"
            :disabled="!props.selectedCommittee"
            @update:model-value="emitField('member2', $event)"
          />
        </div>

        <div class="flex items-center gap-2">
          <span
            class="shrink-0 text-left text-sm whitespace-nowrap"
            :style="{ width: `${committeeRoleLabelWidthCh}ch` }"
          >
            {{ props.member3Label }}:
          </span>
          <UInput
            :model-value="member3InputValue"
            class="w-auto"
            :style="memberInputWidthStyle"
            :ui="isMember3Invalid ? invalidInputUi : undefined"
            placeholder="—"
            :disabled="!props.selectedCommittee"
            @update:model-value="emitField('member3', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
