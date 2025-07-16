/**
 * Jest setup file to configure canvas for jsdom environment
 */

// Try to import canvas package, but provide fallback if it fails
let canvasModule
try {
  canvasModule = require('canvas')
} catch (error) {
  console.warn('Canvas package not available, using basic mocks')
}

// Mock HTMLCanvasElement.getContext to return a working canvas context (only in jsdom environment)
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: function (contextType) {
    if (contextType === '2d') {
      if (canvasModule) {
        // Use the node-canvas library if available
        const canvas = canvasModule.createCanvas(this.width || 300, this.height || 150)
        const ctx = canvas.getContext('2d')
        ctx.canvas = this
        return ctx
      } else {
        // Provide a basic mock context
        return {
          canvas: this,
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
          clearRect: jest.fn(),
          fillRect: jest.fn(),
          strokeRect: jest.fn(),
          beginPath: jest.fn(),
          moveTo: jest.fn(),
          lineTo: jest.fn(),
          stroke: jest.fn(),
          fill: jest.fn(),
          putImageData: jest.fn(),
          getImageData: jest.fn(() => ({
            data: new Uint8ClampedArray(this.width * this.height * 4),
            width: this.width || 300,
            height: this.height || 150
          })),
          drawImage: jest.fn(),
          save: jest.fn(),
          restore: jest.fn(),
          translate: jest.fn(),
          rotate: jest.fn(),
          scale: jest.fn()
        }
      }
    }
    return null
  },
  })
}

// Mock Image constructor (only if not already defined)
if (typeof global.Image === 'undefined') {
  global.Image = class MockImage {
    constructor() {
      this.crossOrigin = null
      this.onload = null
      this.onerror = null
      this.src = ''
      this.width = 0
      this.height = 0
    }
    
    set src(value) {
      this._src = value
      // Simulate immediate loading for data URLs
      setTimeout(() => {
        this.width = 300
        this.height = 150
        if (this.onload) {
          this.onload()
        }
      }, 0)
    }
    
    get src() {
      return this._src
    }
  }
}

// Make sure ImageData is available globally (only if not already defined)
if (typeof global.ImageData === 'undefined') {
  global.ImageData = canvasModule?.ImageData || class MockImageData {
    constructor(width, height) {
      this.width = width
      this.height = height
      this.data = new Uint8ClampedArray(width * height * 4)
    }
  }
}

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL = global.URL || {}
global.URL.createObjectURL = global.URL.createObjectURL || jest.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = global.URL.revokeObjectURL || jest.fn()

// Mock FileReader if needed
global.FileReader = global.FileReader || class FileReader {
  constructor() {
    this.result = null
    this.readyState = 0
    this.onload = null
    this.onerror = null
  }
  
  readAsDataURL() {
    this.readyState = 2
    this.result = 'data:image/png;base64,mock-base64-data'
    if (this.onload) {
      this.onload({ target: this })
    }
  }
  
  readAsArrayBuffer() {
    this.readyState = 2
    this.result = new ArrayBuffer(0)
    if (this.onload) {
      this.onload({ target: this })
    }
  }
}

// Log setup completion with appropriate message based on environment
if (typeof HTMLCanvasElement !== 'undefined') {
  console.log('✅ Jest canvas setup complete - HTMLCanvasElement.getContext and Image are now available (jsdom)')
} else {
  console.log('✅ Jest setup complete - Node.js environment detected')
}