import { CsvParser } from '../csvParser'

describe('CsvParser Integration Tests', () => {
  describe('Real-world CSV examples', () => {
    it('should handle the GitHub issue #223 example format', () => {
      const csv = `x (Blue),y (Blue),x (Orange),y (Orange),x (Green),y (Green),x (Red),y (Red)
1,4,1,5,1,6,1,7
2,3,2,4,2,5,2,6
3,2,3,3,3,4,3,5`

      const result = CsvParser.parseCSV(csv)
      
      // Should parse 4 datasets
      expect(result.datasets).toHaveLength(4)
      
      // Verify dataset names
      const datasetNames = result.datasets.map(d => d.name)
      expect(datasetNames).toEqual(['Blue', 'Orange', 'Green', 'Red'])
      
      // Each dataset should have 3 points
      result.datasets.forEach(dataset => {
        expect(dataset.points).toHaveLength(3)
      })
      
      // Verify first dataset (Blue) data
      expect(result.datasets[0].points).toEqual([
        { x: 1, y: 4 },
        { x: 2, y: 3 },
        { x: 3, y: 2 }
      ])
      
      // Verify last dataset (Red) data  
      expect(result.datasets[3].points).toEqual([
        { x: 1, y: 7 },
        { x: 2, y: 6 },
        { x: 3, y: 5 }
      ])
    })

    it('should handle scientific data with descriptive column names', () => {
      const csv = `Cycle number (F-PE),Capacity (mAh g⁻¹) (F-PE),Cycle number (F-DBE),Capacity (mAh g⁻¹) (F-DBE),Cycle number (F-DME),Capacity (mAh g⁻¹) (F-DME)
0,550,0,520,0,500
1,545,1,515,1,450
2,542,2,512,2,400
3,540,3,510,3,360
4,538,4,508,4,330`

      const result = CsvParser.parseCSV(csv)
      
      // Should parse 3 datasets
      expect(result.datasets).toHaveLength(3)
      
      // Verify dataset names
      const datasetNames = result.datasets.map(d => d.name)
      expect(datasetNames).toEqual(['F-PE', 'F-DBE', 'F-DME'])
      
      // Each dataset should have 5 points
      result.datasets.forEach(dataset => {
        expect(dataset.points).toHaveLength(5)
      })
      
      // Verify F-PE dataset data
      expect(result.datasets[0].points).toEqual([
        { x: 0, y: 550 },
        { x: 1, y: 545 },
        { x: 2, y: 542 },
        { x: 3, y: 540 },
        { x: 4, y: 538 }
      ])
      
      // Verify F-DME dataset (shows capacity degradation)
      expect(result.datasets[2].points).toEqual([
        { x: 0, y: 500 },
        { x: 1, y: 450 },
        { x: 2, y: 400 },
        { x: 3, y: 360 },
        { x: 4, y: 330 }
      ])
    })

    it('should handle scientific data format', () => {
      const csv = `x_time (Celsius),y_temp (Celsius),x_time (Fahrenheit),y_temp (Fahrenheit)
0,20,0,68
1,25,1,77
2,30,2,86`

      const result = CsvParser.parseCSV(csv)
      
      expect(result.datasets).toHaveLength(2)
      expect(result.datasets[0].name).toBe('Celsius')
      expect(result.datasets[1].name).toBe('Fahrenheit')
      
      expect(result.datasets[0].points).toEqual([
        { x: 0, y: 20 },
        { x: 1, y: 25 },
        { x: 2, y: 30 }
      ])
    })

    it('should handle CSV with mixed valid and invalid data', () => {
      const csv = `x (Test),y (Test)
1.5,2.7
invalid,3.2
4.1,NaN
5.0,6.3
7.2,`

      const result = CsvParser.parseCSV(csv)
      
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0].points).toHaveLength(2)
      expect(result.datasets[0].points).toEqual([
        { x: 1.5, y: 2.7 },
        { x: 5.0, y: 6.3 }
      ])
    })

    it('should handle CSV with extra columns at the end', () => {
      const csv = `x (Position),y (Position),notes,status
10.5,20.3,start,active
15.2,25.1,middle,active
20.0,30.5,end,complete`

      const result = CsvParser.parseCSV(csv)
      
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0].name).toBe('Position')
      expect(result.datasets[0].points).toEqual([
        { x: 10.5, y: 20.3 },
        { x: 15.2, y: 25.1 },
        { x: 20.0, y: 30.5 }
      ])
    })

    it('should generate consistent preview data', () => {
      const csv = `x (Test),y (Test)
1,2
3,4
5,6`

      const preview = CsvParser.generatePreview(csv)
      const parsed = CsvParser.parseCSV(csv)
      
      // Preview should show header and all data rows
      expect(preview).toHaveLength(4)
      expect(preview[0]).toEqual(['x (Test)', 'y (Test)'])
      expect(preview[1]).toEqual(['1', '2'])
      
      // Parsed data should match preview data
      expect(parsed.datasets[0].points[0]).toEqual({ x: 1, y: 2 })
    })

    it('should handle thermal conductivity scientific data format', () => {
      const csv = `Temperature (K),Thermal Conductivity (Wm^-1K^-1) (X=0),Temperature (K),Thermal Conductivity (Wm^-1K^-1) (x=0.005),Temperature (K),Thermal Conductivity (Wm^-1K^-1) (x=0.01),Temperature (K),Thermal Conductivity (Wm^-1K^-1) (x=0.02)
300,10.5,300,9.8,300,9.2,300,8.5
400,12.1,400,11.4,400,10.8,400,10.1
500,13.8,500,13.1,500,12.5,500,11.8`

      const result = CsvParser.parseCSV(csv)
      
      // Should parse 4 datasets with different x values
      expect(result.datasets).toHaveLength(4)
      
      // Check dataset names are extracted correctly
      const datasetNames = result.datasets.map(d => d.name)
      expect(datasetNames).toContain('X=0')
      expect(datasetNames).toContain('x=0.005')
      expect(datasetNames).toContain('x=0.01')
      expect(datasetNames).toContain('x=0.02')
      
      // Each dataset should have 3 points
      result.datasets.forEach(dataset => {
        expect(dataset.points).toHaveLength(3)
      })
      
      // Verify first dataset data
      expect(result.datasets[0].points[0]).toEqual({ x: 300, y: 10.5 })
      expect(result.datasets[0].points[1]).toEqual({ x: 400, y: 12.1 })
      expect(result.datasets[0].points[2]).toEqual({ x: 500, y: 13.8 })
    })
  })

  describe('Error handling', () => {
    it('should provide meaningful error for malformed CSV', () => {
      const csv = `not,a,valid,header
1,2,3,4`

      expect(() => CsvParser.parseCSV(csv)).toThrow(
        'No valid x,y column pairs found in CSV headers'
      )
    })

    it('should handle empty datasets gracefully', () => {
      const csv = `x (Empty),y (Empty)
invalid,invalid
NaN,NaN`

      const result = CsvParser.parseCSV(csv)
      expect(result.datasets).toHaveLength(0)
    })
  })
})