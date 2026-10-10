const fs = require('fs');

const pluginMtime = fs.statSync(require.resolve('./babel-plugin-app-text.js')).mtimeMs;

module.exports = function (api) {
  api.cache.using(() => pluginMtime);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['./babel-plugin-app-text.js'],
  };
};
