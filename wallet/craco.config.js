// craco.config.js
const { DefinePlugin } = require('webpack');

module.exports = {
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  webpack: {
    plugins: [
      // include process.env.STAGE provided during build at runtime
      new DefinePlugin({
        'process.env.STAGE': JSON.stringify(process.env.STAGE ?? 'prod')
      })
    ]
  },
}
