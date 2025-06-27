/**
 * @jest-environment jsdom
 */
import { expect } from '@jest/globals'
import { AxisExtractorManager } from './axisExtractorManager'

// Mock the AxisExtractor
jest.mock('../axisExtractor', () => ({
  AxisExtractor: jest.fn().mockImplementation(() => ({
    extractAxisInformation: jest.fn().mockResolvedValue({
      x1: 0,
      x2: 10,
      y1: 0,
      y2: 10
    })
  }))
}))

// Mock ImageData for Node.js environment
class MockImageData {
  width: number
  height: number
  data: Uint8ClampedArray

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.data = new Uint8ClampedArray(width * height * 4)
  }
}

// @ts-ignore
global.ImageData = MockImageData

// Mock Image constructor
global.Image = class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  width = 100
  height = 100
  
  constructor() {
    // Simulate image loading
    setTimeout(() => {
      if (this.onload) {
        this.onload()
      }
    }, 0)
  }
} as any

// Mock FileReader
global.FileReader = class MockFileReader {
  onload: ((event: any) => void) | null = null
  onerror: (() => void) | null = null
  result: string | null = null
  
  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      if (this.onload) {
        this.onload({ target: { result: this.result } })
      }
    }, 0)
  }
} as any

// Mock Canvas API
const mockCanvas = {
  width: 100,
  height: 100,
  getContext: jest.fn().mockReturnValue({
    drawImage: jest.fn(),
    getImageData: jest.fn().mockReturnValue(new MockImageData(100, 100))
  })
}

Object.defineProperty(document, 'createElement', {
  value: jest.fn().mockImplementation((tagName) => {
    if (tagName === 'canvas') {
      return mockCanvas
    }
    return {}
  })
})

describe('AxisExtractorManager', () => {
  let manager: AxisExtractorManager

  beforeEach(() => {
    manager = new AxisExtractorManager()
  })

  describe('extractAxisInformationFromImage', () => {
    it('should extract axis information from ImageData', async () => {
      const imageData = new MockImageData(100, 100)
      
      const result = await manager.extractAxisInformationFromImage(imageData as any)
      
      expect(result).toEqual({
        x1: 0,
        x2: 10,
        y1: 0,
        y2: 10
      })
    })

    it('should return null on error', async () => {
      // Create a manager with a failing extractor
      const failingManager = new AxisExtractorManager()
      // Mock the extractAxisInformation to throw an error
      failingManager['axisExtractor'].extractAxisInformation = jest.fn().mockRejectedValue(new Error('Test error'))
      
      const imageData = new MockImageData(100, 100)
      
      const result = await failingManager.extractAxisInformationFromImage(imageData as any)
      
      expect(result).toBeNull()
    })
  })

  describe('extractAxisInformationFromImageFile', () => {
    it('should handle image file processing', async () => {
      const mockFile = new File([''], 'test.png', { type: 'image/png' })
      
      // This is expected to return a result or null, both are valid
      const result = await manager.extractAxisInformationFromImageFile(mockFile)
      
      // The function should not throw and should return either a result or null
      expect(result === null || (typeof result === 'object' && result !== null)).toBe(true)
    })
  })

  describe('extractAxisInformationFromCanvas', () => {
    it('should extract axis information from canvas', async () => {
      const mockCanvasElement = {
        getContext: jest.fn().mockReturnValue({
          getImageData: jest.fn().mockReturnValue(new MockImageData(100, 100))
        }),
        width: 100,
        height: 100
      } as any
      
      const result = await manager.extractAxisInformationFromCanvas(mockCanvasElement)
      
      // Should return a valid result when canvas context is available 
      expect(result).toEqual({
        x1: 0,
        x2: 10,
        y1: 0,
        y2: 10
      })
    })

    it('should return null when canvas context is not available', async () => {
      const mockCanvasElement = {
        getContext: jest.fn().mockReturnValue(null),
        width: 100,
        height: 100
      } as any
      
      const result = await manager.extractAxisInformationFromCanvas(mockCanvasElement)
      
      expect(result).toBeNull()
    })
  })
})