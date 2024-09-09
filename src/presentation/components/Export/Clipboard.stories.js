import Clipboard from './Clipboard.vue'

export default {
  title: 'Components/Export/Clipboard',
  component: Clipboard,
  argTypes: {
    switchActivatedPoint: {
      action: 'switchActivatedPoint',
    },
    calculatedPoints: {
      defaultValue: [
        { id: 0, xPx: 210, yPx: 200, xV: 210, yV: 200 },
        { id: 1, xPx: 220, yPx: 220, xV: 220, yV: 220 },
      ],
    },
    movingPointId: {
      defaultValue: 1,
    },
  },
}

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Clipboard },
  template: '<clipboard v-bind="$props" />',
})

export const Default = Template.bind({})
Default.args = {}
