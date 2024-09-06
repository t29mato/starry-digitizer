import { configDataScheme } from './configDataScheme'
import { pixelDataScheme } from './pixelDataScheme'
import { PlotDataScheme } from './plotDataScheme'

export interface allDataScheme {
  appVersion: string
  plotData: PlotDataScheme
  pixelData: pixelDataScheme
  configData: configDataScheme
}
