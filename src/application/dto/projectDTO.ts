import { AxisSetDTO } from './axisSetDTO'
import { DatasetDTO } from './datasetDTO'
import { CanvasHandlerDTO } from './canvasHandlerDTO'
import { DigitizerError } from '@/application/errors'
import { MANUAL_MODE, POINT_MODE } from '@/constants'

/**
 * Schema version written into `ProjectDTO.version`.
 *
 * `version` is a semver string whose MAJOR is the DTO schema generation:
 * - major 1: legacy files. The app's own version (e.g. "1.11.2") was written
 *   here; the shape is identical to major 2 apart from optional fields.
 * - major 2: current schema (adds `DatasetDTO.externalId`, makes
 *   `canvasHandler` and per-dataset bookkeeping arrays optional on read).
 *
 * Hosts persist the DTO opaquely, so any change that breaks reading an older
 * DTO must bump the major and be handled in `migrateProject`.
 */
export const PROJECT_DTO_VERSION = '2.0.0'

const SUPPORTED_MAJOR = 2

/**
 * DTO (Data Transfer Object) for Project
 * Complete project data for serialization and deserialization
 * This represents the entire application state that can be saved/loaded
 */
export interface ProjectDTO {
  version: string
  timestamp: string
  axisSets: AxisSetDTO[]
  activeAxisSetId: number
  datasets: DatasetDTO[]
  activeDatasetId: number
  /** Display-only state. Optional on read: defaults are applied if missing. */
  canvasHandler?: CanvasHandlerDTO
}

function parseMajor(version: unknown): number | null {
  if (typeof version !== 'string') return null
  const match = /^(\d+)(?:\.\d+)*/.exec(version.trim())
  if (!match) return null
  return Number(match[1])
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Validate an untrusted value as a ProjectDTO and upgrade it to the current
 * schema. Returns a new object; the input is not mutated.
 *
 * @throws DigitizerError('PROJECT_INVALID') when the shape is unusable
 * @throws DigitizerError('DTO_VERSION_UNSUPPORTED') when the major version is
 *   newer than this library understands
 */
export function migrateProject(input: unknown): ProjectDTO {
  if (!isRecord(input)) {
    throw new DigitizerError('PROJECT_INVALID', 'Project data is not an object')
  }
  const major = parseMajor(input.version)
  if (major === null) {
    throw new DigitizerError(
      'PROJECT_INVALID',
      `Project version is missing or malformed: ${String(input.version)}`,
    )
  }
  if (major > SUPPORTED_MAJOR) {
    throw new DigitizerError(
      'DTO_VERSION_UNSUPPORTED',
      `Project version ${String(
        input.version,
      )} is newer than the supported schema (${PROJECT_DTO_VERSION})`,
    )
  }
  if (!Array.isArray(input.axisSets) || !Array.isArray(input.datasets)) {
    throw new DigitizerError(
      'PROJECT_INVALID',
      'Project data must contain axisSets and datasets arrays',
    )
  }

  // INFO: major 1 and 2 share the same shape; the migration is "fill in
  // whatever an older writer may have left out" and restamp the version.
  const axisSets = input.axisSets.map(migrateAxisSet)
  const datasets = input.datasets.map(migrateDataset)

  const activeAxisSetId =
    typeof input.activeAxisSetId === 'number'
      ? input.activeAxisSetId
      : axisSets[0]?.id ?? 1
  const activeDatasetId =
    typeof input.activeDatasetId === 'number'
      ? input.activeDatasetId
      : datasets[0]?.id ?? 1

  return {
    version: PROJECT_DTO_VERSION,
    timestamp:
      typeof input.timestamp === 'string'
        ? input.timestamp
        : new Date().toISOString(),
    axisSets,
    activeAxisSetId,
    datasets,
    activeDatasetId,
    canvasHandler: migrateCanvasHandler(input.canvasHandler),
  }
}

function migrateAxisSet(raw: unknown, index: number): AxisSetDTO {
  if (!isRecord(raw)) {
    throw new DigitizerError('PROJECT_INVALID', `axisSets[${index}] is invalid`)
  }
  for (const key of ['x1', 'x2', 'y1', 'y2'] as const) {
    const axis = raw[key]
    if (!isRecord(axis) || !isRecord(axis.coord)) {
      throw new DigitizerError(
        'PROJECT_INVALID',
        `axisSets[${index}].${key} is invalid`,
      )
    }
  }
  const dto = raw as unknown as AxisSetDTO
  return {
    id: dto.id,
    name: dto.name ?? `XY Axes ${dto.id}`,
    x1: dto.x1,
    x2: dto.x2,
    y1: dto.y1,
    y2: dto.y2,
    xIsLogScale: dto.xIsLogScale ?? false,
    yIsLogScale: dto.yIsLogScale ?? false,
    considerGraphTilt: dto.considerGraphTilt ?? false,
    pointMode: dto.pointMode ?? POINT_MODE.TWO_POINTS,
    isVisible: dto.isVisible ?? true,
  }
}

function migrateDataset(raw: unknown, index: number): DatasetDTO {
  if (!isRecord(raw) || !Array.isArray(raw.points)) {
    throw new DigitizerError('PROJECT_INVALID', `datasets[${index}] is invalid`)
  }
  const dto = raw as unknown as DatasetDTO
  const migrated: DatasetDTO = {
    id: dto.id,
    name: dto.name ?? `dataset ${dto.id}`,
    axisSetId: dto.axisSetId ?? 1,
    points: dto.points,
    visiblePointIds: dto.visiblePointIds ?? [],
    manuallyAddedPointIds: dto.manuallyAddedPointIds ?? [],
  }
  if (typeof dto.externalId === 'string') {
    migrated.externalId = dto.externalId
  }
  return migrated
}

function migrateCanvasHandler(raw: unknown): CanvasHandlerDTO {
  const record = isRecord(raw) ? raw : {}
  return {
    scale: typeof record.scale === 'number' ? record.scale : 1,
    manualMode:
      typeof record.manualMode === 'number'
        ? (record.manualMode as CanvasHandlerDTO['manualMode'])
        : MANUAL_MODE.UNSET,
  }
}

/** A ProjectDTO describing the initial (empty) state. */
export function createEmptyProject(): ProjectDTO {
  return {
    version: PROJECT_DTO_VERSION,
    timestamp: new Date().toISOString(),
    axisSets: [
      {
        id: 1,
        name: 'XY Axes 1',
        x1: { name: 'x1', value: 0, coord: { xPx: -999, yPx: -999 } },
        x2: { name: 'x2', value: 1, coord: { xPx: -999, yPx: -999 } },
        y1: { name: 'y1', value: 0, coord: { xPx: -999, yPx: -999 } },
        y2: { name: 'y2', value: 1, coord: { xPx: -999, yPx: -999 } },
        xIsLogScale: false,
        yIsLogScale: false,
        considerGraphTilt: false,
        pointMode: POINT_MODE.TWO_POINTS,
        isVisible: true,
      },
    ],
    activeAxisSetId: 1,
    datasets: [
      {
        id: 1,
        name: 'dataset 1',
        axisSetId: 1,
        points: [],
        visiblePointIds: [],
        manuallyAddedPointIds: [],
      },
    ],
    activeDatasetId: 1,
    canvasHandler: { scale: 1, manualMode: MANUAL_MODE.UNSET },
  }
}
