const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path')

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  devServer: {
    contentBase: './dist'
  },
  output: {
    filename: '[name].[contenthash].js'
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
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './src/index.html'
    }),
    new CopyWebpackPlugin({ patterns: [{ from: 'static', to: 'static' }] })
  ],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        include: [
          path.resolve(__dirname, 'src'),
          // These dependencies have es6 syntax which ie11 doesn't like.
          path.resolve(__dirname, 'node_modules/svg2roughjs'),
          path.resolve(__dirname, 'node_modules/roughjs')
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
