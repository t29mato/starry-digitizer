// INFO: the marker sizes are given at 100% zoom and scaled with the canvas
// from there (scaledMarkerSizePx). They used to be flat constants, which meant
// a marker's POSITION shrank with the zoom while its SIZE did not: at 16% a
// 10px dot covers 62.5px of the original image, so a figure with a few dozen
// points was buried under its own markers and the curve underneath could not
// be seen. Low zoom is exactly when a user is looking for missed points, so
// the view that matters most was the one that broke.
//
// The MIN/MAX bounds are what keep the fix from replacing one problem with
// another: plain `size * scale` gives 1.6px at 16%, too small to see and too
// small to hit. What a marker is FOR does not shrink to nothing, and does not
// grow without limit either.
export const STYLE = {
  POINT_SIZE_PX: 10,
  POINT_MIN_SIZE_PX: 3,
  POINT_MAX_SIZE_PX: 14,
  TEMP_POINT_SIZE_PX: 8,
  TEMP_POINT_MIN_SIZE_PX: 3,
  TEMP_POINT_MAX_SIZE_PX: 12,
  // INFO: the pointer target, which is deliberately NOT the visual size — a
  // 3px dot cannot be grabbed. Editing at low zoom is unusual, but "too small
  // to click" is a worse failure than a target slightly larger than the dot.
  POINT_HIT_MIN_SIZE_PX: 12,
  AXIS_SIZE_PX: 20,
  AXIS_MIN_SIZE_PX: 8,
  AXIS_MAX_SIZE_PX: 28,
  POINT_OPACITY: 0.7,
  TEMP_POINT_OPACITY: 0.4,
} as const

export const POINT_MODE = {
  TWO_POINTS: 0,
  FOUR_POINTS: 1,
} as const

export const MANUAL_MODE = {
  UNSET: -1,
  ADD: 0,
  EDIT: 1,
  DELETE: 2,
} as const

export const MASK_MODE = {
  UNSET: -1,
  PEN: 0,
  BOX: 1,
  ERASER: 2,
}
