import {
  AutoLineDigitizerServiceInterface,
  ExtractionOptions,
} from './autoLineDigitizerServiceInterface'
import { ProjectDTO } from '@/application/dto/projectDTO'

export class AutoLineDigitizerService
  implements AutoLineDigitizerServiceInterface
{
  private readonly API_URL =
    'https://t29mato-autolinedigitizer.hf.space/custom_api/digitize_base64'
  private readonly DEFAULT_TIMEOUT = 300000 // 5 minutes for cold start

  async extractLines(
    imageBase64: string,
    options?: ExtractionOptions,
  ): Promise<ProjectDTO> {
    // Merge with default options
    const extractionOptions: ExtractionOptions = {
      autoAxisDetection: true,
      downsampleMode: 'arc_length',
      maxPoints: 20,
      fixedStep: 10,
      sortMode: 'mean_y_desc',
      outputFormat: 'starry_digitizer_json',
      ...options,
    }

    // Build request payload for Gradio v6 API
    const requestData = {
      data: [
        imageBase64, // Base64 string (data:image/png;base64,... format)
        extractionOptions.autoAxisDetection,
        extractionOptions.downsampleMode,
        extractionOptions.maxPoints,
        extractionOptions.fixedStep,
        extractionOptions.sortMode,
        extractionOptions.outputFormat,
      ],
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.DEFAULT_TIMEOUT,
      )

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(
          `API request failed with status ${response.status}: ${response.statusText}`,
        )
      }

      const result = await response.json()

      // Validate response structure
      if (!result.data || !Array.isArray(result.data) || !result.data[0]) {
        throw new Error('Invalid API response format')
      }

      // Parse ProjectDTO from response
      const projectJson = result.data[0]
      const projectData: ProjectDTO = JSON.parse(projectJson)

      // Validate ProjectDTO
      if (!projectData.version || !projectData.axisSets) {
        throw new Error('Invalid project data format from API')
      }

      return projectData
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            'Request timed out. The API may be starting up (cold start). Please try again in a few moments.',
          )
        }
        throw error
      }
      throw new Error('Unknown error occurred during line extraction')
    }
  }
}
