import { createDigitizerContext } from '@/application/digitizerContext'
import {
  createEmptyProject,
  migrateProject,
  PROJECT_DTO_VERSION,
} from '@/application/dto/projectDTO'
import { StarrydataRef, normalizeStarrydataRef } from './starrydataRef'

describe('StarrydataRef', () => {
  it('counts typed changes only, not restores', () => {
    const ref = new StarrydataRef()
    ref.set({ sid: '12345' })
    ref.set({ sid: '12345' })
    ref.set({ figure: '3(b)' })
    expect(ref.edits).toBe(2)
    ref.restore({ sid: '1', figure: '2' })
    expect(ref).toMatchObject({ sid: '1', figure: '2', edits: 2 })
    ref.clear()
    expect(ref).toMatchObject({ sid: '', figure: '', edits: 2 })
  })

  it('saves trimmed values within the limits, nothing when empty', () => {
    const ref = new StarrydataRef()
    expect(ref.toDTO()).toBeUndefined()
    ref.set({ sid: '  ', figure: ' ' })
    expect(ref.toDTO()).toBeUndefined()
    ref.set({ sid: ` ${'9'.repeat(40)} `, figure: ' 3(b) ' })
    expect(ref.toDTO()).toEqual({ sid: '9'.repeat(32), figure: '3(b)' })
  })

  it('normalizes what is not a string to empty', () => {
    expect(normalizeStarrydataRef({ sid: 12345, figure: null })).toEqual({
      sid: '',
      figure: '',
    })
  })
})

describe('ProjectDTO.starrydata', () => {
  it('is optional and leaves the version alone', () => {
    const migrated = migrateProject(createEmptyProject())
    expect('starrydata' in migrated).toBe(false)
    expect(migrated.version).toBe(PROJECT_DTO_VERSION)
  })

  it('keeps a usable value and drops a malformed or empty one', () => {
    const withRef = (starrydata: unknown) =>
      migrateProject({ ...createEmptyProject(), starrydata }).starrydata
    expect(withRef({ sid: ' 12345 ', figure: '3(b)' })).toEqual({
      sid: '12345',
      figure: '3(b)',
    })
    expect(withRef({ sid: '12345' })).toEqual({ sid: '12345', figure: '' })
    expect(withRef('12345')).toBeUndefined()
    expect(withRef({ sid: '', figure: '  ' })).toBeUndefined()
  })

  it('goes round a save and a load of the digitizer', () => {
    const ctx = createDigitizerContext()
    const before = ctx.projectService.revision
    ctx.starrydataRef.set({ sid: '12345', figure: '3(b)' })
    expect(ctx.projectService.revision).not.toBe(before)
    const saved = ctx.projectService.toProjectDTO()
    expect(saved.starrydata).toEqual({ sid: '12345', figure: '3(b)' })

    const other = createDigitizerContext()
    other.projectService.restoreProject(JSON.parse(JSON.stringify(saved)))
    expect(other.starrydataRef).toMatchObject({
      sid: '12345',
      figure: '3(b)',
      edits: 0,
    })
    // INFO: a project without the fields empties them
    other.projectService.restoreProject(createEmptyProject())
    expect(other.starrydataRef.sid).toBe('')
  })

  it('is not undone with the points', () => {
    const ctx = createDigitizerContext()
    ctx.historyManager.capture('point.add')
    ctx.datasetRepository.activeDataset.addPoint(1, 2)
    ctx.starrydataRef.set({ sid: '7' })
    ctx.historyManager.undo()
    expect(ctx.starrydataRef.sid).toBe('7')
  })
})
