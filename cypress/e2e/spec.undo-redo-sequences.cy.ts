/* eslint-disable jest/expect-expect */
// INFO: Undo/redo takes a snapshot of the axis sets and the datasets, so a
// sequence that mixes calibration clicks, point clicks and dataset deletion is
// where it can actually go wrong. spec.undo-redo.cy.ts covers the single-step
// case; this one covers multi-step sequences and the Edit menu's own state.

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
  datasetAction,
  selectDataset,
  undo,
  redo,
  assertEditMenu,
  tableRows,
} from '../support/app'

const ORIGIN = { x: 60, y: 380 }
const OPPOSITE = { x: 360, y: 80 }
const MIDPOINT = { x: 210, y: 230 }
const QUARTER = { x: 135, y: 305 }

describe('undo/redo sequences', () => {
  beforeEach(() => {
    visitApp()
  })

  it('walks a whole calibrate-then-plot session backwards and forwards', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    clickCanvas(MIDPOINT)
    clickCanvas(QUARTER)

    canvasPoints().should('have.length', 2)
    assertTableRow(0, '5', '50')
    assertTableRow(1, '2.5', '25')

    // Two point clicks back out one at a time...
    undo()
    canvasPoints().should('have.length', 1)
    assertTableRow(0, '5', '50')

    undo()
    canvasPoints().should('have.length', 0)
    // ...and the calibration is still in place at this point.
    cy.contains('button', 'Clear XY Axes').should('not.be.disabled')

    // Two more undos peel off the two calibration clicks.
    undo(2)
    cy.contains('button', 'Clear XY Axes').should('be.disabled')
    assertEditMenu({ undo: 'disabled', redo: 'enabled' })

    // Redoing everything restores the axis values that were typed in
    // between the calibration clicks and the point clicks.
    redo(4)
    canvasPoints().should('have.length', 2)
    assertTableRow(0, '5', '50')
    assertTableRow(1, '2.5', '25')
    assertEditMenu({ undo: 'enabled', redo: 'disabled' })
  })

  it('brings a deleted dataset back with its points', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    clickCanvas(MIDPOINT)

    addDataset()
    clickCanvas(QUARTER)
    datasetRows().should('have.length', 2)
    pointCount(1).should('have.text', '1')
    pointCount(2).should('have.text', '1')

    cy.on('window:confirm', () => true)
    datasetAction(0, 'delete')
    datasetRows().should('have.length', 1)
    datasetName(0).should('have.value', 'dataset 2')

    undo()

    datasetRows().should('have.length', 2)
    datasetName(0).should('have.value', 'dataset 1')
    pointCount(1).should('have.text', '1')
    pointCount(2).should('have.text', '1')

    // And the restored dataset still calibrates correctly.
    selectDataset(0)
    assertTableRow(0, '5', '50')
  })

  it('undoes clearing a dataset’s points', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    clickCanvas(MIDPOINT)
    clickCanvas(QUARTER)
    pointCount(1).should('have.text', '2')

    datasetAction(0, 'clear')
    pointCount(1).should('have.text', '0')

    undo()
    pointCount(1).should('have.text', '2')
    tableRows().should('have.length', 2)
    assertTableRow(0, '5', '50')
  })

  it('undoes adding a dataset', () => {
    addDataset()
    datasetRows().should('have.length', 2)

    undo()
    datasetRows().should('have.length', 1)

    redo()
    datasetRows().should('have.length', 2)
  })

  it('starts with both Edit menu entries disabled and tracks the stacks', () => {
    assertEditMenu({ undo: 'disabled', redo: 'disabled' })

    calibrateTwoPoints(ORIGIN, OPPOSITE)
    assertEditMenu({ undo: 'enabled', redo: 'disabled' })

    undo()
    assertEditMenu({ undo: 'enabled', redo: 'enabled' })

    undo()
    assertEditMenu({ undo: 'disabled', redo: 'enabled' })

    redo(2)
    assertEditMenu({ undo: 'enabled', redo: 'disabled' })
  })

  it('drops the redo stack once a new edit is made', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    clickCanvas(MIDPOINT)
    canvasPoints().should('have.length', 1)

    undo()
    canvasPoints().should('have.length', 0)
    assertEditMenu({ undo: 'enabled', redo: 'enabled' })

    // A fresh point instead of a redo invalidates what was undone.
    clickCanvas(QUARTER)
    canvasPoints().should('have.length', 1)
    assertEditMenu({ undo: 'enabled', redo: 'disabled' })
    assertTableRow(0, '2.5', '25')
  })
})
