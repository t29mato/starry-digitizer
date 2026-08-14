import { Confirmer } from './confirmer'

describe('Confirmer', () => {
  test('is inactive with an empty message by default', () => {
    const confirmer = new Confirmer()
    expect(confirmer.isActive).toBe(false)
    expect(confirmer.message).toBe('')
  })

  test('activate sets the message/callbacks and marks the confirmer active', () => {
    const confirmer = new Confirmer()
    const onConfirm = jest.fn()
    const onCancel = jest.fn()

    confirmer.activate({ message: 'Are you sure?', onConfirm, onCancel })

    expect(confirmer.isActive).toBe(true)
    expect(confirmer.message).toBe('Are you sure?')
    expect(confirmer.handleOnConfirm).toBe(onConfirm)
    expect(confirmer.handleOnCancel).toBe(onCancel)
  })

  test('inactivate resets the message/callbacks and marks the confirmer inactive', () => {
    const confirmer = new Confirmer()
    confirmer.activate({
      message: 'Are you sure?',
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    })

    confirmer.inactivate()

    expect(confirmer.isActive).toBe(false)
    expect(confirmer.message).toBe('')
    // INFO: handlers are reset to no-op functions rather than left dangling
    expect(() => confirmer.handleOnConfirm()).not.toThrow()
    expect(() => confirmer.handleOnCancel()).not.toThrow()
  })
})
