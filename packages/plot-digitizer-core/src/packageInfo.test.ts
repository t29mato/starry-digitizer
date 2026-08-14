import { PACKAGE_NAME, getPackageInfo } from './packageInfo'

// INFO: Phase 0 scaffold test — proves the tsconfig/jest/ts-jest pipeline for
// packages/plot-digitizer-core is wired correctly (Red -> Green) before any
// real domain logic is moved in Phase 1.
describe('packageInfo', () => {
  it('exposes the npm package name the core library will be published as', () => {
    expect(PACKAGE_NAME).toBe('plot-digitizer')
  })

  describe('getPackageInfo', () => {
    it('returns the package name and status', () => {
      expect(getPackageInfo()).toEqual({
        name: 'plot-digitizer',
        status: 'pre-alpha',
      })
    })

    it('reports "unpublished" status when the "published" flag is passed as false', () => {
      expect(getPackageInfo({ published: false })).toEqual({
        name: 'plot-digitizer',
        status: 'unpublished',
      })
    })
  })
})
