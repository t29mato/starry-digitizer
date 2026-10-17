<template>
  <div class="sd-panel mt-3">
    <h4>Figure Annotations</h4>
    <div class="text-caption text-medium-emphasis mb-1">{{ caption }}</div>
    <div
      v-for="area in areas"
      :key="area.target"
      class="d-flex align-center mb-1 c__row"
    >
      <sd-button
        size="small"
        :color="
          canvasHandler.annotationTarget === area.target ? 'primary' : ''
        "
        :disabled="!canEdit"
        @click="toggleDrawing(area.target)"
        >{{ drawLabel(area) }}</sd-button
      >
      <sd-button
        v-if="area.rect"
        size="x-small"
        variant="text"
        :icon="mdiClose"
        :title="`Remove ${area.label}`"
        :disabled="!canEdit"
        @click="clearArea(area.target)"
      ></sd-button>
      <span v-if="area.rect" class="text-caption text-medium-emphasis">{{
        formatRect(area.rect)
      }}</span>
    </div>

    <h5 class="mt-2">{{ markerHeading }}</h5>
    <div class="d-flex c__row">
      <sd-select
        label="Shape"
        :model-value="marker.shape ?? ''"
        :items="shapeItems"
        :disabled="!canEditMarker"
        @update:model-value="setMarker('shape', $event)"
      ></sd-select>
      <sd-select
        label="Fill"
        :model-value="marker.fill ?? ''"
        :items="fillItems"
        :disabled="!canEditMarker"
        @update:model-value="setMarker('fill', $event)"
      ></sd-select>
    </div>
    <sd-text-field
      class="mt-1"
      label="Size"
      suffix="px"
      type="number"
      min="0"
      :model-value="marker.sizePx ?? ''"
      :disabled="!canEditMarker"
      @change="setSize(($event.target as HTMLInputElement).value)"
    ></sd-text-field>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mdiClose } from '@mdi/js'
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { SdButton, SdSelect, SdTextField } from '@/presentation/ui'
import {
  MARKER_FILLS,
  MARKER_SHAPES,
} from '@/application/dto/autoExtractionDTO'
import {
  setAnnotationArea,
  setDatasetMarker,
} from '@/application/utils/reviewEditOperations'
import {
  AnnotationTarget,
  MarkerFill,
  MarkerShape,
  MarkerStyle,
  Rect,
} from '@/@types/types'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'

type Area = { target: AnnotationTarget; label: string; rect: Rect | null }

// INFO: '' is "not set" in the selects (a native <select> cannot hold null)
const UNSET = { title: '—', value: '' }

// INFO: Figure information for detector training data (docs/design/
// auto-extraction-review-design.md, "5."): the plot and legend rectangles
// of the active axis set (drawn by dragging on the image, see CanvasMain's
// mouseUp) and the active dataset's marker shape / fill / size.
export default defineComponent({
  components: { SdButton, SdSelect, SdTextField },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    const { canvasHandler, axisSetRepository, datasetRepository } = ctx
    return {
      ctx,
      options,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
      mdiClose,
    }
  },
  data() {
    return {
      shapeItems: [UNSET, ...MARKER_SHAPES],
      fillItems: [UNSET, ...MARKER_FILLS],
    }
  },
  computed: {
    canEdit(): boolean {
      return !this.options.readonly
    },
    canEditMarker(): boolean {
      return this.canEdit && !this.datasetRepository.isViewAllMode
    },
    activeAxisSet(): AxisSetInterface {
      return this.axisSetRepository.activeAxisSet
    },
    activeDataset(): DatasetInterface {
      return this.datasetRepository.activeDataset
    },
    caption(): string {
      const axes = this.activeAxisSet.name
      return `Exported with File → Export Data (JSON). Axes: ${axes}`
    },
    markerHeading(): string {
      if (this.datasetRepository.isViewAllMode) {
        return 'Marker (select a dataset)'
      }
      return `Marker of "${this.activeDataset.name}"`
    },
    marker(): MarkerStyle {
      return this.activeDataset.marker ?? {}
    },
    areas(): Area[] {
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
    drawLabel(area: Area): string {
      if (this.canvasHandler.annotationTarget === area.target) {
        return 'Drag on image…'
      }
      return area.rect ? `Redraw ${area.label}` : `Draw ${area.label}`
    },
    toggleDrawing(target: AnnotationTarget) {
      this.canvasHandler.setAnnotationTarget(
        this.canvasHandler.annotationTarget === target ? null : target,
      )
    },
    clearArea(target: AnnotationTarget) {
      setAnnotationArea(this.ctx, target, null)
    },
    formatRect(rect: Rect): string {
      const r = (v: number) => Math.round(v)
      return `${r(rect.xPx)},${r(rect.yPx)} ${r(rect.widthPx)}×${r(
        rect.heightPx,
      )}`
    },
    setMarker(key: 'shape' | 'fill', value: string | number) {
      const picked = value === '' ? null : String(value)
      if (key === 'shape') {
        setDatasetMarker(this.ctx, 'shape', picked as MarkerShape | null)
      } else {
        setDatasetMarker(this.ctx, 'fill', picked as MarkerFill | null)
      }
    },
    setSize(value: string) {
      const size = parseFloat(value)
      setDatasetMarker(this.ctx, 'sizePx', size > 0 ? size : null)
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__row {
    gap: 4px;
  }
}
</style>
