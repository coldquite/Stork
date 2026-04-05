import type { StudyLanguageDto, StudyProgramTypeDto } from '../../types/time-schedules'

/**
 * Allowed study program *names* per degree type and teaching language (FIT catalog)
 */
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
