/* eslint-disable jest/expect-expect */
// INFO: Cypressのshould methodでアサーションは実質、実施してるので
describe('template spec', () => {
  beforeEach(() => {
    cy.visit('/')
  })
  it('red line test with selected area', () => {
    // cy.visit('http://openlayers.org/en/latest/examples/draw-features.html')
    // cy.get('canvas')
    //   .trigger('pointerdown', 100, 100)
    //   .trigger('pointerup', 100, 100)
    cy.contains('Pen').click()
    cy.get('#canvasWrapper')
      .trigger('mousedown', { offsetX: 50, offsetY: 250 })
      .trigger('mousemove', { offsetX: 100, offsetY: 250, buttons: 1 })
      .trigger('mousemove', { offsetX: 150, offsetY: 250, buttons: 1 })
      .trigger('mousemove', { offsetX: 200, offsetY: 250, buttons: 1 })
      .trigger('mousemove', { offsetX: 250, offsetY: 250, buttons: 1 })
      .trigger('mousemove', { offsetX: 500, offsetY: 250, buttons: 1 })
      .trigger('mouseup')
    cy.scrollTo(0, 0)
    cy.contains('Run').click()
    cy.scrollTo(0, 0)

    cy.get('.dataset-count-1 > span').should('have.text', 7)
  })
})
