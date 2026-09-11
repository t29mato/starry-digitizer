/* eslint-disable jest/expect-expect */
// INFO: End-to-end "Save Project" -> real browser download -> reload ->
// "Load Project" round trip for the STANDALONE app. Everything is asserted
// through what the user can see: the axis value fields, the point markers on
// the canvas, the dataset list and the data table.

import {
  visitApp,
  resetZoom,
  calibrateTwoPoints,
  clickCanvas,
  setAxisValues,
  assertAxisValues,
  assertTableRow,
  tableRows,
  clickMenuItem,
  openMenu,
  closeMenu,
  menuItem,
  stubFilePicker,
  selectProjectFile,
  readDownloadedProject,
  datasetName,
  datasetRows,
  selectDataset,
  addDataset,
  canvasPoints,
  pointCount,
  assertSnackbar,
  assertNoSnackbar,
} from '../support/app'

// INFO: the second click of "2 Points" calibration fixes x2/y2, so ORIGIN is
// the (x1,y1) marker and OPPOSITE the (x2,y2) one. MIDPOINT is their exact
// midpoint, which therefore maps to the midpoint of the axis values whatever
// the canvas' offset inside the page is.
const ORIGIN = { x: 60, y: 380 }
const OPPOSITE = { x: 360, y: 80 }
const MIDPOINT = { x: 210, y: 230 }
const QUARTER = { x: 135, y: 305 }

describe('File menu: project ZIP round trip', () => {
  it('saves a ZIP to the downloads folder and restores every value from it', () => {
    cy.task('clearDownloads')
    visitApp({ onBeforeLoad: stubFilePicker })

    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    clickCanvas(MIDPOINT)
    clickCanvas(QUARTER)
    // INFO: names are typed without spaces on purpose — see the known issue
    // noted in cypress/support/app.ts (renameDataset).
    datasetName(0).clear().type('resistivity')
    addDataset()
    datasetName(1).clear().type('seebeck')
    // INFO: go back to the first dataset so the saved activeDatasetId, and
    // therefore the restored data table, is the one with the points.
    selectDataset(0)

    assertTableRow(0, '5', '50')
    assertTableRow(1, '2.5', '25')

    // Remember exactly where the markers sit so the restored ones can be
    // compared pixel for pixel.
    // INFO: only the geometry is compared — the active point is highlighted
    // in red and a freshly restored one is not, which is expected.
    const positions: string[] = []
    canvasPoints().each(($point) => {
      const style = ($point[0] as HTMLElement).style
      positions.push(`${style.left}/${style.top}`)
    })

    clickMenuItem('File', 'Save Project')
    assertNoSnackbar()

    readDownloadedProject()
      .then((contents) => {
        visitApp({ onBeforeLoad: stubFilePicker })
        // A fresh app has one empty dataset and no points.
        canvasPoints().should('have.length', 0)

        clickMenuItem('File', 'Load Project')
        selectProjectFile({ contents, fileName: 'project.zip' })
        // INFO: loading a project re-fits the image to the current frame — the
        // zoom is NOT part of what a project saves (canvasHandlerDTO.scale is
        // write-only), so pin it back to 100% before comparing on-canvas
        // positions that were recorded at 100%.
        resetZoom()

        // Axis values
        assertAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
        // Datasets: names, count and per-dataset point counts
        datasetRows().should('have.length', 2)
        datasetName(0).should('have.value', 'resistivity')
        datasetName(1).should('have.value', 'seebeck')
        pointCount(1).should('have.text', '2')
        pointCount(2).should('have.text', '0')
        // Points: same count and same on-canvas position as before saving
        canvasPoints().should('have.length', 2)
        canvasPoints().each(($point, index) => {
          const style = ($point[0] as HTMLElement).style
          expect(`${style.left}/${style.top}`).to.equal(positions[index])
        })
        // Data table values (rows keep the order the points were added in)
        assertTableRow(0, '5', '50')
        assertTableRow(1, '2.5', '25')
        assertNoSnackbar()
      })
  })

  it('keeps the axis calibration itself, not just the saved points', () => {
    cy.task('clearDownloads')
    visitApp({ onBeforeLoad: stubFilePicker })

    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    clickCanvas(MIDPOINT)

    clickMenuItem('File', 'Save Project')

    readDownloadedProject()
      .then((contents) => {
        visitApp({ onBeforeLoad: stubFilePicker })
        clickMenuItem('File', 'Load Project')
        selectProjectFile({ contents, fileName: 'project.zip' })
        canvasPoints().should('have.length', 1)
        // INFO: see above — the load re-fits, and QUARTER is a fixed pixel
        // coordinate that only maps to a quarter of the axis span at 100%.
        resetZoom()

        // INFO: a brand new point placed at the quarter position must be
        // calibrated by the RESTORED axis coordinates. That only yields
        // 2.5/25 if x1/x2/y1/y2 pixel coords survived the round trip.
        clickCanvas(QUARTER)
        canvasPoints().should('have.length', 2)
        assertTableRow(0, '5', '50')
        assertTableRow(1, '2.5', '25')
      })
  })

  it('loads a v1-format project ZIP (no canvasHandler, app version string)', () => {
    visitApp({ onBeforeLoad: stubFilePicker })

    clickMenuItem('File', 'Load Project')
    selectProjectFile('cypress/fixtures/project-v1.zip')

    assertNoSnackbar()
    assertAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    datasetName(0).should('have.value', 'legacy dataset')
    pointCount(1).should('have.text', '2')
    canvasPoints().should('have.length', 2)
    // The fixture's pixel points are (600,500) and (350,700) against an
    // x axis 100..1100 -> 0..10 and a y axis 900..100 -> 0..100.
    assertTableRow(0, '5', '50')
    assertTableRow(1, '2.5', '25')
  })

  it('shows the error snackbar for a project version it cannot read', () => {
    visitApp({ onBeforeLoad: stubFilePicker })

    clickMenuItem('File', 'Load Project')
    selectProjectFile('cypress/fixtures/project-unsupported-version.zip')

    assertSnackbar('is newer than the supported schema')
    // The app must be left untouched by the failed load.
    datasetRows().should('have.length', 1)
    canvasPoints().should('have.length', 0)
  })

  it('shows the error snackbar for a ZIP containing an unexpected file', () => {
    visitApp({ onBeforeLoad: stubFilePicker })

    clickMenuItem('File', 'Load Project')
    selectProjectFile('cypress/fixtures/project-unexpected-file.zip')

    assertSnackbar('Unexpected file in ZIP: notes.txt')
    datasetRows().should('have.length', 1)
    canvasPoints().should('have.length', 0)
  })

  it('offers Load Project as an enabled File menu item', () => {
    visitApp()
    openMenu('File')
    menuItem('Load Project').should('not.be.disabled')
    closeMenu()
    // The empty project still renders one placeholder table row.
    tableRows().should('have.length', 1)
  })
})
