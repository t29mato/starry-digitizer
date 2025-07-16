<template>
  <div>
    <h4>
      Dataset List
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
      <v-btn
        size="x-small"
        @click="showImportDialog = true"
        class="ml-2"
        title="Import datasets from CSV"
        ><v-icon>mdi-import</v-icon></v-btn
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
                dataset.id === datasetRepository.activeDataset.id &&
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

    <!-- CSV Import Dialog -->
    <v-dialog v-model="showImportDialog" max-width="900">
      <v-card>
        <v-card-title>Import Datasets from CSV</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-file-input
                v-model="csvFile"
                label="Select CSV file"
                accept=".csv"
                show-size
                @change="handleFileChange"
              ></v-file-input>

              <v-textarea
                v-model="csvContent"
                label="Or paste CSV content here"
                rows="6"
                class="mt-4"
                variant="outlined"
              ></v-textarea>

              <div v-if="importPreview.length > 0" class="mt-4">
                <h6>Preview (first 5 rows):</h6>
                <div class="preview-table">
                  <table>
                    <thead>
                      <tr>
                        <th
                          v-for="(header, index) in importPreview[0]"
                          :key="index"
                        >
                          {{ header }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(row, rowIndex) in importPreview.slice(1, 6)"
                        :key="rowIndex"
                      >
                        <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                          {{ cell }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div v-if="importError" class="error-message mt-2">
                {{ importError }}
              </div>
            </v-col>

            <v-col cols="6">
              <h6>Visual Preview on Image:</h6>
              <div v-if="parsedDatasets.length > 0">
                <div class="image-preview-container">
                  <canvas
                    ref="previewCanvas"
                    class="preview-canvas"
                    @mouseenter="updatePreviewCanvas"
                  ></canvas>
                </div>
                <div class="dataset-legend">
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
              <div
                v-else-if="importPreview.length > 0"
                class="axis-setup-notice"
              >
                <v-alert type="warning" variant="tonal" class="text-center">
                  <div class="d-flex flex-column align-center">
                    <v-icon size="32" class="mb-2">mdi-axis-arrow</v-icon>
                    <strong>Set Axis Coordinates First</strong>
                    <p class="mt-2 mb-0">
                      Please configure the X and Y axis coordinates on the image
                      to see the visual preview of your CSV data points.
                    </p>
                  </div>
                </v-alert>
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
            :disabled="!csvContent && !csvFile"
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
      csvFile: undefined as File[] | undefined,
      csvContent: '',
      importPreview: [] as string[][],
      importError: '',
      parsedDatasets: [] as {
        name: string
        points: { x: number; y: number; xPx: number; yPx: number }[]
      }[],
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
    handleFileChange(files: File[]) {
      if (files && files.length > 0) {
        const file = files[0]
        const reader = new FileReader()
        reader.onload = (e) => {
          this.csvContent = e.target?.result as string
          this.parseCSVPreview()
        }
        reader.readAsText(file)
      }
    },
    parseCSVPreview() {
      this.importError = ''
      this.importPreview = []
      this.parsedDatasets = []

      if (!this.csvContent.trim()) return

      try {
        this.importPreview = CsvParser.generatePreview(this.csvContent, 6)

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
          const parsed = CsvParser.parseCSV(this.csvContent)
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
        this.importError = 'Error parsing CSV: ' + (error as Error).message
      }
    },
    async importDatasets() {
      this.importError = ''

      try {
        if (!this.csvContent.trim()) {
          throw new Error('Please provide CSV content')
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
            'Please set the X and Y axis coordinates before importing CSV data.\n\n' +
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

        const parsed = CsvParser.parseCSV(this.csvContent)
        const calculator = new AxisSetCalculator(
          this.axisSetRepository.activeAxisSet,
          {
            x: this.axisSetRepository.activeAxisSet.xIsLogScale,
            y: this.axisSetRepository.activeAxisSet.yIsLogScale,
          },
        )

        for (const datasetData of parsed.datasets) {
          this.datasetRepository.createNewDataset()
          const newDataset = this.datasetRepository.lastDataset
          newDataset.name = datasetData.name
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

        this.showImportDialog = false
        this.csvFile = undefined
        this.csvContent = ''
        this.importPreview = []

        console.log(`Successfully imported ${parsed.datasets.length} datasets`)
      } catch (error) {
        this.importError = (error as Error).message
      }
    },
    getDatasetColor(index: number): string {
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

      // Set canvas size to fit the container
      const containerWidth = 350
      const containerHeight = 250
      canvas.width = containerWidth
      canvas.height = containerHeight

      // Calculate scale to fit image in canvas
      const imageAspect =
        this.canvasHandler.imageElement.width /
        this.canvasHandler.imageElement.height
      const canvasAspect = containerWidth / containerHeight

      let drawWidth,
        drawHeight,
        offsetX = 0,
        offsetY = 0

      if (imageAspect > canvasAspect) {
        drawWidth = containerWidth
        drawHeight = containerWidth / imageAspect
        offsetY = (containerHeight - drawHeight) / 2
      } else {
        drawHeight = containerHeight
        drawWidth = containerHeight * imageAspect
        offsetX = (containerWidth - drawWidth) / 2
      }

      const scaleX = drawWidth / this.canvasHandler.imageElement.width
      const scaleY = drawHeight / this.canvasHandler.imageElement.height

      // Clear canvas
      ctx.clearRect(0, 0, containerWidth, containerHeight)

      // Draw image
      ctx.drawImage(
        this.canvasHandler.imageElement,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight,
      )

      // Draw datasets
      this.parsedDatasets.forEach((dataset, datasetIndex) => {
        const color = this.getDatasetColor(datasetIndex)
        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.lineWidth = 2

        if (dataset.points.length > 0) {
          // Draw connecting lines
          ctx.beginPath()
          const firstPoint = dataset.points[0]
          ctx.moveTo(
            offsetX + firstPoint.xPx * scaleX,
            offsetY + firstPoint.yPx * scaleY,
          )

          for (let i = 1; i < dataset.points.length; i++) {
            const point = dataset.points[i]
            ctx.lineTo(
              offsetX + point.xPx * scaleX,
              offsetY + point.yPx * scaleY,
            )
          }
          ctx.stroke()

          // Draw points as circles
          dataset.points.forEach((point) => {
            ctx.beginPath()
            ctx.arc(
              offsetX + point.xPx * scaleX,
              offsetY + point.yPx * scaleY,
              4,
              0,
              2 * Math.PI,
            )
            ctx.fill()
          })
        }
      })
    },
  },
  watch: {
    csvContent() {
      this.parseCSVPreview()
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
</style>
