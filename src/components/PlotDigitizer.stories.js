import PlotDigitizer from './PlotDigitizer.vue'

// More on default export: https://storybook.js.org/docs/vue/writing-stories/introduction#default-export
export default {
  title: 'Components/PlotDigitizer',
  component: PlotDigitizer,
  // More on argTypes: https://storybook.js.org/docs/vue/api/argtypes
  argTypes: {
    magnifierSizePx: {
      defaultValue: 200,
    },
    uploadImageUrl: {
      defaultValue: '/img/sample_graph.png',
    },
    magnifierScale: {
      defaultValue: 5,
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
  },
}

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PlotDigitizer },
  template: '<plot-digitizer />',
})

export const Default = Template.bind({})
