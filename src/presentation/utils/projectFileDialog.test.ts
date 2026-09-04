import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import { DigitizerContext } from '@/application/digitizerContext'
import { DigitizerError } from '@/application/errors'

const mockDownloadBlob = jest.fn()

// INFO: the <a download> itself is downloadBlob's job; here we only assert
// that the save flow hands it the exported blob and the generated filename.
jest.mock('@/presentation/utils/downloadBlob', () => ({
  downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args),
}))

import {
  saveProjectAndDownload,
  triggerLoadProjectDialog,
} from './projectFileDialog'

const mockExportProject = jest.fn()
const mockImportProject = jest.fn()

const buildContext = () =>
  ({
    projectService: {
      exportProject: (...args: unknown[]) => mockExportProject(...args),
      importProject: (...args: unknown[]) => mockImportProject(...args),
    },
  }) as unknown as DigitizerContext

describe('projectFileDialog', () => {
  let ctx: DigitizerContext

  beforeEach(() => {
    jest.clearAllMocks()
    ctx = buildContext()
  })

  describe('saveProjectAndDownload', () => {
    it('downloads the exported blob under an sd-<timestamp>.zip name', async () => {
      const blob = new Blob()
      mockExportProject.mockResolvedValue(blob as never)

      const result = await saveProjectAndDownload(ctx)

      expect(mockDownloadBlob).toHaveBeenCalledWith(
        blob,
        expect.stringMatching(/^sd-\d{8}-\d{6}\.zip$/),
      )
      expect(result).toEqual({ success: true })
    })

    it('reports the export failure without downloading anything', async () => {
      mockExportProject.mockRejectedValue(
        new DigitizerError('EXPORT_FAILED', 'No image loaded') as never,
      )

      const result = await saveProjectAndDownload(ctx)

      expect(mockDownloadBlob).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('EXPORT_FAILED')
      expect(result.errorMessage).toContain('No image loaded')
    })
  })

  describe('triggerLoadProjectDialog', () => {
    const withCapturedFileInput = async (
      run: (getInput: () => HTMLInputElement | undefined) => Promise<void>,
    ) => {
      let capturedInput: HTMLInputElement | undefined
      const originalClick = HTMLInputElement.prototype.click
      HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
        capturedInput = this
      }
      try {
        await run(() => capturedInput)
      } finally {
        HTMLInputElement.prototype.click = originalClick
      }
    }

    it('resolves with an error when no file is selected', async () => {
      await withCapturedFileInput(async (getInput) => {
        const promise = triggerLoadProjectDialog(ctx)
        getInput()?.dispatchEvent(new Event('change'))

        expect(await promise).toEqual({
          success: false,
          errorMessage: 'No file selected',
        })
      })
    })

    it('resolves as unsuccessful without an error message on cancel', async () => {
      await withCapturedFileInput(async (getInput) => {
        const promise = triggerLoadProjectDialog(ctx)
        getInput()?.dispatchEvent(new Event('cancel'))

        expect(await promise).toEqual({ success: false })
      })
    })
  })
})
