// INFO: Entry point of the `starry-digitizer/core` subpath export.
//
// Everything here runs without Vue's renderer: the digitizer's state, the
// operations that mutate it, the project DTOs and the errors. A host written
// in React, Svelte or plain JavaScript can drive the engine through this entry
// alone and subscribe to changes with the re-exported `effect`.
//
// It is NOT a Node package: a 2D canvas context and image decoding are
// required (see docs/design/engine-boundary.md §2). Nothing exported from here
// may import `vue`, a `.vue` file or anything under src/presentation — the
// `lib-check` script fails the build when it does.

// ---------------------------------------------------------------------------
// Change notification
// ---------------------------------------------------------------------------
// INFO: re-exported from @vue/reactivity rather than reinvented. `vue` depends
// on the same package, so a Vue host shares one copy and pays nothing extra;
// a non-Vue host installs @vue/reactivity alone. `watch` is deliberately not
// re-exported — it only became part of @vue/reactivity in Vue 3.5, and the
// supported peer range starts at 3.3.
export {
  effect,
  stop,
  computed,
  ref,
  reactive,
  readonly,
  isReactive,
  isRef,
  unref,
  toRaw,
  markRaw,
  effectScope,
} from '@vue/reactivity'
export type { ReactiveEffectRunner } from '@vue/reactivity'

// INFO: `reactive()` reports state ("can I undo?"); it cannot report an event
// ("a capture just happened"), and two captures in a row would look like one
// to a watcher. `ctx.historyManager.subscribe(listener)` is that event, for a
// host that keeps its own undo stack and needs one entry per capture. These
// are the types of what the listener receives — the same payload
// <StarryDigitizer> re-emits as `history-change`.
export type {
  HistoryChange,
  HistoryChangeType,
  HistoryChangeListener,
} from './application/services/historyManager/historyManagerInterface'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
export { createDigitizerContext } from './application/digitizerContext'
export type { DigitizerContext } from './application/digitizerContext'

// ---------------------------------------------------------------------------
// Operations (what the component calls internally; a composing host needs them)
// ---------------------------------------------------------------------------
export {
  applyImage,
  replaceImage,
  loadProject,
  reset,
} from './application/utils/digitizerOperations'
// INFO: the dataset-list use cases. A host that replaces <DatasetManager>
// with its own list drives it through these — they carry the call order, the
// undo capture and the mask/axis-set clean-up a hand-written list would have
// to rediscover. See README "Replacing the dataset list".
// `renameDataset` and `setDatasetExternalId` are the two a host reaches for
// FIRST when it owns the list: the name is what it shows, and `externalId` is
// how it links a row back to its own record. Both were previously reachable
// only by writing to the repository and the domain object directly.
export {
  activateDataset,
  addDataset,
  linkDataset,
  renameDataset,
  setDatasetExternalId,
  removeDataset,
  removeAllDatasets,
  clearDatasetPoints,
  viewAllDatasets,
} from './application/utils/datasetOperations'
export type { DatasetInit } from './application/utils/datasetOperations'
// INFO: the point-level use cases. A host that replaces <ExtractorSettings>
// or the point overlay with its own UI drives them through these — they carry
// the undo capture, so a plot click, "Run", "Confirm" and a delete click stay
// undoable whoever asks for them. `addPoint()` additionally registers the
// point as an interpolation anchor, which a hand-written `addPoint()` call
// silently omits. See README "Undo granularity".
export {
  addPoint,
  extractPoints,
  confirmInterpolation,
  deletePoint,
} from './application/utils/pointOperations'
// INFO: the axis-set use cases. A host that replaces <AxisSetManager> /
// <AxisSetSettings> drives them through these — they carry the undo capture,
// so placing a calibration coordinate, clearing the calibration, auto-detecting
// axis values, adding/removing an axis set and flipping log scale / tilt /
// calibration mode stay undoable whoever asks for them. `addAxisCoord()` also
// documents which axes one call consumes in each point mode. See README "Undo
// granularity".
export {
  activateAxisSet,
  addAxisCoord,
  addAxisSet,
  removeAxisSet,
  clearAxisSetCoords,
  setAxisValues,
  setLogScale,
  setConsiderGraphTilt,
  setPointMode,
} from './application/utils/axisSetOperations'
// INFO: how big to draw an overlay marker at the current zoom. A host that
// renders its own point/axis overlay needs this, because marker coordinates
// scale with the canvas and a fixed marker size therefore swamps the figure
// at low zoom — the bounds in STYLE keep it visible and hittable at both
// extremes. The built-in CanvasPoint / CanvasAxis use exactly this.
export { scaledMarkerSizePx } from './application/utils/markerSize'
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
// Mode constants
// ---------------------------------------------------------------------------
// INFO: a host that replaces a panel with its own UI has to speak the same
// modes the engine does — `setManualMode(MANUAL_MODE.ADD)`,
// `setMaskMode(MASK_MODE.UNSET)`, `axisSet.pointMode = POINT_MODE.FOUR_POINTS`.
// Without these it writes bare numbers.
export { MANUAL_MODE, MASK_MODE, POINT_MODE, STYLE } from './constants'
export type { ManualMode, MaskMode, PointMode } from './@types/types'

// ---------------------------------------------------------------------------
// The context's own types
// ---------------------------------------------------------------------------
// INFO: every field of DigitizerContext, by name. A host that splits its UI
// across components has to name these types to pass a repository or a service
// down as a prop, and without them the only way was to peel them off the
// context — `DigitizerContext['datasetRepository']`, and then
// `…['datasets'][number]` for a dataset. That second one depends on the
// container being an array of domain models, which is an implementation
// detail, not a promise. These are types only: nothing is added to the bundle.
export type { AxisSetRepositoryInterface } from './domain/repositories/axisSetRepository/axisSetRepositoryInterface'
export type { DatasetRepositoryInterface } from './domain/repositories/datasetRepository/datasetRepositoryInterface'
export type { AxisSetInterface } from './domain/models/axisSet/axisSetInterface'
export type { AxisInterface } from './domain/models/axis/axisInterface'
export type { DatasetInterface } from './domain/models/dataset/datasetInterface'
export type { CanvasHandlerInterface } from './application/services/canvasHandler/canvasHandlerInterface'
export type { AttachedCanvasElements } from './application/services/canvasHandler/canvasHandlerInterface'
export type { ConfirmerInterface } from './application/services/confirmer/confirmerInterface'
export type { ExtractorInterface } from './application/services/extractor/extractorInterface'
export type { HistoryManagerInterface } from './application/services/historyManager/historyManagerInterface'
export type { InterpolatorInterface } from './application/services/interpolator/interpolatorInterface'
export type { MagnifierInterface } from './application/services/magnifier/magnifierInterface'
export type { ProjectServiceInterface } from './application/services/projectService/projectServiceInterface'
export type { ValueFormatInterface } from './application/services/valueFormat/valueFormatInterface'

// ---------------------------------------------------------------------------
// Ports
// ---------------------------------------------------------------------------
// INFO: the pixel input the extraction algorithms need. Implementing it is how
// a host runs extraction against something other than the on-screen canvas.
export type { PixelSource } from './application/ports/pixelSource'

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
// INFO: `toErrorPayload` and the two guards are here and NOT also on the
// `/vue` entry, even though it is the panel-composing host that meets a panel
// `error` event. That host already imports createDigitizerContext() from
// `/core`, so it costs it nothing — and exporting one function from two
// subpaths is how a bundler ends up with two copies of it, which is the exact
// failure mode `isDigitizerErrorLike` exists to survive.
//
// `isDigitizerErrorLike` is the guard to branch on rather than
// `instanceof DigitizerError`: a class identity does not survive a duplicated
// bundle, a `{ code, message }` shape does. DIGITIZER_ERROR_CODES is exported
// as a VALUE so a host can validate against the real list instead of
// hand-copying it — a copy silently stops recognising codes we add later.
export {
  DIGITIZER_ERROR_CODES,
  DigitizerError,
  isDigitizerErrorCode,
  isDigitizerErrorLike,
  toErrorPayload,
} from './application/errors'
export type {
  DigitizerErrorCode,
  DigitizerErrorPayload,
} from './application/errors'
