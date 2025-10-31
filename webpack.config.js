const webpack = require('@nativescript/webpack');
const { resolve } = require('path');

module.exports = (env) => {
  webpack.init(env);

  webpack.chainWebpack((config) => {
    // Add Svelte support
    config.module
      .rule('svelte')
      .test(/\.svelte$/)
      .use('svelte-loader')
      .loader('svelte-loader-hot')
      .options({
        preprocess: require('svelte-native-preprocessor')(),
        hotReload: true,
        hotOptions: {
          native: true,
        },
        compilerOptions: {
          namespace: 'foreign',
        },
      });

    config.resolve.alias.set('svelte', resolve('node_modules', 'svelte'));
    config.resolve.extensions.prepend('.svelte');
  });

  return webpack.resolveConfig();
};
