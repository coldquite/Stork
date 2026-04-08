import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorTablePreferencesStore } from '~/stores/editor-table-preferences'

describe('useEditorTablePreferencesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('uses optimized table view and AUTO thesis title mode by default', () => {
    const store = useEditorTablePreferencesStore()

    expect(store.tableViewMode).toBe('OPTIMIZED')
    expect(store.thesisTitleDisplayMode).toBe('AUTO')
  })

  it('updates both preferences with valid values', () => {
    const store = useEditorTablePreferencesStore()

    store.setTableViewMode('MAXIMIZED')
    store.setThesisTitleDisplayMode('BOTH')

    expect(store.tableViewMode).toBe('MAXIMIZED')
    expect(store.thesisTitleDisplayMode).toBe('BOTH')
  })
})
