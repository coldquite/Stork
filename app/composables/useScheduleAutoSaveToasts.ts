import { useScheduleDraftStore } from '~/stores/schedule-draft'

export function useScheduleAutoSaveToasts(): void {
  const { t } = useI18n()
  const toast = useToast()
  const scheduleDraftStore = useScheduleDraftStore()

  watch(
    () => [scheduleDraftStore.lastSavedAt, scheduleDraftStore.lastSavedType] as const,
    ([nextSavedAt, nextSavedType], [previousSavedAt, previousSavedType]) => {
      if (!nextSavedAt || !nextSavedType) {
        return
      }

      if (nextSavedAt === previousSavedAt && nextSavedType === previousSavedType) {
        return
      }

      const successTitleKey =
        nextSavedType === 'MANUAL'
          ? 'editor.schedule.cloudSave.toast.successTitle'
          : 'editor.autosave.toast.successTitle'
      const successDescriptionKey =
        nextSavedType === 'MANUAL'
          ? 'editor.schedule.cloudSave.toast.successDescription'
          : 'editor.autosave.toast.successDescription'

      toast.add({
        title: t(successTitleKey),
        description: t(successDescriptionKey),
        color: 'success',
        icon: 'i-lucide-cloud-upload',
        duration: 10_000
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
        icon: 'i-lucide-cloud-alert',
        duration: 10_000
      })
    }
  )

  watch(
    () => scheduleDraftStore.manualSaveErrorCode,
    (nextValue, previousValue) => {
      if (!nextValue || nextValue === previousValue) {
        return
      }

      toast.add({
        title: t('editor.schedule.cloudSave.toast.errorTitle'),
        description: t('editor.schedule.cloudSave.toast.errorRequestFailedDescription'),
        color: 'error',
        icon: 'i-lucide-cloud-alert',
        duration: 10_000
      })
    }
  )
}
