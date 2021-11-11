export type Position = {
  xPx: number
  yPx: number
}

export type Plot = { id: number } & Position

export type PlotValue = { xV: string; yV: string } & Plot
