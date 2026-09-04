import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { Dataset } from '@/domain/models/dataset/dataset'
import { AxisSetRepository } from '@/domain/repositories/axisSetRepository/axisSetRepository'
import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'
import { DigitizerContext } from '@/application/digitizerContext'

import {
  getDatasetTableData,
  getActiveDatasetTableData,
  copyRowsToClipboard,
  copyActiveDatasetToClipboard,
} from './dataExport'

/**
 * Rectilinear axis set: x runs 0px..1000px over x1Value..x2Value, y runs
 * 1000px..0px over the same values.
 */
const buildAxisSet = (id: number, x1Value: number, x2Value: number): AxisSet =>
  new AxisSet(
    new Axis('x1', x1Value, { xPx: 0, yPx: 0 }),
    new Axis('x2', x2Value, { xPx: 1000, yPx: 0 }),
    new Axis('y1', x1Value, { xPx: 0, yPx: 1000 }),
    new Axis('y2', x2Value, { xPx: 0, yPx: 0 }),
    new Axis('x2y2', -1, { xPx: -999, yPx: -999 }),
    id,
    `XY Axes ${id}`,
  )

const buildContext = () => {
  const axisSetRepository = new AxisSetRepository()
  const datasetRepository = new DatasetRepository()
  axisSetRepository.axisSets = [buildAxisSet(1, 1, 10)]
  datasetRepository.clearAllDatasets()
  datasetRepository.addDataset(new Dataset('dataset 1', [], 1))
  datasetRepository.setActiveDataset(1)

  const ctx = {
    axisSetRepository,
    datasetRepository,
    valueFormat: { effectiveDigits: 4 },
  } as unknown as DigitizerContext

  return { ctx, axisSetRepository, datasetRepository }
}

describe('dataExport', () => {
  let ctx: DigitizerContext
  let axisSetRepository: AxisSetRepository
  let datasetRepository: DatasetRepository

  beforeEach(() => {
    ;({ ctx, axisSetRepository, datasetRepository } = buildContext())
  })

  describe('getDatasetTableData', () => {
    it('returns a single null row when the dataset has no points', () => {
      expect(getDatasetTableData(ctx, datasetRepository.datasets[0])).toEqual([
        { X: null, Y: null },
      ])
    })

    it('converts each point to axis-calibrated X/Y values', () => {
      datasetRepository.datasets[0].points = [{ id: 1, xPx: 500, yPx: 500 }]

      const result = getDatasetTableData(ctx, datasetRepository.datasets[0])

      expect(result).toEqual([{ X: '5.5e+0', Y: '5.5e+0' }])
    })

    it("uses each dataset's own axis set, not the active one", () => {
      // INFO: axis set 2 spans 0..100 where axis set 1 spans 1..10, so the
      // same pixel coordinate must come out differently per dataset.
      axisSetRepository.addAxisSet(buildAxisSet(2, 0, 100))
      axisSetRepository.setActiveAxisSet(1)

      const first = datasetRepository.datasets[0]
      first.points = [{ id: 1, xPx: 500, yPx: 500 }]

      const second = new Dataset(
        'dataset 2',
        [{ id: 1, xPx: 500, yPx: 500 }],
        2,
      )
      second.axisSetId = 2
      datasetRepository.addDataset(second)

      expect(getDatasetTableData(ctx, first)).toEqual([
        { X: '5.5e+0', Y: '5.5e+0' },
      ])
      expect(getDatasetTableData(ctx, second)).toEqual([
        { X: '5e+1', Y: '5e+1' },
      ])
    })

    it('renders NaN when the dataset axis set does not exist', () => {
      const orphan = new Dataset('orphan', [{ id: 1, xPx: 500, yPx: 500 }], 2)
      orphan.axisSetId = 99
      datasetRepository.addDataset(orphan)

      expect(getDatasetTableData(ctx, orphan)).toEqual([{ X: 'NaN', Y: 'NaN' }])
    })
  })

  describe('getActiveDatasetTableData', () => {
    it('reads the active dataset from the context', () => {
      datasetRepository.datasets[0].points = [{ id: 1, xPx: 500, yPx: 500 }]

      expect(getActiveDatasetTableData(ctx)).toEqual([
        { X: '5.5e+0', Y: '5.5e+0' },
      ])
    })
  })

  describe('copyRowsToClipboard', () => {
    it('writes the given rows as CSV, independent of the active dataset', async () => {
      const writeText = jest.fn(() => Promise.resolve())
      Object.assign(navigator, { clipboard: { writeText } })

      const result = await copyRowsToClipboard([{ X: '3', Y: '5' }])

      expect(writeText).toHaveBeenCalledWith('3,5')
      expect(result).toEqual({ success: true })
    })

    it('returns an error message when the clipboard write fails', async () => {
      const writeText = jest.fn(() => Promise.reject(new Error('denied')))
      Object.assign(navigator, { clipboard: { writeText } })

      const result = await copyRowsToClipboard([{ X: '3', Y: '5' }])

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('denied')
    })
  })

  describe('copyActiveDatasetToClipboard', () => {
    it('writes the CSV-formatted active dataset to the clipboard', async () => {
      datasetRepository.datasets[0].points = [{ id: 1, xPx: 500, yPx: 500 }]
      const writeText = jest.fn(() => Promise.resolve())
      Object.assign(navigator, { clipboard: { writeText } })

      const result = await copyActiveDatasetToClipboard(ctx)

      expect(writeText).toHaveBeenCalledWith('5.5e+0,5.5e+0')
      expect(result).toEqual({ success: true })
    })

    it('returns an error message when the clipboard write fails', async () => {
      const writeText = jest.fn(() => Promise.reject(new Error('denied')))
      Object.assign(navigator, { clipboard: { writeText } })

      const result = await copyActiveDatasetToClipboard(ctx)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('denied')
    })
  })
})
