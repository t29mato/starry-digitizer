import { InstanceManager } from './instanceManager'
import { InstanceManagerInterface } from './instanceManagerInterface'

interface MockClassInterface {
  something: boolean
}

class MockClass implements MockClassInterface {
  something: boolean = true
}

const mockInstanceCreator = () => {
  return new MockClass()
}

let instanceManager: InstanceManagerInterface<MockClassInterface>
let firstInstance: MockClassInterface

describe('InstanceManager', () => {
  beforeEach(() => {
    instanceManager = new InstanceManager<MockClassInterface>()
    firstInstance = instanceManager.getInstance(mockInstanceCreator)
  })

  it('returns the same instance when calling getInstance function', () => {
    const secondInstance = instanceManager.getInstance(mockInstanceCreator)

    expect(firstInstance === secondInstance).toBe(true)
  })

  it('returns NOT the same instance when calling getInstance function', () => {
    const secondInstance = instanceManager.getNewInstance(mockInstanceCreator)

    expect(firstInstance === secondInstance).toBe(false)
  })
})
