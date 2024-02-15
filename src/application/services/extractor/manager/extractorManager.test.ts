import { ExtractorInterface } from '../extractorInterface'
import { ExtractorManager } from './extractorManager'

const extractorManager = new ExtractorManager()
let firstInstance: ExtractorInterface

describe('ExtractorManager', () => {
  beforeEach(() => {
    firstInstance = extractorManager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: ExtractorInterface = extractorManager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: ExtractorInterface =
      extractorManager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })
})
