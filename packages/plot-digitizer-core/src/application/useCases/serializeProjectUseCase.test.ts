import { SerializeProjectUseCase } from './serializeProjectUseCase'
import { Axis } from '../../domain/models/axis/axis'
import { AxisSet } from '../../domain/models/axisSet/axisSet'
import { Dataset } from '../../domain/models/dataset/dataset'
import type { ProjectDTO } from '../dto/projectDTO'

describe('SerializeProjectUseCase', () => {
  const useCase = new SerializeProjectUseCase()

  describe('toProjectDTO', () => {
    test('maps axis sets, datasets, and canvas state into a ProjectDTO', () => {
      const axisSet = new AxisSet(
        new Axis('x1', 0, { xPx: 10, yPx: 110 }),
        new Axis('x2', 100, { xPx: 110, yPx: 110 }),
        new Axis('y1', 0, { xPx: 10, yPx: 110 }),
        new Axis('y2', 100, { xPx: 10, yPx: 10 }),
        new Axis('x2y2', -1, { xPx: -999, yPx: -999 }),
        1,
        'AxisSet 1',
      )
      axisSet.xIsLogScale = true
      axisSet.considerGraphTilt = true

      const dataset = new Dataset('Dataset 1', [{ id: 1, xPx: 5, yPx: 5 }], 1)
      dataset.axisSetId = 1
      dataset.visiblePointIds = [1]
      dataset.manuallyAddedPointIds = [1]

      const dto = useCase.toProjectDTO({
        version: '1.11.2',
        axisSets: [axisSet],
        activeAxisSetId: 1,
        datasets: [dataset],
        activeDatasetId: 1,
        canvasState: { scale: 1.5, manualMode: 0 },
      })

      expect(dto.version).toBe('1.11.2')
      expect(typeof dto.timestamp).toBe('string')
      expect(new Date(dto.timestamp).toString()).not.toBe('Invalid Date')

      expect(dto.axisSets).toEqual([
        {
          id: 1,
          name: 'AxisSet 1',
          x1: { name: 'x1', value: 0, coord: { xPx: 10, yPx: 110 } },
          x2: { name: 'x2', value: 100, coord: { xPx: 110, yPx: 110 } },
          y1: { name: 'y1', value: 0, coord: { xPx: 10, yPx: 110 } },
          y2: { name: 'y2', value: 100, coord: { xPx: 10, yPx: 10 } },
          xIsLogScale: true,
          yIsLogScale: false,
          considerGraphTilt: true,
          pointMode: 0,
          isVisible: true,
        },
      ])
      expect(dto.activeAxisSetId).toBe(1)
      expect(dto.datasets).toEqual([
        {
          id: 1,
          name: 'Dataset 1',
          axisSetId: 1,
          points: [{ id: 1, xPx: 5, yPx: 5 }],
          visiblePointIds: [1],
          manuallyAddedPointIds: [1],
        },
      ])
      expect(dto.activeDatasetId).toBe(1)
      expect(dto.canvasHandler).toEqual({ scale: 1.5, manualMode: 0 })
    })

    test('handles empty axisSets/datasets', () => {
      const dto = useCase.toProjectDTO({
        version: '1.0.0',
        axisSets: [],
        activeAxisSetId: 1,
        datasets: [],
        activeDatasetId: 1,
        canvasState: { scale: 1, manualMode: -1 },
      })

      expect(dto.axisSets).toEqual([])
      expect(dto.datasets).toEqual([])
    })
  })

  describe('fromProjectDTO', () => {
    const dto: ProjectDTO = {
      version: '1.11.2',
      timestamp: '2026-08-15T00:00:00.000Z',
      axisSets: [
        {
          id: 1,
          name: 'AxisSet 1',
          x1: { name: 'x1', value: 0, coord: { xPx: 10, yPx: 110 } },
          x2: { name: 'x2', value: 100, coord: { xPx: 110, yPx: 110 } },
          y1: { name: 'y1', value: 0, coord: { xPx: 10, yPx: 110 } },
          y2: { name: 'y2', value: 100, coord: { xPx: 10, yPx: 10 } },
          xIsLogScale: true,
          yIsLogScale: false,
          considerGraphTilt: true,
          pointMode: 1,
          isVisible: false,
        },
      ],
      activeAxisSetId: 1,
      datasets: [
        {
          id: 1,
          name: 'Dataset 1',
          axisSetId: 1,
          points: [{ id: 1, xPx: 5, yPx: 5 }],
          visiblePointIds: [1],
          manuallyAddedPointIds: [1],
        },
      ],
      activeDatasetId: 1,
      canvasHandler: { scale: 1.5, manualMode: 0 },
    }

    test('reconstructs AxisSet domain instances from the DTO', () => {
      const result = useCase.fromProjectDTO(dto)

      expect(result.axisSets).toHaveLength(1)
      const axisSet = result.axisSets[0]
      expect(axisSet).toBeInstanceOf(AxisSet)
      expect(axisSet.id).toBe(1)
      expect(axisSet.name).toBe('AxisSet 1')
      expect(axisSet.x1).toEqual(
        expect.objectContaining({
          name: 'x1',
          value: 0,
          coord: { xPx: 10, yPx: 110 },
        }),
      )
      expect(axisSet.x2.coord).toEqual({ xPx: 110, yPx: 110 })
      expect(axisSet.y1.coord).toEqual({ xPx: 10, yPx: 110 })
      expect(axisSet.y2.coord).toEqual({ xPx: 10, yPx: 10 })
      expect(axisSet.xIsLogScale).toBe(true)
      expect(axisSet.yIsLogScale).toBe(false)
      expect(axisSet.considerGraphTilt).toBe(true)
      expect(axisSet.pointMode).toBe(1)
      expect(axisSet.isVisible).toBe(false)
    })

    test('always resets the x2y2 virtual axis rather than restoring it from the DTO', () => {
      const result = useCase.fromProjectDTO(dto)
      const axisSet = result.axisSets[0]

      expect(axisSet.x2y2.name).toBe('x2y2')
      expect(axisSet.x2y2.value).toBe(-1)
      expect(axisSet.x2y2.coord).toEqual({ xPx: -999, yPx: -999 })
    })

    test('reconstructs Dataset domain instances from the DTO', () => {
      const result = useCase.fromProjectDTO(dto)

      expect(result.datasets).toHaveLength(1)
      const dataset = result.datasets[0]
      expect(dataset).toBeInstanceOf(Dataset)
      expect(dataset.id).toBe(1)
      expect(dataset.name).toBe('Dataset 1')
      expect(dataset.axisSetId).toBe(1)
      expect(dataset.points).toEqual([{ id: 1, xPx: 5, yPx: 5 }])
      expect(dataset.visiblePointIds).toEqual([1])
      expect(dataset.manuallyAddedPointIds).toEqual([1])
    })

    test('passes through activeAxisSetId / activeDatasetId / canvasState', () => {
      const result = useCase.fromProjectDTO(dto)

      expect(result.activeAxisSetId).toBe(1)
      expect(result.activeDatasetId).toBe(1)
      expect(result.canvasState).toEqual({ scale: 1.5, manualMode: 0 })
    })

    test('handles empty axisSets/datasets', () => {
      const result = useCase.fromProjectDTO({ ...dto, axisSets: [], datasets: [] })

      expect(result.axisSets).toEqual([])
      expect(result.datasets).toEqual([])
    })
  })

  test('round-trips toProjectDTO -> fromProjectDTO without losing data', () => {
    const axisSet = new AxisSet(
      new Axis('x1', 0, { xPx: 10, yPx: 110 }),
      new Axis('x2', 100, { xPx: 110, yPx: 110 }),
      new Axis('y1', 0, { xPx: 10, yPx: 110 }),
      new Axis('y2', 100, { xPx: 10, yPx: 10 }),
      new Axis('x2y2', -1, { xPx: -999, yPx: -999 }),
      1,
      'AxisSet 1',
    )
    const dataset = new Dataset('Dataset 1', [{ id: 1, xPx: 5, yPx: 5 }], 1)

    const dto = useCase.toProjectDTO({
      version: '1.11.2',
      axisSets: [axisSet],
      activeAxisSetId: 1,
      datasets: [dataset],
      activeDatasetId: 1,
      canvasState: { scale: 1, manualMode: -1 },
    })
    const restored = useCase.fromProjectDTO(dto)

    expect(restored.axisSets[0].name).toBe(axisSet.name)
    expect(restored.axisSets[0].x1.coord).toEqual(axisSet.x1.coord)
    expect(restored.datasets[0].name).toBe(dataset.name)
    expect(restored.datasets[0].points).toEqual(dataset.points)
  })
})
