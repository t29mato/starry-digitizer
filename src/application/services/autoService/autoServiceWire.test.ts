import {
  BACKEND_PIXEL_OFFSET,
  parseCalibrationResponse,
  parseExtractionResponse,
} from './autoServiceWire'
import { DigitizerError } from '@/application/errors'

// INFO: shaped after the example in the wpd-auto backend README ("API")
const calibration = {
  engine: { name: 'real-chart-bench', version: 'v4' },
  image: { width: 640, height: 480 },
  status: 'ok',
  failure_reason: null,
  frames: [
    {
      box: { x0: 80, y0: 30, x1: 610, y1: 420 },
      y_side: 'left',
      axes: {
        x: {
          status: 'ok',
          scale: 'linear',
          ticks: [
            { value: 0, px: 80, x: 80, y: 420 },
            { value: 10, px: 186, x: 186, y: 420 },
            { value: 20, px: 292, x: 292, y: 420 },
          ],
          confidence: 0.92,
          residual_px: 0.4,
          failure_reason: null,
        },
        y: {
          status: 'ok',
          scale: 'log',
          ticks: [
            { value: 1, px: 420, x: 80, y: 420 },
            { value: 100, px: 30, x: 80, y: 30 },
          ],
          confidence: 0.3,
          failure_reason: null,
        },
      },
    },
  ],
}

describe('parseCalibrationResponse', () => {
  test('converts the best frame to digitizer pixels', () => {
    const proposal = parseCalibrationResponse(calibration)
    expect(proposal.status).toBe('ok')
    expect(proposal.frame).toEqual({
      xPx: 80 + BACKEND_PIXEL_OFFSET,
      yPx: 30 + BACKEND_PIXEL_OFFSET,
      widthPx: 530,
      heightPx: 390,
    })
    expect(proposal.x).toMatchObject({
      ok: true,
      scale: 'linear',
      confidence: 0.92,
      residualPx: 0.4,
    })
    expect(proposal.x.ticks[1]).toEqual({ value: 10, px: 186.5 })
    expect(proposal.y.ticks.map((t) => t.px)).toEqual([420.5, 30.5])
    expect(proposal.ySide).toBe('left')
  })

  test('a failed axis makes the proposal partial and keeps the reason', () => {
    const body = JSON.parse(JSON.stringify(calibration))
    body.status = 'partial'
    body.frames[0].axes.y = {
      status: 'failed',
      scale: null,
      ticks: [],
      failure_reason: 'too_few_labels',
    }
    const proposal = parseCalibrationResponse(body)
    expect(proposal.status).toBe('partial')
    expect(proposal.y).toMatchObject({
      ok: false,
      failureReason: 'too_few_labels',
    })
  })

  test('an "ok" axis that cannot be fitted is reported as failed', () => {
    const body = JSON.parse(JSON.stringify(calibration))
    body.frames[0].axes.x.ticks = [{ value: 5, px: 10 }]
    body.frames[0].axes.y.ticks.push({ value: -1, px: 500 })
    const proposal = parseCalibrationResponse(body)
    expect(proposal.x.ok).toBe(false)
    expect(proposal.y.ok).toBe(false)
    expect(proposal.status).toBe('failed')
    expect(proposal.failureReason).toBe('axes_not_calibrated')
  })

  test('no frame at all is a failed proposal, not an exception', () => {
    const proposal = parseCalibrationResponse({
      status: 'failed',
      failure_reason: 'no_axis_frame',
      frames: [],
    })
    expect(proposal).toMatchObject({
      status: 'failed',
      failureReason: 'no_axis_frame',
      frame: null,
    })
  })

  test('a body that is not an object is an AUTO_SERVICE_FAILED error', () => {
    expect(() => parseCalibrationResponse('nope')).toThrow(DigitizerError)
  })
})

describe('parseExtractionResponse', () => {
  test('keeps point scores only when they line up with the points', () => {
    const result = parseExtractionResponse({
      method: 'markernet',
      elapsed_ms: 812,
      series: [
        {
          label: 'circle',
          points: [
            [186, 210.5],
            [200, 220],
          ],
          score: 0.91,
          point_scores: [0.97, 0.2],
          legend_label: ' Bi2Te3 ',
        },
        { label: 'square', points: [[1, 2]], point_scores: [0.5, 0.6] },
        { label: 'empty', points: [] },
        { label: 'broken', points: [['a', 1]] },
      ],
    })
    expect(result.method).toBe('markernet')
    expect(result.elapsedMs).toBe(812)
    expect(result.series).toHaveLength(2)
    expect(result.series[0]).toEqual({
      label: 'circle',
      legendLabel: 'Bi2Te3',
      score: 0.91,
      points: [
        { xPx: 186.5, yPx: 211, score: 0.97 },
        { xPx: 200.5, yPx: 220.5, score: 0.2 },
      ],
    })
    expect(result.series[1].points).toEqual([{ xPx: 1.5, yPx: 2.5 }])
  })

  test('LineFormer-style series without point scores', () => {
    const result = parseExtractionResponse({
      method: 'lineformer',
      series: [{ label: 'line 1', points: [[0, 0]], score: null, point_scores: null }],
    })
    expect(result.series[0]).toMatchObject({ score: null, legendLabel: null })
    expect(result.series[0].points[0].score).toBeUndefined()
  })

  test('no series array is an error', () => {
    expect(() => parseExtractionResponse({})).toThrow(DigitizerError)
  })
})
