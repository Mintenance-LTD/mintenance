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
  //
  // @babel/plugin-transform-modules-commonjs is listed explicitly (and BEFORE the
  // dynamic-import plugin) so the dependency the dynamic-import plugin needs is always
  // satisfied. On jest's empty-coverage path (untested files instrumented by
  // babel-plugin-istanbul), babel-preset-expo's caller-sensitive logic leaves modules
  // as ESM, so the preset's own commonjs transform is absent and the standalone
  // dynamic-import plugin throws "depends on a modules transform plugin". Declaring the
  // commonjs transform here makes module-lowering deterministic regardless of the babel
  // caller, fixing `jest --coverage` under the default (istanbul) coverage provider.
  // strictMode:false mirrors babel-preset-expo's own commonjs config — the default
  // (strictMode:true) injects "use strict" into every module, which turns getter-only
  // property writes (e.g. the reactive theme.colors getters) into thrown TypeErrors.
  const plugins = isTest
    ? [
        ['@babel/plugin-transform-modules-commonjs', { strictMode: false }],
        '@babel/plugin-transform-dynamic-import',
      ]
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
