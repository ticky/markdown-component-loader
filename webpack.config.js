/* global process */
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const isDevServer = process.argv.find((arg) => arg.includes('webpack-dev-server'));

const devtool = isDevServer ? "cheap-module-eval-source-map" : "source-map";

module.exports = {
  devtool,
  entry: [
    'babel-polyfill',
    './app/index.js'
  ],
  output: {
    path: "docs",
    filename: "bundle.js"
  },
  devServer: {
    inline: true,
    contentBase: "./docs",
    host: "0.0.0.0"
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: 'babel-loader' },
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.css$/, loader: ExtractTextPlugin.extract('css-loader'), exclude: /node_modules/ }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({ IN_BROWSER: true }), // gotta do this to make HTMLtoJSX not break in-browser
    new webpack.optimize.UglifyJsPlugin(),
    new ExtractTextPlugin("bundle.css", { allChunks: true })
  ]
};
