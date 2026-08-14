// INFO: Phase 2 (docs/design/plot-digitizer-architecture.md). This is the
// boundary between core's point-extraction logic and wherever the actual
// pixels come from (a browser <canvas>, a Node canvas, a test fixture, ...).
//
// Scope is intentionally narrow — pixel *reading* only (design-review
// decision, design doc section 8 item 3): mask *drawing* (pen/box/eraser)
// stays a host-app concern and is not part of this port.
export interface PixelSourcePort {
  readonly width: number
  readonly height: number
  readonly isDrawnMask: boolean
  getImageColors(): Uint8ClampedArray
  getMaskColors(): Uint8ClampedArray
}
