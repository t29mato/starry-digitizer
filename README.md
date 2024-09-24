[![codecov](https://codecov.io/gh/t29mato/starry-digitizer/graph/badge.svg?token=96EJTIFL79)](https://codecov.io/gh/t29mato/starry-digitizer)


## Why Starry?

StarryDigitizer was originally developed as part of the web system of [Starrydata project](https://starrydata.org/),
which is aimed at building an open database of inorganic materials science experimental data,
with the motivation to streamline the process of extracting graph data
and to obtain the most suitable data format for handling in the Starrydata system.

Our goal is not only to benefit Starrydata but also to develop
a valuable tool for anyone involved in collecting graph data.

## Why We Developed Our Own Plot Digitizer Tool

Previously, Starrydata's data collection process involved extracting data points using the [WebPlotDigitizer](https://github.com/automeris-io/WebPlotDigitizer) and collecting only the XY coordinates in Starrydata. However, this method had the following issues:

- XY axis information and graph image data were lost
- Extracting data required opening a separate application, which was not optimal from a UI perspective

To address these problems, we are developing our own Digitizer tool.

## Development information

### Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

### Type Support For `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
   1. Run `Extensions: Show Built-in Extensions` from VSCode's command palette
   2. Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.

