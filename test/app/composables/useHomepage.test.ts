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

describe('useHomepage submitCreatePlanImport', () => {
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
    const { useHomepage } = await import('~/composables/useHomepage')
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

    homepage.isCreatePlanNameDialogOpen.value = true
    homepage.newPlanNameInput.value = 'SZZ plán'
    await homepage.submitCreatePlanImport({
      payload,
      szzType: 'BACHELOR'
    })

    expect(mapImportPayloadToDraftSourceMock).toHaveBeenCalledTimes(1)
    const firstMappingCall = mapImportPayloadToDraftSourceMock.mock.calls[0]?.[0]
    expect(firstMappingCall?.planName).toBe('SZZ plán')
    expect(firstMappingCall?.szzType).toBe('BACHELOR')
    expect(firstMappingCall?.payload).toBeTruthy()
    expect(firstMappingCall?.payload).not.toBe(payload)
    expect(scheduleDraftStoreMock.initializeFromSource).toHaveBeenCalledTimes(1)
    expect(homepage.isCreatePlanNameDialogOpen.value).toBe(false)
    expect(homepage.newPlanNameError.value).toBeNull()
    expect(homepage.isCreatingNewPlan.value).toBe(false)
    expect(homepage.isImportMappingErrorDialogOpen.value).toBe(false)
    expect(navigateToMock).toHaveBeenCalledWith('/editor')
  })

  it('does not map import payload when plan name is invalid', async () => {
    const { useHomepage } = await import('~/composables/useHomepage')
    const homepage = useHomepage()
    const payload = createImportPayload()

    homepage.isCreatePlanNameDialogOpen.value = true
    homepage.newPlanNameInput.value = '   '
    await homepage.submitCreatePlanImport({
      payload,
      szzType: 'MASTER'
    })

    expect(mapImportPayloadToDraftSourceMock).not.toHaveBeenCalled()
    expect(scheduleDraftStoreMock.initializeFromSource).not.toHaveBeenCalled()
    expect(homepage.isCreatePlanNameDialogOpen.value).toBe(true)
    expect(homepage.isCreatingNewPlan.value).toBe(false)
  })

  it('opens mapping error dialog when mapping fails', async () => {
    const { useHomepage } = await import('~/composables/useHomepage')
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

    homepage.isCreatePlanNameDialogOpen.value = true
    homepage.newPlanNameInput.value = 'SZZ plán'
    await homepage.submitCreatePlanImport({
      payload,
      szzType: 'BACHELOR'
    })

    expect(scheduleDraftStoreMock.initializeFromSource).not.toHaveBeenCalled()
    expect(homepage.isImportMappingErrorDialogOpen.value).toBe(true)
    expect(homepage.importMappingError.value?.code).toBe('STUDENT_MATCH_NOT_FOUND')
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('ignores import submit while another open-plan operation is running', async () => {
    const { useHomepage } = await import('~/composables/useHomepage')
    const homepage = useHomepage()
    const payload = createImportPayload()

    homepage.isCreatePlanNameDialogOpen.value = true
    homepage.newPlanNameInput.value = 'SZZ plán'
    homepage.isOpeningRecentPlan.value = true

    await homepage.submitCreatePlanImport({
      payload,
      szzType: 'BACHELOR'
    })

    expect(mapImportPayloadToDraftSourceMock).not.toHaveBeenCalled()
    expect(homepage.isCreatePlanNameDialogOpen.value).toBe(true)
    expect(homepage.isCreatingNewPlan.value).toBe(false)
  })
})

describe('useHomepage browse plans pagination', () => {
  beforeEach(() => {
    requestFetchMock.mockReset()
  })

  it('loads first page for manual and auto plans when browse dialog opens', async () => {
    requestFetchMock.mockImplementation(async (url: string) => {
      if (url.includes('type=MANUAL') && url.includes('page=1')) {
        return Array.from({ length: 20 }, (_, index) => createTimeScheduleListItem(index + 1, 'MANUAL'))
      }

      if (url.includes('type=AUTO') && url.includes('page=1')) {
        return Array.from({ length: 4 }, (_, index) => createTimeScheduleListItem(index + 1, 'AUTO'))
      }

      throw new Error(`Unexpected request URL: ${url}`)
    })

    const { useHomepage } = await import('~/composables/useHomepage')
    const homepage = useHomepage()

    homepage.requestBrowsePlans()

    await vi.waitFor(() => {
      expect(requestFetchMock).toHaveBeenCalledTimes(2)
      expect(homepage.isBrowsePlansLoading.value).toBe(false)
    })

    expect(homepage.isBrowsePlansDialogOpen.value).toBe(true)
    expect(homepage.manualDrafts.value).toHaveLength(20)
    expect(homepage.autoDrafts.value).toHaveLength(4)
    expect(homepage.hasMoreManualDrafts.value).toBe(true)
    expect(homepage.hasMoreAutoDrafts.value).toBe(false)
  })

  it('appends next manual page when loading more plans', async () => {
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

    const { useHomepage } = await import('~/composables/useHomepage')
    const homepage = useHomepage()

    homepage.requestBrowsePlans()

    await vi.waitFor(() => {
      expect(homepage.hasMoreManualDrafts.value).toBe(true)
      expect(homepage.manualDrafts.value).toHaveLength(20)
    })

    homepage.loadMoreManualDrafts()

    await vi.waitFor(() => {
      expect(requestFetchMock).toHaveBeenCalledTimes(3)
      expect(homepage.manualDrafts.value).toHaveLength(23)
    })

    const loadMoreRequest = requestFetchMock.mock.calls[2]?.[0] as string
    expect(loadMoreRequest).toContain('type=MANUAL')
    expect(loadMoreRequest).toContain('page=2')
    expect(homepage.hasMoreManualDrafts.value).toBe(false)
    expect(homepage.isManualLoadMoreLoading.value).toBe(false)
  })

  it('refreshes browse plans with debounced search query', async () => {
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
      const { useHomepage } = await import('~/composables/useHomepage')
      const homepage = useHomepage()

      homepage.requestBrowsePlans()
      await flushPromises()

      expect(requestFetchMock).toHaveBeenCalledTimes(2)

      homepage.requestBrowsePlansSearch('alpha query')
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
