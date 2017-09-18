/* global process, __dirname */
const path = require('path');
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
    path: path.join(__dirname, "docs"),
    filename: "[name].js"
  },
  devServer: {
    inline: true,
    contentBase: "./docs",
    host: "0.0.0.0"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader'
      },
      {
        test: /\.mdx$/,
        use: [
          'babel-loader',
          path.join(__dirname, "lib/index.js")
        ],
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          use: 'css-loader'
        }),
        exclude: /node_modules/
      },
      { test: /\.(jpe?g|png|gif|svg)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              hash: 'sha512',
              digest: 'hex',
              name: '[hash].[ext]'
            }
          },
          {
            loader: 'image-webpack-loader',
            options: {
              bypassOnDebug: true
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({ IN_BROWSER: true }), // gotta do this to make HTMLtoJSX not break in-browser
    new webpack.optimize.UglifyJsPlugin({ sourceMap: true }),
    new ExtractTextPlugin("[name].css")
  ]
};
