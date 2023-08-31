import Main from './Main.vue'

// More on default export: https://storybook.js.org/docs/vue/writing-stories/introduction#default-export
export default {
  title: 'Components/Main',
  component: Main,
  // More on argTypes: https://storybook.js.org/docs/vue/api/argtypes
  argTypes: {
    hideCSVText: {
      defaultValue: false,
    },
  },
}

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Main },
  template: '<plot-digitizer />',
})

export const Default = Template.bind({})
