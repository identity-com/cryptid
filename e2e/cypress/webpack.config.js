const webpack = require('webpack');

module.exports = {
    resolve: {
        extensions: ['.ts', '.js', '.json'],
        fallback: {
            fs: false,
            child_process: false,
            readline: false,
            path: require.resolve('path-browserify'),
            os: require.resolve("os-browserify/browser"),
            stream: require.resolve("stream-browserify"),
            constants: require.resolve("constants-browserify")
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [/node_modules/],
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                            happyPackMode: true
                        }
                    }
                ]
            },
            {
                test: /\.feature$/,
                use: [
                    {
                        loader: 'cypress-cucumber-preprocessor/loader'
                    }
                ]
            },
            {
                test: /\.features$/,
                use: [
                    {
                        loader: 'cypress-cucumber-preprocessor/lib/featuresLoader'
                    }
                ]
            }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process'
        })
    ]
};
