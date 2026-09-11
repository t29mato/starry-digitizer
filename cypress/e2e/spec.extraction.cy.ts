/* eslint-disable jest/expect-expect */
// INFO: Automatic extraction and the selection-area (mask) tools. The point
// counts of the sample graph are asserted RELATIVE to an unmasked run rather
// than as magic numbers, so the specs stay meaningful if the extraction
// algorithm is ever tuned.

import {
  visitApp,
  canvasPoints,
  pointCount,
  tableRows,
  clickCanvas,
} from '../support/app'

function run() {
  cy.contains('button', 'Run').click()
}

/** Reads the active dataset's point count as a number. */
function extractedCount(): Cypress.Chainable<number> {
  return pointCount(1)
    .invoke('text')
    .then((text) => Number(text.trim()))
}

function selectAlgorithm(name: 'Line Extract' | 'Symbol Extract') {
  // INFO: the algorithm picker is a native <select> now, so the value is
  // chosen directly instead of through an overlay menu.
  cy.get('[data-cy=extract-strategy]').select(name)
  cy.get('[data-cy=extract-strategy]').should('have.value', name)
}

/**
 * The mask "Clear" button.
 *
 * INFO: scoped to the Selection Area panel — the axis panel's "Clear XY Axes"
 * button also contains "Clear" and comes first in the DOM.
 */
function maskClearButton(): Cypress.Chainable<JQuery<HTMLButtonElement>> {
  return cy
    .contains('h5', 'Selection Area')
    .parent()
    .contains('button', 'Clear')
}

function selectMaskTool(tool: 'Pen' | 'Box' | 'Eraser') {
  cy.contains('button', tool).click()
}

/**
 * Drags across the canvas, which is how both the pen and the box are drawn.
 *
 * INFO: Cypress' `.trigger()` populates neither offsetX/offsetY nor
 * clientX/clientY, so both pairs are passed explicitly and kept consistent
 * with each other: `getMouseCoordFromMouseEvent` reads clientX/clientY minus
 * the image canvas' bounding rect, and falls back to offsetX/offsetY when the
 * canvas is not attached yet. The events go to the topmost canvas (inline
 * left/top of 0) rather than to the canvas wrapper, which has no inline position.
 */
function drag(from: { x: number; y: number }, to: { x: number; y: number }) {
  const steps = 8
  cy.get('[data-cy=image-canvas]').then(($canvas) => {
    const rect = $canvas[0].getBoundingClientRect()
    const at = (i: number) => {
      const x = from.x + ((to.x - from.x) * i) / steps
      const y = from.y + ((to.y - from.y) * i) / steps
      return {
        offsetX: x,
        offsetY: y,
        clientX: rect.left + x,
        clientY: rect.top + y,
        buttons: 1,
      }
    }
    let chain = cy.get('[data-cy=interpolation-guide-canvas]').trigger('mousedown', at(0))
    for (let i = 1; i <= steps; i++) {
      chain = chain.trigger('mousemove', at(i))
    }
    chain.trigger('mouseup', { ...at(steps), buttons: 0 })
  })
}

describe('automatic extraction', () => {
  beforeEach(() => {
    visitApp()
  })

  it('extracts a curve with the default Line Extract algorithm', () => {
    pointCount(1).should('have.text', '0')

    run()

    extractedCount().should('be.greaterThan', 100)
    // The extracted points are actually drawn and listed.
    // INFO: both the canvas layer and Handsontable virtualise long lists, so
    // only "some are rendered" can be asserted here.
    canvasPoints().should('have.length.greaterThan', 0)
    tableRows().should('have.length.greaterThan', 0)
  })

  it('honours the Line Extract delta-x setting', () => {
    run()
    extractedCount().then((dense) => {
      // A wider sampling step must yield fewer points.
      cy.get('#line-extract-dx').clear().type('20')
      run()
      extractedCount().should('be.lessThan', dense)
      extractedCount().should('be.greaterThan', 0)
    })
  })

  it('extracts with the Symbol Extract algorithm', () => {
    selectAlgorithm('Symbol Extract')

    run()

    extractedCount().should('be.greaterThan', 0)
    canvasPoints().should('have.length.greaterThan', 0)
  })

  it('restricts extraction to a pen stroke', () => {
    run()
    extractedCount().then((wholeImage) => {
      selectMaskTool('Pen')
      // A long diagonal stroke across the plotted curve.
      drag({ x: 60, y: 380 }, { x: 400, y: 60 })

      run()
      extractedCount().should('be.greaterThan', 0)
      extractedCount().should('be.lessThan', wholeImage)
    })
  })

  it('restricts extraction to a box selection and clears it again', () => {
    run()
    extractedCount().then((wholeImage) => {
      selectMaskTool('Box')
      maskClearButton().should('be.disabled')
      drag({ x: 40, y: 40 }, { x: 300, y: 300 })
      maskClearButton().should('not.be.disabled')

      run()
      extractedCount().should('be.greaterThan', 0)
      extractedCount().should('be.lessThan', wholeImage)

      // Clearing the mask brings the whole image back into play.
      maskClearButton().click()
      maskClearButton().should('be.disabled')
      run()
      extractedCount().should('equal', wholeImage)
    })
  })

  it('takes area away again with the eraser', () => {
    selectMaskTool('Box')
    drag({ x: 40, y: 40 }, { x: 360, y: 360 })
    run()

    extractedCount().then((boxed) => {
      expect(boxed).to.be.greaterThan(0)

      selectMaskTool('Eraser')
      drag({ x: 50, y: 50 }, { x: 350, y: 350 })

      run()
      extractedCount().should('be.lessThan', boxed)
    })
  })

  it('replaces the previous extraction rather than appending to it', () => {
    run()
    extractedCount().then((first) => {
      run()
      extractedCount().should('equal', first)
    })
  })

  it('replaces manually added points when extraction is run', () => {
    // A manual point placed before calibration is finished sets the axes, so
    // calibrate first and then add one.
    clickCanvas({ x: 60, y: 380 })
    clickCanvas({ x: 360, y: 80 })
    clickCanvas({ x: 210, y: 230 })
    pointCount(1).should('have.text', '1')

    run()

    // INFO: extraction replaces the dataset's points wholesale.
    extractedCount().should('be.greaterThan', 1)
  })
})
