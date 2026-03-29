import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImportPayload } from '~/types/import'

const { i18nTranslateMock, importStoreMock, scheduleDraftStoreMock } = vi.hoisted(() => ({
  i18nTranslateMock: vi.fn((key: string) => key),
  importStoreMock: {
    setImportedPlanDraft: vi.fn()
  },
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

describe('useHomepage submitCreatePlanImport', () => {
  beforeEach(() => {
    i18nTranslateMock.mockClear()
    importStoreMock.setImportedPlanDraft.mockReset()
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
