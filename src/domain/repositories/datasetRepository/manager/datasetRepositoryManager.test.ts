import { DatasetRepositoryInterface } from '../datasetRepositoryInterface'
import { DatasetRepositoryManager } from '../manager/datasetRepositoryManager'

let firstInstance: DatasetRepositoryInterface

describe('DatasetRepositoryManager instance returning', () => {
  beforeEach(() => {
    firstInstance = DatasetRepositoryManager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: DatasetRepositoryInterface =
      DatasetRepositoryManager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: DatasetRepositoryInterface =
      DatasetRepositoryManager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })
})