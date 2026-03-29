import type { ImportDatasetKey, ImportFieldKey, ImportSzzType } from '~/types/import'

interface ImportFormFieldConfig {
  key: ImportFieldKey
  labelKey: string
}

type ImportSchemaMap = Record<ImportDatasetKey, readonly string[]>

// Base field catalog used to build concrete form layouts.
// getImportFormFieldsBySzzType picks and orders items from this map:
// - single mode => studentsCapSingle, studentsCommitteesSingle, committees
// - mixed mode => bachelor/master variants + committees (with mixed-specific label)
const IMPORT_FORM_FIELD_CONFIGS: Record<ImportFieldKey, ImportFormFieldConfig> = {
  studentsCapSingle: {
    key: 'studentsCapSingle',
    labelKey: 'homepage.actions.create.import.fields.studentsCap'
  },
  studentsCommitteesSingle: {
    key: 'studentsCommitteesSingle',
    labelKey: 'homepage.actions.create.import.fields.studentsCommittees'
  },
  studentsCapBachelor: {
    key: 'studentsCapBachelor',
    labelKey: 'homepage.actions.create.import.fields.studentsCapBachelor'
  },
  studentsCapMaster: {
    key: 'studentsCapMaster',
    labelKey: 'homepage.actions.create.import.fields.studentsCapMaster'
  },
  studentsCommitteesBachelor: {
    key: 'studentsCommitteesBachelor',
    labelKey: 'homepage.actions.create.import.fields.studentsCommitteesBachelor'
  },
  studentsCommitteesMaster: {
    key: 'studentsCommitteesMaster',
    labelKey: 'homepage.actions.create.import.fields.studentsCommitteesMaster'
  },
  committees: {
    key: 'committees',
    labelKey: 'homepage.actions.create.import.fields.committees'
  }
}

const IMPORT_FORM_FIELD_CONFIGS_SINGLE: ImportFormFieldConfig[] = [
  IMPORT_FORM_FIELD_CONFIGS.studentsCapSingle,
  IMPORT_FORM_FIELD_CONFIGS.studentsCommitteesSingle,
  IMPORT_FORM_FIELD_CONFIGS.committees
]

const IMPORT_FORM_FIELD_CONFIGS_MIXED: ImportFormFieldConfig[] = [
  IMPORT_FORM_FIELD_CONFIGS.studentsCapBachelor,
  IMPORT_FORM_FIELD_CONFIGS.studentsCapMaster,
  IMPORT_FORM_FIELD_CONFIGS.studentsCommitteesBachelor,
  IMPORT_FORM_FIELD_CONFIGS.studentsCommitteesMaster,
  {
    key: 'committees',
    labelKey: 'homepage.actions.create.import.fields.committeesMixed'
  }
]

export const IMPORT_CSV_OPTIONS = Object.freeze({
  delimiter: ';',
  quoteChar: '"'
})

export const IMPORT_SCHEMAS: ImportSchemaMap = {
  studentsCap: [
    'Příjmení',
    'Jméno',
    'Titul',
    'titul za',
    'Kód studijního plánu',
    'VŠKP-typ A: Název práce',
    'VŠKP-typ A: Vedoucí práce 1',
    'VŠKP-typ A: Vedoucí práce 2',
    'VŠKP-typ A: Oponent práce 1',
    'VŠKP-typ A: Oponent práce 2',
    'VŠKP-typ A: Datum obhajoby',
    'Email studenta',
    'Studijní program (název)',
    'Obor/spec - název',
    'Studijní plán (název)',
    'Katedra studenta (název)',
    'Katedra studenta (kód)',
    'VŠKP-typ A: jazyk práce',
    'VŠKP-typ A: Překlad názvu práce',
    'VŠKP-typ A: Termín odevzdání práce'
  ],
  studentsCommittees: [
    'Jméno studenta',
    'Příjmení studenta',
    'Email adresa',
    'Jazyk výuky',
    'Komise - název',
    'Osobní číslo',
    'VŠKP-typ A: Anglický název práce',
    'VŠKP-typ A: Český název práce',
    'VŠKP-typ A: Jazyk práce',
    'VŠKP-typ A: Vedoucí práce 1',
    'VŠKP-typ A: Vedoucí práce 2',
    'VŠKP-typ A: Oponent práce 1',
    'VŠKP-typ A: Oponent práce 2',
    'Komise - předseda',
    'Komise - místopředseda',
    'Komise - člen 1',
    'Komise - člen 2',
    'Komise - člen 3',
    'VŠKP-typ A: Katedra obhajoby - kod',
    'VŠKP-typ A: Katedra obhajoby - název',
    'Obor/spec - kód',
    'Obor/spec - název',
    'St. program - kód',
    'St. program - název',
    'St. program - typ',
    'VŠKP-typ A: Datum obhajoby',
    'Předmět 1 - 1.term. datum',
    'Předmět 1 - 2.term. datum'
  ],
  committees: [
    'Název komise',
    'Název studijního programu',
    'Název oboru/specializace',
    'Správce',
    'Kat',
    'Datum',
    'Místo'
  ]
}

export function getImportFormFieldsBySzzType(szzType: ImportSzzType): ImportFormFieldConfig[] {
  if (szzType === 'MIXED') {
    return IMPORT_FORM_FIELD_CONFIGS_MIXED
  }

  return IMPORT_FORM_FIELD_CONFIGS_SINGLE
}

export function normalizeCsvHeader(value: string): string {
  return value.trim()
}

export function removeUtf8BomFromCsvHeader(value: string): string {
  return value.replace(/^\uFEFF/, '')
}

export function normalizeCsvHeaders(headers: string[]): string[] {
  const normalizedHeaders = headers.map((header) => normalizeCsvHeader(header))

  if (normalizedHeaders.length > 0) {
    normalizedHeaders[0] = removeUtf8BomFromCsvHeader(normalizedHeaders[0]!)
  }

  return normalizedHeaders
}

function getMatchingSchemaKeysByNormalizedHeaders(normalizedHeaders: string[]): ImportDatasetKey[] {
  const normalizedHeaderSet = new Set(normalizedHeaders)

  // Duplicate header names make column mapping ambiguous, so schema detection must fail.
  if (normalizedHeaderSet.size !== normalizedHeaders.length) {
    return []
  }

  const matchedSchemaKeys: ImportDatasetKey[] = []
  const schemaEntries = Object.entries(IMPORT_SCHEMAS) as Array<[ImportDatasetKey, readonly string[]]>

  for (const [key, schema] of schemaEntries) {
    const normalizedSchemaHeaders = normalizeCsvHeaders([...schema])
    const matchesSchema = normalizedSchemaHeaders.every((columnName) => normalizedHeaderSet.has(columnName))
    if (matchesSchema) {
      matchedSchemaKeys.push(key)
    }
  }

  return matchedSchemaKeys
}

export function findMatchingImportSchemaKeys(headers: string[]): ImportDatasetKey[] {
  return getMatchingSchemaKeysByNormalizedHeaders(normalizeCsvHeaders(headers))
}

// Detects which supported KOS export schema the CSV headers match.
// Returns dataset key only when headers uniquely match exactly one schema, otherwise returns null.
export function resolveImportDatasetKeyByHeaders(headers: string[]): ImportDatasetKey | null {
  const matchedSchemaKeys = getMatchingSchemaKeysByNormalizedHeaders(normalizeCsvHeaders(headers))

  if (matchedSchemaKeys.length !== 1) {
    return null
  }

  return matchedSchemaKeys[0] ?? null
}
