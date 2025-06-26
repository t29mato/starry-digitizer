export interface CsvDataPoint {
  x: number
  y: number
}

export interface CsvDataset {
  name: string
  points: CsvDataPoint[]
}

export interface CsvParseResult {
  datasets: CsvDataset[]
}

export interface CsvColumnPair {
  xCol: number
  yCol: number
  name: string
}

export class CsvParser {
  /**
   * Extracts dataset name from CSV header pairs
   * @param xHeader - X column header (e.g., "x (Blue)")
   * @param yHeader - Y column header (e.g., "y (Blue)")
   * @returns Dataset name or fallback
   */
  static extractDatasetName(xHeader: string, yHeader: string): string {
    // Match the LAST set of parentheses in each header
    const xMatch = xHeader.match(/\(([^)]*)\)(?!.*\(.*\))/)
    const yMatch = yHeader.match(/\(([^)]*)\)(?!.*\(.*\))/)

    if (xMatch && yMatch && xMatch[1] === yMatch[1]) {
      return xMatch[1]
    }

    // Handle case-insensitive matching for scientific notation like (X=0) vs (x=0.005)
    if (xMatch && yMatch) {
      const xDataset = xMatch[1].toLowerCase()
      const yDataset = yMatch[1].toLowerCase()

      // Check if both contain similar patterns (e.g., x=value)
      const xPattern = xDataset.match(/x\s*=\s*([0-9.]+)/)
      const yPattern = yDataset.match(/x\s*=\s*([0-9.]+)/)

      if (xPattern && yPattern && xPattern[1] === yPattern[1]) {
        return xMatch[1] // Return original case
      }
    }

    // Fallback: use timestamp to ensure uniqueness
    return `Dataset ${Date.now()}`
  }

  /**
   * Identifies x,y column pairs in CSV headers
   * @param headers - Array of CSV headers
   * @returns Array of column pair configurations
   */
  static identifyColumnPairs(headers: string[]): CsvColumnPair[] {
    const xyCols: CsvColumnPair[] = []

    for (let i = 0; i < headers.length; i += 2) {
      if (i + 1 < headers.length) {
        const xHeader = headers[i].trim()
        const yHeader = headers[i + 1].trim()

        // Check if both headers have matching dataset names in parentheses
        const xMatch = xHeader.match(/\(([^)]*)\)(?!.*\(.*\))/)
        const yMatch = yHeader.match(/\(([^)]*)\)(?!.*\(.*\))/)

        if (xMatch && yMatch && xMatch[1] === yMatch[1]) {
          // Both headers have same dataset name - treat as x,y pair
          const name = this.extractDatasetName(xHeader, yHeader)
          xyCols.push({ xCol: i, yCol: i + 1, name })
        } else if (
          xHeader.toLowerCase().includes('x') &&
          yHeader.toLowerCase().includes('y')
        ) {
          // Fall back to original x,y detection for headers like "x (Blue)", "y (Blue)"
          const name = this.extractDatasetName(xHeader, yHeader)
          xyCols.push({ xCol: i, yCol: i + 1, name })
        } else if (yMatch && yMatch[1]) {
          // Handle cases where only Y header has dataset identifier (like thermal conductivity data)
          // This assumes X,Y data pairs where Y column contains the dataset identifier
          const name = yMatch[1]
          xyCols.push({ xCol: i, yCol: i + 1, name })
        }
      }
    }

    return xyCols
  }

  /**
   * Parses data points from CSV lines for a specific column pair
   * @param lines - CSV data lines (excluding header)
   * @param columnPair - Column configuration
   * @returns Array of parsed data points
   */
  static parseDataPoints(
    lines: string[],
    columnPair: CsvColumnPair,
  ): CsvDataPoint[] {
    const points: CsvDataPoint[] = []
    const { xCol, yCol } = columnPair

    for (const line of lines) {
      const cells = line.split(',').map((c) => c.trim())
      if (cells.length > Math.max(xCol, yCol)) {
        const xVal = parseFloat(cells[xCol])
        const yVal = parseFloat(cells[yCol])

        if (!isNaN(xVal) && !isNaN(yVal)) {
          points.push({ x: xVal, y: yVal })
        }
      }
    }

    return points
  }

  /**
   * Parses CSV text into datasets
   * @param csvText - Raw CSV content
   * @returns Parsed datasets
   * @throws Error for invalid CSV format
   */
  static parseCSV(csvText: string): CsvParseResult {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    const headers = lines[0].split(',').map((h) => h.trim())
    const dataLines = lines.slice(1)

    const columnPairs = this.identifyColumnPairs(headers)
    if (columnPairs.length === 0) {
      throw new Error('No valid x,y column pairs found in CSV headers')
    }

    const datasets: CsvDataset[] = []
    for (const columnPair of columnPairs) {
      const points = this.parseDataPoints(dataLines, columnPair)
      if (points.length > 0) {
        datasets.push({ name: columnPair.name, points })
      }
    }

    return { datasets }
  }

  /**
   * Generates CSV preview data for display
   * @param csvText - Raw CSV content
   * @param maxRows - Maximum rows to return (default: 6)
   * @returns Array of rows with cells
   */
  static generatePreview(csvText: string, maxRows: number = 6): string[][] {
    if (!csvText.trim()) return []

    const lines = csvText.trim().split('\n')
    return lines
      .slice(0, maxRows)
      .map((line) => line.split(',').map((cell) => cell.trim()))
  }
}
