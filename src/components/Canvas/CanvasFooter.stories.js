import CanvasFooter from './CanvasFooter.vue'

export default {
  title: 'Components/Canvas/Footer',
  component: CanvasFooter,
  argTypes: {
    plotIsActive: {
      defaultValue: true,
    },
    shouldShowPoints: {
      defaultValue: true,
    },
    plots: {
      defaultValue: [
        { id: 0, xPx: 210, yPx: 200 },
        { id: 1, xPx: 220, yPx: 220 },
      ],
    },
    axes: {
      defaultValue: [
        { xPx: 48, yPx: 380 },
        { xPx: 348, yPx: 380 },
        { xPx: 48, yPx: 380 },
      ],
    },
    clearAxes: {
      action: 'clearAxes',
    },
    clearPlots: {
      action: 'clearPlots',
    },
    clearActivePlots: {
      action: 'clearActivePlots',
    },
    switchShowPlots: {
      action: 'switchShowPlots',
    },
    clearMask: {
      action: 'clearMask',
    },
  },
}

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { CanvasFooter },
  template: '<canvas-footer v-bind="$props" />',
})

export const Default = Template.bind({})
Default.args = {}
