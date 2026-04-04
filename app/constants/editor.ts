import type { StudyLanguageDto, StudyProgramTypeDto } from '#shared/types/time-schedules'

export const EDITOR_DRAFT_NAME_MAX_LENGTH = 120
export const DEFAULT_COMMITTEE_START_MINUTE = 525

export const EDITOR_STUDY_PROGRAM_NAME_OPTIONS_BY_TYPE = {
  BACHELOR: {
    CZECH: ['Informatika'],
    ENGLISH: ['Informatics']
  },
  MASTER: {
    CZECH: [
      'Aplikovaná informatika',
      'Informatika',
      'Kvantová informatika',
      'Učitelství informatiky pro střední školy'
    ],
    ENGLISH: ['Applied Informatics', 'Informatics', 'Quantum Informatics']
  }
} satisfies Record<StudyProgramTypeDto, Record<StudyLanguageDto, string[]>>

export interface EditorSpecializationOption {
  specializationCode: string
  specializationName: string
  departmentCode: string | null
  departmentNameCs: string | null
  departmentNameEn: string | null
}

type EditorSpecializationOptionsByTypeAndStudyProgramName = Record<
  StudyProgramTypeDto,
  Record<string, EditorSpecializationOption[]>
>

type EditorDepartmentCode = '18101' | '18102' | '18103' | '18104' | '18105' | '18106'

interface EditorDepartment {
  code: EditorDepartmentCode
  nameCs: string
  nameEn: string
}

const EDITOR_DEPARTMENTS_BY_CODE: Record<EditorDepartmentCode, EditorDepartment> = {
  '18101': {
    code: '18101',
    nameCs: 'Katedra teoretické informatiky',
    nameEn: 'Department of Theoretical Computer Science'
  },
  '18102': {
    code: '18102',
    nameCs: 'Katedra softwarového inženýrství',
    nameEn: 'Department of Software Engineering'
  },
  '18103': {
    code: '18103',
    nameCs: 'Katedra číslicového návrhu',
    nameEn: 'Department of Digital Design'
  },
  '18104': {
    code: '18104',
    nameCs: 'Katedra počítačových systémů',
    nameEn: 'Department of Computer Systems'
  },
  '18105': {
    code: '18105',
    nameCs: 'Katedra aplikované matematiky',
    nameEn: 'Department of Applied Mathematics'
  },
  '18106': {
    code: '18106',
    nameCs: 'Katedra informační bezpečnosti',
    nameEn: 'Department of Information Security'
  }
}

function createEditorSpecializationOption(input: {
  specializationCode: string
  specializationName: string
  departmentCode: EditorDepartmentCode
}): EditorSpecializationOption {
  const department = EDITOR_DEPARTMENTS_BY_CODE[input.departmentCode]

  return {
    specializationCode: input.specializationCode,
    specializationName: input.specializationName,
    departmentCode: department.code,
    departmentNameCs: department.nameCs,
    departmentNameEn: department.nameEn
  }
}

function duplicateBi21CodesWith24(options: EditorSpecializationOption[]): EditorSpecializationOption[] {
  const bi24Duplicates = options
    .filter((option) => /^BIE?-[A-Z]+\.21$/.test(option.specializationCode))
    .map((option) => ({
      ...option,
      specializationCode: option.specializationCode.replace('.21', '.24')
    }))

  return [...options, ...bi24Duplicates]
}

export const EDITOR_SPECIALIZATION_OPTIONS_BY_TYPE_AND_STUDY_PROGRAM_NAME: EditorSpecializationOptionsByTypeAndStudyProgramName =
  {
    BACHELOR: {
      Informatika: duplicateBi21CodesWith24([
        createEditorSpecializationOption({
          specializationCode: 'BI-IB.21',
          specializationName: 'Informační bezpečnost 2021',
          departmentCode: '18106'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BI-WI.21',
          specializationName: 'Webové inženýrství 2021',
          departmentCode: '18102'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BI-MI.21',
          specializationName: 'Manažerská informatika 2021',
          departmentCode: '18102'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BI-PG.21',
          specializationName: 'Počítačová grafika 2021',
          departmentCode: '18102'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BI-PI.21',
          specializationName: 'Počítačové inženýrství 2021',
          departmentCode: '18103'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BI-PS.21',
          specializationName: 'Počítačové sítě a Internet 2021',
          departmentCode: '18104'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BI-PV.21',
          specializationName: 'Počítačové systémy a virtualizace 2021',
          departmentCode: '18104'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BI-SI.21',
          specializationName: 'Softwarové inženýrství 2021',
          departmentCode: '18102'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BI-TI.21',
          specializationName: 'Teoretická informatika 2021',
          departmentCode: '18101'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BI-UI.21',
          specializationName: 'Umělá inteligence 2021',
          departmentCode: '18105'
        })
      ]),
      Informatics: [
        createEditorSpecializationOption({
          specializationCode: 'BIE-PI.21',
          specializationName: 'Computer Engineering 2021',
          departmentCode: '18103'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BIE-PS.21',
          specializationName: 'Computer Networks and Internet 2021',
          departmentCode: '18104'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BIE-TI.21',
          specializationName: 'Computer Science 2021',
          departmentCode: '18101'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BIE-PV.21',
          specializationName: 'Computer Systems and Virtualization 2021',
          departmentCode: '18104'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BIE-IB.21',
          specializationName: 'Information Security 2021 (Bachelor in English)',
          departmentCode: '18106'
        }),
        createEditorSpecializationOption({
          specializationCode: 'BIE-SI.21',
          specializationName: 'Software Engineering 2021',
          departmentCode: '18102'
        })
      ]
    },
    MASTER: {
      'Aplikovaná informatika': [
        createEditorSpecializationOption({
          specializationCode: 'ANI-ES',
          specializationName: 'Embedded systémy',
          departmentCode: '18103'
        }),
        createEditorSpecializationOption({
          specializationCode: 'ANI-MI',
          specializationName: 'Manažerská informatika',
          departmentCode: '18102'
        }),
        createEditorSpecializationOption({
          specializationCode: 'ANI-SI',
          specializationName: 'Softwarové inženýrství',
          departmentCode: '18102'
        }),
        createEditorSpecializationOption({
          specializationCode: 'ANI-VG',
          specializationName: 'Visual computing a Game design',
          departmentCode: '18102'
        }),
        createEditorSpecializationOption({
          specializationCode: 'ANI-WI',
          specializationName: 'Webové inženýrství',
          departmentCode: '18102'
        })
      ],
      'Applied Informatics': [
        createEditorSpecializationOption({
          specializationCode: 'ANIE-ES',
          specializationName: 'Embedded systems',
          departmentCode: '18103'
        }),
        createEditorSpecializationOption({
          specializationCode: 'ANIE-SI',
          specializationName: 'Software Engineering',
          departmentCode: '18102'
        })
      ],
      Informatics: [
        createEditorSpecializationOption({
          specializationCode: 'NIE-PJ',
          specializationName: 'Programming Languages',
          departmentCode: '18101'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NIE-TI',
          specializationName: 'Computer Science 2021',
          departmentCode: '18101'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NIE-PB',
          specializationName: 'Computer Security 2021',
          departmentCode: '18106'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NIE-PSS',
          specializationName: 'Computer Systems and Networks 2021',
          departmentCode: '18104'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NIE-NPVS',
          specializationName: 'Design and Programming of Embedded Systems 2021',
          departmentCode: '18103'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NIE-SI',
          specializationName: 'Software Engineering 2021',
          departmentCode: '18102'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NIE-DBE',
          specializationName: 'Digital Business Engineering',
          departmentCode: '18102'
        })
      ],
      Informatika: [
        createEditorSpecializationOption({
          specializationCode: 'NI-MI',
          specializationName: 'Manažerská informatika',
          departmentCode: '18102'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NI-NPVS',
          specializationName: 'Návrh a programování vestavných systémů',
          departmentCode: '18103'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NI-PB',
          specializationName: 'Počítačová bezpečnost',
          departmentCode: '18106'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NI-PSS',
          specializationName: 'Počítačové systémy a sítě',
          departmentCode: '18104'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NI-PJ',
          specializationName: 'Programovací jazyky',
          departmentCode: '18101'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NI-SI',
          specializationName: 'Softwarové inženýrství',
          departmentCode: '18102'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NI-SP',
          specializationName: 'Systémové programování',
          departmentCode: '18101'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NI-TI',
          specializationName: 'Teoretická informatika',
          departmentCode: '18101'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NI-UI',
          specializationName: 'Umělá inteligence',
          departmentCode: '18105'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NI-WI',
          specializationName: 'Webové inženýrství',
          departmentCode: '18102'
        }),
        createEditorSpecializationOption({
          specializationCode: 'NI-ZI',
          specializationName: 'Znalostní inženýrství',
          departmentCode: '18105'
        })
      ],
      'Kvantová informatika': [
        createEditorSpecializationOption({
          specializationCode: 'QNI',
          specializationName: 'Kvantová informatika',
          departmentCode: '18105'
        })
      ],
      'Quantum Informatics': [
        createEditorSpecializationOption({
          specializationCode: 'QNIE',
          specializationName: 'Quantum Infromatics',
          departmentCode: '18105'
        })
      ],
      'Učitelství informatiky pro střední školy': [
        createEditorSpecializationOption({
          specializationCode: 'UNI',
          specializationName: 'Učitelství informatiky pro střední školy',
          departmentCode: '18101'
        })
      ]
    }
  }

// Returns specialization options for the selected study program, or an empty list when the form is incomplete.
export function resolveEditorSpecializationOptions(
  studyProgramType: StudyProgramTypeDto | null | undefined,
  studyProgramName: string
): EditorSpecializationOption[] {
  if (!studyProgramType || studyProgramName.length === 0) {
    return []
  }

  return EDITOR_SPECIALIZATION_OPTIONS_BY_TYPE_AND_STUDY_PROGRAM_NAME[studyProgramType][studyProgramName] ?? []
}

// Returns available study program names for the selected type and language, so the UI can show only valid combinations.
export function resolveEditorStudyProgramNameOptions(
  studyProgramType: StudyProgramTypeDto | null | undefined,
  studyLanguage: StudyLanguageDto | null | undefined
): string[] {
  if (!studyProgramType || !studyLanguage) {
    return []
  }

  return EDITOR_STUDY_PROGRAM_NAME_OPTIONS_BY_TYPE[studyProgramType][studyLanguage]
}

// Finds a specialization by code in the current program context, or null when the code is not available there.
export function resolveEditorSpecializationOptionByCode(
  studyProgramType: StudyProgramTypeDto | null | undefined,
  studyProgramName: string,
  specializationCode: string
): EditorSpecializationOption | null {
  const options = resolveEditorSpecializationOptions(studyProgramType, studyProgramName)
  return options.find((option) => option.specializationCode === specializationCode) ?? null
}
