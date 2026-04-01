import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimeScheduleListItemDto } from '#shared/types/time-schedules'
import type { ImportPayload } from '~/types/import'

const {
  i18nTranslateMock,
  scheduleDraftStoreMock,
  requestFetchMock,
  navigateToMock,
  mapImportPayloadToDraftSourceMock
} = vi.hoisted(() => ({
  i18nTranslateMock: vi.fn((key: string) => key),
  requestFetchMock: vi.fn(),
  navigateToMock: vi.fn(async () => {}),
  mapImportPayloadToDraftSourceMock: vi.fn(),
  scheduleDraftStoreMock: {
    hasDraft: false,
    draft: null,
    lastSavedAt: null,
    initializeNewDraft: vi.fn(),
    initializeFromSource: vi.fn(),
    loadDraftByScheduleId: vi.fn()
  }
}))

mockNuxtImport('useI18n', () => {
  return () => ({
    t: i18nTranslateMock
  })
})

mockNuxtImport('useRequestFetch', () => {
  return () => requestFetchMock
})

mockNuxtImport('navigateTo', () => {
  return navigateToMock
})

vi.mock('~/utils/import-mapper', () => {
  return {
    mapImportPayloadToDraftSource: mapImportPayloadToDraftSourceMock
  }
})

vi.mock('~/stores/schedule-draft', () => {
  return {
    useScheduleDraftStore: () => scheduleDraftStoreMock
  }
})

function createImportPayload(): ImportPayload {
  return {
    committees: {
      fileName: 'komise.csv',
      headers: ['Datum', 'Místo'],
      rows: [{ Datum: '2026-06-15', Místo: 'TH:A-1435' }]
    },
    studentsCap: {
      bachelor: {
        fileName: 'studenti-cap-bc.csv',
        headers: ['Email studenta', 'Studijní plán (název)'],
        rows: [{ 'Email studenta': 'student@fit.cvut.cz', 'Studijní plán (název)': 'Bc. Informatika' }]
      }
    },
    studentsCommittees: {
      bachelor: {
        fileName: 'studenti-komise-bc.csv',
        headers: ['Email adresa', 'St. program - typ'],
        rows: [{ 'Email adresa': 'student@fit.cvut.cz', 'St. program - typ': 'B' }]
      }
    }
  }
}

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

function createTimeScheduleListItem(index: number, type: 'MANUAL' | 'AUTO'): TimeScheduleListItemDto {
  return {
    id: `${type.toLowerCase()}-${index}`,
    name: `${type} plán ${index}`,
    type,
    createdAt: `2026-03-29T00:${String(index).padStart(2, '0')}:00.000Z`,
    counts: {
      committees: 2,
      items: 17,
      students: 15,
      pauses: 2
    }
  }
}

describe('useHomepage submitCreateScheduleImport', () => {
  beforeEach(() => {
    i18nTranslateMock.mockClear()
    requestFetchMock.mockReset()
    requestFetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/api/teachers-dictionary/bulk')) {
        return {
          processed: 0,
          created: 0,
          updated: 0
        }
      }

      if (url === '/api/teachers-dictionary') {
        return []
      }

      throw new Error(`Unexpected request URL: ${url}`)
    })
    navigateToMock.mockReset()
    mapImportPayloadToDraftSourceMock.mockReset()
    scheduleDraftStoreMock.initializeNewDraft.mockReset()
    scheduleDraftStoreMock.initializeFromSource.mockReset()
    scheduleDraftStoreMock.loadDraftByScheduleId.mockReset()
  })

  it('maps import payload, initializes draft and navigates to editor for valid input', async () => {
    const { useHomepage } = await import('~/composables/homepage/useHomepage')
    const homepage = useHomepage()
    const payload = createImportPayload()

    mapImportPayloadToDraftSourceMock.mockReturnValue({
      ok: true,
      draft: {
        name: 'SZZ plán',
        type: 'MANUAL',
        committees: []
      }
    })

    homepage.isCreateScheduleDialogOpen.value = true
    homepage.newScheduleNameInput.value = 'SZZ plán'
    await homepage.submitCreateScheduleImport({
      payload,
      szzType: 'BACHELOR'
    })

    expect(mapImportPayloadToDraftSourceMock).toHaveBeenCalledTimes(1)
    const firstMappingCall = mapImportPayloadToDraftSourceMock.mock.calls[0]?.[0]
    expect(firstMappingCall?.scheduleName).toBe('SZZ plán')
    expect(firstMappingCall?.szzType).toBe('BACHELOR')
    expect(firstMappingCall?.payload).toBeTruthy()
    expect(firstMappingCall?.payload).not.toBe(payload)
    expect(scheduleDraftStoreMock.initializeFromSource).toHaveBeenCalledTimes(1)
    expect(homepage.isCreateScheduleDialogOpen.value).toBe(false)
    expect(homepage.newScheduleNameError.value).toBeNull()
    expect(homepage.isCreatingNewSchedule.value).toBe(false)
    expect(homepage.isImportMappingErrorDialogOpen.value).toBe(false)
    expect(navigateToMock).toHaveBeenCalledWith('/editor')
  })

  it('does not map import payload when schedule name is invalid', async () => {
    const { useHomepage } = await import('~/composables/homepage/useHomepage')
    const homepage = useHomepage()
    const payload = createImportPayload()

    homepage.isCreateScheduleDialogOpen.value = true
    homepage.newScheduleNameInput.value = '   '
    await homepage.submitCreateScheduleImport({
      payload,
      szzType: 'MASTER'
    })

    expect(mapImportPayloadToDraftSourceMock).not.toHaveBeenCalled()
    expect(scheduleDraftStoreMock.initializeFromSource).not.toHaveBeenCalled()
    expect(homepage.isCreateScheduleDialogOpen.value).toBe(true)
    expect(homepage.isCreatingNewSchedule.value).toBe(false)
  })

  it('opens mapping error dialog when mapping fails', async () => {
    const { useHomepage } = await import('~/composables/homepage/useHomepage')
    const homepage = useHomepage()
    const payload = createImportPayload()

    mapImportPayloadToDraftSourceMock.mockReturnValue({
      ok: false,
      error: {
        code: 'STUDENT_MATCH_NOT_FOUND',
        datasetKey: 'studentsCap',
        fileName: 'studenti-cap-bc.csv',
        rowNumber: 12,
        column: 'Email studenta',
        context: {}
      }
    })

    homepage.isCreateScheduleDialogOpen.value = true
    homepage.newScheduleNameInput.value = 'SZZ plán'
    await homepage.submitCreateScheduleImport({
      payload,
      szzType: 'BACHELOR'
    })

    expect(scheduleDraftStoreMock.initializeFromSource).not.toHaveBeenCalled()
    expect(homepage.isImportMappingErrorDialogOpen.value).toBe(true)
    expect(homepage.importMappingError.value?.code).toBe('STUDENT_MATCH_NOT_FOUND')
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('ignores import submit while another open-schedule operation is running', async () => {
    const { useHomepage } = await import('~/composables/homepage/useHomepage')
    const homepage = useHomepage()
    const payload = createImportPayload()

    homepage.isCreateScheduleDialogOpen.value = true
    homepage.newScheduleNameInput.value = 'SZZ plán'
    homepage.isOpeningRecentSchedule.value = true

    await homepage.submitCreateScheduleImport({
      payload,
      szzType: 'BACHELOR'
    })

    expect(mapImportPayloadToDraftSourceMock).not.toHaveBeenCalled()
    expect(homepage.isCreateScheduleDialogOpen.value).toBe(true)
    expect(homepage.isCreatingNewSchedule.value).toBe(false)
  })
})

describe('useHomepage browse schedules pagination', () => {
  beforeEach(() => {
    requestFetchMock.mockReset()
  })

  it('loads first page for manual and auto schedules when browse dialog opens', async () => {
    requestFetchMock.mockImplementation(async (url: string) => {
      if (url.includes('type=MANUAL') && url.includes('page=1')) {
        return Array.from({ length: 20 }, (_, index) => createTimeScheduleListItem(index + 1, 'MANUAL'))
      }

      if (url.includes('type=AUTO') && url.includes('page=1')) {
        return Array.from({ length: 4 }, (_, index) => createTimeScheduleListItem(index + 1, 'AUTO'))
      }

      throw new Error(`Unexpected request URL: ${url}`)
    })

    const { useHomepage } = await import('~/composables/homepage/useHomepage')
    const homepage = useHomepage()

    homepage.requestBrowseSchedules()

    await vi.waitFor(() => {
      expect(requestFetchMock).toHaveBeenCalledTimes(2)
      expect(homepage.isBrowseSchedulesLoading.value).toBe(false)
    })

    expect(homepage.isBrowseSchedulesDialogOpen.value).toBe(true)
    expect(homepage.manualSchedules.value).toHaveLength(20)
    expect(homepage.autoSchedules.value).toHaveLength(4)
    expect(homepage.hasMoreManualSchedules.value).toBe(true)
    expect(homepage.hasMoreAutoSchedules.value).toBe(false)
  })

  it('appends next manual page when loading more schedules', async () => {
    requestFetchMock.mockImplementation(async (url: string) => {
      if (url.includes('type=MANUAL') && url.includes('page=1')) {
        return Array.from({ length: 20 }, (_, index) => createTimeScheduleListItem(index + 1, 'MANUAL'))
      }

      if (url.includes('type=AUTO') && url.includes('page=1')) {
        return []
      }

      if (url.includes('type=MANUAL') && url.includes('page=2')) {
        return Array.from({ length: 3 }, (_, index) => createTimeScheduleListItem(index + 21, 'MANUAL'))
      }

      throw new Error(`Unexpected request URL: ${url}`)
    })

    const { useHomepage } = await import('~/composables/homepage/useHomepage')
    const homepage = useHomepage()

    homepage.requestBrowseSchedules()

    await vi.waitFor(() => {
      expect(homepage.hasMoreManualSchedules.value).toBe(true)
      expect(homepage.manualSchedules.value).toHaveLength(20)
    })

    homepage.loadMoreManualSchedules()

    await vi.waitFor(() => {
      expect(requestFetchMock).toHaveBeenCalledTimes(3)
      expect(homepage.manualSchedules.value).toHaveLength(23)
    })

    const loadMoreRequest = requestFetchMock.mock.calls[2]?.[0] as string
    expect(loadMoreRequest).toContain('type=MANUAL')
    expect(loadMoreRequest).toContain('page=2')
    expect(homepage.hasMoreManualSchedules.value).toBe(false)
    expect(homepage.isManualLoadMoreLoading.value).toBe(false)
  })

  it('refreshes browse schedules with debounced search query', async () => {
    requestFetchMock.mockImplementation(async (url: string) => {
      if (url.includes('type=MANUAL')) {
        return [createTimeScheduleListItem(1, 'MANUAL')]
      }

      if (url.includes('type=AUTO')) {
        return [createTimeScheduleListItem(1, 'AUTO')]
      }

      throw new Error(`Unexpected request URL: ${url}`)
    })

    vi.useFakeTimers()
    try {
      const { useHomepage } = await import('~/composables/homepage/useHomepage')
      const homepage = useHomepage()

      homepage.requestBrowseSchedules()
      await flushPromises()

      expect(requestFetchMock).toHaveBeenCalledTimes(2)

      homepage.requestBrowseSchedulesSearch('alpha query')
      vi.advanceTimersByTime(200)
      await flushPromises()

      expect(requestFetchMock).toHaveBeenCalledTimes(2)

      vi.advanceTimersByTime(50)
      await flushPromises()

      expect(requestFetchMock).toHaveBeenCalledTimes(4)

      const manualSearchCall = requestFetchMock.mock.calls[2]?.[0] as string
      const autoSearchCall = requestFetchMock.mock.calls[3]?.[0] as string
      expect(manualSearchCall).toContain('search=alpha%20query')
      expect(autoSearchCall).toContain('search=alpha%20query')
    } finally {
      vi.useRealTimers()
    }
  })
})
