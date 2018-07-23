/* eslint-disable import/no-commonjs */
const path = require('path');
const PluginLodash = require('lodash-webpack-plugin');
const webpackConfig = {
  entry: path.resolve(__dirname, 'src/index.js'),
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'index.js',
  },
  mode: 'production',
  performance: { hints: false },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: { loader: 'babel-loader' },
      },
    ],
  },
  plugins: [new PluginLodash()],
};

module.exports = webpackConfig;
