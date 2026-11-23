import { mount } from '@vue/test-utils'

import AboutDialog from './AboutDialog.vue'
import { createDigitizerContext } from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'

function mountDialog(withService: boolean) {
  const ctx = createDigitizerContext()
  if (withService) {
    ctx.autoFeatures.setService({
      capabilities: async () => [],
      calibrate: async () => ({}),
      extract: async () => ({}),
      components: async () => ({ components: [] }),
    })
  }
  return mount(AboutDialog, {
    props: {
      modelValue: true,
      page: {
        version: '2.0.0',
        build: '7',
        commit: '2d8de3f0123456789abcdef0123456789abcdef0',
        environment: 'production',
      },
    },
    global: {
      provide: { [DIGITIZER_CONTEXT_KEY as symbol]: ctx },
      stubs: { teleport: true },
    },
  })
}

describe('AboutDialog', () => {
  it("shows the page's own version, build and commit", () => {
    const wrapper = mountDialog(false)

    expect(wrapper.get('[data-cy="about-page-version"]').text()).toBe(
      'This page v2.0.0 · build 7 · commit 2d8de3f01234 · production',
    )
  })

  it('has the Components list only when an auto service is configured', () => {
    expect(
      mountDialog(false).find('[data-cy="auto-components"]').exists(),
    ).toBe(false)
    expect(mountDialog(true).find('[data-cy="auto-components"]').exists()).toBe(
      true,
    )
  })
})
