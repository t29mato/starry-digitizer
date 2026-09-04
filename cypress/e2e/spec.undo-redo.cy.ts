/* eslint-disable jest/expect-expect */
describe('undo/redo', () => {
  beforeEach(() => {
    cy.visit('/')
    // INFO: Reset to 100% zoom — the header button was replaced by the
    // View menu / '0' keyboard shortcut (issue #148).
    cy.get('body').trigger('keydown', { key: '0' })
  })

  it('undoes and redoes a point addition with the Ctrl/Cmd+Z shortcut', () => {
    cy.get('[data-cy=canvas-wrapper]')
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
    // Edit menu (issue #148). SdMenu gives every entry a data-cy derived
    // from its label, which is stabler than matching on text.
    cy.get('[data-cy=menu-edit]').click()
    cy.get('[data-cy=menu-item-undo]').should('be.disabled')
    cy.get('[data-cy=menu-item-redo]').should('be.disabled')
    cy.get('body').type('{esc}')

    cy.get('[data-cy=canvas-wrapper]')
      .click(50, 390)
      .click(400, 50)
      .click(200, 200)
      .click(250, 150)

    cy.get('.canvas-point').should('have.length', 2)

    cy.get('[data-cy=menu-edit]').click()
    cy.get('[data-cy=menu-item-undo]').should('not.be.disabled').click()
    cy.get('.canvas-point').should('have.length', 1)

    cy.get('[data-cy=menu-edit]').click()
    cy.get('[data-cy=menu-item-redo]').should('not.be.disabled').click()
    cy.get('.canvas-point').should('have.length', 2)
  })
})
