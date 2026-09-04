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
 * The viewport is 1280x700 and the sample is 1180x980, so a fit is always a
 * shrink here.
 */
function assertImageWasFittedToTheFrame(): void {
  cy.get('[data-cy=image-canvas]').should(($image) => {
    expect(
      ($image[0] as HTMLCanvasElement).width,
      'image canvas width after a fit',
    ).to.be.lessThan(NATURAL_WIDTH)
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
