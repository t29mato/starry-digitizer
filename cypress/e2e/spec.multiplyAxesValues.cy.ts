/* eslint-disable jest/expect-expect */
describe('template spec', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  describe('X軸', () => {
    it('should enable x10 button when Log checkbox is checked and x1 value is multiplied by 10', () => {
      // Arrange
      cy.get('#multiply-by-ten-x1').should('not.exist')
      cy.get('#x-is-log').click({ force: true })

      // Act
      cy.get('#x1-value').type('{selectall}2').should('have.value', '2')
      cy.get('#multiply-by-ten-x1').click({ force: true })

      // Assert
      cy.get('#x1-value').should('have.value', '2e+1')
    })

    it('should enable x0.1 button when Log checkbox is checked and x1 value is divided by 10', () => {
      // Arrange
      cy.get('#divide-by-ten-x1').should('not.exist')
      cy.get('#x-is-log').click({ force: true })

      // Act
      cy.get('#x1-value').type('{selectall}2').should('have.value', '2')
      cy.get('#divide-by-ten-x1').click({ force: true })

      // Assert
      cy.get('#x1-value').should('have.value', '0.2')
    })
  })

  describe('Y軸', () => {
    it('should enable y10 button when Log checkbox is checked and y1 value is multiplied by 10', () => {
      // Arrange
      cy.get('#multiply-by-ten-y1').should('not.exist')
      cy.get('#y-is-log').click({ force: true })

      // Act
      cy.get('#y1-value').type('{selectall}2').should('have.value', '2')
      cy.get('#multiply-by-ten-y1').click({ force: true })

      // Assert
      cy.get('#y1-value').should('have.value', '2e+1')
    })

    it('should enable y0.1 button when Log checkbox is checked and y1 value is divided by 10', () => {
      // Arrange
      cy.get('#divide-by-ten-y1').should('not.exist')
      cy.get('#y-is-log').click({ force: true })

      // Act
      cy.get('#y1-value').type('{selectall}2').should('have.value', '2')
      cy.get('#divide-by-ten-y1').click({ force: true })

      // Assert
      cy.get('#y1-value').should('have.value', '0.2')
    })
  })
})
