import { getRectCoordsFromDragCoords } from './dragRectangleCalculator'

describe('DragRectangleCalculator', () => {
  it('should calculate correct coordinates for normal drag', () => {
    const start = { xPx: 10, yPx: 10 }
    const end = { xPx: 20, yPx: 20 }
    const result = getRectCoordsFromDragCoords(start, end)

    expect(result).toEqual({
      topLeftCoord: { xPx: 10, yPx: 10 },
      bottomRightCoord: { xPx: 20, yPx: 20 },
    })
  })

  it('should calculate correct coordinates for reverse drag', () => {
    const start = { xPx: 20, yPx: 20 }
    const end = { xPx: 10, yPx: 10 }
    const result = getRectCoordsFromDragCoords(start, end)

    expect(result).toEqual({
      topLeftCoord: { xPx: 10, yPx: 10 },
      bottomRightCoord: { xPx: 20, yPx: 20 },
    })
  })

  // 他のテストケースをここに追加...
})
