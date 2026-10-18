// INFO: the axis value fields accept expressions (calibrationExpression.ts).
// These cases go through the real panel, because the parsing is only half of
// it: the field and the stored value watch each other, and the panel must not
// rewrite what the person is typing while it still means the stored value.
import { mount, VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

import AxisSetSettings from './AxisSetSettings.vue'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
} from '@/presentation/digitizerOptions'

type AnyComponent = new () => ComponentPublicInstance

function setup(): { ctx: DigitizerContext; wrapper: VueWrapper } {
  const ctx = createDigitizerContext()
  const wrapper = mount<AnyComponent>(AxisSetSettings, {
    global: {
      provide: {
        [DIGITIZER_CONTEXT_KEY as symbol]: ctx,
        [DIGITIZER_OPTIONS_KEY as symbol]: createDigitizerOptions(),
      },
    },
  })
  return { ctx, wrapper }
}

function field(wrapper: VueWrapper, name: string) {
  return wrapper.get<HTMLInputElement>(`[data-cy=${name}-value]`)
}

describe('AxisSetSettings: expressions in the axis values', () => {
  let wrapper: VueWrapper | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it('stores what the expressions evaluate to', async () => {
    const { ctx, wrapper: w } = setup()
    wrapper = w
    await field(w, 'x1').setValue('10^-3')
    await field(w, 'x2').setValue('2×10⁵')
    await field(w, 'y1').setValue('1/300')
    await field(w, 'y2').setValue('pi')

    const axisSet = ctx.axisSetRepository.activeAxisSet
    expect(axisSet.x1.value).toBe(0.001)
    expect(axisSet.x2.value).toBe(200000)
    expect(axisSet.y1.value).toBeCloseTo(1 / 300, 15)
    expect(axisSet.y2.value).toBe(Math.PI)
  })

  it('keeps the typed text in the field instead of the evaluated number', async () => {
    const { wrapper: w } = setup()
    wrapper = w
    await field(w, 'x1').setValue('1/3')
    expect(field(w, 'x1').element.value).toBe('1/3')
    // INFO: the regression this guards: if `1/3` were replaced by
    // 0.3333… on the spot, `1/30` could never be typed.
    await field(w, 'x1').setValue('1/30')
    expect(field(w, 'x1').element.value).toBe('1/30')
  })

  it('shows what a non-plain entry evaluates to', async () => {
    const { wrapper: w } = setup()
    wrapper = w
    await field(w, 'x1').setValue('10⁻³')
    await field(w, 'x2').setValue('5')
    expect(w.get('[data-cy=axis-value-notes]').text()).toBe('x1 = 0.001')
  })

  it('shows an error and stores NaN for an invalid expression', async () => {
    const { ctx, wrapper: w } = setup()
    wrapper = w
    await field(w, 'y2').setValue('2pi')

    expect(ctx.axisSetRepository.activeAxisSet.y2.value).toBeNaN()
    expect(w.get('[data-cy=axis-value-error]').text()).toBe(
      "y2: Missing an operator before 'pi'",
    )
    expect(field(w, 'y2').attributes('aria-invalid')).toBe('true')

    await field(w, 'y2').setValue('2*pi')
    expect(w.get('[data-cy=axis-value-error]').text()).toBe('')
    expect(field(w, 'y2').attributes('aria-invalid')).toBeUndefined()
  })

  it('shows a value set from outside (undo, OCR, a host) as a number', async () => {
    const { ctx, wrapper: w } = setup()
    wrapper = w
    await field(w, 'x1').setValue('10^-3')
    ctx.axisSetRepository.activeAxisSet.setX1Value(42)
    await w.vm.$nextTick()
    expect(field(w, 'x1').element.value).toBe('42')
  })

  it('shows the typed expression again after switching axis sets and back', async () => {
    const { ctx, wrapper: w } = setup()
    wrapper = w
    const firstId = ctx.axisSetRepository.activeAxisSetId
    await field(w, 'x1').setValue('10^-3')

    ctx.axisSetRepository.createNewAxisSet()
    ctx.axisSetRepository.setActiveAxisSet(ctx.axisSetRepository.lastAxisSetId)
    await w.vm.$nextTick()
    await w.vm.$nextTick()
    expect(field(w, 'x1').element.value).not.toBe('10^-3')

    ctx.axisSetRepository.setActiveAxisSet(firstId)
    await w.vm.$nextTick()
    await w.vm.$nextTick()
    expect(field(w, 'x1').element.value).toBe('10^-3')
    expect(ctx.axisSetRepository.activeAxisSet.x1.value).toBe(0.001)
  })
})
