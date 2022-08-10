export type Position = {
  xPx: number
  yPx: number
}
export type Plot = {
  id: number
  xPx: number
  yPx: number
}

export type Plots = Plot[]

export interface DatasetInterface {
  name: string
  plots: Plots
  id: number
  scaledPlots(scale: number): Plots
  get nextPlotId(): number
  addPlot(xPx: number, yPx: number): void
  moveActivePlot(ids: number[], arrow: string): void
}
