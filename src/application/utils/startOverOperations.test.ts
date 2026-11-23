import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import {
  START_OVER_ACTION,
  canStartOver,
  startOver,
} from './startOverOperations'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { toAxisSetDTO, toDatasetDTO } from '@/application/dto/converters'
import type { AutoCalibrationProposal } from '@/application/services/autoService/autoServiceWire'
import type { ResearchEvent } from '@/application/services/researchEvents/researchEvents'
import { MANUAL_MODE, POINT_MODE } from '@/constants'

const FAILED_AXIS = {
  ok: false,
  scale: null,
  ticks: [],
  confidence: null,
  residualPx: null,
  failureReason: null,
}
const PROPOSAL: AutoCalibrationProposal = {
  status: 'failed',
  failureReason: null,
  frame: null,
  ySide: 'left',
  x: FAILED_AXIS,
  y: FAILED_AXIS,
}

const snapshot = (ctx: DigitizerContext) =>
  JSON.parse(
    JSON.stringify({
      axisSets: ctx.axisSetRepository.axisSets.map(toAxisSetDTO),
      activeAxisSetId: ctx.axisSetRepository.activeAxisSetId,
      datasets: ctx.datasetRepository.datasets.map(toDatasetDTO),
      activeDatasetId: ctx.datasetRepository.activeDatasetId,
    }),
  )

/** Two calibrated axis sets, two datasets with points, a review, a proposal. */
function digitizeSomething(ctx: DigitizerContext) {
  const first = ctx.axisSetRepository.activeAxisSet
  first.addAxisCoord({ xPx: 10, yPx: 90 })
  first.addAxisCoord({ xPx: 90, yPx: 10 })
  first.setX2Value(100)
  first.setYIsLogScale(true)
  first.pointMode = POINT_MODE.FOUR_POINTS
  ctx.axisSetRepository.createNewAxisSet()
  ctx.axisSetRepository.setActiveAxisSet(ctx.axisSetRepository.lastAxisSetId)
  ctx.axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 5, yPx: 5 })

  ctx.datasetRepository.activeDataset.addPoint(20, 30)
  ctx.datasetRepository.createNewDataset()
  ctx.datasetRepository.lastDataset.addPoint(40, 50)
  ctx.datasetRepository.lastDataset.setAxisSetId(
    ctx.axisSetRepository.lastAxisSetId,
  )
  ctx.datasetRepository.editDatasetName(
    ctx.datasetRepository.lastDatasetId,
    'sample A',
  )
  ctx.datasetRepository.setActiveDataset(ctx.datasetRepository.lastDatasetId)

  ctx.reviewSession.start({ axes: null as never, series: [] }, null, null, [])
  ctx.reviewView.setShowChanges(true)
  ctx.confidenceReview.setCurrent({ datasetId: 2, pointId: 1 })
  ctx.autoFeatures.setProposal(PROPOSAL, 1)
}

describe('startOver', () => {
  let ctx: DigitizerContext
  let fresh: ReturnType<typeof snapshot>

  beforeEach(() => {
    ctx = createDigitizerContext()
    fresh = snapshot(ctx)
  })

  it('does nothing on a fresh project (no empty undo step)', () => {
    expect(canStartOver(ctx)).toBe(false)
    expect(startOver(ctx)).toBe(false)
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  it('counts a lone axis value or an Auto-place proposal as work', () => {
    ctx.axisSetRepository.activeAxisSet.setX2Value(5)
    expect(canStartOver(ctx)).toBe(true)

    const other = createDigitizerContext()
    other.autoFeatures.setProposal(PROPOSAL, 1)
    expect(canStartOver(other)).toBe(true)
  })

  it('brings axes and datasets back to a fresh project and clears the auto state', () => {
    digitizeSomething(ctx)

    expect(startOver(ctx)).toBe(true)

    expect(snapshot(ctx)).toEqual(fresh)
    expect(ctx.axisSetRepository.activeAxisSet.pointMode).toBe(
      POINT_MODE.TWO_POINTS,
    )
    expect(ctx.canvasHandler.manualMode).toBe(MANUAL_MODE.UNSET)
    expect(ctx.reviewSession.isActive).toBe(false)
    expect(ctx.reviewView.showChanges).toBe(false)
    expect(ctx.confidenceReview.current).toBeNull()
    expect(ctx.autoFeatures.proposal).toBeNull()
    expect(canStartOver(ctx)).toBe(false)
  })

  it('keeps the image', () => {
    ctx.canvasHandler.setUploadImageUrl('data:image/png;base64,AAAA')
    ctx.datasetRepository.activeDataset.addPoint(1, 2)

    startOver(ctx)

    expect(ctx.canvasHandler.uploadImageUrl).toBe('data:image/png;base64,AAAA')
  })

  it('is ONE undo step that restores every axis set and dataset', () => {
    digitizeSomething(ctx)
    const before = snapshot(ctx)

    startOver(ctx)
    ctx.historyManager.undo()

    expect(snapshot(ctx)).toEqual(before)
    expect(ctx.historyManager.canUndo).toBe(false)

    ctx.historyManager.redo()
    expect(snapshot(ctx)).toEqual(fresh)
  })

  it('reports one `edit` research event, then the end of the review', () => {
    digitizeSomething(ctx)
    const events: ResearchEvent[] = []
    ctx.researchEvents.setListener((event) => events.push(event))
    const listener = jest.fn()
    ctx.historyManager.subscribe(listener)

    startOver(ctx)

    expect(events.map((event) => event.type)).toEqual(['edit', 'review.end'])
    expect(events[0]).toMatchObject({
      type: 'edit',
      action: START_OVER_ACTION,
    })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'capture',
        action: 'project.start-over',
      }),
    )
  })
})
