/* eslint-disable jest/expect-expect */
// INFO: The data table is plain read-only markup now (Handsontable is gone),
// so these specs assert the values the digitizer COMPUTES for clicked points
// rather than typing into cells — the old in-cell edits never reached the
// dataset anyway.

import {
  visitApp,
  calibrateTwoPoints,
  setAxisValues,
  clickCanvas,
  tableRows,
  assertTableRow,
  canvasPoints,
  stubClipboard,
  assertClipboard,
} from '../support/app'

const ORIGIN = { x: 60, y: 380 }
const OPPOSITE = { x: 360, y: 80 }
const MIDPOINT = { x: 210, y: 230 }
const QUARTER = { x: 135, y: 305 }

/** Calibrates 0-10 on x and 0-100 on y. */
function calibrate(): void {
  calibrateTwoPoints(ORIGIN, OPPOSITE)
  setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
}

function headers(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('[data-cy=data-table] thead th')
}

describe('data table', () => {
  it('shows X / Y headers and a single blank row for an empty dataset', () => {
    visitApp()

    headers().should('have.length', 2)
    headers().eq(0).should('contain.text', 'X')
    headers().eq(1).should('contain.text', 'Y')

    tableRows().should('have.length', 1)
    assertTableRow(0, '', '')
  })

  it('shows the calibrated value of every point that is added', () => {
    visitApp()
    calibrate()

    clickCanvas(MIDPOINT)
    canvasPoints().should('have.length', 1)
    tableRows().should('have.length', 1)
    assertTableRow(0, '5', '50')

    clickCanvas(QUARTER)
    canvasPoints().should('have.length', 2)
    tableRows().should('have.length', 2)
    assertTableRow(0, '5', '50')
    assertTableRow(1, '2.5', '25')
  })

  it('sorts on a column header without touching the dataset', () => {
    visitApp()
    calibrate()
    clickCanvas(MIDPOINT)
    clickCanvas(QUARTER)

    // Insertion order: 5 then 2.5.
    assertTableRow(0, '5', '50')

    headers().eq(0).click()
    headers().eq(0).should('contain.text', '▲')
    assertTableRow(0, '2.5', '25')
    assertTableRow(1, '5', '50')

    // A second click on the same header flips the direction.
    headers().eq(0).click()
    headers().eq(0).should('contain.text', '▼')
    assertTableRow(0, '5', '50')
    assertTableRow(1, '2.5', '25')

    // Sorting is view-only: the points on the canvas are untouched.
    canvasPoints().should('have.length', 2)

    // Sorting on Y moves the indicator to the Y header.
    headers().eq(1).click()
    headers().eq(0).should('not.contain.text', '▲')
    headers().eq(1).should('contain.text', '▲')
    assertTableRow(0, '2.5', '25')
  })

  it('copies the rows in the displayed order', () => {
    visitApp({ onBeforeLoad: stubClipboard })
    calibrate()
    clickCanvas(MIDPOINT)
    clickCanvas(QUARTER)

    cy.contains('button', 'Copy to Clipboard').click()
    assertClipboard('5e+0,5e+1\n2.5e+0,2.5e+1')

    // Ascending on X reverses what gets copied.
    headers().eq(0).click()
    cy.contains('button', 'Copy to Clipboard').click()
    assertClipboard('2.5e+0,2.5e+1\n5e+0,5e+1')
  })
})
