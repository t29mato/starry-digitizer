/* eslint-disable jest/expect-expect */
// INFO: Runs against examples/host-app (CYPRESS_HOST_APP=1, :5174), which
// mounts <StarryDigitizer> as a library component with an image Blob and
// v-model:project. Covers acceptance criteria 1 and 4 of the integration
// spec, plus the readonly prop.

const POINT_POSITIONS: [number, number][] = [
  [200, 200],
  [250, 150],
]

/** Calibrates the axis set in "2 Points" mode, then adds the data points. */
function calibrateAndAddPoints() {
  // INFO: select the calibration mode explicitly rather than relying on the
  // default, because the mode a freshly mounted project comes up in depends
  // on how loadProject() treats the restored axis sets.
  cy.contains('.v-radio', '2 Points').click()
  let chain = cy
    .get('#canvasWrapper')
    // INFO: in "2 Points" mode the first click sets x1/y1, the second x2/y2,
    // and only later clicks add data points (see AxisSet#nextAxis).
    .click(50, 390)
    .click(400, 50)
  POINT_POSITIONS.forEach(([x, y]) => {
    chain = chain.click(x, y)
  })
  return chain
}

/** Drops `timestamp`, which changes on every DTO snapshot. */
function withoutTimestamp(json: string) {
  const dto = JSON.parse(json)
  delete dto.timestamp
  return dto
}

describe('host app: props, events and remounting', () => {
  beforeEach(() => {
    cy.visit('/')
    // INFO: the host fetches the image Blob before mounting, so wait for the
    // component's `ready` emit rather than for the DOM alone.
    cy.get('[data-cy=ready]').should('contain.text', 'version')
    // INFO: reset to 100% zoom so click coordinates map to fixed pixels.
    cy.get('body').trigger('keydown', { key: '0' })
  })

  it('emits update:project and restores the same state after a remount', () => {
    calibrateAndAddPoints()
    cy.get('.canvas-point').should('have.length', POINT_POSITIONS.length)
    cy.get('.dataset-count-1').should(
      'contain.text',
      String(POINT_POSITIONS.length),
    )

    // INFO: update:project is debounced by ~300ms inside the component.
    cy.wait(500)
    cy.get('[data-cy=update-count]')
      .invoke('text')
      .then((text) => Number(text))
      .should('be.greaterThan', 0)
    cy.get('[data-cy=project-json]').should('contain.text', '"points"')
    cy.get('[data-cy=datasets-json]').should('contain.text', '"pixelPoints"')

    // Capture the emitted DTO and the physical values before unmounting.
    const before: { project?: unknown; values?: string } = {}
    cy.get('[data-cy=project-json]')
      .invoke('text')
      .then((text) => {
        before.project = withoutTimestamp(text)
      })
    cy.get('[data-cy=get-values]').click()
    cy.get('[data-cy=values-json]')
      .invoke('text')
      .then((text) => {
        before.values = text
      })

    // Remount with the same image Blob and the same ProjectDTO.
    cy.get('[data-cy=remount]').click()
    cy.get('[data-cy=ready]').should('contain.text', 'version')

    cy.get('.canvas-point').should('have.length', POINT_POSITIONS.length)
    cy.get('.dataset-count-1').should(
      'contain.text',
      String(POINT_POSITIONS.length),
    )
    cy.get('[data-cy=project-json]')
      .invoke('text')
      .should((text) => {
        expect(withoutTimestamp(text)).to.deep.equal(before.project)
      })
    cy.get('[data-cy=get-values]').click()
    cy.get('[data-cy=values-json]')
      .invoke('text')
      .should((text) => {
        expect(text).to.equal(before.values)
      })
  })

  it('leaves no points behind when remounted with another figure', () => {
    calibrateAndAddPoints()
    cy.get('.dataset-count-1').should(
      'contain.text',
      String(POINT_POSITIONS.length),
    )

    cy.get('[data-cy=remount-other]').click()
    cy.get('[data-cy=ready]').should('contain.text', 'version')

    cy.get('.dataset-count-1').should('contain.text', '0')
    cy.get('.canvas-point').should('have.length', 0)
  })

  it('ignores canvas clicks while readonly', () => {
    calibrateAndAddPoints()
    cy.get('.canvas-point').should('have.length', POINT_POSITIONS.length)

    cy.get('[data-cy=toggle-readonly]').click()
    cy.get('[data-cy=toggle-readonly]').should('contain.text', 'readonly: on')

    cy.get('#canvasWrapper').click(300, 250)
    // INFO: give the (debounced) update path a chance to run before asserting
    // that nothing changed.
    cy.wait(500)
    cy.get('.canvas-point').should('have.length', POINT_POSITIONS.length)
    cy.get('.dataset-count-1').should(
      'contain.text',
      String(POINT_POSITIONS.length),
    )
  })
})
