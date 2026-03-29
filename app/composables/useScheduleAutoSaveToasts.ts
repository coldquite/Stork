import { useScheduleDraftStore } from '~/stores/schedule-draft'

export function useScheduleAutoSaveToasts(): void {
  const { t } = useI18n()
  const toast = useToast()
  const scheduleDraftStore = useScheduleDraftStore()

  watch(
    () => scheduleDraftStore.lastAutoSaveAt,
    (nextValue, previousValue) => {
      if (!nextValue || nextValue === previousValue) {
        return
      }

      toast.add({
        title: t('editor.autosave.toast.successTitle'),
        description: t('editor.autosave.toast.successDescription'),
        color: 'primary',
        icon: 'i-lucide-cloud-upload'
      })
    }
  )

  watch(
    () => scheduleDraftStore.autoSaveErrorCode,
    (nextValue, previousValue) => {
      if (!nextValue || nextValue === previousValue) {
        return
      }

      toast.add({
        title: t('editor.autosave.toast.errorTitle'),
        description: t('editor.autosave.toast.errorRequestFailedDescription'),
        color: 'error',
        icon: 'i-lucide-cloud-alert'
      })
    }
  )
}
