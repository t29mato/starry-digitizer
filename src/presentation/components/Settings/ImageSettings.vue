<template>
  <v-file-input
    id="fileInput"
    accept="image/*"
    @change="onImageUploaded"
    :clearable="false"
    label="choose an image file"
    hide-details
    class="mb-5"
  ></v-file-input>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useAxesStore } from '@/store/axes'
import { useDatasetsStore } from '@/store/datasets'
import { mapActions } from 'pinia'
import { Extractor } from '@/application/services/extractor/extractor'
import { Canvas } from '@/application/services/canvas/canvas'

export default defineComponent({
  data() {
    return {
      extractor: Extractor.getInstance(),
      canvas: Canvas.getInstance(),
    }
  },
  mounted() {
    document.addEventListener('paste', this.onImagePasted.bind(this))
  },
  beforeDestroy() {
    document.removeEventListener('paste', this.onImagePasted)
  },
  methods: {
    ...mapActions(useAxesStore, ['clearAxesCoords']),
    ...mapActions(useDatasetsStore, ['clearPlots']),
    async updateImage(file: File) {
      try {
        if (!this.isValidFileType(file.type)) {
          alert('Please upload jpg / png image file.')
          return
        }

        const fr = await this.readFile(file)
        if (typeof fr.result !== 'string') {
          throw new Error('file is not string type')
        }

        await this.canvas.initializeImageElement(fr.result)
        this.canvas.drawFitSizeImage()
        this.extractor.setSwatches(this.canvas.colorSwatches)
        this.canvas.setUploadImageUrl(fr.result)
        this.clearAxesCoords()
        this.clearPlots()
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
    isValidFileType(fileType: String) {
      return fileType === 'image/jpeg' || fileType === 'image/png'
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
  },
})
</script>
