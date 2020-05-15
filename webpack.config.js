'use strict';

const fs = require('fs');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

/*******************************************************************************
 * FILE ENTRIES
 ******************************************************************************/
const srcDir = 'src';
const outDir = 'dist';

// Delete or add more entries here!
const build = {
  entries: [
    {
      path: 'background/index.ts',
      output: 'background',
      isReact: false,
    },
    {
      path: 'content_scripts/index.ts',
      output: 'content',
      isReact: false,
    },
    {
      path: 'devtools/index.tsx',
      output: 'devtools',
      isReact: true,
    },
    {
      path: 'options/index.tsx',
      output: 'options',
      isReact: true,
    },
    {
      path: 'popup/index.tsx',
      output: 'popup',
      isReact: true,
    },
  ],
  // override default options
  dev_options: {
    outDir: 'dist',
    extractCss: false,
    extractFont: false,
    htmlMinify: false,
    sourceMap: true,
  },
  prod_options: {
    outDir: 'dist',
    extractCss: true,
    extractFont: true,
    htmlMinify: true,
    sourceMap: false,
  },
};

// WEBPACK CONFIG LOGIC
module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  // default options
  let options = {
    srcDir: srcDir || 'src',
    outDir: outDir || 'dist',
    extractCss: true,
    extractFont: true,
    htmlMinify: true,
    sourceMap: false,
  };
  let build_options = isDev ? 'dev_options' : 'prod_options';

  // set options from build
  for (const key in options)
    if (build[build_options].hasOwnProperty(key))
      options[key] = build[build_options][key];

  // Webpack config
  let config = {
    entry: {},
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, options.outDir),
    },
    devtool: options.sourceMap ? 'source-map' : false,
    stats: {
      assets: true,
      children: false,
      entrypoints: true,
      modules: false,
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    module: {
      rules: [
        // Typescript
        {
          test: /\.(j|t)s(x)?$/,
          exclude: /node_modules/,
          use: 'ts-loader',
        },
        // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
        {
          enforce: 'pre',
          test: /\.js$/,
          loader: 'source-map-loader',
        },
        // Html
        {
          test: /\.html$/,
          use: [
            {
              loader: 'html-loader',
            },
          ],
        },
        // CSS
        {
          test: /\.css$/,
          use: [
            // configure extract css or use inline compile
            options.extractCss ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                plugins: [require('postcss-preset-env')()],
              },
            },
          ],
        },
        // Fonts
        {
          test: /\.(woff(2)?|eot|ttf|otf)$/,
          use: [
            {
              loader: options.extractFont ? 'file-loader' : 'url-loader',
              options: {
                name: '[name].[ext]',
                publicPath: '../fonts',
                outputPath: 'assets/fonts',
              },
            },
          ],
        },
        // Images
        {
          test: /\.(png|jp(e*)g|gif)$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 8192, // Convert images < 8kb to base64 strings
                name: '[name].[ext]',
                outputPath: 'assets/img',
              },
            },
          ],
        },
        // SVG
        {
          test: /\.svg$/,
          use: ['@svgr/webpack'],
        },
      ],
    },
    plugins: [
      new CleanWebpackPlugin(), // Clean public folder
      // Copy public static files to output
      new CopyWebpackPlugin(
        [
          {
            // Take it directly from the node_modules
            from: './**/**',
            // Where to copy the file in the destination folder
            to: './',
            // My extension relative to node_modules
            context: './public',
            // Don't keep the node_modules tree
            flatten: false,
          },
        ],
        { copyUnmodified: true }
      ),
      // Extract Css if plugin is called
      new MiniCssExtractPlugin({
        filename: 'assets/css/[name].css',
        chunkFilename: 'assets/css/[id].css',
      }),
    ],
  };

  // remove CleanWebpackPlugin in development
  if (isDev) config.plugins.shift();

  // add entries
  const { entries } = build;
  for (const entry of entries) {
    // skip if entry file does not exist in path
    if (!fs.existsSync(path.join(__dirname, srcDir, entry['path']))) continue;

    config.entry[entry.output] = `./${options.srcDir}/${entry.path}`;

    if (entry.isReact) {
      // htlm minify options when development
      const htmlMinifyOptions = {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
      };

      // html options for plugin constructor
      let file = path.parse(entry.path);
      let htmlOptions = {
        inject: true,
        chunks: [entry.output],
        template: `./${srcDir}/${file.dir}/${file.name}.html`,
        filename: `${entry.output}.html`,
      };

      // add minify options to html options when development
      if (options.htmlMinify) htmlOptions['minify'] = htmlMinifyOptions;

      config.plugins.push(new HtmlWebpackPlugin(htmlOptions));
    }
  }

  return config;
};
