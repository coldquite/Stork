import { describe, expect, it } from 'vitest'
import { createQuestionsEnvelopeCsvEnumLabelResolver } from '~/utils/editor/questions-envelope-csv-enums'

const translationMap: Record<string, string> = {
  'editor.schedule.export.questionsEnvelopeCsvExport.enums.studyProgramType.BACHELOR': 'Bakalářský',
  'editor.schedule.export.questionsEnvelopeCsvExport.enums.studyProgramType.MASTER': 'Magisterský',
  'editor.schedule.export.questionsEnvelopeCsvExport.enums.thesisLanguage.CZECH': 'Čeština',
  'editor.schedule.export.questionsEnvelopeCsvExport.enums.thesisLanguage.ENGLISH': 'Angličtina',
  'editor.schedule.export.questionsEnvelopeCsvExport.enums.thesisLanguage.SLOVAK': 'Slovenština',
  'editor.schedule.export.questionsEnvelopeCsvExport.enums.repeatType.NONE': 'Neopakuje',
  'editor.schedule.export.questionsEnvelopeCsvExport.enums.repeatType.THESIS_DEFENSE': 'Opakuje obhajobu',
  'editor.schedule.export.questionsEnvelopeCsvExport.enums.repeatType.ORAL_EXAM': 'Opakuje zkoušku',
  'editor.schedule.export.questionsEnvelopeCsvExport.enums.repeatType.BOTH': 'Opakuje zkoušku i obhajobu',
  'editor.schedule.export.questionsEnvelopeCsvExport.enums.repeatType.UNKNOWN': 'Neznámý stav'
}

const enumLabelResolver = createQuestionsEnvelopeCsvEnumLabelResolver((key) => {
  return translationMap[key] ?? key
})

describe('questions-envelope-csv-enums', () => {
  it('maps study program type values to Czech labels', () => {
    expect(enumLabelResolver.resolveStudyProgramTypeLabel('BACHELOR')).toBe('Bakalářský')
    expect(enumLabelResolver.resolveStudyProgramTypeLabel('MASTER')).toBe('Magisterský')
  })

  it('maps thesis language values to Czech labels', () => {
    expect(enumLabelResolver.resolveThesisLanguageLabel('CZECH')).toBe('Čeština')
    expect(enumLabelResolver.resolveThesisLanguageLabel('ENGLISH')).toBe('Angličtina')
    expect(enumLabelResolver.resolveThesisLanguageLabel('SLOVAK')).toBe('Slovenština')
  })

  it('maps repeat type values to Czech labels', () => {
    expect(enumLabelResolver.resolveRepeatTypeLabel('NONE')).toBe('Neopakuje')
    expect(enumLabelResolver.resolveRepeatTypeLabel('THESIS_DEFENSE')).toBe('Opakuje obhajobu')
    expect(enumLabelResolver.resolveRepeatTypeLabel('ORAL_EXAM')).toBe('Opakuje zkoušku')
    expect(enumLabelResolver.resolveRepeatTypeLabel('BOTH')).toBe('Opakuje zkoušku i obhajobu')
    expect(enumLabelResolver.resolveRepeatTypeLabel('UNKNOWN')).toBe('Neznámý stav')
  })

  it('falls back to technical enum value when i18n key is missing', () => {
    const unresolvedResolver = createQuestionsEnvelopeCsvEnumLabelResolver((key) => key)
    expect(unresolvedResolver.resolveStudyProgramTypeLabel('BACHELOR')).toBe('BACHELOR')
  })
})
