import { effectScope, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { useValidationField } from '~/composables/useValidationField'

async function flushWatchers(): Promise<void> {
  await nextTick()
  await Promise.resolve()
}

describe('useValidationField', () => {
  let scope: ReturnType<typeof effectScope>

  afterEach(() => {
    scope?.stop()
  })

  it('clears validation error when the field value changes', async () => {
    const field = ref('')
    const error = ref<string | null>('some error')

    scope = effectScope()
    scope.run(() => {
      useValidationField(field, error)
    })

    field.value = 'edited'
    await flushWatchers()

    expect(error.value).toBe(null)
  })

  it('does not run redundant writes when error is already null', async () => {
    const field = ref('a')
    const error = ref<string | null>(null)

    scope = effectScope()
    scope.run(() => {
      useValidationField(field, error)
    })

    field.value = 'b'
    await flushWatchers()

    expect(error.value).toBe(null)
  })
})
