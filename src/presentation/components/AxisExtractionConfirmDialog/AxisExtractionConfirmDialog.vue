<template>
  <v-dialog v-model="dialog" max-width="800px">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5">Confirm Axis Information Extraction</span>
        <!-- Debug Toggle -->
        <v-btn
          size="small"
          variant="text"
          @click="showDebug = !showDebug"
          :color="showDebug ? 'primary' : 'grey'"
          icon
        >
          <v-icon>mdi-bug</v-icon>
        </v-btn>
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
          The following axis information was detected from your chart. Please
          verify the values before importing.
        </p>

        <!-- Axis Values Input Fields -->
        <table v-if="editableResult" style="width: 100%; max-width: 500px; margin: 0 auto;">
          <tbody>
            <tr>
              <td class="pl-0 pr-1" style="width: 50%">
                <v-text-field
                  v-model="displayVal.x1"
                  type="text"
                  prefix="x1: "
                  hide-details
                  density="compact"
                  @click="$event.target.select()"
                ></v-text-field>
              </td>
              <td class="pl-0 pr-1" style="width: 50%">
                <v-text-field
                  v-model="displayVal.x2"
                  type="text"
                  prefix="x2: "
                  hide-details
                  density="compact"
                  @click="$event.target.select()"
                ></v-text-field>
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
            </tr>
          </tbody>
        </table>

        <!-- Debug Information (only shown when debug is enabled) -->
        <v-expand-transition>
          <v-card v-if="showDebug && result" variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1"
              >Debug Information</v-card-title
            >
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <h4>X-Axis (Horizontal) Values:</h4>
                  <p>
                    <strong>Range:</strong> {{ result.x1 }} to {{ result.x2 }}
                  </p>
                  <p
                    v-if="
                      result.horizontalRegion?.axisPosition?.y !== undefined
                    "
                  >
                    <strong>Detected axis line:</strong> Y =
                    {{ result.horizontalRegion.axisPosition.y }}px
                  </p>
                  <p v-if="result.horizontalRegion">
                    <strong>OCR region:</strong>
                    {{ result.horizontalRegion.x }},
                    {{ result.horizontalRegion.y }} ({{
                      result.horizontalRegion.width
                    }}×{{ result.horizontalRegion.height }})
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
                  <p v-if="result.ocrRegions">
                    <strong>OCR regions found:</strong>
                    {{ result.ocrRegions.filter(r => r.type === 'x1' || r.type === 'x2').length }}
                  </p>
                  <p v-if="!result.horizontalRegion">
                    <v-chip size="small" color="warning" variant="outlined">
                      <v-icon class="mr-1">mdi-alert</v-icon>
                      Horizontal axis not detected
                    </v-chip>
                  </p>
                </v-col>
                <v-col cols="6">
                  <h4>Y-Axis (Vertical) Values:</h4>
                  <p>
                    <strong>Range:</strong> {{ result.y1 }} to {{ result.y2 }}
                  </p>
                  <p
                    v-if="result.verticalRegion?.axisPosition?.x !== undefined"
                  >
                    <strong>Detected axis line:</strong> X =
                    {{ result.verticalRegion.axisPosition.x }}px
                  </p>
                  <p v-if="result.verticalRegion">
                    <strong>OCR region:</strong>
                    {{ result.verticalRegion.x }},
                    {{ result.verticalRegion.y }} ({{
                      result.verticalRegion.width
                    }}×{{ result.verticalRegion.height }})
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
                  <p v-if="result.ocrRegions">
                    <strong>OCR regions found:</strong>
                    {{ result.ocrRegions.filter(r => r.type === 'y1' || r.type === 'y2').length }}
                  </p>
                  <p v-if="!result.verticalRegion">
                    <v-chip size="small" color="warning" variant="outlined">
                      <v-icon class="mr-1">mdi-alert</v-icon>
                      Vertical axis not detected
                    </v-chip>
                  </p>
                </v-col>
              </v-row>
              <v-row v-if="result.plotArea" class="mt-4">
                <v-col cols="12">
                  <h4>Detected Plot Area:</h4>
                  <p>
                    <strong>Position:</strong> X={{ result.plotArea.x }}, Y={{
                      result.plotArea.y
                    }}
                  </p>
                  <p>
                    <strong>Size:</strong> {{ result.plotArea.width }} ×
                    {{ result.plotArea.height }} pixels
                  </p>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-expand-transition>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="onReject"> Cancel </v-btn>
        <v-btn color="primary" @click="onConfirm">Import Values</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { AxisExtractionResult, OCRRegion } from '@/application/services/axisExtractor/axisExtractorInterface'

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
      scale: 1,
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
        console.log('[Dialog] Result updated:', newResult)
        if (newResult) {
          this.editableResult = { ...newResult }
          this.displayVal.x1 = String(newResult.x1)
          this.displayVal.x2 = String(newResult.x2)
          this.displayVal.y1 = String(newResult.y1)
          this.displayVal.y2 = String(newResult.y2)
          
          // Redraw canvas when result changes
          this.$nextTick(() => {
            this.drawPreview()
          })
        }
      },
      immediate: true,
      deep: true,
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
    showDebug(newVal: boolean) {
      // Emit debug state change
      this.$emit('debugChange', newVal)
      // Redraw canvas when debug mode is toggled
      this.$nextTick(() => {
        this.drawPreview()
      })
    },
  },
  methods: {
    drawPreview() {
      const canvas = this.$refs.previewCanvas as HTMLCanvasElement
      if (!canvas || !this.originalCanvas || !this.editableResult) return

      const ctx = canvas.getContext('2d')!

      // Set canvas size to match original (with scaling for display)
      this.scale = Math.min(
        600 / this.originalCanvas.width,
        400 / this.originalCanvas.height,
      )
      canvas.width = this.originalCanvas.width * this.scale
      canvas.height = this.originalCanvas.height * this.scale

      // Draw the original image scaled
      ctx.drawImage(this.originalCanvas, 0, 0, canvas.width, canvas.height)

      // Draw red frames around detected regions with resize handles
      this.drawRegions(ctx)
    },
    drawRegions(ctx: CanvasRenderingContext2D) {
      console.log('[Dialog] drawRegions called, showDebug:', this.showDebug, 'has ocrRegions:', !!this.result?.ocrRegions)
      
      // Draw OCR regions if debug mode is enabled and they exist
      if (this.showDebug && this.result?.ocrRegions) {
        console.log('[Dialog] Calling drawOCRRegions')
        this.drawOCRRegions(ctx)
      }

      ctx.strokeStyle = 'red'
      ctx.lineWidth = 2
      ctx.fillStyle = 'red'
      ctx.font = '12px Arial'

      // Draw detected axis lines if debug mode is enabled
      if (this.showDebug) {
        ctx.save()

        // Draw plot area rectangle if detected
        if (this.editableResult?.plotArea) {
          ctx.strokeStyle = '#0080ff' // Blue for plot area
          ctx.lineWidth = 2
          ctx.setLineDash([10, 5]) // Long dashed line

          const plotArea = this.editableResult.plotArea
          const scaledX = plotArea.x * this.scale
          const scaledY = plotArea.y * this.scale
          const scaledWidth = plotArea.width * this.scale
          const scaledHeight = plotArea.height * this.scale

          ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)
          ctx.fillStyle = '#0080ff'
          ctx.fillText('Detected Plot Area', scaledX + 5, scaledY - 5)
        }

        ctx.strokeStyle = '#00ff00' // Green for detected axis lines
        ctx.lineWidth = 3
        ctx.setLineDash([5, 5]) // Dashed line

        // Draw horizontal axis line if detected
        if (
          this.editableResult?.horizontalRegion?.axisPosition?.y !== undefined
        ) {
          const axisY =
            this.editableResult.horizontalRegion.axisPosition.y * this.scale
          ctx.beginPath()
          ctx.moveTo(0, axisY)
          ctx.lineTo(ctx.canvas.width, axisY)
          ctx.stroke()

          // Add axis label
          ctx.fillStyle = '#00ff00'
          ctx.fillText(
            `Detected X-axis line (Y=${Math.round(
              this.editableResult.horizontalRegion.axisPosition.y,
            )}px)`,
            5,
            axisY - 5,
          )
        }

        // Draw vertical axis line if detected
        if (
          this.editableResult?.verticalRegion?.axisPosition?.x !== undefined
        ) {
          const axisX =
            this.editableResult.verticalRegion.axisPosition.x * this.scale
          ctx.beginPath()
          ctx.moveTo(axisX, 0)
          ctx.lineTo(axisX, ctx.canvas.height)
          ctx.stroke()

          // Add axis label
          ctx.save()
          ctx.translate(axisX + 5, ctx.canvas.height / 2)
          ctx.rotate(-Math.PI / 2)
          ctx.fillStyle = '#00ff00'
          ctx.fillText(
            `Detected Y-axis line (X=${Math.round(
              this.editableResult.verticalRegion.axisPosition.x,
            )}px)`,
            0,
            0,
          )
          ctx.restore()
        }

        ctx.restore()
      }

      if (this.editableResult?.horizontalRegion) {
        const region = this.editableResult.horizontalRegion
        const scaledX = region.x * this.scale
        const scaledY = region.y * this.scale
        const scaledWidth = region.width * this.scale
        const scaledHeight = region.height * this.scale

        // Draw region rectangle
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)

        // Add label
        ctx.fillText('X-Axis OCR Region', scaledX, scaledY - 5)
      }

      if (this.editableResult?.verticalRegion) {
        const region = this.editableResult.verticalRegion
        const scaledX = region.x * this.scale
        const scaledY = region.y * this.scale
        const scaledWidth = region.width * this.scale
        const scaledHeight = region.height * this.scale

        // Draw region rectangle
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)

        // Add label
        ctx.fillText(
          'Y-Axis OCR Region',
          scaledX + scaledWidth + 5,
          scaledY + 15,
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
    drawOCRRegions(ctx: CanvasRenderingContext2D) {
      if (!this.result?.ocrRegions) {
        console.log('[Dialog] No OCR regions to draw')
        return
      }

      console.log('[Dialog] Drawing OCR regions:', this.result.ocrRegions.length, this.result.ocrRegions)

      ctx.save()
      
      this.result.ocrRegions.forEach((region, index) => {
        console.log(`[Dialog] Drawing region ${index}:`, region)
        // Scale coordinates
        const scaledX = region.x * this.scale
        const scaledY = region.y * this.scale
        const scaledWidth = region.width * this.scale
        const scaledHeight = region.height * this.scale

        // Set style based on region type
        switch (region.type) {
          case 'x1':
            ctx.strokeStyle = '#FF0000' // Red
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)'
            break
          case 'x2':
            ctx.strokeStyle = '#00CC00' // Green
            ctx.fillStyle = 'rgba(0, 204, 0, 0.1)'
            break
          case 'y1':
            ctx.strokeStyle = '#0066FF' // Blue
            ctx.fillStyle = 'rgba(0, 102, 255, 0.1)'
            break
          case 'y2':
            ctx.strokeStyle = '#CC00CC' // Magenta
            ctx.fillStyle = 'rgba(204, 0, 204, 0.1)'
            break
          default:
            ctx.strokeStyle = '#666666' // Gray
            ctx.fillStyle = 'rgba(102, 102, 102, 0.05)'
        }

        ctx.lineWidth = 3
        
        // Draw filled rectangle
        ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight)
        
        // Draw border with thicker line for x1, x2, y1, y2
        if (region.type !== 'other') {
          ctx.lineWidth = 4
        }
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)
        ctx.lineWidth = 3  // Reset line width

        // Draw label
        if (region.type !== 'other') {
          ctx.fillStyle = ctx.strokeStyle
          ctx.font = 'bold 14px Arial'
          ctx.fillText(
            `${region.type}: ${region.text}`,
            scaledX + 5,
            scaledY - 5
          )
          
          // Draw center point if available
          if (region.centerX !== undefined && region.centerY !== undefined) {
            const scaledCenterX = region.centerX * this.scale
            const scaledCenterY = region.centerY * this.scale
            
            // Draw crosshair at center
            ctx.strokeStyle = ctx.strokeStyle
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(scaledCenterX - 5, scaledCenterY)
            ctx.lineTo(scaledCenterX + 5, scaledCenterY)
            ctx.moveTo(scaledCenterX, scaledCenterY - 5)
            ctx.lineTo(scaledCenterX, scaledCenterY + 5)
            ctx.stroke()
            
            // Draw small circle at center
            ctx.beginPath()
            ctx.arc(scaledCenterX, scaledCenterY, 3, 0, 2 * Math.PI)
            ctx.fill()
          }
        }
      })
      
      ctx.restore()
    },
  },
})
</script>

<style scoped>
.canvas-container {
  text-align: center;
}
</style>
