const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path')

module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  output: {
    filename: '[name].[contenthash].js',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '...']
  },
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'public')
      },
      {
        directory: path.join(__dirname, '../src')
      },
      {
        directory: path.join(__dirname, '../test'),
        watch: false
      },
      {
        // watch the test.js but not the actual specs...
        directory: path.join(__dirname, '../test/tests.js')
      }
    ],
    client: {
      overlay: {
        errors: true,
        warnings: false
      }
    }
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
    new HtmlWebpackPlugin({
      template: './src/index.html'
    }),
    new CopyWebpackPlugin({ patterns: [{ from: 'static', to: 'static' }] })
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx|tsx|ts)$/,
        exclude: [
          // \\ for Windows, \/ for Mac OS and Linux
          /node_modules[\\/]core-js/,
          /node_modules[\\/]webpack[\\/]buildin/
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-typescript']
          }
        }
      },
      {
        resourceQuery: /raw/,
        type: 'asset/source'
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        resourceQuery: { not: [/raw/] },
        type: 'asset/resource'
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
}
