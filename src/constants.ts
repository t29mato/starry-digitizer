export const LOCAL_STORAGE_GLOBAL_KEY = 'starryDigitizer'

export const STYLE = {
  POINT_SIZE_PX: 10,
  TEMP_POINT_SIZE_PX: 8,
  AXIS_SIZE_PX: 20,
  POINT_OPACITY: 0.7,
  TEMP_POINT_OPACITY: 0.4,
  // INFO: points below the confidence-review threshold; clashes with
  // neither the selection red nor any View All dataset color
  LOW_CONFIDENCE_POINT_COLOR: '#ff1493',
} as const

// INFO: per-dataset colors in View All mode (and for the imported state
// in the review comparison view)
export const DATASET_COLORS = [
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#4CAF50', // Green
  '#F44336', // Red
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#FFEB3B', // Yellow
  '#795548', // Brown
] as const

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
