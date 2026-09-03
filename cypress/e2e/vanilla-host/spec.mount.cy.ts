// INFO: examples/vanilla-host is a framework-less page whose only Vue code
// lives in src/mountDigitizer.ts. This spec proves the wrapper actually mounts
// <StarryDigitizer> into a plain <div>, that the exposed methods reach the
// component, and that unmount() leaves the container empty.
// Run with: CYPRESS_VANILLA_HOST=1 npx cypress run

/** Intrinsic width of examples/vanilla-host/public/sample_graph_curve.png. */
const IMAGE_WIDTH = 1180

interface DatasetValuesLike {
  id: number
  name: string
  points: { x: number; y: number }[]
  pixelPoints: { x: number; y: number }[]
}

/** Mounts the digitizer through the toolbar and pins the canvas to 100% zoom. */
function mountSample(): void {
  cy.get('[data-cy=load-sample]').click()
  cy.get('[data-cy=status]').should('contain.text', 'ready')
  cy.get('body').trigger('keydown', { key: '0' })
  cy.get('#imageCanvas').should('have.attr', 'width', String(IMAGE_WIDTH))
}

describe('vanilla host: mountDigitizer()', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('mounts the digitizer into a plain DOM element', () => {
    cy.get('[data-cy=digitizer]').should('be.empty')
    mountSample()
    cy.get('[data-cy=digitizer]').find('.starry-digitizer').should('exist')
  })

  it('reports a digitized point through getDatasetValues()', () => {
    mountSample()

    // Calibrate in "2 Points" mode: the first click sets x1/y1, the second
    // x2/y2. The third click then adds a data point.
    cy.contains('.sd-check', '2 Points').click()
    cy.get('#canvasWrapper').click(50, 390).click(400, 50)
    cy.get('#canvasWrapper').click(200, 200)
    cy.get('.canvas-point').should('have.length', 1)

    cy.get('[data-cy=get-values]').click()
    cy.get('[data-cy=output]')
      .invoke('text')
      .should((text) => {
        const [, ...json] = String(text).split('\n')
        const datasets = JSON.parse(json.join('\n')) as DatasetValuesLike[]
        expect(datasets).to.have.length(1)
        expect(datasets[0].points).to.have.length(1)
        expect(datasets[0].pixelPoints[0].x).to.be.closeTo(200, 2)
        expect(datasets[0].pixelPoints[0].y).to.be.closeTo(200, 2)
      })
  })

  it('empties the container on unmount()', () => {
    mountSample()
    cy.get('[data-cy=digitizer]').find('.starry-digitizer').should('exist')

    cy.get('[data-cy=unmount]').click()
    cy.get('[data-cy=status]').should('have.text', 'unmounted')
    cy.get('[data-cy=digitizer]').should('be.empty')
  })
})
