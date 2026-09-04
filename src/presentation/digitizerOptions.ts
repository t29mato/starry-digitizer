import { inject, isRef, provide } from 'vue'
import type { InjectionKey, Ref } from 'vue'

/**
 * Feature toggles. All default to "on" in the standalone app.
 *
 * The first four switch individual controls; the rest hide whole panels, for
 * hosts that already provide the same thing in their own UI (a sample picker,
 * a point-list editor, ...) and would otherwise show it twice.
 */
export interface StarryDigitizerFeatures {
  /** Show the image file input / accept drag&drop + paste. */
  imageUpload: boolean
  /** Show "Save/Load Project" (ZIP) buttons and their keyboard shortcuts. */
  zipExportImport: boolean
  /** Show "Copy to Clipboard" (CSV) buttons. */
  csvExport: boolean
  /**
   * Show "Auto-fill values (OCR)" in the axis panel. Off also keeps the
   * ~11MB of tesseract.js worker/wasm/language assets out of the host build,
   * since nothing can reach the (lazy) OCR code path any more.
   */
  axisOcr: boolean
  /** Show the axis-set list and its calibration panel. */
  axisPanel: boolean
  /** Show the dataset list. */
  datasetPanel: boolean
  /** Show the manual/automatic extraction panel. */
  extractionPanel: boolean
  /** Show the magnifier. */
  magnifier: boolean
  /** Show the table of extracted values. */
  dataTable: boolean
}

/**
 * Per-instance UI options derived from <StarryDigitizer> props and provided
 * to every descendant. Components read them with useDigitizerOptions().
 */
export interface DigitizerOptions {
  /** Viewing only: no point/axis/dataset edits, no extraction, no undo/redo. */
  readonly: boolean
  features: StarryDigitizerFeatures
  /** Dataset name suggestions; when non-empty the name field becomes a combobox. */
  datasetNameCandidates: string[]
  /** Base URL for heavy assets (tesseract worker/core/lang). undefined = library defaults. */
  assetBaseUrl?: string
  /** Ask before replacing an image that already has axes/points. */
  confirmImageReplace: boolean
}

export const DIGITIZER_OPTIONS_KEY: InjectionKey<DigitizerOptions> = Symbol(
  'starry-digitizer-options',
)

export const DEFAULT_FEATURES: StarryDigitizerFeatures = {
  imageUpload: true,
  zipExportImport: true,
  csvExport: true,
  axisOcr: true,
  axisPanel: true,
  datasetPanel: true,
  extractionPanel: true,
  magnifier: true,
  dataTable: true,
}

export const DEFAULT_OPTIONS: DigitizerOptions = {
  readonly: false,
  features: DEFAULT_FEATURES,
  datasetNameCandidates: [],
  assetBaseUrl: undefined,
  confirmImageReplace: true,
}

/**
 * Partial options, with `features` partial too: the nested object is merged
 * against DEFAULT_FEATURES rather than replacing it, so a host can turn one
 * feature off without having to restate the other eight.
 */
export interface DigitizerOptionsInit
  extends Partial<Omit<DigitizerOptions, 'features'>> {
  features?: Partial<StarryDigitizerFeatures>
}

/**
 * Fill a partial set of options out to a complete DigitizerOptions, exactly
 * the way <StarryDigitizer> fills its props out (it uses this too). Spreading
 * DEFAULT_OPTIONS by hand does not do the same thing: `features` is nested, so
 * `{ ...DEFAULT_OPTIONS, features: { magnifier: false } }` would silently drop
 * every other feature flag.
 */
export function createDigitizerOptions(
  init: DigitizerOptionsInit = {},
): DigitizerOptions {
  return {
    readonly: init.readonly ?? DEFAULT_OPTIONS.readonly,
    features: { ...DEFAULT_FEATURES, ...init.features },
    datasetNameCandidates:
      init.datasetNameCandidates ?? DEFAULT_OPTIONS.datasetNameCandidates,
    assetBaseUrl: init.assetBaseUrl ?? DEFAULT_OPTIONS.assetBaseUrl,
    confirmImageReplace:
      init.confirmImageReplace ?? DEFAULT_OPTIONS.confirmImageReplace,
  }
}

/**
 * What provideDigitizerOptions() accepts: a plain object, a reactive() one, a
 * ref/computed holding one, or a getter returning one. Whichever the host
 * passes, useDigitizerOptions() hands back the same plain-looking
 * DigitizerOptions and readers write `options.readonly` — no `.value`.
 */
export type DigitizerOptionsSource =
  | DigitizerOptions
  | Ref<DigitizerOptions>
  | (() => DigitizerOptions)

/**
 * Flatten a ref/getter source into an object whose property reads go through
 * to the current value. A plain object needs no wrapper, and neither does a
 * reactive() one (reading a property off it already tracks), so those are
 * passed through as they are.
 */
function resolveDigitizerOptions(
  source: DigitizerOptionsSource,
): DigitizerOptions {
  if (typeof source !== 'function' && !isRef(source)) return source

  const read = (): DigitizerOptions =>
    typeof source === 'function' ? source() : source.value

  // INFO: a proxy rather than the ref itself, so descendants keep reading
  // `options.readonly` and still see every change: each property access reads
  // the ref again (and, inside a render/computed, subscribes to it).
  return new Proxy({} as DigitizerOptions, {
    get: (_target, key) => read()[key as keyof DigitizerOptions],
    has: (_target, key) => key in read(),
    ownKeys: () => Reflect.ownKeys(read()),
    getOwnPropertyDescriptor: (_target, key) => ({
      enumerable: true,
      configurable: true,
      value: read()[key as keyof DigitizerOptions],
    }),
  })
}

/**
 * Provide options to panels rendered outside <StarryDigitizer>. Hosts that
 * compose the exported panels themselves call this next to
 * provideDigitizerContext(); otherwise every panel falls back to
 * DEFAULT_OPTIONS.
 *
 * Pass a ref/computed/reactive object (see DigitizerOptionsSource) when the
 * options change after setup — permission-driven `readonly`, dataset name
 * candidates that arrive from a fetch — and the panels follow along.
 */
export function provideDigitizerOptions(options: DigitizerOptionsSource): void {
  provide(DIGITIZER_OPTIONS_KEY, resolveDigitizerOptions(options))
}

export function useDigitizerOptions(): DigitizerOptions {
  return inject(DIGITIZER_OPTIONS_KEY, DEFAULT_OPTIONS)
}
