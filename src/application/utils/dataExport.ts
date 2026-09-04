import { DigitizerContext } from '@/application/digitizerContext'
import { datasetToValues } from '@/application/utils/datasetValues'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'

export type TableRow = { X: string | null; Y: string | null }

// INFO: Shared by DataTable.vue (the "Copy to Clipboard" button) and
// App.vue (the File menu), mirroring the projectFileOperations.ts pattern —
// same computation, two entry points.
export function getDatasetTableData(
  ctx: DigitizerContext,
  dataset: DatasetInterface,
): TableRow[] {
  if (dataset.points.length === 0) {
    return [{ X: null, Y: null }]
  }
  // INFO: uses the dataset's own axis set (not the active one) so that
  // multi-axis-set projects export each dataset with the right calibration.
  const axisSet = ctx.axisSetRepository.axisSets.find(
    (a) => a.id === dataset.axisSetId,
  )
  const values = datasetToValues(
    dataset,
    axisSet,
    ctx.valueFormat.effectiveDigits,
  )
  return values.points.map(({ x, y }) => ({
    X: Number.isNaN(x) ? 'NaN' : x.toExponential(),
    Y: Number.isNaN(y) ? 'NaN' : y.toExponential(),
  }))
}

export function getActiveDatasetTableData(ctx: DigitizerContext): TableRow[] {
  return getDatasetTableData(ctx, ctx.datasetRepository.activeDataset)
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

export async function copyActiveDatasetToClipboard(
  ctx: DigitizerContext,
): Promise<{
  success: boolean
  errorMessage?: string
}> {
  return copyRowsToClipboard(getActiveDatasetTableData(ctx))
}
