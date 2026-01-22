// Babel configuration specifically for tests
// This avoids the react-native-reanimated plugin issue

module.exports = function(api) {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-expo', {
        // Disable native modules that cause issues in tests
        native: {
          disableImportExportTransform: true,
        }
      }]
    ],
    plugins: [
      // Only include essential plugins for tests
      // Exclude react-native-reanimated/plugin and react-native-worklets/plugin
    ],
  };
};