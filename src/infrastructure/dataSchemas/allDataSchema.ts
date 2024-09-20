import { SemanticVersion } from '@/@types/types'
import { ConfigDataSchema } from './configDataSchema'
import { PlotDataSchema } from './plotDataSchema'

export interface AllDataSchema {
  appVersion: SemanticVersion
  plotImageBase64: string
  plotData: PlotDataSchema
  configData: ConfigDataSchema
}
