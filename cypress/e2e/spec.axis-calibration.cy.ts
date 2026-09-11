/* eslint-disable jest/expect-expect */
// INFO: The axis calibration is what turns clicks into numbers, so every
// assertion here is on the value the DATA TABLE shows for a point whose pixel
// position is an exact linear combination of the axis markers. That makes the
// expected number independent of where the canvas happens to sit on the page.

import {
  visitApp,
  calibrateTwoPoints,
  calibrateFourPoints,
  selectCalibrationMode,
  clickCanvas,
  setAxisValues,
  setLogScale,
  assertTableRow,
  canvasPoints,
  addDataset,
  addAxisSet,
  axisSetRows,
  selectAxisSet,
  selectDataset,
  datasetRows,
} from '../support/app'

const ORIGIN = { x: 60, y: 380 }
const OPPOSITE = { x: 360, y: 80 }
const MIDPOINT = { x: 210, y: 230 }
const QUARTER = { x: 135, y: 305 }

describe('axis calibration', () => {
  beforeEach(() => {
    visitApp()
  })

  it('calibrates in 2 Points mode and converts pixels to values', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })

    clickCanvas(MIDPOINT)
    clickCanvas(QUARTER)

    canvasPoints().should('have.length', 2)
    assertTableRow(0, '5', '50')
    assertTableRow(1, '2.5', '25')
  })

  it('calibrates in 4 Points mode with x and y markers set independently', () => {
    // x1/x2 on one horizontal line, y1/y2 on a vertical one.
    calibrateFourPoints(
      { x: 60, y: 380 },
      { x: 360, y: 380 },
      { x: 160, y: 380 },
      { x: 160, y: 80 },
    )
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })

    clickCanvas(MIDPOINT)
    canvasPoints().should('have.length', 1)
    assertTableRow(0, '5', '50')
  })

  it('locks the calibration mode once a marker has been placed', () => {
    // INFO: switching modes half way through would leave the axis set in a
    // state neither mode can finish, so the other radio is disabled.
    clickCanvas(ORIGIN)
    cy.contains('.sd-check', '4 Points')
      .find('input')
      .should('be.disabled')
  })

  it('reads a logarithmic x axis', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '1', x2: '100', y1: '0', y2: '100' })
    setLogScale('x')

    clickCanvas(MIDPOINT)
    // Halfway along a decade axis 1..100 is 10, halfway up a linear 0..100
    // axis is 50.
    assertTableRow(0, '10', '50')
  })

  it('reads a logarithmic y axis', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '1', y2: '10000' })
    setLogScale('y')

    clickCanvas(MIDPOINT)
    assertTableRow(0, '5', '100')
  })

  it('reads both axes logarithmically at once', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '1', x2: '100', y1: '1', y2: '10000' })
    setLogScale('x')
    setLogScale('y')

    clickCanvas(MIDPOINT)
    clickCanvas(QUARTER)
    assertTableRow(0, '10', '100')
    // A quarter of the way along 1..100 in log space is 10^0.5 = 3.162,
    // and a quarter up 1..10000 is 10^1 = 10.
    assertTableRow(1, '3.1623', '10')
  })

  it('warns instead of calculating when x1 and x2 have the same value', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '5', x2: '5', y1: '0', y2: '100' })
    cy.contains('x1 and x2 should not be same value').should('be.visible')
  })

  it('clears the axis markers with "Clear XY Axes"', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    clickCanvas(MIDPOINT)
    canvasPoints().should('have.length', 1)
    assertTableRow(0, '5', '50')

    cy.contains('button', 'Clear XY Axes').click()

    // The buttons that need an axis go back to disabled...
    cy.contains('button', 'Clear XY Axes').should('be.disabled')
    cy.contains('button', 'Edit Axes').should('be.disabled')
    // ...the point is kept but can no longer be calibrated...
    canvasPoints().should('have.length', 1)
    assertTableRow(0, 'NaN', 'NaN')
    // ...and the next clicks start a fresh calibration rather than adding
    // more points.
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    canvasPoints().should('have.length', 1)
    assertTableRow(0, '5', '50')
  })

  it('calibrates a second axis set and applies it to the dataset bound to it', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    clickCanvas(MIDPOINT)
    assertTableRow(0, '5', '50')

    // A second dataset, then a second axis set while that dataset is active:
    // the new axis set is what the new dataset is bound to.
    addDataset()
    datasetRows().should('have.length', 2)
    addAxisSet()
    axisSetRows().should('have.length', 2)
    cy.contains('.c__current-dataset-and-axis', 'XY Axes 2')

    // Same pixels, ten times the x range.
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '100', y1: '0', y2: '1000' })
    clickCanvas(MIDPOINT)
    assertTableRow(0, '50', '500')

    // Going back to the first dataset restores its own calibration.
    selectDataset(0)
    cy.contains('.c__current-dataset-and-axis', 'XY Axes 1')
    assertTableRow(0, '5', '50')
  })

  it('switches the active axis set from the XY Axes list', () => {
    addAxisSet()
    axisSetRows().should('have.length', 2)
    cy.contains('.c__current-dataset-and-axis', 'XY Axes 2')

    selectAxisSet(0)
    cy.contains('.c__current-dataset-and-axis', 'XY Axes 1')

    selectAxisSet(1)
    cy.contains('.c__current-dataset-and-axis', 'XY Axes 2')
  })

  it('renames an axis set and shows the new name in the canvas header', () => {
    // INFO: spaces are typed on purpose. The Vuetify list item that used to
    // wrap this field swallowed the space key; the plain div that replaced it
    // does not, and spec.datasets.cy.ts guards that directly.
    axisSetRows().eq(0).find('input').clear().type('temperature axes')
    cy.contains('.c__current-dataset-and-axis', 'temperature axes')

    addAxisSet()
    axisSetRows().eq(1).find('input').clear().type('pressure axes')
    cy.contains('.c__current-dataset-and-axis', 'pressure axes')

    selectAxisSet(0)
    cy.contains('.c__current-dataset-and-axis', 'temperature axes')
  })

  it('keeps 4 Points mode selectable on a brand new axis set', () => {
    selectCalibrationMode('4 Points')
    cy.contains('.sd-check', '4 Points').find('input').should('be.checked')
    cy.contains('.sd-check', '2 Points').find('input').should('not.be.checked')
  })
})
