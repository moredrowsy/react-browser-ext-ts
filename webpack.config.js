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
const entries = [
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
    isReact: true, // React entry needs index.html
  },
  {
    path: 'options/index.tsx',
    output: 'options',
    isReact: true, // React entry needs index.html
  },
  {
    path: 'popup/index.tsx',
    output: 'popup',
    isReact: true, // React entry needs index.html
  },
];

const dev_options = {
  outDir: outDir,
  extractCss: false,
  extractFont: false,
  htmlMinify: false,
  sourceMap: true,
};

const prod_options = {
  outDir: outDir,
  extractCss: true,
  extractFont: true,
  htmlMinify: true,
  sourceMap: false,
};

// WEBPACK CONFIG LOGIC
module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  // Options for config
  let options = isDev ? dev_options : prod_options;

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
      // Exlude these assets reporting in watch stats
      excludeAssets: [
        /\.map$/, // exclude source map
        /\.json$/, // exclude json
        /\.(woff(2)?|eot|ttf|otf)$/, // exclude fonts
        /\.(png|jp(e*)g|gif)$/, // exclude images
        /\.svg$/, // exclude svg
      ],
      modules: false,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
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
      {
        apply: (compiler) => {
          compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
            updateManifest(entries, options.outDir);
          });
        },
      },
    ],
  };

  // Remove CleanWebpackPlugin in development to stop deleting sourcemaps
  if (isDev) config.plugins.shift();

  // Add entries
  for (const entry of entries) {
    // Skip if entry file does not exist in path
    if (!fs.existsSync(path.join(__dirname, srcDir, entry['path']))) continue;

    config.entry[entry.output] = `./${srcDir}/${entry.path}`;

    if (entry.isReact) {
      // Html options for HtmlWebpackPlugin to inject bundled js into html page
      let file = path.parse(entry.path);
      let htmlOptions = {
        inject: true,
        chunks: [entry.output],
        template: `./${srcDir}/${file.dir}/${file.name}.html`,
        filename: `${entry.output}.html`,
      };

      // Minify html when in production
      if (options.htmlMinify) {
        const htmlMinifyOptions = {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
        };
        htmlOptions['minify'] = htmlMinifyOptions;
      }

      config.plugins.push(new HtmlWebpackPlugin(htmlOptions));
    }
  }

  return config;
};

// Remove manifest keys if certain entries do no exist
// Ie, if not 'devtools' entry is missing, remove devtool key in manifest
function updateManifest(entries, outDir) {
  // read manifest.json
  const manifestPath = path.join(__dirname, outDir, 'manifest.json');
  const data = fs.readFileSync(manifestPath, { encoding: 'utf-8', flag: 'r' });
  let manifest = JSON.parse(data);
  let isManifestChanged = false;

  // modify manifest if entries are not found
  for (const entry of entries) {
    const output = entry.output;
    if (!fs.existsSync(path.join(__dirname, outDir, output + '.js'))) {
      if (output.includes('background')) delete manifest['background'];
      else if (output.includes('content')) delete manifest['content_scripts'];
      else if (output.includes('devtools')) delete manifest['devtools_page'];
      else if (output.includes('options')) delete manifest['options_ui'];
      else if (output.includes('popup')) delete manifest['browser_action'];
      isManifestChanged = true;
    }
  }

  // overwrite manifest.json
  if (isManifestChanged)
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), {
      encoding: 'utf-8',
      flag: 'w',
    });
}
