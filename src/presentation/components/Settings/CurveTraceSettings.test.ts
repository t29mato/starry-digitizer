import { mount } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

import ExtractorSettings from './ExtractorSettings.vue'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
} from '@/presentation/digitizerOptions'
import { MANUAL_MODE } from '@/constants'

type AnyComponent = new () => ComponentPublicInstance

function mountWith(ctx: DigitizerContext) {
  return mount<AnyComponent>(ExtractorSettings as unknown as AnyComponent, {
    global: {
      provide: {
        [DIGITIZER_CONTEXT_KEY as symbol]: ctx,
        [DIGITIZER_OPTIONS_KEY as symbol]: createDigitizerOptions({}),
      },
    },
  })
}

describe('Trace Curve in Manual Extraction', () => {
  test('the Trace (T) mode shows its settings and the last outcome', async () => {
    const ctx = createDigitizerContext()
    const wrapper = mountWith(ctx)
    expect(wrapper.find('[data-cy="curve-trace-settings"]').exists()).toBe(
      false,
    )

    await wrapper.find('[data-cy="manual-trace"]').trigger('click')
    expect(ctx.canvasHandler.manualMode).toBe(MANUAL_MODE.TRACE)
    expect(wrapper.find('[data-cy="curve-trace-settings"]').exists()).toBe(true)

    ctx.curveTrace.setLastOutcome({
      added: 12,
      stops: ['edge', 'junction'],
      colorHex: '#dc1414',
      lengthPx: 120,
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-cy="trace-status"]').text()).toBe(
      'Added 12 point(s) · ends: image edge, sharp turn / junction',
    )

    await wrapper.find('input[data-cy="trace-gap"]').setValue('25')
    expect(ctx.curveTrace.maxGapPx).toBe(25)
  })
})
