import { SemanticVersion } from '@/@types/types'
import { ConfigDataSchema } from './configDataSchema'
import { PlotDataSchema } from './plotDataSchema'

//NOTE: Other interfaces have a prefix 'Interface' but this one doesn't have: It is intentional, mainly because this interface is kind of special one to just define data schema literally
export interface AllDataSchema {
  appVersion: SemanticVersion
  plotImageBase64: string
  plotData: PlotDataSchema
  configData: ConfigDataSchema
}
