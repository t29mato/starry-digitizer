/**
 * Returns true when two RGB colors are within `matchRatioPct`% of each
 * other, using normalized squared Euclidean distance in RGB space.
 *
 * Shared by the extract strategies (Symbol Extract, Line Extract, via
 * ExtractParent) and the "snap to symbol" manual point-placement helper
 * (see symbolSnapping.ts) so all of them treat color matching identically.
 */
export function matchColor(
  rgb1: [number, number, number],
  rgb2: [number, number, number],
  matchRatioPct: number,
): boolean {
  const diffRatio =
    (rgb1.reduce((prev, _, i) => {
      return prev + Math.pow(rgb1[i] - rgb2[i], 2)
    }, 0) /
      (Math.pow(255, 2) * 3)) *
    100
  return diffRatio < matchRatioPct
}
