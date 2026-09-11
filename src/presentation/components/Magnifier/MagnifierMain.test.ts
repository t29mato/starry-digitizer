// INFO: what the magnifier shows when there is nothing to magnify. An
// embedded review found the box "looks like a broken image" on first sight:
// the library painted no background of its own, so the three quarters the
// magnified image does not cover before the first hover showed the HOST page
// through — a transparency checkerboard, in that host.
//
// The transparency itself is fixed in CSS (a --sd-surface background); what is
// worth pinning down here is WHEN the hint replaces the view, because the
// tempting rule — "whenever the cursor is off the image" — would undo #255:
// once the user has magnified something, leaving the image freezes the view at
// the clamped edge on purpose, and an off-image drag keeps following.
import { mount } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

import MagnifierMain from './MagnifierMain.vue'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
} from '@/presentation/digitizerOptions'

const PLACEHOLDER = '[data-cy="magnifier-placeholder"]'
const MAGNIFIED_IMAGE = 'img[alt="the image you uploaded"]'
const IMAGE_URL = 'data:image/png;base64,iVBORw0KGgo='

type AnyComponent = new () => ComponentPublicInstance

function mountMagnifier(ctx: DigitizerContext) {
  return mount<AnyComponent>(MagnifierMain as AnyComponent, {
    global: {
      provide: {
        [DIGITIZER_CONTEXT_KEY as symbol]: ctx,
        [DIGITIZER_OPTIONS_KEY as symbol]: createDigitizerOptions({}),
      },
    },
  })
}

describe('magnifier placeholder', () => {
  let ctx: DigitizerContext

  beforeEach(() => {
    ctx = createDigitizerContext()
  })

  it('explains that an image is missing instead of drawing a broken <img>', async () => {
    const wrapper = mountMagnifier(ctx)

    expect(wrapper.find(PLACEHOLDER).text()).toContain(
      'once an image is loaded',
    )
    // INFO: `src=""` makes the browser request the document itself and draw
    // its broken-image icon, which is exactly the "it looks broken" report.
    expect(wrapper.find(MAGNIFIED_IMAGE).exists()).toBe(false)

    wrapper.unmount()
  })

  it('invites the user to hover once an image is loaded', async () => {
    ctx.canvasHandler.setUploadImageUrl(IMAGE_URL)
    const wrapper = mountMagnifier(ctx)
    await wrapper.vm.$nextTick()

    expect(wrapper.find(PLACEHOLDER).text()).toContain(
      'Move the cursor over the graph',
    )
    expect(wrapper.find(MAGNIFIED_IMAGE).exists()).toBe(true)

    wrapper.unmount()
  })

  it('gets out of the way as soon as the cursor reaches the image', async () => {
    ctx.canvasHandler.setUploadImageUrl(IMAGE_URL)
    const wrapper = mountMagnifier(ctx)

    ctx.canvasHandler.setIsCursorOnCanvas(true)
    await wrapper.vm.$nextTick()

    expect(wrapper.find(PLACEHOLDER).exists()).toBe(false)

    wrapper.unmount()
  })

  it('does not come back when the cursor leaves the image again (#255)', async () => {
    ctx.canvasHandler.setUploadImageUrl(IMAGE_URL)
    const wrapper = mountMagnifier(ctx)

    ctx.canvasHandler.setIsCursorOnCanvas(true)
    await wrapper.vm.$nextTick()
    ctx.canvasHandler.setIsCursorOnCanvas(false)
    await wrapper.vm.$nextTick()

    // INFO: the clamped-edge view is the point of #255, and an off-image drag
    // (mask painting, rectangle select) keeps following the cursor. Blanking
    // either of them would be a regression, not a fix.
    expect(wrapper.find(PLACEHOLDER).exists()).toBe(false)

    wrapper.unmount()
  })

  it('starts over when a new image is loaded', async () => {
    ctx.canvasHandler.setUploadImageUrl(IMAGE_URL)
    const wrapper = mountMagnifier(ctx)

    ctx.canvasHandler.setIsCursorOnCanvas(true)
    await wrapper.vm.$nextTick()
    ctx.canvasHandler.setIsCursorOnCanvas(false)
    ctx.canvasHandler.setUploadImageUrl(`${IMAGE_URL}AAAA`)
    await wrapper.vm.$nextTick()

    // INFO: the frozen view belongs to the previous image.
    expect(wrapper.find(PLACEHOLDER).text()).toContain(
      'Move the cursor over the graph',
    )

    wrapper.unmount()
  })

  // INFO: the read-out used to show the conversion of pixel (0, 0) before the
  // cursor had ever been over the graph. On a calibrated figure that is not an
  // obviously-empty "0px" but a plausible measurement (the embedding host
  // measured `x: 1.286e+2, y: 3e-5`), which a reader takes for a live value.
  it('shows a dash instead of a plausible value before the first hover', async () => {
    ctx.canvasHandler.setUploadImageUrl(IMAGE_URL)
    const wrapper = mountMagnifier(ctx)

    expect(wrapper.text()).toContain('x: —, y: —')

    ctx.canvasHandler.setIsCursorOnCanvas(true)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('x: —, y: —')

    wrapper.unmount()
  })
})
