/* eslint-disable jest/expect-expect */
// INFO: The invariant behind a whole class of bugs: the image is drawn at
// `canvasHandler.scale`, and so is everything overlaid on it (the point
// markers, the axis markers and the interpolation guide). Whenever the two
// drift apart the image looks right and the overlay sits somewhere else — the
// further off, the smaller the viewport.
//
// The interpolation guide canvas is the only window onto `scale` that does not
// need Vue internals: Interpolator.resizeCanvas() sizes it to
// `originalWidth * canvasHandler.scale`, so its DOM width divided by the
// image's natural width IS the scale the overlays use. The image canvas'
// width divided by the same natural width is the scale the image was really
// drawn at. They must agree.

import {
  visitApp,
  clickMenuItem,
  stubFilePicker,
  selectProjectFile,
  readDownloadedProject,
  calibrateTwoPoints,
  setAxisValues,
  assertAxisValues,
  assertTableRow,
  clickCanvas,
  assertNoSnackbar,
  pressKey,
} from '../support/app'

// INFO: the sample graph the standalone app boots with, and also the image
// inside cypress/fixtures/project-v1.zip. Same value `resetZoom` uses as its
// "100% zoom" width in cypress/support/app.ts.
const NATURAL_WIDTH = 1180

// INFO: |overlayScale - imageScale| / imageScale has to stay below this. The
// two canvases are sized by separate calls (CanvasHandler.resize and
// InterpolatorCanvas.resize), each of which truncates to an integer pixel
// count, so an exact equality would be brittle; 0.5% is far tighter than any
// real mismatch (the bug this guards produced ~75%).
const TOLERANCE = 0.005

const ORIGIN = { x: 60, y: 380 }
const OPPOSITE = { x: 360, y: 80 }
const MIDPOINT = { x: 210, y: 230 }

/** The canvas frame is really laid out — a 0x0 frame makes the check vacuous. */
function assertCanvasFrameIsLaidOut(): void {
  cy.get('[data-cy=canvas-wrapper]').should(($wrapper) => {
    const wrapper = $wrapper[0] as HTMLElement
    expect(wrapper.offsetWidth, 'canvas wrapper offsetWidth').to.be.greaterThan(
      0,
    )
    expect(
      wrapper.offsetHeight,
      'canvas wrapper offsetHeight',
    ).to.be.greaterThan(0)
  })
}

/**
 * The invariant itself. `naturalWidth` is the intrinsic width of the image on
 * screen; it cancels out of the ratio, but keeping it explicit makes both
 * sides read as the scales they are.
 */
function assertOverlayScaleMatchesImageScale(naturalWidth = NATURAL_WIDTH) {
  assertCanvasFrameIsLaidOut()

  cy.get('[data-cy=image-canvas]').then(($image) => {
    const imageScale = ($image[0] as HTMLCanvasElement).width / naturalWidth

    cy.get('[data-cy=interpolation-guide-canvas]').should(($guide) => {
      const overlayScale = ($guide[0] as HTMLCanvasElement).width / naturalWidth

      expect(imageScale, 'image scale').to.be.greaterThan(0)
      expect(overlayScale, 'overlay scale').to.be.greaterThan(0)
      expect(
        Math.abs(overlayScale - imageScale) / imageScale,
        `overlay scale ${overlayScale} vs image scale ${imageScale}`,
      ).to.be.lessThan(TOLERANCE)
    })
  })
}

/**
 * The image really was re-fitted to the frame, so the invariant above is not
 * passing simply because everything happens to sit at 100%.
 *
 * INFO: this asks that a fit HAPPENED, not which direction it went. An earlier
 * version required the canvas to be NARROWER than the image, which only holds
 * while the frame is smaller than the figure. A host that composes the panels
 * itself and drops the left sidebar gets a much wider canvas column (measured:
 * 692 -> 944px at 1920x1080), so an 800px figure is fitted UPWARDS and a
 * correct state failed this assertion.
 */
function assertImageWasFittedToTheFrame(naturalWidth = NATURAL_WIDTH): void {
  cy.get('[data-cy=image-canvas]').should(($image) => {
    const imageScale = ($image[0] as HTMLCanvasElement).width / naturalWidth
    expect(
      Math.abs(imageScale - 1),
      `image scale ${imageScale} must differ from 1:1`,
    ).to.be.greaterThan(0.01)
  })
}

describe('canvas: the overlay scale follows the image scale', () => {
  // INFO: the reported regression. The fixture is a major-1 project, i.e. one
  // written before `canvasHandler` existed. Restoring it used to invent
  // `{ scale: 1 }` and assign it over the fit factor the image had just been
  // drawn at, leaving the image fitted (~0.58) and every overlay at 1.
  it('restores a project without canvasHandler without desyncing the overlay', () => {
    visitApp({ onBeforeLoad: stubFilePicker })

    clickMenuItem('File', 'Load Project')
    selectProjectFile('cypress/fixtures/project-v1.zip')

    assertNoSnackbar()
    // INFO: wait for the restore to have landed before measuring. The fixture
    // holds two points against an x axis 0..10 and a y axis 0..100 (see
    // spec.project-round-trip, "loads a v1-format project ZIP").
    assertAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    assertTableRow(0, '5', '50')
    assertTableRow(1, '2.5', '25')

    assertImageWasFittedToTheFrame()
    assertOverlayScaleMatchesImageScale()
  })

  // INFO: a project the app saved itself DOES carry a canvasHandler, and its
  // `scale` was measured against whatever frame was on screen then (100% here,
  // because visitApp pins the zoom). It must not be restored either — the fit
  // is recomputed for the frame the project is opened in.
  it('restores a project that carries a saved scale without desyncing the overlay', () => {
    cy.task('clearDownloads')
    visitApp({ onBeforeLoad: stubFilePicker })

    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    clickCanvas(MIDPOINT)

    clickMenuItem('File', 'Save Project')
    assertNoSnackbar()

    readDownloadedProject().then((contents) => {
      visitApp({ onBeforeLoad: stubFilePicker })
      clickMenuItem('File', 'Load Project')
      selectProjectFile({ contents, fileName: 'project.zip' })

      assertNoSnackbar()
      // INFO: the restore has landed once the saved point is back in the table.
      assertTableRow(0, '5', '50')

      assertImageWasFittedToTheFrame()
      assertOverlayScaleMatchesImageScale()
    })
  })
})

// INFO: the other half of the same invariant. The overlays sit at the right
// PLACE (above), but their SIZE was a flat pixel constant, so the further the
// user zoomed out the more of the figure each marker covered. Reported from
// real use at 16%: a few dozen points buried the curve and the axis labels,
// which is exactly the zoom level used to hunt for missed points.
describe('marker size follows the zoom', () => {
  const PLOTTED = [
    { x: 120, y: 300 },
    { x: 180, y: 260 },
    { x: 240, y: 200 },
  ]

  /** Width of the visible dot inside a point marker (its only child). */
  function dotWidth(): Cypress.Chainable<number> {
    return cy
      .get('.canvas-point')
      .first()
      .find('div')
      .first()
      .then(($dot) => $dot[0].getBoundingClientRect().width)
  }

  /** Width of the pointer target — the marker element itself. */
  function hitWidth(): Cypress.Chainable<number> {
    return cy
      .get('.canvas-point')
      .first()
      .then(($hit) => $hit[0].getBoundingClientRect().width)
  }

  beforeEach(() => {
    visitApp()
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    PLOTTED.forEach(clickCanvas)
    cy.get('.canvas-point').should('have.length', PLOTTED.length)
  })

  it('draws the marker at its nominal size at 100%', () => {
    // INFO: visitApp() already pins the zoom to 100% with "0".
    dotWidth().should('be.closeTo', 10, 0.5)
  })

  it('shrinks the marker as the user zooms out', () => {
    dotWidth().then((atFullZoom) => {
      // INFO: five presses of "-" is 0.1 each, i.e. down to 50%.
      for (let i = 0; i < 5; i += 1) pressKey('-')

      dotWidth().should((zoomedOut) => {
        expect(zoomedOut, 'the dot shrank with the figure').to.be.lessThan(
          atFullZoom,
        )
      })
    })
  })

  it('stops shrinking at the floor, so the marker stays visible', () => {
    // INFO: far past the point where plain `size * scale` would have given
    // 1.6px — invisible, and unclickable.
    for (let i = 0; i < 12; i += 1) pressKey('-')

    dotWidth().should((atMinimum) => {
      expect(atMinimum, 'still visible').to.be.at.least(3)
      expect(atMinimum, 'still smaller than at 100%').to.be.lessThan(10)
    })
  })

  it('keeps the marker grabbable however far out the user zooms', () => {
    for (let i = 0; i < 12; i += 1) pressKey('-')

    // INFO: the hit area is deliberately NOT the visual size. A 3px dot the
    // user cannot click would trade one unusable view for another.
    hitWidth().should('be.at.least', 12)
  })

  it('still deletes the point the user clicks at low zoom', () => {
    for (let i = 0; i < 12; i += 1) pressKey('-')

    pressKey('d')
    // INFO: `.last()` rather than `.first()`, and that is a statement about
    // the feature, not a way round the test. At the minimum zoom these points
    // are ~6px apart on screen, so the hit areas — which must stay bigger
    // than that to be clickable at all — necessarily overlap. Whichever
    // marker is drawn ON TOP takes the click, which is the one the user sees
    // on top. The earlier ones are covered; editing a dense figure means
    // zooming in, as it always has.
    cy.get('.canvas-point').last().click()

    cy.get('.canvas-point').should('have.length', PLOTTED.length - 1)
  })
})

// INFO: which point a click means when markers overlap. The hit areas have a
// floor, so wherever points sit closer together than that, several markers
// cover the same pixel — and the browser gives the click to whichever element
// is on top rather than to the one the user aimed at. A host measured the cost
// on real figures: at fit/100%/200%, about a third of clicks in the band where
// points are 6-12px apart selected the wrong point, and in half of those the
// winner was not even the closest one.
describe('overlapping markers: the nearest point takes the click', () => {
  // INFO: 8px apart at 100% zoom — inside the 12px hit floor, so each marker
  // covers its neighbour's centre. The smallest arrangement that shows the
  // reported failure.
  const FIRST = { x: 150, y: 250 }
  const SECOND = { x: 158, y: 250 }
  // The calibration below maps them to these values.
  const FIRST_VALUE = { x: '3', y: '43.33' }
  const SECOND_VALUE = { x: '3.267', y: '43.33' }

  /**
   * Clicks AT one marker's centre while the event goes to another — which is
   * what the browser does when markers overlap: the topmost element gets it,
   * wherever the pointer actually was. `trigger` is used rather than `click`
   * precisely because the pointer position and the receiving element have to
   * be set independently.
   */
  function clickAtCentreOfMarker(index: number, receiverIndex: number): void {
    cy.get('.canvas-point')
      .eq(index)
      .then(($aimed) => {
        const rect = $aimed[0].getBoundingClientRect()
        cy.get('.canvas-point')
          .eq(receiverIndex)
          .trigger('click', {
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            force: true,
          })
      })
  }

  beforeEach(() => {
    visitApp()
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    clickCanvas(FIRST)
    clickCanvas(SECOND)
    cy.get('.canvas-point').should('have.length', 2)
    pressKey('d')
  })

  it('deletes the point clicked, not the one drawn on top of it', () => {
    // INFO: aimed at the FIRST point, delivered to the SECOND — the exact
    // situation that used to delete the wrong point.
    clickAtCentreOfMarker(0, 1)

    cy.get('.canvas-point').should('have.length', 1)
    assertTableRow(0, SECOND_VALUE.x, SECOND_VALUE.y)
  })

  it('deletes the other one when that is the one aimed at', () => {
    clickAtCentreOfMarker(1, 0)

    cy.get('.canvas-point').should('have.length', 1)
    assertTableRow(0, FIRST_VALUE.x, FIRST_VALUE.y)
  })
})
