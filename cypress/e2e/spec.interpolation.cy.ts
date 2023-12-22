/* eslint-disable jest/expect-expect */
// INFO: Cypressのshould methodでアサーションは実質、実施してるので
describe('template spec', () => {
  beforeEach(() => {
    cy.visit('/')

    cy.get('#reset-canvas-scale').click()
  })

  //INFO: アンカーポイントと仮で補間された点の区別ができないのでその合計数を検証
  it('asserts that there are 18 points in default interval setting', () => {
    cy.get('#canvasWrapper')
      .click(50, 390)
      .click(400, 50)
      .click(70, 240)
      .click(150, 220)
      .click(250, 150)

    cy.get('.canvas-plot').should('have.length', 18)
  })

  //INFO: 補間確定後はアンカーポイントが削除されるので点が3つ減る
  it('asserts that there are 15 points after confirming interpolation in default interval setting', () => {
    cy.get('#canvasWrapper')
      .click(50, 390)
      .click(400, 50)
      .click(70, 240)
      .click(150, 220)
      .click(250, 150)

    cy.get('button#confirm-interpolation').click()

    cy.get('.canvas-plot').should('have.length', 15)
  })

  it('asserts that there are 13 points when interval is 15', () => {
    cy.get('input#interpolation-interval').clear().type('15')

    cy.get('#canvasWrapper')
      .click(50, 390)
      .click(400, 50)
      .click(70, 240)
      .click(150, 220)
      .click(250, 150)

    cy.get('.canvas-plot').should('have.length', 13)
  })

  it('asserts that there are 3 points when interpolation is disabled', () => {
    cy.get('#switch-interpolation').click()

    cy.get('#canvasWrapper')
      .click(50, 390)
      .click(400, 50)
      .click(70, 240)
      .click(150, 220)
      .click(250, 150)

    cy.get('.canvas-plot').should('have.length', 3)
  })

  it('asserts that interpolation on/off settings are remained after reload (localStorage feature)', () => {
    cy.get('#switch-interpolation').click()
    cy.visit('/')

    cy.get('#switch-interpolation').should('have.value', 'true')
  })
})
