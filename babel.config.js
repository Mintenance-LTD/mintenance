module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Use worklets plugin (reanimated plugin moved to worklets)
      'react-native-worklets/plugin',
    ],
  };
};
