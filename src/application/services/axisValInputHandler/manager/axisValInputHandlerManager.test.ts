import { AxisValInputHandlerInterface } from '../AxisValInputHandlerInterface'
import { AxisValInputHandlerManager } from './AxisValInputHandlerManager'

const manager = new AxisValInputHandlerManager()
let firstInstance: AxisValInputHandlerInterface

describe('AxisValInputHandlerManager', () => {
  beforeEach(() => {
    firstInstance = manager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: AxisValInputHandlerInterface = manager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: AxisValInputHandlerInterface =
    manager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })
})
