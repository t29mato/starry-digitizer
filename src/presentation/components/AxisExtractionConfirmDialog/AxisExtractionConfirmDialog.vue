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
            style="border: 1px solid #ccc; max-width: 100%; height: auto; cursor: crosshair"
            @mousedown="onCanvasMouseDown"
            @mousemove="onCanvasMouseMove"
            @mouseup="onCanvasMouseUp"
            @mouseleave="onCanvasMouseLeave"
            @wheel="onCanvasWheel"
          ></canvas>
          <div v-if="isAdjusting || isResizing" class="adjustment-info">
            <v-chip size="small" color="primary">
              <v-icon class="mr-1">{{ isResizing ? 'mdi-resize' : 'mdi-cursor-move' }}</v-icon>
              {{ isResizing ? 'Drag to resize region' : 'Drag to move region' }}
            </v-chip>
          </div>
          <div v-if="hoveredRegion" class="help-info">
            <v-chip size="small" color="info" variant="outlined">
              <v-icon class="mr-1">mdi-information</v-icon>
              Drag to move • Handles to resize • Wheel to scale
            </v-chip>
          </div>
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
                  <!-- OCR Status Indicator -->
                  <v-progress-circular
                    v-if="isRerunning"
                    size="16"
                    width="2"
                    color="primary"
                    indeterminate
                    class="ml-2"
                  ></v-progress-circular>
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
      isAdjusting: false,
      isResizing: false,
      isRerunning: false,
      hoveredRegion: null as { region: any, type: 'horizontal' | 'vertical' } | null,
      dragState: {
        isDragging: false,
        isResizing: false,
        dragType: '' as 'horizontal' | 'vertical' | '',
        resizeHandle: '' as 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | '',
        startX: 0,
        startY: 0,
        originalRegion: null as any,
      },
      scale: 1,
      ocrDebounceTimer: null as NodeJS.Timeout | null,
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
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 2
      ctx.fillStyle = 'red'
      ctx.font = '12px Arial'

      if (this.result.horizontalRegion) {
        const region = this.result.horizontalRegion
        const scaledX = region.x * this.scale
        const scaledY = region.y * this.scale
        const scaledWidth = region.width * this.scale
        const scaledHeight = region.height * this.scale

        // Draw region rectangle
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)
        
        // Draw resize handles
        this.drawResizeHandles(ctx, scaledX, scaledY, scaledWidth, scaledHeight)
        
        // Add label
        ctx.fillText('X-Axis', scaledX, scaledY - 5)
      }

      if (this.result.verticalRegion) {
        const region = this.result.verticalRegion
        const scaledX = region.x * this.scale
        const scaledY = region.y * this.scale
        const scaledWidth = region.width * this.scale
        const scaledHeight = region.height * this.scale

        // Draw region rectangle
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)
        
        // Draw resize handles
        this.drawResizeHandles(ctx, scaledX, scaledY, scaledWidth, scaledHeight)
        
        // Add label
        ctx.fillText('Y-Axis', scaledX + scaledWidth + 5, scaledY + 15)
      }
    },
    drawResizeHandles(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
      const handleSize = 6
      ctx.fillStyle = 'red'
      
      // Corner handles
      const corners = [
        { x: x, y: y }, // top-left
        { x: x + width, y: y }, // top-right
        { x: x, y: y + height }, // bottom-left
        { x: x + width, y: y + height }, // bottom-right
      ]
      
      corners.forEach(corner => {
        ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize)
      })
      
      // Edge handles
      const edges = [
        { x: x + width/2, y: y }, // top
        { x: x + width/2, y: y + height }, // bottom
        { x: x, y: y + height/2 }, // left
        { x: x + width, y: y + height/2 }, // right
      ]
      
      edges.forEach(edge => {
        ctx.fillRect(edge.x - handleSize/2, edge.y - handleSize/2, handleSize, handleSize)
      })
    },
    getMousePos(event: MouseEvent): { x: number, y: number } {
      const canvas = this.$refs.previewCanvas as HTMLCanvasElement
      const rect = canvas.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    },
    getRegionAtPoint(x: number, y: number): { region: any, type: 'horizontal' | 'vertical' } | null {
      if (!this.result) return null
      
      // Check horizontal region
      if (this.result.horizontalRegion) {
        const region = this.result.horizontalRegion
        const scaledX = region.x * this.scale
        const scaledY = region.y * this.scale
        const scaledWidth = region.width * this.scale
        const scaledHeight = region.height * this.scale
        
        if (x >= scaledX && x <= scaledX + scaledWidth && 
            y >= scaledY && y <= scaledY + scaledHeight) {
          return { region: this.result.horizontalRegion, type: 'horizontal' }
        }
      }
      
      // Check vertical region
      if (this.result.verticalRegion) {
        const region = this.result.verticalRegion
        const scaledX = region.x * this.scale
        const scaledY = region.y * this.scale
        const scaledWidth = region.width * this.scale
        const scaledHeight = region.height * this.scale
        
        if (x >= scaledX && x <= scaledX + scaledWidth && 
            y >= scaledY && y <= scaledY + scaledHeight) {
          return { region: this.result.verticalRegion, type: 'vertical' }
        }
      }
      
      return null
    },
    getResizeHandle(x: number, y: number, regionInfo: { region: any, type: 'horizontal' | 'vertical' }): string {
      const region = regionInfo.region
      const scaledX = region.x * this.scale
      const scaledY = region.y * this.scale
      const scaledWidth = region.width * this.scale
      const scaledHeight = region.height * this.scale
      const handleSize = 6
      const tolerance = handleSize
      
      // Check corner handles
      if (Math.abs(x - scaledX) <= tolerance && Math.abs(y - scaledY) <= tolerance) return 'tl'
      if (Math.abs(x - (scaledX + scaledWidth)) <= tolerance && Math.abs(y - scaledY) <= tolerance) return 'tr'
      if (Math.abs(x - scaledX) <= tolerance && Math.abs(y - (scaledY + scaledHeight)) <= tolerance) return 'bl'
      if (Math.abs(x - (scaledX + scaledWidth)) <= tolerance && Math.abs(y - (scaledY + scaledHeight)) <= tolerance) return 'br'
      
      // Check edge handles
      if (Math.abs(x - (scaledX + scaledWidth/2)) <= tolerance && Math.abs(y - scaledY) <= tolerance) return 't'
      if (Math.abs(x - (scaledX + scaledWidth/2)) <= tolerance && Math.abs(y - (scaledY + scaledHeight)) <= tolerance) return 'b'
      if (Math.abs(x - scaledX) <= tolerance && Math.abs(y - (scaledY + scaledHeight/2)) <= tolerance) return 'l'
      if (Math.abs(x - (scaledX + scaledWidth)) <= tolerance && Math.abs(y - (scaledY + scaledHeight/2)) <= tolerance) return 'r'
      
      return ''
    },
    getCursorForHandle(handle: string): string {
      switch (handle) {
        case 'tl':
        case 'br':
          return 'nw-resize'
        case 'tr':
        case 'bl':
          return 'ne-resize'
        case 't':
        case 'b':
          return 'n-resize'
        case 'l':
        case 'r':
          return 'e-resize'
        default:
          return 'move'
      }
    },
    onCanvasMouseDown(event: MouseEvent) {
      const pos = this.getMousePos(event)
      const regionInfo = this.getRegionAtPoint(pos.x, pos.y)
      
      if (regionInfo) {
        const handle = this.getResizeHandle(pos.x, pos.y, regionInfo)
        
        this.dragState.isDragging = true
        this.dragState.isResizing = !!handle
        this.dragState.dragType = regionInfo.type
        this.dragState.resizeHandle = handle
        this.dragState.startX = pos.x
        this.dragState.startY = pos.y
        this.dragState.originalRegion = { ...regionInfo.region }
        
        if (handle) {
          this.isResizing = true
        } else {
          this.isAdjusting = true
        }
        
        const canvas = this.$refs.previewCanvas as HTMLCanvasElement
        canvas.style.cursor = this.getCursorForHandle(handle)
      }
    },
    onCanvasMouseMove(event: MouseEvent) {
      if (!this.dragState.isDragging) {
        // Show cursor feedback when hovering over regions
        const pos = this.getMousePos(event)
        const regionInfo = this.getRegionAtPoint(pos.x, pos.y)
        this.hoveredRegion = regionInfo
        
        const canvas = this.$refs.previewCanvas as HTMLCanvasElement
        if (regionInfo) {
          const handle = this.getResizeHandle(pos.x, pos.y, regionInfo)
          canvas.style.cursor = this.getCursorForHandle(handle)
        } else {
          canvas.style.cursor = 'crosshair'
        }
        return
      }
      
      const pos = this.getMousePos(event)
      const deltaX = (pos.x - this.dragState.startX) / this.scale
      const deltaY = (pos.y - this.dragState.startY) / this.scale
      
      if (this.dragState.isResizing) {
        this.handleResize(deltaX, deltaY)
      } else {
        this.handleMove(deltaX, deltaY)
      }
      
      // Redraw canvas
      this.drawPreview()
    },
    handleMove(deltaX: number, deltaY: number) {
      if (this.dragState.dragType === 'horizontal' && this.result?.horizontalRegion) {
        const newX = Math.max(0, this.dragState.originalRegion.x + deltaX)
        const newY = Math.max(0, this.dragState.originalRegion.y + deltaY)
        
        this.result.horizontalRegion.x = newX
        this.result.horizontalRegion.y = newY
      } else if (this.dragState.dragType === 'vertical' && this.result?.verticalRegion) {
        const newX = Math.max(0, this.dragState.originalRegion.x + deltaX)
        const newY = Math.max(0, this.dragState.originalRegion.y + deltaY)
        
        this.result.verticalRegion.x = newX
        this.result.verticalRegion.y = newY
      }
    },
    handleResize(deltaX: number, deltaY: number) {
      const handle = this.dragState.resizeHandle
      const originalRegion = this.dragState.originalRegion
      
      let region = null
      if (this.dragState.dragType === 'horizontal' && this.result?.horizontalRegion) {
        region = this.result.horizontalRegion
      } else if (this.dragState.dragType === 'vertical' && this.result?.verticalRegion) {
        region = this.result.verticalRegion
      }
      
      if (!region) return
      
      // Calculate new bounds based on handle
      let newX = originalRegion.x
      let newY = originalRegion.y
      let newWidth = originalRegion.width
      let newHeight = originalRegion.height
      
      switch (handle) {
        case 'tl': // top-left
          newX = originalRegion.x + deltaX
          newY = originalRegion.y + deltaY
          newWidth = originalRegion.width - deltaX
          newHeight = originalRegion.height - deltaY
          break
        case 'tr': // top-right
          newY = originalRegion.y + deltaY
          newWidth = originalRegion.width + deltaX
          newHeight = originalRegion.height - deltaY
          break
        case 'bl': // bottom-left
          newX = originalRegion.x + deltaX
          newWidth = originalRegion.width - deltaX
          newHeight = originalRegion.height + deltaY
          break
        case 'br': // bottom-right
          newWidth = originalRegion.width + deltaX
          newHeight = originalRegion.height + deltaY
          break
        case 't': // top
          newY = originalRegion.y + deltaY
          newHeight = originalRegion.height - deltaY
          break
        case 'b': // bottom
          newHeight = originalRegion.height + deltaY
          break
        case 'l': // left
          newX = originalRegion.x + deltaX
          newWidth = originalRegion.width - deltaX
          break
        case 'r': // right
          newWidth = originalRegion.width + deltaX
          break
      }
      
      // Ensure minimum size
      const minSize = 20
      if (newWidth < minSize) {
        if (handle.includes('l')) newX = originalRegion.x + originalRegion.width - minSize
        newWidth = minSize
      }
      if (newHeight < minSize) {
        if (handle.includes('t')) newY = originalRegion.y + originalRegion.height - minSize
        newHeight = minSize
      }
      
      // Update region
      region.x = Math.max(0, newX)
      region.y = Math.max(0, newY)
      region.width = newWidth
      region.height = newHeight
    },
    onCanvasMouseUp() {
      if (this.dragState.isDragging) {
        this.dragState.isDragging = false
        this.dragState.isResizing = false
        this.isAdjusting = false
        this.isResizing = false
        
        const canvas = this.$refs.previewCanvas as HTMLCanvasElement
        canvas.style.cursor = 'crosshair'
        
        // Auto-run OCR after adjustment
        this.rerunOCR()
      }
    },
    onCanvasMouseLeave() {
      this.onCanvasMouseUp()
      this.hoveredRegion = null
    },
    onCanvasWheel(event: WheelEvent) {
      event.preventDefault()
      
      const pos = this.getMousePos(event)
      const regionInfo = this.getRegionAtPoint(pos.x, pos.y)
      
      if (regionInfo) {
        const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1
        const region = regionInfo.region
        
        // Scale around the center of the region
        const centerX = region.x + region.width / 2
        const centerY = region.y + region.height / 2
        
        const newWidth = Math.max(20, region.width * scaleFactor)
        const newHeight = Math.max(20, region.height * scaleFactor)
        
        region.x = centerX - newWidth / 2
        region.y = centerY - newHeight / 2
        region.width = newWidth
        region.height = newHeight
        
        // Ensure region stays within bounds
        region.x = Math.max(0, region.x)
        region.y = Math.max(0, region.y)
        
        this.drawPreview()
        
        // Debounce OCR re-run for wheel events
        this.debouncedRerunOCR()
      }
    },
    debouncedRerunOCR() {
      // Clear existing timer
      if (this.ocrDebounceTimer) {
        clearTimeout(this.ocrDebounceTimer)
      }
      
      // Set new timer for 500ms delay
      this.ocrDebounceTimer = setTimeout(() => {
        this.rerunOCR()
      }, 500)
    },
    async rerunOCR() {
      if (!this.originalCanvas || !this.result) return
      
      this.isRerunning = true
      try {
        const ctx = this.originalCanvas.getContext('2d')!
        const imageData = ctx.getImageData(0, 0, this.originalCanvas.width, this.originalCanvas.height)
        
        // Import the axis extractor to re-run OCR on adjusted regions
        const { AxisExtractor } = await import('@/application/services/axisExtractor/axisExtractor')
        const extractor = new AxisExtractor()
        
        // Re-extract for horizontal region if it exists
        if (this.result.horizontalRegion) {
          const currentRegion = this.result.horizontalRegion
          
          // Create a custom extraction that uses the adjusted region directly
          const horizontalResult = await this.extractFromCustomRegion(
            imageData,
            currentRegion,
            'horizontal'
          )
          
          // Preserve position and size, only update text and values
          this.result.horizontalRegion.extractedText = horizontalResult.region.extractedText
          this.result.horizontalRegion.extractedValues = horizontalResult.region.extractedValues
          
          if (horizontalResult.values.length >= 2) {
            this.result.x1 = Math.min(...horizontalResult.values)
            this.result.x2 = Math.max(...horizontalResult.values)
            this.editableResult!.x1 = this.result.x1
            this.editableResult!.x2 = this.result.x2
            this.displayVal.x1 = String(this.result.x1)
            this.displayVal.x2 = String(this.result.x2)
          }
        }
        
        // Re-extract for vertical region if it exists
        if (this.result.verticalRegion) {
          const currentRegion = this.result.verticalRegion
          
          // Create a custom extraction that uses the adjusted region directly
          const verticalResult = await this.extractFromCustomRegion(
            imageData,
            currentRegion,
            'vertical'
          )
          
          // Preserve position and size, only update text and values
          this.result.verticalRegion.extractedText = verticalResult.region.extractedText
          this.result.verticalRegion.extractedValues = verticalResult.region.extractedValues
          
          if (verticalResult.values.length >= 2) {
            this.result.y1 = Math.min(...verticalResult.values)
            this.result.y2 = Math.max(...verticalResult.values)
            this.editableResult!.y1 = this.result.y1
            this.editableResult!.y2 = this.result.y2
            this.displayVal.y1 = String(this.result.y1)
            this.displayVal.y2 = String(this.result.y2)
          }
        }
        
        // Redraw with updated results
        this.drawPreview()
        
      } catch (error) {
        console.error('Failed to re-run OCR:', error)
      } finally {
        this.isRerunning = false
      }
    },
    async extractFromCustomRegion(
      imageData: ImageData, 
      region: any, 
      orientation: 'horizontal' | 'vertical'
    ): Promise<{ values: number[]; region: any }> {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!

        // Use the exact region dimensions as provided
        const roiX = Math.floor(region.x)
        const roiY = Math.floor(region.y)
        const roiWidth = Math.floor(region.width)
        const roiHeight = Math.floor(region.height)

        canvas.width = roiWidth
        canvas.height = roiHeight

        // Extract the region from the original image
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')!
        tempCanvas.width = imageData.width
        tempCanvas.height = imageData.height
        tempCtx.putImageData(imageData, 0, 0)

        // Draw the specific region onto our canvas
        ctx.drawImage(tempCanvas, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight)

        // Get image data from the canvas
        const roiImageData = ctx.getImageData(0, 0, roiWidth, roiHeight)

        // Create a second canvas for Tesseract
        const canvas2 = document.createElement('canvas')
        const ctx2 = canvas2.getContext('2d')!
        canvas2.width = roiWidth
        canvas2.height = roiHeight
        ctx2.putImageData(roiImageData, 0, 0)

        // Run Tesseract OCR
        const { default: Tesseract } = await import('tesseract.js')
        const result = await Tesseract.recognize(canvas2, 'eng', {
          logger: () => {},
          tessedit_pageseg_mode: '6',
          tessedit_char_whitelist: '0123456789.-+ ',
        })

        const numbers: number[] = []
        const confidenceThreshold = 40

        // Extract numbers from OCR result with confidence filtering
        if (result.data.confidence >= confidenceThreshold) {
          const lines = result.data.text.split('\n')
          for (const line of lines) {
            const matches = line.match(/-?\d*\.?\d+/g)
            if (matches) {
              for (const match of matches) {
                const num = parseFloat(match)
                if (!isNaN(num)) {
                  numbers.push(num)
                }
              }
            }
          }
        }

        const detectedRegion = {
          x: roiX,
          y: roiY,
          width: roiWidth,
          height: roiHeight,
          extractedText: result.data.text.trim(),
          extractedValues: [...numbers].sort((a, b) => a - b),
        }

        return {
          values: [...numbers].sort((a, b) => a - b),
          region: detectedRegion,
        }
      } catch (error) {
        console.error('Error in custom region extraction:', error)
        return {
          values: [],
          region: {
            x: region.x,
            y: region.y,
            width: region.width,
            height: region.height,
            extractedText: '',
            extractedValues: [],
          },
        }
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
  beforeUnmount() {
    // Clean up timer
    if (this.ocrDebounceTimer) {
      clearTimeout(this.ocrDebounceTimer)
    }
  },
})
</script>

<style scoped>
.canvas-container {
  text-align: center;
}

.adjustment-info {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.help-info {
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 10;
}
</style>
