<template>
  <v-dialog v-model="dialog" max-width="800px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Confirm Axis Information Extraction</span>
      </v-card-title>

      <v-card-text>
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

        <p class="mb-4">
          The following axis information was detected from your chart. You can edit the values if needed.
        </p>

        <!-- Axis Values Input Fields using table layout like AxisSetSettings -->
        <div v-if="editableResult">
          <table>
            <tbody>
              <tr>
                <td class="pl-0 pr-1" style="width: 42%">
                  <v-text-field
                    v-model="displayVal.x1"
                    type="text"
                    prefix="x1: "
                    hide-details
                    density="compact"
                    @click="$event.target.select()"
                  ></v-text-field>
                </td>
                <td class="pl-0 pr-1" style="width: 42%">
                  <v-text-field
                    v-model="displayVal.x2"
                    type="text"
                    prefix="x2: "
                    hide-details
                    density="compact"
                    @click="$event.target.select()"
                  ></v-text-field>
                </td>
                <td style="width: 16%">
                  <!-- Debug Toggle -->
                  <v-btn
                    size="small"
                    variant="text"
                    @click="showDebug = !showDebug"
                    :color="showDebug ? 'primary' : 'grey'"
                  >
                    <v-icon>mdi-bug</v-icon>
                  </v-btn>
                </td>
              </tr>
              <tr>
                <td class="pl-0 pr-1">
                  <v-text-field
                    v-model="displayVal.y1"
                    prefix="y1: "
                    type="text"
                    hide-details
                    density="compact"
                    @click="$event.target.select()"
                  ></v-text-field>
                </td>
                <td class="pl-0 pr-1">
                  <v-text-field
                    v-model="displayVal.y2"
                    prefix="y2: "
                    type="text"
                    hide-details
                    density="compact"
                    @click="$event.target.select()"
                  ></v-text-field>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Debug Information (only shown when debug is enabled) -->
        <v-expand-transition>
          <v-card v-if="showDebug && result" variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">Debug Information</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <h4>X-Axis Values:</h4>
                  <p><strong>Range:</strong> {{ result.x1 }} to {{ result.x2 }}</p>
                  <p v-if="result.horizontalRegion">
                    <strong>Detection region:</strong> 
                    {{ result.horizontalRegion.x }}, {{ result.horizontalRegion.y }} 
                    ({{ result.horizontalRegion.width }}×{{ result.horizontalRegion.height }})
                  </p>
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
                    <strong>Detection region:</strong> 
                    {{ result.verticalRegion.x }}, {{ result.verticalRegion.y }} 
                    ({{ result.verticalRegion.width }}×{{ result.verticalRegion.height }})
                  </p>
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
            </v-card-text>
          </v-card>
        </v-expand-transition>

      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="onReject">
          Cancel
        </v-btn>
        <v-btn color="primary" @click="onConfirm">Import Values</v-btn>
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
  data() {
    return {
      showDebug: false,
      editableResult: null as AxisExtractionResult | null,
      displayVal: {
        x1: '',
        x2: '',
        y1: '',
        y2: '',
      },
    }
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
    result: {
      handler(newResult) {
        if (newResult) {
          this.editableResult = { ...newResult }
          this.displayVal.x1 = String(newResult.x1)
          this.displayVal.x2 = String(newResult.x2)
          this.displayVal.y1 = String(newResult.y1)
          this.displayVal.y2 = String(newResult.y2)
        }
      },
      immediate: true,
    },
    'displayVal.x1'(value: string) {
      if (this.editableResult) {
        this.editableResult.x1 = parseFloat(value) || 0
      }
    },
    'displayVal.x2'(value: string) {
      if (this.editableResult) {
        this.editableResult.x2 = parseFloat(value) || 0
      }
    },
    'displayVal.y1'(value: string) {
      if (this.editableResult) {
        this.editableResult.y1 = parseFloat(value) || 0
      }
    },
    'displayVal.y2'(value: string) {
      if (this.editableResult) {
        this.editableResult.y2 = parseFloat(value) || 0
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
      this.$emit('confirm', this.editableResult)
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
