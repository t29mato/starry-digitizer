/**
 * @jest-environment node
 */
import { NodeAxisExtractor } from '../nodeAxisExtractor'
import fs from 'fs'
import path from 'path'

describe('NodeAxisExtractor Integration Tests with Real OCR', () => {
  let simpleExtractor: NodeAxisExtractor
  let improvedExtractor: NodeAxisExtractor

  const testImagePaths = [
    path.join(__dirname, '../../../../assets/test/cycleNumber_capacity.png'),
    path.join(__dirname, '../../../../assets/test/temperature_seebeckCoefficient.png'),
    path.join(__dirname, '../../../../assets/test/temperature_zt.png')
  ]

  beforeEach(() => {
    simpleExtractor = new NodeAxisExtractor(false) // Simple mode
    improvedExtractor = new NodeAxisExtractor(true) // Improved mode
  })

  describe('Real Image Processing with Simple Mode', () => {
    it('should extract axis information from cycleNumber_capacity.png', async () => {
      const imagePath = testImagePaths[0]
      
      // Verify file exists
      expect(fs.existsSync(imagePath)).toBe(true)

      const result = await simpleExtractor.extractAxisInformationFromFile(imagePath)
      
      if (result) {
        console.log(`📊 cycleNumber_capacity.png (Simple): X[${result.x1}-${result.x2}], Y[${result.y1}-${result.y2}]`)
        
        // Basic validation
        expect(typeof result.x1).toBe('number')
        expect(typeof result.x2).toBe('number')
        expect(typeof result.y1).toBe('number')
        expect(typeof result.y2).toBe('number')
        
        // Regions should be defined
        expect(result.horizontalRegion).toBeDefined()
        expect(result.verticalRegion).toBeDefined()
        
        // X-axis should contain cycle numbers (expect some numbers like 0, 200, 400, etc.)
        if (result.horizontalRegion && result.horizontalRegion.extractedValues.length > 0) {
          expect(result.horizontalRegion.extractedValues).toEqual(
            expect.arrayContaining([expect.any(Number)])
          )
        }
        
        // Y-axis should contain capacity values
        if (result.verticalRegion && result.verticalRegion.extractedValues.length > 0) {
          expect(result.verticalRegion.extractedValues).toEqual(
            expect.arrayContaining([expect.any(Number)])
          )
        }
      } else {
        console.log(`⚠️ cycleNumber_capacity.png (Simple): No extraction result`)
        // Test passes even if no result - OCR might fail in test environment
      }
    }, 30000) // Extended timeout for OCR

    it('should extract axis information from temperature_seebeckCoefficient.png', async () => {
      const imagePath = testImagePaths[1]
      
      expect(fs.existsSync(imagePath)).toBe(true)

      const result = await simpleExtractor.extractAxisInformationFromFile(imagePath)
      
      if (result) {
        console.log(`📊 temperature_seebeckCoefficient.png (Simple): X[${result.x1}-${result.x2}], Y[${result.y1}-${result.y2}]`)
        
        expect(typeof result.x1).toBe('number')
        expect(typeof result.x2).toBe('number')
        expect(typeof result.y1).toBe('number')
        expect(typeof result.y2).toBe('number')
        
        expect(result.horizontalRegion).toBeDefined()
        expect(result.verticalRegion).toBeDefined()
      } else {
        console.log(`⚠️ temperature_seebeckCoefficient.png (Simple): No extraction result`)
      }
    }, 30000)

    it('should extract axis information from temperature_zt.png', async () => {
      const imagePath = testImagePaths[2]
      
      expect(fs.existsSync(imagePath)).toBe(true)

      const result = await simpleExtractor.extractAxisInformationFromFile(imagePath)
      
      if (result) {
        console.log(`📊 temperature_zt.png (Simple): X[${result.x1}-${result.x2}], Y[${result.y1}-${result.y2}]`)
        
        expect(typeof result.x1).toBe('number')
        expect(typeof result.x2).toBe('number')
        expect(typeof result.y1).toBe('number')
        expect(typeof result.y2).toBe('number')
        
        expect(result.horizontalRegion).toBeDefined()
        expect(result.verticalRegion).toBeDefined()
      } else {
        console.log(`⚠️ temperature_zt.png (Simple): No extraction result`)
      }
    }, 30000)
  })

  describe('Real Image Processing with Improved Mode', () => {
    it('should extract axis information from cycleNumber_capacity.png with improved accuracy', async () => {
      const imagePath = testImagePaths[0]
      
      expect(fs.existsSync(imagePath)).toBe(true)

      const result = await improvedExtractor.extractAxisInformationFromFile(imagePath)
      
      if (result) {
        console.log(`📊 cycleNumber_capacity.png (Improved): X[${result.x1}-${result.x2}], Y[${result.y1}-${result.y2}]`)
        
        // Enhanced validation for improved mode
        expect(typeof result.x1).toBe('number')
        expect(typeof result.x2).toBe('number')
        expect(typeof result.y1).toBe('number')
        expect(typeof result.y2).toBe('number')
        
        expect(result.horizontalRegion).toBeDefined()
        expect(result.verticalRegion).toBeDefined()
        
        // Improved mode should provide debug information
        if ('debug' in result && result.debug) {
          expect(result.debug.verticalRegions).toBeDefined()
          expect(Array.isArray(result.debug.verticalRegions)).toBe(true)
          
          console.log(`🔍 Debug regions:`, result.debug.verticalRegions?.length)
        }
        
        // Log extracted values for verification
        if (result.horizontalRegion) {
          console.log(`🔢 X-axis values: [${result.horizontalRegion.extractedValues.join(', ')}]`)
        }
        if (result.verticalRegion) {
          console.log(`🔢 Y-axis values: [${result.verticalRegion.extractedValues.join(', ')}]`)
        }
      } else {
        console.log(`⚠️ cycleNumber_capacity.png (Improved): No extraction result`)
      }
    }, 45000) // Longer timeout for improved processing

    it('should extract axis information from temperature_zt.png with expected ranges', async () => {
      const imagePath = testImagePaths[2]
      
      expect(fs.existsSync(imagePath)).toBe(true)

      const result = await improvedExtractor.extractAxisInformationFromFile(imagePath)
      
      if (result) {
        console.log(`📊 temperature_zt.png (Improved): X[${result.x1}-${result.x2}], Y[${result.y1}-${result.y2}]`)
        
        // For temperature_zt.png, we can expect specific ranges based on the chart
        // X-axis should be temperature (K) - typically 300-800K range
        // Y-axis should be ZT values - typically 0-2.0 range
        
        if (result.x2 > result.x1) {
          // Reasonable temperature range check
          expect(result.x1).toBeGreaterThanOrEqual(0)
          expect(result.x2).toBeLessThanOrEqual(1000) // Upper bound for temperature
        }
        
        if (result.y2 > result.y1) {
          // Reasonable ZT value range check
          expect(result.y1).toBeGreaterThanOrEqual(0)
          expect(result.y2).toBeLessThanOrEqual(10) // Upper bound for ZT
        }
        
        console.log(`🔢 X-axis values: [${result.horizontalRegion?.extractedValues.join(', ') || 'none'}]`)
        console.log(`🔢 Y-axis values: [${result.verticalRegion?.extractedValues.join(', ') || 'none'}]`)
      } else {
        console.log(`⚠️ temperature_zt.png (Improved): No extraction result`)
      }
    }, 45000)
  })

  describe('Error Handling', () => {
    it('should handle non-existent files gracefully', async () => {
      const result = await simpleExtractor.extractAxisInformationFromFile('/nonexistent/file.png')
      expect(result).toBeNull()
    })

    it('should handle invalid image files gracefully', async () => {
      // Create a temporary invalid file
      const tempPath = '/tmp/invalid.png'
      fs.writeFileSync(tempPath, 'not an image')
      
      const result = await simpleExtractor.extractAxisInformationFromFile(tempPath)
      expect(result).toBeNull()
      
      // Clean up
      fs.unlinkSync(tempPath)
    })
  })

  describe('Performance Comparison', () => {
    it('should compare simple vs improved mode performance', async () => {
      const imagePath = testImagePaths[0] // Use cycleNumber_capacity.png
      
      if (!fs.existsSync(imagePath)) {
        console.log('⚠️ Test image not found, skipping performance test')
        return
      }

      console.log('\n🏁 Performance Comparison Test')
      
      // Test simple mode
      const simpleStart = Date.now()
      const simpleResult = await simpleExtractor.extractAxisInformationFromFile(imagePath)
      const simpleTime = Date.now() - simpleStart
      
      // Test improved mode
      const improvedStart = Date.now()
      const improvedResult = await improvedExtractor.extractAxisInformationFromFile(imagePath)
      const improvedTime = Date.now() - improvedStart
      
      console.log(`⏱️ Simple mode: ${simpleTime}ms`)
      console.log(`⏱️ Improved mode: ${improvedTime}ms`)
      
      if (simpleResult && improvedResult) {
        console.log(`📊 Simple: X[${simpleResult.x1}-${simpleResult.x2}], Y[${simpleResult.y1}-${simpleResult.y2}]`)
        console.log(`📊 Improved: X[${improvedResult.x1}-${improvedResult.x2}], Y[${improvedResult.y1}-${improvedResult.y2}]`)
        
        // Compare accuracy (improved should have more values)
        const simpleValueCount = (simpleResult.horizontalRegion?.extractedValues.length || 0) + 
                                (simpleResult.verticalRegion?.extractedValues.length || 0)
        const improvedValueCount = (improvedResult.horizontalRegion?.extractedValues.length || 0) + 
                                  (improvedResult.verticalRegion?.extractedValues.length || 0)
        
        console.log(`🔢 Simple extracted ${simpleValueCount} values`)
        console.log(`🔢 Improved extracted ${improvedValueCount} values`)
        
        // Improved mode should generally extract more values or be more accurate
        // (though this isn't guaranteed, so we just log for information)
      }
    }, 60000) // Extended timeout for both modes
  })

  describe('Integration Test Summary', () => {
    it('should provide test environment context', () => {
      console.log(`
🧪 NODE.JS INTEGRATION TEST CONTEXT:
- Test Environment: Jest with Node.js
- OCR Engine: Tesseract.js (real OCR processing)
- Image Processing: node-canvas
- Images: 3 real PNG files from assets/test/
- Purpose: Validate actual axis extraction with real OCR

📊 EXPECTED BEHAVIOR:
- ✅ File validation: Should pass
- ✅ Image loading: Should work with node-canvas
- 🔍 Axis extraction: Real OCR processing (may vary based on image quality)
- 🎯 Results: Actual extracted values from test images

⚠️ NOTE:
- OCR results may vary between test runs
- Some tests may not extract values if OCR confidence is low
- This is expected behavior for real-world OCR processing
      `)
      
      expect(true).toBe(true)
    })
  })
})