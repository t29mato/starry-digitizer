import { CsvParser } from '../csvParser'

describe('CsvParser', () => {
  describe('extractDatasetName', () => {
    it('should extract dataset name from matching parentheses', () => {
      const result = CsvParser.extractDatasetName('x,y (Blue)', 'x,y (Blue)')
      expect(result).toBe('Blue')
    })

    it('should extract dataset name from different header formats', () => {
      const result = CsvParser.extractDatasetName(
        'X (Dataset A)',
        'Y (Dataset A)',
      )
      expect(result).toBe('Dataset A')
    })

    it('should extract dataset name with spaces and special characters', () => {
      const result = CsvParser.extractDatasetName(
        'longitude (GPS Data)',
        'latitude (GPS Data)',
      )
      expect(result).toBe('GPS Data')
    })

    it('should return fallback when no parentheses found', () => {
      const result = CsvParser.extractDatasetName('x', 'y')
      expect(result).toMatch(/^Dataset \d+$/)
    })

    it('should return fallback when parentheses do not match', () => {
      const result = CsvParser.extractDatasetName('x (Blue)', 'y (Red)')
      expect(result).toMatch(/^Dataset \d+$/)
    })

    it('should return fallback when only one header has parentheses', () => {
      const result = CsvParser.extractDatasetName('x (Blue)', 'y')
      expect(result).toMatch(/^Dataset \d+$/)
    })

    it('should handle empty parentheses', () => {
      const result = CsvParser.extractDatasetName('x ()', 'y ()')
      expect(result).toBe('')
    })

    it('should handle scientific notation with case differences', () => {
      const result = CsvParser.extractDatasetName(
        'Temperature (K)',
        'Thermal Conductivity (Wm^-1K^-1) (X=0)'
      )
      expect(result).toMatch(/^Dataset \d+$/)
    })

    it('should match scientific parameters with same values', () => {
      const result = CsvParser.extractDatasetName(
        'Param1 (x=0.005)',
        'Param2 (x=0.005)'
      )
      expect(result).toBe('x=0.005')
    })
  })

  describe('identifyColumnPairs', () => {
    it('should identify single x,y column pair', () => {
      const headers = ['x', 'y']
      const result = CsvParser.identifyColumnPairs(headers)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        xCol: 0,
        yCol: 1,
      })
    })

    it('should identify multiple x,y column pairs', () => {
      const headers = ['x,y (Blue)', 'x,y (Blue)', 'x,y (Red)', 'x,y (Red)']
      const result = CsvParser.identifyColumnPairs(headers)
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        xCol: 0,
        yCol: 1,
        name: 'Blue',
      })
      expect(result[1]).toMatchObject({
        xCol: 2,
        yCol: 3,
        name: 'Red',
      })
    })

    it('should handle case-insensitive x,y detection', () => {
      const headers = ['X (Test)', 'Y (Test)']
      const result = CsvParser.identifyColumnPairs(headers)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test')
    })

    it('should skip non-x,y columns', () => {
      const headers = ['time', 'value', 'x (Data)', 'y (Data)']
      const result = CsvParser.identifyColumnPairs(headers)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        xCol: 2,
        yCol: 3,
        name: 'Data',
      })
    })

    it('should return empty array when no x,y pairs found', () => {
      const headers = ['time', 'value', 'temperature']
      const result = CsvParser.identifyColumnPairs(headers)
      expect(result).toHaveLength(0)
    })

    it('should handle odd number of columns', () => {
      const headers = ['x', 'y', 'z']
      const result = CsvParser.identifyColumnPairs(headers)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        xCol: 0,
        yCol: 1,
      })
    })

    it('should identify pairs by matching dataset names in parentheses', () => {
      const headers = [
        'Cycle number (F-PE)',
        'Capacity (mAh g⁻¹) (F-PE)',
        'Cycle number (F-DBE)',
        'Capacity (mAh g⁻¹) (F-DBE)',
      ]
      
      const result = CsvParser.identifyColumnPairs(headers)
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        xCol: 0,
        yCol: 1,
        name: 'F-PE',
      })
      expect(result[1]).toMatchObject({
        xCol: 2,
        yCol: 3,
        name: 'F-DBE',
      })
    })

    it('should handle mixed header formats', () => {
      const headers = [
        'Time (Dataset1)',
        'Value (Dataset1)',
        'x (Dataset2)',
        'y (Dataset2)',
      ]
      const result = CsvParser.identifyColumnPairs(headers)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Dataset1')
      expect(result[1].name).toBe('Dataset2')
    })
  })

  describe('parseDataPoints', () => {
    const sampleLines = ['1.0, 2.0', '3.5, 4.2', 'invalid, 5.0', '6.0, NaN']

    it('should parse valid numeric data points', () => {
      const columnPair = { xCol: 0, yCol: 1, name: 'Test' }
      const result = CsvParser.parseDataPoints(sampleLines, columnPair)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ x: 1.0, y: 2.0 })
      expect(result[1]).toEqual({ x: 3.5, y: 4.2 })
    })

    it('should skip invalid data points', () => {
      const columnPair = { xCol: 0, yCol: 1, name: 'Test' }
      const result = CsvParser.parseDataPoints(sampleLines, columnPair)
      // Should skip 'invalid, 5.0' and '6.0, NaN'
      expect(result).toHaveLength(2)
    })

    it('should handle empty lines', () => {
      const lines = ['1.0, 2.0', '', '3.0, 4.0']
      const columnPair = { xCol: 0, yCol: 1, name: 'Test' }
      const result = CsvParser.parseDataPoints(lines, columnPair)
      expect(result).toHaveLength(2)
    })

    it('should handle lines with insufficient columns', () => {
      const lines = ['1.0', '2.0, 3.0', '4.0, 5.0']
      const columnPair = { xCol: 0, yCol: 1, name: 'Test' }
      const result = CsvParser.parseDataPoints(lines, columnPair)
      expect(result).toHaveLength(2)
    })

    it('should parse data from specific columns', () => {
      const lines = ['ignore, ignore, 1.0, 2.0', 'ignore, ignore, 3.0, 4.0']
      const columnPair = { xCol: 2, yCol: 3, name: 'Test' }
      const result = CsvParser.parseDataPoints(lines, columnPair)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ x: 1.0, y: 2.0 })
      expect(result[1]).toEqual({ x: 3.0, y: 4.0 })
    })
  })

  describe('parseCSV', () => {
    it('should parse simple CSV with single dataset', () => {
      const csv = `x,y
1,2
3,4`
      const result = CsvParser.parseCSV(csv)
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0].points).toHaveLength(2)
      expect(result.datasets[0].points[0]).toEqual({ x: 1, y: 2 })
      expect(result.datasets[0].points[1]).toEqual({ x: 3, y: 4 })
    })

    it('should parse CSV with multiple datasets', () => {
      const csv = `x (Blue),y (Blue),x (Red),y (Red)
1,2,5,6
3,4,7,8`
      const result = CsvParser.parseCSV(csv)
      expect(result.datasets).toHaveLength(2)
      expect(result.datasets[0].name).toBe('Blue')
      expect(result.datasets[1].name).toBe('Red')
      expect(result.datasets[0].points).toHaveLength(2)
      expect(result.datasets[1].points).toHaveLength(2)
    })

    it('should parse the GitHub issue example format', () => {
      const csv = `x (Blue),y (Blue),x (Orange),y (Orange),x (Green),y (Green),x (Red),y (Red)
1,4,1,5,1,6,1,7
2,3,2,4,2,5,2,6
3,2,3,3,3,4,3,5`
      const result = CsvParser.parseCSV(csv)
      expect(result.datasets).toHaveLength(4)
      expect(result.datasets.map((d) => d.name)).toEqual([
        'Blue',
        'Orange',
        'Green',
        'Red',
      ])
      expect(result.datasets[0].points).toHaveLength(3)
      expect(result.datasets[0].points[0]).toEqual({ x: 1, y: 4 })
    })

    it('should throw error for CSV with no data rows', () => {
      const csv = 'x,y'
      expect(() => CsvParser.parseCSV(csv)).toThrow(
        'CSV must have at least a header row and one data row',
      )
    })

    it('should throw error for empty CSV', () => {
      const csv = ''
      expect(() => CsvParser.parseCSV(csv)).toThrow(
        'CSV must have at least a header row and one data row',
      )
    })

    it('should throw error when no x,y column pairs found', () => {
      const csv = `time,value
1,100
2,200`
      expect(() => CsvParser.parseCSV(csv)).toThrow(
        'No valid x,y column pairs found in CSV headers',
      )
    })

    it('should filter out datasets with no valid points', () => {
      const csv = `x (Valid),y (Valid),x (Invalid),y (Invalid)
1,2,invalid,invalid
3,4,NaN,NaN`
      const result = CsvParser.parseCSV(csv)
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0].name).toBe('Valid')
    })

    it('should handle mixed valid and invalid data', () => {
      const csv = `x,y
1,2
invalid,4
5,6`
      const result = CsvParser.parseCSV(csv)
      expect(result.datasets[0].points).toHaveLength(2)
      expect(result.datasets[0].points[0]).toEqual({ x: 1, y: 2 })
      expect(result.datasets[0].points[1]).toEqual({ x: 5, y: 6 })
    })
  })

  describe('generatePreview', () => {
    it('should generate preview for valid CSV', () => {
      const csv = `x,y (Blue),x,y (Red)
1,2,3,4
5,6,7,8
9,10,11,12`
      const result = CsvParser.generatePreview(csv)
      expect(result).toHaveLength(4) // header + 3 data rows
      expect(result[0]).toEqual(['x', 'y (Blue)', 'x', 'y (Red)'])
      expect(result[1]).toEqual(['1', '2', '3', '4'])
    })

    it('should limit preview to specified number of rows', () => {
      const csv = `x,y
1,2
3,4
5,6
7,8
9,10`
      const result = CsvParser.generatePreview(csv, 3)
      expect(result).toHaveLength(3)
    })

    it('should return empty array for empty CSV', () => {
      const result = CsvParser.generatePreview('')
      expect(result).toEqual([])
    })

    it('should trim cell values', () => {
      const csv = ' x , y \n 1 , 2 '
      const result = CsvParser.generatePreview(csv)
      expect(result[0]).toEqual(['x', 'y'])
      expect(result[1]).toEqual(['1', '2'])
    })
  })
})