<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { t } = useI18n()
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
          <p class="text-muted text-lg">
            {{ t('teachersDictionary.page.descriptionParagraph1') }}
          </p>
          <p class="text-muted text-lg">
            {{ t('teachersDictionary.page.descriptionParagraph2Lead') }}
          </p>
          <p class="text-highlighted text-lg font-semibold">
            {{ t('teachersDictionary.page.descriptionParagraph2Bold') }}
          </p>
        </div>
      </header>

      <TeachersDictionaryCsvImportCard />
      <p class="text-muted text-lg">
        {{ t('teachersDictionary.page.descriptionParagraph3Lead') }}
      </p>
      <p class="text-highlighted text-lg font-semibold">
        {{ t('teachersDictionary.page.descriptionParagraph3Bold') }}
      </p>
      <TeachersDictionaryCustomEntriesCard />
    </section>
  </UContainer>
</template>
