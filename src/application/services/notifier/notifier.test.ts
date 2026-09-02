import { Notifier } from './notifier'

describe('Notifier', () => {
  test('is inactive by default', () => {
    const notifier = new Notifier()

    expect(notifier.isActive).toBe(false)
    expect(notifier.message).toBe('')
  })

  test('success() activates with the success type', () => {
    const notifier = new Notifier()

    notifier.success('Symbol Extract: 10 points')

    expect(notifier.isActive).toBe(true)
    expect(notifier.message).toBe('Symbol Extract: 10 points')
    expect(notifier.type).toBe('success')
  })

  test('error() activates with the error type', () => {
    const notifier = new Notifier()

    notifier.error('Failed to copy to clipboard')

    expect(notifier.isActive).toBe(true)
    expect(notifier.message).toBe('Failed to copy to clipboard')
    expect(notifier.type).toBe('error')
  })

  test('warning() activates with the warning type', () => {
    const notifier = new Notifier()

    notifier.warning('No text found')

    expect(notifier.isActive).toBe(true)
    expect(notifier.message).toBe('No text found')
    expect(notifier.type).toBe('warning')
  })

  test('info() activates with the info type', () => {
    const notifier = new Notifier()

    notifier.info('Some info')

    expect(notifier.isActive).toBe(true)
    expect(notifier.message).toBe('Some info')
    expect(notifier.type).toBe('info')
  })

  test('inactivate() deactivates the notifier without clearing the message', () => {
    const notifier = new Notifier()
    notifier.success('done')

    notifier.inactivate()

    expect(notifier.isActive).toBe(false)
    expect(notifier.message).toBe('done')
  })
})
