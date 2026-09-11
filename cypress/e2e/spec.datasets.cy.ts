/* eslint-disable jest/expect-expect */
// INFO: The dataset list is the app's main workspace control: add, rename,
// switch, clear and delete, plus the two CSV exports (per-dataset icon and
// the File menu). Clipboard writes are stubbed so the assertion is on the
// exact CSV text rather than on clipboard read permissions.

import {
  visitApp,
  calibrateTwoPoints,
  clickCanvas,
  setAxisValues,
  assertTableRow,
  tableRows,
  clickMenuItem,
  openMenu,
  closeMenu,
  datasetName,
  datasetRows,
  datasetAction,
  addDataset,
  removeAllDatasets,
  viewAllDatasets,
  selectDataset,
  canvasPoints,
  pointCount,
  stubClipboard,
  assertClipboard,
} from '../support/app'

const ORIGIN = { x: 60, y: 380 }
const OPPOSITE = { x: 360, y: 80 }
const MIDPOINT = { x: 210, y: 230 }
const QUARTER = { x: 135, y: 305 }

/** Calibrates 0..10 / 0..100 so MIDPOINT is 5/50 and QUARTER is 2.5/25. */
function calibrate() {
  calibrateTwoPoints(ORIGIN, OPPOSITE)
  setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
}

describe('datasets', () => {
  it('adds, renames and switches datasets', () => {
    visitApp()
    calibrate()

    datasetRows().should('have.length', 1)
    datasetName(0).should('have.value', 'dataset 1')
    datasetName(0).clear().type('resistivity')

    addDataset()
    datasetRows().should('have.length', 2)
    datasetName(1).clear().type('seebeck')
    cy.contains('.c__current-dataset-and-axis', 'seebeck')

    // Points land in whichever dataset is active.
    clickCanvas(MIDPOINT)
    pointCount(1).should('have.text', '0')
    pointCount(2).should('have.text', '1')

    selectDataset(0)
    cy.contains('.c__current-dataset-and-axis', 'resistivity')
    clickCanvas(QUARTER)
    pointCount(1).should('have.text', '1')
    pointCount(2).should('have.text', '1')
    assertTableRow(0, '2.5', '25')
  })

  it('keeps spaces typed into a dataset or axis-set name', () => {
    // INFO: regression guard. The old `<v-list-item link>` wrapper treated the
    // space key as an "activate" gesture and swallowed it, so a name could
    // never contain a space. The plain clickable div that replaced it has no
    // keydown handler, and CanvasMain's global shortcuts skip INPUT targets.
    visitApp()

    datasetName(0).clear().type('probe set')
    datasetName(0).should('have.value', 'probe set')
    cy.contains('.c__current-dataset-and-axis', 'probe set')

    cy.get('.c__axisSet-item').eq(0).find('input').clear().type('probe set')
    cy.get('.c__axisSet-item')
      .eq(0)
      .find('input')
      .should('have.value', 'probe set')
  })

  it('clears the points of one dataset without deleting it', () => {
    visitApp()
    calibrate()
    clickCanvas(MIDPOINT)
    clickCanvas(QUARTER)
    pointCount(1).should('have.text', '2')

    datasetAction(0, 'clear')

    pointCount(1).should('have.text', '0')
    datasetRows().should('have.length', 1)
    canvasPoints().should('have.length', 0)
    // The empty dataset still renders one placeholder row.
    tableRows().should('have.length', 1)
    assertTableRow(0, '', '')
  })

  it('asks before deleting a dataset that has points and honours Cancel', () => {
    visitApp()
    calibrate()
    clickCanvas(MIDPOINT)
    addDataset()
    datasetRows().should('have.length', 2)

    cy.on('window:confirm', () => false)
    datasetAction(0, 'delete')
    datasetRows().should('have.length', 2)
    pointCount(1).should('have.text', '1')
  })

  it('deletes a dataset once the confirmation is accepted', () => {
    visitApp()
    calibrate()
    clickCanvas(MIDPOINT)
    addDataset()
    datasetRows().should('have.length', 2)

    cy.on('window:confirm', () => true)
    datasetAction(0, 'delete')
    datasetRows().should('have.length', 1)
    datasetName(0).should('have.value', 'dataset 2')
  })

  it('never lets the last remaining dataset be deleted', () => {
    visitApp()
    datasetRows().should('have.length', 1)
    datasetRows().eq(0).find('[data-cy=dataset-delete]').should('be.disabled')
  })

  it('removes every dataset at once and starts a fresh one', () => {
    visitApp()
    calibrate()
    clickCanvas(MIDPOINT)
    addDataset()
    clickCanvas(QUARTER)
    datasetRows().should('have.length', 2)

    cy.on('window:confirm', () => true)
    removeAllDatasets()

    // INFO: the repository always keeps one dataset to draw into.
    datasetRows().should('have.length', 1)
    canvasPoints().should('have.length', 0)
  })

  it('is read-only in View All mode and shows every dataset at once', () => {
    visitApp()
    calibrate()
    clickCanvas(MIDPOINT)
    addDataset()
    clickCanvas(QUARTER)
    canvasPoints().should('have.length', 1)

    viewAllDatasets()

    cy.contains('.c__current-dataset-and-axis', 'All Datasets (View Only)')
    // Both datasets' points are drawn together...
    canvasPoints().should('have.length', 2)
    // ...editing is switched off...
    cy.contains('Disabled in View All mode').should('be.visible')
    cy.contains('button', 'Run').should('be.disabled')
    cy.get('#switch-interpolation').should('be.disabled')
    // ...and clicking the canvas adds nothing.
    clickCanvas({ x: 300, y: 300 })
    canvasPoints().should('have.length', 2)
    pointCount(1).should('have.text', '1')
    pointCount(2).should('have.text', '1')
  })

  it('copies one dataset to the clipboard from its row icon', () => {
    visitApp({ onBeforeLoad: stubClipboard })
    calibrate()
    clickCanvas(MIDPOINT)
    clickCanvas(QUARTER)

    datasetAction(0, 'copy')

    assertClipboard('5e+0,5e+1\n2.5e+0,2.5e+1')
  })

  it('disables the copy icon for a dataset with no points', () => {
    visitApp({ onBeforeLoad: stubClipboard })
    addDataset()
    datasetRows().eq(1).find('[data-cy=dataset-copy]').should('be.disabled')
  })

  it('copies the active dataset from File > Copy Data to Clipboard', () => {
    visitApp({ onBeforeLoad: stubClipboard })
    calibrate()
    clickCanvas(MIDPOINT)

    clickMenuItem('File', 'Copy Data to Clipboard')

    assertClipboard('5e+0,5e+1')
  })

  it('copies the visible table with the Copy to Clipboard button', () => {
    visitApp({ onBeforeLoad: stubClipboard })
    calibrate()
    clickCanvas(QUARTER)

    cy.contains('button', 'Copy to Clipboard').click()

    assertClipboard('2.5e+0,2.5e+1')
  })

  it('copies each dataset with its own axis calibration', () => {
    visitApp({ onBeforeLoad: stubClipboard })
    calibrate()
    clickCanvas(MIDPOINT)

    addDataset()
    // A second axis set, bound to the second dataset, with a x10 range.
    cy.get('[data-cy=add-axis-set]').click()
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '100', y1: '0', y2: '1000' })
    clickCanvas(MIDPOINT)

    // INFO: the row icon must calibrate with the ROW's axis set, even though
    // the second axis set is the active one right now.
    datasetAction(0, 'copy')
    assertClipboard('5e+0,5e+1')

    datasetAction(1, 'copy')
    assertClipboard('5e+1,5e+2')
  })

  it('hides Undo/Redo state changes behind the Edit menu only', () => {
    // INFO: guards the menu bar itself: opening a menu must not disturb the
    // canvas or the dataset list.
    visitApp()
    calibrate()
    clickCanvas(MIDPOINT)

    openMenu('Edit')
    closeMenu()

    canvasPoints().should('have.length', 1)
    datasetRows().should('have.length', 1)
  })
})
