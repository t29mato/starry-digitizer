import { Point } from '@/@types/types'

// INFO: Groups near-duplicate points of one dataset (docs/design/
// auto-extraction-review-design.md, "近接重複点の統合"). Deliberately NOT
// single-linkage: on a dense line plot points sit a few px apart and
// chaining would collapse the whole series. Instead, greedily: take the
// best remaining point (highest score, then lowest id) as a seed and give
// it every still-unassigned point within maxDistancePx of the seed itself.

export type DuplicateCluster = {
  // INFO: the point to keep
  representative: Point
  // INFO: every member including the representative, in seed-distance order
  members: Point[]
}

const byPriority = (a: Point, b: Point) =>
  (b.score ?? -Infinity) - (a.score ?? -Infinity) || a.id - b.id

export function findDuplicateClusters(
  points: Point[],
  maxDistancePx: number,
): DuplicateCluster[] {
  const remaining = [...points].sort(byPriority)
  const assigned = new Set<number>()
  const clusters: DuplicateCluster[] = []

  remaining.forEach((seed) => {
    if (assigned.has(seed.id)) return
    assigned.add(seed.id)
    const others = remaining
      .filter(
        (p) =>
          !assigned.has(p.id) &&
          Math.hypot(p.xPx - seed.xPx, p.yPx - seed.yPx) <= maxDistancePx,
      )
      .sort(
        (a, b) =>
          Math.hypot(a.xPx - seed.xPx, a.yPx - seed.yPx) -
          Math.hypot(b.xPx - seed.xPx, b.yPx - seed.yPx),
      )
    if (others.length === 0) return
    others.forEach((p) => assigned.add(p.id))
    clusters.push({ representative: seed, members: [seed, ...others] })
  })

  return clusters
}
