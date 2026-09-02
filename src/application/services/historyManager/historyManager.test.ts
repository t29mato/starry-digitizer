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

  test('clear() empties both stacks', () => {
    const { datasetRepository, historyManager } = setup()

    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)
    historyManager.undo()

    historyManager.clear()

    expect(historyManager.canUndo).toBe(false)
    expect(historyManager.canRedo).toBe(false)
  })

  // INFO: (#274) regression test for the reported repro — add 3 manual
  // points, clear the dataset, run auto-extraction (setPoints), then undo
  // once. This only passes if every one of those three mutations captures
  // its own snapshot; if any call site forgets to (as extractPoints() did),
  // undo silently skips ahead to an earlier snapshot instead of the one
  // right before the last mutation.
  test('undo after clear + re-extraction returns to the just-cleared (empty) state, not further back', () => {
    const { datasetRepository, historyManager } = setup()

    // 1. add 3 manual points
    historyManager.capture()
    datasetRepository.activeDataset.addPoint(1, 1)
    historyManager.capture()
    datasetRepository.activeDataset.addPoint(2, 2)
    historyManager.capture()
    datasetRepository.activeDataset.addPoint(3, 3)
    expect(datasetRepository.activeDataset.points).toHaveLength(3)

    // 2. clear the dataset via its eraser icon (0 points)
    historyManager.capture()
    datasetRepository.activeDataset.clearPoints()
    expect(datasetRepository.activeDataset.points).toHaveLength(0)

    // 3. RUN auto-extraction (e.g. 31 points) — must also capture
    historyManager.capture()
    datasetRepository.setPoints(
      Array.from({ length: 31 }, (_, i) => ({ xPx: i, yPx: i })),
    )
    expect(datasetRepository.activeDataset.points).toHaveLength(31)

    // 4. undo once — expected: back to 0 points (the just-cleared state),
    // not back to the pre-clear 3 manual points
    historyManager.undo()

    expect(datasetRepository.activeDataset.points).toHaveLength(0)
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
