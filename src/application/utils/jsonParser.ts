export interface JsonDataPoint {
  x: number
  y: number
}

export interface JsonDataset {
  name: string
  color?: string
  points: JsonDataPoint[]
}

export interface JsonParseResult {
  datasets: JsonDataset[]
}

export interface JsonDatasetInput {
  name: string
  color?: string
  points: [number, number][]
}

export interface JsonInput {
  x_axis?: {
    min?: number
    max?: number
    label?: string
  }
  y_axis?: {
    min?: number
    max?: number
    label?: string
  }
  data_series: JsonDatasetInput[]
}

export class JsonParser {
  /**
   * Parses JSON text into datasets
   * @param jsonText - Raw JSON content
   * @returns Parsed datasets
   * @throws Error for invalid JSON format
   */
  static parseJSON(jsonText: string): JsonParseResult {
    let data: JsonInput

    try {
      data = JSON.parse(jsonText)
    } catch (error) {
      throw new Error('Invalid JSON format: ' + (error as Error).message)
    }

    if (!data.data_series || !Array.isArray(data.data_series)) {
      throw new Error('JSON must contain a "data_series" array')
    }

    if (data.data_series.length === 0) {
      throw new Error('JSON must have at least one dataset in "data_series"')
    }

    const datasets: JsonDataset[] = []

    for (let i = 0; i < data.data_series.length; i++) {
      const series = data.data_series[i]

      if (!series.points || !Array.isArray(series.points)) {
        throw new Error(`Dataset at index ${i} must have a "points" array`)
      }

      const points: JsonDataPoint[] = []

      for (let j = 0; j < series.points.length; j++) {
        const point = series.points[j]

        if (
          !Array.isArray(point) ||
          point.length !== 2 ||
          typeof point[0] !== 'number' ||
          typeof point[1] !== 'number'
        ) {
          throw new Error(
            `Invalid point format at dataset ${i}, point ${j}. Expected [number, number]`,
          )
        }

        points.push({ x: point[0], y: point[1] })
      }

      if (points.length > 0) {
        datasets.push({
          name: series.name || `Dataset ${i + 1}`,
          color: series.color,
          points,
        })
      }
    }

    if (datasets.length === 0) {
      throw new Error('No valid datasets found with data points')
    }

    return { datasets }
  }

  /**
   * Generates preview data for display
   * @param jsonText - Raw JSON content
   * @returns Formatted preview string or error message
   */
  static generatePreview(jsonText: string): {
    success: boolean
    preview: string
    datasetCount?: number
    totalPoints?: number
  } {
    try {
      const data: JsonInput = JSON.parse(jsonText)

      if (!data.data_series || !Array.isArray(data.data_series)) {
        return {
          success: false,
          preview: 'Invalid format: missing "data_series" array',
        }
      }

      let preview = '📊 JSON Import Preview\n\n'

      if (data.x_axis) {
        preview += `X-Axis: ${data.x_axis.label || 'Unlabeled'}`
        if (data.x_axis.min !== undefined && data.x_axis.max !== undefined) {
          preview += ` (${data.x_axis.min} - ${data.x_axis.max})`
        }
        preview += '\n'
      }

      if (data.y_axis) {
        preview += `Y-Axis: ${data.y_axis.label || 'Unlabeled'}`
        if (data.y_axis.min !== undefined && data.y_axis.max !== undefined) {
          preview += ` (${data.y_axis.min} - ${data.y_axis.max})`
        }
        preview += '\n'
      }

      preview += '\nDatasets:\n'

      let totalPoints = 0
      data.data_series.forEach((series, index) => {
        const pointCount = series.points?.length || 0
        totalPoints += pointCount
        preview += `  ${index + 1}. ${series.name || `Dataset ${index + 1}`}`
        if (series.color) {
          preview += ` (${series.color})`
        }
        preview += ` - ${pointCount} points\n`
      })

      return {
        success: true,
        preview,
        datasetCount: data.data_series.length,
        totalPoints,
      }
    } catch (error) {
      return {
        success: false,
        preview: 'Invalid JSON: ' + (error as Error).message,
      }
    }
  }
}
