module.exports = function (api) {
  api.cache(true);

  const isTest = process.env.NODE_ENV === 'test';

  // Reanimated plugin must be last. Do not add react-native-worklets/plugin -
  // Reanimated 4.x includes worklets; both plugins cause "Duplicate plugin" on EAS.
  // In tests, rewrite dynamic import() to a require()-based promise so jest.mock()
  // can intercept dynamically-imported modules (e.g. @mintenance/data-access loaded
  // via `await import(...)` inside services). babel-preset-expo's commonjs transform
  // does not rewrite dynamic imports, so they otherwise escape to Node's VM and throw
  // ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG. Production/EAS builds keep native ESM.
  const plugins = isTest
    ? ['@babel/plugin-transform-dynamic-import']
    : ['react-native-reanimated/plugin'];

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Use commonjs modules in test environment
          modules: isTest ? 'commonjs' : false,
        },
      ],
    ],
    plugins,
  };
};
