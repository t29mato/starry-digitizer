import { mount } from '@vue/test-utils'

import StarrydataRefSettings from './StarrydataRefSettings.vue'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
} from '@/presentation/digitizerOptions'

function mountPanel(ctx: DigitizerContext, readonly = false) {
  return mount(StarrydataRefSettings, {
    global: {
      provide: {
        [DIGITIZER_CONTEXT_KEY as symbol]: ctx,
        [DIGITIZER_OPTIONS_KEY as symbol]: createDigitizerOptions({
          readonly,
        }),
      },
    },
  })
}

describe('StarrydataRefSettings', () => {
  it('writes the typed SID and Fig. to the context', async () => {
    const ctx = createDigitizerContext()
    const wrapper = mountPanel(ctx)
    await wrapper.get('[data-cy="starrydata-sid"]').setValue('12345')
    await wrapper.get('[data-cy="starrydata-figure"]').setValue('3(b)')
    expect(ctx.starrydataRef).toMatchObject({
      sid: '12345',
      figure: '3(b)',
      edits: 2,
    })
    expect(wrapper.find('[data-cy="starrydata-sid-hint"]').exists()).toBe(false)
  })

  it('shows a restored value and hints at a SID that is not a number', async () => {
    const ctx = createDigitizerContext()
    ctx.starrydataRef.restore({ sid: 'S12', figure: '4' })
    const wrapper = mountPanel(ctx)
    const sid = wrapper.get('[data-cy="starrydata-sid"]')
      .element as HTMLInputElement
    expect(sid.value).toBe('S12')
    expect(sid.maxLength).toBe(32)
    expect(wrapper.find('[data-cy="starrydata-sid-hint"]').exists()).toBe(true)
  })

  it('is disabled in readonly mode', () => {
    const wrapper = mountPanel(createDigitizerContext(), true)
    expect(
      wrapper.get('[data-cy="starrydata-sid"]').attributes('disabled'),
    ).toBeDefined()
  })
})
