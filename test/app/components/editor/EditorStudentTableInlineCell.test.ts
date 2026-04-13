import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import EditorStudentTableInlineCell from '~/components/editor/students/EditorStudentTableInlineCell.vue'

const UInputStub = defineComponent({
  name: 'UInputStub',
  props: {
    modelValue: {
      type: [String, Number],
      required: false,
      default: ''
    }
  },
  emits: ['update:model-value', 'blur', 'keydown.enter'],
  template: `
    <input
      data-test="u-input"
      :value="modelValue"
      @input="$emit('update:model-value', $event.target.value)"
      @blur="$emit('blur')"
      @keydown.enter="$emit('keydown.enter', $event)"
    />
  `
})

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
        UInput: UInputStub
      }
    }
  })
}

describe('EditorStudentTableInlineCell', () => {
  it('emits activate on cell click', async () => {
    const wrapper = mountInlineCell(false)

    await wrapper.trigger('click')

    expect(wrapper.emitted('activate')).toHaveLength(1)
  })

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

  it('highlights readonly text in red and keeps edit text neutral for warning marker', () => {
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
    expect(editInput.classes()).not.toContain('[&_input]:text-error')
  })

  it('emits commit on blur and Enter while editing', async () => {
    const wrapper = mountInlineCell(true)
    const editInput = wrapper.find('[data-test="u-input"]')

    expect(editInput.exists()).toBe(true)

    await editInput.trigger('blur')
    await editInput.trigger('keydown.enter')

    expect(wrapper.emitted('commit')).toHaveLength(2)
  })

  it('keeps number input clearable and falls back to 0 on commit', async () => {
    const wrapper = mountInlineCell(true, {
      modelValue: 12,
      mode: 'number'
    })
    const editInput = wrapper.find<HTMLInputElement>('[data-test="u-input"]')

    expect(editInput.exists()).toBe(true)

    await editInput.setValue('')

    const modelUpdatesAfterClear = wrapper.emitted('update:modelValue') ?? []
    expect(modelUpdatesAfterClear.at(-1)).toEqual([''])

    await editInput.trigger('blur')

    const modelUpdatesAfterCommit = wrapper.emitted('update:modelValue') ?? []
    expect(modelUpdatesAfterCommit.at(-1)).toEqual([0])
    expect(wrapper.emitted('commit')).toHaveLength(1)
  })
})
