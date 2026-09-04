import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'

/**
 * Feature toggles. All default to "on" in the standalone app.
 *
 * The first three switch individual controls; the rest hide whole panels, for
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
 * Provide options to panels rendered outside <StarryDigitizer>. Hosts that
 * compose the exported panels themselves call this next to
 * provideDigitizerContext(); otherwise every panel falls back to
 * DEFAULT_OPTIONS.
 */
export function provideDigitizerOptions(options: DigitizerOptions): void {
  provide(DIGITIZER_OPTIONS_KEY, options)
}

export function useDigitizerOptions(): DigitizerOptions {
  return inject(DIGITIZER_OPTIONS_KEY, DEFAULT_OPTIONS)
}
