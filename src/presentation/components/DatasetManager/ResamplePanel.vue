<template>
  <div class="sd-panel mt-3" data-cy="resample-panel">
    <div class="d-flex align-center">
      <h4 class="mb-0">Resample</h4>
      <sd-button
        size="x-small"
        variant="text"
        class="ml-2"
        data-cy="resample-toggle"
        :aria-expanded="isOpen ? 'true' : 'false'"
        @click="isOpen = !isOpen"
        >{{ isOpen ? 'Close' : 'Open' }}</sd-button
      >
    </div>
    <div v-if="isOpen" class="mt-1">
      <div class="text-caption mb-1">
        Active dataset: <b>{{ datasetRepository.activeDataset.name }}</b>
      </div>
      <sd-select
        class="mb-1"
        data-cy="resample-mode"
        prefix="Mode:"
        :model-value="mode"
        :items="modeItems"
        @update:model-value="setMode"
      ></sd-select>

      <sd-text-field
        v-if="mode === 'thin'"
        class="mb-1"
        data-cy="resample-count"
        type="number"
        min="2"
        step="1"
        prefix="Points:"
        :model-value="count"
        @update:model-value="count = toNumber($event)"
      ></sd-text-field>
      <sd-text-field
        v-if="mode === 'every'"
        class="mb-1"
        data-cy="resample-k"
        type="number"
        min="1"
        step="1"
        prefix="Every k-th, k:"
        :model-value="k"
        @update:model-value="k = toNumber($event)"
      ></sd-text-field>
      <sd-text-field
        v-if="mode === 'simplify'"
        class="mb-1"
        data-cy="resample-tolerance"
        type="number"
        min="0"
        step="0.5"
        prefix="Tolerance:"
        suffix="px"
        :model-value="tolerancePx"
        @update:model-value="tolerancePx = toNumber($event)"
      ></sd-text-field>
      <template v-if="mode === 'atX'">
        <sd-select
          class="mb-1"
          data-cy="resample-xspec"
          prefix="x values:"
          :model-value="xSpec"
          :items="xSpecItems"
          @update:model-value="setXSpec"
        ></sd-select>
        <template v-if="xSpec === 'count'">
          <sd-text-field
            class="mb-1"
            data-cy="resample-xcount"
            type="number"
            min="1"
            step="1"
            prefix="Count:"
            :model-value="xCount"
            @update:model-value="xCount = toNumber($event)"
          ></sd-text-field>
          <div class="d-flex c__range">
            <sd-text-field
              data-cy="resample-xfrom"
              prefix="From:"
              placeholder="data min"
              :model-value="xFrom"
              @update:model-value="xFrom = String($event)"
            ></sd-text-field>
            <sd-text-field
              data-cy="resample-xto"
              prefix="To:"
              placeholder="data max"
              :model-value="xTo"
              @update:model-value="xTo = String($event)"
            ></sd-text-field>
          </div>
        </template>
        <sd-text-field
          v-else
          class="mb-1"
          data-cy="resample-xlist"
          prefix="x:"
          placeholder="e.g. 300, 400, 500"
          :model-value="xList"
          @update:model-value="xList = String($event)"
        ></sd-text-field>
      </template>

      <sd-text-field
        class="mb-1"
        data-cy="resample-smooth"
        type="number"
        min="1"
        step="2"
        :prefix="mode === 'smooth' ? 'Window:' : 'Smooth first, window:'"
        suffix="pts"
        :model-value="smoothWindow"
        @update:model-value="smoothWindow = toNumber($event)"
      ></sd-text-field>
      <sd-checkbox
        v-if="mode !== 'atX'"
        class="mb-1"
        data-cy="resample-sort"
        label="Sort the points by x first"
        :model-value="sortByX"
        @update:model-value="sortByX = Boolean($event)"
      ></sd-checkbox>

      <svg
        v-if="plot"
        class="c__plot"
        viewBox="0 0 200 90"
        role="img"
        :aria-label="summary"
      >
        <polyline class="c__plot-before" :points="plot.before"></polyline>
        <circle
          v-for="(p, i) in plot.after"
          :key="i"
          class="c__plot-after"
          :cx="p[0]"
          :cy="p[1]"
          r="1.8"
        ></circle>
      </svg>
      <div class="text-caption" data-cy="resample-summary">{{ summary }}</div>
      <div
        v-for="note in preview.notes"
        :key="note"
        class="text-caption c__note"
      >
        {{ note }}
      </div>
      <div
        v-if="preview.error"
        class="text-caption c__error"
        data-cy="resample-error"
      >
        {{ preview.error }}
      </div>
      <div class="d-flex mt-1">
        <sd-button
          size="small"
          color="primary"
          data-cy="resample-apply"
          :disabled="!canApply"
          title="Replace the points of the active dataset (one undo step)"
          @click="apply"
          >Apply</sd-button
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { SdButton, SdCheckbox, SdSelect, SdTextField } from '@/presentation/ui'
import {
  applyResample,
  previewResample,
  ResamplePreview,
} from '@/application/utils/resampleOperations'
import { ResampleMode, ResampleOptions } from '@/application/utils/resample'

// INFO: Resample the active dataset — thin, simplify, smooth or take values
// at given x. The preview is recomputed from the live points as the options
// change; Apply is one undo step (`points.resample`). The work happens in
// resampleOperations.ts, which a host can call without this panel.
export default defineComponent({
  components: { SdButton, SdCheckbox, SdSelect, SdTextField },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    return { ctx, options, datasetRepository: ctx.datasetRepository }
  },
  data() {
    return {
      isOpen: false,
      mode: 'thin' as ResampleMode,
      count: 20 as number | null,
      k: 2 as number | null,
      tolerancePx: 1 as number | null,
      xSpec: 'count' as 'count' | 'list',
      xCount: 10 as number | null,
      xFrom: '',
      xTo: '',
      xList: '',
      smoothWindow: 1 as number | null,
      sortByX: false,
      modeItems: [
        { title: 'Thin to N points', value: 'thin' },
        { title: 'Keep every k-th point', value: 'every' },
        { title: 'Simplify (Douglas–Peucker)', value: 'simplify' },
        { title: 'Resample at x values', value: 'atX' },
        { title: 'Smooth only', value: 'smooth' },
      ],
      xSpecItems: [
        { title: 'N evenly spaced', value: 'count' },
        { title: 'Typed list', value: 'list' },
      ],
    }
  },
  computed: {
    resampleOptions(): ResampleOptions {
      const optional = (text: string) =>
        text.trim() === '' ? undefined : Number(text)
      return {
        mode: this.mode,
        count: (this.mode === 'atX' ? this.xCount : this.count) ?? undefined,
        k: this.k ?? undefined,
        tolerancePx: this.tolerancePx ?? undefined,
        xSpec: this.xSpec,
        xFrom: optional(this.xFrom),
        xTo: optional(this.xTo),
        xList: this.xList,
        smoothWindow: this.smoothWindow ?? 1,
        sortByX: this.sortByX,
      }
    },
    preview(): ResamplePreview {
      // INFO: previewResample() reads the live points, so the preview
      // follows edits made on the canvas while the panel is open.
      return previewResample(this.ctx, this.resampleOptions)
    },
    summary(): string {
      if (this.preview.error) return `${this.preview.before} points`
      return `${this.preview.before} points → ${this.preview.after} points`
    },
    canApply(): boolean {
      return (
        !this.options.readonly &&
        !this.datasetRepository.isViewAllMode &&
        !this.preview.error
      )
    },
    // INFO: the before/after shapes in the calibrated space (log axes drawn
    // in log), scaled into a small box. Only a picture; no numbers are read
    // from it.
    plot(): { before: string; after: [number, number][] } | null {
      const { inputValues, values, logX, logY, error } = this.preview
      if (error || inputValues.length === 0) return null
      const fx = (x: number) => (logX ? Math.log10(x) : x)
      const fy = (y: number) => (logY ? Math.log10(y) : y)
      const all = [...inputValues, ...values].filter(
        (p) => Number.isFinite(fx(p.x)) && Number.isFinite(fy(p.y)),
      )
      if (all.length === 0) return null
      const xs = all.map((p) => fx(p.x))
      const ys = all.map((p) => fy(p.y))
      const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
      const [y0, y1] = [Math.min(...ys), Math.max(...ys)]
      const sx = (x: number) => 4 + ((fx(x) - x0) / (x1 - x0 || 1)) * 192
      const sy = (y: number) => 86 - ((fy(y) - y0) / (y1 - y0 || 1)) * 82
      return {
        before: inputValues
          .map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
          .join(' '),
        after: values.map((p) => [sx(p.x), sy(p.y)]),
      }
    },
  },
  methods: {
    setMode(value: string | number) {
      this.mode = String(value) as ResampleMode
    },
    setXSpec(value: string | number) {
      this.xSpec = String(value) === 'list' ? 'list' : 'count'
    },
    toNumber(value: string | number): number | null {
      const parsed = typeof value === 'number' ? value : parseFloat(value)
      return Number.isNaN(parsed) ? null : parsed
    },
    apply() {
      if (!this.canApply) return
      applyResample(this.ctx, this.resampleOptions)
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__range {
    gap: 4px;
  }
  &__plot {
    display: block;
    width: 100%;
    max-width: 240px;
    height: auto;
    margin: 4px 0;
    background: var(--sd-surface-variant, #f5f5f5);
    border-radius: var(--sd-radius, 4px);
  }
  &__plot-before {
    fill: none;
    stroke: var(--sd-text-disabled, rgba(0, 0, 0, 0.38));
    stroke-width: 1;
  }
  &__plot-after {
    fill: var(--sd-primary, #1e88e5);
  }
  &__note {
    color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
  }
  &__error {
    color: var(--sd-error, #e53935);
  }
}
</style>
