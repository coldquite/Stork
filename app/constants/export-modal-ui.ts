export const EXPORT_CHECKBOX_GROUP_UI = {
  item: 'cursor-pointer rounded-md px-2 py-2 odd:bg-primary/5 even:bg-white hover:bg-primary/10 dark:odd:bg-primary/20 dark:even:bg-default dark:hover:bg-primary/18',
  base: 'cursor-pointer',
  label: 'cursor-pointer',
  description: 'cursor-pointer'
} as const

export const EXPORT_SELECT_ALL_BUTTON_UI = {
  base: 'border-2 border-primary-600 text-primary-800 hover:border-stork-600 hover:bg-stork-100 dark:border-stork-400 dark:text-stork-100 dark:hover:border-stork-300 dark:hover:bg-stork-800/35'
} as const

export const EXPORT_CLEAR_ALL_BUTTON_UI = {
  base: 'border-2 border-secondary-400 text-secondary-800 hover:border-secondary-500 hover:bg-secondary-50 dark:border-secondary-500 dark:text-secondary-100 dark:hover:bg-secondary-900/50'
} as const

export const EXPORT_LOADING_OVERLAY_CLASS =
  'bg-default/80 absolute inset-0 z-10 flex items-center justify-center rounded-lg'
