var fs = require('fs-extra');
var path = require('path');
var webpack = require('webpack');
var FolderZip = require('folder-zip');
var WebpackOnBuildPlugin = require("on-build-webpack");
var CleanWebpackPlugin = require('clean-webpack-plugin');

var sourceDir = path.join(__dirname, "src"),
    buildDir = path.join(__dirname, "build"),
    unpackedDir = path.join(buildDir, "unpacked");

module.exports = {
    entry: {
        content: path.join(sourceDir, 'js', "content.js"),
        background: path.join(sourceDir, 'js', "background.js"),
        popup: path.join(sourceDir, 'js', "popup.js"),
        options: path.join(sourceDir, 'js', "options.js")
    },
    output: {
        path: unpackedDir,
        filename: "[name].js"
    },
    // devtool: "source-map",
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: "babel-loader",
                exclude: /node_modules|build/,
                query: {
                    presets: ["es2015", "stage-0"]
                }
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin([buildDir], {verbose: false}),
        new WebpackOnBuildPlugin(function () {
            var pkgData = fs.readJsonSync(path.join(__dirname, 'package.json'));
            var mData = fs.readJsonSync(path.join(sourceDir, 'manifest.json'));
            mData.version = pkgData.version;
            fs.writeJsonSync(path.join(unpackedDir, 'manifest.json'), mData);

            ['icons', 'pages', 'css'].forEach(function (dir) {
                fs.copySync(
                    path.join(sourceDir, dir),
                    path.join(unpackedDir, dir)
                );
            });

            var zip = new FolderZip();
            zip.zipFolder(unpackedDir, {excludeParentFolder: true}, function () {
                zip.writeToFile(path.join(buildDir, 'extension-v' + pkgData.version + '.zip'))
            })
        }),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: '"production"'
            }
        }),
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false,
                screw_ie8: true
            },
            // sourceMap: true,
            comments: false
        }),
    ]
};