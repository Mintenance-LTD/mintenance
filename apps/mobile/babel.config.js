module.exports = function(api) {
  api.cache(true);

  const isTest = process.env.NODE_ENV === 'test';

  // Reanimated plugin must be last. Do not add react-native-worklets/plugin -
  // Reanimated 4.x includes worklets; both plugins cause "Duplicate plugin" on EAS.
  const plugins = isTest
    ? []
    : ['react-native-reanimated/plugin'];

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Use commonjs modules in test environment
          modules: isTest ? 'commonjs' : false,
        }
      ]
    ],
    plugins,
  };
};
