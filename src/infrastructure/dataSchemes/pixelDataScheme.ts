export interface pixelDataScheme {
  schemeVersion: '0.1.0'
  axisSets: {
    id: number
    xAxis: {
      coord1: {
        xPx: number
        yPx: number
      }
      coord2: {
        xPx: number
        yPx: number
      }
    }
    yAxis: {
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
