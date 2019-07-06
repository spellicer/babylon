const path = require("path");

module.exports = {
    entry: './index.ts',
    devServer: {
        host: '0.0.0.0',
        disableHostCheck: true,
        https: true,
        hot: true
    },
    output: {
        filename: 'index.js',
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
