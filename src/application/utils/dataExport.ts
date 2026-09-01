import AxisSetCalculator from '@/domain/services/axisSetCalculator'
import { magnifier } from '@/instanceStore/applicationServiceInstances'
import {
  axisSetRepository,
  datasetRepository,
} from '@/instanceStore/repositoryInatances'
import { Point } from '@/@types/types'

export type TableRow = { X: string | null; Y: string | null }

// INFO: Shared by DataTable.vue (the "Copy to Clipboard" button) and
// App.vue (the File menu), mirroring the projectFileOperations.ts pattern —
// same computation, two entry points.
export function getActiveDatasetTableData(): TableRow[] {
  const activeDataset = datasetRepository.activeDataset

  if (activeDataset.points.length === 0) {
    return [{ X: null, Y: null }]
  }

  const activeAxisSet = axisSetRepository.activeAxisSet
  const calculator = new AxisSetCalculator(
    activeAxisSet,
    {
      x: activeAxisSet.xIsLogScale,
      y: activeAxisSet.yIsLogScale,
    },
    magnifier.effectiveDigits,
  )

  return activeDataset.points.map((point: Point) => {
    const { xV, yV } = calculator.calculateXYValues(point.xPx, point.yPx)
    return { X: xV, Y: yV }
  })
}

// INFO: Takes rows rather than reading the active dataset itself, because
// DataTable.vue's Handsontable instance mutates its bound `tableData` array
// in place when the user edits a cell — that edit never reaches
// datasetRepository, so DataTable.vue must pass its own (possibly
// hand-edited) `tableData`, while the File menu passes a fresh
// getActiveDatasetTableData() computed straight from the dataset.
export async function copyRowsToClipboard(rows: TableRow[]): Promise<{
  success: boolean
  errorMessage?: string
}> {
  try {
    const csv = rows.map((row) => [row.X, row.Y].join(',')).join('\n')
    await navigator.clipboard.writeText(csv)
    return { success: true }
  } catch (error) {
    console.error('Failed to copy data to clipboard.', error)
    return {
      success: false,
      errorMessage: `Failed to copy data to clipboard: ${
        (error as Error).message
      }`,
    }
  }
}

export async function copyActiveDatasetToClipboard(): Promise<{
  success: boolean
  errorMessage?: string
}> {
  return copyRowsToClipboard(getActiveDatasetTableData())
}
