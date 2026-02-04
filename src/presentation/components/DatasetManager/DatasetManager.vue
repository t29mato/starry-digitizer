<template>
  <div>
    <h4>
      Datasets
      <v-btn @click="handleOnClickAddDatasetButton" size="x-small" class="ml-2"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn
        size="x-small"
        @click="handleOnClickRemoveAllDatasetsButton"
        :disabled="datasetRepository.datasets.length === 0"
        class="ml-2"
        title="Remove all datasets"
        ><v-icon>mdi-delete-sweep</v-icon></v-btn
      >
      <v-tooltip :text="importButtonTitle" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            size="x-small"
            @click="showImportDialog = true"
            class="ml-2"
            :disabled="!isAxisCalibrated"
            ><v-icon>mdi-import</v-icon></v-btn
          >
        </template>
      </v-tooltip>
      <v-btn
        v-if="datasetRepository.datasets.length > 1"
        size="x-small"
        @click="handleOnClickViewAll"
        class="ml-2"
        :color="datasetRepository.activeDatasetId === 0 ? 'primary' : ''"
        title="View all datasets"
        ><v-icon>mdi-eye-outline</v-icon></v-btn
      >
    </h4>
    <div
      class="mb-2 mt-1 pa-0"
      style="
        min-height: 15vh;
        outline: solid 1px gray;
        max-height: 30vh;
        overflow-y: auto;
      "
    >
      <!-- Individual datasets -->
      <div
        v-for="dataset in datasetRepository.datasets"
        :key="dataset.id"
        class="c__dataset-row"
      >
        <v-row class="ma-0">
          <v-col cols="9" class="pa-0">
            <v-list-item
              class="pl-2 c__dataset-item"
              link
              @click="handleOnClickDataset(dataset.id)"
              :class="
                dataset.id === datasetRepository.activeDatasetId &&
                'bg-yellow-lighten-4'
              "
            >
              <v-text-field
                v-model="dataset.name"
                :placeholder="'dataset ' + dataset.id"
                hide-details
                density="compact"
                type="text"
                class="mt-0 pt-0 pl-2"
                variant="underlined"
              ></v-text-field>
            </v-list-item>
          </v-col>
          <v-col
            cols="1"
            class="pa-0 d-flex align-items-center justify-center"
            :class="`dataset-count-${dataset.id}`"
          >
            <span class="align-self-center">
              {{ dataset.points.length }}
            </span>
          </v-col>
          <v-col cols="1" class="pa-0 d-flex align-items-center justify-center">
            <v-btn
              size="x-small"
              icon="mdi-content-copy"
              @click="copyDatasetToClipboard(dataset.id)"
              :disabled="dataset.points.length === 0"
              variant="text"
              class="mr-1"
            ></v-btn>
          </v-col>
          <v-col cols="1" class="pa-0 d-flex align-items-center justify-center">
            <v-btn
              size="x-small"
              icon="mdi-delete"
              @click="handleOnClickRemoveDatasetButton(dataset.id)"
              :disabled="datasetRepository.datasets.length === 1"
              variant="text"
              title="Delete dataset"
            ></v-btn>
          </v-col>
        </v-row>
      </div>
    </div>

    <!-- CSV/JSON Import Dialog -->
    <v-dialog v-model="showImportDialog" max-width="1400" max-height="90vh">
      <v-card class="d-flex flex-column" style="height: 90vh">
        <v-card-title>Import Datasets from CSV or JSON</v-card-title>
        <v-card-text class="flex-grow-1" style="overflow-y: auto">
          <v-row class="fill-height" style="min-height: 650px">
            <!-- Left: JSON Input (1/3) -->
            <v-col cols="4" class="d-flex flex-column" style="height: 650px">
              <v-textarea
                v-model="csvContent"
                label="Paste CSV/JSON content here"
                variant="outlined"
                style="height: 100%"
                class="csv-json-textarea"
                no-resize
                hide-details
              ></v-textarea>

              <!-- Error Message -->
              <div v-if="importError" class="error-message mt-2">
                {{ importError }}
              </div>
            </v-col>

            <!-- Right: Visual Preview (2/3) -->
            <v-col cols="8" class="d-flex flex-column">
              <div class="d-flex align-center justify-space-between mb-2">
                <h6 class="mb-0">Visual Preview on Image:</h6>
                <div v-if="parsedDatasets.length > 0" class="d-flex gap-2">
                  <v-btn
                    size="small"
                    @click="sortByX = !sortByX"
                    :color="sortByX ? 'primary' : ''"
                    variant="outlined"
                  >
                    <v-icon>mdi-sort-ascending</v-icon>
                    Sort by X
                  </v-btn>
                  <v-btn
                    size="small"
                    @click="showDataPoints = !showDataPoints"
                    :color="showDataPoints ? 'primary' : ''"
                    variant="outlined"
                  >
                    <v-icon>{{
                      showDataPoints ? 'mdi-eye' : 'mdi-eye-off'
                    }}</v-icon>
                    {{ showDataPoints ? 'Hide Points' : 'Show Points' }}
                  </v-btn>
                </div>
              </div>
              <div class="flex-grow-1">
                <div class="image-preview-container-large">
                  <canvas
                    ref="previewCanvas"
                    class="preview-canvas-flexible"
                    @mouseenter="updatePreviewCanvas"
                  ></canvas>
                </div>
                <div v-if="parsedDatasets.length > 0" class="dataset-legend mt-3">
                  <div
                    v-for="(dataset, index) in parsedDatasets"
                    :key="index"
                    class="legend-item"
                  >
                    <div
                      class="legend-color"
                      :style="{ backgroundColor: getDatasetColor(index) }"
                    ></div>
                    <span
                      >{{ dataset.name }} ({{
                        dataset.points.length
                      }}
                      points)</span
                    >
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showImportDialog = false">Cancel</v-btn>
          <v-btn
            @click="importDatasets"
            color="primary"
            :disabled="!csvContent"
          >
            Import
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- TODO: モーダル上でデータセットを選べるようにする -->
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { MASK_MODE } from '@/constants'
import AxisSetCalculator from '@/domain/services/axisSetCalculator'
import { Point } from '@/@types/types'
import { CsvParser } from '@/application/utils/csvParser'
import { JsonParser } from '@/application/utils/jsonParser'

export default defineComponent({
  components: {},
  data() {
    return {
      canvasHandler,
      interpolator,
      datasetRepository,
      sortKey: 'as added',
      sortKeys: ['as added', 'x', 'y'],
      sortOrder: 'ascending',
      sortOrders: ['ascending', 'descending'],
      axisSetRepository,
      showImportDialog: false,
      csvContent: '',
      importPreview: [] as string[][],
      importError: '',
      parsedDatasets: [] as {
        name: string
        color?: string
        points: { x: number; y: number; xPx: number; yPx: number }[]
      }[],
      importFormat: 'auto' as 'auto' | 'csv' | 'json',
      showDataPoints: true,
      sortByX: false,
    }
  },
  props: {
    exportBtnText: {
      type: String,
      required: false,
    },
    exportBtnClick: {
      type: Function,
      required: false,
    },
  },
  computed: {
    totalPointsCount(): number {
      return this.datasetRepository.datasets.reduce(
        (sum, dataset) => sum + dataset.points.length,
        0,
      )
    },
    isAxisCalibrated(): boolean {
      return (
        this.axisSetRepository.activeAxisSet.hasXAxis &&
        this.axisSetRepository.activeAxisSet.hasYAxis
      )
    },
    importButtonTitle(): string {
      if (!this.isAxisCalibrated) {
        return 'Please calibrate axes first (set x1, y1, x2, y2)'
      }
      return 'Import datasets from CSV or JSON'
    },
    sortedParsedDatasets(): {
      name: string
      color?: string
      points: { x: number; y: number; xPx: number; yPx: number }[]
    }[] {
      if (!this.sortByX) {
        return this.parsedDatasets
      }

      return this.parsedDatasets.map((dataset) => ({
        ...dataset,
        points: [...dataset.points].sort((a, b) => a.x - b.x),
      }))
    },
  },
  methods: {
    shouldContinueSwitchDataset(): boolean {
      if (this.datasetRepository.activeDataset.tempPoints.length === 0)
        return true

      return window.confirm(
        'There are unconfirmed interpolated points. Do you want to discard them and switch to a different dataset?',
      )
    },
    activateDataset(id: number) {
      this.interpolator.isActive && this.interpolator.clearPreview()
      this.datasetRepository.setActiveDataset(id)
      this.axisSetRepository.setActiveAxisSet(
        this.datasetRepository.activeDataset.axisSetId,
      )
      // INFO: データセットが変えた時はマスクをクリアすることが多いので。
      this.canvasHandler.clearMask()
      this.canvasHandler.maskMode = MASK_MODE.UNSET
    },
    handleOnClickDataset(id: number) {
      if (
        id === this.datasetRepository.activeDatasetId ||
        !this.shouldContinueSwitchDataset()
      )
        return

      this.activateDataset(id)
    },
    handleOnClickViewAll() {
      if (!this.shouldContinueSwitchDataset()) return

      this.interpolator.isActive && this.interpolator.clearPreview()
      this.datasetRepository.setActiveDataset(0)
      this.canvasHandler.clearMask()
      this.canvasHandler.maskMode = MASK_MODE.UNSET
    },
    handleOnClickAddDatasetButton() {
      if (!this.shouldContinueSwitchDataset()) return

      this.datasetRepository.createNewDataset()

      this.datasetRepository.lastDataset.setAxisSetId(
        this.axisSetRepository.activeAxisSetId,
      )

      this.activateDataset(this.datasetRepository.lastDatasetId)
    },
    handleOnClickRemoveDatasetButton(datasetId?: number) {
      const targetDataset = datasetId
        ? this.datasetRepository.datasets.find((d) => d.id === datasetId)
        : this.datasetRepository.activeDataset

      if (!targetDataset) return

      //NOTE: remove dataset without confirmation if the dataset doesn't have data points
      if (targetDataset.points.length === 0) {
        this.removeDataset(targetDataset.id)
        return
      }

      window.confirm(
        `Are you sure to delete '${targetDataset.name}'? This operation is irreversible.`,
      ) && this.removeDataset(targetDataset.id)
    },
    removeDataset(datasetId: number) {
      this.interpolator.isActive && this.interpolator.clearPreview()
      this.datasetRepository.removeDataset(datasetId)
    },
    handleOnClickRemoveAllDatasetsButton() {
      const totalPoints = this.datasetRepository.datasets.reduce(
        (sum, dataset) => sum + dataset.points.length,
        0,
      )

      if (totalPoints === 0) {
        this.removeAllDatasets()
        return
      }

      window.confirm(
        `Are you sure to delete all ${this.datasetRepository.datasets.length} datasets? This will remove ${totalPoints} data points. This operation is irreversible.`,
      ) && this.removeAllDatasets()
    },
    removeAllDatasets() {
      this.interpolator.isActive && this.interpolator.clearPreview()
      this.datasetRepository.removeAllDatasets()
    },
    calculateXY(x: number, y: number): { xV: string; yV: string } {
      const calculator = new AxisSetCalculator(
        this.axisSetRepository.activeAxisSet,
        {
          x: this.axisSetRepository.activeAxisSet.xIsLogScale,
          y: this.axisSetRepository.activeAxisSet.yIsLogScale,
        },
      )
      return calculator.calculateXYValues(x, y)
    },
    convertToCsv(data: string[][]): string {
      const CSV_DELIMITER = ','
      const rows = data.map((row) => row.join(CSV_DELIMITER))
      return rows.join('\n')
    },
    copyDatasetToClipboard(datasetId: number) {
      const dataset = this.datasetRepository.datasets.find(
        (d) => d.id === datasetId,
      )
      if (!dataset || dataset.points.length === 0) return

      const data = dataset.points.map((point: Point) => {
        const { xV, yV } = this.calculateXY(point.xPx, point.yPx)
        return [xV, yV]
      })

      const csv = this.convertToCsv(data)
      navigator.clipboard
        .writeText(csv)
        .then(() => console.log('Dataset copied to clipboard successfully.'))
        .catch((err) =>
          console.error('Failed to copy dataset to clipboard.', err),
        )
    },
    detectFormat(content: string): 'csv' | 'json' {
      const trimmed = content.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return 'json'
      }
      return 'csv'
    },
    parseCSVPreview() {
      this.importError = ''
      this.importPreview = []
      this.parsedDatasets = []

      if (!this.csvContent.trim()) return

      const format = this.detectFormat(this.csvContent)

      try {
        if (format === 'json') {
          // For JSON, show formatted preview
          const previewResult = JsonParser.generatePreview(this.csvContent)
          if (!previewResult.success) {
            this.importError = previewResult.preview
            return
          }
          // Convert preview text to table format for display
          this.importPreview = [[previewResult.preview]]
        } else {
          this.importPreview = CsvParser.generatePreview(this.csvContent, 6)
        }

        // Parse full datasets for preview (only if axis coordinates are set)
        const axisSet = this.axisSetRepository.activeAxisSet
        if (
          axisSet.x1.coord &&
          axisSet.x2.coord &&
          axisSet.y1.coord &&
          axisSet.y2.coord &&
          axisSet.x1.value !== axisSet.x2.value &&
          axisSet.y1.value !== axisSet.y2.value
        ) {
          const parsed =
            format === 'json'
              ? JsonParser.parseJSON(this.csvContent)
              : CsvParser.parseCSV(this.csvContent)

          const calculator = new AxisSetCalculator(
            this.axisSetRepository.activeAxisSet,
            {
              x: this.axisSetRepository.activeAxisSet.xIsLogScale,
              y: this.axisSetRepository.activeAxisSet.yIsLogScale,
            },
          )

          this.parsedDatasets = parsed.datasets
            .map((dataset) => ({
              name: dataset.name,
              color: (dataset as any).color,
              points: dataset.points
                .map((point) => {
                  const pixelCoords = calculator.calculatePixelCoordinates(
                    point.x,
                    point.y,
                  )
                  return {
                    x: point.x,
                    y: point.y,
                    xPx: pixelCoords?.xPx || 0,
                    yPx: pixelCoords?.yPx || 0,
                  }
                })
                .filter((point) => point.xPx !== 0 || point.yPx !== 0),
            }))
            .filter((dataset) => dataset.points.length > 0)
        } else {
          // Clear preview when axis coordinates aren't properly set
          this.parsedDatasets = []
        }

        this.$nextTick(() => {
          this.updatePreviewCanvas()
        })
      } catch (error) {
        this.importError =
          'Error parsing ' +
          format.toUpperCase() +
          ': ' +
          (error as Error).message
      }
    },
    async importDatasets() {
      this.importError = ''

      try {
        if (!this.csvContent.trim()) {
          throw new Error('Please provide CSV or JSON content')
        }

        // Deactivate axis movement when importing
        this.axisSetRepository.activeAxisSet.inactivateAxis()

        // Validate that axis coordinates are properly set
        const axisSet = this.axisSetRepository.activeAxisSet
        if (
          !axisSet.x1.coord ||
          !axisSet.x2.coord ||
          !axisSet.y1.coord ||
          !axisSet.y2.coord
        ) {
          this.importError =
            'Please set the X and Y axis coordinates before importing data.\n\n' +
            'You need to define the axis points on the image first:\n' +
            '• X1 and X2 points for the X-axis\n' +
            '• Y1 and Y2 points for the Y-axis'
          return
        }

        if (
          axisSet.x1.value === axisSet.x2.value ||
          axisSet.y1.value === axisSet.y2.value
        ) {
          this.importError =
            'Invalid axis configuration detected.\n\n' +
            'Please ensure that:\n' +
            '• X1 and X2 have different values\n' +
            '• Y1 and Y2 have different values'
          return
        }

        const format = this.detectFormat(this.csvContent)
        const parsed =
          format === 'json'
            ? JsonParser.parseJSON(this.csvContent)
            : CsvParser.parseCSV(this.csvContent)

        const calculator = new AxisSetCalculator(
          this.axisSetRepository.activeAxisSet,
          {
            x: this.axisSetRepository.activeAxisSet.xIsLogScale,
            y: this.axisSetRepository.activeAxisSet.yIsLogScale,
          },
        )

        // Clear existing datasets before import
        this.datasetRepository.clearAllDatasets()

        for (const datasetData of parsed.datasets) {
          this.datasetRepository.createNewDataset()
          const newDataset = this.datasetRepository.lastDataset
          newDataset.name = datasetData.name
          if (datasetData.color) {
            newDataset.color = datasetData.color
          }
          newDataset.setAxisSetId(this.axisSetRepository.activeAxisSetId)

          for (const point of datasetData.points) {
            const pixelCoords = calculator.calculatePixelCoordinates(
              point.x,
              point.y,
            )
            if (pixelCoords) {
              newDataset.addPoint(pixelCoords.xPx, pixelCoords.yPx)
            }
          }
        }

        // Set first dataset as active
        if (this.datasetRepository.datasets.length > 0) {
          this.datasetRepository.setActiveDataset(
            this.datasetRepository.datasets[0].id,
          )
        }

        this.showImportDialog = false
        this.csvContent = ''
        this.importPreview = []

        console.log(
          `Successfully imported ${
            parsed.datasets.length
          } datasets from ${format.toUpperCase()}`,
        )
      } catch (error) {
        this.importError = (error as Error).message
      }
    },
    getDatasetColor(index: number): string {
      // Check if the dataset has a color property
      if (this.parsedDatasets[index] && this.parsedDatasets[index].color) {
        return this.parsedDatasets[index].color!
      }

      // Fallback to default colors
      const colors = [
        '#2196F3', // Blue
        '#FF9800', // Orange
        '#4CAF50', // Green
        '#F44336', // Red
        '#9C27B0', // Purple
        '#00BCD4', // Cyan
        '#FFEB3B', // Yellow
        '#795548', // Brown
      ]
      return colors[index % colors.length]
    },
    updatePreviewCanvas() {
      const canvas = this.$refs.previewCanvas as HTMLCanvasElement
      if (!canvas || !this.canvasHandler.imageElement) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Calculate canvas size based on image aspect ratio
      const imageWidth = this.canvasHandler.imageElement.width
      const imageHeight = this.canvasHandler.imageElement.height
      const imageAspect = imageWidth / imageHeight

      // Use container width and calculate height to maintain aspect ratio
      const maxWidth = 900
      const maxHeight = 600

      let canvasWidth, canvasHeight

      if (imageAspect > maxWidth / maxHeight) {
        // Image is wider - fit to width
        canvasWidth = maxWidth
        canvasHeight = maxWidth / imageAspect
      } else {
        // Image is taller - fit to height
        canvasHeight = maxHeight
        canvasWidth = maxHeight * imageAspect
      }

      canvas.width = canvasWidth
      canvas.height = canvasHeight

      const scaleX = canvasWidth / imageWidth
      const scaleY = canvasHeight / imageHeight

      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      // Draw image (fill entire canvas)
      ctx.drawImage(this.canvasHandler.imageElement, 0, 0, canvasWidth, canvasHeight)

      // Draw datasets only if showDataPoints is true
      if (!this.showDataPoints) return

      this.sortedParsedDatasets.forEach((dataset, datasetIndex) => {
        const color = this.getDatasetColor(datasetIndex)

        if (dataset.points.length > 0) {
          // Draw connecting lines with white border
          // White border for line
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 3
          ctx.beginPath()
          const firstPoint = dataset.points[0]
          ctx.moveTo(firstPoint.xPx * scaleX, firstPoint.yPx * scaleY)

          for (let i = 1; i < dataset.points.length; i++) {
            const point = dataset.points[i]
            ctx.lineTo(point.xPx * scaleX, point.yPx * scaleY)
          }
          ctx.stroke()

          // Colored line on top
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(firstPoint.xPx * scaleX, firstPoint.yPx * scaleY)

          for (let i = 1; i < dataset.points.length; i++) {
            const point = dataset.points[i]
            ctx.lineTo(point.xPx * scaleX, point.yPx * scaleY)
          }
          ctx.stroke()

          // Draw points as circles with white border
          dataset.points.forEach(
            (point: { x: number; y: number; xPx: number; yPx: number }) => {
              const x = point.xPx * scaleX
              const y = point.yPx * scaleY

              // White border
              ctx.beginPath()
              ctx.arc(x, y, 5, 0, 2 * Math.PI)
              ctx.fillStyle = 'white'
              ctx.fill()

              // Colored point on top
              ctx.beginPath()
              ctx.arc(x, y, 4, 0, 2 * Math.PI)
              ctx.fillStyle = color
              ctx.fill()
            },
          )
        }
      })
    },
  },
  watch: {
    csvContent() {
      this.parseCSVPreview()
    },
    showDataPoints() {
      this.$nextTick(() => {
        this.updatePreviewCanvas()
      })
    },
    showImportDialog(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.updatePreviewCanvas()
        })
      }
    },
    sortByX() {
      this.$nextTick(() => {
        this.updatePreviewCanvas()
      })
    },
  },
})
</script>

<style scoped>
.preview-table table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

.preview-table th,
.preview-table td {
  border: 1px solid #ccc;
  padding: 4px 8px;
  text-align: left;
  font-size: 0.875rem;
}

.preview-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.error-message {
  color: #d32f2f;
  font-size: 0.875rem;
}

.image-preview-container {
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.preview-canvas {
  width: 100%;
  height: 250px;
  display: block;
}

.image-preview-container-large {
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.preview-canvas-large {
  width: 100%;
  height: 550px;
  display: block;
}

.preview-canvas-flexible {
  width: 100%;
  max-height: 600px;
  display: block;
  object-fit: contain;
}

.dataset-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #ccc;
}

.csv-json-textarea {
  height: 100%;
}

.csv-json-textarea :deep(.v-input__control) {
  height: 100%;
}

.csv-json-textarea :deep(.v-field) {
  height: 100%;
}

.csv-json-textarea :deep(.v-field__field) {
  height: 100%;
  padding-top: 16px;
}

.csv-json-textarea :deep(textarea) {
  height: 100% !important;
  max-height: 100% !important;
}
</style>
