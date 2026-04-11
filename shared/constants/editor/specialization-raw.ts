import type { EditorDepartmentCode } from './departments'

/**
 * Raw FIT specialization rows (code + label + department)
 * Enriched to {@link EditorSpecializationOption} in `specialization-table.ts`
 */
export interface EditorSpecializationRawRow {
  readonly specializationCode: string
  readonly specializationName: string
  readonly departmentCode: EditorDepartmentCode
}

export const EDITOR_SPECIALIZATION_RAW = {
  BACHELOR: {
    Informatika: [
      { specializationCode: 'BI-IB.21', specializationName: 'Informační bezpečnost 2021', departmentCode: '18106' },
      { specializationCode: 'BIK-IB.21', specializationName: 'Informační bezpečnost 2021', departmentCode: '18106' },
      { specializationCode: 'BI-WI.21', specializationName: 'Webové inženýrství 2021', departmentCode: '18102' },
      { specializationCode: 'BI-MI.21', specializationName: 'Manažerská informatika 2021', departmentCode: '18102' },
      { specializationCode: 'BI-PG.21', specializationName: 'Počítačová grafika 2021', departmentCode: '18102' },
      { specializationCode: 'BI-PI.21', specializationName: 'Počítačové inženýrství 2021', departmentCode: '18103' },
      {
        specializationCode: 'BI-PS.21',
        specializationName: 'Počítačové sítě a Internet 2021',
        departmentCode: '18104'
      },
      {
        specializationCode: 'BI-PV.21',
        specializationName: 'Počítačové systémy a virtualizace 2021',
        departmentCode: '18104'
      },
      {
        specializationCode: 'BIK-PV.21',
        specializationName: 'Počítačové systémy a virtualizace 2021',
        departmentCode: '18104'
      },
      { specializationCode: 'BI-SI.21', specializationName: 'Softwarové inženýrství 2021', departmentCode: '18102' },
      { specializationCode: 'BIK-SI.21', specializationName: 'Softwarové inženýrství 2021', departmentCode: '18102' },
      { specializationCode: 'BI-TI.21', specializationName: 'Teoretická informatika 2021', departmentCode: '18101' },
      { specializationCode: 'BI-UI.21', specializationName: 'Umělá inteligence 2021', departmentCode: '18105' }
    ],
    Informatics: [
      { specializationCode: 'BIE-PI.21', specializationName: 'Computer Engineering 2021', departmentCode: '18103' },
      {
        specializationCode: 'BIE-PS.21',
        specializationName: 'Computer Networks and Internet 2021',
        departmentCode: '18104'
      },
      { specializationCode: 'BIE-TI.21', specializationName: 'Computer Science 2021', departmentCode: '18101' },
      {
        specializationCode: 'BIE-PV.21',
        specializationName: 'Computer Systems and Virtualization 2021',
        departmentCode: '18104'
      },
      {
        specializationCode: 'BIE-IB.21',
        specializationName: 'Information Security 2021 (Bachelor in English)',
        departmentCode: '18106'
      },
      { specializationCode: 'BIE-SI.21', specializationName: 'Software Engineering 2021', departmentCode: '18102' }
    ]
  },
  MASTER: {
    'Aplikovaná informatika': [
      { specializationCode: 'ANI-ES', specializationName: 'Embedded systémy', departmentCode: '18103' },
      { specializationCode: 'ANI-MI', specializationName: 'Manažerská informatika', departmentCode: '18102' },
      { specializationCode: 'ANI-SI', specializationName: 'Softwarové inženýrství', departmentCode: '18102' },
      { specializationCode: 'ANI-VG', specializationName: 'Visual computing a Game design', departmentCode: '18102' },
      { specializationCode: 'ANI-WI', specializationName: 'Webové inženýrství', departmentCode: '18102' }
    ],
    'Applied Informatics': [
      { specializationCode: 'ANIE-ES', specializationName: 'Embedded systems', departmentCode: '18103' },
      { specializationCode: 'ANIE-SI', specializationName: 'Software Engineering', departmentCode: '18102' }
    ],
    Informatics: [
      { specializationCode: 'NIE-PJ', specializationName: 'Programming Languages', departmentCode: '18101' },
      { specializationCode: 'NIE-TI', specializationName: 'Computer Science 2021', departmentCode: '18101' },
      { specializationCode: 'NIE-PB', specializationName: 'Computer Security 2021', departmentCode: '18106' },
      {
        specializationCode: 'NIE-PSS',
        specializationName: 'Computer Systems and Networks 2021',
        departmentCode: '18104'
      },
      {
        specializationCode: 'NIE-NPVS',
        specializationName: 'Design and Programming of Embedded Systems 2021',
        departmentCode: '18103'
      },
      { specializationCode: 'NIE-SI', specializationName: 'Software Engineering 2021', departmentCode: '18102' },
      { specializationCode: 'NIE-DBE', specializationName: 'Digital Business Engineering', departmentCode: '18102' }
    ],
    Informatika: [
      { specializationCode: 'NI-MI', specializationName: 'Manažerská informatika', departmentCode: '18102' },
      {
        specializationCode: 'NI-NPVS',
        specializationName: 'Návrh a programování vestavných systémů',
        departmentCode: '18103'
      },
      { specializationCode: 'NI-PB', specializationName: 'Počítačová bezpečnost', departmentCode: '18106' },
      { specializationCode: 'NI-PSS', specializationName: 'Počítačové systémy a sítě', departmentCode: '18104' },
      { specializationCode: 'NI-PJ', specializationName: 'Programovací jazyky', departmentCode: '18101' },
      { specializationCode: 'NI-SI', specializationName: 'Softwarové inženýrství', departmentCode: '18102' },
      { specializationCode: 'NI-SP', specializationName: 'Systémové programování', departmentCode: '18101' },
      { specializationCode: 'NI-TI', specializationName: 'Teoretická informatika', departmentCode: '18101' },
      { specializationCode: 'NI-UI', specializationName: 'Umělá inteligence', departmentCode: '18105' },
      { specializationCode: 'NI-WI', specializationName: 'Webové inženýrství', departmentCode: '18102' },
      { specializationCode: 'NI-ZI', specializationName: 'Znalostní inženýrství', departmentCode: '18105' }
    ],
    'Kvantová informatika': [
      { specializationCode: 'QNI', specializationName: 'Kvantová informatika', departmentCode: '18105' }
    ],
    'Quantum Informatics': [
      { specializationCode: 'QNIE', specializationName: 'Quantum Informatics', departmentCode: '18105' }
    ],
    'Učitelství informatiky pro střední školy': [
      {
        specializationCode: 'UNI',
        specializationName: 'Učitelství informatiky pro střední školy',
        departmentCode: '18101'
      }
    ]
  }
} as const
