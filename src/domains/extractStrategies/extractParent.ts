export abstract class ExtractParent {
  matchColor(
    rgb1: [number, number, number],
    rgb2: [number, number, number],
    matchRatio: number
  ) {
    const diffRatio =
      (rgb1.reduce((prev, _, i) => {
        return prev + Math.pow(rgb1[i] - rgb2[i], 2)
      }, 0) /
        (Math.pow(255, 2) * 3)) *
      100
    return diffRatio < matchRatio
  }
  // TODO: 背景色をスキップするか選択できるようにする
  isOnMask(r: number, g: number, b: number, a: number): boolean {
    return r === 255 && g === 255 && b === 0 && a > 0
  }
}
