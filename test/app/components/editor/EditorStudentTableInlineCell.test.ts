import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { describe, expect, it } from 'vitest'
import EditorStudentTableInlineCell from '~/components/editor/EditorStudentTableInlineCell.vue'

function mountInlineCell(
  isEditing: boolean,
  extraProps?: Partial<{
    modelValue: string | number
    mode: 'text' | 'number'
    multiline: boolean
    warningMarker: string
  }>,
  slots?: {
    display?: () => ReturnType<typeof h>
    edit?: () => ReturnType<typeof h>
  }
) {
  return mount(EditorStudentTableInlineCell, {
    props: {
      isEditing,
      modelValue: 'Test value',
      cellWrapperClass: 'min-w-[9rem]',
      inputClass: 'w-full',
      mode: 'text',
      ...extraProps
    },
    slots,
    global: {
      stubs: {
        UInput: {
          template: '<input data-test="u-input" />'
        }
      }
    }
  })
}

describe('EditorStudentTableInlineCell', () => {
  it('renders readonly content without edit overlay when row is not active', () => {
    const wrapper = mountInlineCell(false)

    expect(wrapper.text()).toContain('Test value')
    expect(wrapper.find('[data-test="u-input"]').exists()).toBe(false)
    expect(wrapper.find('.invisible').exists()).toBe(false)
  })

  it('keeps readonly layer in layout and renders edit overlay when active', () => {
    const wrapper = mountInlineCell(true)

    const readonlyFrame = wrapper.find('.invisible')
    expect(readonlyFrame.exists()).toBe(true)
    expect(readonlyFrame.attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('[data-test="u-input"]').exists()).toBe(true)
  })

  it('supports custom display/edit slots for select-like cells', () => {
    const wrapper = mountInlineCell(true, undefined, {
      display: () => h('span', { 'data-test': 'custom-display' }, 'Readonly label'),
      edit: () => h('button', { 'data-test': 'custom-edit' }, 'Edit control')
    })

    expect(wrapper.find('[data-test="custom-display"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="custom-edit"]').exists()).toBe(true)
  })

  it('highlights text and input in red when warning marker is present', () => {
    const readonlyWrapper = mountInlineCell(false, {
      modelValue: 'Název práce [?]',
      warningMarker: '[?]',
      multiline: true
    })

    const readonlyText = readonlyWrapper.find('span.block.text-sm')
    expect(readonlyText.exists()).toBe(true)
    expect(readonlyText.classes()).toContain('text-error')

    const editingWrapper = mountInlineCell(true, {
      modelValue: 'Název práce [?]',
      warningMarker: '[?]'
    })

    const editInput = editingWrapper.find('[data-test="u-input"]')
    expect(editInput.exists()).toBe(true)
    expect(editInput.classes()).toContain('[&_input]:text-error')
  })
})
