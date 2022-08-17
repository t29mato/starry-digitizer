export type Position = {
  xPx: number
  yPx: number
}

export type Plot = { id: number } & Position

export type Plots = Plot[]

export type PlotValue = { xV: string; yV: string } & Plot

export type DiameterRange = {
  min: number
  max: number
}

export type LineExtractProps = { width: number; interval: number }
