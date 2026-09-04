// INFO: the pixels the automatic extraction needs, expressed without canvas or
// DOM types. `CanvasHandler` is the browser implementation of this port; a
// Node-side implementation (node-canvas, or a decoded buffer) can satisfy it
// too, which is what lets the extraction algorithms run outside a browser.
export interface PixelSource {
  readonly width: number
  readonly height: number
  /** RGBA pixels of the original-size image */
  getImagePixels(): Uint8ClampedArray
  /** RGBA pixels of the original-size mask */
  getMaskPixels(): Uint8ClampedArray
  /** whether the user has drawn a selection mask */
  readonly hasMask: boolean
}
