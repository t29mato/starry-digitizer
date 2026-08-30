/* eslint-disable jest/expect-expect */
// INFO: #255 グラフ画像の端に近づくと拡大鏡(Magnifier)が追従を止める、の回帰テスト
// mousemoveはdocumentにバインドされているため、canvasWrapperの外でも
// Magnifierが追従を続け、カーソル座標は画像の端でクランプされる
describe('magnifier follows cursor beyond the canvas edge (#255)', () => {
  const magnifierImage = 'img[alt="the image you uploaded"]'

  beforeEach(() => {
    cy.visit('/')
    // INFO: デフォルト画像の読み込み完了を待つ
    cy.get(magnifierImage).should('have.attr', 'src').and('not.be.empty')
  })

  it('keeps following outside the wrapper and clamps at the image edge', () => {
    cy.get('#canvasWrapper').then(($wrapper) => {
      const rect = $wrapper[0].getBoundingClientRect()
      const outsideX = Math.round(rect.right + 100)
      const y1 = Math.round(rect.top + 100)
      const y2 = Math.round(rect.top + 200)

      cy.get('body').trigger('mousemove', {
        clientX: outsideX,
        clientY: y1,
        force: true,
      })
      cy.get(magnifierImage)
        .invoke('attr', 'style')
        .then((styleAtY1) => {
          // INFO: ラッパーの外でもマウスのY移動に追従して表示が更新される
          cy.get('body').trigger('mousemove', {
            clientX: outsideX,
            clientY: y2,
            force: true,
          })
          cy.get(magnifierImage)
            .invoke('attr', 'style')
            .should((styleAtY2) => {
              expect(styleAtY2).not.to.eq(styleAtY1)
            })

          // INFO: X方向はすでに画像の右端を越えているため、さらに右へ動かしても
          // カーソルは画像の端にクランプされ表示は変わらない
          cy.get(magnifierImage)
            .invoke('attr', 'style')
            .then((styleClamped) => {
              cy.get('body').trigger('mousemove', {
                clientX: outsideX + 300,
                clientY: y2,
                force: true,
              })
              cy.get(magnifierImage)
                .invoke('attr', 'style')
                .should((styleFurtherRight) => {
                  expect(styleFurtherRight).to.eq(styleClamped)
                })
            })
        })
    })
  })
})
