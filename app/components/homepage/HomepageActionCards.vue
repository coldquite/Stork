<script setup lang="ts">
interface HomepageActionCardsProps {
  restoreDraftLine: string
  restoreDraftUpdatedLine: string
  showRestoreCard: boolean
}

defineProps<HomepageActionCardsProps>()
const emit = defineEmits<{ createClick: []; browseClick: []; restoreClick: [] }>()

function handleCreateClick(): void {
  emit('createClick')
}

function handleBrowseClick(): void {
  emit('browseClick')
}

function handleRestoreClick(): void {
  emit('restoreClick')
}
</script>

<template>
  <section class="mb-8 grid gap-6 md:grid-cols-2">
    <UCard
      class="group border-primary/85 hover:border-primary hover:bg-primary/10 dark:hover:bg-primary/15 cursor-pointer border-[3px] border-dashed transition-colors duration-300 ease-out"
      @click="handleCreateClick"
    >
      <div class="flex flex-col items-center py-6 text-center">
        <div
          class="bg-primary/20 group-hover:bg-primary/30 dark:bg-primary/10 dark:group-hover:bg-primary/20 mb-4 flex size-16 items-center justify-center rounded-full transition-colors duration-300 ease-out"
        >
          <UIcon name="i-lucide-plus" class="text-primary size-8" />
        </div>
        <h2 class="mb-2 text-xl font-semibold">
          {{ $t('homepage.actions.create.title') }}
        </h2>
        <p class="text-muted">
          {{ $t('homepage.actions.create.description') }}
        </p>
      </div>
    </UCard>

    <UCard
      class="group border-secondary-400/85 hover:border-secondary-500 hover:bg-secondary-50 dark:hover:bg-secondary-500/25 cursor-pointer border-[3px] transition-colors duration-300 ease-out"
      @click="handleBrowseClick"
    >
      <div class="flex flex-col items-center py-6 text-center">
        <div
          class="bg-secondary-200 group-hover:bg-secondary-300 dark:bg-secondary-100 dark:group-hover:bg-secondary-300 mb-4 flex size-16 items-center justify-center rounded-full transition-colors duration-300 ease-out"
        >
          <UIcon name="i-lucide-folder-open" class="text-secondary-800 size-8" />
        </div>
        <h2 class="mb-2 text-xl font-semibold transition-colors duration-300 ease-out">
          {{ $t('homepage.actions.browse.title') }}
        </h2>
        <p class="text-muted group-hover:text-default transition-colors duration-300 ease-out">
          {{ $t('homepage.actions.browse.description') }}
        </p>
      </div>
    </UCard>
  </section>

  <ClientOnly>
    <section v-if="showRestoreCard" class="mb-8">
      <UCard
        class="group bg-success/10 border-success/80 hover:border-success hover:bg-success/15 cursor-pointer border-2 transition-colors duration-300 ease-out"
        @click="handleRestoreClick"
      >
        <div class="flex flex-col items-center py-6 text-center">
          <div
            class="bg-success/25 group-hover:bg-success/35 dark:bg-success/15 dark:group-hover:bg-success/25 mb-4 flex size-16 items-center justify-center rounded-full transition-colors duration-300 ease-in-out"
          >
            <UIcon
              name="i-lucide-rotate-ccw"
              class="text-success size-8 drop-shadow-[0_1px_0_rgba(10,74,43,0.35)] dark:drop-shadow-none"
            />
          </div>
          <h2 class="mb-2 text-xl font-semibold">
            {{ $t('homepage.actions.restore.title') }}
          </h2>
          <p class="text-muted">
            {{ restoreDraftLine }}
          </p>
          <p class="text-muted">
            {{ restoreDraftUpdatedLine }}
          </p>
        </div>
      </UCard>
    </section>
  </ClientOnly>
</template>
