import { expect, describe, it } from '@jest/globals'
import {
  PROJECT_DTO_VERSION,
  createEmptyProject,
  migrateProject,
} from './projectDTO'
import { DigitizerError } from '@/application/errors'
import { MANUAL_MODE, POINT_MODE } from '@/constants'

const axis = (name: string, value: number, xPx: number, yPx: number) => ({
  name,
  value,
  coord: { xPx, yPx },
})

const legacyAxisSet = () => ({
  id: 1,
  name: 'AxisSet 1',
  x1: axis('x1', 0, 10, 10),
  x2: axis('x2', 100, 110, 10),
  y1: axis('y1', 0, 10, 110),
  y2: axis('y2', 100, 10, 10),
})

const legacyProject = () => ({
  version: '1.11.2',
  timestamp: '2024-01-01T00:00:00.000Z',
  axisSets: [legacyAxisSet()],
  activeAxisSetId: 1,
  datasets: [{ id: 1, name: 'Dataset 1', axisSetId: 1, points: [] }],
  activeDatasetId: 1,
})

describe('migrateProject', () => {
  describe('legacy (major 1) projects', () => {
    it('restamps the version to the current schema', () => {
      const migrated = migrateProject(legacyProject())

      expect(migrated.version).toBe('2.0.0')
      expect(migrated.version).toBe(PROJECT_DTO_VERSION)
    })

    // INFO: the regression this guards. A fabricated `{ scale: 1 }` is
    // indistinguishable from a saved one, and restoreProject() used to assign
    // it over the fit factor the image had just been drawn at — the image kept
    // its fit size while the points/axes/guide were drawn at scale 1.
    it('leaves canvasHandler absent when the input has none', () => {
      const migrated = migrateProject(legacyProject())

      expect(migrated.canvasHandler).toBeUndefined()
      expect(migrated).not.toHaveProperty('canvasHandler')
    })

    it('still fills the per-field defaults of a canvasHandler that IS present', () => {
      const migrated = migrateProject({ ...legacyProject(), canvasHandler: {} })

      expect(migrated.canvasHandler).toEqual({
        scale: 1,
        manualMode: MANUAL_MODE.UNSET,
      })
    })

    it('fills in the per-dataset bookkeeping arrays when they are missing', () => {
      const migrated = migrateProject(legacyProject())

      expect(migrated.datasets[0].visiblePointIds).toEqual([])
      expect(migrated.datasets[0].manuallyAddedPointIds).toEqual([])
    })

    it('fills in the axis set display defaults when they are missing', () => {
      const migrated = migrateProject(legacyProject())

      expect(migrated.axisSets[0]).toMatchObject({
        xIsLogScale: false,
        yIsLogScale: false,
        considerGraphTilt: false,
        pointMode: POINT_MODE.TWO_POINTS,
        isVisible: true,
      })
    })

    it('names an axis set / dataset after its id when the name is missing', () => {
      const input = legacyProject() as Record<string, unknown>
      const axisSets = input.axisSets as Record<string, unknown>[]
      const datasets = input.datasets as Record<string, unknown>[]
      delete axisSets[0].name
      delete datasets[0].name

      const migrated = migrateProject(input)

      expect(migrated.axisSets[0].name).toBe('XY Axes 1')
      expect(migrated.datasets[0].name).toBe('dataset 1')
    })

    it('does not mutate the input', () => {
      const input = legacyProject()
      const snapshot = JSON.parse(JSON.stringify(input))

      migrateProject(input)

      expect(input).toEqual(snapshot)
    })
  })

  describe('current (major 2) projects', () => {
    it('passes a v2 project through and keeps externalId', () => {
      const input = {
        ...legacyProject(),
        version: '2.0.0',
        datasets: [
          {
            id: 1,
            name: 'Dataset 1',
            axisSetId: 1,
            points: [{ id: 1, xPx: 5, yPx: 6 }],
            visiblePointIds: [1],
            manuallyAddedPointIds: [1],
            externalId: 'sample-42',
          },
        ],
        canvasHandler: { scale: 2, manualMode: MANUAL_MODE.ADD },
      }

      const migrated = migrateProject(input)

      expect(migrated.datasets[0].externalId).toBe('sample-42')
      expect(migrated.datasets[0].visiblePointIds).toEqual([1])
      expect(migrated.datasets[0].manuallyAddedPointIds).toEqual([1])
      expect(migrated.canvasHandler).toEqual({
        scale: 2,
        manualMode: MANUAL_MODE.ADD,
      })
      expect(migrated.timestamp).toBe('2024-01-01T00:00:00.000Z')
    })

    it('drops a non-string externalId instead of copying it', () => {
      const input = {
        ...legacyProject(),
        version: '2.0.0',
        datasets: [
          { id: 1, name: 'd', axisSetId: 1, points: [], externalId: 42 },
        ],
      }

      expect(migrateProject(input).datasets[0].externalId).toBeUndefined()
    })
  })

  describe('rejections', () => {
    const expectCode = (input: unknown, code: string) => {
      try {
        migrateProject(input)
      } catch (error) {
        expect(error).toBeInstanceOf(DigitizerError)
        expect((error as DigitizerError).code).toBe(code)
        return
      }
      throw new Error('migrateProject did not throw')
    }

    it.each([
      ['null', null],
      ['a string', 'not a project'],
      ['a number', 7],
    ])('rejects %s with PROJECT_INVALID', (_label, input) => {
      expectCode(input, 'PROJECT_INVALID')
    })

    it('rejects a missing version with PROJECT_INVALID', () => {
      const input = legacyProject() as Record<string, unknown>
      delete input.version
      expectCode(input, 'PROJECT_INVALID')
    })

    it('rejects a malformed version with PROJECT_INVALID', () => {
      expectCode({ ...legacyProject(), version: 'v-one' }, 'PROJECT_INVALID')
    })

    it('rejects missing axisSets/datasets arrays with PROJECT_INVALID', () => {
      const withoutAxisSets = legacyProject() as Record<string, unknown>
      delete withoutAxisSets.axisSets
      expectCode(withoutAxisSets, 'PROJECT_INVALID')

      const withoutDatasets = legacyProject() as Record<string, unknown>
      delete withoutDatasets.datasets
      expectCode(withoutDatasets, 'PROJECT_INVALID')
    })

    it('rejects an axis set that is missing an axis with PROJECT_INVALID', () => {
      const input = legacyProject() as Record<string, unknown>
      const axisSets = input.axisSets as Record<string, unknown>[]
      delete axisSets[0].y2
      expectCode(input, 'PROJECT_INVALID')
    })

    it('rejects a dataset without a points array with PROJECT_INVALID', () => {
      const input = legacyProject() as Record<string, unknown>
      const datasets = input.datasets as Record<string, unknown>[]
      delete datasets[0].points
      expectCode(input, 'PROJECT_INVALID')
    })

    it('rejects a newer major version with DTO_VERSION_UNSUPPORTED', () => {
      expectCode(
        { ...legacyProject(), version: '3.0.0' },
        'DTO_VERSION_UNSUPPORTED',
      )
    })
  })
})

describe('createEmptyProject', () => {
  it('describes a single empty axis set and dataset at the current version', () => {
    const project = createEmptyProject()

    expect(project.version).toBe(PROJECT_DTO_VERSION)
    expect(project.axisSets).toHaveLength(1)
    expect(project.datasets).toHaveLength(1)
    expect(project.activeAxisSetId).toBe(1)
    expect(project.activeDatasetId).toBe(1)
    expect(project.datasets[0]).toEqual({
      id: 1,
      name: 'dataset 1',
      axisSetId: 1,
      points: [],
      visiblePointIds: [],
      manuallyAddedPointIds: [],
    })
    expect(project.axisSets[0].x1.coord).toEqual({ xPx: -999, yPx: -999 })
    expect(project.canvasHandler).toEqual({
      scale: 1,
      manualMode: MANUAL_MODE.UNSET,
    })
  })

  it('produces a project that survives migrateProject unchanged', () => {
    const project = createEmptyProject()

    expect(migrateProject(project)).toEqual(project)
  })
})
