import { findDuplicateClusters } from './duplicatePointFinder'

const p = (id: number, xPx: number, yPx: number, score?: number) => ({
  id,
  xPx,
  yPx,
  score,
})

describe('findDuplicateClusters', () => {
  test('groups points within the distance around the best-scored seed', () => {
    const clusters = findDuplicateClusters(
      [p(1, 0, 0, 0.5), p(2, 2, 0, 0.9), p(3, 50, 50, 0.1), p(4, 4, 0, 0.2)],
      3,
    )
    expect(clusters).toHaveLength(1)
    expect(clusters[0].representative.id).toBe(2)
    // INFO: members are sorted by distance to the seed (2 and 4 are both 2px)
    expect(clusters[0].members.map((m) => m.id)).toEqual([2, 1, 4])
  })

  test('does not chain along a dense series', () => {
    // INFO: 2px spacing, 3px threshold: single-linkage would merge all
    const line = [0, 2, 4, 6, 8].map((x, i) => p(i + 1, x, 0))
    const clusters = findDuplicateClusters(line, 3)
    expect(clusters.map((c) => c.members.map((m) => m.id))).toEqual([
      [1, 2],
      [3, 4],
      [5],
    ].filter((ids) => ids.length > 1))
  })

  test('without scores the lowest id is the seed; singletons are not returned', () => {
    const clusters = findDuplicateClusters(
      [p(5, 1, 1), p(3, 0, 0), p(9, 100, 100)],
      2,
    )
    expect(clusters).toHaveLength(1)
    expect(clusters[0].representative.id).toBe(3)
  })
})
