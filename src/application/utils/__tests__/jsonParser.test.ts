import { JsonParser } from '../jsonParser'

describe('JsonParser', () => {
  describe('parseJSON', () => {
    it('should parse valid JSON with single dataset', () => {
      const json = `{
        "x_axis": {"min": 0, "max": 100, "label": "Temperature (°C)"},
        "y_axis": {"min": 0, "max": 1.0, "label": "Conversion"},
        "data_series": [
          {
            "name": "Series 1",
            "color": "red",
            "points": [[10, 0.1], [20, 0.2], [30, 0.3]]
          }
        ]
      }`

      const result = JsonParser.parseJSON(json)

      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0].name).toBe('Series 1')
      expect(result.datasets[0].points).toHaveLength(3)
      expect(result.datasets[0].points[0]).toEqual({ x: 10, y: 0.1 })
      expect(result.datasets[0].points[1]).toEqual({ x: 20, y: 0.2 })
      expect(result.datasets[0].points[2]).toEqual({ x: 30, y: 0.3 })
    })

    it('should parse valid JSON with multiple datasets', () => {
      const json = `{
        "data_series": [
          {
            "name": "Series 1",
            "points": [[10, 0.1], [20, 0.2]]
          },
          {
            "name": "Series 2",
            "points": [[15, 0.15], [25, 0.25]]
          }
        ]
      }`

      const result = JsonParser.parseJSON(json)

      expect(result.datasets).toHaveLength(2)
      expect(result.datasets[0].name).toBe('Series 1')
      expect(result.datasets[1].name).toBe('Series 2')
      expect(result.datasets[0].points).toHaveLength(2)
      expect(result.datasets[1].points).toHaveLength(2)
    })

    it('should use default name when name is not provided', () => {
      const json = `{
        "data_series": [
          {
            "points": [[10, 0.1]]
          }
        ]
      }`

      const result = JsonParser.parseJSON(json)

      expect(result.datasets[0].name).toBe('Dataset 1')
    })

    it('should skip datasets with empty points', () => {
      const json = `{
        "data_series": [
          {
            "name": "Empty Series",
            "points": []
          },
          {
            "name": "Valid Series",
            "points": [[10, 0.1]]
          }
        ]
      }`

      const result = JsonParser.parseJSON(json)

      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0].name).toBe('Valid Series')
    })

    it('should throw error for invalid JSON syntax', () => {
      const json = '{ invalid json }'

      expect(() => JsonParser.parseJSON(json)).toThrow('Invalid JSON format')
    })

    it('should throw error when data_series is missing', () => {
      const json = '{ "x_axis": {"min": 0} }'

      expect(() => JsonParser.parseJSON(json)).toThrow(
        'JSON must contain a "data_series" array',
      )
    })

    it('should throw error when data_series is empty', () => {
      const json = '{ "data_series": [] }'

      expect(() => JsonParser.parseJSON(json)).toThrow(
        'JSON must have at least one dataset in "data_series"',
      )
    })

    it('should throw error when dataset does not have points array', () => {
      const json = `{
        "data_series": [
          { "name": "Bad Series" }
        ]
      }`

      expect(() => JsonParser.parseJSON(json)).toThrow(
        'Dataset at index 0 must have a "points" array',
      )
    })

    it('should throw error for invalid point format', () => {
      const json = `{
        "data_series": [
          {
            "name": "Bad Series",
            "points": [[10]]
          }
        ]
      }`

      expect(() => JsonParser.parseJSON(json)).toThrow(
        'Invalid point format at dataset 0, point 0',
      )
    })

    it('should throw error when point values are not numbers', () => {
      const json = `{
        "data_series": [
          {
            "name": "Bad Series",
            "points": [["10", 0.1]]
          }
        ]
      }`

      expect(() => JsonParser.parseJSON(json)).toThrow(
        'Invalid point format at dataset 0, point 0',
      )
    })

    it('should throw error when all datasets have empty points', () => {
      const json = `{
        "data_series": [
          { "name": "Empty 1", "points": [] },
          { "name": "Empty 2", "points": [] }
        ]
      }`

      expect(() => JsonParser.parseJSON(json)).toThrow(
        'No valid datasets found with data points',
      )
    })
  })

  describe('generatePreview', () => {
    it('should generate preview for valid JSON', () => {
      const json = `{
        "x_axis": {"min": 0, "max": 100, "label": "Temperature (°C)"},
        "y_axis": {"min": 0, "max": 1.0, "label": "Conversion"},
        "data_series": [
          {
            "name": "Series 1",
            "color": "red",
            "points": [[10, 0.1], [20, 0.2], [30, 0.3]]
          }
        ]
      }`

      const result = JsonParser.generatePreview(json)

      expect(result.success).toBe(true)
      expect(result.preview).toContain('JSON Import Preview')
      expect(result.preview).toContain('X-Axis: Temperature (°C)')
      expect(result.preview).toContain('Y-Axis: Conversion')
      expect(result.preview).toContain('Series 1')
      expect(result.preview).toContain('(red)')
      expect(result.preview).toContain('3 points')
      expect(result.datasetCount).toBe(1)
      expect(result.totalPoints).toBe(3)
    })

    it('should handle JSON without axis labels', () => {
      const json = `{
        "data_series": [
          {
            "name": "Series 1",
            "points": [[10, 0.1]]
          }
        ]
      }`

      const result = JsonParser.generatePreview(json)

      expect(result.success).toBe(true)
      expect(result.preview).toContain('Series 1')
    })

    it('should return error for invalid JSON', () => {
      const json = '{ invalid }'

      const result = JsonParser.generatePreview(json)

      expect(result.success).toBe(false)
      expect(result.preview).toContain('Invalid JSON')
    })

    it('should return error when data_series is missing', () => {
      const json = '{ "x_axis": {"min": 0} }'

      const result = JsonParser.generatePreview(json)

      expect(result.success).toBe(false)
      expect(result.preview).toContain('missing "data_series" array')
    })

    it('should show axis range when min and max are provided', () => {
      const json = `{
        "x_axis": {"min": 0, "max": 100, "label": "Temp"},
        "y_axis": {"min": 0.0, "max": 1.0, "label": "Conv"},
        "data_series": [
          { "name": "Test", "points": [[50, 0.5]] }
        ]
      }`

      const result = JsonParser.generatePreview(json)

      expect(result.success).toBe(true)
      expect(result.preview).toContain('(0 - 100)')
      expect(result.preview).toContain('(0 - 1)')
    })

    it('should use "Unlabeled" for axes without labels', () => {
      const json = `{
        "x_axis": {"min": 0, "max": 100},
        "y_axis": {},
        "data_series": [
          { "name": "Test", "points": [[50, 0.5]] }
        ]
      }`

      const result = JsonParser.generatePreview(json)

      expect(result.success).toBe(true)
      expect(result.preview).toContain('X-Axis: Unlabeled')
      expect(result.preview).toContain('Y-Axis: Unlabeled')
    })
  })
})
