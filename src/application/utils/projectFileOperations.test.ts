import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import { DigitizerContext } from '@/application/digitizerContext'
import { DigitizerError } from '@/application/errors'
import { createEmptyProject } from '@/application/dto/projectDTO'

const mockLoadProject = jest.fn()

// INFO: loadProjectFromFile delegates the whole "apply image + restore state"
// step to digitizerOperations.loadProject, which has its own test suite —
// here we only assert that it is handed the unpacked DTO and image.
jest.mock('@/application/utils/digitizerOperations', () => ({
  loadProject: (...args: unknown[]) => mockLoadProject(...args),
}))

import {
  defaultProjectZipFilename,
  loadProjectFromFile,
  saveProject,
} from './projectFileOperations'

const mockExportProject = jest.fn()
const mockImportProject = jest.fn()

const buildContext = () =>
  ({
    projectService: {
      exportProject: (...args: unknown[]) => mockExportProject(...args),
      importProject: (...args: unknown[]) => mockImportProject(...args),
    },
  }) as unknown as DigitizerContext

describe('projectFileOperations', () => {
  let ctx: DigitizerContext

  beforeEach(() => {
    jest.clearAllMocks()
    ctx = buildContext()
  })

  describe('defaultProjectZipFilename', () => {
    it('builds an sd-<timestamp>.zip name', () => {
      expect(defaultProjectZipFilename(new Date('2026-09-03T17:45:00.123Z'))).toBe(
        'sd-20260903-174500.zip',
      )
    })
  })

  describe('saveProject', () => {
    it('returns the exported blob and a default filename', async () => {
      const blob = new Blob()
      mockExportProject.mockResolvedValue(blob as never)

      const result = await saveProject(ctx)

      expect(mockExportProject).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.blob).toBe(blob)
      expect(result.filename).toMatch(/^sd-\d{8}-\d{6}\.zip$/)
    })

    it('returns an EXPORT_FAILED error when export fails', async () => {
      mockExportProject.mockRejectedValue(new Error('disk full') as never)

      const result = await saveProject(ctx)

      expect(result.success).toBe(false)
      expect(result.blob).toBeUndefined()
      expect(result.errorMessage).toContain('disk full')
      expect(result.error).toBeInstanceOf(DigitizerError)
      expect(result.error?.code).toBe('EXPORT_FAILED')
    })

    it('passes an existing DigitizerError through with its own code', async () => {
      mockExportProject.mockRejectedValue(
        new DigitizerError('EXPORT_FAILED', 'No image loaded') as never,
      )

      const result = await saveProject(ctx)

      expect(result.error?.code).toBe('EXPORT_FAILED')
      expect(result.errorMessage).toContain('No image loaded')
    })
  })

  describe('loadProjectFromFile', () => {
    const file = new File(['zip-bytes'], 'project.zip')

    it('unpacks the ZIP and hands the DTO and image to loadProject', async () => {
      const projectData = createEmptyProject()
      mockImportProject.mockResolvedValue({
        projectData,
        imageData: 'data:image/png;base64,xxx',
      } as never)
      mockLoadProject.mockResolvedValue(undefined as never)

      const result = await loadProjectFromFile(ctx, file)

      expect(mockImportProject).toHaveBeenCalledWith(file)
      expect(mockLoadProject).toHaveBeenCalledWith(
        ctx,
        projectData,
        'data:image/png;base64,xxx',
      )
      expect(result).toEqual({ success: true })
    })

    it('returns a ZIP_INVALID error when the import fails', async () => {
      mockImportProject.mockRejectedValue(
        new DigitizerError('ZIP_INVALID', 'bad zip') as never,
      )

      const result = await loadProjectFromFile(ctx, file)

      expect(mockLoadProject).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('bad zip')
      expect(result.error?.code).toBe('ZIP_INVALID')
    })

    it('falls back to PROJECT_INVALID for a plain Error', async () => {
      mockImportProject.mockRejectedValue(new Error('boom') as never)

      const result = await loadProjectFromFile(ctx, file)

      expect(result.error).toBeInstanceOf(DigitizerError)
      expect(result.error?.code).toBe('PROJECT_INVALID')
    })

    it('reports a failure raised while applying the loaded project', async () => {
      mockImportProject.mockResolvedValue({
        projectData: createEmptyProject(),
        imageData: 'data:image/png;base64,xxx',
      } as never)
      mockLoadProject.mockRejectedValue(
        new DigitizerError('IMAGE_LOAD_FAILED', 'cannot decode') as never,
      )

      const result = await loadProjectFromFile(ctx, file)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('IMAGE_LOAD_FAILED')
    })
  })
})
