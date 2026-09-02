import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import { Dataset } from '@/domain/models/dataset/dataset'
import { InterpolatorCanvasInterface } from './interpolatorCanvasInterface'

// INFO: docs/design/interpolator-canvas-separation.md 参照。
// canvas描画をInterpolatorCanvasInterface越しに委譲したことで、実DOM/canvasに
// 一切触れずにInterpolatorの計算・状態遷移ロジックだけをテストできることを
// このテストファイル自体で示す。

jest.mock('@/instanceStore/applicationServiceInstances', () => ({
  canvasHandler: {
    scale: 1,
    originalWidth: 100,
    originalHeight: 100,
  },
}))

jest.mock('@/instanceStore/repositoryInatances', () => ({
  datasetRepository: { activeDataset: undefined },
}))

import { Interpolator } from './interpolator'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

function createMockCanvas(
  hasCanvas: boolean,
): jest.Mocked<InterpolatorCanvasInterface> {
  return {
    setGuideCanvas: jest.fn(),
    setMagnifierCanvas: jest.fn(),
    hasCanvas: jest.fn(() => hasCanvas),
    clearGuideCanvasContext: jest.fn(),
    clearMagnifierCanvasContext: jest.fn(),
    drawInterpolationLine: jest.fn(),
    resize: jest.fn(),
  }
}

describe('Interpolator', () => {
  let mockCanvas: jest.Mocked<InterpolatorCanvasInterface>
  let interpolator: Interpolator

  beforeEach(() => {
    localStorage.clear()
    mockCanvas = createMockCanvas(true)
    interpolator = new Interpolator(mockCanvas)
    datasetRepository.activeDataset = new Dataset('dataset 1', [], 1)
  })

  it('updateInterval updates the interval value', () => {
    expect(interpolator.interval).toBe(10)
    interpolator.updateInterval(20)
    expect(interpolator.interval).toBe(20)
  })

  it('setIsActive updates the isActive value', () => {
    expect(interpolator.isActive).toBe(false)
    interpolator.setIsActive(true)
    expect(interpolator.isActive).toBe(true)
  })

  it('initialize reflects the persisted localStorage value', () => {
    localStorage.setItem(
      'starryDigitizer',
      JSON.stringify({ isInterpolatorActive: 'true' }),
    )
    interpolator.initialize()
    expect(interpolator.isActive).toBe(true)
  })

  describe('setGuideCanvas / setMagnifierCanvas', () => {
    it('delegates to the injected canvas', () => {
      const guideCanvas = {} as never
      const magnifierCanvas = {} as never

      interpolator.setGuideCanvas(guideCanvas)
      interpolator.setMagnifierCanvas(magnifierCanvas)

      expect(mockCanvas.setGuideCanvas).toHaveBeenCalledWith(guideCanvas)
      expect(mockCanvas.setMagnifierCanvas).toHaveBeenCalledWith(
        magnifierCanvas,
      )
    })
  })

  describe('updatePreview', () => {
    it('throws if the interpolator is not active', () => {
      expect(() => interpolator.updatePreview()).toThrow(
        'interpolator.updatePreview was called but interpolator is not activated',
      )
    })

    it('clears both canvases even with 1 or fewer anchor points, but does not draw', () => {
      interpolator.setIsActive(true)
      const dataset = datasetRepository.activeDataset
      dataset.addPoint(10, 10)
      dataset.addManuallyAddedPointId(dataset.lastPointId)

      interpolator.updatePreview()

      expect(mockCanvas.clearGuideCanvasContext).toHaveBeenCalled()
      expect(mockCanvas.clearMagnifierCanvasContext).toHaveBeenCalled()
      expect(mockCanvas.drawInterpolationLine).not.toHaveBeenCalled()
      expect(dataset.tempPoints).toHaveLength(0)
    })

    it('draws the interpolation line and generates tempPoints with 2+ anchor points', () => {
      interpolator.setIsActive(true)
      const dataset = datasetRepository.activeDataset
      dataset.addPoint(0, 0)
      dataset.addManuallyAddedPointId(dataset.lastPointId)
      dataset.addPoint(100, 100)
      dataset.addManuallyAddedPointId(dataset.lastPointId)

      interpolator.updatePreview()

      expect(mockCanvas.drawInterpolationLine).toHaveBeenCalledWith(
        interpolator.interpolatedCoordsForGuideline,
        1, // canvasHandler.scale (mocked)
      )
      expect(dataset.tempPoints.length).toBeGreaterThan(0)
    })

    it('clears any existing tempPoints before regenerating them', () => {
      interpolator.setIsActive(true)
      const dataset = datasetRepository.activeDataset
      dataset.addTempPoint(5, 5)
      dataset.addPoint(0, 0)
      dataset.addManuallyAddedPointId(dataset.lastPointId)

      interpolator.updatePreview()

      expect(
        dataset.tempPoints.some((p) => p.xPx === 5 && p.yPx === 5),
      ).toBe(false)
    })
  })

  describe('clearPreview', () => {
    it('clears tempPoints, manually-added anchor points, canvases, and interpolatedCoords', () => {
      const dataset = datasetRepository.activeDataset
      dataset.addPoint(0, 0)
      dataset.addManuallyAddedPointId(dataset.lastPointId)
      dataset.addTempPoint(1, 1)

      interpolator.clearPreview()

      expect(dataset.tempPoints).toHaveLength(0)
      expect(dataset.points).toHaveLength(0)
      expect(mockCanvas.clearGuideCanvasContext).toHaveBeenCalled()
      expect(mockCanvas.clearMagnifierCanvasContext).toHaveBeenCalled()
      expect(interpolator.interpolatedCoords).toHaveLength(0)
      expect(interpolator.interpolatedCoordsForGuideline).toHaveLength(0)
    })
  })

  describe('resizeCanvas', () => {
    it('does nothing when the injected canvas has no guide/magnifier canvas set', () => {
      mockCanvas = createMockCanvas(false)
      interpolator = new Interpolator(mockCanvas)

      interpolator.resizeCanvas()

      expect(mockCanvas.resize).not.toHaveBeenCalled()
    })

    it('resizes without redrawing when there are no interpolated coords yet', () => {
      interpolator.resizeCanvas()

      expect(mockCanvas.resize).toHaveBeenCalledWith(100, 100) // originalWidth/Height * scale (mocked)
      expect(mockCanvas.drawInterpolationLine).not.toHaveBeenCalled()
    })

    it('resizes and redraws when interpolated coords already exist', () => {
      interpolator.setIsActive(true)
      const dataset = datasetRepository.activeDataset
      dataset.addPoint(0, 0)
      dataset.addManuallyAddedPointId(dataset.lastPointId)
      dataset.addPoint(100, 100)
      dataset.addManuallyAddedPointId(dataset.lastPointId)
      interpolator.updatePreview()
      mockCanvas.drawInterpolationLine.mockClear()

      interpolator.resizeCanvas()

      expect(mockCanvas.resize).toHaveBeenCalledWith(100, 100)
      expect(mockCanvas.drawInterpolationLine).toHaveBeenCalledWith(
        interpolator.interpolatedCoordsForGuideline,
        1,
      )
    })
  })
})
