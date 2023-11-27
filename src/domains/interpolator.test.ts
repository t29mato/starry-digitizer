import { Interpolator } from './interpolator'
import { Plot } from './datasetInterface'

describe('Interpolator', () => {
  let interpolator: Interpolator

  beforeEach(() => {
    interpolator = new Interpolator()
  })

  describe('updateInterval', () => {
    it('should correctly update the interval', () => {
      interpolator.updateInterval(20)
      // @ts-ignore
      expect(interpolator.interval).toBe(20)
    })
  })

  describe('setSplineInterpolatedCoords', () => {
    it('should correctly set interpolated coordinates', () => {
      const mockPlots: Plot[] = [
        {
          id: 1,
          xPx: 100,
          yPx: 100,
        },
        {
          id: 2,
          xPx: 113,
          yPx: 113,
        },
      ]

      interpolator.setSplineInterpolatedCoords(mockPlots)
      // 結果を検証するためのアサーション
      // @ts-ignore
      expect(interpolator.interpolatedCoords.length).toBeGreaterThan(0)
      // その他、interpolatedCoordsの具体的な値に対する検証
    })
    it('should correctly set interpolated coordinates less than 11', () => {
      // FIXME: xPxとyPxのそれぞれの差を11以下にするとエラーになる
      const mockPlots: Plot[] = [
        {
          id: 1,
          xPx: 100,
          yPx: 100,
        },
        {
          id: 2,
          xPx: 111,
          yPx: 111,
        },
      ]

      interpolator.setSplineInterpolatedCoords(mockPlots)
      // 結果を検証するためのアサーション
      // @ts-ignore
      expect(interpolator.interpolatedCoords.length).toBeGreaterThan(0)
      // その他、interpolatedCoordsの具体的な値に対する検証
    })
  })
})
