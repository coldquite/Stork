import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { describe, expect, it } from 'vitest'
import EditorStudentTableInlineCell from '~/components/editor/EditorStudentTableInlineCell.vue'

function mountInlineCell(
  isEditing: boolean,
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
      mode: 'text'
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
    const wrapper = mountInlineCell(true, {
      display: () => h('span', { 'data-test': 'custom-display' }, 'Readonly label'),
      edit: () => h('button', { 'data-test': 'custom-edit' }, 'Edit control')
    })

    expect(wrapper.find('[data-test="custom-display"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="custom-edit"]').exists()).toBe(true)
  })
})
