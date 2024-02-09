import { AxisRepositoryInterface } from '../axisRepositoryInterface'
import { AxisRepositoryManager } from '../manager/axisRepositoryManager'

const axisRepositoryManager = new AxisRepositoryManager()
let firstInstance: AxisRepositoryInterface

describe('AxisRepositoryManager instance returning', () => {
  beforeEach(() => {
    firstInstance = axisRepositoryManager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: AxisRepositoryInterface =
      axisRepositoryManager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: AxisRepositoryInterface =
      axisRepositoryManager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })
})
