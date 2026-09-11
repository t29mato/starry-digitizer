import { DigitizerContext } from '@/application/digitizerContext'
import { loadProject } from '@/application/utils/digitizerOperations'
import { DigitizerError } from '@/application/errors'

// INFO: Pure orchestration only — no DOM. The <a download> / <input type=file>
// halves live in @/presentation/utils/downloadBlob and projectFileDialog, so
// the application layer stays runnable without a document.

export type ProjectFileOperationResult = {
  success: boolean
  errorMessage?: string
  error?: DigitizerError
}

export type ProjectSaveResult = ProjectFileOperationResult & {
  blob?: Blob
  filename?: string
}

// INFO: e.g. sd-20260903-174500.zip
export function defaultProjectZipFilename(date: Date = new Date()): string {
  return `sd-${date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '-')}.zip`
}

/**
 * Build the project ZIP. The caller decides what to do with the blob —
 * download it, upload it, hand it to a host app.
 */
export async function saveProject(
  ctx: DigitizerContext,
): Promise<ProjectSaveResult> {
  try {
    const blob = await ctx.projectService.exportProject()
    return { success: true, blob, filename: defaultProjectZipFilename() }
  } catch (error) {
    console.error('Error saving project:', error)
    const digitizerError = DigitizerError.from(error, 'EXPORT_FAILED')
    return {
      success: false,
      errorMessage: `Error saving project: ${digitizerError.message}`,
      error: digitizerError,
    }
  }
}

/**
 * ZIP path: unpack, then hand the DTO + image to the very same loadProject()
 * the host API path uses.
 */
export async function loadProjectFromFile(
  ctx: DigitizerContext,
  file: File,
): Promise<ProjectFileOperationResult> {
  try {
    const { projectData, imageData } =
      await ctx.projectService.importProject(file)
    await loadProject(ctx, projectData, imageData)
    return { success: true }
  } catch (error) {
    console.error('Error loading project:', error)
    const digitizerError = DigitizerError.from(error, 'PROJECT_INVALID')
    return {
      success: false,
      errorMessage: `Error loading project: ${digitizerError.message}`,
      error: digitizerError,
    }
  }
}
