import type { ScheduleDraftThesisTitleDisplayMode } from '~/types/schedule-draft'
import type { EditorStudentsTableViewMode } from '~/types/editor-table-preferences'

/**
 * Stores global editor table UI preferences independent from any particular schedule draft.
 * Values are persisted in localStorage and intentionally survive logout.
 */
export const useEditorTablePreferencesStore = defineStore(
  'editor-table-preferences',
  () => {
    const thesisTitleDisplayMode = ref<ScheduleDraftThesisTitleDisplayMode>('BOTH')
    const tableViewMode = ref<EditorStudentsTableViewMode>('MAXIMIZED')

    function setThesisTitleDisplayMode(nextMode: ScheduleDraftThesisTitleDisplayMode): void {
      if (nextMode !== 'AUTO' && nextMode !== 'BOTH') {
        return
      }

      thesisTitleDisplayMode.value = nextMode
    }

    function setTableViewMode(nextMode: EditorStudentsTableViewMode): void {
      if (nextMode !== 'OPTIMIZED' && nextMode !== 'MAXIMIZED') {
        return
      }

      tableViewMode.value = nextMode
    }

    return {
      thesisTitleDisplayMode,
      tableViewMode,
      setThesisTitleDisplayMode,
      setTableViewMode
    }
  },
  {
    persist: {
      storage: piniaPluginPersistedstate.localStorage(),
      pick: ['thesisTitleDisplayMode', 'tableViewMode']
    }
  }
)
