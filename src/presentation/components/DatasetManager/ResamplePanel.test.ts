import { mount } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

import ResamplePanel from './ResamplePanel.vue'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
} from '@/presentation/digitizerOptions'
import { POINT_MODE } from '@/constants'

type AnyComponent = new () => ComponentPublicInstance

function mountWith(ctx: DigitizerContext, readonly = false) {
  return mount<AnyComponent>(ResamplePanel as unknown as AnyComponent, {
    global: {
      provide: {
        [DIGITIZER_CONTEXT_KEY as symbol]: ctx,
        [DIGITIZER_OPTIONS_KEY as symbol]: createDigitizerOptions({ readonly }),
      },
    },
  })
}

function calibratedContext(): DigitizerContext {
  const ctx = createDigitizerContext()
  const axisSet = ctx.axisSetRepository.activeAxisSet
  axisSet.pointMode = POINT_MODE.FOUR_POINTS
  axisSet.addAxisCoord({ xPx: 0, yPx: 100 })
  axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
  axisSet.addAxisCoord({ xPx: 0, yPx: 100 })
  axisSet.addAxisCoord({ xPx: 0, yPx: 0 })
  axisSet.x1.value = 0
  axisSet.x2.value = 100
  axisSet.y1.value = 0
  axisSet.y2.value = 100
  for (let i = 0; i <= 100; i++) {
    ctx.datasetRepository.activeDataset.addPoint(i, 100 - i / 2)
  }
  return ctx
}

describe('ResamplePanel', () => {
  test('previews "101 points → 20 points" and applies as one undo step', async () => {
    const ctx = calibratedContext()
    const wrapper = mountWith(ctx)
    await wrapper.find('[data-cy="resample-toggle"]').trigger('click')
    expect(wrapper.find('[data-cy="resample-summary"]').text()).toBe(
      '101 points → 20 points',
    )
    await wrapper.find('[data-cy="resample-apply"]').trigger('click')
    expect(ctx.datasetRepository.activeDataset.points).toHaveLength(20)
    ctx.historyManager.undo()
    expect(ctx.datasetRepository.activeDataset.points).toHaveLength(101)
  })

  test('shows the error and disables Apply; readonly disables Apply', async () => {
    const ctx = createDigitizerContext()
    ctx.datasetRepository.activeDataset.addPoint(1, 1)
    ctx.datasetRepository.activeDataset.addPoint(2, 2)
    const wrapper = mountWith(ctx)
    await wrapper.find('[data-cy="resample-toggle"]').trigger('click')
    expect(wrapper.find('[data-cy="resample-error"]').text()).toMatch(
      /Calibrate/,
    )
    expect(
      wrapper.find('[data-cy="resample-apply"]').attributes('disabled'),
    ).toBeDefined()

    const readonly = mountWith(calibratedContext(), true)
    await readonly.find('[data-cy="resample-toggle"]').trigger('click')
    expect(
      readonly.find('[data-cy="resample-apply"]').attributes('disabled'),
    ).toBeDefined()
  })
})
