import { HistoryManager } from './historyManager'
import { AxisSetRepository } from '@/domain/repositories/axisSetRepository/axisSetRepository'
import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'

const setup = () => {
  const axisSetRepository = new AxisSetRepository()
  const datasetRepository = new DatasetRepository()
  const historyManager = new HistoryManager(
    axisSetRepository,
    datasetRepository,
  )
  return { axisSetRepository, datasetRepository, historyManager }
}

describe('HistoryManager', () => {
  test('canUndo/canRedo are both false right after construction', () => {
    const { historyManager } = setup()

    expect(historyManager.canUndo).toBe(false)
    expect(historyManager.canRedo).toBe(false)
  })

  test('undo restores the point layout captured before a mutation', () => {
    const { datasetRepository, historyManager } = setup()

    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)
    expect(datasetRepository.activeDataset.points).toHaveLength(1)

    historyManager.undo()

    expect(datasetRepository.activeDataset.points).toHaveLength(0)
  })

  test('redo re-applies the mutation that was undone', () => {
    const { datasetRepository, historyManager } = setup()

    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)
    historyManager.undo()

    expect(historyManager.canRedo).toBe(true)
    historyManager.redo()

    expect(datasetRepository.activeDataset.points).toStrictEqual([
      { id: 1, xPx: 1, yPx: 1 },
    ])
  })

  test('capturing a new snapshot discards the redo stack', () => {
    const { datasetRepository, historyManager } = setup()

    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)
    historyManager.undo()
    expect(historyManager.canRedo).toBe(true)

    historyManager.capture()

    expect(historyManager.canRedo).toBe(false)
  })

  test('undo is a no-op when there is nothing to undo', () => {
    const { datasetRepository, historyManager } = setup()

    datasetRepository.activeDataset.addPoint(1, 1)
    historyManager.undo()

    expect(datasetRepository.activeDataset.points).toHaveLength(1)
    expect(historyManager.canUndo).toBe(false)
  })

  test('redo is a no-op when there is nothing to redo', () => {
    const { datasetRepository, historyManager } = setup()

    historyManager.redo()

    expect(datasetRepository.activeDataset.points).toHaveLength(0)
  })

  test('restores axis set coordinates on undo', () => {
    const { axisSetRepository, historyManager } = setup()

    historyManager.capture()
    axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 10, yPx: 20 })
    expect(axisSetRepository.activeAxisSet.x1.coord).toStrictEqual({
      xPx: 10,
      yPx: 20,
    })

    historyManager.undo()

    expect(axisSetRepository.activeAxisSet.x1.coord).toStrictEqual({
      xPx: -999,
      yPx: -999,
    })
  })

  test('externalId survives an undo/redo round trip', () => {
    const { datasetRepository, historyManager } = setup()
    // INFO: externalId is host-owned and opaque; losing it on undo would
    // silently detach the dataset from the host's record.
    datasetRepository.activeDataset.externalId = 'sample-42'

    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)

    historyManager.undo()
    expect(datasetRepository.activeDataset.externalId).toBe('sample-42')

    historyManager.redo()
    expect(datasetRepository.activeDataset.externalId).toBe('sample-42')
    expect(datasetRepository.activeDataset.points).toHaveLength(1)
  })

  test('leaves externalId undefined for datasets that never had one', () => {
    const { datasetRepository, historyManager } = setup()

    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)
    historyManager.undo()

    expect(datasetRepository.activeDataset.externalId).toBeUndefined()
  })

  test('clear() empties both stacks', () => {
    const { datasetRepository, historyManager } = setup()

    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)
    historyManager.undo()

    historyManager.clear()

    expect(historyManager.canUndo).toBe(false)
    expect(historyManager.canRedo).toBe(false)
  })

  test('drops the oldest snapshot once the history exceeds its cap', () => {
    const { datasetRepository, historyManager } = setup()
    const CAP = 50

    for (let i = 0; i < CAP + 5; i++) {
      historyManager.capture()
      datasetRepository.activeDataset.addPoint(i, i)
    }

    for (let i = 0; i < CAP; i++) {
      historyManager.undo()
    }

    // INFO: the earliest 5 captures were evicted, so undo can't go all the
    // way back to an empty dataset.
    expect(datasetRepository.activeDataset.points.length).toBeGreaterThan(0)
    expect(historyManager.canUndo).toBe(false)
  })
})

// INFO: `capture()` is called from the dataset use cases AND from
// CanvasMain.vue, so the notification has to come from the manager itself —
// a host must not have to know which layer asked. These tests pin down what
// is reported and, just as importantly, what is not.
describe('HistoryManager notifications', () => {
  test('capture notifies with the stack state it produced', () => {
    const { historyManager } = setup()
    const listener = jest.fn()
    historyManager.subscribe(listener)

    historyManager.capture()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({
      type: 'capture',
      canUndo: true,
      canRedo: false,
    })
  })

  test('every capture is reported, not just the first', () => {
    // INFO: the reason a listener exists at all — `canUndo` stays true across
    // both captures, so a host watching state alone would see one event where
    // the user made two undoable edits.
    const { datasetRepository, historyManager } = setup()
    const listener = jest.fn()
    historyManager.subscribe(listener)

    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)
    historyManager.capture()
    datasetRepository.activeDataset.addPoint(2, 2)

    expect(listener).toHaveBeenCalledTimes(2)
  })

  test('undo notifies after the state has been restored', () => {
    const { datasetRepository, historyManager } = setup()
    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)
    const pointsWhenNotified: number[] = []
    historyManager.subscribe(() => {
      pointsWhenNotified.push(datasetRepository.activeDataset.points.length)
    })

    historyManager.undo()

    expect(pointsWhenNotified).toStrictEqual([0])
  })

  test('undo and redo report their own type and the resulting flags', () => {
    const { datasetRepository, historyManager } = setup()
    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)
    const listener = jest.fn()
    historyManager.subscribe(listener)

    historyManager.undo()
    expect(listener).toHaveBeenLastCalledWith({
      type: 'undo',
      canUndo: false,
      canRedo: true,
    })

    historyManager.redo()
    expect(listener).toHaveBeenLastCalledWith({
      type: 'redo',
      canUndo: true,
      canRedo: false,
    })
  })

  test('a no-op undo/redo notifies nothing', () => {
    const { historyManager } = setup()
    const listener = jest.fn()
    historyManager.subscribe(listener)

    historyManager.undo()
    historyManager.redo()

    expect(listener).not.toHaveBeenCalled()
  })

  test('clear notifies when it actually discarded history', () => {
    const { datasetRepository, historyManager } = setup()
    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)
    const listener = jest.fn()
    historyManager.subscribe(listener)

    historyManager.clear()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({
      type: 'clear',
      canUndo: false,
      canRedo: false,
    })
  })

  test('clear on empty stacks notifies nothing', () => {
    // INFO: loadProject()/reset() clear on every mount and every project load.
    // Reporting those would have a host discarding its own history for nothing.
    const { historyManager } = setup()
    const listener = jest.fn()
    historyManager.subscribe(listener)

    historyManager.clear()

    expect(listener).not.toHaveBeenCalled()
  })

  test('unsubscribe stops the notifications', () => {
    const { historyManager } = setup()
    const listener = jest.fn()
    const unsubscribe = historyManager.subscribe(listener)

    unsubscribe()
    historyManager.capture()

    expect(listener).not.toHaveBeenCalled()
  })

  test('unsubscribing twice does not drop another listener', () => {
    const { historyManager } = setup()
    const listener = jest.fn()
    const other = jest.fn()
    const unsubscribe = historyManager.subscribe(listener)
    historyManager.subscribe(other)

    unsubscribe()
    unsubscribe()
    historyManager.capture()

    expect(other).toHaveBeenCalledTimes(1)
  })

  test('a listener that unsubscribes during delivery does not skip the next one', () => {
    const { historyManager } = setup()
    const second = jest.fn()
    const unsubscribeFirst = historyManager.subscribe(() => unsubscribeFirst())
    historyManager.subscribe(second)

    historyManager.capture()

    expect(second).toHaveBeenCalledTimes(1)
  })

  test('a throwing listener breaks neither the undo nor the other listeners', () => {
    const { datasetRepository, historyManager } = setup()
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)
    const survivor = jest.fn()
    historyManager.subscribe(() => {
      throw new Error('host bookkeeping blew up')
    })
    historyManager.subscribe(survivor)

    expect(() => historyManager.undo()).not.toThrow()

    expect(datasetRepository.activeDataset.points).toHaveLength(0)
    expect(survivor).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  test('notifies nothing while nobody is subscribed', () => {
    const { historyManager } = setup()

    expect(() => {
      historyManager.capture()
      historyManager.undo()
      historyManager.clear()
    }).not.toThrow()
  })
})
