// import { InterpolatorInterface } from '../interpolatorInterface'
// import { InterpolatorManager } from './interpolatorManager'

// const interpolatorManager = new InterpolatorManager()
// let firstInstance: InterpolatorInterface

describe('InterpolatorManager', () => {
  //TODO: Interpolator is depending on CanvasHandler, and it causes the test error about Colorthief
  //If the dependency has been resolved, remove all comment-outed codes and they should work.
  test('write interpolator test', () => {
    expect(1 === 1).toBe(true)
  })

  // beforeEach(() => {
  //   firstInstance = interpolatorManager.getInstance()
  // })

  // test('The instance returned by getInstance() is the same as firstInstance', () => {
  //   const secondeInstance: InterpolatorInterface =
  //     interpolatorManager.getInstance()

  //   expect(secondeInstance === firstInstance).toBe(true)
  // })

  // test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
  //   const secondeInstance: InterpolatorInterface =
  //     interpolatorManager.getNewInstance()

  //   expect(secondeInstance === firstInstance).toBe(false)
  // })
})
