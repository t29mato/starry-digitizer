import { mount, VueWrapper } from '@vue/test-utils'
import CanvasMain from '@/presentation/components/Canvas/CanvasMain.vue'
import ImageSettings from '@/presentation/components/Settings/ImageSettings.vue'
import { createDigitizerContext } from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
} from '@/presentation/digitizerOptions'
import { DIGITIZER_ERROR_CODES } from '@/application/errors'

/**
 * What a panel puts on its `error` event.
 *
 * A host may compose the panels itself instead of mounting <StarryDigitizer>,
 * and then it is the one receiving these events. The root emits a normalised
 * DigitizerErrorPayload, so the panels must emit the same shape — an `error`
 * whose type depended on which component happened to emit it would break the
 * host's `payload.code` branch the moment the root is dropped.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mountPanel(component: any): VueWrapper {
  return mount(component, {
    global: {
      provide: {
        [DIGITIZER_CONTEXT_KEY as symbol]: createDigitizerContext(),
        [DIGITIZER_OPTIONS_KEY as symbol]: createDigitizerOptions({}),
      },
    },
  })
}

function firstErrorPayload(wrapper: VueWrapper): {
  code: string
  message: string
} {
  const events = wrapper.emitted('error')
  expect(events).toHaveLength(1)
  return (events as unknown[][])[0][0] as { code: string; message: string }
}

describe('panel error events', () => {
  it('CanvasMain emits a payload for a failed project file operation', async () => {
    const wrapper = mountPanel(CanvasMain)

    await (
      wrapper.vm as unknown as {
        runProjectFileOperation: (
          operation: Promise<{ success: boolean; errorMessage?: string }>,
        ) => Promise<void>
      }
    ).runProjectFileOperation(
      Promise.resolve({ success: false, errorMessage: 'Invalid project file' }),
    )

    const payload = firstErrorPayload(wrapper)
    expect(payload.code).toBe('PROJECT_INVALID')
    expect(payload.message).toBe('Invalid project file')
  })

  it('ImageSettings emits a payload carrying the code the failure came with', async () => {
    const wrapper = mountPanel(ImageSettings)

    // INFO: a non-image file — the loader rejects the MIME type with
    // INVALID_IMAGE_TYPE, which must survive the panel's IMAGE_LOAD_FAILED
    // fallback and reach the host unchanged.
    await (
      wrapper.vm as unknown as {
        updateImage: (file: File) => Promise<void>
      }
    ).updateImage(
      new File(['not an image'], 'notes.txt', { type: 'text/plain' }),
    )

    const payload = firstErrorPayload(wrapper)
    expect(payload.code).toBe('INVALID_IMAGE_TYPE')
    expect(DIGITIZER_ERROR_CODES).toContain(payload.code)
    expect(typeof payload.message).toBe('string')
  })
})
