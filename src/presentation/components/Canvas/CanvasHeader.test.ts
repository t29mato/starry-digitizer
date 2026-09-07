// INFO: the header's one job is to say which dataset and which axis set the
// canvas is working with. A dataset name is free text — the user can clear it,
// and a host can hand one in empty through the project DTO (its own record may
// not be named yet) — so "no name" is a normal state, not a bug to repair by
// inventing a name. What is not acceptable is the separator that used to float
// after nothing: `Dataset:  / XY Axes: …`.
import { mount } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

import CanvasHeader from './CanvasHeader.vue'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'

type AnyComponent = new () => ComponentPublicInstance

function mountHeader(ctx: DigitizerContext) {
  return mount<AnyComponent>(CanvasHeader as AnyComponent, {
    global: {
      provide: { [DIGITIZER_CONTEXT_KEY as symbol]: ctx },
    },
  })
}

/** The header's own text, with runs of whitespace collapsed as HTML renders them. */
function headerText(wrapper: ReturnType<typeof mountHeader>): string {
  return wrapper.find('.c__current-dataset-and-axis').text().replace(/\s+/g, ' ')
}

describe('CanvasHeader dataset / axis-set caption', () => {
  let ctx: DigitizerContext

  beforeEach(() => {
    ctx = createDigitizerContext()
  })

  it('names both when the dataset has a name', () => {
    const wrapper = mountHeader(ctx)

    expect(headerText(wrapper)).toBe('Dataset: dataset 1 / XY Axes: XY Axes 1')

    wrapper.unmount()
  })

  it('drops the dataset segment, separator included, when the name is empty', async () => {
    ctx.datasetRepository.editDatasetName(1, '')
    const wrapper = mountHeader(ctx)
    await wrapper.vm.$nextTick()

    expect(headerText(wrapper)).toBe('XY Axes: XY Axes 1')
    expect(headerText(wrapper)).not.toContain('/')

    wrapper.unmount()
  })

  it('treats a whitespace-only name as no name', async () => {
    ctx.datasetRepository.editDatasetName(1, '   ')
    const wrapper = mountHeader(ctx)
    await wrapper.vm.$nextTick()

    expect(headerText(wrapper)).toBe('XY Axes: XY Axes 1')

    wrapper.unmount()
  })

  it('still labels the view-all mode, which has no dataset of its own', async () => {
    ctx.datasetRepository.setActiveDataset(0)
    const wrapper = mountHeader(ctx)
    await wrapper.vm.$nextTick()

    expect(headerText(wrapper)).toBe(
      'Dataset: All Datasets (View Only) / XY Axes: XY Axes 1',
    )

    wrapper.unmount()
  })
})
