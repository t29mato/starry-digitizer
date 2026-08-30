<template>
  <div>
    <h4 class="mb-2">
      Project
      <v-tooltip text="Save project" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            @click="saveProject"
            size="x-small"
            class="ml-2"
            :loading="saving"
            ><v-icon>mdi-content-save</v-icon></v-btn
          >
        </template>
      </v-tooltip>

      <v-tooltip text="Load project" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            @click="triggerLoadProject"
            size="x-small"
            class="ml-2"
            :loading="loading"
            ><v-icon>mdi-folder-open</v-icon></v-btn
          >
        </template>
      </v-tooltip>

    </h4>

    <v-alert v-if="errorMessage" type="error" class="mt-2" density="compact">
      {{ errorMessage }}
    </v-alert>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  saveProjectAndDownload,
  triggerLoadProjectDialog,
} from '@/application/utils/projectFileOperations'

export default defineComponent({
  data() {
    return {
      saving: false,
      loading: false,
      errorMessage: '',
    }
  },
  methods: {
    async saveProject() {
      this.saving = true
      this.errorMessage = ''

      const result = await saveProjectAndDownload()
      if (!result.success) {
        this.errorMessage = result.errorMessage ?? 'Error saving project'
      }

      this.saving = false
    },

    async triggerLoadProject() {
      this.loading = true
      this.errorMessage = ''

      const result = await triggerLoadProjectDialog()
      if (!result.success && result.errorMessage) {
        this.errorMessage = result.errorMessage
      }

      this.loading = false
    },
  },
})
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}
</style>
