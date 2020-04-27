const path = require("path");
const local = require("./webpack.local");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");

module.exports = {
    entry: {
        index: './index.ts'
    },
    devServer: {
        contentBase: path.resolve(__dirname, 'static'),
        proxy: local,
        host: '0.0.0.0',
        disableHostCheck: true,
        https: false,
        hot: true
    },
    plugins: [
        new WorkboxWebpackPlugin.InjectManifest({
            swSrc: "./sw.ts",
            swDest: "sw.js",
            maximumFileSizeToCacheInBytes: 5242880,
        })
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
            { test: /\.tsx?$/, loader: "ts-loader" }
        ]
    },
    mode: "development"
};
