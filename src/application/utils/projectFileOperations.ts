import { DigitizerContext } from '@/application/digitizerContext'
import { loadProject } from '@/application/utils/digitizerOperations'
import { DigitizerError } from '@/application/errors'

// INFO: Shared by CanvasHeader.vue (Save/Load buttons) and App.vue (File
// menu) so both entry points drive the exact same save/load behavior.

export type ProjectFileOperationResult = {
  success: boolean
  errorMessage?: string
  error?: DigitizerError
}

export async function saveProjectAndDownload(
  ctx: DigitizerContext,
): Promise<ProjectFileOperationResult> {
  try {
    const zipBlob = await ctx.projectService.exportProject()
    ctx.projectService.downloadZip(zipBlob)
    return { success: true }
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

// INFO: Opens a native file picker without needing a template <input> ref,
// so callers with no DOM element of their own — the File menu and the
// Ctrl/Cmd+O keyboard shortcut — can trigger "Load Project".
export function triggerLoadProjectDialog(
  ctx: DigitizerContext,
): Promise<ProjectFileOperationResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip'
    input.style.display = 'none'

    const cleanup = () => {
      document.body.removeChild(input)
    }

    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      cleanup()
      if (!file) {
        resolve({ success: false, errorMessage: 'No file selected' })
        return
      }
      resolve(await loadProjectFromFile(ctx, file))
    })

    // INFO: Not all browsers fire "cancel" on the file input yet, but where
    // they do, this keeps a caller's loading state from getting stuck on.
    input.addEventListener('cancel', () => {
      cleanup()
      resolve({ success: false })
    })

    document.body.appendChild(input)
    input.click()
  })
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
