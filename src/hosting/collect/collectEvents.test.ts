import { createDigitizerContext } from '@/application/digitizerContext'
import { ResearchEvents } from '@/application/services/researchEvents/researchEvents'
import type { ResearchEvent } from '@/application/services/researchEvents/researchEvents'
import { POINT_MODE } from '@/constants'
import {
  axisSetCalibration,
  calibrationKey,
  calibrationMode,
  forwardedResearchEvent,
  uiErrorData,
  uiMessageData,
  UI_MESSAGE_MAX_LENGTH,
} from './collectEvents'

function emitted(payload: Parameters<ResearchEvents['emit']>[0]) {
  const events: ResearchEvent[] = []
  const hook = new ResearchEvents(
    () => null,
    () => new Date('2026-11-23T00:00:00Z'),
  )
  hook.setListener((e) => events.push(e))
  hook.emit(payload)
  return events[0]
}

describe('forwardedResearchEvent', () => {
  it('sends the library events by their own type, without the envelope', () => {
    expect(
      forwardedResearchEvent(
        emitted({
          type: 'review.step',
          direction: 1,
          found: true,
          score: 0.2,
          threshold: 0.5,
        }),
      ),
    ).toEqual({
      type: 'review.step',
      data: {
        direction: 1,
        found: true,
        score: 0.2,
        threshold: 0.5,
        review_t_ms: null,
        sd_seq: 1,
      },
    })
  })

  it('leaves the automatic features and exports to the host', () => {
    expect(
      forwardedResearchEvent(
        emitted({
          type: 'export',
          kind: 'copy',
          scope: 'dataset',
          datasets: 1,
          points: 3,
        }),
      ),
    ).toBeNull()
  })
})

describe('axisSetCalibration', () => {
  it('two-points mode: x2 and y2 sit on the shared marker', () => {
    const axisSet = createDigitizerContext().axisSetRepository.activeAxisSet
    axisSet.pointMode = POINT_MODE.TWO_POINTS
    axisSet.x1.coord = { xPx: 10, yPx: 100 }
    axisSet.x2y2.coord = { xPx: 90, yPx: 20 }
    axisSet.y1.coord = { xPx: 10, yPx: 100 }
    axisSet.setX2Value(5)
    axisSet.setY2Value(50)
    expect(axisSetCalibration(axisSet).points).toEqual([
      { label: 'X1', px: 10, py: 100, value: expect.any(Number) },
      { label: 'X2', px: 90, py: 20, value: 5 },
      { label: 'Y1', px: 10, py: 100, value: expect.any(Number) },
      { label: 'Y2', px: 90, py: 20, value: 50 },
    ])
    expect(axisSetCalibration(axisSet).point_mode).toBe('two_points')
  })

  it('mode: manual without Auto-place, auto when unchanged, edit after a change', () => {
    const axisSet = createDigitizerContext().axisSetRepository.activeAxisSet
    axisSet.x1.coord = { xPx: 10, yPx: 100 }
    const auto = calibrationKey(axisSet)
    expect(calibrationMode(auto, null)).toBe('manual')
    expect(calibrationMode(calibrationKey(axisSet), auto)).toBe('auto')
    axisSet.setXIsLogScale(true)
    expect(calibrationMode(calibrationKey(axisSet), auto)).toBe('edit')
  })
})

describe('ui.error / ui.message', () => {
  const view = { sha256: null, width: 0, height: 0 }

  it('carries the place, the code and the shown text only', () => {
    expect(
      uiErrorData(
        { where: 'digitizer', code: 'ZIP_INVALID', message: 'Bad ZIP' },
        view,
      ),
    ).toEqual({
      where: 'digitizer',
      code: 'ZIP_INVALID',
      message: 'Bad ZIP',
      view,
    })
    expect(
      uiMessageData({ where: 'auto_extraction.import', message: 'ok' }, view),
    ).toEqual({ where: 'auto_extraction.import', message: 'ok', view })
  })

  it('cuts a long message at 500 characters', () => {
    const long = 'x'.repeat(UI_MESSAGE_MAX_LENGTH + 20)
    expect(UI_MESSAGE_MAX_LENGTH).toBe(500)
    expect(
      uiErrorData({ where: 'w', code: null, message: long }, view).message,
    ).toHaveLength(500)
    expect(
      uiMessageData({ where: 'w', message: long }, view).message,
    ).toHaveLength(500)
  })
})
