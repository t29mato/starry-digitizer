<template>
  <!-- INFO: F9, the legend reader's part of an extraction's result
       (legendOperations.ts). Quiet by design: while it reads, one muted
       line; when it cannot, one muted caption; never an error.
       No `text-caption` of its own: both panels put it inside their result
       line, which is one already, and the two 0.75em made it about 7px
       (seen in a browser, 2026-11-24). -->
  <div v-if="isReading || visibleOutcome" class="mt-1" data-cy="legend-naming">
    <div v-if="isReading" class="c__muted" data-cy="legend-naming-reading">
      Reading the legend…
    </div>
    <template v-else-if="visibleOutcome">
      <div v-if="named.length > 0" data-cy="legend-naming-named">
        Legend:
        <span
          v-for="(item, index) in named"
          :key="item.datasetId"
          :title="`Named from the legend (confidence ${item.confidence.toFixed(
            2,
          )})`"
          ><span class="c__auto">auto</span> {{ item.label
          }}{{ index < named.length - 1 ? ', ' : '' }}</span
        >
      </div>
      <div
        v-for="item in suggestions"
        :key="item.datasetId"
        class="d-flex align-center flex-wrap"
        style="gap: 6px"
        data-cy="legend-naming-suggestion"
      >
        <span
          >“{{ item.datasetName }}”: <b>{{ item.label }}?</b>
          <span class="c__muted">({{ item.confidence.toFixed(2) }})</span></span
        >
        <button
          type="button"
          class="c__accept"
          data-cy="legend-naming-accept"
          :disabled="readonly"
          @click="accept(item.datasetId)"
        >
          Use this name
        </button>
      </div>
      <div v-if="visibleOutcome.keptNames > 0" class="c__muted">
        Kept {{ visibleOutcome.keptNames }} name{{
          visibleOutcome.keptNames === 1 ? '' : 's'
        }}
        you changed.
      </div>
      <div
        v-if="visibleOutcome.changed"
        class="c__muted"
        data-cy="legend-naming-undo"
      >
        The legend's names and order are one Undo step of their own.
      </div>
      <div
        v-if="caption"
        class="c__muted"
        :title="visibleOutcome.reason"
        data-cy="legend-naming-caption"
      >
        {{ caption }}
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { ExtractionMethod } from '@/application/services/autoService/autoService'
import {
  acceptLegendSuggestion,
  LegendNamingOutcome,
} from '@/application/utils/legendOperations'

interface SuggestionRow {
  datasetId: number
  datasetName: string
  label: string
  confidence: number
}

export default defineComponent({
  props: {
    /** the legend reader is being asked */
    isReading: { type: Boolean, default: false },
    outcome: {
      type: Object as PropType<LegendNamingOutcome | null>,
      default: null,
    },
    method: {
      type: String as PropType<ExtractionMethod>,
      required: true,
    },
  },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    return { ctx, options, datasetRepository: ctx.datasetRepository }
  },
  computed: {
    readonly(): boolean {
      return Boolean(this.options.readonly)
    },
    // INFO: a service without a legend reader, or a reading superseded by a
    // newer one, shows nothing at all
    visibleOutcome(): LegendNamingOutcome | null {
      const outcome = this.outcome
      if (
        !outcome ||
        outcome.status === 'unsupported' ||
        outcome.status === 'cancelled'
      ) {
        return null
      }
      return outcome
    },
    named(): LegendNamingOutcome['named'] {
      return this.visibleOutcome?.named ?? []
    },
    // INFO: read from the datasets, not from the outcome alone: one that was
    // accepted, removed or undone no longer offers anything
    suggestions(): SuggestionRow[] {
      return (this.visibleOutcome?.suggestions ?? []).flatMap((item) => {
        const dataset = this.datasetRepository.datasets.find(
          (d) => d.id === item.datasetId,
        )
        if (!dataset || dataset.legend?.status !== 'suggestion') return []
        return [{ ...item, datasetName: dataset.name }]
      })
    },
    caption(): string {
      const outcome = this.visibleOutcome
      if (!outcome) return ''
      if (outcome.status !== 'done') return outcome.reason
      if (outcome.named.length === 0 && outcome.suggestions.length === 0) {
        return outcome.keptNames > 0
          ? ''
          : 'Legend: no series matched an entry.'
      }
      return ''
    },
  },
  methods: {
    accept(datasetId: number) {
      acceptLegendSuggestion(this.ctx, datasetId, this.method)
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__muted {
    color: #777;
  }
  &__auto {
    display: inline-block;
    padding: 0 4px;
    border-radius: 3px;
    background: #e3f2fd;
    color: #1565c0;
    font-size: 0.85em;
  }
  &__accept {
    padding: 0 6px;
    border: 1px solid var(--sd-border, rgba(0, 0, 0, 0.24));
    border-radius: var(--sd-radius, 4px);
    background: var(--sd-surface, #fff);
    color: var(--sd-text, rgba(0, 0, 0, 0.87));
    font: inherit;
    cursor: pointer;
  }
}
</style>
