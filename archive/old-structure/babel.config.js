module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Removed reanimated/worklets plugin temporarily to fix blank screen
      // Will re-add once basic rendering is working
    ],
  };
};
