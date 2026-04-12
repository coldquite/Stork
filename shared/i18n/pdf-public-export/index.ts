import { PDF_PUBLIC_EXPORT_CS_DICTIONARY } from './cs'
import { PDF_PUBLIC_EXPORT_EN_DICTIONARY } from './en'
import type { StudyLanguageDto } from '#shared/types/time-schedules'
import type { PdfPublicExportDictionary } from './types'

export type { PdfPublicExportDictionary } from './types'

export const PDF_PUBLIC_EXPORT_DICTIONARY: Record<StudyLanguageDto, PdfPublicExportDictionary> = {
  CZECH: PDF_PUBLIC_EXPORT_CS_DICTIONARY,
  ENGLISH: PDF_PUBLIC_EXPORT_EN_DICTIONARY
}
