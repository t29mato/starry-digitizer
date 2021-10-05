# vue-plot-digitizer

VuePlotDigitizer is a Vue.js-based tool for extracting numeric data from plot images, supporting XY data.
<img width="1180" alt="vpd-image" src="https://user-images.githubusercontent.com/30012556/136004973-33c3bf15-51ae-40f8-a598-c39209886988.png">

## Demo
https://vue-plot-digitizer.vercel.app/

## Install

- yarn install: `yarn add vue-plot-digitizer`
- npm install: `npm install vue-plot-digitizer`

Or if you want to use it directly in the browser add
``` js
<script src="https://unpkg.com/vue-plot-digitizer/dist/vue-plot-digitizer.min.js"></script>
```

## How to use
You need to import the component and then add to the components.

### JavaScript

👷‍♂️👷‍♂️👷‍♂️

### TypeScript

``` TypeScript
<template>
    <vue-plot-digitizer />
</template>

<script lang="ts">
import Vue from 'vue'
import VuePlotDigitizer from './components/PlotDigitizer.vue'

export default Vue.extend({
  components: {
    PlotDigitizer,
  },
})
</script>

```

## Build Setup

``` sh
# install dependencies
yarn install

# serve with hot relad at localhost:8080
yarn  serve

# build for production with minification
yarn  build

# lint
yarn lint
```

## Contributing
1. Fork it (https://github.com/ankitrohatgi/WebPlotDigitizer.git)
2. Create your feature branch (`git checkout -b your-new-feature`)
3. Commit your changes (`git commit -am 'feat: add some feature'`)
4. Push to the branch (`git push origin your-new-feature`)
5. Create a new Pull Request

## License
This software is distributed under MIT license
