import { XYAxisSetRepositoryInterface } from '../XYAxisSetRepositoryInterface'
import { XYAxisSetRepositoryManager } from './XYAxisSetRepositoryManager'

const manager = new XYAxisSetRepositoryManager()
let firstInstance: XYAxisSetRepositoryInterface

describe('XYAxisSetRepositoryManager instance returning', () => {
  beforeEach(() => {
    firstInstance = manager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: XYAxisSetRepositoryInterface = manager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: XYAxisSetRepositoryInterface =
      manager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })
})
