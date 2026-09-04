export interface MagnifierInterface {
  scale: number
  magnifierSettingError: string
  crosshairSizePx: number
  sizePx: number
  markerSizePx: number

  setScale(scale: number): void
  setMarkerSizePx(sizePx: number): void
  setSizePx(sizePx: number): void
}
