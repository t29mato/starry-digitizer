import { AxisKey, AxisValuesInput } from '@/@types/types'
import { AxisValInputHandlerInterface } from './axisValInputHandlerInterface'
import { MathUtils } from '@/application/utils/MathUtils'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'

export class AxisValInputHandler implements AxisValInputHandlerInterface {
  axisSetRepository: AxisSetRepositoryInterface
  inputValues: Map<number, AxisValuesInput> = new Map()
  validationStatus: Record<
    number,
    {
      isInvalidInputValue: boolean
      isXLogScaleAndSameValue: boolean
      isXLogScaleAndZero: boolean
      isYLogScaleAndSameValue: boolean
      isYLogScaleAndZero: boolean
    }
  > = {}

  constructor(axisSetRepository: AxisSetRepositoryInterface) {
    this.axisSetRepository = axisSetRepository
  }

  getAxisSetInputValues(axisSetId: number): AxisValuesInput {
    return (
      this.inputValues.get(axisSetId) || {
        x1: '0',
        x2: '0',
        y1: '0',
        y2: '0',
      }
    )
  }

  convertAxisValueToDecimal(inputVal: string): number {
    if (MathUtils.isScientificNotation(inputVal)) {
      return MathUtils.convertScientificNotationToDecimal(inputVal)
    }

    if (MathUtils.isPowerNotation(inputVal)) {
      return MathUtils.convertPowerNotationToDecimal(inputVal)
    }

    if (MathUtils.isConvertibleToDecimal(inputVal)) {
      return parseFloat(inputVal)
    }

    throw new Error('Axis value is in the invalid format')
  }

  setInputValue(axisSetId: number, axisKey: AxisKey, inpuVal: string): void {
    this.inputValues.set(axisSetId, {
      ...(this.inputValues.get(axisSetId) || {
        x1: '0',
        x2: '0',
        y1: '0',
        y2: '0',
      }),
      [axisKey]: inpuVal,
    })
  }

  setConvertedAxisValToAxisSet(axisSetId: number, axisKey: AxisKey): void {
    const inputAxisVal = this.getAxisSetInputValues(axisSetId)[axisKey]

    const convertedAxisValue = this.convertAxisValueToDecimal(inputAxisVal)
    this.axisSetRepository.activeAxisSet[axisKey].value = convertedAxisValue
  }

  validateInputValues(axisSetId: number): void {
    const axisSet = this.axisSetRepository.activeAxisSet
    const inputValues = this.getAxisSetInputValues(axisSetId)

    const isInvalidInputValue = Object.values(inputValues).some((value) => {
      try {
        this.convertAxisValueToDecimal(value)
        return false
      } catch {
        return true
      }
    })

    const isXLogScaleAndSameValue =
      axisSet.xIsLogScale && inputValues.x1 === inputValues.x2
    const isXLogScaleAndZero =
      axisSet.xIsLogScale && (inputValues.x1 === '0' || inputValues.x2 === '0')
    const isYLogScaleAndSameValue =
      axisSet.yIsLogScale && inputValues.y1 === inputValues.y2
    const isYLogScaleAndZero =
      axisSet.yIsLogScale && (inputValues.y1 === '0' || inputValues.y2 === '0')

    this.validationStatus[axisSetId] = {
      isInvalidInputValue,
      isXLogScaleAndSameValue,
      isXLogScaleAndZero,
      isYLogScaleAndSameValue,
      isYLogScaleAndZero,
    }
  }

  getValidationStatus(axisSetId: number): {
    isInvalidInputValue: boolean
    isXLogScaleAndSameValue: boolean
    isXLogScaleAndZero: boolean
    isYLogScaleAndSameValue: boolean
    isYLogScaleAndZero: boolean
  } {
    return (
      this.validationStatus[axisSetId] || {
        isInvalidInputValue: false,
        isXLogScaleAndSameValue: false,
        isXLogScaleAndZero: false,
        isYLogScaleAndSameValue: false,
        isYLogScaleAndZero: false,
      }
    )
  }
}
