export interface MagnifierInterface {
  scale: number
  magnifierSettingError: string
  crosshairSizePx: number
  sizePx: number

  setScale(scale: number): void
}
