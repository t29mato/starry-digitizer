import { Position } from '@/types'
import ColorThief from 'colorthief'
import { HTMLCanvas } from './dom/HTMLCanvas'
const colorThief = new ColorThief()

export interface CanvasInterface {
  isDrawnMask: boolean
  scale: number
  get imageElement(): HTMLImageElement
  get originalSizeMaskCanvasColors(): Uint8ClampedArray
  get originalImageCanvasColors(): Uint8ClampedArray
}
