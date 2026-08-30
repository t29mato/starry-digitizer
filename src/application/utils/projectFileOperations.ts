import {
  projectService,
  canvasHandler,
} from '@/instanceStore/applicationServiceInstances'
import {
  datasetRepository,
  axisSetRepository,
} from '@/instanceStore/repositoryInatances'
import { POINT_MODE } from '@/constants'

// INFO: Shared by ProjectManager.vue (left panel buttons) and App.vue
// (File menu) so both entry points drive the exact same save/load
// behavior instead of duplicating it.

export type ProjectFileOperationResult = {
  success: boolean
  errorMessage?: string
}

export async function saveProjectAndDownload(): Promise<ProjectFileOperationResult> {
  try {
    const zipBlob = await projectService.exportProject()
    projectService.downloadZip(zipBlob)
    return { success: true }
  } catch (error) {
    console.error('Error saving project:', error)
    return {
      success: false,
      errorMessage: `Error saving project: ${(error as Error).message}`,
    }
  }
}

// INFO: Opens a native file picker without needing a template <input> ref,
// so callers with no DOM element of their own — the File menu and the
// Ctrl/Cmd+O keyboard shortcut — can trigger "Load Project" the same way
// ProjectManager.vue's button does.
export function triggerLoadProjectDialog(): Promise<ProjectFileOperationResult> {
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
      resolve(await loadProjectFromFile(file))
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

export async function loadProjectFromFile(
  file: File,
): Promise<ProjectFileOperationResult> {
  try {
    const imageData = await projectService.loadProject(file)

    await canvasHandler.initializeImageElement(imageData)
    canvasHandler.drawFitSizeImage()
    canvasHandler.setUploadImageUrl(imageData)

    // Remove empty "dataset 1" if it was created during initialization
    const emptyDataset1 = datasetRepository.datasets.find(
      (d) => d.id === 1 && d.name === 'dataset 1' && d.points.length === 0,
    )
    if (emptyDataset1 && datasetRepository.datasets.length > 1) {
      datasetRepository.datasets = datasetRepository.datasets.filter(
        (d) => d.id !== 1,
      )
    }

    // Enable "View All Datasets" mode after loading project
    datasetRepository.setActiveDataset(0)

    // Set all axis sets to 4 points mode
    axisSetRepository.axisSets.forEach((axisSet) => {
      axisSet.pointMode = POINT_MODE.FOUR_POINTS
    })

    return { success: true }
  } catch (error) {
    console.error('Error loading project:', error)
    return {
      success: false,
      errorMessage: `Error loading project: ${(error as Error).message}`,
    }
  }
}
