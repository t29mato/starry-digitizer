import { ManualMode } from '@/@types/types'

// INFO: Phase 2 (docs/design/plot-digitizer-architecture.md). ProjectService
// only ever reads/writes 3 fields of CanvasHandler — this narrow,
// application-layer-owned port (rather than depending on the full,
// presentation-layer CanvasHandlerInterface) is what keeps
// `application → presentation` out of the dependency graph. The
// canvasHandler singleton (src/presentation/services/canvasHandler) already
// satisfies this shape structurally, so nothing needs to explicitly
// "implement" it.
export interface CanvasStatePort {
  uploadImageUrl: string
  scale: number
  manualMode: ManualMode
}
