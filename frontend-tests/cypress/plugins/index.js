const webpack = require('@cypress/webpack-preprocessor');

module.exports = (on, config) => {
  const options = {
    webpackOptions: require('../webpack.config.js')
  };
  on('file:preprocessor', webpack(options));

  return config;
};
