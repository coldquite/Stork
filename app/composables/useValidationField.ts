import type { Ref } from 'vue'

/**
 * Clears a validation error when the bound field value changes (e.g. user edits modal input after an error).
 * Single place to extend with analytics or shared UX rules later.
 */
export function useValidationField(fieldRef: Ref<string>, errorRef: Ref<string | null>): void {
  watch(fieldRef, () => {
    if (errorRef.value !== null) {
      errorRef.value = null
    }
  })
}
