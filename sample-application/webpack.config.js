/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: '[name].[contenthash].js',
    clean: true
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        svg2roughjs: {
          test: /[\\/]node_modules[\\/]svg2roughjs[\\/]/,
          name: 'svg2roughjs',
          chunks: 'all',
          priority: 10
        },
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },
  snapshot: {
    // automatically serve changed content in node_modules instead of older snapshots
    managedPaths: []
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    }),
    new CopyWebpackPlugin({ patterns: [{ from: 'static', to: 'static' }] })
  ],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: [
          // \\ for Windows, \/ for Mac OS and Linux
          /node_modules[\\/]core-js/,
          /node_modules[\\/]webpack[\\/]buildin/
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.svg$/i,
        use: 'raw-loader'
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
}
