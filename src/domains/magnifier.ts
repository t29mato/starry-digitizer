export class magnifier {
  static #instance: magnifier
  static get instance(): magnifier {
    if (!this.#instance) {
      this.#instance = new magnifier()
    }
    return this.#instance
  }

  magnifierScale = 5
  showSettingsDialog = false
  magnifierSettingError = ''
  crosshairSizePx = 1
  magnifierSizePx = 200
}
