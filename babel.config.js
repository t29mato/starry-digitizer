const devPresets = ['@vue/babel-preset-app']
const buildPresets = [
  [
    '@babel/preset-env',
    // Config for @babel/preset-env
    {
      targets: {
        node: true,
      },
    },
  ],
  '@babel/preset-typescript',
]

const buildPlugins = [
  '@babel/plugin-proposal-class-properties',
  '@babel/plugin-proposal-private-methods',
  '@babel/plugin-transform-private-property-in-object',
]

module.exports = {
  presets: process.env.NODE_ENV === 'development' ? devPresets : buildPresets,
  plugins: process.env.NODE_ENV === 'development' ? [] : buildPlugins,
}
