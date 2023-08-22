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
import { onMounted, onBeforeUnmount } from 'vue'
import { useCanvasStore } from '@/store'
import { useAxesStore } from '@/store/modules/axes'
import { useDatasetStore } from '@/store/modules/dataset'
import { useExtractorStore } from '@/store/modules/extractor'

export default {
  setup() {
    const { colorSwatches, drawFitSizeImage, setUploadImageUrl, changeImage } =
      useCanvasStore()
    const { clearAxesCoords } = useAxesStore()
    const { clearPlots } = useDatasetStore()
    const { setSwatches } = useExtractorStore()

    const uploadImage = async (file: File) => {
      try {
        const fr = await readFile(file)
        if (typeof fr.result !== 'string') {
          throw new Error('file is not string type')
        }
        // TODO: Canvasを利用する
        const image = await loadImage(fr.result)
        changeImage(image)
        drawFitSizeImage()
        setSwatches(colorSwatches.value)
        setUploadImageUrl(fr.result)
        clearAxesCoords()
        clearPlots()
      } finally {
        //
      }
    }

    const readFile = (file: File): Promise<FileReader> => {
      return new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.readAsDataURL(file)
        fr.addEventListener('load', () => resolve(fr))
        fr.addEventListener('error', (error) => reject(error))
      })
    }

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = (error) => reject(error)
        img.src = src
      })
    }

    const pasteHandler = () => {
      // ... pasteHandlerの実装 ...
    }

    // イベントリスナを登録
    onMounted(() => {
      document.addEventListener('paste', pasteHandler)
    })

    // イベントリスナを解除
    onBeforeUnmount(() => {
      document.removeEventListener('paste', pasteHandler)
    })

    return {
      uploadImage,
    }
  },
}
</script>
