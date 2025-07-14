<template>
  <v-dialog v-model="dialog" max-width="1400px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Confirm Axis Information Extraction</span>
      </v-card-title>

      <v-card-text>
        <!-- Debug mode: 4 separate canvases -->
        <div>
          <!-- Sliders in a row -->
          <v-row class="mb-4">
            <!-- Minimum area ratio adjustment slider -->
            <v-col cols="6" class="pr-2">
              <v-slider
                v-model="minAreaRatio"
                label="Minimum Plot Area Size (%)"
                :min="10"
                :max="90"
                :step="5"
                thumb-label
                @update:model-value="onMinAreaRatioChange"
              >
                <template v-slot:prepend>
                  <span class="text-caption">10%</span>
                </template>
                <template v-slot:append>
                  <span class="text-caption">90%</span>
                </template>
              </v-slider>
              <p class="text-caption text-center mt-n2">
                Plot area size threshold<br />
                (current: {{ minAreaRatio }}%)
              </p>
            </v-col>

            <!-- Minimum solidity adjustment slider -->
            <v-col cols="6" class="pl-2">
              <v-slider
                v-model="minSolidity"
                label="Minimum Rectangle Solidity (%)"
                :min="80"
                :max="100"
                :step="1"
                thumb-label
                @update:model-value="onMinSolidityChange"
              >
                <template v-slot:prepend>
                  <span class="text-caption">80%</span>
                </template>
                <template v-slot:append>
                  <span class="text-caption">100%</span>
                </template>
              </v-slider>
              <p class="text-caption text-center mt-n2">
                Rectangle "closedness"<br />
                (current: {{ minSolidity }}%)
              </p>
            </v-col>
          </v-row>

          <div class="debug-canvas-grid mb-4" style="position: relative">
            <!-- Loading overlay -->
            <v-overlay
              :model-value="isReloading"
              contained
              class="align-center justify-center"
              persistent
            >
              <v-progress-circular
                indeterminate
                size="64"
                color="primary"
              ></v-progress-circular>
              <div class="text-center mt-4">
                <p class="text-h6">Processing...</p>
                <p class="text-body-2">Applying new threshold settings</p>
              </div>
            </v-overlay>

            <div class="debug-canvas-item">
              <h5 class="text-center mb-2">
              1. All Detected Rectangles & Plot Area
            </h5>
              <canvas
                ref="debugCanvas0"
                style="border: 1px solid #ccc; width: 100%; height: auto"
              ></canvas>
            </div>
            <div class="debug-canvas-item">
              <h5 class="text-center mb-2">2. OCR Areas (x1, x2, y1, y2)</h5>
              <canvas
                ref="debugCanvas1"
                style="border: 1px solid #ccc; width: 100%; height: auto"
              ></canvas>
            </div>
            <div class="debug-canvas-item">
              <h5 class="text-center mb-2">3. OpenCV Refined Areas</h5>
              <canvas
                ref="debugCanvas2"
                style="border: 1px solid #ccc; width: 100%; height: auto"
              ></canvas>
            </div>
            <div class="debug-canvas-item">
              <h5 class="text-center mb-2">
                4. Center Points & Axis Intersections
              </h5>
              <canvas
                ref="debugCanvas3"
                style="border: 1px solid #ccc; width: 100%; height: auto"
              ></canvas>
            </div>
          </div>
        </div>

        <p class="mb-4">
          The following axis information was detected from your chart. Please
          verify the values before importing.
        </p>

        <!-- Warning when no plot area is detected -->
        <v-alert
          v-if="!result?.plotArea"
          type="warning"
          variant="outlined"
          class="mb-4"
        >
          <strong>No plot area detected.</strong> Please manually adjust the
          axis values below or try adjusting the color threshold in debug mode.
        </v-alert>

        <!-- Axis Values Input Fields -->
        <table
          v-if="editableResult"
          style="width: 100%; max-width: 500px; margin: 0 auto"
        >
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
                    <strong>Extracted text:</strong> '{{
                      result.horizontalRegion.extractedText
                    }}'
                  </p>
                  <p v-if="result.horizontalRegion">
                    <strong>Found values:</strong>
                    {{ result.horizontalRegion.extractedValues.join(', ') }}
                  </p>
                  <p v-if="result.ocrRegions">
                    <strong>OCR regions found:</strong>
                    {{
                      result.ocrRegions.filter(
                        (r) => r.type === 'x1' || r.type === 'x2',
                      ).length
                    }}
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
                    <strong>Extracted text:</strong> '{{
                      result.verticalRegion.extractedText
                    }}'
                  </p>
                  <p v-if="result.verticalRegion">
                    <strong>Found values:</strong>
                    {{ result.verticalRegion.extractedValues.join(', ') }}
                  </p>
                  <p v-if="result.ocrRegions">
                    <strong>OCR regions found:</strong>
                    {{
                      result.ocrRegions.filter(
                        (r) => r.type === 'y1' || r.type === 'y2',
                      ).length
                    }}
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
        <v-btn color="primary" variant="outlined" @click="onConfirmAxesOnly"
          >Import Axes Only</v-btn
        >
        <v-btn color="primary" variant="outlined" @click="onConfirmValuesOnly"
          >Import Values Only</v-btn
        >
        <v-btn color="primary" @click="onConfirm">Import Both</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { AxisExtractionResult } from '@/application/services/axisExtractor/axisExtractorInterface'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'

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
      showDebug: true,
      editableResult: null as AxisExtractionResult | null,
      displayVal: {
        x1: '',
        x2: '',
        y1: '',
        y2: '',
      },
      scale: 1,
      axisSetRepository,
      canvasHandler,
      minAreaRatio: 50,
      minSolidity: 90,
      isReloading: false,
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

          // Reset loading state when new result arrives
          this.isReloading = false

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
  },
  methods: {
    drawPreview() {
      if (this.showDebug) {
        this.drawDebugCanvases()
      } else {
        this.drawNormalPreview()
      }
    },
    drawNormalPreview() {
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

      // Draw red frames around detected regions
      this.drawBasicAxisRegions(ctx)
    },
    drawDebugCanvases() {
      if (!this.originalCanvas || !this.editableResult) return

      // Calculate scale for debug canvases
      // Use larger size since we have a 3-column grid and modal is 1400px wide
      // Each canvas can be roughly 450px wide (1400 / 3 - gaps)
      this.scale = Math.min(
        450 / this.originalCanvas.width,
        300 / this.originalCanvas.height,
      )

      // Draw all 5 debug canvases
      this.drawDebugCanvas0()
      this.drawDebugCanvas1()
      this.drawDebugCanvas2()
      this.drawDebugCanvas3()
      this.drawDebugCanvas4()
    },
    setupCanvas(canvasRef: string): CanvasRenderingContext2D | null {
      const canvas = this.$refs[canvasRef] as HTMLCanvasElement
      if (!canvas || !this.originalCanvas) return null

      const ctx = canvas.getContext('2d')!
      canvas.width = this.originalCanvas.width * this.scale
      canvas.height = this.originalCanvas.height * this.scale

      // Draw original image
      ctx.drawImage(this.originalCanvas, 0, 0, canvas.width, canvas.height)

      return ctx
    },
    drawDebugCanvas0() {
      const ctx = this.setupCanvas('debugCanvas0')
      if (!ctx || !this.result) return

      // Draw all detected rectangle candidates
      if (this.result.detectedRectangles) {
        ctx.save()

        // Sort rectangles by y position for label placement
        const sortedRects = this.result.detectedRectangles
          .map((rect, index) => ({ rect, index }))
          .sort((a, b) => a.rect.y - b.rect.y)

        // Track label positions to avoid overlaps
        const labelPositions: { y: number; bottom: number }[] = []

        // First pass: draw all rectangles
        this.result.detectedRectangles.forEach((rect, index) => {
          // Use different colors based on validation status
          let strokeColor
          let lineStyle = [5, 5]

          if (rect.skipped) {
            // Skipped rectangles: gray color
            strokeColor = `hsla(0, 0%, 50%, 0.5)`
            lineStyle = [3, 3]
          } else if (!rect.isValid) {
            // Invalid rectangles: red color
            strokeColor = `hsla(0, 70%, 50%, 0.6)`
          } else if (rect.areaRatio < 0.7) {
            // Too small: orange color
            strokeColor = `hsla(30, 70%, 50%, 0.6)`
          } else {
            // Valid candidates: use different hues
            const hue = (index * 60) % 360
            strokeColor = `hsla(${hue}, 70%, 50%, 0.8)`
          }

          ctx.strokeStyle = strokeColor
          ctx.lineWidth = rect.skipped ? 1 : 2
          ctx.setLineDash(lineStyle)

          const scaledX = rect.x * this.scale
          const scaledY = rect.y * this.scale
          const scaledWidth = rect.width * this.scale
          const scaledHeight = rect.height * this.scale

          ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)
        })

        // Second pass: draw labels with collision avoidance
        sortedRects.forEach(({ rect, index }) => {
          // Use different colors based on validation status
          let strokeColor

          if (rect.skipped) {
            strokeColor = `hsla(0, 0%, 50%, 0.9)`
          } else if (!rect.isValid) {
            strokeColor = `hsla(0, 70%, 50%, 1)`
          } else if (rect.areaRatio < 0.7) {
            strokeColor = `hsla(30, 70%, 50%, 1)`
          } else {
            const hue = (index * 60) % 360
            strokeColor = `hsla(${hue}, 70%, 50%, 1)`
          }

          const scaledX = rect.x * this.scale
          const scaledY = rect.y * this.scale

          // Label with score and status
          ctx.font = rect.skipped ? '10px Arial' : 'bold 11px Arial'
          const status = rect.skipped
            ? ' (skip)'
            : rect.isValid
            ? ''
            : ' (invalid)'
          const areaInfo = ` ${(rect.areaRatio * 100).toFixed(0)}%`
          const gapInfo =
            rect.maxGap !== undefined ? ` gap:${rect.maxGap.toFixed(0)}px` : ''
          const solidityInfo =
            rect.solidity !== undefined
              ? ` sol:${(rect.solidity * 100).toFixed(0)}%`
              : ''
          const labelText = `R${
            index + 1
          }${areaInfo}${status}${gapInfo}${solidityInfo}`

          // Calculate label position
          let labelY = scaledY - 5
          const labelHeight = 14 // Approximate height with padding

          // Check for collisions and adjust
          for (const pos of labelPositions) {
            if (labelY < pos.bottom && labelY + labelHeight > pos.y) {
              // Collision detected, place below the existing label
              labelY = pos.bottom + 2
            }
          }

          // Add to tracked positions
          labelPositions.push({ y: labelY - labelHeight, bottom: labelY })

          // Draw label with background for better readability
          const textWidth = ctx.measureText(labelText).width
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
          ctx.fillRect(scaledX + 3, labelY - 11, textWidth + 4, 13)

          // Draw label text
          ctx.fillStyle = strokeColor
          ctx.fillText(labelText, scaledX + 5, labelY)
        })

        // Highlight the selected plot area
        if (this.editableResult?.plotArea) {
          ctx.strokeStyle = '#FF0000'
          ctx.lineWidth = 3
          ctx.setLineDash([])

          const plotArea = this.editableResult.plotArea
          const scaledX = plotArea.x * this.scale
          const scaledY = plotArea.y * this.scale
          const scaledWidth = plotArea.width * this.scale
          const scaledHeight = plotArea.height * this.scale

          ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)
          ctx.fillStyle = '#FF0000'
          ctx.font = 'bold 14px Arial'
          ctx.fillText(
            'Plot Area',
            scaledX + 5,
            scaledY + scaledHeight + 20,
          )
        }

        ctx.restore()
      }

      // Draw axis areas
      ctx.save()
      ctx.strokeStyle = '#FF6600'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 4])
      ctx.font = 'bold 14px Arial'

      if (this.editableResult?.horizontalRegion) {
        const region = this.editableResult.horizontalRegion
        const scaledX = region.x * this.scale
        const scaledY = region.y * this.scale
        const scaledWidth = region.width * this.scale
        const scaledHeight = region.height * this.scale

        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)
        ctx.fillStyle = '#FF6600'
        ctx.fillText('X-Axis Area', scaledX, scaledY - 5)
      }

      if (this.editableResult?.verticalRegion) {
        const region = this.editableResult.verticalRegion
        const scaledX = region.x * this.scale
        const scaledY = region.y * this.scale
        const scaledWidth = region.width * this.scale
        const scaledHeight = region.height * this.scale

        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)
        ctx.fillStyle = '#FF6600'
        ctx.fillText('Y-Axis Area', scaledX - 80, scaledY + scaledHeight / 2)
      }
      ctx.restore()
    },
    drawDebugCanvas1() {
      const ctx = this.setupCanvas('debugCanvas1')
      if (!ctx || !this.result?.ocrRegions) return

      ctx.save()

      // Draw OCR regions (original estimates)
      this.result.ocrRegions.forEach((region) => {
        if (region.type === 'other') return
        if (!region.originalRegion) return

        // Set color based on region type (same as image 3 & 4)
        switch (region.type) {
          case 'x1':
            ctx.strokeStyle = '#FF0000'
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'
            break
          case 'x2':
            ctx.strokeStyle = '#00CC00'
            ctx.fillStyle = 'rgba(0, 204, 0, 0.2)'
            break
          case 'y1':
            ctx.strokeStyle = '#0066FF'
            ctx.fillStyle = 'rgba(0, 102, 255, 0.2)'
            break
          case 'y2':
            ctx.strokeStyle = '#CC00CC'
            ctx.fillStyle = 'rgba(204, 0, 204, 0.2)'
            break
        }

        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 3])

        const origX = region.originalRegion.x * this.scale
        const origY = region.originalRegion.y * this.scale
        const origWidth = region.originalRegion.width * this.scale
        const origHeight = region.originalRegion.height * this.scale

        ctx.fillRect(origX, origY, origWidth, origHeight)
        ctx.strokeRect(origX, origY, origWidth, origHeight)

        // Label with matching color
        ctx.fillStyle = ctx.strokeStyle
        ctx.font = 'bold 12px Arial'
        ctx.fillText(`${region.type}: ${region.text}`, origX + 2, origY - 3)
      })

      ctx.restore()
    },
    drawDebugCanvas2() {
      const ctx = this.setupCanvas('debugCanvas2')
      if (!ctx || !this.result?.ocrRegions) return

      ctx.save()

      // Draw OpenCV refined regions
      this.result.ocrRegions.forEach((region) => {
        if (region.type === 'other') return

        const scaledX = region.x * this.scale
        const scaledY = region.y * this.scale
        const scaledWidth = region.width * this.scale
        const scaledHeight = region.height * this.scale

        // Set style based on region type
        switch (region.type) {
          case 'x1':
            ctx.strokeStyle = '#FF0000'
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'
            break
          case 'x2':
            ctx.strokeStyle = '#00CC00'
            ctx.fillStyle = 'rgba(0, 204, 0, 0.2)'
            break
          case 'y1':
            ctx.strokeStyle = '#0066FF'
            ctx.fillStyle = 'rgba(0, 102, 255, 0.2)'
            break
          case 'y2':
            ctx.strokeStyle = '#CC00CC'
            ctx.fillStyle = 'rgba(204, 0, 204, 0.2)'
            break
        }

        ctx.lineWidth = 1.5
        ctx.setLineDash([])

        ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight)
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)

        // Label
        ctx.fillStyle = ctx.strokeStyle
        ctx.font = 'bold 12px Arial'
        ctx.fillText(
          `${region.type}: ${region.text}`,
          scaledX + 5,
          scaledY + scaledHeight + 15,
        )
      })

      ctx.restore()
    },
    drawDebugCanvas3() {
      const ctx = this.setupCanvas('debugCanvas3')
      if (!ctx || !this.result?.ocrRegions) return

      ctx.save()

      // Draw center points and axis intersections
      this.result.ocrRegions.forEach((region) => {
        if (region.type === 'other') return
        if (region.centerX === undefined || region.centerY === undefined) return

        const scaledCenterX = region.centerX * this.scale
        const scaledCenterY = region.centerY * this.scale

        // Set color based on type
        switch (region.type) {
          case 'x1':
            ctx.strokeStyle = '#FF0000'
            ctx.fillStyle = '#FF0000'
            break
          case 'x2':
            ctx.strokeStyle = '#00CC00'
            ctx.fillStyle = '#00CC00'
            break
          case 'y1':
            ctx.strokeStyle = '#0066FF'
            ctx.fillStyle = '#0066FF'
            break
          case 'y2':
            ctx.strokeStyle = '#CC00CC'
            ctx.fillStyle = '#CC00CC'
            break
        }

        // Draw center point
        ctx.beginPath()
        ctx.arc(scaledCenterX, scaledCenterY, 5, 0, 2 * Math.PI)
        ctx.fill()

        // Draw crosshair
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(scaledCenterX - 10, scaledCenterY)
        ctx.lineTo(scaledCenterX + 10, scaledCenterY)
        ctx.moveTo(scaledCenterX, scaledCenterY - 10)
        ctx.lineTo(scaledCenterX, scaledCenterY + 10)
        ctx.stroke()

        // Draw line to axis
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])

        if (region.type.startsWith('x')) {
          // Draw vertical line to X-axis
          if (this.editableResult?.horizontalRegion?.axisPosition?.y) {
            const axisY =
              this.editableResult.horizontalRegion.axisPosition.y * this.scale
            ctx.beginPath()
            ctx.moveTo(scaledCenterX, scaledCenterY)
            ctx.lineTo(scaledCenterX, axisY)
            ctx.stroke()

            // Draw intersection point
            ctx.beginPath()
            ctx.arc(scaledCenterX, axisY, 3, 0, 2 * Math.PI)
            ctx.fill()
          }
        } else {
          // Draw horizontal line to Y-axis
          if (this.editableResult?.verticalRegion?.axisPosition?.x) {
            const axisX =
              this.editableResult.verticalRegion.axisPosition.x * this.scale
            ctx.beginPath()
            ctx.moveTo(scaledCenterX, scaledCenterY)
            ctx.lineTo(axisX, scaledCenterY)
            ctx.stroke()

            // Draw intersection point
            ctx.beginPath()
            ctx.arc(axisX, scaledCenterY, 3, 0, 2 * Math.PI)
            ctx.fill()
          }
        }

        // Label with axis intersection coordinates (in original image coordinates)
        ctx.setLineDash([])
        ctx.font = 'bold 12px Arial'

        let intersectionCoord = ''
        if (
          region.type.startsWith('x') &&
          this.editableResult?.horizontalRegion?.axisPosition?.y
        ) {
          // For x-axis values, show intersection with horizontal axis (original coordinates)
          const axisY = this.editableResult.horizontalRegion.axisPosition.y
          intersectionCoord = `(${Math.round(region.centerX)}, ${Math.round(
            axisY,
          )})`
        } else if (
          region.type.startsWith('y') &&
          this.editableResult?.verticalRegion?.axisPosition?.x
        ) {
          // For y-axis values, show intersection with vertical axis (original coordinates)
          const axisX = this.editableResult.verticalRegion.axisPosition.x
          intersectionCoord = `(${Math.round(axisX)}, ${Math.round(
            region.centerY,
          )})`
        }

        ctx.fillText(
          `${region.type}: ${intersectionCoord}`,
          scaledCenterX + 10,
          scaledCenterY - 10,
        )
      })

      ctx.restore()
    },
    drawBasicAxisRegions(ctx: CanvasRenderingContext2D) {
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 2
      ctx.fillStyle = 'red'
      ctx.font = '12px Arial'

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
      // Set axis coordinates in the active axis set
      // Always import coordinates regardless of debug mode
      if (this.result && this.editableResult) {
        const activeAxisSet = this.axisSetRepository.activeAxisSet

        // Set axis values
        activeAxisSet.setX1Value(this.editableResult.x1)
        activeAxisSet.setX2Value(this.editableResult.x2)
        activeAxisSet.setY1Value(this.editableResult.y1)
        activeAxisSet.setY2Value(this.editableResult.y2)

        // Calculate scale factor between canvas and original image
        // The OCR coordinates are in canvas space, but we need original image space
        const canvasToOriginalScale =
          this.canvasHandler.originalWidth / this.originalCanvas.width
        console.log('Applying scale factor:', canvasToOriginalScale)

        // Set axis coordinates (converting from canvas to original image pixel space)
        // Find the x1 and x2 regions to set x-axis coordinates
        const x1Region = this.result.ocrRegions?.find((r) => r.type === 'x1')
        const x2Region = this.result.ocrRegions?.find((r) => r.type === 'x2')
        if (
          x1Region &&
          x2Region &&
          this.result.horizontalRegion?.axisPosition?.y
        ) {
          const axisY =
            this.result.horizontalRegion.axisPosition.y * canvasToOriginalScale
          activeAxisSet.x1.coord = {
            xPx:
              (x1Region.centerX || x1Region.x + x1Region.width / 2) *
              canvasToOriginalScale,
            yPx: axisY,
          }
          activeAxisSet.x2.coord = {
            xPx:
              (x2Region.centerX || x2Region.x + x2Region.width / 2) *
              canvasToOriginalScale,
            yPx: axisY,
          }
        }

        // Find the y1 and y2 regions to set y-axis coordinates
        const y1Region = this.result.ocrRegions?.find((r) => r.type === 'y1')
        const y2Region = this.result.ocrRegions?.find((r) => r.type === 'y2')
        if (
          y1Region &&
          y2Region &&
          this.result.verticalRegion?.axisPosition?.x
        ) {
          const axisX =
            this.result.verticalRegion.axisPosition.x * canvasToOriginalScale
          activeAxisSet.y1.coord = {
            xPx: axisX,
            yPx:
              (y1Region.centerY || y1Region.y + y1Region.height / 2) *
              canvasToOriginalScale,
          }
          activeAxisSet.y2.coord = {
            xPx: axisX,
            yPx:
              (y2Region.centerY || y2Region.y + y2Region.height / 2) *
              canvasToOriginalScale,
          }
        }
      }

      this.$emit('confirm', this.editableResult)
      this.dialog = false
    },
    onReject() {
      this.$emit('reject')
      this.dialog = false
    },
    onConfirmAxesOnly() {
      if (!this.editableResult) return

      const activeAxisSet = this.axisSetRepository.activeAxisSet
      const canvasToOriginalScale =
        this.canvasHandler.originalWidth / this.originalCanvas!.width

      // Update axis coordinates if OCR regions are available
      if (this.result?.ocrRegions && this.result.ocrRegions.length > 0) {
        // Find the x1 and x2 regions to set x-axis coordinates
        const x1Region = this.result.ocrRegions?.find((r) => r.type === 'x1')
        const x2Region = this.result.ocrRegions?.find((r) => r.type === 'x2')
        if (
          x1Region &&
          x2Region &&
          this.result.horizontalRegion?.axisPosition?.y
        ) {
          const axisY =
            this.result.horizontalRegion.axisPosition.y * canvasToOriginalScale
          activeAxisSet.x1.coord = {
            xPx:
              (x1Region.centerX || x1Region.x + x1Region.width / 2) *
              canvasToOriginalScale,
            yPx: axisY,
          }
          activeAxisSet.x2.coord = {
            xPx:
              (x2Region.centerX || x2Region.x + x2Region.width / 2) *
              canvasToOriginalScale,
            yPx: axisY,
          }
        }

        // Find the y1 and y2 regions to set y-axis coordinates
        const y1Region = this.result.ocrRegions?.find((r) => r.type === 'y1')
        const y2Region = this.result.ocrRegions?.find((r) => r.type === 'y2')
        if (
          y1Region &&
          y2Region &&
          this.result.verticalRegion?.axisPosition?.x
        ) {
          const axisX =
            this.result.verticalRegion.axisPosition.x * canvasToOriginalScale
          activeAxisSet.y1.coord = {
            xPx: axisX,
            yPx:
              (y1Region.centerY || y1Region.y + y1Region.height / 2) *
              canvasToOriginalScale,
          }
          activeAxisSet.y2.coord = {
            xPx: axisX,
            yPx:
              (y2Region.centerY || y2Region.y + y2Region.height / 2) *
              canvasToOriginalScale,
          }
        }
      }

      // Don't update values, only emit the axes-only confirmation
      this.$emit('confirmAxesOnly', this.editableResult)
      this.dialog = false
    },
    onConfirmValuesOnly() {
      if (!this.editableResult) return

      // Only update the values, not the coordinates
      const result = {
        ...this.editableResult,
        // Ensure we're not including coordinate data
        ocrRegions: undefined,
        axisPixelMapping: undefined,
      }

      this.$emit('confirmValuesOnly', result)
      this.dialog = false
    },
    async onMinAreaRatioChange() {
      // Re-extract with new min area ratio value
      if (this.originalCanvas && this.showDebug) {
        this.isReloading = true
        this.$emit('minAreaRatioChange', this.minAreaRatio / 100) // Convert percentage to ratio
      }
    },
    async onMinSolidityChange() {
      // Re-extract with new min solidity value
      if (this.originalCanvas && this.showDebug) {
        this.isReloading = true
        this.$emit('minSolidityChange', this.minSolidity / 100) // Convert percentage to ratio
      }
    },
  },
})
</script>

<style scoped>
.canvas-container {
  text-align: center;
}

.debug-canvas-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  max-width: 100%;
  min-height: 600px;
}

.debug-canvas-item {
  text-align: center;
}

.debug-canvas-item h5 {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
}
</style>
