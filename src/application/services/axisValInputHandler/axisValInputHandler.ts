import { AxisKey, AxisValFormat, AxisValuesInput } from '@/@types/types'
import { AxisValInputHandlerInterface } from './axisValInputHandlerInterface'
import { MathUtils } from '@/application/utils/MathUtils'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'

export class AxisValInputHandler implements AxisValInputHandlerInterface {
  axisSetRepository: AxisSetRepositoryInterface
  inputValues: Record<number, AxisValuesInput> = {}
  validationStatus: Record<
    number,
    {
      isInvalidInputFormat: {
        x1: boolean
        x2: boolean
        y1: boolean
        y2: boolean
      }
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
      this.inputValues[axisSetId] || {
        x1: '0',
        x2: '0',
        y1: '0',
        y2: '0',
      }
    )
  }

  getInputValueFormat(inputVal: string): AxisValFormat {
    if (MathUtils.isScientificNotation(inputVal)) {
      return 'scientificNotation'
    }

    if (MathUtils.isPowerNotation(inputVal)) {
      return 'powerNotation'
    }

    if (MathUtils.isConvertibleToDecimal(inputVal)) {
      return 'decimal'
    }

    return 'invalidFormat'
  }

  convertAxisValueToDecimal(inputVal: string): number {
    const inputValFormat = this.getInputValueFormat(inputVal)

    switch (inputValFormat) {
      case 'powerNotation':
        return MathUtils.convertPowerNotationToDecimal(inputVal)
      case 'scientificNotation':
        return MathUtils.convertScientificNotationToDecimal(inputVal)
      case 'decimal':
        return parseFloat(inputVal)
      case 'invalidFormat':
        return NaN
      default:
        return NaN
    }
  }

  setInputValue(axisSetId: number, axisKey: AxisKey, inputVal: string): void {
    if (!this.inputValues[axisSetId]) {
      this.inputValues[axisSetId] = {
        x1: '0',
        x2: '0',
        y1: '0',
        y2: '0',
      }
    }

    this.inputValues[axisSetId][axisKey] = inputVal
  }

  setConvertedAxisValToAxisSet(axisSetId: number, axisKey: AxisKey): void {
    const inputAxisVal = this.getAxisSetInputValues(axisSetId)[axisKey]
    const convertedAxisValue = this.convertAxisValueToDecimal(inputAxisVal)
    this.axisSetRepository.activeAxisSet[axisKey].value = convertedAxisValue
  }

  canInputValueMultipliedAndDividedByTen(inputVal: string): boolean {
    const inputValFormat = this.getInputValueFormat(inputVal)

    if (inputValFormat === 'decimal') {
      return true
    }

    if (inputValFormat === 'scientificNotation' && inputVal.startsWith('1e')) {
      return true
    }

    return false
  }

  getInputValueMultipliedByTen(axisSetId: number, axisKey: AxisKey): string {
    const originalVal = this.inputValues[axisSetId][axisKey]
    const originalValFormat = this.getInputValueFormat(originalVal)

    if (originalValFormat === 'decimal') {
      return String(parseFloat(originalVal) * 10)
    }

    if (
      originalValFormat === 'scientificNotation' &&
      originalVal.startsWith('1e')
    ) {
      return MathUtils.incrementExponent(originalVal)
    }

    throw new Error('Cannot multiply this value by 10')
  }

  getInputValueDividedByTen(axisSetId: number, axisKey: AxisKey): string {
    const originalVal = this.inputValues[axisSetId][axisKey]
    const originalValFormat = this.getInputValueFormat(originalVal)

    if (originalValFormat === 'decimal') {
      return String(parseFloat(originalVal) / 10)
    }

    if (
      originalValFormat === 'scientificNotation' &&
      originalVal.startsWith('1e')
    ) {
      return MathUtils.decrementExponent(originalVal)
    }

    throw new Error('Cannot multiply this value by 10')
  }

  handleMultiplyAxisValue(axisSetId: number, axisKey: AxisKey): void {
    const multipliedVal = this.getInputValueMultipliedByTen(axisSetId, axisKey)

    this.setInputValue(axisSetId, axisKey, multipliedVal)
    this.setConvertedAxisValToAxisSet(axisSetId, axisKey)
  }

  handleDivideAxisValue(axisSetId: number, axisKey: AxisKey): void {
    const multipliedVal = this.getInputValueDividedByTen(axisSetId, axisKey)

    this.setInputValue(axisSetId, axisKey, multipliedVal)
    this.setConvertedAxisValToAxisSet(axisSetId, axisKey)
  }

  validateInputValues(axisSetId: number): void {
    const axisSet = this.axisSetRepository.activeAxisSet
    const { x1, x2, y1, y2 } = this.getAxisSetInputValues(axisSetId)

    const isInvalidInputFormat = {
      x1: this.getInputValueFormat(x1) === 'invalidFormat',
      x2: this.getInputValueFormat(x2) === 'invalidFormat',
      y1: this.getInputValueFormat(y1) === 'invalidFormat',
      y2: this.getInputValueFormat(y2) === 'invalidFormat',
    }

    const isXLogScaleAndSameValue = axisSet.xIsLogScale && x1 === x2
    const isXLogScaleAndZero = axisSet.xIsLogScale && (x1 === '0' || x2 === '0')
    const isYLogScaleAndSameValue = axisSet.yIsLogScale && y1 === y2
    const isYLogScaleAndZero = axisSet.yIsLogScale && (y1 === '0' || y2 === '0')

    this.validationStatus[axisSetId] = {
      isInvalidInputFormat,
      isXLogScaleAndSameValue,
      isXLogScaleAndZero,
      isYLogScaleAndSameValue,
      isYLogScaleAndZero,
    }
  }

  getValidationStatus(axisSetId: number): {
    isInvalidInputFormat: {
      x1: boolean
      x2: boolean
      y1: boolean
      y2: boolean
    }
    isXLogScaleAndSameValue: boolean
    isXLogScaleAndZero: boolean
    isYLogScaleAndSameValue: boolean
    isYLogScaleAndZero: boolean
  } {
    return (
      this.validationStatus[axisSetId] || {
        isInvalidInputFormat: {
          x1: false,
          x2: false,
          y1: false,
          y2: false,
        },
        isXLogScaleAndSameValue: false,
        isXLogScaleAndZero: false,
        isYLogScaleAndSameValue: false,
        isYLogScaleAndZero: false,
      }
    )
  }
}
