//NOTE: Includes the actual data collected from a figure: axis values, axis scale, data point values and so
//NOTE: Do not include any data which depends on StarryDigitizer app(e.g. setting axis by 2 points or 4 points etc...)

export interface PlotDataScheme {
  version: '0.1.0'
  axisSets: {
    id: number
    name: string
    xAxis: {
      value1: number
      value2: number
      scale: 'linear' | 'log'
      //NOTE: Currently not supported but may support in the future
      // property: string
      // unit: string
    }
    yAxis: {
      value1: number
      value2: number
      scale: 'linear' | 'log'
      //NOTE: Currently not supported but may support in the future
      // property: string
      // unit: string
    }
  }[]
  datasets: {
    id: number
    name: string
    axisSetId: number
    values: {
      x: number
      y: number
    }[]
  }[]
}
