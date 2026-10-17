import { downloadBlob } from '@/presentation/utils/downloadBlob'

// INFO: the auto-extraction review's two JSON downloads (edit log, data
// document) go through here, so the file naming stays the same wherever
// they are triggered from (the review panel, the standalone app's menu).
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  downloadBlob(blob, filename)
}

/** e.g. "20261009-012345" (UTC), for file names */
export function timestamp(date: Date = new Date()): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '-')
}
