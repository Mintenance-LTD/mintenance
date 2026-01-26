module.exports = function(api) {
  api.cache(true);

  const isTest = process.env.NODE_ENV === 'test';

  // Don't use reanimated plugin in test environment
  const plugins = isTest
    ? []
    : [
        'react-native-worklets/plugin',
        'react-native-reanimated/plugin'
      ];

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
