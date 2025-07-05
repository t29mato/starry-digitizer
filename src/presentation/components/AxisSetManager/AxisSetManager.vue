<template>
  <div>
    <h4>
      XY Axes List
      <v-btn @click="handleOnClickAddAxisSetButton" size="x-small" class="ml-2"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn
        size="x-small"
        @click="handleOnClickRemoveAxisSetButton"
        :disabled="axisSetRepository.axisSets.length === 1"
        class="ml-2"
        ><v-icon>mdi-minus</v-icon></v-btn
      >
      <v-tooltip location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn
            size="x-small"
            @click="handleOnClickExtractAxisButton"
            :disabled="extracting"
            :loading="extracting"
            class="ml-2"
            color="primary"
            v-bind="props"
            ><v-icon>mdi-axis-arrow</v-icon></v-btn
          >
        </template>
        <span>Extract Axis Information</span>
      </v-tooltip>
    </h4>
    <v-list
      density="compact"
      class="mb-2 mt-1 pa-0"
      style="min-height: 8vh; outline: solid 1px gray; max-height: 20vh"
    >
      <v-list-item
        v-for="axisSet in axisSetRepository.axisSets"
        :key="axisSet.id"
        class="pl-2 c__axisSet-item"
        link
        @click="handleOnClickAxisSet(axisSet.id)"
        :class="{
          'bg-yellow-lighten-4':
            axisSet.id === axisSetRepository.activeAxisSet.id,
        }"
      >
        <v-row>
          <v-col cols="10">
            <v-text-field
              v-model="axisSet.name"
              :placeholder="'axisSet ' + axisSet.id"
              hide-details
              density="compact"
              class="mt-0 pt-0 pl-2"
              variant="underlined"
            ></v-text-field>
          </v-col>
        </v-row>
      </v-list-item>
    </v-list>
    <!-- TODO: モーダル上でデータセットを選べるようにする -->

    <!-- Axis Extraction Confirmation Dialog -->
    <AxisExtractionConfirmDialog
      v-model="showConfirmDialog"
      :result="extractionResult"
      :original-canvas="originalCanvas"
      @confirm="handleConfirmExtraction"
      @reject="handleRejectExtraction"
      @debugChange="handleDebugChange"
      @toleranceChange="handleToleranceChange"
      @colorThresholdChange="handleColorThresholdChange"
      @minAreaRatioChange="handleMinAreaRatioChange"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { canvasHandler } from "@/instanceStore/applicationServiceInstances";
import { interpolator } from "@/instanceStore/applicationServiceInstances";
import { axisSetRepository } from "@/instanceStore/repositoryInatances";
import { datasetRepository } from "@/instanceStore/repositoryInatances";
import { MANUAL_MODE } from "@/constants";
import { AxisExtractorManager } from "@/application/services/axisExtractor/manager/axisExtractorManager";
import { AxisExtractionConfirmDialog } from "@/presentation/components/AxisExtractionConfirmDialog";
import { AxisExtractionResult } from "@/application/services/axisExtractor/axisExtractorInterface";

export default defineComponent({
  components: {
    AxisExtractionConfirmDialog,
  },
  data() {
    return {
      canvasHandler,
      interpolator,
      axisSetRepository,
      datasetRepository,
      sortKey: "as added",
      sortKeys: ["as added", "x", "y"],
      sortOrder: "ascending",
      sortOrders: ["ascending", "descending"],
      extracting: false,
      axisExtractorManager: new AxisExtractorManager(),
      showConfirmDialog: false,
      extractionResult: null as AxisExtractionResult | null,
      originalCanvas: null as HTMLCanvasElement | null,
      debugMode: false,
    };
  },
  computed: {
    allAxisCoordsAreFilled() {
      return (
        this.axisSetRepository.activeAxisSet.hasXAxis &&
        this.axisSetRepository.activeAxisSet.hasYAxis
      );
    },
  },
  methods: {
    activateAxisSet(id: number) {
      this.axisSetRepository.setActiveAxisSet(id);
      this.datasetRepository.activeDataset.setAxisSetId(id);

      //NOTE: If axis coords are not calibrated, change manualMode for calibration. Otherwise automatically set to ADD mode
      if (this.axisSetRepository.activeAxisSet.nextAxis) {
        this.canvasHandler.manualMode = MANUAL_MODE.UNSET;
      } else {
        this.canvasHandler.manualMode = MANUAL_MODE.ADD;
      }
    },
    handleOnClickAxisSet(id: number) {
      if (id === this.axisSetRepository.activeAxisSetId) return;

      this.activateAxisSet(id);
    },
    handleOnClickAddAxisSetButton() {
      this.axisSetRepository.createNewAxisSet();
      this.activateAxisSet(this.axisSetRepository.lastAxisSetId);
    },
    removeActiveAxisSet() {
      this.axisSetRepository.removeAxisSet(
        this.axisSetRepository.activeAxisSetId,
      );
    },
    handleOnClickRemoveAxisSetButton() {
      //TODO: Move these logics to domain service and add test...
      const targetAxisSet = this.axisSetRepository.activeAxisSet;

      const datasetsConnectedToTargetAxisSet =
        this.datasetRepository.datasets.filter(
          (dataset) => dataset.axisSetId === targetAxisSet.id,
        );

      const targetAxisSetIndex =
        this.axisSetRepository.axisSets.indexOf(targetAxisSet);
      const previousAxisSet =
        this.axisSetRepository.axisSets[targetAxisSetIndex - 1];

      const alternativeAxisSet =
        targetAxisSetIndex === 0
          ? this.axisSetRepository.axisSets[1]
          : previousAxisSet || this.axisSetRepository.axisSets[0];

      // Early return if the user cancels the confirmation dialog
      if (targetAxisSet.atLeastOneCoordOrValueIsChanged) {
        const confirmMessage = `Are you sure to remove '${
          this.axisSetRepository.activeAxisSet.name
        }'? After the removal, '${
          alternativeAxisSet.name
        }' will be applied to the following datasets: ${datasetsConnectedToTargetAxisSet
          .map((dataset) => dataset.name)
          .toString()}`;

        if (!window.confirm(confirmMessage)) {
          return;
        }
      }

      this.removeActiveAxisSet();

      datasetsConnectedToTargetAxisSet.forEach((dataset) => {
        dataset.setAxisSetId(alternativeAxisSet.id);
      });

      this.axisSetRepository.setActiveAxisSet(alternativeAxisSet.id);

      if (alternativeAxisSet.nextAxis) {
        this.canvasHandler.manualMode = MANUAL_MODE.UNSET;
      } else {
        this.canvasHandler.manualMode = MANUAL_MODE.ADD;
      }
    },
    async handleOnClickExtractAxisButton() {
      try {
        this.extracting = true;

        // Get the canvas element from the canvas handler
        const canvas = document.querySelector("canvas") as HTMLCanvasElement;
        if (!canvas) {
          throw new Error("Canvas not found");
        }

        // Debug: Log canvas dimensions and scale
        console.log("Canvas actual size:", canvas.width, "x", canvas.height);
        console.log(
          "Original image size:",
          this.canvasHandler.originalWidth,
          "x",
          this.canvasHandler.originalHeight,
        );
        console.log("Canvas scale:", this.canvasHandler.scale);

        // Calculate the actual scale ratio between canvas and original image
        const canvasToOriginalScale =
          this.canvasHandler.originalWidth / canvas.width;
        console.log("Canvas to original scale ratio:", canvasToOriginalScale);

        // Set debug mode if needed
        this.axisExtractorManager.setDebugMode(this.debugMode);

        // Extract axis information from the canvas
        const result =
          await this.axisExtractorManager.extractAxisInformationFromCanvas(
            canvas,
          );

        // Always show the dialog, even if no axes were detected
        // If no result, create a default result with zeros
        this.extractionResult = result || {
          x1: 0,
          x2: 1,
          y1: 0,
          y2: 1,
          horizontalRegion: undefined,
          verticalRegion: undefined,
          plotArea: undefined,
        };
        this.originalCanvas = canvas;
        this.showConfirmDialog = true;
      } catch (error) {
        console.error("Failed to extract axis information:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("OpenCV")) {
          alert(
            "Failed to load computer vision libraries. Please check your internet connection and try again.",
          );
        } else {
          alert(
            "Failed to extract axis information. Please try again or set the axes manually.",
          );
        }
      } finally {
        this.extracting = false;
      }
    },
    handleConfirmExtraction(result: AxisExtractionResult) {
      // Update the active axis set with extracted values
      const activeAxisSet = this.axisSetRepository.activeAxisSet;
      activeAxisSet.setX1Value(result.x1);
      activeAxisSet.setX2Value(result.x2);
      activeAxisSet.setY1Value(result.y1);
      activeAxisSet.setY2Value(result.y2);

      // Clean up
      this.extractionResult = null;
      this.originalCanvas = null;
    },
    handleRejectExtraction() {
      // Clean up without applying changes
      this.extractionResult = null;
      this.originalCanvas = null;
    },
    async handleDebugChange(debug: boolean) {
      this.debugMode = debug;
      // Update axis extractor debug mode
      this.axisExtractorManager.setDebugMode(debug);

      // Re-extract with debug mode if we have the original canvas
      if (this.originalCanvas && debug) {
        try {
          console.log("Re-extracting with debug mode enabled...");
          const result =
            await this.axisExtractorManager.extractAxisInformationFromCanvas(
              this.originalCanvas,
            );
          if (result) {
            this.extractionResult = result;
          }
        } catch (error) {
          console.error("Failed to re-extract with debug mode:", error);
        }
      }
    },
    async handleToleranceChange(tolerance: number) {
      // Update tolerance and re-extract
      this.axisExtractorManager.setLineTolerance(tolerance);

      if (this.originalCanvas && this.debugMode) {
        try {
          console.log("Re-extracting with new tolerance:", tolerance);
          const result =
            await this.axisExtractorManager.extractAxisInformationFromCanvas(
              this.originalCanvas,
            );
          if (result) {
            this.extractionResult = result;
          }
        } catch (error) {
          console.error("Failed to re-extract with new tolerance:", error);
        }
      }
    },
    async handleColorThresholdChange(threshold: number) {
      // Update color threshold and re-extract
      this.axisExtractorManager.setColorThreshold(threshold);

      if (this.originalCanvas && this.debugMode) {
        try {
          console.log("Re-extracting with new color threshold:", threshold);
          const result =
            await this.axisExtractorManager.extractAxisInformationFromCanvas(
              this.originalCanvas,
            );
          if (result) {
            this.extractionResult = result;
          }
        } catch (error) {
          console.error(
            "Failed to re-extract with new color threshold:",
            error,
          );
        }
      }
    },
    async handleMinAreaRatioChange(ratio: number) {
      // Update min area ratio and re-extract
      this.axisExtractorManager.setMinAreaRatio(ratio);

      if (this.originalCanvas && this.debugMode) {
        try {
          console.log("Re-extracting with new min area ratio:", ratio);
          const result =
            await this.axisExtractorManager.extractAxisInformationFromCanvas(
              this.originalCanvas,
            );
          if (result) {
            this.extractionResult = result;
          }
        } catch (error) {
          console.error("Failed to re-extract with new min area ratio:", error);
        }
      }
    },
  },
});
</script>
