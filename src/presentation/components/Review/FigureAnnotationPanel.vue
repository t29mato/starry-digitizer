<template>
  <div class="mt-3">
    <h4>Figure Annotations</h4>
    <div class="text-caption text-medium-emphasis mb-1">
      Exported with File → Export Data (JSON). Axes: {{ activeAxisSet.name }}
    </div>
    <div
      v-for="area in areas"
      :key="area.target"
      class="d-flex align-center mb-1"
      style="gap: 4px"
    >
      <v-btn
        size="small"
        :color="
          canvasHandler.annotationTarget === area.target ? 'primary' : undefined
        "
        @click="toggleDrawing(area.target)"
        >{{
          canvasHandler.annotationTarget === area.target
            ? 'Drag on image…'
            : area.rect
            ? `Redraw ${area.label}`
            : `Draw ${area.label}`
        }}</v-btn
      >
      <v-btn
        v-if="area.rect"
        size="x-small"
        variant="text"
        :title="`Remove ${area.label}`"
        @click="clearArea(area.target)"
        ><v-icon>mdi-close</v-icon></v-btn
      >
      <span v-if="area.rect" class="text-caption text-medium-emphasis">{{
        formatRect(area.rect)
      }}</span>
    </div>

    <h5 class="mt-2">
      Marker of "{{ activeDataset.name }}"
      <span
        v-if="datasetRepository.isViewAllMode"
        class="text-caption"
        style="color: #999"
        >(select a dataset)</span
      >
    </h5>
    <div class="d-flex" style="gap: 4px">
      <v-select
        :model-value="marker.shape ?? null"
        @update:model-value="setMarker('shape', $event)"
        :items="shapes"
        label="Shape"
        density="compact"
        hide-details
        clearable
        :disabled="datasetRepository.isViewAllMode"
      ></v-select>
      <v-select
        :model-value="marker.fill ?? null"
        @update:model-value="setMarker('fill', $event)"
        :items="fills"
        label="Fill"
        density="compact"
        hide-details
        clearable
        :disabled="datasetRepository.isViewAllMode"
      ></v-select>
    </div>
    <v-text-field
      :model-value="marker.sizePx ?? ''"
      @change="setSize(($event.target as HTMLInputElement).value)"
      label="Size"
      suffix="px"
      type="number"
      min="0"
      density="compact"
      hide-details
      class="mt-1"
      :disabled="datasetRepository.isViewAllMode"
    ></v-text-field>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  canvasHandler,
  historyManager,
} from '@/instanceStore/applicationServiceInstances'
import {
  axisSetRepository,
  datasetRepository,
} from '@/instanceStore/repositoryInatances'
import {
  MARKER_FILLS,
  MARKER_SHAPES,
} from '@/application/dto/autoExtractionDTO'
import { AnnotationTarget, MarkerStyle, Rect } from '@/@types/types'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'

// INFO: Figure information for detector training data (docs/design/
// auto-extraction-review-design.md, "5."): the plot and legend rectangles
// of the active axis set (drawn by dragging on the image, see CanvasMain's
// mouseUp) and the active dataset's marker shape / fill / size.
export default defineComponent({
  data() {
    return {
      canvasHandler,
      historyManager,
      axisSetRepository,
      datasetRepository,
      shapes: MARKER_SHAPES,
      fills: MARKER_FILLS,
    }
  },
  computed: {
    activeAxisSet(): AxisSetInterface {
      return this.axisSetRepository.activeAxisSet
    },
    activeDataset(): DatasetInterface {
      return this.datasetRepository.activeDataset
    },
    marker(): MarkerStyle {
      return this.activeDataset.marker ?? {}
    },
    areas(): { target: AnnotationTarget; label: string; rect: Rect | null }[] {
      return [
        {
          target: 'plotArea',
          label: 'plot area',
          rect: this.activeAxisSet.plotArea,
        },
        {
          target: 'legendArea',
          label: 'legend',
          rect: this.activeAxisSet.legendArea,
        },
      ]
    },
  },
  methods: {
    toggleDrawing(target: AnnotationTarget) {
      this.canvasHandler.setAnnotationTarget(
        this.canvasHandler.annotationTarget === target ? null : target,
      )
    },
    clearArea(target: AnnotationTarget) {
      this.historyManager.capture(
        target === 'plotArea'
          ? 'annotation.plot-area'
          : 'annotation.legend-area',
      )
      this.activeAxisSet[target] = null
    },
    formatRect(rect: Rect): string {
      const r = (v: number) => Math.round(v)
      return `${r(rect.xPx)},${r(rect.yPx)} ${r(rect.widthPx)}×${r(
        rect.heightPx,
      )}`
    },
    setMarker<K extends keyof MarkerStyle>(
      key: K,
      value: MarkerStyle[K] | null,
    ) {
      if ((this.marker[key] ?? null) === (value ?? null)) return
      this.historyManager.capture('series.marker')
      const next: MarkerStyle = { ...this.marker }
      if (value === null || value === undefined) {
        delete next[key]
      } else {
        next[key] = value
      }
      this.activeDataset.marker = next
    },
    setSize(value: string) {
      const size = parseFloat(value)
      this.setMarker('sizePx', size > 0 ? size : null)
    },
  },
})
</script>
