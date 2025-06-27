<template>
  <v-dialog v-model="dialog" max-width="800px" persistent>
    <v-card>
      <v-card-title>
        <span class="text-h5">Confirm Axis Information Extraction</span>
      </v-card-title>

      <v-card-text>
        <p class="mb-4">
          The following axis information was detected from your chart. Red
          frames show the regions where text was extracted.
        </p>

        <!-- Canvas to show the image with highlighted regions -->
        <div
          class="canvas-container mb-4"
          style="position: relative; display: inline-block"
        >
          <canvas
            ref="previewCanvas"
            style="border: 1px solid #ccc; max-width: 100%; height: auto"
          ></canvas>
        </div>

        <!-- Extracted values summary -->
        <v-row v-if="result">
          <v-col cols="6">
            <h4>X-Axis Values:</h4>
            <p><strong>Range:</strong> {{ result.x1 }} to {{ result.x2 }}</p>
            <p v-if="result.horizontalRegion">
              <strong>Extracted text:</strong> "{{
                result.horizontalRegion.extractedText
              }}"
            </p>
            <p v-if="result.horizontalRegion">
              <strong>Found values:</strong>
              {{ result.horizontalRegion.extractedValues.join(', ') }}
            </p>
          </v-col>
          <v-col cols="6">
            <h4>Y-Axis Values:</h4>
            <p><strong>Range:</strong> {{ result.y1 }} to {{ result.y2 }}</p>
            <p v-if="result.verticalRegion">
              <strong>Extracted text:</strong> "{{
                result.verticalRegion.extractedText
              }}"
            </p>
            <p v-if="result.verticalRegion">
              <strong>Found values:</strong>
              {{ result.verticalRegion.extractedValues.join(', ') }}
            </p>
          </v-col>
        </v-row>

        <v-alert type="info" class="mt-4">
          Do you want to import these axis values into your project?
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="onReject">
          No, Cancel
        </v-btn>
        <v-btn color="primary" @click="onConfirm"> Yes, Import Values </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { AxisExtractionResult } from '@/application/services/axisExtractor/axisExtractorInterface'

export default defineComponent({
  name: 'AxisExtractionConfirmDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    result: {
      type: Object as PropType<AxisExtractionResult | null>,
      default: null,
    },
    originalCanvas: {
      type: Object as PropType<HTMLCanvasElement | null>,
      default: null,
    },
  },
  computed: {
    dialog: {
      get(): boolean {
        return this.modelValue
      },
      set(value: boolean): void {
        this.$emit('update:modelValue', value)
      },
    },
  },
  mounted() {
    this.drawPreview()
  },
  watch: {
    modelValue(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.drawPreview()
        })
      }
    },
  },
  methods: {
    drawPreview() {
      const canvas = this.$refs.previewCanvas as HTMLCanvasElement
      if (!canvas || !this.originalCanvas || !this.result) return

      const ctx = canvas.getContext('2d')!

      // Set canvas size to match original (with scaling for display)
      const scale = Math.min(
        600 / this.originalCanvas.width,
        400 / this.originalCanvas.height,
      )
      canvas.width = this.originalCanvas.width * scale
      canvas.height = this.originalCanvas.height * scale

      // Draw the original image scaled
      ctx.drawImage(this.originalCanvas, 0, 0, canvas.width, canvas.height)

      // Draw red frames around detected regions
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 2

      if (this.result.horizontalRegion) {
        const region = this.result.horizontalRegion
        ctx.strokeRect(
          region.x * scale,
          region.y * scale,
          region.width * scale,
          region.height * scale,
        )

        // Add label
        ctx.fillStyle = 'red'
        ctx.font = '12px Arial'
        ctx.fillText('X-Axis', region.x * scale, region.y * scale - 5)
      }

      if (this.result.verticalRegion) {
        const region = this.result.verticalRegion
        ctx.strokeRect(
          region.x * scale,
          region.y * scale,
          region.width * scale,
          region.height * scale,
        )

        // Add label
        ctx.fillStyle = 'red'
        ctx.font = '12px Arial'
        ctx.fillText(
          'Y-Axis',
          region.x * scale + region.width * scale + 5,
          region.y * scale + 15,
        )
      }
    },
    onConfirm() {
      this.$emit('confirm', this.result)
      this.dialog = false
    },
    onReject() {
      this.$emit('reject')
      this.dialog = false
    },
  },
})
</script>

<style scoped>
.canvas-container {
  text-align: center;
}
</style>
