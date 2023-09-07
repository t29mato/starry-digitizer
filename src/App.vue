<template>
  <v-app>
    <v-main>
      <main-screen :initialGraphImagePath="initialImagePath" />
    </v-main>
    <v-footer :color="isProd ? 'primary' : 'orange'">
      <v-row justify="center" no-gutters>
        <v-btn
          v-for="link in links"
          :key="link.url"
          color="white"
          variant="text"
          rounded
          class="my-2"
          :href="link.url"
          target="_blank"
          size="small"
        >
          {{ link.text }}
        </v-btn>
        <v-col class="text-center text-white" cols="12">
          {{ new Date().getFullYear() }} — <strong>StarryDigitizer</strong
          ><span class="ml-2 mt-1">{{ version }}</span>
        </v-col>
      </v-row>
    </v-footer>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import MainScreen from '@/components/MainScreen.vue'

import initialImagePath from '@/assets/sample_graph_curve.png'

import { version } from '../package.json'

export default defineComponent({
  name: 'App',

  components: {
    MainScreen,
  },

  data: () => ({
    plots: [],
    version,
    links: [
      {
        text: 'Release Note',
        url: 'https://github.com/t29mato/starry-digitizer/releases',
      },
      {
        text: 'Document',
        url: 'https://starrydigitizer.readthedocs.io/',
      },
    ],
    initialImagePath,
    isProd: process.env.NODE_ENV === 'production',
  }),
  methods: {
    importPlots(plots: any) {
      this.plots = plots
    },
  },
})
</script>
