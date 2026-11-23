<template>
  <sd-dialog
    :model-value="modelValue"
    title="My work on the server"
    :max-width="640"
    @update:model-value="close"
  >
    <div class="my-work" data-cy="my-work-dialog">
      <div class="my-work__controls">
        <label class="my-work__search">
          <span class="my-work__label">Search</span>
          <input
            v-model="query"
            type="search"
            placeholder="Search SID, figure or file name"
            data-cy="my-work-search"
            maxlength="200"
          />
        </label>
        <label class="my-work__sort">
          <span class="my-work__label">Sort</span>
          <select v-model="sort" data-cy="my-work-sort">
            <option value="saved">last saved</option>
            <option value="name">file name</option>
            <option value="sid">SID</option>
            <option value="figure">figure</option>
          </select>
        </label>
      </div>
      <p v-if="error" class="my-work__error" role="alert">{{ error }}</p>
      <p v-else-if="loading && works.length === 0" class="my-work__note">
        Loading…
      </p>
      <p v-else-if="unsupported" class="my-work__note">
        This server does not keep starry-digitizer work yet.
      </p>
      <p v-else-if="works.length === 0" class="my-work__note">
        {{ query.trim() ? 'No work matches.' : 'No saved work yet.' }}
      </p>
      <p v-else class="my-work__note" data-cy="my-work-count">
        {{ countText }}
      </p>
      <ul class="my-work__list">
        <li
          v-for="work in works"
          :key="work.projectId"
          class="my-work__item"
          :data-cy="`my-work-${work.projectId}`"
        >
          <span class="my-work__thumb">
            <img
              v-if="thumbs[work.projectId]"
              :src="thumbs[work.projectId]"
              alt=""
            />
          </span>
          <span class="my-work__text">
            <span class="my-work__title">{{ workTitle(work) }}</span>
            <span class="my-work__meta">{{ meta(work) }}</span>
          </span>
          <sd-button
            size="small"
            :disabled="busy"
            data-cy="my-work-open"
            @click="$emit('open', work)"
          >
            Open
          </sd-button>
        </li>
      </ul>
      <sd-button
        v-if="works.length < total && !unsupported"
        size="small"
        variant="text"
        :disabled="loading"
        data-cy="my-work-more"
        @click="load(true)"
      >
        Show more
      </sd-button>
    </div>
    <template #actions>
      <sd-button variant="text" data-cy="my-work-close" @click="close">
        Close
      </sd-button>
    </template>
  </sd-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { SdButton, SdDialog } from '@/presentation/ui'
import {
  ListParams,
  WorkItem,
  WorkList,
  WorkSort,
  workFile,
  workTitle,
} from './myWork'

// INFO: File > My work on the server… (myWork.ts). Lists the person's own
// starry-digitizer works (the server decides whose: the signed-in person,
// or this browser's Guest works) and emits `open`; App.vue confirms and
// restores. English, no we/us.

const props = defineProps<{
  modelValue: boolean
  list(params: ListParams): Promise<WorkList>
  thumbnail(projectId: string): Promise<Blob | null>
  /** an Open is in progress */
  busy?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: [work: WorkItem]
}>()

const SEARCH_DELAY_MS = 300

const query = ref('')
const sort = ref<WorkSort>('saved')
const works = ref<WorkItem[]>([])
const total = ref(0)
const unsupported = ref(false)
const loading = ref(false)
const error = ref('')
const thumbs = reactive<Record<string, string>>({})
let generation = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined
let thumbQueue: WorkItem[] = []
let thumbBusy = false

const countText = computed(() => {
  const n = total.value
  const all = `${n} ${n === 1 ? 'work' : 'works'}`
  return works.value.length < n
    ? `${all} (the first ${works.value.length} shown)`
    : all
})

function meta(work: WorkItem): string {
  const parts: string[] = []
  if (work.updatedAt) parts.push(`saved ${formatDate(work.updatedAt)}`)
  const { datasets, points } = work.summary
  parts.push(`${datasets} ${datasets === 1 ? 'dataset' : 'datasets'}`)
  parts.push(`${points} ${points === 1 ? 'point' : 'points'}`)
  const size = workFile(work)?.size
  if (size) parts.push(`${Math.max(1, Math.round(size / 1024))} KB`)
  return parts.join(' · ')
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function load(more = false) {
  const mine = ++generation
  loading.value = true
  error.value = ''
  try {
    const result = await props.list({
      q: query.value,
      sort: sort.value,
      offset: more ? works.value.length : 0,
    })
    if (mine !== generation) return
    works.value = more ? [...works.value, ...result.works] : result.works
    total.value = result.total
    unsupported.value = result.unsupported
    thumbQueue = more ? [...thumbQueue, ...result.works] : [...result.works]
    void loadThumbs()
  } catch (e) {
    if (mine !== generation) return
    error.value = e instanceof Error ? e.message : String(e)
    if (!more) works.value = []
  } finally {
    if (mine === generation) loading.value = false
  }
}

// INFO: one at a time: the server counts every request of this browser
// (120 a minute), and a list of 50 thumbnails at once would use half
async function loadThumbs() {
  if (thumbBusy) return
  thumbBusy = true
  try {
    while (thumbQueue.length > 0 && props.modelValue) {
      const work = thumbQueue.shift() as WorkItem
      if (thumbs[work.projectId]) continue
      const blob = await props.thumbnail(work.projectId)
      if (blob && props.modelValue)
        thumbs[work.projectId] = URL.createObjectURL(blob)
    }
  } finally {
    thumbBusy = false
  }
}

function clearThumbs() {
  thumbQueue = []
  Object.keys(thumbs).forEach((id) => {
    URL.revokeObjectURL(thumbs[id])
    delete thumbs[id]
  })
}

function close() {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) void load()
    else {
      generation++
      clearThumbs()
    }
  },
  { immediate: true },
)
watch(sort, () => void load())
watch(query, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void load(), SEARCH_DELAY_MS)
})
onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  clearThumbs()
})
</script>

<style scoped lang="scss">
.my-work {
  &__controls {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
  }
  &__search {
    flex: 1;
  }
  &__label {
    display: block;
    font-size: 0.75em;
    color: #555;
  }
  input,
  select {
    width: 100%;
    padding: 4px 6px;
    border: 1px solid #bbb;
    border-radius: 4px;
    font: inherit;
  }
  &__note {
    margin: 4px 0;
    font-size: 0.85em;
    color: #555;
  }
  &__error {
    margin: 4px 0;
    color: #c62828;
  }
  &__list {
    max-height: 55vh;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid #eee;
  }
  &__thumb {
    flex: 0 0 80px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
    img {
      max-width: 80px;
      max-height: 60px;
    }
  }
  &__text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  &__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &__meta {
    font-size: 0.8em;
    color: #666;
  }
}
</style>
