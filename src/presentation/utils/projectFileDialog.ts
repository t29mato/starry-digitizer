import { DigitizerContext } from '@/application/digitizerContext'
import {
  defaultProjectZipFilename,
  loadProjectFromFile,
  saveProject,
  type ProjectFileOperationResult,
} from '@/application/utils/projectFileOperations'
import { downloadBlob } from '@/presentation/utils/downloadBlob'

// INFO: The browser-facing half of Save/Load Project. Shared by
// CanvasHeader.vue (Save/Load buttons), CanvasMain.vue (Cmd/Ctrl+S / +O) and
// App.vue (File menu) so every entry point behaves identically. Lives in the
// presentation layer because it creates <a download> / <input type=file>.

export async function saveProjectAndDownload(
  ctx: DigitizerContext,
): Promise<ProjectFileOperationResult> {
  const result = await saveProject(ctx)
  if (!result.success || !result.blob) {
    return {
      success: result.success,
      errorMessage: result.errorMessage,
      error: result.error,
    }
  }
  downloadBlob(result.blob, result.filename ?? defaultProjectZipFilename())
  return { success: true }
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
