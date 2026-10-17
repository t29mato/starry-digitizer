import { AxisScale, AxisTick } from '@/domain/services/axisTickFitter'
import { MarkerFill, MarkerShape } from '@/@types/types'

// INFO: The external, stable import format written by auto-extraction
// pipelines (e.g. real-chart-bench). Field names are snake_case on purpose:
// this is a wire format produced mostly by Python, not an internal DTO.
// Spec: docs/design/auto-extraction-review-design.md

export const AUTO_EXTRACTION_FORMAT = 'starry-digitizer/auto-extraction'
export const AUTO_EXTRACTION_VERSION = 1

export type XY = [number, number]

export interface AutoExtractionAxisDTO {
  scale: AxisScale
  ticks: AxisTick[]
}

// INFO: original-image pixels, top-left corner of the top-left pixel = 0
export interface AutoExtractionRectDTO {
  x: number
  y: number
  width: number
  height: number
}

export interface AutoExtractionMarkerDTO {
  shape?: MarkerShape | null
  fill?: MarkerFill | null
  size_px?: number | null
}

export const MARKER_SHAPES: MarkerShape[] = [
  'circle',
  'square',
  'diamond',
  'triangle-up',
  'triangle-down',
  'triangle-left',
  'triangle-right',
  'pentagon',
  'hexagon',
  'star',
  'cross',
  'plus',
  'other',
]

export const MARKER_FILLS: MarkerFill[] = ['filled', 'open', 'half', 'other']

export interface AutoExtractionSeriesDTO {
  label?: string | null
  points_px?: XY[] | null
  points_value?: XY[] | null
  scores?: number[] | null
  marker?: AutoExtractionMarkerDTO | null
  // INFO: written only by the edit log's `final` section; ignored on import
  origins?: (XY | null)[] | null
}

export interface AutoExtractionDocumentDTO {
  format?: typeof AUTO_EXTRACTION_FORMAT
  version: typeof AUTO_EXTRACTION_VERSION
  image?:
    | string
    | { url?: string | null; width?: number | null; height?: number | null }
    | null
  axes?: { x: AutoExtractionAxisDTO; y: AutoExtractionAxisDTO } | null
  series: AutoExtractionSeriesDTO[]
  plot_area?: AutoExtractionRectDTO | null
  legend_area?: AutoExtractionRectDTO | null
  source?: Record<string, unknown> | null
}
