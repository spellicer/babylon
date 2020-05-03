const path = require("path");
const local = require("./webpack.local");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

webpackConfig = {
    entry: {
        index: './index.ts'
    },
    devServer: {
        proxy: local,
        host: '0.0.0.0',
        disableHostCheck: true,
        https: false,
        hot: true
    },
    plugins: [
        new CopyWebpackPlugin([{ from: "static" }]),
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

if (process.env.NODE_ENV === 'development') {
    webpackConfig.plugins.push(new WorkboxWebpackPlugin.InjectManifest({
        swSrc: "./sw.ts",
        swDest: "sw.js",
        maximumFileSizeToCacheInBytes: 5242880,
    }));
}

module.exports = webpackConfig;