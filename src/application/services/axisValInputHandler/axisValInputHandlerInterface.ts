import { AxisKey, AxisValuesInput } from '@/@types/types'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'

export interface AxisValInputHandlerInterface {
  axisSetRepository: AxisSetRepositoryInterface
  inputValues: Map<number, AxisValuesInput>

  getAxisSetInputValues(axisSetId: number): AxisValuesInput

  convertAxisValueToDecimal(inputVal: string): number
  setInputValue(axisSetId: number, axisKey: AxisKey, inpuVal: string): void
  setConvertedAxisValToAxisSet(axisSetId: number, axisKey: AxisKey): void
}
