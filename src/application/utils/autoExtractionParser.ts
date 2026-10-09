import {
  AUTO_EXTRACTION_FORMAT,
  AUTO_EXTRACTION_VERSION,
  XY,
} from '@/application/dto/autoExtractionDTO'
import { AxisScale, AxisTick } from '@/domain/services/axisTickFitter'

// INFO: Validates and normalizes an auto-extraction document (any JSON
// value) without touching application state. Pure, so it is fully covered
// by Jest. Unknown fields are ignored on purpose so producers can add
// fields without breaking older StarryDigitizer builds.

export type ParsedAxis = { scale: AxisScale; ticks: AxisTick[] }

export type ParsedSeries = {
  label: string
  pointsPx: XY[] | null
  pointsValue: XY[] | null
  scores: number[] | null
}

export type ParsedAutoExtraction = {
  image: { url: string | null; width: number | null; height: number | null }
  axes: { x: ParsedAxis; y: ParsedAxis } | null
  series: ParsedSeries[]
  source: Record<string, unknown> | null
}

export class AutoExtractionFormatError extends Error {
  readonly problems: string[]

  constructor(problems: string[]) {
    super(`Invalid auto-extraction document: ${problems.join('; ')}`)
    this.name = 'AutoExtractionFormatError'
    this.problems = problems
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

export function parseAutoExtraction(json: unknown): ParsedAutoExtraction {
  const problems: string[] = []

  if (!isObject(json)) {
    throw new AutoExtractionFormatError(['document must be a JSON object'])
  }
  if (json.format !== undefined && json.format !== AUTO_EXTRACTION_FORMAT) {
    problems.push(
      `format must be "${AUTO_EXTRACTION_FORMAT}" (got ${JSON.stringify(
        json.format,
      )})`,
    )
  }
  if (json.version !== AUTO_EXTRACTION_VERSION) {
    problems.push(
      `version must be ${AUTO_EXTRACTION_VERSION} (got ${JSON.stringify(
        json.version,
      )})`,
    )
  }

  const image = parseImage(json.image, problems)
  const axes = parseAxes(json.axes, problems)
  const series = parseSeriesList(json.series, axes !== null, problems)

  let source: Record<string, unknown> | null = null
  if (json.source !== undefined && json.source !== null) {
    if (isObject(json.source)) {
      source = json.source
    } else {
      problems.push('source must be an object or null')
    }
  }

  if (problems.length > 0) {
    throw new AutoExtractionFormatError(problems)
  }
  return { image, axes, series, source }
}

function parseImage(
  value: unknown,
  problems: string[],
): ParsedAutoExtraction['image'] {
  const empty: ParsedAutoExtraction['image'] = {
    url: null,
    width: null,
    height: null,
  }
  if (value === undefined || value === null) {
    return empty
  }
  if (typeof value === 'string') {
    return { ...empty, url: value }
  }
  if (!isObject(value)) {
    problems.push('image must be a string, an object or null')
    return empty
  }
  const result: ParsedAutoExtraction['image'] = { ...empty }
  if (value.url !== undefined && value.url !== null) {
    if (typeof value.url === 'string') {
      result.url = value.url
    } else {
      problems.push('image.url must be a string')
    }
  }
  for (const key of ['width', 'height'] as const) {
    const size = value[key]
    if (size === undefined || size === null) continue
    if (isFiniteNumber(size) && size > 0) {
      result[key] = size
    } else {
      problems.push(`image.${key} must be a positive number`)
    }
  }
  return result
}

function parseAxes(
  value: unknown,
  problems: string[],
): ParsedAutoExtraction['axes'] {
  if (value === undefined || value === null) {
    return null
  }
  if (!isObject(value)) {
    problems.push('axes must be an object or null')
    return null
  }
  const x = parseAxis(value.x, 'axes.x', problems)
  const y = parseAxis(value.y, 'axes.y', problems)
  return x && y ? { x, y } : null
}

function parseAxis(
  value: unknown,
  path: string,
  problems: string[],
): ParsedAxis | null {
  if (!isObject(value)) {
    problems.push(`${path} is required when axes is given`)
    return null
  }
  const scale = value.scale ?? 'linear'
  if (scale !== 'linear' && scale !== 'log') {
    problems.push(`${path}.scale must be "linear" or "log"`)
    return null
  }
  if (!Array.isArray(value.ticks) || value.ticks.length < 2) {
    problems.push(`${path}.ticks must be an array of at least 2 ticks`)
    return null
  }
  const ticks: AxisTick[] = []
  value.ticks.forEach((tick: unknown, i: number) => {
    if (
      !isObject(tick) ||
      !isFiniteNumber(tick.px) ||
      !isFiniteNumber(tick.value)
    ) {
      problems.push(
        `${path}.ticks[${i}] must be {"px": number, "value": number}`,
      )
      return
    }
    if (scale === 'log' && tick.value <= 0) {
      problems.push(`${path}.ticks[${i}].value must be positive on a log axis`)
      return
    }
    ticks.push({ px: tick.px, value: tick.value })
  })
  if (ticks.length !== value.ticks.length) {
    return null
  }
  if (new Set(ticks.map((t) => t.value)).size < 2) {
    problems.push(`${path}.ticks must have at least 2 distinct values`)
    return null
  }
  if (new Set(ticks.map((t) => t.px)).size < 2) {
    problems.push(`${path}.ticks must have at least 2 distinct px positions`)
    return null
  }
  return { scale, ticks }
}

function parseSeriesList(
  value: unknown,
  hasAxes: boolean,
  problems: string[],
): ParsedSeries[] {
  if (!Array.isArray(value)) {
    problems.push('series must be an array')
    return []
  }
  return value.flatMap((item: unknown, i: number) => {
    const parsed = parseSeries(item, i, hasAxes, problems)
    return parsed ? [parsed] : []
  })
}

function parseSeries(
  value: unknown,
  i: number,
  hasAxes: boolean,
  problems: string[],
): ParsedSeries | null {
  const path = `series[${i}]`
  if (!isObject(value)) {
    problems.push(`${path} must be an object`)
    return null
  }
  const before = problems.length

  let label = `series ${i + 1}`
  if (value.label !== undefined && value.label !== null) {
    if (typeof value.label === 'string') {
      label = value.label
    } else {
      problems.push(`${path}.label must be a string`)
    }
  }

  const pointsPx = parseXYList(value.points_px, `${path}.points_px`, problems)
  const pointsValue = parseXYList(
    value.points_value,
    `${path}.points_value`,
    problems,
  )
  let scores: number[] | null = null
  if (value.scores !== undefined && value.scores !== null) {
    if (
      Array.isArray(value.scores) &&
      value.scores.every((s: unknown) => isFiniteNumber(s))
    ) {
      scores = value.scores as number[]
    } else {
      problems.push(`${path}.scores must be an array of numbers`)
    }
  }

  if (problems.length > before) {
    return null
  }

  if (pointsPx === null && pointsValue === null) {
    problems.push(`${path} needs points_px or points_value`)
    return null
  }
  if (pointsPx === null && !hasAxes) {
    problems.push(
      `${path} has only points_value, which needs axes to be placed on the image`,
    )
    return null
  }
  const length = (pointsPx ?? pointsValue)?.length
  if (pointsPx && pointsValue && pointsPx.length !== pointsValue.length) {
    problems.push(`${path}.points_px and points_value differ in length`)
    return null
  }
  if (scores && scores.length !== length) {
    problems.push(`${path}.scores length differs from the number of points`)
    return null
  }

  return { label, pointsPx, pointsValue, scores }
}

function parseXYList(
  value: unknown,
  path: string,
  problems: string[],
): XY[] | null {
  if (value === undefined || value === null) {
    return null
  }
  if (!Array.isArray(value)) {
    problems.push(`${path} must be an array of [x, y] or null`)
    return null
  }
  const badIndex = value.findIndex(
    (p: unknown) =>
      !Array.isArray(p) ||
      p.length !== 2 ||
      !isFiniteNumber(p[0]) ||
      !isFiniteNumber(p[1]),
  )
  if (badIndex !== -1) {
    problems.push(`${path}[${badIndex}] must be [number, number]`)
    return null
  }
  return value.map((p: XY) => [p[0], p[1]])
}
