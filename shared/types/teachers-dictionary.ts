export interface UpsertTeachersDictionaryEntryDto {
  canonicalName: string
  isCustom: boolean
}

export type PutTeachersDictionaryBulkRequestDto = UpsertTeachersDictionaryEntryDto[]

export interface PutTeachersDictionaryBulkResponseDto {
  processed: number
  created: number
  updated: number
}

export interface TeachersDictionaryEntryDto {
  id: string
  canonicalName: string
  normalizedLookupKey: string
  isCustom: boolean
}

export type GetTeachersDictionaryResponseDto = TeachersDictionaryEntryDto[]
