<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { t } = useI18n()
const pageDescriptionParagraphs = computed<string[]>(() => [
  t('teachersDictionary.page.descriptionParagraph1'),
  t('teachersDictionary.page.descriptionParagraph2'),
  t('teachersDictionary.page.descriptionParagraph3')
])
</script>

<template>
  <UContainer class="max-w-6xl py-10">
    <section class="space-y-6">
      <header class="space-y-2">
        <div class="flex min-w-0 items-end gap-3">
          <div class="shrink-0 self-center">
            <CommonAppBackToHomepageIconButton :aria-label="t('editor.navigation.backToHomepage')" />
          </div>
          <div class="min-w-0 flex-1">
            <h1 class="whitespace-nowrap">
              {{ t('teachersDictionary.page.title') }}
            </h1>
          </div>
        </div>
        <div class="space-y-3">
          <p v-for="paragraph in pageDescriptionParagraphs" :key="paragraph" class="text-muted text-lg">
            {{ paragraph }}
          </p>
        </div>
      </header>

      <TeachersDictionaryCsvImportCard />
      <TeachersDictionaryCustomEntriesCard />
    </section>
  </UContainer>
</template>
