import { NotifierInterface } from '../notifierInterface'
import { NotifierManager } from './notifierManager'

const notifierManager = new NotifierManager()
let firstInstance: NotifierInterface

describe('NotifierManager', () => {
  beforeEach(() => {
    firstInstance = notifierManager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondInstance: NotifierInterface = notifierManager.getInstance()

    expect(secondInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondInstance: NotifierInterface = notifierManager.getNewInstance()

    expect(secondInstance === firstInstance).toBe(false)
  })
})
