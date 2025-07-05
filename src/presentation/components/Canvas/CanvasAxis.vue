<template>
  <div v-if="axis.coordIsFilled" v-show="isVisible">
    <div
      :style="{
        position: 'absolute',
        top: `${yPx - axisHalfSizePx}px`,
        left: `${xPx - axisCrossBorderHalfPx}px`,
        'pointer-events': 'none',
        width: `${axisCrossBorderPx}px`,
        height: `${axisSizePx}px`,
        background: isActive ? 'red' : 'dodgerblue',
      }"
    >
      <div
        :style="{
          content: '',
          position: 'absolute',
          top: `${axisCrossTopPx}px`,
          left: `${-axisCrossTopPx}px`,
          width: `${axisSizePx}px`,
          height: `${axisCrossBorderPx}px`,
          background: isActive ? 'red' : 'dodgerblue',
        }"
      ></div>
    </div>
    <span
      v-if="axis.name !== 'x2y2'"
      :style="{
        position: 'absolute',
        top: `${labelTop}px`,
        left: `${labelLeft}px`,
        'pointer-events': 'none',
        'user-select': 'none',
        'background-color': 'rgba(255, 255, 255, 0.9)',
        padding: '2px 6px',
        'border-radius': '3px',
        'font-size': '12px',
        'font-weight': 'bold',
        color: labelColor,
        'box-shadow': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'white-space': 'nowrap',
      }"
      >{{ axis.name }}</span
    >
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { canvasHandler } from "@/instanceStore/applicationServiceInstances";
import { AxisInterface } from "@/domain/models/axis/axisInterface";
import { axisSetRepository } from "@/instanceStore/repositoryInatances";
import { POINT_MODE, STYLE } from "@/constants";

export default defineComponent({
  props: {
    axis: {
      type: Object as () => AxisInterface,
      required: true,
    },
    isVisible: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      fontSize: 14,
      canvasHandler,
      axisSetRepository,
      axisSizePx: STYLE.AXIS_SIZE_PX,
    };
  },
  computed: {
    xPx(): number {
      if (this.axis.coord) {
        return this.axis.coord.xPx * this.canvasHandler.scale;
      }
      return -999;
    },
    yPx(): number {
      if (this.axis.coord) {
        return this.axis.coord.yPx * this.canvasHandler.scale;
      }
      return -999;
    },
    axisHalfSizePx(): number {
      return this.axisSizePx / 2;
    },
    axisCrossBorderPx(): number {
      return this.axisSizePx * 0.1;
    },
    axisCrossBorderHalfPx(): number {
      return this.axisCrossBorderPx * 0.5;
    },
    axisCrossTopPx(): number {
      return (this.axisSizePx - this.axisCrossBorderPx) / 2;
    },
    axisCrossCursorPx(): number {
      return this.axisSizePx * 0.7;
    },
    labelLeft(): number {
      if (this.axis.name.includes("x")) {
        // Keep x labels horizontally centered on their axis position
        return this.xPx - 15;
      }
      if (this.axis.name.includes("y")) {
        // Position y labels at the left edge of the canvas
        return 5;
      }
      return 0;
    },
    labelTop(): number {
      if (this.axis.name.includes("x")) {
        // Position x labels at the bottom edge of the canvas
        const canvasElement = document.querySelector("canvas");
        if (canvasElement) {
          return canvasElement.clientHeight - 25;
        }
        return this.yPx + 25;
      }
      if (this.axis.name.includes("y")) {
        // Keep y labels vertically centered on their axis position
        return this.yPx - 10;
      }
      return 0;
    },
    labelColor(): string {
      // Use different colors for different axes for better distinction
      switch (this.axis.name) {
        case "x1":
          return "#d32f2f"; // Red
        case "x2":
          return "#388e3c"; // Green
        case "y1":
          return "#1976d2"; // Blue
        case "y2":
          return "#7b1fa2"; // Purple
        default:
          return "#333";
      }
    },
    isActive(): boolean {
      if (
        this.axisSetRepository.activeAxisSet.pointMode ===
          POINT_MODE.TWO_POINTS &&
        this.axisSetRepository.activeAxisSet.activeAxisName === "x1" &&
        this.axis.name === "y1"
      ) {
        return true;
      }

      return (
        this.axisSetRepository.activeAxisSet.activeAxisName === this.axis.name
      );
    },
  },
  methods: {},
});
</script>
