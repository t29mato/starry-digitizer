import { MagnifierInterface } from '../magnifierInterface'
import { MagnifierManager } from './magnifierManager'

const magnifierManager = new MagnifierManager()
let firstInstance: MagnifierInterface

describe('MagnifierManager', () => {
  beforeEach(() => {
    firstInstance = magnifierManager.getInstance()
  })

  test('The instance returned by getInstance() is the same as firstInstance', () => {
    const secondeInstance: MagnifierInterface = magnifierManager.getInstance()

    expect(secondeInstance === firstInstance).toBe(true)
  })

  test('The instance returned by getNewInstance() is NOT the same as firstInstance', () => {
    const secondeInstance: MagnifierInterface =
      magnifierManager.getNewInstance()

    expect(secondeInstance === firstInstance).toBe(false)
  })

  test('setScale updates the scale value', () => {
    const instance = magnifierManager.getNewInstance()
    expect(instance.scale).toBe(5) // default value

    instance.setScale(10)
    expect(instance.scale).toBe(10)

    instance.setScale(2)
    expect(instance.scale).toBe(2)
  })

  test('setMarkerSizePx updates the markerSizePx value independently of scale', () => {
    const instance = magnifierManager.getNewInstance()
    expect(instance.markerSizePx).toBe(10) // default value, matches STYLE.POINT_SIZE_PX

    instance.setMarkerSizePx(4)
    expect(instance.markerSizePx).toBe(4)
    expect(instance.scale).toBe(5) // unaffected by marker size change

    instance.setMarkerSizePx(20)
    expect(instance.markerSizePx).toBe(20)
  })
})
