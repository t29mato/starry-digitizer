// INFO: Public entry point of the npm package (`starry-digitizer`).
// Named exports only: the old Vue 2 style auto-install plugin is gone.
// Everything a host application needs to embed <StarryDigitizer> must be
// re-exported from here, because `library-build/dist/index.d.ts` is
// generated from this file alone.
export { default as StarryDigitizer } from './presentation/components/StarryDigitizer.vue'
export type { StarryDigitizerProps } from './presentation/components/StarryDigitizer.vue'

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

export type { DatasetValues } from './application/utils/datasetValues'

export { DigitizerError } from './application/errors'
export type {
  DigitizerErrorCode,
  DigitizerErrorPayload,
} from './application/errors'

export type { StarryDigitizerFeatures } from './presentation/digitizerOptions'

export type { ImageSource } from './application/utils/imageLoader'

export { createDigitizerContext } from './application/digitizerContext'
export type { DigitizerContext } from './application/digitizerContext'
