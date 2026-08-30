/* eslint-disable jest/expect-expect */
// INFO: #255 グラフ画像の端に近づくと拡大鏡(Magnifier)が追従を止める、の回帰テスト
// - 画像内では端ギリギリまで追従する(以前は端の手前で固まっていた)
// - 画像から出た瞬間に端にクランプされ、画像外では動かない(気が散るため)
// - 画像内に戻ると追従を再開する
describe('magnifier follow behavior around the image edge (#255)', () => {
  const magnifierImage = 'img[alt="the image you uploaded"]'

  beforeEach(() => {
    cy.visit('/')
    // INFO: デフォルト画像の読み込み完了を待つ
    cy.get(magnifierImage).should('have.attr', 'src').and('not.be.empty')
  })

  // INFO: 端から halfSize/scale px 以内では translate 値が負になり、
  // 以前は `--Npx` という不正なCSSになってMagnifierが固まっていた
  it('keeps following near the left edge of the image', () => {
    cy.get('#imageCanvas').then(($canvas) => {
      const rect = $canvas[0].getBoundingClientRect()
      const y = Math.round(rect.top + 100)

      cy.get('body').trigger('mousemove', {
        clientX: Math.round(rect.left + 100),
        clientY: y,
        force: true,
      })
      cy.get(magnifierImage)
        .invoke('attr', 'style')
        .then((styleInside) => {
          // INFO: 左端ギリギリ(translate値が負になる領域)でも追従する
          cy.get('body').trigger('mousemove', {
            clientX: Math.round(rect.left + 5),
            clientY: y,
            force: true,
          })
          cy.get(magnifierImage)
            .invoke('attr', 'style')
            .should((styleNearEdge) => {
              expect(styleNearEdge).not.to.eq(styleInside)
            })
        })
    })
  })

  it('clamps at the image edge and stays still outside the image', () => {
    cy.get('#imageCanvas').then(($canvas) => {
      const rect = $canvas[0].getBoundingClientRect()
      const outsideX = Math.round(rect.right + 100)
      const y1 = Math.round(rect.top + 100)
      const y2 = Math.round(rect.top + 200)

      // INFO: 画像内 → 画像外に出ると、端にクランプした位置へ更新される
      cy.get('body').trigger('mousemove', {
        clientX: Math.round(rect.right - 50),
        clientY: y1,
        force: true,
      })
      cy.get(magnifierImage)
        .invoke('attr', 'style')
        .then((styleInside) => {
          cy.get('body').trigger('mousemove', {
            clientX: outsideX,
            clientY: y1,
            force: true,
          })
          cy.get(magnifierImage)
            .invoke('attr', 'style')
            .should((styleClamped) => {
              expect(styleClamped).not.to.eq(styleInside)
            })

          // INFO: 画像外にいる間はマウスを動かしてもMagnifierは動かない
          cy.get(magnifierImage)
            .invoke('attr', 'style')
            .then((styleClamped) => {
              cy.get('body').trigger('mousemove', {
                clientX: outsideX,
                clientY: y2,
                force: true,
              })
              cy.get('body').trigger('mousemove', {
                clientX: outsideX + 200,
                clientY: y2,
                force: true,
              })
              cy.get(magnifierImage)
                .invoke('attr', 'style')
                .should((styleStillOutside) => {
                  expect(styleStillOutside).to.eq(styleClamped)
                })

              // INFO: 画像内に戻ると追従を再開する
              cy.get('body').trigger('mousemove', {
                clientX: Math.round(rect.right - 100),
                clientY: y2,
                force: true,
              })
              cy.get(magnifierImage)
                .invoke('attr', 'style')
                .should((styleBackInside) => {
                  expect(styleBackInside).not.to.eq(styleClamped)
                })
            })
        })
    })
  })
})
