const devPresets = ['@vue/babel-preset-app']
const buildPresets = [
  [
    '@babel/preset-env',
    // Config for @babel/preset-env
    {
      targets: {
        node: true,
      },
      // Example: Always transpile optional chaining/nullish coalescing
      include: [
        /(class-properties|private-methods|private-property-in-object)/,
      ],
    },
  ],
  '@babel/preset-typescript',
]
module.exports = {
  presets: process.env.NODE_ENV === 'development' ? devPresets : buildPresets,
}
