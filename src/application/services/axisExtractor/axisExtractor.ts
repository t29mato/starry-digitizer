import {
  AxisExtractorInterface,
  AxisExtractionResult,
  DetectedAxis,
  DetectedRegion,
} from './axisExtractorInterface'
import Tesseract from 'tesseract.js'

// Declare cv as global variable that will be loaded dynamically
declare global {
  interface Window {
    cv: any
  }
}

export class AxisExtractor implements AxisExtractorInterface {
  private isOpenCVReady = false
  private isTestEnvironment = false

  constructor() {
    this.isTestEnvironment = this.detectTestEnvironment()
    if (!this.isTestEnvironment) {
      this.initializeOpenCV().catch(() => {
        this.isOpenCVReady = false
      })
    }
  }

  private detectTestEnvironment(): boolean {
    return (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      typeof process !== 'undefined' && 
      (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined)
    )
  }

  private async initializeOpenCV(): Promise<void> {
    try {
      // Skip OpenCV initialization in test environment
      if (this.isTestEnvironment) {
        this.isOpenCVReady = false
        return
      }

      // Load OpenCV.js dynamically
      if (!window.cv) {
        await this.loadOpenCV()
      }

      if (typeof window.cv !== 'undefined' && window.cv.Mat) {
        this.isOpenCVReady = true
      } else {
        // OpenCV might not be fully loaded yet
        await new Promise((resolve) => {
          const checkOpenCV = () => {
            if (typeof window.cv !== 'undefined' && window.cv.Mat) {
              this.isOpenCVReady = true
              resolve(void 0)
            } else {
              setTimeout(checkOpenCV, 100)
            }
          }
          checkOpenCV()
        })
      }
    } catch (error) {
      this.isOpenCVReady = false
    }
  }

  private async loadOpenCV(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Skip in non-browser environments or test environment
      if (this.isTestEnvironment) {
        reject(new Error('OpenCV.js requires a browser environment'))
        return
      }

      // Check if OpenCV is already loaded
      if (window.cv) {
        resolve()
        return
      }

      // Create script element
      const script = document.createElement('script')
      // Use CDN for OpenCV.js to avoid module loading issues
      script.src = 'https://docs.opencv.org/4.8.0/opencv.js'
      script.async = true

      script.onload = () => {
        // OpenCV.js may take time to initialize after script load
        const waitForOpenCV = () => {
          if (window.cv && window.cv.Mat && window.cv.matFromImageData) {
            resolve()
          } else {
            setTimeout(waitForOpenCV, 100)
          }
        }
        // Give it a moment then start checking
        setTimeout(waitForOpenCV, 200)
      }

      script.onerror = () => {
        reject(new Error('Failed to load OpenCV.js'))
      }

      document.head.appendChild(script)
    })
  }

  async extractAxisInformation(
    imageData: ImageData,
  ): Promise<AxisExtractionResult | null> {
    if (!imageData) {
      throw new Error('Invalid image data provided')
    }

    try {
      // Wait for OpenCV to be ready
      await this.waitForOpenCV()

      // Step 1: Detect axes using OpenCV
      const detectedAxes = await this.detectAxes(imageData)

      if (!detectedAxes.horizontalAxis && !detectedAxes.verticalAxis) {
        return null
      }

      // Step 2: Extract tick values from detected axes
      let x1 = 0,
        x2 = 1,
        y1 = 0,
        y2 = 1
      let horizontalRegion: DetectedRegion | undefined
      let verticalRegion: DetectedRegion | undefined

      if (detectedAxes.horizontalAxis) {
        const extractionResult = await this.extractTickValuesWithRegion(
          imageData,
          detectedAxes.horizontalAxis,
          'horizontal',
        )
        horizontalRegion = extractionResult.region
        if (extractionResult.values.length >= 2) {
          x1 = Math.min(...extractionResult.values)
          x2 = Math.max(...extractionResult.values)
        }
      }

      if (detectedAxes.verticalAxis) {
        const extractionResult = await this.extractTickValuesWithRegion(
          imageData,
          detectedAxes.verticalAxis,
          'vertical',
        )
        verticalRegion = extractionResult.region
        if (extractionResult.values.length >= 2) {
          y1 = Math.min(...extractionResult.values)
          y2 = Math.max(...extractionResult.values)
        }
      }

      return { x1, x2, y1, y2, horizontalRegion, verticalRegion }
    } catch (error) {
      console.error('Error extracting axis information:', error)
      return null
    }
  }

  async detectAxes(imageData: ImageData): Promise<DetectedAxis> {
    if (!this.isOpenCVReady || this.isTestEnvironment || !window?.cv) {
      return {}
    }

    try {
      // Convert ImageData to OpenCV Mat
      const src = window.cv.matFromImageData(imageData)
      const gray = new window.cv.Mat()
      const edges = new window.cv.Mat()
      const lines = new window.cv.Mat()

      // Convert to grayscale
      window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY)

      // Apply edge detection
      window.cv.Canny(gray, edges, 50, 150)

      // Detect lines using HoughLinesP
      window.cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 50, 50, 10)

      const detectedAxes: DetectedAxis = {}

      // Find horizontal and vertical lines
      for (let i = 0; i < lines.rows; i++) {
        const x1 = lines.data32S[i * 4]
        const y1 = lines.data32S[i * 4 + 1]
        const x2 = lines.data32S[i * 4 + 2]
        const y2 = lines.data32S[i * 4 + 3]

        const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
        const isHorizontal = Math.abs(angle) < 15 || Math.abs(angle - 180) < 15
        const isVertical =
          Math.abs(angle - 90) < 15 || Math.abs(angle + 90) < 15

        if (isHorizontal) {
          const lineY = (y1 + y2) / 2
          if (
            !detectedAxes.horizontalAxis ||
            lineY > detectedAxes.horizontalAxis.y
          ) {
            // Keep the bottommost horizontal line
            detectedAxes.horizontalAxis = {
              x1: Math.min(x1, x2),
              x2: Math.max(x1, x2),
              y: lineY,
            }
          }
        }

        if (isVertical) {
          const lineX = (x1 + x2) / 2
          if (
            !detectedAxes.verticalAxis ||
            lineX < detectedAxes.verticalAxis.x
          ) {
            // Keep the leftmost vertical line
            detectedAxes.verticalAxis = {
              x: lineX,
              y1: Math.min(y1, y2),
              y2: Math.max(y1, y2),
            }
          }
        }
      }

      // Clean up
      src.delete()
      gray.delete()
      edges.delete()
      lines.delete()

      return detectedAxes
    } catch (error) {
      console.error('Error detecting axes:', error)
      return {}
    }
  }

  async extractTickValuesWithRegion(
    imageData: ImageData,
    axis: any,
    orientation: 'horizontal' | 'vertical',
  ): Promise<{ values: number[]; region: DetectedRegion }> {
    try {
      // In test environment, return empty results
      if (this.isTestEnvironment) {
        return {
          values: [],
          region: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            extractedText: '',
            extractedValues: [],
          },
        }
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      let roiImageData: ImageData
      let regionInfo: { x: number; y: number; width: number; height: number }

      if (orientation === 'horizontal') {
        // Use 8% of image height for X-axis tick region (academic paper standard)
        const roiHeight = Math.floor(imageData.height * 0.08)
        const roiY = Math.min(
          axis.y + Math.floor(imageData.height * 0.005),
          imageData.height - roiHeight,
        )
        const roiX = axis.x1
        const roiWidth = imageData.width - axis.x1

        canvas.width = roiWidth
        canvas.height = roiHeight
        regionInfo = { x: roiX, y: roiY, width: roiWidth, height: roiHeight }

        ctx.putImageData(imageData, -roiX, -roiY)
        roiImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      } else {
        // Use 12% of image width for Y-axis tick region (academic paper standard)
        const desiredRoiWidth = Math.floor(imageData.width * 0.12)
        // Ensure Y-axis detection region stays to the left of the axis
        const minWidth = Math.floor(imageData.width * 0.05) // Minimum 5% width
        const maxRoiWidth = Math.max(
          axis.x - Math.floor(imageData.width * 0.02),
          minWidth,
        )
        const roiWidth = Math.min(desiredRoiWidth, maxRoiWidth)
        const roiX = axis.x - roiWidth
        const roiY = 0
        const roiHeight = axis.y2

        canvas.width = roiWidth
        canvas.height = roiHeight
        regionInfo = { x: roiX, y: roiY, width: roiWidth, height: roiHeight }

        ctx.putImageData(imageData, -roiX, -roiY)
        roiImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      }

      const canvas2 = document.createElement('canvas')
      const ctx2 = canvas2.getContext('2d')!
      canvas2.width = roiImageData.width
      canvas2.height = roiImageData.height
      ctx2.putImageData(roiImageData, 0, 0)

      const result = await Tesseract.recognize(canvas2, 'eng', {
        logger: () => {},
      } as any)

      const numbers: number[] = []
      const confidenceThreshold = 40

      // Extract numbers from OCR result with confidence filtering
      if (result.data.confidence >= confidenceThreshold) {
        console.log('OCR Result:', result.data)
        const lines = result.data.text.split('\n')
        for (const line of lines) {
          const matches = line.match(/-?\d*\.?\d+/g)
          if (matches) {
            for (const match of matches) {
              const num = parseFloat(match)
              if (!isNaN(num)) {
                numbers.push(num)
              }
            }
          }
        }
      }

      const detectedRegion: DetectedRegion = {
        x: regionInfo.x,
        y: regionInfo.y,
        width: regionInfo.width,
        height: regionInfo.height,
        extractedText: result.data.text.trim(),
        extractedValues: [...numbers].sort((a, b) => a - b),
        axisPosition:
          orientation === 'horizontal' ? { y: axis.y } : { x: axis.x },
      }

      return {
        values: [...numbers].sort((a, b) => a - b),
        region: detectedRegion,
      }
    } catch (error) {
      console.error('Error extracting tick values:', error)
      return {
        values: [],
        region: {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          extractedText: '',
          extractedValues: [],
        },
      }
    }
  }

  async extractTickValues(
    imageData: ImageData,
    axis: any,
    orientation: 'horizontal' | 'vertical',
  ): Promise<number[]> {
    const result = await this.extractTickValuesWithRegion(
      imageData,
      axis,
      orientation,
    )
    return result.values
  }

  private async waitForOpenCV(): Promise<void> {
    if (this.isOpenCVReady) return

    // In test environment, don't wait for OpenCV
    if (this.isTestEnvironment) {
      return
    }

    return new Promise((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 50

      const checkOpenCV = () => {
        attempts++
        if (this.isOpenCVReady) {
          resolve()
        } else if (attempts >= maxAttempts) {
          reject(new Error('OpenCV failed to initialize'))
        } else {
          setTimeout(checkOpenCV, 100)
        }
      }

      checkOpenCV()
    })
  }
}
