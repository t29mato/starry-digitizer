import { parseComponentsResponse } from './autoServiceWire'
import { DigitizerError } from '@/application/errors'
// INFO: the real answer of the wpd-auto backend (feat/client-capabilities,
// VERSION 0.3.0) run in this VM on 2026-11-23: no weights (MarkerNet
// `weights_missing`), no LineFormer service (`not configured`), no Ollama
import realAnswer from './fixtures/wpd-auto-components-0.3.0.json'

describe('parseComponentsResponse', () => {
  test('reads the real wpd-auto 0.3.0 answer', () => {
    const info = parseComponentsResponse(realAnswer)

    expect(info.format).toBe(2)
    expect(info.digest).toBe('eec65e64f004')
    expect(info.app).toEqual({
      name: 'wpd-auto backend',
      version: '0.3.0',
      build: null,
      commit: null,
      environment: null,
      deployedAt: null,
    })
    expect(info.components.map((c) => c.id)).toEqual([
      'calibration',
      'ocr',
      'upscale',
      'legend',
      'markernet',
      'lineformer',
      'legend_reader',
      'vlm',
      'runtime',
    ])

    const calibration = info.components[0]
    expect(calibration).toMatchObject({
      name: 'real-chart-bench',
      publicName: 'Starrydata PlotRuler',
      componentId: 'rcb-axis/v4@4850d1f',
      version: 'v4',
      status: 'ok',
    })
    expect(calibration.details.source_commit).toBe(
      '4850d1f7204e824d1c967f93e4fec627c2ee8c54',
    )

    const lineformer = info.components.find((c) => c.id === 'lineformer')
    expect(lineformer).toMatchObject({
      componentId: null,
      version: null,
      status: 'not configured',
      details: {},
    })
    expect(info.components.find((c) => c.id === 'markernet')?.status).toBe(
      'weights_missing',
    )
  })

  test('keeps only the flat part of details and drops entries that name nothing', () => {
    const info = parseComponentsResponse({
      components: [
        {
          id: 'markernet',
          component_id: 'markernet/real-b1@18f21c15',
          details: {
            weights_sha256: 'ab'.repeat(32),
            loaded: false,
            long_side: 1024,
            config: { threshold: 0.4 },
            list: [1, 2],
          },
        },
        { role: 'nothing else' },
        'not an object',
        null,
      ],
    })

    expect(info.components).toHaveLength(1)
    expect(info.components[0].details).toEqual({
      weights_sha256: 'ab'.repeat(32),
      loaded: false,
      long_side: 1024,
    })
    expect(info.components[0].name).toBeNull()
    expect(info.app).toBeNull()
    expect(info.format).toBeNull()
    expect(info.digest).toBeNull()
  })

  test('a numeric build is shown as text', () => {
    const info = parseComponentsResponse({
      app: { version: '0.3.1', build: 42, commit: 'abc1234' },
      components: [],
    })
    expect(info.app?.build).toBe('42')
  })

  test.each([null, 'x', [], {}, { components: {} }])(
    'refuses a body without a components array (%p)',
    (body) => {
      expect(() => parseComponentsResponse(body)).toThrow(DigitizerError)
    },
  )
})
