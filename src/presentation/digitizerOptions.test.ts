import { computed, defineComponent, h, nextTick, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import {
  DEFAULT_CONFIRM,
  DEFAULT_FEATURES,
  DEFAULT_OPTIONS,
  createDigitizerOptions,
  provideDigitizerOptions,
  requestConfirmation,
  useDigitizerOptions,
  type DigitizerOptions,
  type DigitizerOptionsSource,
} from '@/presentation/digitizerOptions'

/**
 * Mounts a child that injects the options inside a parent that provides
 * `source` (or provides nothing at all when it is omitted). The child renders
 * `readonly` into the DOM, so the tests can tell "the proxy reads the new
 * value" apart from "the panel actually re-renders when it changes".
 */
function mountWithOptions(source?: DigitizerOptionsSource) {
  let injected!: DigitizerOptions

  const Child = defineComponent({
    setup() {
      injected = useDigitizerOptions()
      return () => h('div', { class: 'child' }, String(injected.readonly))
    },
  })

  const Parent = defineComponent({
    setup() {
      if (source !== undefined) provideDigitizerOptions(source)
      return () => h(Child)
    },
  })

  const wrapper = mount(Parent)
  return { wrapper, options: injected }
}

describe('useDigitizerOptions', () => {
  it('falls back to DEFAULT_OPTIONS when nothing is provided', () => {
    const { options } = mountWithOptions()

    expect(options).toEqual(DEFAULT_OPTIONS)
    expect(options.readonly).toBe(false)
    expect(options.features.magnifier).toBe(true)
  })

  it('reads a plain object, as hosts have always passed it', () => {
    const provided = createDigitizerOptions({
      readonly: true,
      datasetNameCandidates: ['sample A'],
      features: { magnifier: false },
    })

    const { options } = mountWithOptions(provided)

    expect(options.readonly).toBe(true)
    expect(options.datasetNameCandidates).toEqual(['sample A'])
    // INFO: the nested object must still be a complete feature set
    expect(options.features.magnifier).toBe(false)
    expect(options.features.dataTable).toBe(true)
    expect(Object.keys(options.features).sort()).toEqual(
      Object.keys(DEFAULT_FEATURES).sort(),
    )
  })

  it('sees later changes to a ref of options', async () => {
    const source = ref(createDigitizerOptions({ readonly: false }))

    const { wrapper, options } = mountWithOptions(source)
    expect(options.readonly).toBe(false)
    expect(wrapper.get('.child').text()).toBe('false')

    // INFO: the host flips readonly once it knows the user's permissions
    source.value = createDigitizerOptions({ readonly: true })
    expect(options.readonly).toBe(true)

    await nextTick()
    expect(wrapper.get('.child').text()).toBe('true')
  })

  it('sees later changes to a computed of options', async () => {
    // INFO: the regression this test guards: a host feeding dataset names in
    // from an async fetch saw the panels keep the empty list forever.
    const candidates = ref<string[]>([])
    const source = computed(() =>
      createDigitizerOptions({ datasetNameCandidates: candidates.value }),
    )

    const { options } = mountWithOptions(source)
    expect(options.datasetNameCandidates).toEqual([])

    candidates.value = ['sample A', 'sample B']
    await nextTick()

    expect(options.datasetNameCandidates).toEqual(['sample A', 'sample B'])
  })

  it('sees later changes to a getter', () => {
    let readonly = false
    const { options } = mountWithOptions(() =>
      createDigitizerOptions({ readonly }),
    )

    expect(options.readonly).toBe(false)
    readonly = true
    expect(options.readonly).toBe(true)
  })

  it('sees later changes to a reactive() object, nested features included', async () => {
    const source = reactive(createDigitizerOptions())

    const { wrapper, options } = mountWithOptions(source)
    expect(options.readonly).toBe(false)
    expect(options.features.extractionPanel).toBe(true)

    source.readonly = true
    source.features.extractionPanel = false

    expect(options.readonly).toBe(true)
    expect(options.features.extractionPanel).toBe(false)

    await nextTick()
    expect(wrapper.get('.child').text()).toBe('true')
  })

  it('exposes the same shape whichever source kind it was given', () => {
    const plain = createDigitizerOptions({ readonly: true })

    const fromPlain = mountWithOptions(plain).options
    const fromRef = mountWithOptions(ref(plain)).options

    expect({ ...fromRef }).toEqual({ ...fromPlain })
    expect(Object.keys(fromRef).sort()).toEqual(Object.keys(fromPlain).sort())
    expect('features' in fromRef).toBe(true)
    expect('nope' in fromRef).toBe(false)
  })
})

describe('createDigitizerOptions', () => {
  it('returns the defaults when given nothing', () => {
    expect(createDigitizerOptions()).toEqual(DEFAULT_OPTIONS)
  })

  it('merges features against the defaults instead of replacing them', () => {
    const options = createDigitizerOptions({ features: { csvExport: false } })

    expect(options.features).toEqual({ ...DEFAULT_FEATURES, csvExport: false })
  })

  it('ships axisOcr on by default', () => {
    // INFO: OCR is opt-out, not opt-in: the standalone app and every host
    // that says nothing keep the "Auto-fill values (OCR)" button. Only a
    // host that does not want the ~11MB of tesseract assets turns it off.
    expect(DEFAULT_FEATURES.axisOcr).toBe(true)
    expect(DEFAULT_OPTIONS.features.axisOcr).toBe(true)
    expect(createDigitizerOptions().features.axisOcr).toBe(true)
  })

  it('ships keyboardShortcuts on by default', () => {
    // INFO: opt-out, like axisOcr: the standalone app and every host that
    // says nothing keep Cmd+Z / +/-/0 / the mode keys. Only a host with a
    // shortcut system of its own — where Cmd+Z already means something —
    // turns it off, and then the canvas registers no key listener at all.
    expect(DEFAULT_FEATURES.keyboardShortcuts).toBe(true)
    expect(DEFAULT_OPTIONS.features.keyboardShortcuts).toBe(true)
    expect(createDigitizerOptions().features.keyboardShortcuts).toBe(true)
  })

  it('keeps every other flag when a host turns axisOcr off', () => {
    const options = createDigitizerOptions({ features: { axisOcr: false } })

    expect(options.features).toEqual({ ...DEFAULT_FEATURES, axisOcr: false })
    expect(options.features.axisPanel).toBe(true)
    expect(options.features.magnifier).toBe(true)
    expect(Object.keys(options.features).sort()).toEqual(
      Object.keys(DEFAULT_FEATURES).sort(),
    )
  })

  it('builds what <StarryDigitizer> builds from its props', () => {
    // INFO: mirrors the object the component used to assemble inline, so the
    // switch to this helper cannot have changed what it provides.
    const hostFeatures = { magnifier: false }
    const expected: DigitizerOptions = {
      readonly: true,
      features: {
        ...DEFAULT_FEATURES,
        imageUpload: false,
        zipExportImport: false,
        ...hostFeatures,
      },
      datasetNameCandidates: ['sample A'],
      assetBaseUrl: 'https://example.test/assets/',
      confirmImageReplace: false,
      confirm: DEFAULT_CONFIRM,
    }

    expect(
      createDigitizerOptions({
        readonly: true,
        features: {
          imageUpload: false,
          zipExportImport: false,
          ...hostFeatures,
        },
        datasetNameCandidates: ['sample A'],
        assetBaseUrl: 'https://example.test/assets/',
        confirmImageReplace: false,
      }),
    ).toEqual(expected)
  })

  it('does not share the nested features object with DEFAULT_FEATURES', () => {
    const options = createDigitizerOptions()
    options.features.dataTable = false

    expect(DEFAULT_FEATURES.dataTable).toBe(true)
    expect(DEFAULT_OPTIONS.features.dataTable).toBe(true)
  })
})

/**
 * The seam a host uses to keep the digitizer from opening a dialog the
 * surrounding app would never open. Everything the library asks goes through
 * here, so this is where "the default still behaves exactly as before" and
 * "a broken host dialog does not eat the user's click" are pinned down.
 */
describe('requestConfirmation', () => {
  let confirmSpy: jest.SpyInstance

  beforeEach(() => {
    // INFO: jsdom's own window.confirm is a "not implemented" stub, so the
    // default path is only observable through a spy.
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('asks window.confirm when the host installed nothing', async () => {
    const options = createDigitizerOptions()

    await expect(requestConfirmation(options, 'delete it?')).resolves.toBe(true)
    expect(confirmSpy).toHaveBeenCalledWith('delete it?')
  })

  it('looks window.confirm up per call, so a test double is seen', () => {
    // INFO: Cypress (cy.on('window:confirm')) and jest.spyOn both replace the
    // property after this module was evaluated. DEFAULT_CONFIRM must not have
    // captured the original function at import time.
    expect(DEFAULT_CONFIRM('captured?')).toBe(true)
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })

  it("asks the host's dialog instead, and never the browser's", async () => {
    const confirm = jest.fn(() => Promise.resolve(false))
    const options = createDigitizerOptions({ confirm })

    await expect(requestConfirmation(options, 'delete it?')).resolves.toBe(
      false,
    )
    expect(confirm).toHaveBeenCalledWith('delete it?')
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('accepts a synchronous host dialog too', async () => {
    const options = createDigitizerOptions({ confirm: () => true })

    await expect(requestConfirmation(options, 'delete it?')).resolves.toBe(true)
  })

  it('treats anything but an explicit true as "no"', async () => {
    // INFO: a host dialog that resolves with its own "cancel" value (undefined
    // from a closed modal, say) must not read as consent to a destructive
    // action.
    const options = createDigitizerOptions({
      confirm: () => Promise.resolve(undefined as unknown as boolean),
    })

    await expect(requestConfirmation(options, 'delete it?')).resolves.toBe(
      false,
    )
  })

  it('falls back to the browser dialog when the host one rejects', async () => {
    // INFO: the user clicked something; the worst outcome is that the click
    // disappears with no explanation. Asking again in an ugly native dialog
    // is the lesser evil, and it keeps the decision with the user rather than
    // guessing "yes" on a destructive action.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const confirm = jest.fn(() => Promise.reject(new Error('modal is gone')))
    const options = createDigitizerOptions({ confirm })

    await expect(requestConfirmation(options, 'delete it?')).resolves.toBe(true)
    expect(confirmSpy).toHaveBeenCalledWith('delete it?')
    expect(warn).toHaveBeenCalled()
  })

  it('falls back the same way when the host one throws synchronously', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    confirmSpy.mockReturnValue(false)
    const options = createDigitizerOptions({
      confirm: () => {
        throw new Error('boom')
      },
    })

    await expect(requestConfirmation(options, 'delete it?')).resolves.toBe(
      false,
    )
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })

  it('does not re-ask the browser when the browser dialog is what failed', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    confirmSpy.mockImplementation(() => {
      throw new Error('blocked by the browser')
    })

    await expect(
      requestConfirmation(createDigitizerOptions(), 'delete it?'),
    ).resolves.toBe(false)
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })
})
