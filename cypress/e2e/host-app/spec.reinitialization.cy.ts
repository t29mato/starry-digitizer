/* eslint-disable jest/expect-expect */
// INFO: What happens when the host changes the `image` / `project` props of a
// component that stays mounted — including the v-model echo, which must not
// make the digitizer reload itself.

import {
  addPoints,
  calibrateAxes,
  DatasetValuesLike,
  FIRST_IMAGE_WIDTH,
  ProjectLike,
  readJson,
  SECOND_IMAGE_WIDTH,
  visitHostApp,
} from '../../support/hostApp'

describe('host app: changing the image prop', () => {
  beforeEach(() => {
    visitHostApp()
    calibrateAxes()
    addPoints([
      [200, 200],
      [250, 150],
    ])
    cy.get('.canvas-point').should('have.length', 2)
    // INFO: let the debounced update:project reach the host, so its `project`
    // prop holds the current work when the image is swapped.
    cy.wait(600)
    cy.get('[data-cy=update-count]').should('not.have.text', '0')
  })

  it('draws the new figure without remounting the component', () => {
    cy.get('[data-cy=swap-image]').click()
    cy.get('[data-cy=ready-count]').should('have.text', '2')
    cy.get('body').trigger('keydown', { key: '0' })
    cy.get('#imageCanvas').should(
      'have.attr',
      'width',
      String(SECOND_IMAGE_WIDTH),
    )
    cy.get('[data-cy=error-codes]').should('have.text', '')
  })

  it('re-applies the project the host still holds', () => {
    // INFO: the image watcher reloads props.project along with the new image,
    // so a host that keeps its DTO keeps its points. Hosts that want a blank
    // sheet must clear `project` in the same tick (see remount-other below).
    cy.get('[data-cy=swap-image]').click()
    cy.get('[data-cy=ready-count]').should('have.text', '2')
    cy.get('.canvas-point').should('have.length', 2)
    cy.get('.dataset-count-1').should('contain.text', '2')
  })

  it('starts from an empty sheet when the host clears the project too', () => {
    cy.get('[data-cy=remount-other]').click()
    cy.get('[data-cy=ready-count]').should('have.text', '2')
    cy.get('body').trigger('keydown', { key: '0' })
    cy.get('#imageCanvas').should(
      'have.attr',
      'width',
      String(SECOND_IMAGE_WIDTH),
    )
    cy.get('.canvas-point').should('have.length', 0)
    cy.get('.dataset-count-1').should('contain.text', '0')
    cy.get('#x1-value').should('have.value', '0')
  })
})

describe('host app: changing the project prop', () => {
  beforeEach(() => {
    visitHostApp()
    calibrateAxes()
    addPoints([[200, 200]])
    cy.get('.canvas-point').should('have.length', 1)
    cy.wait(600)
  })

  it('restores the project the host assigns, keeping the image', () => {
    cy.get('[data-cy=set-fixture-prop]').click()

    cy.get('[data-cy=ready-count]').should('have.text', '2')
    cy.get('.canvas-point').should('have.length', 3)
    cy.get('.c__dataset-row').should('have.length', 2)
    cy.get('.c__axisSet-item input').should('have.value', 'Fixture Axes')
    cy.get('#x2-value').should('have.value', '20')
    // INFO: the image prop did not change, so the first figure stays on screen.
    cy.get('body').trigger('keydown', { key: '0' })
    cy.get('#imageCanvas').should(
      'have.attr',
      'width',
      String(FIRST_IMAGE_WIDTH),
    )
    cy.get('[data-cy=error-codes]').should('have.text', '')
  })
})

describe('host app: v-model echo', () => {
  beforeEach(() => {
    visitHostApp()
    calibrateAxes()
    addPoints([
      [200, 200],
      [250, 150],
    ])
    cy.get('.canvas-point').should('have.length', 2)
    cy.wait(600)
  })

  it('does not reload when the host writes the DTO straight back', () => {
    cy.get('[data-cy=clear-log]').click()
    cy.get('[data-cy=echo-project]').click()

    // INFO: a reload would emit `ready` again and rebuild the datasets.
    cy.wait(1000)
    cy.get('[data-cy=ready-count]').should('have.text', '0')
    cy.get('[data-cy=update-count]').should('have.text', '0')
    cy.get('[data-cy=change-count]').should('have.text', '0')
    cy.get('.canvas-point').should('have.length', 2)
    cy.get('.dataset-count-1').should('contain.text', '2')
  })

  it('survives repeated echoes and still accepts new edits afterwards', () => {
    cy.get('[data-cy=echo-project]').click()
    cy.get('[data-cy=echo-project]').click()
    cy.get('[data-cy=echo-project]').click()
    cy.get('[data-cy=clear-log]').click()

    addPoints([[300, 260]])
    cy.get('.canvas-point').should('have.length', 3)
    cy.get('[data-cy=update-count]').should('have.text', '1')
    cy.get('[data-cy=ready-count]').should('have.text', '0')
    readJson<ProjectLike>('project-json').should((project) => {
      expect(project.datasets[0].points).to.have.length(3)
    })
  })
})

describe('host app: legacy (v1) project DTO', () => {
  it('loads a v1 project without canvasHandler and returns it as 2.0.0', () => {
    visitHostApp()
    cy.get('[data-cy=load-legacy-v1]').click()

    cy.get('[data-cy=error-codes]').should('have.text', '')
    cy.get('.canvas-point').should('have.length', 2)
    cy.get('.c__axisSet-item input').should('have.value', 'XY Axes 1')
    cy.get('#x1-value').should('have.value', '1')
    cy.get('#x2-value').should('have.value', '11')
    cy.get('#y1-value').should('have.value', '2')
    cy.get('#y2-value').should('have.value', '12')
    cy.get('.c__dataset-row .sd-combobox input')
      .first()
      .should('have.value', 'legacy dataset')

    cy.get('[data-cy=get-project]').click()
    readJson<ProjectLike>('get-project-json').should((project) => {
      expect(project.version).to.equal('2.0.0')
      expect(project.datasets[0].name).to.equal('legacy dataset')
      expect(project.datasets[0].points).to.have.length(2)
      // INFO: the v1 file had no externalId, and none must be invented.
      expect(project.datasets[0].externalId).to.equal(undefined)
    })

    cy.get('[data-cy=get-values]').click()
    readJson<DatasetValuesLike[]>('values-json').should((datasets) => {
      expect(datasets[0].pixelPoints).to.deep.equal([
        { x: 220, y: 320 },
        { x: 320, y: 220 },
      ])
      // INFO: the axis set is fully calibrated, so physical values are real
      // numbers rather than the NaN an uncalibrated set yields.
      datasets[0].points.forEach((point) => {
        expect(point.x).to.be.a('number')
        expect(point.y).to.be.a('number')
      })
    })
  })

  it('round-trips a v1 project into a 2.0.0 ZIP', () => {
    visitHostApp()
    cy.get('[data-cy=load-legacy-v1]').click()
    cy.get('.canvas-point').should('have.length', 2)

    cy.get('[data-cy=export-zip-inspect]').click()
    cy.get('[data-cy=zip-entries]').should(
      'have.text',
      'image.png,project.json',
    )
    readJson<ProjectLike>('zip-project-json').should((project) => {
      expect(project.version).to.equal('2.0.0')
      expect(project.datasets[0].name).to.equal('legacy dataset')
      expect(project.axisSets[0].x2.value).to.equal(11)
    })
  })
})
