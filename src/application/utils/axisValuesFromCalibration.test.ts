import { axisValuesAtPoints } from './axisValuesFromCalibration'
import { AutoCalibrationProposal } from '@/application/services/autoService/autoServiceWire'

const axis = (
  ticks: { value: number; px: number }[],
  scale: 'linear' | 'log' = 'linear',
  ok = true,
) => ({
  ok,
  scale,
  ticks,
  confidence: null,
  residualPx: null,
  failureReason: ok ? null : 'no_consistent_fit',
})

// INFO: x: 450 at 100 px, 50 per 100 px; y: 0 at 400 px, 10 per -100 px
const proposal = (
  y = axis([
    { value: 0, px: 400 },
    { value: 10, px: 300 },
    { value: 20, px: 200 },
  ]),
): AutoCalibrationProposal => ({
  status: 'ok',
  failureReason: null,
  frame: null,
  ySide: 'left',
  x: axis([
    { value: 450, px: 100 },
    { value: 500, px: 200 },
    { value: 550, px: 300 },
  ]),
  y,
})

describe('axisValuesAtPoints', () => {
  test('a point placed on a tick, even one the service did not read, gets that tick value', () => {
    expect(
      axisValuesAtPoints(proposal(), {
        x1: { xPx: 100.4, yPx: 400 },
        // INFO: 850 is outside the read ticks; still on their grid
        x2: { xPx: 699.6, yPx: 400 },
        y1: { xPx: 50, yPx: 400.3 },
        y2: { xPx: 50, yPx: 100 },
      }),
    ).toEqual({ x1: 450, x2: 750, y1: 0, y2: 30 })
  })

  test('between ticks the fitted value is kept', () => {
    expect(
      axisValuesAtPoints(proposal(), { x1: { xPx: 150, yPx: 0 } }).x1,
    ).toBe(475)
  })

  test('decimal ticks come out without float noise', () => {
    const values = axisValuesAtPoints(
      proposal(
        axis([
          { value: 0.2, px: 400 },
          { value: 0.4, px: 300 },
          { value: 0.6, px: 200 },
        ]),
      ),
      { y1: { xPx: 0, yPx: 100 } },
    )
    expect(values.y1).toBe(0.8)
  })

  test('a log axis snaps to its decades', () => {
    const values = axisValuesAtPoints(
      proposal(
        axis(
          [
            { value: 1, px: 400 },
            { value: 10, px: 300 },
            { value: 100, px: 200 },
          ],
          'log',
        ),
      ),
      { y1: { xPx: 0, yPx: 99.5 } },
    )
    expect(values.y1).toBe(1000)
  })

  test('an axis the service did not calibrate, and points not placed, are left out', () => {
    expect(
      axisValuesAtPoints(proposal(axis([], 'linear', false)), {
        x1: { xPx: 100, yPx: 0 },
        y1: { xPx: 0, yPx: 400 },
      }),
    ).toEqual({ x1: 450 })
  })
})
