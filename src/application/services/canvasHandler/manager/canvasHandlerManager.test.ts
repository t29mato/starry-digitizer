// import { CanvasHandlerInterface } from '../canvasHandlerInterface'
// import { CanvasHandlerManager } from './canvasHandlerManager'

// const canvasHandlerManager = new CanvasHandlerManager()
// let firstInstance: CanvasHandlerInterface

describe('CanvasHandlerManager', () => {
  //TODO: Jest emits the test error about Colorthief
  //If the dependency to Coloethief has been resolved, remove all comment-outed codes and they should work.
  test('write interpolator test', () => {
    expect(1 === 1).toBe(true)
  })
  //   beforeEach(() => {
  //     firstInstance = canvasHandlerManager.getInstance()
  //   })

  //   test('The instance returned by getInstance() is the same as firstInstance', () => {
  //     const secondeInstance: CanvasHandlerInterface =
  //       canvasHandlerManager.getInstance()

  //     expect(secondeInstance === firstInstance).toBe(true)
  //   })

  //   test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
  //     const secondeInstance: CanvasHandlerInterface =
  //       canvasHandlerManager.getNewInstance()

  //     expect(secondeInstance === firstInstance).toBe(false)
  //   })
})
