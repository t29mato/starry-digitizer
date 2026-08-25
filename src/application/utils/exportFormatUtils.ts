// INFO: Pure formatting helpers shared by the CSV/JSON export buttons in
// Export/DataTable.vue and DatasetManager.vue. Kept framework-free so they
// stay covered by Jest (Vue components are excluded from coverage
// collection, see jest.config.cjs).

export interface ExportRow {
  X: string | null
  Y: string | null
}

export const toCsv = (rows: ExportRow[]): string => {
  return rows.map((row) => [row.X, row.Y].join(',')).join('\n')
}

export const toJson = (rows: ExportRow[]): string => {
  return JSON.stringify(
    rows.map((row) => ({ x: row.X, y: row.Y })),
    null,
    2,
  )
}
