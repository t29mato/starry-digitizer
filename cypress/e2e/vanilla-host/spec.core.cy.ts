// INFO: examples/vanilla-host/core.html drives the engine through the
// `starry-digitizer/core` entry alone — no Vue renderer, no library component,
// not even the library stylesheet. This spec is the runtime proof that the
// entry really is self-sufficient; scripts/lib-check.mjs only checks the
// import statements, and examples/vanilla-host/scripts/verify-core-bundle.mjs
// only checks the built chunks.
// Run with: CYPRESS_VANILLA_HOST=1 npx cypress run

// INFO: named differently from spec.mount.cy.ts' IMAGE_WIDTH on purpose —
// Cypress specs with no import/export are global scripts, so two files
// declaring the same const is a TypeScript redeclaration error under vue-tsc.
/** Intrinsic size of examples/vanilla-host/public/sample_graph_curve.png. */
const SAMPLE_WIDTH_PX = 1180
const SAMPLE_HEIGHT_PX = 980

// INFO: mirrors the constants in src/core-demo.ts. The calibration is chosen
// so the sample point's physical values are exact rather than approximate:
// x 100px->0 / 1100px->100 and y 900px->0 / 100px->200 put (600, 500) px on
// exactly (50, 100).
const EXPECTED_POINT = { x: 50, y: 100 }

interface CoreDatasetValues {
  id: number
  name: string
  points: { x: number; y: number }[]
  pixelPoints: { x: number; y: number }[]
}

function readValues(): Cypress.Chainable<CoreDatasetValues[]> {
  cy.get('[data-cy=get-values]').click()
  return cy
    .get('[data-cy=values]')
    .invoke('text')
    .then((text) => JSON.parse(String(text)) as CoreDatasetValues[])
}

describe('vanilla host: starry-digitizer/core without a Vue renderer', () => {
  beforeEach(() => {
    cy.visit('/core.html')
  })

  it('decodes and fits the image on host-owned canvases', () => {
    cy.get('[data-cy=image-size]').should('have.text', 'none')

    cy.get('[data-cy=load-sample]').click()
    cy.get('[data-cy=status]').should('have.text', 'image loaded')
    cy.get('[data-cy=image-size]').should(
      'have.text',
      `${SAMPLE_WIDTH_PX}x${SAMPLE_HEIGHT_PX}`,
    )

    // INFO: the canvases belong to core.html, not to the library. The engine
    // resized them, which is the whole of the DOM contract between them.
    cy.get('[data-cy=image-canvas]').should(($canvas) => {
      const width = Number($canvas.attr('width'))
      const height = Number($canvas.attr('height'))
      expect(width).to.be.greaterThan(0)
      // The wrapper is 600x420 and the fit keeps the aspect ratio, so the
      // image is height-bound here.
      expect(height).to.be.at.most(420)
      expect(width / height).to.be.closeTo(
        SAMPLE_WIDTH_PX / SAMPLE_HEIGHT_PX,
        0.05,
      )
    })
  })

  it('calibrates and converts a point to exact physical values', () => {
    cy.get('[data-cy=load-sample]').click()
    cy.get('[data-cy=status]').should('have.text', 'image loaded')

    cy.get('[data-cy=calibrate]').click()
    cy.get('[data-cy=calibration]').should('have.text', 'x 0..100 / y 0..200')

    cy.get('[data-cy=add-point]').click()

    readValues().then((datasets) => {
      expect(datasets).to.have.length(1)
      expect(datasets[0].points).to.have.length(1)
      expect(datasets[0].pixelPoints[0]).to.deep.equal({ x: 600, y: 500 })
      expect(datasets[0].points[0].x).to.be.closeTo(EXPECTED_POINT.x, 1e-6)
      expect(datasets[0].points[0].y).to.be.closeTo(EXPECTED_POINT.y, 1e-6)
    })
  })

  it('runs the automatic extraction through the PixelSource port', () => {
    cy.get('[data-cy=load-sample]').click()
    cy.get('[data-cy=status]').should('have.text', 'image loaded')
    cy.get('[data-cy=calibrate]').click()

    cy.get('[data-cy=extract]').click()
    cy.get('[data-cy=status]').should('contain.text', 'extracted')

    cy.get('[data-cy=point-count]')
      .invoke('text')
      .then((text) => {
        expect(Number(text)).to.be.greaterThan(1)
      })

    readValues().then((datasets) => {
      expect(datasets[0].points.length).to.be.greaterThan(1)
      // INFO: every extracted point is inside the image and calibrated, so no
      // NaN (which would serialize to null) may reach the host.
      datasets[0].pixelPoints.forEach((pixel) => {
        expect(pixel.x).to.be.within(0, SAMPLE_WIDTH_PX)
        expect(pixel.y).to.be.within(0, SAMPLE_HEIGHT_PX)
      })
      datasets[0].points.forEach((point) => {
        expect(point.x).to.be.a('number')
        expect(point.y).to.be.a('number')
      })
    })
  })

  // INFO: the regression test this whole page exists for. The read-outs are
  // written by an `effect()` re-exported from starry-digitizer/core and by
  // nothing else — no component, no framework, no polling. If the engine ever
  // stops being observable outside Vue's renderer, this is what breaks.
  it('updates the effect()-driven read-outs on every state change', () => {
    cy.get('[data-cy=point-count]').should('have.text', '0')
    cy.get('[data-cy=calibration]').should('contain.text', 'incomplete')

    cy.get('[data-cy=effect-runs]')
      .invoke('text')
      .then((initialRuns) => {
        cy.get('[data-cy=load-sample]').click()
        cy.get('[data-cy=status]').should('have.text', 'image loaded')

        // Calibrating changes the axis coordinates and values: the read-out
        // has to follow without anything re-rendering it.
        cy.get('[data-cy=calibrate]').click()
        cy.get('[data-cy=calibration]').should(
          'have.text',
          'x 0..100 / y 0..200',
        )

        // Adding a point changes a nested array's length.
        cy.get('[data-cy=add-point]').click()
        cy.get('[data-cy=point-count]').should('have.text', '1')

        // Extraction replaces the whole array.
        cy.get('[data-cy=extract]').click()
        cy.get('[data-cy=point-count]').should(($el) => {
          expect(Number($el.text())).to.be.greaterThan(1)
        })

        // ...and it goes back down again.
        cy.get('[data-cy=clear-points]').click()
        cy.get('[data-cy=point-count]').should('have.text', '0')

        cy.get('[data-cy=effect-runs]').should(($el) => {
          expect(Number($el.text())).to.be.greaterThan(Number(initialRuns))
        })
      })
  })

  it('loads no library stylesheet and mounts no component', () => {
    cy.get('[data-cy=load-sample]').click()
    cy.get('[data-cy=status]').should('have.text', 'image loaded')

    // The library's UI root class never appears: there is no component here.
    cy.get('.starry-digitizer').should('not.exist')

    // INFO: `starry-digitizer/styles` scopes every rule under `.starry-digitizer`,
    // so the proof that it was not loaded is that no stylesheet on the page
    // declares that selector.
    cy.document().then((doc) => {
      const rules = Array.from(doc.styleSheets).flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((rule) => rule.cssText)
        } catch {
          // A cross-origin sheet cannot be read; this page has none.
          return []
        }
      })
      expect(rules.some((text) => text.includes('.starry-digitizer'))).to.equal(
        false,
      )
    })
  })
})
