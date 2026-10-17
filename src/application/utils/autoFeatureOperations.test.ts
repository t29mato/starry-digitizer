import {
  configureAutoService,
  dataUrlToBlob,
  refreshAutoFeatures,
  requireAutoFeature,
} from './autoFeatureOperations'
import { createDigitizerContext } from '@/application/digitizerContext'
import { AutoService } from '@/application/services/autoService/autoService'
import { DigitizerError } from '@/application/errors'

const serviceAnswering = (
  capabilities: () => Promise<readonly string[]>,
): AutoService => ({
  capabilities,
  calibrate: jest.fn(),
  extract: jest.fn(),
})

// INFO: Starrydata2 v4 board P5 — the features are shown only when the
// backend lists them; every failure hides them WITHOUT an error.
describe('auto feature gating', () => {
  test('nothing is shown until a service is configured', () => {
    const ctx = createDigitizerContext()
    expect(ctx.autoFeatures.features).toEqual([])
    expect(ctx.autoFeatures.canAutoPlace).toBe(false)
    expect(ctx.autoFeatures.canExtract).toBe(false)
  })

  test('shows exactly the known features the service lists', async () => {
    const ctx = createDigitizerContext()
    await configureAutoService(
      ctx,
      serviceAnswering(async () => ['markernet', 'teleport', 'markernet']),
    )
    expect(ctx.autoFeatures.features).toEqual(['markernet'])
    expect(ctx.autoFeatures.canExtract).toBe(true)
    expect(ctx.autoFeatures.canAutoPlace).toBe(false)
    expect(ctx.autoFeatures.checked).toBe(true)
  })

  test.each([
    ['a rejection (unreachable, 401/403, 5xx)', () => Promise.reject(new Error('403'))],
    ['an answer that is not a list', () => Promise.resolve('all' as unknown as string[])],
  ])('%s hides everything quietly', async (_label, capabilities) => {
    const ctx = createDigitizerContext()
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      configureAutoService(ctx, serviceAnswering(capabilities)),
    ).resolves.toBeUndefined()
    expect(ctx.autoFeatures.features).toEqual([])
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })

  test('a capabilities answer that never comes hides everything after the timeout', async () => {
    jest.useFakeTimers()
    try {
      const ctx = createDigitizerContext()
      ctx.autoFeatures.setService(
        serviceAnswering(() => new Promise<string[]>(() => {})),
      )
      const refreshed = refreshAutoFeatures(ctx, 3000)
      jest.advanceTimersByTime(3000)
      await expect(refreshed).resolves.toEqual([])
      expect(ctx.autoFeatures.checked).toBe(true)
    } finally {
      jest.useRealTimers()
    }
  })

  test('an answer for a replaced service is dropped', async () => {
    const ctx = createDigitizerContext()
    let answerOld: (value: string[]) => void = () => {}
    const old = serviceAnswering(
      () => new Promise<string[]>((resolve) => (answerOld = resolve)),
    )
    const pending = configureAutoService(ctx, old)
    await configureAutoService(ctx, serviceAnswering(async () => []))
    answerOld(['auto_axis'])
    await pending
    expect(ctx.autoFeatures.features).toEqual([])
  })

  test('removing the service hides the features again', async () => {
    const ctx = createDigitizerContext()
    await configureAutoService(ctx, serviceAnswering(async () => ['auto_axis']))
    expect(ctx.autoFeatures.canAutoPlace).toBe(true)
    await configureAutoService(ctx, null)
    expect(ctx.autoFeatures.canAutoPlace).toBe(false)
    expect(ctx.autoFeatures.service).toBeNull()
  })

  test('an HTTP config builds the built-in client', async () => {
    const ctx = createDigitizerContext()
    await configureAutoService(ctx, {
      baseUrl: '/relay',
      features: ['lineformer'],
    })
    expect(ctx.autoFeatures.features).toEqual(['lineformer'])
  })

  test('requireAutoFeature refuses a feature that was not granted', async () => {
    const ctx = createDigitizerContext()
    await configureAutoService(ctx, serviceAnswering(async () => ['markernet']))
    expect(() => requireAutoFeature(ctx, 'lineformer')).toThrow(DigitizerError)
    expect(requireAutoFeature(ctx, 'markernet')).toBe(ctx.autoFeatures.service)
  })
})

describe('dataUrlToBlob', () => {
  test('decodes a base64 data URL with its type', async () => {
    const blob = dataUrlToBlob('data:image/png;base64,aGVsbG8=')
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBe(5)
  })

  test('rejects anything that is not a data URL', () => {
    expect(() => dataUrlToBlob('https://example.com/a.png')).toThrow(
      DigitizerError,
    )
  })
})
