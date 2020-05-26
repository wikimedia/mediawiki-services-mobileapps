const path = require('path')
const pkg = require('./package.json')
const webpack = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const TerserJSPlugin = require('terser-webpack-plugin')

const PRODUCTION = process.env.NODE_ENV === 'production'

const STATS = {
  all: false,
  errors: true,
  errorDetails: true,
  moduleTrace: true,
  warnings: true
}

module.exports = {
  entry: {
    'wikimedia-page-library-pcs': './src/pcs',
    'wikimedia-page-library-transform': './src/transform',
    'wikimedia-page-library-override': './src/override'
  },

  resolve: { extensions: ['.js', '.ts'] },

  output: {
    path: path.resolve('build'),
    filename: '[name].js',
    library: 'pcs',
    libraryTarget: 'umd',
    libraryExport: 'default',

    // https://github.com/webpack/webpack/issues/6525
    globalObject: 'this'
  },

  performance: {
    hints: PRODUCTION ? 'error' : false,
    maxAssetSize: 128 * 1024,
    maxEntrypointSize: 192 * 1024
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx|tsx|ts)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', { targets: { android: 5, ios: 11 } }]],
            cacheDirectory: true,
            compact: PRODUCTION,
            comments: !PRODUCTION
          }
        }
      },
      {
        test: /\.less$/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { minimize: false } },
          { loader: 'less-loader' }
        ]
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { minimize: false } }
        ]
      }
    ]
  },

  stats: STATS,

  devtool: PRODUCTION ? undefined : 'source-map',

  devServer: PRODUCTION ? undefined : {
    clientLogLevel: 'warning',
    progress: false,
    overlay: { warnings: true, errors: true },
    stats: STATS
  },
  optimization: {
    minimizer: [new TerserJSPlugin({}), new OptimizeCSSAssetsPlugin({})],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(PRODUCTION ? 'production' : 'development')
      },
      VERSION: JSON.stringify(pkg.version)
    }),
    new MiniCssExtractPlugin({ filename: '[name].css' })
  ]
}
