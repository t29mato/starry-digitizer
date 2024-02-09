import { DatasetRepositoryInterface } from '../datasetRepositoryInterface'
import { DatasetRepositoryManager } from '../manager/datasetRepositoryManager'

const datasetRepositoryManager = new DatasetRepositoryManager()
let firstInstance: DatasetRepositoryInterface

describe('DatasetRepositoryManager instance returning', () => {
  beforeEach(() => {
    firstInstance = datasetRepositoryManager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: DatasetRepositoryInterface =
      datasetRepositoryManager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: DatasetRepositoryInterface =
      datasetRepositoryManager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })
})
