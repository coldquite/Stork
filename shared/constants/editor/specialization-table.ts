import { EDITOR_DEPARTMENTS_BY_CODE } from './departments'
import { EDITOR_SPECIALIZATION_RAW, type EditorSpecializationRawRow } from './specialization-raw'
import type { EditorSpecializationOption, EditorSpecializationOptionsByTypeAndStudyProgramName } from './types'

function enrichSpecializationRow(row: EditorSpecializationRawRow): EditorSpecializationOption {
  const department = EDITOR_DEPARTMENTS_BY_CODE[row.departmentCode]

  return {
    specializationCode: row.specializationCode,
    specializationName: row.specializationName,
    departmentCode: department.code,
    departmentNameCs: department.nameCs,
    departmentNameEn: department.nameEn
  }
}

function mapRows(rows: readonly EditorSpecializationRawRow[]): EditorSpecializationOption[] {
  return rows.map(enrichSpecializationRow)
}

/** Duplicate bachelor .21 codes as .24 for UI/back-compat (same labels, new code year). */
function duplicateBi21CodesWith24(options: EditorSpecializationOption[]): EditorSpecializationOption[] {
  const bi24Duplicates = options
    .filter((option) => /^BIE?-[A-Z]+\.21$/.test(option.specializationCode))
    .map((option) => ({
      ...option,
      specializationCode: option.specializationCode.replace('.21', '.24')
    }))

  return [...options, ...bi24Duplicates]
}

const raw = EDITOR_SPECIALIZATION_RAW

/**
 * Full specialization picker table: type → study program name → options with department labels.
 */
export const EDITOR_SPECIALIZATION_OPTIONS_BY_TYPE_AND_STUDY_PROGRAM_NAME: EditorSpecializationOptionsByTypeAndStudyProgramName =
  {
    BACHELOR: {
      Informatika: duplicateBi21CodesWith24(mapRows(raw.BACHELOR.Informatika)),
      Informatics: mapRows(raw.BACHELOR.Informatics)
    },
    MASTER: {
      'Aplikovaná informatika': mapRows(raw.MASTER['Aplikovaná informatika']),
      'Applied Informatics': mapRows(raw.MASTER['Applied Informatics']),
      Informatics: mapRows(raw.MASTER.Informatics),
      Informatika: mapRows(raw.MASTER.Informatika),
      'Kvantová informatika': mapRows(raw.MASTER['Kvantová informatika']),
      'Quantum Informatics': mapRows(raw.MASTER['Quantum Informatics']),
      'Učitelství informatiky pro střední školy': mapRows(raw.MASTER['Učitelství informatiky pro střední školy'])
    }
  }
