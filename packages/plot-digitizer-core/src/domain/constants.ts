// INFO: Ported from src/constants.ts (starry-digitizer) as part of Phase 1
// (docs/design/plot-digitizer-architecture.md). Only the constants actually
// used by the classification-A domain/application code are included here —
// MANUAL_MODE/MASK_MODE/STYLE stay in the host app's src/constants.ts since
// they belong to DOM/canvas-drawing concerns (classification B/D), not the
// framework-agnostic core.
export const POINT_MODE = {
  TWO_POINTS: 0,
  FOUR_POINTS: 1,
} as const
