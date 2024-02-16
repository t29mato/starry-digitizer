import { getMouseCoordFromMouseEvent } from './mouseEventUtilities'

describe('getMouseCoordFromMouseEvent', () => {
  it('should correctly calculate coordinates from a MouseEvent', () => {
    // モックの MouseEvent オブジェクトを作成
    const mockEvent = {
      offsetX: 100,
      offsetY: 200,
      target: {
        style: {
          left: '50px',
          top: '50px',
        },
      },
    }

    // 関数を使用して座標を計算
    // @ts-ignore
    const coords = getMouseCoordFromMouseEvent(mockEvent)

    // 想定される結果を検証
    expect(coords).toEqual({ xPx: 149, yPx: 250 })
  })

  // 他のテストケースをここに追加...
})
