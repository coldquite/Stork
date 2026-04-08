import type { ScheduleDraftThesisTitleDisplayMode } from '~/types/schedule-draft'

export type EditorStudentsTableViewMode = 'OPTIMIZED' | 'MAXIMIZED'

export interface EditorTablePreferencesState {
  thesisTitleDisplayMode: ScheduleDraftThesisTitleDisplayMode
  tableViewMode: EditorStudentsTableViewMode
}
