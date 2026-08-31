import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { Dataset } from '@/domain/models/dataset/dataset'

jest.mock('@/instanceStore/applicationServiceInstances', () => ({
  magnifier: { effectiveDigits: 4 },
}))

jest.mock('@/instanceStore/repositoryInatances', () => ({
  datasetRepository: { activeDataset: undefined },
  axisSetRepository: { activeAxisSet: undefined },
}))

import {
  getActiveDatasetTableData,
  copyRowsToClipboard,
  copyActiveDatasetToClipboard,
} from './dataExport'
import {
  datasetRepository,
  axisSetRepository,
} from '@/instanceStore/repositoryInatances'

describe('dataExport', () => {
  beforeEach(() => {
    axisSetRepository.activeAxisSet = new AxisSet(
      new Axis('x1', 1, { xPx: 0, yPx: 0 }),
      new Axis('x2', 10, { xPx: 1000, yPx: 0 }),
      new Axis('y1', 1, { xPx: 0, yPx: 1000 }),
      new Axis('y2', 10, { xPx: 0, yPx: 0 }),
      new Axis('x1y1', -1, { xPx: 0, yPx: 0 }),
      1,
      'XY Axes 1',
    )
    datasetRepository.activeDataset = new Dataset('dataset 1', [], 1)
  })

  describe('getActiveDatasetTableData', () => {
    it('returns a single null row when the active dataset has no points', () => {
      expect(getActiveDatasetTableData()).toEqual([{ X: null, Y: null }])
    })

    it('converts each point to axis-calibrated X/Y values', () => {
      datasetRepository.activeDataset.points = [
        { id: 1, xPx: 500, yPx: 500 },
      ]

      const result = getActiveDatasetTableData()

      expect(result).toHaveLength(1)
      expect(result[0].X).toBe('5.5e+0')
      expect(result[0].Y).toBe('5.5e+0')
    })
  })

  describe('copyRowsToClipboard', () => {
    it('writes the given rows as CSV, independent of the active dataset', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const result = await copyRowsToClipboard([{ X: '3', Y: '5' }])

      expect(writeText).toHaveBeenCalledWith('3,5')
      expect(result).toEqual({ success: true })
    })

    it('returns an error message when the clipboard write fails', async () => {
      const writeText = jest.fn().mockRejectedValue(new Error('denied'))
      Object.assign(navigator, { clipboard: { writeText } })

      const result = await copyRowsToClipboard([{ X: '3', Y: '5' }])

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('denied')
    })
  })

  describe('copyActiveDatasetToClipboard', () => {
    it('writes the CSV-formatted data to the clipboard', async () => {
      datasetRepository.activeDataset.points = [
        { id: 1, xPx: 500, yPx: 500 },
      ]
      const writeText = jest.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const result = await copyActiveDatasetToClipboard()

      expect(writeText).toHaveBeenCalledWith('5.5e+0,5.5e+0')
      expect(result).toEqual({ success: true })
    })

    it('returns an error message when the clipboard write fails', async () => {
      const writeText = jest.fn().mockRejectedValue(new Error('denied'))
      Object.assign(navigator, { clipboard: { writeText } })

      const result = await copyActiveDatasetToClipboard()

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('denied')
    })
  })
})
