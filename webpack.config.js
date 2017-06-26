/* global process */
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const isDevServer = process.argv.find((arg) => arg.includes('webpack-dev-server'));

const devtool = isDevServer ? "cheap-module-eval-source-map" : "source-map";

module.exports = {
  devtool,
  entry: {
    app: [
      'babel-polyfill',
      './app/index.js'
    ],
    repl: [
      'babel-polyfill',
      './app/repl.js'
    ]
  },
  output: {
    path: "docs",
    filename: "[name].js"
  },
  devServer: {
    inline: true,
    contentBase: "./docs",
    host: "0.0.0.0"
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: 'babel-loader' },
      { test: /\.mdx$/, loaders: ['babel-loader', '..'], exclude: /node_modules/ },
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.css$/, loader: ExtractTextPlugin.extract('css-loader'), exclude: /node_modules/ },
      { test: /\.(jpe?g|png|gif|svg)$/i,
        loaders: [
          'file?hash=sha512&digest=hex&name=[hash].[ext]',
          'image-webpack?bypassOnDebug'
        ]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({ IN_BROWSER: true }), // gotta do this to make HTMLtoJSX not break in-browser
    new webpack.optimize.UglifyJsPlugin(),
    new ExtractTextPlugin("[name].css")
  ]
};
