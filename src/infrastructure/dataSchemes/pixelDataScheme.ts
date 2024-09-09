export interface pixelDataScheme {
  schemeVersion: '0.1.0'
  imageWidthPx: number
  axisSets: {
    id: number
    axisX: {
      coord1: {
        xPx: number
        yPx: number
      }
      coord2: {
        xPx: number
        yPx: number
      }
    }
    axisY: {
      coord1: {
        xPx: number
        yPx: number
      }
      coord2: {
        xPx: number
        yPx: number
      }
    }
  }[]
  datasets: {
    id: number
    points: {
      coord: {
        xPx: number
        yPx: number
      }
    }[]
  }[]
}
