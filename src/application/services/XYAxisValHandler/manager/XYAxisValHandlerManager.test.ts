import { XYAxisValHandlerInterface } from '../XYAxisValHandlerInterface'
import { XYAxisValHandlerManager } from './XYAxisValHandlerManager'

const XYAxisValHandlerManager = new XYAxisValHandlerManager()
let firstInstance: XYAxisValHandlerInterface

describe('XYAxisValHandlerManager', () => {
  beforeEach(() => {
    firstInstance = XYAxisValHandlerManager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: XYAxisValHandlerInterface = XYAxisValHandlerManager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: XYAxisValHandlerInterface =
      XYAxisValHandlerManager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })
})
