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

      <input
        ref="fileInput"
        type="file"
        accept=".zip"
        style="display: none"
        @change="onFileSelected"
      />
    </h4>

    <v-alert v-if="loadSuccess" type="success" class="mt-2" density="compact">
      Project loaded successfully!
    </v-alert>

    <v-alert v-if="errorMessage" type="error" class="mt-2" density="compact">
      {{ errorMessage }}
    </v-alert>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { projectService } from '@/instanceStore/applicationServiceInstances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

export default defineComponent({
  data() {
    return {
      canvasHandler,
      projectService,
      datasetRepository,
      saving: false,
      loading: false,
      loadSuccess: false,
      errorMessage: '',
    }
  },
  methods: {
    async saveProject() {
      this.saving = true
      this.errorMessage = ''

      try {
        // Export project using ProjectService
        const zipBlob = await this.projectService.exportProject()

        // Download ZIP file
        this.projectService.downloadZip(zipBlob)
      } catch (error) {
        console.error('Error saving project:', error)
        this.errorMessage = `Error saving project: ${(error as Error).message}`
      } finally {
        this.saving = false
      }
    },

    triggerLoadProject() {
      const fileInput = this.$refs.fileInput as HTMLInputElement
      fileInput.click()
    },

    async onFileSelected(event: Event) {
      this.loading = true
      this.loadSuccess = false
      this.errorMessage = ''

      try {
        const target = event.target as HTMLInputElement
        const file = target.files?.[0]

        if (!file) {
          throw new Error('No file selected')
        }

        // Load project and get image data
        const imageData = await this.projectService.loadProject(file)

        // Initialize canvas with loaded image
        await this.canvasHandler.initializeImageElement(imageData)
        this.canvasHandler.drawFitSizeImage()
        this.canvasHandler.setUploadImageUrl(imageData)

        // Remove empty "dataset 1" if it was created during initialization
        const emptyDataset1 = this.datasetRepository.datasets.find(
          (d) => d.id === 1 && d.name === 'dataset 1' && d.points.length === 0,
        )
        if (emptyDataset1 && this.datasetRepository.datasets.length > 1) {
          this.datasetRepository.datasets =
            this.datasetRepository.datasets.filter((d) => d.id !== 1)
        }

        // Enable "View All Datasets" mode after loading project
        this.datasetRepository.setActiveDataset(0)

        this.loadSuccess = true
        setTimeout(() => {
          this.loadSuccess = false
        }, 3000)

        // Reset file input
        target.value = ''
      } catch (error) {
        console.error('Error loading project:', error)
        this.errorMessage = `Error loading project: ${(error as Error).message}`
      } finally {
        this.loading = false
      }
    },
  },
})
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}
</style>
