/* eslint-disable jest/expect-expect */
describe('template spec', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('displays data table correctly', () => {
    // テーブルのヘッダーが表示されていることを確認する
    cy.get('.ht_clone_top tr').should('contain', 'X')
    cy.get('.ht_clone_top tr').should('contain', 'Y')

    // テーブルのデータが表示されていることを確認する
    cy.get('.ht_master tbody tr').should('have.length', 1)

    cy.get('.ht_master tbody tr:first-child td:first-child').type('3')
    cy.get('.ht_master tbody tr:first-child td:last-child').type('5')

    // テーブルのデータをクリップボードにコピーする
    cy.contains('Pen').click()
    cy.contains('Copy to Clipboard').click()

    cy.get('.ht_master tbody tr:first-child td:first-child').should(
      'contain',
      '3'
    )
    cy.get('.ht_master tbody tr:first-child td:last-child').should(
      'contain',
      '5'
    )

    // クリップボードに正しいCSVデータがコピーされていることを確認する
    cy.window()
      .then((win) => {
        return win.navigator.clipboard.readText()
      })
      .should('equal', '3,5')
  })
})
