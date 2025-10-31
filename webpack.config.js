const webpack = require("@nativescript/webpack");

module.exports = (env) => {
  webpack.init(env);

  // Enable using .svelte files
  webpack.chainWebpack((config) => {
    // Resolve .svelte files and prefer 'svelte' field
    config.resolve.extensions.add(".svelte");
    config.resolve.mainFields.add("svelte");

    config.module
      .rule("svelte")
      .test(/\.svelte$/)
      .use("svelte-loader")
      .loader("svelte-loader")
      .options({
        compilerOptions: {
          dev: webpack.Utils.isDevelopment(env),
        },
        preprocess: require("svelte-native-preprocessor")({}),
      });
  });

  return webpack.resolveConfig();
};
