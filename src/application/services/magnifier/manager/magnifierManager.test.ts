import { MagnifierInterface } from '../magnifierInterface'
import { MagnifierManager } from './magnifierManager'

const magnifierManager = new MagnifierManager()
let firstInstance: MagnifierInterface

describe('MagnifierManager', () => {
  beforeEach(() => {
    firstInstance = magnifierManager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: MagnifierInterface = magnifierManager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: MagnifierInterface =
      magnifierManager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })

  test('setScale updates the scale value', () => {
    const instance = magnifierManager.getNewInstance()
    expect(instance.scale).toBe(5) // default value

    instance.setScale(10)
    expect(instance.scale).toBe(10)

    instance.setScale(2)
    expect(instance.scale).toBe(2)
  })

  test('setEffectiveDigits updates the effectiveDigits value', () => {
    const instance = magnifierManager.getNewInstance()
    expect(instance.effectiveDigits).toBe(4) // default value

    instance.setEffectiveDigits(6)
    expect(instance.effectiveDigits).toBe(6)

    instance.setEffectiveDigits(2)
    expect(instance.effectiveDigits).toBe(2)
  })
})
