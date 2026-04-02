import type { GetTeachersDictionaryMetadataResponseDto } from '#shared/types/teachers-dictionary'

interface UseTeachersDictionaryMetadataOptions {
  asyncKey: string
  isCustom: boolean
  lastUpdatedNeverI18nKey: string
}

function buildTeachersDictionaryMetadataEndpoint(isCustom: boolean): string {
  const query = new URLSearchParams({
    isCustom: String(isCustom),
    metadataOnly: 'true'
  })

  return `/api/teachers-dictionary?${query.toString()}`
}

export function useTeachersDictionaryMetadata(options: UseTeachersDictionaryMetadataOptions) {
  const { t } = useI18n()
  const requestFetch = useRequestFetch()
  const dateFormatter = new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'medium',
    timeZone: 'Europe/Prague'
  })

  const endpoint = buildTeachersDictionaryMetadataEndpoint(options.isCustom)
  const { data, status, refresh } = useAsyncData<GetTeachersDictionaryMetadataResponseDto>(options.asyncKey, () =>
    requestFetch<GetTeachersDictionaryMetadataResponseDto>(endpoint)
  )

  const metadata = computed<GetTeachersDictionaryMetadataResponseDto>(() => {
    return (
      data.value ?? {
        count: 0,
        lastUpdatedAt: null
      }
    )
  })

  function formatLastUpdatedAt(value: string | null): string {
    if (value === null) {
      return t(options.lastUpdatedNeverI18nKey)
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return t(options.lastUpdatedNeverI18nKey)
    }

    return dateFormatter.format(date)
  }

  return {
    metadata,
    metadataStatus: status,
    refreshMetadata: refresh,
    formatLastUpdatedAt
  }
}
