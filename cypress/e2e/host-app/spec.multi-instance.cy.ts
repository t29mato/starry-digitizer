// INFO: Two <StarryDigitizer> instances on one page. This is what the
// "canvases are handed to the engine instead of looked up by id" refactor
// buys: before it, every instance resolved document.getElementById('...') to
// the FIRST instance's canvases, so the second one drew nothing.
//
// The last spec here pins the one thing that is still shared: the
// document-level keydown listener in CanvasMain.vue. Keep it in sync with the
// "Known limitations" sections of README.md and docs/embedding.rst.

import {
  FIRST_IMAGE_WIDTH,
  SECOND_IMAGE_WIDTH,
  visitHostApp,
} from '../../support/hostApp'

const FIRST = '[data-cy=digitizer-1]'
const SECOND = '[data-cy=digitizer-2]'

/**
 * Calibrates one instance's axis set. `pointMode` already defaults to
 * "2 Points", so this deliberately does not touch the radio group — that
 * keeps the spec independent of how the settings UI is built.
 */
function calibrateIn(
  scope: string,
  origin: [number, number],
  corner: [number, number],
): void {
  cy.get(`${scope} [data-cy=canvas-wrapper]`)
    .click(origin[0], origin[1])
    .click(corner[0], corner[1])
}

function addPointsIn(scope: string, points: [number, number][]): void {
  points.forEach(([x, y]) => {
    cy.get(`${scope} [data-cy=canvas-wrapper]`).click(x, y)
  })
}

/** The magnifier's "x: …, y: …" readout of one instance. */
function magnifierReadout(scope: string): Cypress.Chainable<string> {
  return cy
    .get(`${scope} .c__magnifier > span`)
    .invoke('text')
    .then((text) => String(text)) as unknown as Cypress.Chainable<string>
}

describe('host app: two digitizers on one page', () => {
  beforeEach(() => {
    // INFO: visit and pin the zoom while only one instance exists, so the
    // shared helpers' unscoped `[data-cy=image-canvas]` selector stays unambiguous.
    visitHostApp()
    cy.get('[data-cy=mount-second]').click()
    cy.get('[data-cy=mount-second]').should(
      'contain.text',
      'second digitizer: on',
    )
    // INFO: '0' is "original size" — it reaches both instances (see the
    // known-limitation spec below), which is exactly what we want here.
    // INFO: force, because with two digitizers stacked the page is taller
    // than the viewport and <body>'s center is covered.
    cy.get('body').trigger('keydown', { key: '0', force: true })
    cy.get(`${SECOND} [data-cy=image-canvas]`).should(
      'have.attr',
      'width',
      String(SECOND_IMAGE_WIDTH),
    )
  })

  it('draws each instance into its own canvases', () => {
    cy.get(`${FIRST} [data-cy=image-canvas]`).should(
      'have.attr',
      'width',
      String(FIRST_IMAGE_WIDTH),
    )
    cy.get(`${SECOND} [data-cy=image-canvas]`).should(
      'have.attr',
      'width',
      String(SECOND_IMAGE_WIDTH),
    )
  })

  it('gives each instance its own magnifier', () => {
    // INFO: canvasHandler.resize() sizes the magnifier mask canvas together
    // with the image canvas, so a per-instance width proves the magnifier is
    // wired to its own canvasHandler and not to the first instance's.
    cy.get(`${FIRST} #magnifierMaskCanvas`).should(
      'have.attr',
      'width',
      String(FIRST_IMAGE_WIDTH),
    )
    cy.get(`${SECOND} #magnifierMaskCanvas`).should(
      'have.attr',
      'width',
      String(SECOND_IMAGE_WIDTH),
    )

    magnifierReadout(FIRST).then((firstBefore) => {
      magnifierReadout(SECOND).then((secondBefore) => {
        cy.get(`${SECOND} [data-cy=canvas-wrapper]`).trigger('mousemove', 137, 211)

        // INFO: only the hovered instance's magnifier tracks the cursor.
        magnifierReadout(SECOND).should('not.equal', secondBefore)
        magnifierReadout(FIRST).should('equal', firstBefore)
      })
    })
  })

  it('adds points to the instance that was clicked only', () => {
    calibrateIn(FIRST, [50, 390], [400, 50])
    addPointsIn(FIRST, [
      [200, 200],
      [250, 150],
    ])

    cy.get(`${FIRST} .canvas-point`).should('have.length', 2)
    cy.get(`${SECOND} .canvas-point`).should('have.length', 0)

    calibrateIn(SECOND, [40, 300], [300, 40])
    addPointsIn(SECOND, [
      [120, 160],
      [150, 140],
      [180, 120],
    ])

    cy.get(`${FIRST} .canvas-point`).should('have.length', 2)
    cy.get(`${SECOND} .canvas-point`).should('have.length', 3)
    cy.get(`${FIRST} .dataset-count-1`).should('contain.text', '2')
    cy.get(`${SECOND} .dataset-count-1`).should('contain.text', '3')
  })

  it('KNOWN LIMITATION: document-level keyboard shortcuts reach every instance', () => {
    calibrateIn(FIRST, [50, 390], [400, 50])
    addPointsIn(FIRST, [[200, 200]])
    calibrateIn(SECOND, [40, 300], [300, 40])
    addPointsIn(SECOND, [[120, 160]])

    // INFO: CanvasMain.vue listens on `document`, so every mounted instance
    // handles the same keypress. Here that means both zoom out together.
    cy.get('body').trigger('keydown', { key: '-', force: true })

    cy.get(`${FIRST} [data-cy=image-canvas]`)
      .invoke('attr', 'width')
      .then((width) => expect(Number(width)).to.be.lessThan(FIRST_IMAGE_WIDTH))
    cy.get(`${SECOND} [data-cy=image-canvas]`)
      .invoke('attr', 'width')
      .then((width) => expect(Number(width)).to.be.lessThan(SECOND_IMAGE_WIDTH))
  })

  // INFO: radio inputs with the same `name` are ONE group per document, so a
  // hard-coded name made the two instances share their calibration mode:
  // picking "4 Points" in one cleared the other's selection. Reported by an
  // embedding host that put three axis panels on a page.
  it('keeps each instance\'s calibration-mode radios in their own group', () => {
    cy.get(`${FIRST} [data-cy=calibration-mode] input[type=radio]`)
      .first()
      .invoke('attr', 'name')
      .then((firstName) => {
        expect(firstName).to.be.a('string').and.not.be.empty

        cy.get(`${SECOND} [data-cy=calibration-mode] input[type=radio]`)
          .first()
          .invoke('attr', 'name')
          .should('not.equal', firstName)
      })

    cy.get(`${FIRST} [data-cy=calibration-mode-4]`).check({ force: true })
    cy.get(`${SECOND} [data-cy=calibration-mode-2]`).should('be.checked')
    cy.get(`${FIRST} [data-cy=calibration-mode-4]`).should('be.checked')
  })
})
