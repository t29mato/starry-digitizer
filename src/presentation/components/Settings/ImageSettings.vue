<template>
  <div>
    <v-file-input
      id="fileInput"
      accept="image/*"
      @change="onImageUploaded"
      label="Choose an image"
      :single-line="true"
      :clearable="false"
      hide-details
      density="compact"
      class="mb-2"
      font-size="0.8rem"
    ></v-file-input>

    <v-btn
      @click="extractLinesWithAI"
      :disabled="!hasImage || aiExtracting"
      :loading="aiExtracting"
      color="primary"
      size="small"
      class="mb-2"
      block
    >
      <v-icon start size="small">mdi-robot</v-icon>
      Auto Extract with AI
    </v-btn>

    <v-alert v-if="aiErrorMessage" type="error" density="compact" class="mb-2">
      {{ aiErrorMessage }}
    </v-alert>

    <v-alert
      v-if="aiSuccessMessage"
      type="success"
      density="compact"
      class="mb-2"
    >
      {{ aiSuccessMessage }}
    </v-alert>

    <div
      class="c_file-drag-area"
      :class="{ 'is-dragged-over': fileIsDraggedOver }"
      @dragleave="dragLeave"
      @drop="dropFile"
    ></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { extractor } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { autoLineDigitizerService } from '@/instanceStore/applicationServiceInstances'
import { projectService } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { Dataset } from '@/domain/models/dataset/dataset'
import { POINT_MODE } from '@/constants'

import { VALID_IMAGE_TYPES } from '@/presentation/constants'

export default defineComponent({
  data() {
    return {
      extractor,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
      interpolator,
      autoLineDigitizerService,
      projectService,
      fileIsDraggedOver: false,
      aiExtracting: false,
      aiErrorMessage: '',
      aiSuccessMessage: '',
    }
  },

  computed: {
    hasImage() {
      return (
        !!this.canvasHandler.uploadImageUrl ||
        !!this.canvasHandler.imageElement.src
      )
    },
  },

  mounted() {
    document.addEventListener('paste', this.onImagePasted.bind(this))

    //NOTE: Need to get dragenter event from window, because dragenter doesn't fire on the Overlaying DOM which is 'pointer-events: none'
    window.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault()
      this.fileIsDraggedOver = true
    })
  },
  beforeDestroy() {
    document.removeEventListener('paste', this.onImagePasted)
  },
  methods: {
    hasExistingData(): boolean {
      // Check if axis is set
      const hasAxisData =
        this.axisSetRepository.activeAxisSet.hasXAxis ||
        this.axisSetRepository.activeAxisSet.hasYAxis

      // Check if any dataset has points
      const hasDatasetPoints = this.datasetRepository.datasets.some(
        (dataset) => dataset.points.length > 0,
      )

      return hasAxisData || hasDatasetPoints
    },
    async updateImage(file: File) {
      try {
        if (!this.isValidFileType(file.type)) {
          alert(
            `Please upload an image in one of the following formats: ${VALID_IMAGE_TYPES.flatMap(
              (type) => type.extensions,
            ).join(',')}`,
          )
          return
        }

        // Check if there's existing data and confirm reset
        if (this.hasExistingData()) {
          const confirmed = window.confirm(
            'Loading a new image will reset all axis coordinates and datasets. Are you sure you want to continue?',
          )
          if (!confirmed) {
            return
          }
        }

        const fr = await this.readFile(file)
        if (typeof fr.result !== 'string') {
          throw new Error('file is not string type')
        }

        await this.canvasHandler.initializeImageElement(fr.result)
        this.canvasHandler.drawFitSizeImage()
        this.interpolator.isActive && this.interpolator.clearPreview()
        this.extractor.setSwatches(this.canvasHandler.colorSwatches)
        this.canvasHandler.setUploadImageUrl(fr.result)

        // Reset all axis coordinates for all axis sets
        this.axisSetRepository.axisSets.forEach((axisSet) => {
          axisSet.clearAxisCoords()
        })

        // Reset all datasets and create a new default dataset
        this.datasetRepository.clearAllDatasets()
        this.datasetRepository.createNewDataset()
        this.datasetRepository.setActiveDataset(
          this.datasetRepository.lastDatasetId,
        )
      } catch (e) {
        console.error('failed to update image', { cause: e })
      }
    },
    onImageUploaded(event: Event) {
      const eventTarget = event.target as HTMLInputElement

      if (!eventTarget) {
        throw 'Unexpected Error: event target does not exist'
      }

      if (!eventTarget.files) {
        throw 'Unexpected Error: file was not uploaded'
      }

      const file = eventTarget.files[0]

      this.updateImage(file)
    },
    onImagePasted(event: ClipboardEvent) {
      // INFO: 入力フィールドにカーソルが当たってる場合はスルー
      const targetName = (event.target as Element).nodeName
      if (targetName === 'INPUT' || targetName === 'TEXTAREA') {
        return
      }
      if (!event.clipboardData) {
        return
      }
      if (!event.clipboardData.items) {
        return
      }
      const items = event.clipboardData.items
      if (items[0].type.indexOf('image') === -1) {
        return
      }
      const imageFile = items[0].getAsFile()
      if (!imageFile) {
        return
      }
      this.updateImage(imageFile)
    },
    isValidFileType(fileType: string) {
      return VALID_IMAGE_TYPES.map(
        (imgTypeData) => imgTypeData.fileType,
      ).includes(fileType)
    },
    readFile(file: File): Promise<FileReader> {
      return new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.addEventListener('load', () => resolve(fr))
        fr.addEventListener('error', (error) => reject(error))
        fr.readAsDataURL(file)
      })
    },
    loadImage(src: string): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = (error) => reject(error)
        img.src = src
      })
    },
    dragLeave(e: DragEvent) {
      e.preventDefault()
      this.fileIsDraggedOver = false
    },
    async dropFile(e: DragEvent) {
      e.preventDefault()

      const file = e.dataTransfer?.files[0]
      if (!file) return

      await this.updateImage(file)

      this.fileIsDraggedOver = false
    },
    async extractLinesWithAI() {
      this.aiExtracting = true
      this.aiErrorMessage = ''
      this.aiSuccessMessage = ''

      try {
        let imageBase64 = ''

        // Check if uploadImageUrl is a base64 data URL
        if (
          this.canvasHandler.uploadImageUrl &&
          this.canvasHandler.uploadImageUrl.startsWith('data:image/')
        ) {
          console.log('Using uploadImageUrl (base64)')
          imageBase64 = this.canvasHandler.uploadImageUrl
        } else {
          // Get image from the main canvas (for sample images or non-base64 sources)
          console.log('Getting image from main canvas')
          const mainCanvas = document.querySelector(
            'canvas#imageCanvas',
          ) as HTMLCanvasElement
          if (!mainCanvas) {
            throw new Error('Main canvas not found')
          }

          // Get image data from the existing canvas
          imageBase64 = mainCanvas.toDataURL('image/png')
          console.log('Converted to base64, length:', imageBase64.length)
        }

        if (!imageBase64) {
          this.aiErrorMessage = 'Please upload an image first'
          return
        }

        console.log('Calling API with image data length:', imageBase64.length)

        // Call AutoLineDigitizer API
        const projectData =
          await this.autoLineDigitizerService.extractLines(imageBase64)

        // Clear existing data
        this.axisSetRepository.clearAllAxisSets()
        this.datasetRepository.clearAllDatasets()

        // Restore axis sets from ProjectDTO
        for (const axisSetDTO of projectData.axisSets) {
          const axisSet = new AxisSet(
            new Axis('x1', axisSetDTO.x1.value, axisSetDTO.x1.coord),
            new Axis('x2', axisSetDTO.x2.value, axisSetDTO.x2.coord),
            new Axis('y1', axisSetDTO.y1.value, axisSetDTO.y1.coord),
            new Axis('y2', axisSetDTO.y2.value, axisSetDTO.y2.coord),
            new Axis('x2y2', -1, { xPx: -999, yPx: -999 }),
            axisSetDTO.id,
            axisSetDTO.name,
          )
          axisSet.xIsLogScale = axisSetDTO.xIsLogScale
          axisSet.yIsLogScale = axisSetDTO.yIsLogScale
          axisSet.considerGraphTilt = axisSetDTO.considerGraphTilt
          axisSet.pointMode = axisSetDTO.pointMode
          axisSet.isVisible = axisSetDTO.isVisible

          this.axisSetRepository.axisSets.push(axisSet)
        }

        // Set active axis set
        this.axisSetRepository.setActiveAxisSet(projectData.activeAxisSetId)

        // Restore datasets from ProjectDTO
        for (const datasetDTO of projectData.datasets) {
          const dataset = new Dataset(
            datasetDTO.name,
            datasetDTO.points,
            datasetDTO.id,
          )
          dataset.axisSetId = datasetDTO.axisSetId
          dataset.visiblePointIds = datasetDTO.visiblePointIds
          dataset.manuallyAddedPointIds = datasetDTO.manuallyAddedPointIds
          this.datasetRepository.datasets.push(dataset)
        }

        // Remove empty "dataset 1" if it exists
        const emptyDataset1 = this.datasetRepository.datasets.find(
          (d) => d.id === 1 && d.name === 'dataset 1' && d.points.length === 0,
        )
        if (emptyDataset1 && this.datasetRepository.datasets.length > 1) {
          this.datasetRepository.datasets =
            this.datasetRepository.datasets.filter((d) => d.id !== 1)
        }

        // Set active dataset to "View All Datasets"
        this.datasetRepository.setActiveDataset(0)

        // Set all axis sets to 4 points mode
        this.axisSetRepository.axisSets.forEach((axisSet) => {
          axisSet.pointMode = POINT_MODE.FOUR_POINTS
        })

        // Restore canvas handler state
        this.canvasHandler.scale = projectData.canvasHandler.scale
        this.canvasHandler.manualMode = projectData.canvasHandler.manualMode

        const lineCount = projectData.datasets.filter(
          (d) => d.points.length > 0,
        ).length
        this.aiSuccessMessage = `Successfully extracted ${lineCount} line(s) with AI!`

        // Clear success message after 5 seconds
        setTimeout(() => {
          this.aiSuccessMessage = ''
        }, 5000)
      } catch (error) {
        console.error('Error extracting lines with AI:', error)
        this.aiErrorMessage = `Failed to extract lines: ${
          (error as Error).message
        }`
      } finally {
        this.aiExtracting = false
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &_file-drag-area {
    display: none;
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    z-index: 200;

    &.is-dragged-over {
      display: flex;
      background: rgba(0, 0, 0, 0.5);
    }
  }
}
</style>
