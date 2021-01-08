/* global process, __dirname */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const isDevServer = process.argv.find((arg) => arg.includes('webpack serve'));

const devtool = isDevServer ? "inline-source-map" : "source-map";

module.exports = {
  devtool,
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
          'file-loader',
          {
            loader: 'image-webpack-loader',
            options: {
              disable: true
            }
          }
        ]
      }
    ]
  },
  optimization: {
    minimize: !isDevServer,
    minimizer: [
      new TerserPlugin(),
      new CssMinimizerPlugin()
    ],
    splitChunks: {
      cacheGroups: {
        shared: {
          test: /[\\/]node_modules[\\/]/,
          // cacheGroupKey here is `commons` as the key of the cacheGroup
          name(module, chunks, cacheGroupKey) {
            const moduleFileName = module.identifier().split('/').reduceRight(item => item);
            const allChunksNames = chunks.map((item) => item.name).join('~');
            return `${cacheGroupKey}-${allChunksNames}-${moduleFileName}`;
          },
          chunks: 'all'
        }
      }
    }
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'templates/index.html',
      chunks: ['site']
    }),
    new HtmlWebpackPlugin({
      filename: 'repl.html',
      template: 'templates/repl.html',
      chunks: ['repl']
    })
  ]
};
