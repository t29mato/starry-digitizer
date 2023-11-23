import { Interpolator } from './interpolator'
import { Plot } from '@/domains/datasetInterface'

const interpolater = new Interpolator()

describe('getPlotsTotalDistance', () => {
  it('calculates total distance correctly for a given set of plots', () => {
    const plots: Plot[] = [
      { id: 1, xPx: 0, yPx: 0 },
      { id: 2, xPx: 3, yPx: 4 }, // 5 units away from the first plot
      { id: 3, xPx: 6, yPx: 8 }, // 5 units away from the second plot
    ]

    const expectedDistance = 10 // 5 + 5
    const totalDistance = interpolater.getPlotsTotalDistance(plots)

    // @ts-ignore
    expect(totalDistance).toBe(expectedDistance)
  })
  it('calculates total distance correctly with negative coordinates', () => {
    const plots: Plot[] = [
      { id: 1, xPx: -3, yPx: -4 },
      { id: 2, xPx: 0, yPx: 0 }, // 5 units away from the first plot
      { id: 3, xPx: 3, yPx: 4 }, // 5 units away from the second plot
    ]

    const expectedDistance = 10 // 5 + 5
    const totalDistance = interpolater.getPlotsTotalDistance(plots)

    // @ts-ignore
    expect(totalDistance).toBe(expectedDistance)
  })
})
