import Magnifier from './Magnifier.vue'

// More on default export: https://storybook.js.org/docs/vue/writing-stories/introduction#default-export
export default {
  title: 'Components/Magnifier',
  component: Magnifier,
  // More on argTypes: https://storybook.js.org/docs/vue/api/argtypes
  argTypes: {
    magnifierSizePx: {
      defaultValue: 200,
    },
    uploadImageUrl: {
      defaultValue: '/img/sample_graph.png',
    },
    canvasScale: {
      defaultValue: 1,
    },
    plots: {},
    shouldShowPoints: {},
    plotSizePx: {
      defaultValue: 5,
    },
    axesSizePx: {
      defaultValue: 8,
    },
    xyValue: {
      defaultValue: {
        xV: 100,
        yV: 100,
      },
    },
  },
}

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Magnifier },
  template: '<magnifier v-bind="$props" />',
})

export const Plots = Template.bind({})
Plots.args = {
  canvasCursor: {
    xPx: 210,
    yPx: 210,
  },
  shouldShowPoints: true,
  plots: [
    { id: 0, xPx: 210, yPx: 200 },
    { id: 1, xPx: 220, yPx: 220 },
  ],
}

export const PlotsActive = Template.bind({})
PlotsActive.args = {
  canvasCursor: {
    xPx: 210,
    yPx: 210,
  },
  shouldShowPoints: true,
  plots: [
    { id: 0, xPx: 210, yPx: 200 },
    { id: 1, xPx: 220, yPx: 220 },
  ],
  movingPlotId: 1,
}

export const Axes = Template.bind({})
Axes.args = {
  canvasCursor: {
    xPx: 48,
    yPx: 380,
  },
  axes: [
    { xPx: 48, yPx: 380 },
    { xPx: 348, yPx: 380 },
    { xPx: 48, yPx: 380 },
  ],
  shouldShowPoints: false,
}

export const AxesActive = Template.bind({})
AxesActive.args = {
  canvasCursor: {
    xPx: 48,
    yPx: 380,
  },
  axes: [
    { xPx: 48, yPx: 380 },
    { xPx: 348, yPx: 380 },
    { xPx: 48, yPx: 380 },
  ],
  shouldShowPoints: false,
  isMovingAxis: true,
  movingAxisIndex: 2,
}
