export type Position = {
  xPx: number
  yPx: number
}

export type Axes = { value: number } & Position

export type Plot = { id: number } & Position

export type Plots = Plot[]

export type PlotValue = { xV: string; yV: string } & Plot

export type axesPosList = {
  x1: Axes
  x2: Axes
  y1: Axes
  y2: Axes
}

export type DiameterRange = {
  min: number
  max: number
}

export type ExtractAlgorithm = 'Symbol Extract' | 'Line Extract'

export type LineExtractProps = { width: number; interval: number }
