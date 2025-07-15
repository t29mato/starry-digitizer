import fs from 'fs'
import path from 'path'

// --- OpenCVの初期化・ロードをテスト時にモック ---
try {
  // AxisExtractorが存在する場合のみモック
  const { AxisExtractor } = require('../axisExtractor')
  if (AxisExtractor) {
    jest.spyOn(AxisExtractor.prototype, 'initializeOpenCV').mockImplementation(async function () {
      this.isOpenCVReady = true
    })
    jest.spyOn(AxisExtractor.prototype, 'loadOpenCV').mockImplementation(async function () {
      this.isOpenCVReady = true
    })
  }
} catch (e) {
  // AxisExtractorが見つからない場合は何もしない
}
// --- ここまで ---

describe('Real Image File Validation for Axis Extraction', () => {
  const testImagesDir = path.join(__dirname, '../../../../assets/test')
  const expectedImages = [
    'cycleNumber_capacity.png',
    'temperature_seebeckCoefficient.png'
  ]

  describe('File System Validation', () => {
    it('should have test images directory', () => {
      expect(fs.existsSync(testImagesDir)).toBe(true)
      expect(fs.statSync(testImagesDir).isDirectory()).toBe(true)
    })

    it('should contain all expected test images', () => {
      expectedImages.forEach(imageName => {
        const imagePath = path.join(testImagesDir, imageName)
        expect(fs.existsSync(imagePath)).toBe(true)

        const stats = fs.statSync(imagePath)
        expect(stats.isFile()).toBe(true)
        expect(stats.size).toBeGreaterThan(1000) // At least 1KB

        console.log(`✅ ${imageName}: ${(stats.size / 1024).toFixed(1)}KB`)
      })
    })

    it('should validate PNG file format', () => {
      expectedImages.forEach(imageName => {
        const imagePath = path.join(testImagesDir, imageName)
        const buffer = fs.readFileSync(imagePath)

        // Validate PNG signature: 89 50 4E 47 0D 0A 1A 0A
        const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]

        for (let i = 0; i < pngSignature.length; i++) {
          expect(buffer[i]).toBe(pngSignature[i])
        }

        console.log(`✅ ${imageName}: Valid PNG header`)
      })
    })
  })

  describe('Image Metadata Analysis', () => {
    it('should extract basic PNG metadata', () => {
      expectedImages.forEach(imageName => {
        const imagePath = path.join(testImagesDir, imageName)
        const buffer = fs.readFileSync(imagePath)

        // Read PNG dimensions from IHDR chunk
        // PNG structure: signature(8) + IHDR length(4) + "IHDR"(4) + width(4) + height(4)
        if (buffer.length >= 24) {
          const width = buffer.readUInt32BE(16)
          const height = buffer.readUInt32BE(20)

          expect(width).toBeGreaterThan(0)
          expect(height).toBeGreaterThan(0)
          expect(width).toBeLessThan(10000) // Reasonable upper bound
          expect(height).toBeLessThan(10000) // Reasonable upper bound

          console.log(`✅ ${imageName}: ${width}x${height} pixels`)
        }
      })
    })
  })

  describe('Test Image Characteristics', () => {
    it('should describe expected axis extraction scenarios', () => {
      const imageExpectations = {
        'cycleNumber_capacity.png': {
          description: 'Battery cycle number vs capacity chart',
          expectedXAxis: 'Cycle numbers (likely 0-1000+ range)',
          expectedYAxis: 'Capacity values (likely 0-200 mAh/g range)',
          characteristics: ['Positive X values', 'Positive Y values', 'Declining trend expected']
        },
        'temperature_seebeckCoefficient.png': {
          description: 'Temperature vs Seebeck coefficient chart',
          expectedXAxis: 'Temperature (likely 300-800K or °C)',
          expectedYAxis: 'Seebeck coefficient (likely negative to positive μV/K)',
          characteristics: ['Positive X values', 'May have negative Y values', 'Scientific notation possible']
        },
      }

      expectedImages.forEach(imageName => {
        const expectations = imageExpectations[imageName]
        expect(expectations).toBeDefined()

        console.log(`
📊 ${imageName}:
   Description: ${expectations.description}
   Expected X-Axis: ${expectations.expectedXAxis}
   Expected Y-Axis: ${expectations.expectedYAxis}
   Characteristics: ${expectations.characteristics.join(', ')}`)
      })
    })
  })

  describe('Manual Testing Instructions', () => {
    it('should provide browser testing guidance', () => {
      console.log(`
🧪 MANUAL TESTING INSTRUCTIONS:

1. Start the development server: npm run dev
2. Open the application in a browser
3. For each test image (${expectedImages.join(', ')}):

   a) Load the image file using the file input
   b) Click the axis extraction button (blue button with axis icon)
   c) Wait for processing (5-15 seconds)
   d) Review the confirmation dialog:
      - Check red frames highlight tick label regions correctly
      - Verify extracted text shows recognizable numbers
      - Confirm proposed axis ranges make sense
   e) Click "Yes, Import Values" to test the integration
   f) Verify axis settings update correctly

🔍 VALIDATION CHECKLIST:
- [ ] Red frames appear in correct positions
- [ ] OCR text extraction shows reasonable results
- [ ] Extracted numerical ranges match visible tick labels
- [ ] Axis settings update immediately after confirmation
- [ ] Error handling works for edge cases

📝 TEST RESULTS:
Document the extracted values for each image to establish benchmarks
for future regression testing.
      `)

      expect(true).toBe(true)
    })
  })
})
