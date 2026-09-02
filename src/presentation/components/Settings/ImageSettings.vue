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

    <div
      class="c_file-drag-area"
      :class="{ 'is-dragged-over': fileIsDraggedOver }"
      @dragleave="dragLeave"
      @drop="dropFile"
    ></div>

    <confirm-dialog
      v-model="confirmDialogShow"
      title="Load new image?"
      message="Loading a new image will reset all axis coordinates and datasets. Are you sure you want to continue?"
      confirm-color="error"
      @confirm="handleConfirmDialogConfirm"
    ></confirm-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { extractor } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { projectService } from '@/instanceStore/applicationServiceInstances'
import { historyManager } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

import { VALID_IMAGE_TYPES } from '@/presentation/constants'
import ConfirmDialog from '@/presentation/components/Generals/ConfirmDialog.vue'

export default defineComponent({
  components: {
    ConfirmDialog,
  },
  data() {
    return {
      extractor,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
      interpolator,
      projectService,
      historyManager,
      fileIsDraggedOver: false,
      // INFO: replaces window.confirm() (#270). `show` is a separate
      // top-level field — see NOTE in DatasetManager.vue.
      confirmDialogShow: false,
      confirmDialog: {
        onConfirm: null as (() => void) | null,
      },
    }
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
      if (!this.isValidFileType(file.type)) {
        alert(
          `Please upload an image in one of the following formats: ${VALID_IMAGE_TYPES.flatMap(
            (type) => type.extensions,
          ).join(',')}`,
        )
        return
      }

      // Check if there's existing data and confirm reset — replaces
      // window.confirm() (#270)
      if (this.hasExistingData()) {
        this.confirmDialog.onConfirm = () => this.applyNewImage(file)
        this.confirmDialogShow = true
        return
      }

      await this.applyNewImage(file)
    },
    handleConfirmDialogConfirm() {
      const onConfirm = this.confirmDialog.onConfirm
      this.confirmDialog.onConfirm = null
      onConfirm && onConfirm()
    },
    async applyNewImage(file: File) {
      try {
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

        // INFO: undo/redo history is scoped to axisSets/datasets on the
        // current image (see docs/design/ux-ideas-implementation-design.md)
        // — snapshots from the previous image no longer make sense once the
        // image itself has changed, so drop them.
        this.historyManager.clear()
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
