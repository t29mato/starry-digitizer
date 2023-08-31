export class HTMLCanvas {
  element: HTMLCanvasElement
  constructor(elementId: string) {
    this.element = this.#getCanvasElementById(elementId)
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
      this.element.height
    ).data
  }
  #getCanvasElementById(id: string): HTMLCanvasElement {
    const element = document.getElementById(id)
    if (element instanceof HTMLCanvasElement) {
      return element as HTMLCanvasElement
    }
    throw new Error(`element ID ${id} is not instance of a HTMLCanvasElement`)
  }
}
