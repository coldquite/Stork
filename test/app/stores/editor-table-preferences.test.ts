import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorTablePreferencesStore } from '~/stores/editor-table-preferences'

describe('useEditorTablePreferencesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('uses maximized table view and BOTH thesis title mode by default', () => {
    const store = useEditorTablePreferencesStore()

    expect(store.tableViewMode).toBe('MAXIMIZED')
    expect(store.thesisTitleDisplayMode).toBe('BOTH')
  })

  it('updates both preferences with valid values', () => {
    const store = useEditorTablePreferencesStore()

    store.setTableViewMode('MAXIMIZED')
    store.setThesisTitleDisplayMode('BOTH')

    expect(store.tableViewMode).toBe('MAXIMIZED')
    expect(store.thesisTitleDisplayMode).toBe('BOTH')
  })
})
