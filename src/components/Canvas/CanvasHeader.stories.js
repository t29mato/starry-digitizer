import CanvasHeader from './CanvasHeader.vue'

export default {
  title: 'Components/Canvas/Header',
  component: CanvasHeader,
  argTypes: {
    uploadImage: {
      action: 'uploadImage',
    },
    resizeCanvasToMax: {
      action: 'resizeCanvasToMax',
    },
    resizeCanvasToFit: {
      action: 'resizeCanvasToFit',
    },
  },
}

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { CanvasHeader },
  template: '<canvas-header v-bind="$props" />',
})

export const Default = Template.bind({})
Default.args = {}
