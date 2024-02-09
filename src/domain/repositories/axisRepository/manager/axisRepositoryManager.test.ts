import { AxisRepositoryInterface } from '../axisRepositoryInterface'
import { AxisRepositoryManager } from '../manager/axisRepositoryManager'

let firstInstance: AxisRepositoryInterface

describe('AxisRepositoryManager instance returning', () => {
  beforeEach(() => {
    firstInstance = axisRepository
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: AxisRepositoryInterface = axisRepository

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: AxisRepositoryInterface =
      AxisRepositoryManager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })
})
