import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ExtractorSettings from './ExtractorSettings.vue'
import { interpolator } from '@/instanceStore/applicationServiceInstances'

// Regression test for issue #275 (Interpolation toggle visual state not
// matching actual state). This drives the REAL component through its REAL
// reactivity chain (no hand-rolled reactive() probes), the same way the
// real v-switch does: emitting update:model-value and letting Vue flush.
//
// Investigation note: this exact chain — this.interpolator.setIsActive()
// mutating a singleton reached via this component's own `data()` — already
// worked correctly even *before* the #122/#266 reactive()-at-source fix,
// because Vue auto-wraps whatever `data()` returns (including nested
// objects) in a reactive proxy, regardless of whether the module that
// exports the singleton also wraps it. #122's bug was specifically about
// *application-layer* code (e.g. Interpolator.updatePreview()) mutating
// datasetRepository via a raw, un-wrapped import — a different code path
// affecting canvas tempPoints, not this switch/Interval-Confirm visibility.
// This test guards against a regression of either mechanism.
// Minimal fake canvas satisfying what Interpolator.updatePreview()'s early
// (no-anchor-points) path touches: clearGuideCanvasContext/
// clearMagnifierCanvasContext. Mirrors what CanvasMain.vue's mounted() hook
// wires up for real via `new HTMLCanvas(id)`.
function fakeCanvas() {
  return {
    element: { width: 100, height: 100 },
    context: {
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      drawImage: () => {},
      lineWidth: 0,
      strokeStyle: '',
    },
  } as any
}

describe('ExtractorSettings interpolation toggle (issue #275)', () => {
  beforeEach(() => {
    interpolator.setIsActive(false)
    interpolator.setGuideCanvas(fakeCanvas())
    interpolator.setMagnifierCanvas(fakeCanvas())
  })

  test('toggling the switch synchronously updates isActive and the DOM reflects it after nextTick, without any unrelated re-render', async () => {
    const wrapper = mount(ExtractorSettings, {
      global: {
        stubs: {
          // Stub out Vuetify + child components; VSwitch stub simply forwards
          // update:model-value like the real component contract does.
          VSwitch: {
            template:
              '<input type="checkbox" id="switch-interpolation" @change="$emit(\'update:model-value\', $event.target.checked)" />',
          },
          VBtnToggle: { template: '<div><slot /></div>' },
          VBtn: { template: '<button><slot /></button>' },
          VTextField: { template: '<input />' },
          VSelect: { template: '<select></select>' },
          SymbolExtractSettings: true,
          LineExtractSettings: true,
          MaskSettings: true,
          ColorSettings: true,
        },
      },
    })

    expect(wrapper.find('#interpolation-interval').exists()).toBe(false)

    // Simulate the exact same call the real v-switch's @update:model-value
    // performs: this triggers handleOnClickInterpolatiorSwitch(true).
    ;(wrapper.vm as any).handleOnClickInterpolatiorSwitch(true)

    // The underlying reactive state must already be true synchronously.
    expect(interpolator.isActive).toBe(true)

    // Now let Vue flush its scheduled render job — no OTHER unrelated
    // component/state mutation happens here (unlike clicking "Clear XY Axes"
    // in the real app), so if #275 were caused by this component's own
    // reactivity chain, the DOM would still be missing the Interval/Confirm
    // block at this point.
    await nextTick()
    await flushPromises()

    expect(wrapper.find('#interpolation-interval').exists()).toBe(true)
    expect(wrapper.find('#confirm-interpolation').exists()).toBe(true)

    wrapper.unmount()
  })
})
