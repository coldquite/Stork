<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'
import { CONTENT_PAGE_COLLECTIONS } from '~/constants/content-collections'
import { USER_MANUAL_SEARCH_FUSE_OPTIONS } from '~/constants/user-manual-search'

const route = useRoute()
const { t } = useI18n()
const chapterTitleCollator = new Intl.Collator('cs', {
  numeric: true,
  sensitivity: 'base'
})

function toCanonicalPath(path: string): string {
  return path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path
}

const canonicalPath = computed(() => {
  const normalized = toCanonicalPath(route.path)
  return normalized || '/'
})

const pagePathCandidates = computed(() => {
  const candidates = new Set<string>([canonicalPath.value])

  if (canonicalPath.value !== '/') {
    candidates.add(`${canonicalPath.value}/`)
  }

  if (canonicalPath.value === '/user-manual') {
    candidates.add('/user-manual/index')
  }

  return Array.from(candidates)
})

const { data: page } = await useAsyncData(
  () => `user-manual-page:${canonicalPath.value}`,
  async () => {
    for (const path of pagePathCandidates.value) {
      const entry = await queryCollection('manual').path(path).first()
      if (entry) {
        return entry
      }
    }

    return null
  }
)

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Manual page not found', fatal: true })
}

const { data: manualNavigation } = await useAsyncData('user-manual-navigation', () =>
  queryCollectionNavigation('manual')
)

const manualPagesNavigation = computed<ContentNavigationItem[]>(() => {
  const navigation = manualNavigation.value ?? []
  const manualRoot = navigation.find((item) => item.path === '/user-manual')

  if (!manualRoot) {
    return navigation
  }

  const sortedChildren = [...(manualRoot.children ?? [])].sort((a, b) =>
    chapterTitleCollator.compare(a.title ?? '', b.title ?? '')
  )

  return [{ ...manualRoot, children: undefined }, ...sortedChildren]
})

const { data: surround } = await useAsyncData(
  () => `user-manual-surround:${canonicalPath.value}`,
  () => queryCollectionItemSurroundings('manual', canonicalPath.value, { fields: ['description'] })
)

const { data: searchNavigation } = await useAsyncData('content-search-navigation', async () => {
  const collectionsNavigation = await Promise.all(
    CONTENT_PAGE_COLLECTIONS.map((collection) => queryCollectionNavigation(collection))
  )

  return collectionsNavigation.flat()
})

const { data: searchFiles } = useLazyAsyncData(
  'content-search-files',
  async () => {
    const collectionsSections = await Promise.all(
      CONTENT_PAGE_COLLECTIONS.map((collection) => queryCollectionSearchSections(collection))
    )

    return collectionsSections.flat()
  },
  { server: false }
)

const hasToc = computed(() => Boolean(page.value?.body?.toc?.links?.length))
const hasSurround = computed(() => (surround.value ?? []).filter(Boolean).length > 0)

const pageTitle = computed(() => page.value?.title ?? t('userManual.navigation.openPage'))
const pageDescription = computed(() => page.value?.description ?? t('meta.description'))

useSeoMeta({
  title: () => `${pageTitle.value} | ${t('meta.title')}`,
  description: () => pageDescription.value,
  ogTitle: () => `${pageTitle.value} | ${t('meta.title')}`,
  ogDescription: () => pageDescription.value
})
</script>

<template>
  <div>
    <UContainer class="py-10">
      <UPage v-if="page">
        <template #left>
          <UPageAside :ui="{ topHeader: 'rounded-t-3xl' }">
            <template #top>
              <div class="space-y-3">
                <p class="text-highlighted text-sm font-semibold">
                  {{ t('userManual.pages.title') }}
                </p>

                <UContentSearchButton
                  :label="t('userManual.search.buttonLabel')"
                  :collapsed="false"
                  class="w-full"
                  :ui="{ base: 'w-full justify-between' }"
                />
              </div>
            </template>

            <UContentNavigation :navigation="manualPagesNavigation" highlight />
          </UPageAside>
        </template>

        <UPageHeader :title="page.title" :description="page.description" />

        <UPageBody>
          <ContentRenderer :value="page" />

          <USeparator v-if="hasSurround" class="my-8" />
          <UContentSurround v-if="hasSurround" :surround="surround" />
        </UPageBody>

        <template v-if="hasToc" #right>
          <UContentToc
            :title="t('userManual.toc.title')"
            :links="page.body?.toc?.links"
            highlight
            :ui="{
              title: 'truncate text-lg',
              link: 'group relative text-base flex items-center focus-visible:outline-primary py-0.5',
              list: 'min-w-0 border-s-2',
              indicator: 'w-0.5'
            }"
          />
        </template>
      </UPage>
    </UContainer>

    <ClientOnly>
      <LazyUContentSearch
        :title="t('userManual.search.modalTitle')"
        :description="t('userManual.search.modalDescription')"
        :placeholder="t('userManual.search.placeholder')"
        :files="searchFiles"
        :navigation="searchNavigation"
        shortcut="meta_k"
        :fuse="USER_MANUAL_SEARCH_FUSE_OPTIONS"
        :color-mode="false"
      />
    </ClientOnly>
  </div>
</template>

<style scoped>
:deep(table),
:deep(th),
:deep(td) {
  border-color: color-mix(in srgb, var(--ui-primary) 55%, transparent);
}
</style>
