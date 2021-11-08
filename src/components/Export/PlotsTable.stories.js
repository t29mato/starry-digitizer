import PlotsTable from './PlotsTable.vue'

export default {
  title: 'Components/Export/PlotsTable',
  component: PlotsTable,
  argTypes: {
    activatePlot: {
      action: 'activatePlot',
    },
    calculatedPlots: {
      defaultValue: [
        { id: 0, xPx: 210, yPx: 200, xV: 210, yV: 200 },
        { id: 1, xPx: 220, yPx: 220, xV: 220, yV: 220 },
      ],
    },
    movingPlotId: {
      defaultValue: 1,
    },
  },
}

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PlotsTable },
  template: '<plots-table v-bind="$props" />',
})

export const Default = Template.bind({})
Default.args = {}
