module.exports = config => {
  const commonConfig = require('./karma.common.conf')
  config.set({
    ...commonConfig,

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '../..',

    webpack: require('./webpack.config.js'),

    // list of files / patterns to load in the browser
    files: [
      './test/runner/utils.js',
      './test/tests.js',
      {
        pattern: 'test/runner/all.spec.js',
        included: true,
        served: true,
        watched: true,
        type: 'module'
      },

      ...commonConfig.files
    ],

    // list of files to exclude
    exclude: [],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'test/runner/all.spec.js': 'webpack'
    }
  })
}
