import MagnifierMain from './MagnifierMain.vue'

// More on default export: https://storybook.js.org/docs/vue/writing-stories/introduction#default-export
export default {
  title: 'Components/MagnifierMain',
  component: MagnifierMain,
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
    points: {},
    shouldShowPoints: {},
    pointSizePx: {
      defaultValue: 5,
    },
    axisSetSizePx: {
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
  components: { MagnifierMain },
  template: '<magnifier v-bind="$props" />',
})

export const Points = Template.bind({})
Points.args = {
  canvasCursor: {
    xPx: 210,
    yPx: 210,
  },
  shouldShowPoints: true,
  points: [
    { id: 0, xPx: 210, yPx: 200 },
    { id: 1, xPx: 220, yPx: 220 },
  ],
}

export const PointsActive = Template.bind({})
PointsActive.args = {
  canvasCursor: {
    xPx: 210,
    yPx: 210,
  },
  shouldShowPoints: true,
  points: [
    { id: 0, xPx: 210, yPx: 200 },
    { id: 1, xPx: 220, yPx: 220 },
  ],
  movingPointId: 1,
}

export const AxisSet = Template.bind({})
AxisSet.args = {
  canvasCursor: {
    xPx: 48,
    yPx: 380,
  },
  axisSet: [
    { xPx: 48, yPx: 380 },
    { xPx: 348, yPx: 380 },
    { xPx: 48, yPx: 380 },
  ],
  shouldShowPoints: false,
}

export const AxisSetActive = Template.bind({})
AxisSetActive.args = {
  canvasCursor: {
    xPx: 48,
    yPx: 380,
  },
  axisSet: [
    { xPx: 48, yPx: 380 },
    { xPx: 348, yPx: 380 },
    { xPx: 48, yPx: 380 },
  ],
  shouldShowPoints: false,
  isMovingAxis: true,
  movingAxisIndex: 2,
}
