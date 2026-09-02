import { matchColor } from '@/application/utils/colorMatching'

export abstract class ExtractParent {
  matchColor(
    rgb1: [number, number, number],
    rgb2: [number, number, number],
    matchRatio: number,
  ) {
    return matchColor(rgb1, rgb2, matchRatio)
  }
  // TODO: 背景色をスキップするか選択できるようにする
  isOnMask(r: number, g: number, b: number, a: number): boolean {
    return r === 255 && g === 255 && b === 0 && a > 0
  }
}
