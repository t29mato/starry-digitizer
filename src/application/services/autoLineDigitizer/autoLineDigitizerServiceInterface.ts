import { ProjectDTO } from '@/application/dto/projectDTO'

export interface ExtractionOptions {
  autoAxisDetection?: boolean
  downsampleMode?: 'none' | 'max_points' | 'fixed' | 'arc_length'
  maxPoints?: number
  fixedStep?: number
  sortMode?: 'original' | 'mean_y_desc' | 'mean_y_asc'
  outputFormat?: string
}

export interface AutoLineDigitizerServiceInterface {
  /**
   * Extract lines from a chart image using AutoLineDigitizer API
   * @param imageBase64 - Base64 encoded image (data:image/png;base64,... format)
   * @param options - Optional extraction parameters
   * @returns ProjectDTO compatible with StarryDigitizer
   */
  extractLines(
    imageBase64: string,
    options?: ExtractionOptions,
  ): Promise<ProjectDTO>
}
