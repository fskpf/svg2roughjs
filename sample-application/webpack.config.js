module.exports = {
  mode: 'development',
  entry: './src/index.js',
  devServer: {
    contentBase: './dist'
  },
  module: {
    rules: [
      {
        test: /\.svg$/i,
        use: 'raw-loader'
      }
    ]
  }
}
