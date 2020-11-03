/* global __dirname */
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// const isDevServer = process.argv.find((arg) => arg.includes('webpack serve'));

// const devtool = isDevServer ? "cheap-module-eval-source-map" : "source-map";

module.exports = {
  // devtool,
  entry: {
    site: './app/index.js',
    repl: './app/repl.js'
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
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.mdx$/,
        use: [
          'babel-loader',
          {
            loader: path.join(__dirname, "lib/index.js"),
            options: {
              markdownItPlugins: [
                [
                  require('markdown-it-anchor'),
                  {
                    permalink: true,
                    permalinkBefore: true,
                    permalinkSymbol: '🔗'
                  }
                ]
              ]
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          }
        ]
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
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: 'all'
    }
  },
  plugins: [
    new MiniCssExtractPlugin()
  ]
};
