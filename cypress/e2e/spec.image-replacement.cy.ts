/* eslint-disable jest/expect-expect */
// INFO: Loading a new graph image throws away the axis calibration and every
// dataset, so the app asks first. These specs cover both answers and the
// rejected-file path, which must surface in the snackbar rather than in a
// native alert().

import {
  visitApp,
  calibrateTwoPoints,
  clickCanvas,
  setAxisValues,
  assertTableRow,
  canvasPoints,
  datasetRows,
  datasetName,
  pointCount,
  addDataset,
  assertSnackbar,
  assertNoSnackbar,
  resetZoom,
} from '../support/app'

const ORIGIN = { x: 60, y: 380 }
const OPPOSITE = { x: 360, y: 80 }
const MIDPOINT = { x: 210, y: 230 }

// The app boots with public/sample_graph_curve.png (1180x980); the fixture
// used for replacement is 845x560.
const REPLACEMENT = 'cypress/fixtures/sample_graph_curve_2.png'
const REPLACEMENT_WIDTH = 845

function uploadImage(path: string) {
  cy.get('[data-cy=image-file-input]').selectFile(path, { force: true })
}

function assertCanvasWidth(width: number) {
  cy.get('[data-cy=image-canvas]').should(($canvas) => {
    expect(($canvas[0] as HTMLCanvasElement).width).to.equal(width)
  })
}

function setUpWork() {
  calibrateTwoPoints(ORIGIN, OPPOSITE)
  setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
  clickCanvas(MIDPOINT)
  assertTableRow(0, '5', '50')
}

describe('image replacement', () => {
  it('replaces the image without asking when there is nothing to lose', () => {
    visitApp()

    uploadImage(REPLACEMENT)

    resetZoom(REPLACEMENT_WIDTH)
    assertCanvasWidth(REPLACEMENT_WIDTH)
    assertNoSnackbar()
  })

  it('asks before discarding existing work and resets everything on OK', () => {
    visitApp()
    setUpWork()
    addDataset()
    datasetRows().should('have.length', 2)

    const confirms: string[] = []
    cy.on('window:confirm', (message) => {
      confirms.push(message)
      return true
    })

    uploadImage(REPLACEMENT)

    cy.wrap(confirms).should((messages) => {
      expect(messages).to.have.length(1)
      expect(messages[0]).to.contain('reset all axis coordinates and datasets')
    })

    resetZoom(REPLACEMENT_WIDTH)
    assertCanvasWidth(REPLACEMENT_WIDTH)
    // Axis markers, points and the extra dataset are all gone.
    canvasPoints().should('have.length', 0)
    datasetRows().should('have.length', 1)
    datasetName(0).should('have.value', 'dataset 1')
    cy.contains('button', 'Clear XY Axes').should('be.disabled')
    assertNoSnackbar()
  })

  it('keeps the image and the work when the confirmation is cancelled', () => {
    visitApp()
    setUpWork()

    cy.on('window:confirm', () => false)

    uploadImage(REPLACEMENT)

    // Still the original image and the original state.
    assertCanvasWidth(1180)
    canvasPoints().should('have.length', 1)
    pointCount(1).should('have.text', '1')
    assertTableRow(0, '5', '50')
    cy.contains('button', 'Clear XY Axes').should('not.be.disabled')
    assertNoSnackbar()
  })

  it('reports an unsupported file type in the snackbar and keeps the work', () => {
    visitApp()
    setUpWork()

    // INFO: a native alert() would hang the run; assert none is raised.
    const alerts: string[] = []
    cy.on('window:alert', (message) => {
      alerts.push(message)
    })

    uploadImage('cypress/fixtures/example.json')

    assertSnackbar('Please use an image in one of the following formats')
    cy.wrap(alerts).should('have.length', 0)

    // The rejected file must not have touched the canvas or the data.
    assertCanvasWidth(1180)
    canvasPoints().should('have.length', 1)
    assertTableRow(0, '5', '50')
  })

  it('still asks for confirmation before rejecting an unsupported file', () => {
    visitApp()
    setUpWork()

    const confirms: string[] = []
    cy.on('window:confirm', (message) => {
      confirms.push(message)
      return true
    })

    uploadImage('cypress/fixtures/example.json')

    assertSnackbar('Please use an image in one of the following formats')
    // NOTE: the confirmation comes first in ImageSettings.updateImage, so a
    // rejected file does prompt. This spec records the current behaviour.
    cy.wrap(confirms).should('have.length', 1)
    canvasPoints().should('have.length', 1)
  })
})
