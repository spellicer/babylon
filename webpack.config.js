const path = require("path");
const local = require("./webpack.local");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");

webpackConfig = {
    entry: {
        index: './index.ts'
    },
    devServer: {
        contentBase: false,
        proxy: local,
        host: "localhost",
        disableHostCheck: true,
        https: false,
        hot: true,
    },
    plugins: [
        new CopyWebpackPlugin([{ from: "static" }]),
        new webpack.ProvidePlugin({ CANNON: "cannon" }),
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        extensions: [".ts", ".js"]
    },
    module: {
        rules: [
            { test: /\.tsx?$/, loader: "ts-loader", exclude: ["/litterbug/"], }
        ]
    },
    mode: "development"
};

if (process.env.NODE_ENV === 'development') {
    webpackConfig.plugins.push(new WorkboxWebpackPlugin.InjectManifest({
        swSrc: "./sw.ts",
        swDest: "sw.js",
        maximumFileSizeToCacheInBytes: 5242880,
    }));
}

module.exports = webpackConfig;