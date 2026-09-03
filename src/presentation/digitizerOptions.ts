import { inject } from 'vue'
import type { InjectionKey } from 'vue'

/** Feature toggles. All default to "on" in the standalone app. */
export interface StarryDigitizerFeatures {
  /** Show the image file input / accept drag&drop + paste. */
  imageUpload: boolean
  /** Show "Save/Load Project" (ZIP) buttons and their keyboard shortcuts. */
  zipExportImport: boolean
  /** Show "Copy to Clipboard" (CSV) buttons. */
  csvExport: boolean
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
}

export const DEFAULT_OPTIONS: DigitizerOptions = {
  readonly: false,
  features: DEFAULT_FEATURES,
  datasetNameCandidates: [],
  assetBaseUrl: undefined,
  confirmImageReplace: true,
}

export function useDigitizerOptions(): DigitizerOptions {
  return inject(DIGITIZER_OPTIONS_KEY, DEFAULT_OPTIONS)
}
