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
})
