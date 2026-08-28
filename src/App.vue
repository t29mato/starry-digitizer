<template>
  <v-app>
    <div v-if="deviceIsSmartphone" class="c__unsupported-device-screen">
      This application is not supported on smartphones. <br />Please access here
      on a PC.
    </div>
    <template v-else>
      <v-app-bar
        :elevation="0"
        density="compact"
        class="c__app-bar"
        height="48"
      >
        <span class="c__app-bar__logo">✦ StarryDigitizer</span>
        <project-manager class="c__app-bar__project-manager"></project-manager>
        <v-spacer></v-spacer>
        <span v-if="appVerAndBuildInfo" class="c__app-bar__version">{{
          appVerAndBuildInfo
        }}</span>
      </v-app-bar>
      <v-main>
        <starry-digitizer :initialGraphImagePath="'/sample_graph_curve.png'" />
      </v-main>
      <v-footer class="c__footer" :class="{ 'c__footer--dev': !isProd }">
        <v-row align="center" no-gutters>
          <v-col cols="auto" class="text-caption">
            {{ new Date().getFullYear() }} — StarryDigitizer{{
              isProd ? ` v${version}` : ' (preview)'
            }}
          </v-col>
          <v-spacer></v-spacer>
          <v-col cols="auto">
            <a
              v-for="link in links"
              :key="link.url"
              :href="link.url"
              target="_blank"
              class="c__footer__link"
              >{{ link.text }}</a
            >
          </v-col>
        </v-row>
      </v-footer>
    </template>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import StarryDigitizer from '@/presentation/components/StarryDigitizer.vue'
import { ProjectManager } from '@/presentation/components/Settings'

import { version } from '../package.json'

export default defineComponent({
  name: 'App',

  components: {
    StarryDigitizer,
    ProjectManager,
  },

  data: () => ({
    points: [],
    version,
    githubRunNumber: import.meta.env.VITE_APP_GITHUB_RUN_NUMBER,
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
    isProd: import.meta.env.MODE === 'production',
  }),
  computed: {
    deviceIsSmartphone() {
      const ua = navigator.userAgent.toLowerCase()

      return /(iphone|android).*mobile/.test(ua)
    },
    // INFO: moved here from StarryDigitizer.vue's old right-sidebar caption
    // (docs/design/ui-refresh-implementation-notes.md) — same computation,
    // just relocated into the new app bar.
    appVerAndBuildInfo(): string {
      const appVer: string = this.isProd ? `v${this.version}` : ''
      const buildNumber: string = this.githubRunNumber
        ? `#${this.githubRunNumber}`
        : ''

      return appVer + buildNumber
    },
  },
  methods: {
    importPoints(points: any) {
      this.points = points
    },
  },
})
</script>
<style lang="scss" scoped>
.c {
  &__unsupported-device-screen {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: #eeeeee;
    display: flex;
    align-items: center;
    padding: 20px;
    color: gray;
    z-index: 1000;
    width: 100vw;
    max-height: 100vh;
    font-weight: bold;
    overflow: hidden;
  }

  &__app-bar {
    border-bottom: 1px solid #e0e0e0;

    &__logo {
      font-size: 14px;
      font-weight: 600;
      margin-left: 12px;
      margin-right: 16px;
      white-space: nowrap;
    }

    &__project-manager {
      display: flex;
      align-items: center;

      // INFO: ProjectManager.vue's own template wraps its content in an
      // <h4>Project ...</h4> (untouched — no logic component was edited).
      // Neutralize just the heading's block/typography styling so it sits
      // inline in the app bar.
      :deep(h4) {
        display: flex;
        align-items: center;
        font-size: 13px;
        font-weight: 500;
        margin: 0;
      }
    }

    &__version {
      font-size: 11px;
      color: #9e9e9e;
      margin-right: 12px;
    }
  }

  &__footer {
    padding: 4px 12px;
    min-height: 0 !important;
    background: #fafafa;
    color: #616161;
    border-top: 1px solid #e0e0e0;

    &--dev {
      border-top: 2px solid #fb8c00;
    }

    &__link {
      font-size: 12px;
      color: #616161;
      margin-left: 16px;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>

<!--
  INFO: docs/design/ui-refresh-implementation-notes.md — global (non-scoped
  on purpose, so it reaches into every child component) visual-system pass:
  sentence-case buttons instead of Vuetify's default ALL CAPS, an 8px-ish
  spacing rhythm, and a slightly softer app background. No component logic
  touched — this only overrides Vuetify's own default styling.
-->
<style lang="scss">
.v-application {
  background: #fafafa !important;
}

.v-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
}

h4,
h5 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}
</style>
