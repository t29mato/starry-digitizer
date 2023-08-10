module.exports = {
  transpileDependencies: ['vuetify'],
  publicPath: './',

  //Vue3 移行ビルド(vue-compat)の設定
  chainWebpack: (config) => {
    config.resolve.alias.set('vue', '@vue/compat')

    config.module
      .rule('vue')
      .use('vue-loader')
      .tap((options) => {
        return {
          ...options,
          compilerOptions: {
            compatConfig: {
              MODE: 2,
            },
          },
        }
      })
  },
}
