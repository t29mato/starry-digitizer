export interface AllDataToExportInterface {
  dataObject: {
    axes: {
      x1Value: number
      x2Value: number
      y1Value: number
      y2Value: number
      xIsLog: boolean
      yIsLog: boolean
    }
    datasets: { name: string; plotValues: number[] }[]
  }
}
