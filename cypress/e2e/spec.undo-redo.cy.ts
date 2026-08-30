/* eslint-disable jest/expect-expect */
describe('undo/redo', () => {
  beforeEach(() => {
    cy.visit('/')
    // INFO: Reset to 100% zoom — the header button was replaced by the
    // View menu / '0' keyboard shortcut (issue #148).
    cy.get('body').trigger('keydown', { key: '0' })
  })

  it('undoes and redoes a point addition with the Ctrl/Cmd+Z shortcut', () => {
    cy.get('#canvasWrapper')
      // INFO: default calibration mode is "2 Points" — the first click sets
      // x1/y1, the second sets x2/y2 (see AxisSet#nextAxis), and only
      // clicks after that add data points. Mirrors spec.interpolation.cy.ts.
      .click(50, 390)
      .click(400, 50)
      .click(200, 200)

    cy.get('.canvas-point').should('have.length', 1)

    cy.get('body').trigger('keydown', {
      key: 'z',
      ctrlKey: true,
      metaKey: true,
    })
    cy.get('.canvas-point').should('have.length', 0)

    cy.get('body').trigger('keydown', {
      key: 'z',
      ctrlKey: true,
      metaKey: true,
      shiftKey: true,
    })
    cy.get('.canvas-point').should('have.length', 1)
  })

  it('undoes and redoes via the Edit menu', () => {
    // INFO: Undo/Redo moved from header buttons into the App.vue menu bar's
    // Edit menu (issue #148). ".v-list-item" alone also matches unrelated
    // items (axis set / dataset name fields), so scope by visible text.
    cy.contains('.v-btn', 'Edit').click()
    cy.contains('.v-list-item', 'Undo').should(
      'have.class',
      'v-list-item--disabled',
    )
    cy.contains('.v-list-item', 'Redo').should(
      'have.class',
      'v-list-item--disabled',
    )
    cy.get('body').type('{esc}')

    cy.get('#canvasWrapper')
      .click(50, 390)
      .click(400, 50)
      .click(200, 200)
      .click(250, 150)

    cy.get('.canvas-point').should('have.length', 2)

    cy.contains('.v-btn', 'Edit').click()
    cy.contains('.v-list-item', 'Undo')
      .should('not.have.class', 'v-list-item--disabled')
      .click()
    cy.get('.canvas-point').should('have.length', 1)

    cy.contains('.v-btn', 'Edit').click()
    cy.contains('.v-list-item', 'Redo')
      .should('not.have.class', 'v-list-item--disabled')
      .click()
    cy.get('.canvas-point').should('have.length', 2)
  })
})
