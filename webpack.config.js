const webpack = require('webpack')
const path = require('path')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const isProd = (process.env.NODE_ENV === 'production')
console.log(`Production mode: ${isProd}`)

module.exports = {
  target: 'web',
  entry: "./src/index.ts",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, 'dist', 'cjs')
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        exclude: /node_modules/,
        loader: "ts-loader"
      },
    ],
  },
  plugins: [
    // new webpack.DefinePlugin({
    //   'process.browser': JSON.stringify(true),
    // }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      defaultSizes: 'gzip',
      openAnalyzer: false,
      reportFilename: path.resolve(__dirname, 'stats', 'webpack-bundle-report.html'),
    }),
  ],
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? undefined : 'inline-source-map',
}