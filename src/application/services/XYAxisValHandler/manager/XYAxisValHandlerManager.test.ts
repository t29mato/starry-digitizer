import { XYInputHandlerInterface } from '../XYInputHandlerInterface'
import { XYInputHandlerManager } from './XYInputHandlerManager'

const XYInputHandlerManager = new XYInputHandlerManager()
let firstInstance: XYInputHandlerInterface

describe('XYInputHandlerManager', () => {
  beforeEach(() => {
    firstInstance = XYInputHandlerManager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: XYInputHandlerInterface = XYInputHandlerManager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: XYInputHandlerInterface =
      XYInputHandlerManager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })
})
