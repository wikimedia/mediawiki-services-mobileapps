import * as path from 'path'
import * as pkg from './package.json'
import * as webpack from 'webpack'
import CleanPlugin from 'clean-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import OptimizeCSSAssetsPlugin from 'optimize-css-assets-webpack-plugin'
import TerserJSPlugin from 'terser-webpack-plugin'

const PRODUCTION = process.env.NODE_ENV === 'production'

const STATS = {
  all: false,
  errors: true,
  errorDetails: true,
  moduleTrace: true,
  warnings: true
}

const config = {
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
      { test: /\.ts$/, use: 'ts-loader' },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            compact: PRODUCTION,
            comments: !PRODUCTION
          }
        }
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

  devtool: 'source-map',

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
    new CleanPlugin('build', { verbose: false }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(PRODUCTION ? 'production' : 'development')
      },
      VERSION: JSON.stringify(pkg.version)
    }),
    new MiniCssExtractPlugin({ filename: '[name].css' })
  ]
}

export default config