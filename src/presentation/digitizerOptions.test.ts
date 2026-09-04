import { computed, defineComponent, h, nextTick, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import {
  DEFAULT_FEATURES,
  DEFAULT_OPTIONS,
  createDigitizerOptions,
  provideDigitizerOptions,
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
