// INFO: Entry point of the `starry-digitizer/vue` subpath export.
//
// The Vue-specific half of the library: the provide/inject wiring, the
// per-instance UI options and the individual panels. A host
// that wants its own layout imports the state from `starry-digitizer/core` and
// the panels from here; a host that just wants the ready-made three-column
// editor imports <StarryDigitizer> from the package root instead.
//
// Everything exported here is also re-exported from the default entry, so
// nothing that used the package root has to change.

// ---------------------------------------------------------------------------
// Individual panels, for hosts that lay the digitizer out themselves
// ---------------------------------------------------------------------------
// INFO: <StarryDigitizer> is a ready-made three-column layout. A host that
// needs its own arrangement (a fixed-height single-screen editor, panels
// interleaved with its own form) can instead create one context with
// createDigitizerContext(), hand it to provideDigitizerContext() (plus
// provideDigitizerOptions() if it wants non-default options) in its own
// setup(), and place these panels wherever it likes. They
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
// provide/inject wiring
// ---------------------------------------------------------------------------
export {
  provideDigitizerContext,
  useDigitizerContext,
  DIGITIZER_CONTEXT_KEY,
} from './presentation/digitizerContextProvider'

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
