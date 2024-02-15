import { ConfirmerInterface } from '../confirmerInterface'
import { ConfirmerManager } from './confirmerManager'

const confirmerManager = new ConfirmerManager()
let firstInstance: ConfirmerInterface

describe('ConfirmerManager', () => {
  beforeEach(() => {
    firstInstance = confirmerManager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: ConfirmerInterface = confirmerManager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: ConfirmerInterface =
      confirmerManager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })
})
