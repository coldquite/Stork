import type { RepeatTypeDto, StudyProgramTypeDto, ThesisLanguageDto } from '#shared/types/time-schedules'

type QuestionsEnvelopeCsvTranslate = (key: string) => string

export interface QuestionsEnvelopeCsvEnumLabelResolver {
  resolveStudyProgramTypeLabel: (value: StudyProgramTypeDto) => string
  resolveThesisLanguageLabel: (value: ThesisLanguageDto) => string
  resolveRepeatTypeLabel: (value: RepeatTypeDto) => string
}

const STUDY_PROGRAM_TYPE_KEY_BY_VALUE: Record<StudyProgramTypeDto, string> = {
  BACHELOR: 'editor.schedule.export.questionsEnvelopeCsvExport.enums.studyProgramType.BACHELOR',
  MASTER: 'editor.schedule.export.questionsEnvelopeCsvExport.enums.studyProgramType.MASTER'
}

const THESIS_LANGUAGE_KEY_BY_VALUE: Record<ThesisLanguageDto, string> = {
  CZECH: 'editor.schedule.export.questionsEnvelopeCsvExport.enums.thesisLanguage.CZECH',
  ENGLISH: 'editor.schedule.export.questionsEnvelopeCsvExport.enums.thesisLanguage.ENGLISH',
  SLOVAK: 'editor.schedule.export.questionsEnvelopeCsvExport.enums.thesisLanguage.SLOVAK'
}

const REPEAT_TYPE_KEY_BY_VALUE: Record<RepeatTypeDto, string> = {
  NONE: 'editor.schedule.export.questionsEnvelopeCsvExport.enums.repeatType.NONE',
  THESIS_DEFENSE: 'editor.schedule.export.questionsEnvelopeCsvExport.enums.repeatType.THESIS_DEFENSE',
  ORAL_EXAM: 'editor.schedule.export.questionsEnvelopeCsvExport.enums.repeatType.ORAL_EXAM',
  BOTH: 'editor.schedule.export.questionsEnvelopeCsvExport.enums.repeatType.BOTH',
  UNKNOWN: 'editor.schedule.export.questionsEnvelopeCsvExport.enums.repeatType.UNKNOWN'
}

function resolveI18nEnumLabel(translate: QuestionsEnvelopeCsvTranslate, key: string, fallbackValue: string): string {
  const translatedValue = translate(key)
  return translatedValue === key ? fallbackValue : translatedValue
}

export function createQuestionsEnvelopeCsvEnumLabelResolver(
  translate: QuestionsEnvelopeCsvTranslate
): QuestionsEnvelopeCsvEnumLabelResolver {
  return {
    resolveStudyProgramTypeLabel(value) {
      return resolveI18nEnumLabel(translate, STUDY_PROGRAM_TYPE_KEY_BY_VALUE[value], value)
    },
    resolveThesisLanguageLabel(value) {
      return resolveI18nEnumLabel(translate, THESIS_LANGUAGE_KEY_BY_VALUE[value], value)
    },
    resolveRepeatTypeLabel(value) {
      return resolveI18nEnumLabel(translate, REPEAT_TYPE_KEY_BY_VALUE[value], value)
    }
  }
}
