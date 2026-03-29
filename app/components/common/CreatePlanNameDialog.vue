<script setup lang="ts">
import type { ImportPayload, ImportSzzType } from '~/types/import'

interface CreatePlanNameDialogProps {
  loading: boolean
  maxLength: number
  validationError: string | null
}

const props = defineProps<CreatePlanNameDialogProps>()
const { t } = useI18n()

const open = defineModel<boolean>('open', { default: false })
const name = defineModel<string>('name', { default: '' })
const activeTab = ref<'import' | 'empty'>('import')
const importSzzType = ref<ImportSzzType>('BACHELOR')

const {
  importFileFields,
  importFileStates,
  isImportSubmitDisabled,
  handleImportFileChange,
  buildImportPayload,
  resetImportState
} = useImportForm(importSzzType)

const emit = defineEmits<{
  submit: []
  cancel: []
  submitImport: [payload: { payload: ImportPayload; szzType: ImportSzzType }]
}>()

const tabs = computed(() => {
  return [
    {
      label: t('homepage.actions.create.tabs.import'),
      value: 'import',
      slot: 'import'
    },
    {
      label: t('homepage.actions.create.tabs.empty'),
      value: 'empty',
      slot: 'empty'
    }
  ]
})

const importSzzTypeTabs = computed(() => {
  return [
    {
      label: t('homepage.actions.create.import.szzTypeTabs.bachelor'),
      value: 'BACHELOR',
      slot: 'bachelor'
    },
    {
      label: t('homepage.actions.create.import.szzTypeTabs.master'),
      value: 'MASTER',
      slot: 'master'
    },
    {
      label: t('homepage.actions.create.import.szzTypeTabs.mixed'),
      value: 'MIXED',
      slot: 'mixed'
    }
  ]
})

const isEmptyPlanTabActive = computed(() => activeTab.value === 'empty')
const isImportTabActive = computed(() => activeTab.value === 'import')
const hasImportStateValues = computed(() => {
  return importFileFields.value.some(({ key }) => {
    const state = importFileStates.value[key]
    return Boolean(state.file || state.error || state.isValidating || state.headers || state.rows)
  })
})

const modalDescription = computed(() => {
  if (activeTab.value === 'import') {
    return t('homepage.actions.create.import.description')
  }

  return t('homepage.actions.create.nameDialogDescription')
})

watch(open, (isOpen) => {
  if (isOpen) {
    activeTab.value = 'import'
    importSzzType.value = 'BACHELOR'
    resetImportState()
  }
})

function handleCancel(): void {
  emit('cancel')
}

function handleSubmit(): void {
  if (!isEmptyPlanTabActive.value) {
    return
  }

  emit('submit')
}

function handleImportSubmit(): void {
  if (isImportSubmitDisabled.value) {
    return
  }

  const importPayload = buildImportPayload()
  if (!importPayload) {
    return
  }

  emit('submitImport', {
    payload: importPayload,
    szzType: importSzzType.value
  })
}

function handleClearImportFiles(): void {
  resetImportState()
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('homepage.actions.create.dialogTitle')"
    :description="modalDescription"
    :dismissible="!props.loading"
    :close="{ disabled: props.loading }"
    :ui="{
      content: 'sm:max-w-3xl'
    }"
  >
    <template #body>
      <UTabs v-model="activeTab" :items="tabs">
        <template #import>
          <div class="w-full space-y-4">
            <div class="space-y-2">
              <p class="text-muted text-sm">
                {{ $t('homepage.actions.create.nameDialogTitle') }}
              </p>

              <UInput
                v-model="name"
                class="w-full"
                :autofocus="isImportTabActive"
                :placeholder="$t('homepage.actions.create.namePlaceholder')"
                :disabled="props.loading"
                :maxlength="props.maxLength"
              />

              <p v-if="props.validationError" class="text-error text-base">
                {{ props.validationError }}
              </p>
            </div>

            <div class="space-y-3 pt-4">
              <div class="space-y-2">
                <p class="text-muted text-sm">
                  {{ $t('homepage.actions.create.import.szzTypeLabel') }}
                </p>

                <UTabs v-model="importSzzType" :items="importSzzTypeTabs">
                  <template #bachelor />
                  <template #master />
                  <template #mixed />
                </UTabs>
              </div>

              <div class="space-y-1">
                <p class="text-muted text-sm">
                  {{ $t('homepage.actions.create.import.filesHint') }}
                </p>

                <p class="text-muted text-sm">
                  {{ $t('homepage.actions.create.import.filesAutoMappingHint') }}
                </p>
              </div>

              <div
                v-for="field in importFileFields"
                :key="field.key"
                class="border-default space-y-2 rounded-lg border p-3"
              >
                <label :for="`import-file-${field.key}`" class="text-sm font-medium">
                  {{ $t(field.labelKey) }}
                </label>

                <input
                  :id="`import-file-${field.key}`"
                  type="file"
                  accept=".csv,text/csv"
                  class="sr-only"
                  :disabled="props.loading"
                  @change="handleImportFileChange($event, field.key)"
                />

                <label
                  :for="`import-file-${field.key}`"
                  class="bg-elevated border-default group flex items-center gap-3 rounded-md border px-3 py-2 transition-colors"
                  :class="
                    props.loading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-[var(--ui-bg-accented)]'
                  "
                >
                  <span
                    class="border-default rounded-md border px-2 py-1 text-xs font-medium transition-colors"
                    :class="
                      importFileStates[field.key].file
                        ? 'border-[var(--color-stork-500)] bg-[var(--color-stork-500)] text-white group-hover:border-[var(--color-stork-600)] group-hover:bg-[var(--color-stork-600)]'
                        : props.loading
                          ? ''
                          : 'group-hover:border-[var(--ui-border-accented)] group-hover:bg-[var(--ui-bg)]'
                    "
                  >
                    {{ $t('homepage.actions.create.import.chooseFileAction') }}
                  </span>

                  <p
                    class="min-w-0 truncate text-xs"
                    :class="importFileStates[field.key].file ? 'text-highlighted font-semibold' : 'text-muted'"
                  >
                    {{ importFileStates[field.key].file?.name || $t('homepage.actions.create.import.noFileSelected') }}
                  </p>
                </label>

                <p v-if="importFileStates[field.key].isValidating" class="text-muted text-xs">
                  {{ $t('homepage.actions.create.import.validation.validating') }}
                </p>

                <p v-if="importFileStates[field.key].error" class="text-error text-xs">
                  {{ importFileStates[field.key].error }}
                </p>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <div class="w-full space-y-2">
            <p class="text-muted text-sm">
              {{ $t('homepage.actions.create.nameDialogTitle') }}
            </p>

            <UInput
              v-model="name"
              class="w-full"
              :autofocus="isEmptyPlanTabActive"
              :placeholder="$t('homepage.actions.create.namePlaceholder')"
              :disabled="props.loading"
              :maxlength="props.maxLength"
              @keydown.enter="handleSubmit"
            />

            <p v-if="props.validationError" class="text-error text-base">
              {{ props.validationError }}
            </p>
          </div>
        </template>
      </UTabs>
    </template>

    <template #footer>
      <div class="flex w-full items-center">
        <UButton
          v-if="isImportTabActive"
          color="neutral"
          variant="outline"
          icon="i-lucide-trash-2"
          :disabled="props.loading || !hasImportStateValues"
          @click="handleClearImportFiles"
        >
          {{ $t('homepage.actions.create.import.clearFilesAction') }}
        </UButton>

        <div class="ml-auto flex gap-2">
          <UButton color="neutral" variant="ghost" :disabled="props.loading" @click="handleCancel">
            {{ $t('common.confirmDialog.cancel') }}
          </UButton>

          <UButton
            v-if="isEmptyPlanTabActive"
            color="primary"
            variant="solid"
            :loading="props.loading"
            @click="handleSubmit"
          >
            {{ $t('homepage.actions.create.submitAction') }}
          </UButton>

          <UButton
            v-if="isImportTabActive"
            color="primary"
            variant="solid"
            :disabled="isImportSubmitDisabled || props.loading"
            @click="handleImportSubmit"
          >
            {{ $t('homepage.actions.create.import.submitAction') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
