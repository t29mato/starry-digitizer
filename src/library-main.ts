// INFO: Public entry point of the npm package (`starry-digitizer`).
// Named exports only: the old Vue 2 style auto-install plugin is gone.
// Everything a host application needs to embed <StarryDigitizer> must be
// re-exported from here, because `library-build/dist/index.d.ts` is
// generated from this file alone.

// ---------------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------------
export { default as StarryDigitizer } from './presentation/components/StarryDigitizer.vue'
export type { StarryDigitizerProps } from './presentation/components/StarryDigitizer.vue'

// ---------------------------------------------------------------------------
// Individual panels, for hosts that lay the digitizer out themselves
// ---------------------------------------------------------------------------
// INFO: <StarryDigitizer> is a ready-made three-column layout. A host that
// needs its own arrangement (a fixed-height single-screen editor, panels
// interleaved with its own form) can instead create one context with
// createDigitizerContext(), hand it to provideDigitizerContext() (plus
// provideDigitizerOptions() / provideI18n() if it wants non-default options or
// a locale) in its own setup(), and place these panels wherever it likes. They
// all read that context, so they stay in sync exactly as they do inside
// <StarryDigitizer>. See README "Composing the panels yourself".
export {
  CanvasHeader,
  CanvasFooter,
  CanvasMain,
} from './presentation/components/Canvas'
export { MagnifierMain } from './presentation/components/Magnifier'
export { AxisSetManager } from './presentation/components/AxisSetManager'
export { DatasetManager } from './presentation/components/DatasetManager'
export {
  AxisSetSettings,
  ExtractorSettings,
  ImageSettings,
  MaskSettings,
  ColorSettings,
} from './presentation/components/Settings'
export { default as DataTable } from './presentation/components/Export/DataTable.vue'
export { default as ConfirmerBar } from './presentation/components/Generals/ConfirmerBar.vue'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
export {
  createDigitizerContext,
  provideDigitizerContext,
  useDigitizerContext,
  DIGITIZER_CONTEXT_KEY,
} from './application/digitizerContext'
export type { DigitizerContext } from './application/digitizerContext'

export {
  provideDigitizerOptions,
  useDigitizerOptions,
  DEFAULT_FEATURES,
  DEFAULT_OPTIONS,
  DIGITIZER_OPTIONS_KEY,
} from './presentation/digitizerOptions'
export type {
  DigitizerOptions,
  StarryDigitizerFeatures,
} from './presentation/digitizerOptions'

// ---------------------------------------------------------------------------
// Operations (what the component calls internally; a composing host needs them)
// ---------------------------------------------------------------------------
export {
  applyImage,
  replaceImage,
  loadProject,
  reset,
} from './application/utils/digitizerOperations'
export { getDatasetValues } from './application/utils/datasetValues'
export type { DatasetValues } from './application/utils/datasetValues'
export { loadImageAsDataUrl } from './application/utils/imageLoader'
export type { ImageSource } from './application/utils/imageLoader'

// ---------------------------------------------------------------------------
// Project data
// ---------------------------------------------------------------------------
export type {
  ProjectDTO,
  AxisSetDTO,
  DatasetDTO,
  AxisDTO,
  CanvasHandlerDTO,
} from './application/dto'
export {
  migrateProject,
  PROJECT_DTO_VERSION,
  createEmptyProject,
} from './application/dto'

// ---------------------------------------------------------------------------
// Errors and i18n
// ---------------------------------------------------------------------------
export { DigitizerError } from './application/errors'
export type {
  DigitizerErrorCode,
  DigitizerErrorPayload,
} from './application/errors'

export {
  createI18n,
  provideI18n,
  useI18n,
  detectLocale,
  translate,
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
} from './presentation/i18n'
export type { Locale } from './presentation/i18n'
