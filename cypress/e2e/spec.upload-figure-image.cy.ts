describe('template spec', () => {
  beforeEach(() => {
    cy.visit('/')
  })
  it('upload figure image', () => {
    const filePath = "sample_graph_curve_2.png"
    cy.get('#fileInput').attachFile(filePath)
  })

  it('upload figure image by paste', () => {
    // TODO: テストしたいが画像をペーストして貼り付ける方法が色々やったが断念。下記試したURLたち
    // https://github.com/cypress-io/cypress/issues/2386
  })
})
