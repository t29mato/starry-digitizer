<template>
  <v-file-input
    accept="image/*"
    @change="uploadImage"
    :clearable="false"
    label="choose an image file"
    hide-details
    class="mb-1"
  ></v-file-input>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useCanvasStore } from '@/store/canvas'

const canvasStore = useCanvasStore()

export default defineComponent({
  computed: {
    canvas: () => canvasStore.canvas,
  },
  data() {
    return {}
  },
  mounted() {
    document.addEventListener('paste', this.pasteHandler.bind(this))
  },
  beforeDestroy() {
    document.removeEventListener('paste', this.pasteHandler)
  },

  props: {},
  methods: {
    ...mapActions('canvas', ['drawFitSizeImage', 'setUploadImageUrl']),
    ...mapActions('axes', ['clearAxesCoords']),
    ...mapActions('datasets', ['clearPlots']),
    ...mapActions('extractor', ['setSwatches']),
    async uploadImage(file: File) {
      try {
        const fr = await this.readFile(file)
        if (typeof fr.result !== 'string') {
          throw new Error('file is not string type')
        }
        // TODO: Canvasを利用する
        const image = await this.loadImage(fr.result)
        this.canvas.changeImage(image)
        this.drawFitSizeImage()
        this.setSwatches(this.canvas.colorSwatches)
        this.setUploadImageUrl(fr.result)
        this.clearAxesCoords()
        this.clearPlots()
      } finally {
        //
      }
    },
    readFile(file: File): Promise<FileReader> {
      return new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.readAsDataURL(file)
        fr.addEventListener('load', () => resolve(fr))
        fr.addEventListener('error', (error) => reject(error))
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
    pasteHandler(event: ClipboardEvent) {
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
      this.uploadImage(imageFile)
    },
  },
})
</script>
