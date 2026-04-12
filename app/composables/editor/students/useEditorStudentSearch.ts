import { EDITOR_STUDENT_SEARCH_DEBOUNCE_MS } from '~/constants/editor-student-search'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import type { EditorStudentHighlightRequest, EditorStudentSearchResult } from '~/types/editor'
import { buildEditorCommitteeListEntries } from '~/utils/editor/draft-committee'
import { buildStudentSearchIndexEntries, normalizeStudentSearchText } from '~/utils/editor/student-search'

/**
 * Local student search over current draft (name / surname / email), with committee navigation.
 */
export function useEditorStudentSearch(selectedCommitteeId: Ref<string>) {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()

  const isStudentSearchDialogOpen = ref(false)
  const studentSearchQuery = ref('')
  const appliedStudentSearchQuery = ref('')
  const isStudentSearchLoading = ref(false)
  const highlightRequest = ref<EditorStudentHighlightRequest | null>(null)
  const highlightRequestCounter = ref(0)
  let studentSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  const fallbackCommitteeLabel = computed(() => t('editor.untitled'))

  function clearStudentSearchDebounceTimer(): void {
    if (studentSearchDebounceTimer !== null) {
      clearTimeout(studentSearchDebounceTimer)
      studentSearchDebounceTimer = null
    }
  }

  function applyStudentSearchQuery(nextQuery: string): void {
    appliedStudentSearchQuery.value = nextQuery
    isStudentSearchLoading.value = false
    studentSearchDebounceTimer = null
  }

  function resetStudentSearchState(): void {
    clearStudentSearchDebounceTimer()
    studentSearchQuery.value = ''
    appliedStudentSearchQuery.value = ''
    isStudentSearchLoading.value = false
  }

  watch(isStudentSearchDialogOpen, (isOpen) => {
    if (!isOpen) {
      resetStudentSearchState()
    }
  })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      clearStudentSearchDebounceTimer()
    })
  }

  const searchIndex = computed(() => {
    const draftCommittees = scheduleDraftStore.draft?.committees ?? []
    const committeeEntries = buildEditorCommitteeListEntries(draftCommittees, fallbackCommitteeLabel.value)

    return committeeEntries.flatMap((committeeEntry) => {
      return buildStudentSearchIndexEntries(committeeEntry.committee, committeeEntry.label, committeeEntry.dateLabel)
    })
  })

  const normalizedSearchQuery = computed(() => normalizeStudentSearchText(appliedStudentSearchQuery.value))

  const studentSearchResults = computed<EditorStudentSearchResult[]>(() => {
    const normalizedQuery = normalizedSearchQuery.value
    const filteredEntries =
      normalizedQuery.length < 1
        ? searchIndex.value
        : searchIndex.value.filter((entry) => entry.searchValue.includes(normalizedQuery))

    return filteredEntries.map((entry) => ({
      studentId: entry.studentId,
      committeeId: entry.committeeId,
      fullName: entry.fullName,
      email: entry.email,
      committeeLabel: entry.committeeLabel,
      committeeDateLabel: entry.committeeDateLabel,
      orderLabel: t('editor.studentSearch.results.order', { order: entry.orderNumber })
    }))
  })

  function openStudentSearchDialog(): void {
    isStudentSearchDialogOpen.value = true
    applyStudentSearchQuery(studentSearchQuery.value)
  }

  function closeStudentSearchDialog(): void {
    isStudentSearchDialogOpen.value = false
    resetStudentSearchState()
  }

  function updateStudentSearchQuery(nextQuery: string): void {
    if (nextQuery === studentSearchQuery.value) {
      return
    }

    studentSearchQuery.value = nextQuery
    isStudentSearchLoading.value = true
    clearStudentSearchDebounceTimer()
    studentSearchDebounceTimer = setTimeout(() => {
      applyStudentSearchQuery(nextQuery)
    }, EDITOR_STUDENT_SEARCH_DEBOUNCE_MS)
  }

  function focusStudentInCommittee(committeeId: string, studentId: string): void {
    selectedCommitteeId.value = committeeId
    const nextRequestId = highlightRequestCounter.value + 1

    void nextTick(() => {
      highlightRequestCounter.value = nextRequestId
      highlightRequest.value = {
        requestId: nextRequestId,
        committeeId,
        studentId
      }
    })
  }

  function selectStudentSearchResult(result: EditorStudentSearchResult): void {
    closeStudentSearchDialog()
    focusStudentInCommittee(result.committeeId, result.studentId)
  }

  return {
    isStudentSearchDialogOpen,
    studentSearchQuery,
    isStudentSearchLoading,
    studentSearchResults,
    highlightRequest,
    openStudentSearchDialog,
    closeStudentSearchDialog,
    updateStudentSearchQuery,
    focusStudentInCommittee,
    selectStudentSearchResult
  }
}
