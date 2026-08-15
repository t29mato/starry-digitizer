/**
 * DTO (Data Transfer Object) for the small slice of canvas/view state that
 * gets persisted alongside a project (scale, manual-edit mode).
 *
 * INFO: named `CanvasStateDTO` here, not `CanvasHandlerDTO` — core has no
 * concept of "CanvasHandler" (that's a host-app, DOM-coupled class living in
 * src/presentation/services/canvasHandler; see docs/design/
 * plot-digitizer-architecture.md Phase 2). `manualMode` is a plain `number`
 * for the same reason: the specific mode enum (MANUAL_MODE) is a host-app
 * concept, not core's. The host app's DTO wrapper re-exports this type as
 * `CanvasHandlerDTO` to keep its existing name/shape.
 */
export interface CanvasStateDTO {
  scale: number
  manualMode: number
}
