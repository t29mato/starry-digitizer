import { getMouseCoordFromMouseEvent } from './mouseEventUtilities'

describe('getMouseCoordFromMouseEvent', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const setupImageCanvas = (left: number, top: number) => {
    const canvas = document.createElement('canvas')
    canvas.id = 'imageCanvas'
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
    document.body.appendChild(canvas)
  }

  it('画像キャンバス基準の座標を返す', () => {
    setupImageCanvas(10, 20)

    const mockEvent = {
      clientX: 110,
      clientY: 220,
    } as MouseEvent

    const coords = getMouseCoordFromMouseEvent(mockEvent)

    expect(coords).toEqual({ xPx: 100, yPx: 200 })
  })

  it('クリック対象要素(既存プロット上など)に依存せず同じ座標を返す', () => {
    setupImageCanvas(10, 20)

    const onCanvasEvent = {
      clientX: 110,
      clientY: 220,
      target: document.getElementById('imageCanvas'),
    } as unknown as MouseEvent

    const pointElement = document.createElement('div')
    pointElement.className = 'canvas-point'
    const onPointEvent = {
      clientX: 110,
      clientY: 220,
      target: pointElement,
    } as unknown as MouseEvent

    expect(getMouseCoordFromMouseEvent(onCanvasEvent)).toEqual(
      getMouseCoordFromMouseEvent(onPointEvent),
    )
  })

  it('imageCanvasが存在しない場合はoffsetX/Yにフォールバックする', () => {
    const mockEvent = {
      offsetX: 100,
      offsetY: 200,
    } as MouseEvent

    const coords = getMouseCoordFromMouseEvent(mockEvent)

    expect(coords).toEqual({ xPx: 100, yPx: 200 })
  })
})
