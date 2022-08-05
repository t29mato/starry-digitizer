export class magnifier {
  static #instance: magnifier
  static get instance(): magnifier {
    if (!this.#instance) {
      this.#instance = new magnifier()
    }
    return this.#instance
  }

  scale = 5
  magnifierSettingError = ''
  crosshairSizePx = 1
  sizePx = 200

  setScale(scale: number) {
    this.scale = scale
  }
}
