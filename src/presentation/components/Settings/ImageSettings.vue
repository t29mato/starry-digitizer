<template>
  <div>
    <v-file-input
      id="fileInput"
      accept="image/*"
      @change="onImageUploaded"
      label="Choose an image"
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
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { extractor } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

import { VALID_IMAGE_TYPES } from '@/presentation/constants'

export default defineComponent({
  data() {
    return {
      extractor,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
      interpolator,
      fileIsDraggedOver: false,
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

        const fr = await this.readFile(file)
        if (typeof fr.result !== 'string') {
          throw new Error('file is not string type')
        }

        await this.canvasHandler.initializeImageElement(fr.result)
        this.canvasHandler.drawFitSizeImage()
        this.interpolator.isActive && this.interpolator.clearPreview()
        this.extractor.setSwatches(this.canvasHandler.colorSwatches)
        this.canvasHandler.setUploadImageUrl(fr.result)
        this.axisSetRepository.activeAxisSet.clearAxisCoords()
        this.datasetRepository.activeDataset.clearPoints()
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
