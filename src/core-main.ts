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
// Ports
// ---------------------------------------------------------------------------
// INFO: the pixel input the extraction algorithms need. Implementing it is how
// a host runs extraction against something other than the on-screen canvas.
export type { PixelSource } from './application/ports/pixelSource'

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export { DigitizerError } from './application/errors'
export type {
  DigitizerErrorCode,
  DigitizerErrorPayload,
} from './application/errors'
