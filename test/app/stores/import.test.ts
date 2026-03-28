import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useImportStore } from '~/stores/import'
import type { ImportPayload } from '~/types/import'

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

describe('useImportStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores and clears imported draft', () => {
    const store = useImportStore()
    const payload = createImportPayload()

    store.setImportedPlanDraft('SZZ plan', 'BACHELOR', payload)

    expect(store.hasImportedPlanDraft).toBe(true)
    expect(store.importedPlanDraft?.planName).toBe('SZZ plan')
    expect(store.importedPlanDraft?.szzType).toBe('BACHELOR')
    expect(store.importedPlanDraft?.payload.committees.fileName).toBe('komise.csv')

    store.clearImportedPlanDraft()

    expect(store.hasImportedPlanDraft).toBe(false)
    expect(store.importedPlanDraft).toBeNull()
  })

  it('deep-clones payload when saving draft', () => {
    const store = useImportStore()
    const payload = createImportPayload()

    store.setImportedPlanDraft('Draft', 'BACHELOR', payload)
    payload.committees.rows[0]!.Místo = 'CHANGED'

    expect(store.importedPlanDraft?.payload.committees.rows[0]!.Místo).toBe('TH:A-1435')
  })
})
