import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EditorStudentsPanel from '~/components/editor/students/EditorStudentsPanel.vue'

function mountPanel(selectedCommittee: unknown) {
  return shallowMount(EditorStudentsPanel, {
    props: {
      cardRootClass: 'h-full',
      selectedCommittee: selectedCommittee as never,
      selectedCommitteeLabel: selectedCommittee ? '1-BI-SI.21' : '',
      selectedCommitteeDate: '',
      thesisTitleDisplayMode: 'AUTO',
      tableViewMode: 'OPTIMIZED',
      studentsCount: 0,
      studentsCountLabel: '0 studentů',
      students: [],
      columns: [],
      committeeLabels: {
        committeeTitle: 'Vybraná komise',
        emptyStateTitle: 'Nejprve vytvořte komisi',
        emptyStateDescription: 'V levém panelu klikněte na „Přidat komisi“.',
        startTime: '',
        startTimeHour: '',
        startTimeMinute: '',
        addStudentAction: '',
        addStudentAria: '',
        addPauseAction: '',
        addPauseAria: '',
        columnDisplaySettingsAction: '',
        thesisTitleDisplayMode: '',
        thesisTitleDisplayModeAuto: '',
        thesisTitleDisplayModeBoth: '',
        tableViewMode: '',
        tableViewModeOptimized: '',
        tableViewModeMaximized: '',
        room: '',
        preparationRoom: '',
        date: '',
        secretary: '',
        chair: '',
        viceChair: '',
        member1: '',
        member2: '',
        member3: '',
        language: '',
        languageCzech: '',
        languageEnglish: '',
        studyProgramType: '',
        studyProgramTypeBachelor: '',
        studyProgramTypeMaster: '',
        studyProgramName: '',
        specializationCode: '',
        department: '',
        renameCommitteeAction: '',
        deleteCommitteeAction: '',
        renameCommitteeAria: '',
        deleteCommitteeAria: ''
      },
      studentsEmpty: {
        emptyTitle: 'Komise zatím nemá studenty',
        emptyDescription: 'Jakmile přidáte studenty, zobrazí se zde.'
      },
      invigilatorLabels: {
        addAction: '',
        deleteAria: ''
      },
      invigilators: [],
      invigilatorsCountLabel: '',
      committeeValidationTitle: '',
      committeeValidationCount: 0,
      committeeValidationSections: [],
      studentValidationTitle: '',
      studentValidationCount: 0,
      studentValidationStudents: [],
      studentValidationIssues: []
    },
    global: {
      stubs: {
        UCard: {
          template: '<section><div data-test="header"><slot name="header" /></div><div><slot /></div></section>'
        },
        UEmpty: {
          props: ['title', 'description'],
          template: '<div data-test="empty-state"><h3>{{ title }}</h3><p>{{ description }}</p></div>'
        }
      }
    }
  })
}

describe('EditorStudentsPanel', () => {
  it('shows create-committee empty state when no committee is selected', () => {
    const wrapper = mountPanel(null)

    expect(wrapper.find('[data-test="empty-state"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Nejprve vytvořte komisi')
    expect(wrapper.find('editor-students-sortable-table-stub').exists()).toBe(false)
  })

  it('shows students table when committee is selected', () => {
    const wrapper = mountPanel({
      localId: 'committee-1',
      language: 'CZECH'
    })

    expect(wrapper.find('[data-test="empty-state"]').exists()).toBe(false)
    expect(wrapper.find('editor-students-sortable-table-stub').exists()).toBe(true)
  })
})
