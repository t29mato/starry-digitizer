import { AxisSetRepositoryInterface } from '../AxisSetRepositoryInterface'
import { AxisSetRepositoryManager } from './AxisSetRepositoryManager'

const manager = new AxisSetRepositoryManager()
let firstInstance: AxisSetRepositoryInterface

describe('AxisSetRepositoryManager instance returning', () => {
  beforeEach(() => {
    firstInstance = manager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: AxisSetRepositoryInterface = manager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: AxisSetRepositoryInterface = manager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })
})
