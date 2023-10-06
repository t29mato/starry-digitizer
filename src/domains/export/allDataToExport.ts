import { AllDataToExportInterface } from './allDataToExportInterface'
import { AxesInterface } from '../axes/axesInterface'
import { DatasetInterface } from '../datasetInterface'

export class AllDataToExport implements AllDataToExportInterface {
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

  constructor(axes: AxesInterface, datasets: DatasetInterface[]) {
    this.dataObject = {
      axes: {
        x1Value: axes.x1.value,
        x2Value: axes.x2.value,
        y1Value: axes.y1.value,
        y2Value: axes.y2.value,
        xIsLog: false,
        yIsLog: false,
      },
      datasets: datasets.map((dataset: DatasetInterface) => {
        return {
          name: dataset.name,
          //TODO: ここは仮実装。計算したPlotsの値の扱いについて相談
          plotValues: [0.0, 2.0, 2.0, 4.0],
        }
      }),
    }
  }
}
