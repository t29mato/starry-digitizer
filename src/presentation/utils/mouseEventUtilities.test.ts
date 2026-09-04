import { getMouseCoordFromMouseEvent } from './mouseEventUtilities'

describe('getMouseCoordFromMouseEvent', () => {
  const createImageCanvas = (left: number, top: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas')
    canvas.getBoundingClientRect = jest.fn(() => {
      return {
        left,
        top,
        right: left + 800,
        bottom: top + 600,
        width: 800,
        height: 600,
        x: left,
        y: top,
        toJSON: () => ({}),
      }
    })
    return canvas
  }

  it('画像キャンバス基準の座標を返す', () => {
    const imageCanvas = createImageCanvas(10, 20)

    const mockEvent = {
      clientX: 110,
      clientY: 220,
    } as MouseEvent

    const coords = getMouseCoordFromMouseEvent(mockEvent, imageCanvas)

    expect(coords).toEqual({ xPx: 100, yPx: 200 })
  })

  it('クリック対象要素(既存プロット上など)に依存せず同じ座標を返す', () => {
    const imageCanvas = createImageCanvas(10, 20)

    const onCanvasEvent = {
      clientX: 110,
      clientY: 220,
      target: imageCanvas,
    } as unknown as MouseEvent

    const pointElement = document.createElement('div')
    pointElement.className = 'canvas-point'
    const onPointEvent = {
      clientX: 110,
      clientY: 220,
      target: pointElement,
    } as unknown as MouseEvent

    expect(getMouseCoordFromMouseEvent(onCanvasEvent, imageCanvas)).toEqual(
      getMouseCoordFromMouseEvent(onPointEvent, imageCanvas),
    )
  })

  it('imageCanvasが無い場合はoffsetX/Yにフォールバックする', () => {
    const mockEvent = {
      offsetX: 100,
      offsetY: 200,
    } as MouseEvent

    const coords = getMouseCoordFromMouseEvent(mockEvent, undefined)

    expect(coords).toEqual({ xPx: 100, yPx: 200 })
  })
})
