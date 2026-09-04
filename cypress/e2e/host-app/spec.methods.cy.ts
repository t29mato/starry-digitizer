/* eslint-disable jest/expect-expect */
// INFO: The methods <StarryDigitizer> exposes to its host — getProject,
// loadProject, getDatasetValues, exportZip and reset — driven through the
// host app's toolbar buttons.

import {
  addPoints,
  calibrateAxes,
  DatasetValuesLike,
  ProjectLike,
  readJson,
  visitHostApp,
  withoutTimestamp,
} from '../../support/hostApp'

describe('host app: getProject()', () => {
  it('returns the same DTO the last update:project carried', () => {
    visitHostApp()
    calibrateAxes()
    addPoints([
      [200, 200],
      [250, 150],
    ])
    cy.get('.canvas-point').should('have.length', 2)
    cy.wait(600)

    cy.get('[data-cy=get-project]').click()
    cy.get('[data-cy=project-json]')
      .invoke('text')
      .then((emitted) => {
        cy.get('[data-cy=get-project-json]')
          .invoke('text')
          .should((pulled) => {
            // INFO: timestamp is restamped on every snapshot, so it is the
            // one field that legitimately differs.
            expect(withoutTimestamp(pulled)).to.deep.equal(
              withoutTimestamp(emitted),
            )
          })
      })
  })

  it('reflects a later edit that has not been emitted yet', () => {
    visitHostApp()
    calibrateAxes()
    cy.wait(600)
    addPoints([[300, 300]])
    cy.get('.canvas-point').should('have.length', 1)
    // INFO: read it back inside the debounce window — getProject() is a live
    // snapshot, not a copy of the last emission.
    cy.get('[data-cy=get-project]').click()
    readJson<ProjectLike>('get-project-json').should((project) => {
      expect(project.datasets[0].points).to.have.length(1)
      expect(project.version).to.equal('2.0.0')
    })
  })
})

describe('host app: loadProject()', () => {
  beforeEach(() => {
    visitHostApp()
    calibrateAxes()
    addPoints([[200, 200]])
    cy.get('.canvas-point').should('have.length', 1)
    cy.wait(600)
  })

  it('restores axes, points, dataset names and externalId', () => {
    cy.get('[data-cy=load-fixture-method]').click()

    // Axis set: name, values and the 4-points display mode restored loads use.
    cy.get('.c__axisSet-item input').should('have.value', 'Fixture Axes')
    cy.get('[data-cy=x1-value]').should('have.value', '10')
    cy.get('[data-cy=x2-value]').should('have.value', '20')
    cy.get('[data-cy=y1-value]').should('have.value', '30')
    cy.get('[data-cy=y2-value]').should('have.value', '70')
    cy.contains('.sd-check', '4 Points').find('input').should('be.checked')

    // Datasets: both rows, their names and their point counts.
    cy.get('.c__dataset-row').should('have.length', 2)
    cy.get('.dataset-count-1').should('contain.text', '3')
    cy.get('.dataset-count-2').should('contain.text', '1')
    cy.get('.c__dataset-row .sd-combobox input')
      .first()
      .should('have.value', 'Fixture Sample')
    cy.get('.canvas-point').should('have.length', 3)

    // externalId survives the round trip and reaches getDatasetValues().
    cy.get('[data-cy=get-values]').click()
    readJson<DatasetValuesLike[]>('values-json').should((datasets) => {
      expect(datasets).to.have.length(2)
      expect(datasets[0].externalId).to.equal('sample-42')
      expect(datasets[0].name).to.equal('Fixture Sample')
      expect(datasets[0].pixelPoints).to.deep.equal([
        { x: 200, y: 300 },
        { x: 300, y: 200 },
        { x: 400, y: 150 },
      ])
      expect(datasets[1].externalId).to.equal(undefined)
    })
    cy.get('[data-cy=error-codes]').should('have.text', '')
  })

  it('replaces the previous work rather than merging into it', () => {
    cy.get('[data-cy=load-fixture-method]').click()
    cy.get('.canvas-point').should('have.length', 3)
    // INFO: the point clicked before the load (pixel ~200/200 on dataset 1)
    // must not survive as a fourth point.
    cy.get('[data-cy=get-values]').click()
    readJson<DatasetValuesLike[]>('values-json').should((datasets) => {
      expect(datasets[0].pixelPoints).to.have.length(3)
    })
  })
})

describe('host app: reset()', () => {
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

  it('empties the axes, the points and the image', () => {
    cy.get('[data-cy=reset]').click()

    cy.get('.canvas-point').should('have.length', 0)
    cy.get('.dataset-count-1').should('contain.text', '0')
    cy.get('.c__dataset-row').should('have.length', 1)
    cy.get('[data-cy=x1-value]').should('have.value', '0')
    cy.get('[data-cy=x2-value]').should('have.value', '1')
    // INFO: clearImage() sizes every canvas to 0.
    cy.get('[data-cy=image-canvas]').should('have.attr', 'width', '0')

    cy.get('[data-cy=get-values]').click()
    readJson<DatasetValuesLike[]>('values-json').should((datasets) => {
      expect(datasets).to.have.length(1)
      expect(datasets[0].points).to.have.length(0)
    })
  })

  it('emits exactly one update:project and then settles', () => {
    cy.get('[data-cy=clear-log]').click()
    cy.get('[data-cy=reset]').click()

    // INFO: the emptied state is emitted once; the host writing it straight
    // back into the prop must not start a reload/emit loop.
    cy.get('[data-cy=update-count]').should('have.text', '1')
    cy.wait(1200)
    cy.get('[data-cy=update-count]').should('have.text', '1')
    cy.get('[data-cy=change-count]').should('have.text', '1')
    cy.get('[data-cy=ready-count]').should('have.text', '0')
    cy.get('[data-cy=error-codes]').should('have.text', '')
  })
})

describe('host app: exportZip()', () => {
  it('produces a ZIP whose project.json matches the live project', () => {
    visitHostApp()
    calibrateAxes()
    addPoints([
      [200, 200],
      [250, 150],
    ])
    cy.get('.canvas-point').should('have.length', 2)
    cy.wait(600)

    cy.get('[data-cy=export-zip-inspect]').click()
    cy.get('[data-cy=zip-entries]').should(
      'have.text',
      'image.png,project.json',
    )

    readJson<ProjectLike>('zip-project-json').then((zipped) => {
      expect(zipped.version).to.equal('2.0.0')
      readJson<ProjectLike>('project-json').should((live) => {
        expect(zipped.datasets).to.deep.equal(live.datasets)
        expect(zipped.axisSets).to.deep.equal(live.axisSets)
        expect(zipped.activeDatasetId).to.equal(live.activeDatasetId)
        expect(zipped.activeAxisSetId).to.equal(live.activeAxisSetId)
      })
    })
  })

  it('keeps the dataset names and externalId of a loaded project', () => {
    visitHostApp()
    cy.get('[data-cy=load-fixture-method]').click()
    cy.get('.canvas-point').should('have.length', 3)

    cy.get('[data-cy=export-zip-inspect]').click()
    readJson<ProjectLike>('zip-project-json').should((zipped) => {
      expect(zipped.version).to.equal('2.0.0')
      expect(zipped.datasets.map((d) => d.name)).to.deep.equal([
        'Fixture Sample',
        'Fixture Sample 2',
      ])
      expect(zipped.datasets[0].externalId).to.equal('sample-42')
      expect(zipped.axisSets[0].name).to.equal('Fixture Axes')
    })
  })
})
