import CanvasFooter from './CanvasFooter.vue'

export default {
  title: 'components/Canvas/Footer',
  component: CanvasFooter,
  argTypes: {
    pointIsActive: {
      defaultValue: true,
    },
    shouldShowPoints: {
      defaultValue: true,
    },
    points: {
      defaultValue: [
        { id: 0, xPx: 210, yPx: 200 },
        { id: 1, xPx: 220, yPx: 220 },
      ],
    },
    axisSet: {
      defaultValue: [
        { xPx: 48, yPx: 380 },
        { xPx: 348, yPx: 380 },
        { xPx: 48, yPx: 380 },
      ],
    },
    clearAxisCoords: {
      action: 'clearAxisCoords',
    },
    clearPoints: {
      action: 'clearPoints',
    },
    clearActivePoints: {
      action: 'clearActivePoints',
    },
    switchShowPoints: {
      action: 'switchShowPoints',
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
