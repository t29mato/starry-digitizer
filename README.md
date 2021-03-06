StarryDigitizer is a Vue.js-based tool for extracting numeric data from plot images, supporting XY data.

## App
https://starrydigitizer.vercel.app/

## Install

- yarn install: `yarn add starry-digitizer`
- npm install: `npm install starry-digitizer`

Or if you want to use it directly in the browser add
``` js
<script src="https://unpkg.com/starry-digitizer/dist/starry-digitizer.min.js"></script>
```

## How to use
You need to import the component and then add to the components.

### Vue.js (ver3)
It works in progress. 👷‍♂️👷‍♂️👷‍♂️

### Vue.js (ver2)

#### 1. Install Vuetify.
https://vuetifyjs.com/ja/getting-started/installation/

#### 2. Install starry-digitizer
```
$ yarn add starry-digitizer
or
$ npm install starry-digitizer
```

#### 3. Set up the component.

``` vue
<template>
  <v-app>
    <starry-digitizer />
  </v-app>
</template>

<script>
import StarryDigitizer from 'starry-digitizer'

export default {
  name: 'App',
  components: {
    StarryDigitizer
  }
}
</script>
```
<v-app> component make the

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
1. Fork it (`git clone https://github.com/t29mato/starry-digitizer.git`)
2. Create your feature branch (`git checkout -b your-new-feature`)
3. Commit your changes (`git commit -am 'feat: add some feature'`)
4. Push to the branch (`git push origin your-new-feature`)
5. Create a new Pull Request

## License
This software is distributed under [MIT license](https://raw.githubusercontent.com/t29mato/starry-digitizer/main/LICENSE.txt)
