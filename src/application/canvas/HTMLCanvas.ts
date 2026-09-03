// INFO: Thin wrapper around a canvas element the presentation layer hands
// over. It deliberately does NOT look the element up by id: several digitizer
// instances can live on one page, and an id lookup would always find the
// first one. Lives in the application layer so the engine no longer depends
// on presentation code.
export class HTMLCanvas {
  element: HTMLCanvasElement

  constructor(element: HTMLCanvasElement) {
    this.element = element
  }

  get context() {
    const context = this.element.getContext('2d')
    if (context instanceof CanvasRenderingContext2D) {
      return context as CanvasRenderingContext2D
    }
    throw new Error('context is not instance of CanvasRenderingContext2D')
  }

  get colors() {
    return this.context.getImageData(
      0,
      0,
      this.element.width,
      this.element.height,
    ).data
  }
}
