import { MANUAL_MODE, MASK_MODE, POINT_MODE } from "@/constants";

export type ManualMode = typeof MANUAL_MODE[keyof typeof MANUAL_MODE]
export type MaskMode = typeof MASK_MODE[keyof typeof MASK_MODE]
export type PointMode = typeof POINT_MODE[keyof typeof POINT_MODE]

//e.g. 1.2.0 is described as [1, 2, 0]
export type SemanticVersion = [number, number, number]

export type PointValue = {
  x: number,
  y: number
}
