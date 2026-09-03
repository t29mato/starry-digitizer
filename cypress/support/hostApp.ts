/// <reference types="cypress" />
// INFO: Helpers shared by the cypress/e2e/host-app specs. They are plain
// functions (not Cypress.Commands) so the specs import them explicitly and
// cypress/support/e2e.ts stays untouched.

/** The two figures examples/host-app serves, with their intrinsic sizes. */
export const FIRST_IMAGE_WIDTH = 1180
export const SECOND_IMAGE_WIDTH = 845

/** Debounce of update:project / change inside <StarryDigitizer>. */
export const UPDATE_DEBOUNCE_MS = 300

/**
 * Loads the host app and waits until the digitizer has mounted and reported
 * itself ready, then pins the canvas to 100% zoom so click coordinates map
 * to image pixels 1:1.
 */
export function visitHostApp(): void {
  cy.visit('/')
  cy.get('[data-cy=ready]').should('contain.text', 'version')
  cy.get('body').trigger('keydown', { key: '0' })
  cy.get('#imageCanvas').should('have.attr', 'width', String(FIRST_IMAGE_WIDTH))
}

/**
 * Calibrates the active axis set in "2 Points" mode.
 * `origin` sets x1/y1, `corner` sets x2/y2 (see AxisSet#nextAxis).
 */
export function calibrateAxes(
  origin: [number, number] = [50, 390],
  corner: [number, number] = [400, 50],
): void {
  cy.contains('.sd-check', '2 Points').click()
  cy.get('#canvasWrapper')
    .click(origin[0], origin[1])
    .click(corner[0], corner[1])
}

/** Clicks the canvas once per coordinate, adding a data point each time. */
export function addPoints(points: [number, number][]): void {
  points.forEach(([x, y]) => {
    cy.get('#canvasWrapper').click(x, y)
  })
}

/** Types the four axis values into the axis settings fields. */
export function setAxisValues(values: {
  x1: number
  x2: number
  y1: number
  y2: number
}): void {
  ;(['x1', 'x2', 'y1', 'y2'] as const).forEach((name) => {
    cy.get(`#${name}-value`).clear().type(String(values[name]))
  })
}

/** Drops `timestamp`, which changes on every DTO snapshot. */
export function withoutTimestamp(json: string): Record<string, unknown> {
  const dto = JSON.parse(json) as Record<string, unknown>
  delete dto.timestamp
  return dto
}

/** Reads a `<pre data-cy=...>` dump back as parsed JSON. */
export function readJson<T>(dataCy: string): Cypress.Chainable<T> {
  // INFO: .invoke('text').then() is typed as `string | T` by Cypress, which
  // makes every call site union-typed; the cast pins it to T instead.
  return cy
    .get(`[data-cy=${dataCy}]`)
    .invoke('text')
    .then(
      (text) => JSON.parse(String(text)) as T,
    ) as unknown as Cypress.Chainable<T>
}

/** Reads a numeric counter element. */
export function readCount(dataCy: string): Cypress.Chainable<number> {
  return cy
    .get(`[data-cy=${dataCy}]`)
    .invoke('text')
    .then((text) => Number(text)) as unknown as Cypress.Chainable<number>
}

/** Shape of one entry in the `change` event's `datasets` payload. */
export interface DatasetValuesLike {
  id: number
  name: string
  axisSetId: number
  externalId?: string
  points: { x: number; y: number }[]
  pixelPoints: { x: number; y: number }[]
}

export interface AxisLike {
  name: string
  value: number
  coord: { xPx: number; yPx: number }
}

export interface AxisSetLike {
  id: number
  name: string
  x1: AxisLike
  x2: AxisLike
  y1: AxisLike
  y2: AxisLike
  xIsLogScale: boolean
  yIsLogScale: boolean
  pointMode: number
}

export interface ProjectLike {
  version: string
  timestamp: string
  axisSets: AxisSetLike[]
  activeAxisSetId: number
  datasets: {
    id: number
    name: string
    axisSetId: number
    externalId?: string
    points: { id: number; xPx: number; yPx: number }[]
  }[]
  activeDatasetId: number
}

/**
 * The library's linear calibration, reimplemented in the spec so the emitted
 * physical values are checked against the axis pixel coordinates rather than
 * against another call into the same library code.
 */
export function expectedLinearValue(
  axisSet: AxisSetLike,
  pixel: { x: number; y: number },
): { x: number; y: number } {
  const x =
    axisSet.x1.value +
    ((pixel.x - axisSet.x1.coord.xPx) /
      (axisSet.x2.coord.xPx - axisSet.x1.coord.xPx)) *
      (axisSet.x2.value - axisSet.x1.value)
  const y =
    axisSet.y1.value +
    ((pixel.y - axisSet.y1.coord.yPx) /
      (axisSet.y2.coord.yPx - axisSet.y1.coord.yPx)) *
      (axisSet.y2.value - axisSet.y1.value)
  return { x, y }
}
