<template>
  <div>
    <!-- INFO: the wrapper carries the margin because SdFileInput forwards
         attrs (including `class`) to the inner <input>, and the test hooks
         (`data-cy="image-file-input"`, plus the legacy `id="fileInput"`) have
         to land on that input. `data-cy` is the public contract for hosts
         (see README "Test hooks"); the id is kept only for compatibility. -->
    <div class="mb-2">
      <sd-file-input
        id="fileInput"
        data-cy="image-file-input"
        accept="image/*"
        @change="onImageUploaded"
        label="Choose an image"
      ></sd-file-input>
    </div>

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

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { replaceImage } from '@/application/utils/digitizerOperations'
import { DigitizerError } from '@/application/errors'
import { SdFileInput } from '@/presentation/ui'

export default defineComponent({
  components: { SdFileInput },
  emits: ['image-replaced', 'error'],
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    const { axisSetRepository, datasetRepository } = ctx
    return { ctx, options, axisSetRepository, datasetRepository }
  },
  data() {
    return {
      fileIsDraggedOver: false,
      // INFO: keep the bound handlers so the exact same references can be
      // handed to removeEventListener on unmount — the previous code bound
      // them inline and therefore never actually detached them, leaving a
      // paste/dragover listener per mount alive on document/window.
      onPasteListener: undefined as
        | ((event: ClipboardEvent) => void)
        | undefined,
      onDragOverListener: undefined as ((event: DragEvent) => void) | undefined,
    }
  },

  mounted() {
    this.onPasteListener = (event: ClipboardEvent) => this.onImagePasted(event)
    document.addEventListener('paste', this.onPasteListener)

    //NOTE: Need to get dragenter event from window, because dragenter doesn't fire on the Overlaying DOM which is 'pointer-events: none'
    this.onDragOverListener = (e: DragEvent) => {
      e.preventDefault()
      this.fileIsDraggedOver = true
    }
    window.addEventListener('dragover', this.onDragOverListener)
  },
  beforeUnmount() {
    if (this.onPasteListener) {
      document.removeEventListener('paste', this.onPasteListener)
    }
    if (this.onDragOverListener) {
      window.removeEventListener('dragover', this.onDragOverListener)
    }
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
      // INFO: the host can turn the confirmation off (confirmImageReplace
      // prop) when it drives image loading itself and already asked the user.
      if (this.options.confirmImageReplace && this.hasExistingData()) {
        const confirmed = window.confirm(
          'Loading a new image will reset all axis coordinates and datasets. Are you sure you want to continue?',
        )
        if (!confirmed) {
          return
        }
      }

      try {
        // INFO: replaceImage validates the MIME type, decodes and draws the
        // image and clears axes/datasets/history — shared with the host-facing
        // `image` prop so every entry point behaves identically.
        await replaceImage(this.ctx, file)
        this.$emit('image-replaced', { blob: file })
      } catch (e) {
        // INFO: no alert()/throw here — embedding hosts render their own error
        // UI from the `error` event (invalid type, unreadable file, ...).
        this.$emit('error', DigitizerError.from(e, 'IMAGE_LOAD_FAILED'))
      }
    },
    onImageUploaded(event: Event) {
      const eventTarget = event.target as HTMLInputElement | null
      const file = eventTarget?.files?.[0]
      if (!file) {
        return
      }

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
    dragLeave(e: DragEvent) {
      e.preventDefault()
      this.fileIsDraggedOver = false
    },
    async dropFile(e: DragEvent) {
      e.preventDefault()

      const file = e.dataTransfer?.files[0]
      if (!file) {
        this.fileIsDraggedOver = false
        return
      }

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
