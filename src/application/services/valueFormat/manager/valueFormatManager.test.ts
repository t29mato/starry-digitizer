import { ValueFormatInterface } from '../valueFormatInterface'
import { ValueFormatManager } from './valueFormatManager'

const valueFormatManager = new ValueFormatManager()
let firstInstance: ValueFormatInterface

describe('ValueFormatManager', () => {
  beforeEach(() => {
    firstInstance = valueFormatManager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: ValueFormatInterface =
      valueFormatManager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: ValueFormatInterface =
      valueFormatManager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })

  // INFO: moved here from magnifierManager.test.ts — the setting is no longer
  // the magnifier's.
  test('setEffectiveDigits updates the effectiveDigits value', () => {
    const instance = valueFormatManager.getNewInstance()
    expect(instance.effectiveDigits).toBe(4) // default value

    instance.setEffectiveDigits(6)
    expect(instance.effectiveDigits).toBe(6)

    instance.setEffectiveDigits(2)
    expect(instance.effectiveDigits).toBe(2)
  })

  test('setEffectiveDigits accepts the range boundaries', () => {
    const instance = valueFormatManager.getNewInstance()

    instance.setEffectiveDigits(1)
    expect(instance.effectiveDigits).toBe(1)

    instance.setEffectiveDigits(10)
    expect(instance.effectiveDigits).toBe(10)
  })

  // INFO: a host can call this setter with no settings panel in between, so
  // an out-of-range value has to be rejected by the service itself rather
  // than silently changing the precision of everything it exports.
  test.each([0, 11, -1, 4.5, NaN])(
    'setEffectiveDigits rejects %p and keeps the previous value',
    (digits) => {
      const instance = valueFormatManager.getNewInstance()

      expect(() => instance.setEffectiveDigits(digits)).toThrow(RangeError)
      expect(instance.effectiveDigits).toBe(4)
    },
  )
})
