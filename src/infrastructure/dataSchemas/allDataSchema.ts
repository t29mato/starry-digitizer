import { SemanticVersion } from '@/@types/types'
import { configDataSchema } from './configDataSchema'
import { PlotDataSchema } from './plotDataSchema'

export interface allDataSchema {
  appVersion: SemanticVersion
  plotImageBase64: string
  plotData: PlotDataSchema
  configData: configDataSchema
}
