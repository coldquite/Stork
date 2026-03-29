import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimeScheduleListItemDto } from '#shared/types/time-schedules'
import type { ImportPayload } from '~/types/import'

const { i18nTranslateMock, importStoreMock, scheduleDraftStoreMock, requestFetchMock } = vi.hoisted(() => ({
  i18nTranslateMock: vi.fn((key: string) => key),
  importStoreMock: {
    setImportedPlanDraft: vi.fn()
  },
  requestFetchMock: vi.fn(),
  scheduleDraftStoreMock: {
    hasDraft: false,
    draft: null,
    lastSavedAt: null,
    initializeNewDraft: vi.fn(),
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

vi.mock('~/stores/import', () => {
  return {
    useImportStore: () => importStoreMock
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
    importStoreMock.setImportedPlanDraft.mockReset()
    requestFetchMock.mockReset()
    scheduleDraftStoreMock.initializeNewDraft.mockReset()
    scheduleDraftStoreMock.loadDraftByScheduleId.mockReset()
  })

  it('stores import draft and closes create-plan dialog for valid input', async () => {
    const { useHomepage } = await import('~/composables/useHomepage')
    const homepage = useHomepage()
    const payload = createImportPayload()

    homepage.isCreatePlanNameDialogOpen.value = true
    homepage.newPlanNameInput.value = 'SZZ plán'
    homepage.submitCreatePlanImport({
      payload,
      szzType: 'BACHELOR'
    })

    expect(importStoreMock.setImportedPlanDraft).toHaveBeenCalledTimes(1)
    expect(importStoreMock.setImportedPlanDraft).toHaveBeenCalledWith('SZZ plán', 'BACHELOR', payload)
    expect(homepage.isCreatePlanNameDialogOpen.value).toBe(false)
    expect(homepage.newPlanNameError.value).toBeNull()
    expect(homepage.isCreatingNewPlan.value).toBe(false)
  })

  it('does not store import draft when plan name is invalid', async () => {
    const { useHomepage } = await import('~/composables/useHomepage')
    const homepage = useHomepage()
    const payload = createImportPayload()

    homepage.isCreatePlanNameDialogOpen.value = true
    homepage.newPlanNameInput.value = '   '
    homepage.submitCreatePlanImport({
      payload,
      szzType: 'MASTER'
    })

    expect(importStoreMock.setImportedPlanDraft).not.toHaveBeenCalled()
    expect(homepage.newPlanNameError.value).toBe('homepage.actions.create.validation.required')
    expect(homepage.isCreatePlanNameDialogOpen.value).toBe(true)
    expect(homepage.isCreatingNewPlan.value).toBe(false)
  })

  it('ignores import submit while another open-plan operation is running', async () => {
    const { useHomepage } = await import('~/composables/useHomepage')
    const homepage = useHomepage()
    const payload = createImportPayload()

    homepage.isCreatePlanNameDialogOpen.value = true
    homepage.newPlanNameInput.value = 'SZZ plán'
    homepage.isOpeningRecentPlan.value = true

    homepage.submitCreatePlanImport({
      payload,
      szzType: 'BACHELOR'
    })

    expect(importStoreMock.setImportedPlanDraft).not.toHaveBeenCalled()
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
})
