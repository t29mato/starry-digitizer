export const LOCAL_STORAGE_GLOBAL_KEY = 'starryDigitizer'

export const STYLE = {
  POINT_SIZE_PX: 10,
  TEMP_POINT_SIZE_PX: 8,
  AXIS_SIZE_PX: 20,
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
