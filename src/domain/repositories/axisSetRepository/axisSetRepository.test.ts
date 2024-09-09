import { expect } from '@jest/globals'
import { AxisSetRepositoryManager } from './manager/axisSetRepositoryManager'

test('Next axisSet ID', () => {
  const axisSetRepository = new AxisSetRepositoryManager().getInstance()
  expect(axisSetRepository.nextAxisSetId).toBe(2)
})

test('Adding an axisSet', () => {
  const axisSetRepository = new AxisSetRepositoryManager().getInstance()
  axisSetRepository.createNewAxisSet()
  expect(axisSetRepository.nextAxisSetId).toBe(3)
})

test('Removing an axisSet', () => {
  const axisSetRepository = new AxisSetRepositoryManager().getInstance()
  axisSetRepository.createNewAxisSet()

  axisSetRepository.removeAxisSet(axisSetRepository.lastAxisSetId)
  expect(axisSetRepository.axisSets).toHaveLength(1)
})
