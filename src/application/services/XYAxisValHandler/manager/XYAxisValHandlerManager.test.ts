import { XYAxisValHandlerInterface } from '../XYAxisValHandlerInterface'
import { XYAxisValHandlerManager } from './XYAxisValHandlerManager'

const manager = new XYAxisValHandlerManager()
let firstInstance: XYAxisValHandlerInterface

describe('XYAxisValHandlerManager', () => {
  beforeEach(() => {
    firstInstance = manager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: XYAxisValHandlerInterface = manager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: XYAxisValHandlerInterface =
    manager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })
})
