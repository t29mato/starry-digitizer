export interface MagnifierInterface {
  scale: number
  magnifierSettingError: string
  crosshairSizePx: number
  sizePx: number
  effectiveDigits: number

  setScale(scale: number): void
  setEffectiveDigits(digits: number): void
}
