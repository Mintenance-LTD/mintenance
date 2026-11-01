const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const app = path.join(root, 'apps/mobile');
const filename = path.join(app, 'metro.config.js');
const source = fs.readFileSync(filename, 'utf8');

function load(getDefaultConfig) {
  const context = {
    __dirname: app,
    module: { exports: {} },
    require(name) {
      if (name === 'path') return path;
      assert.equal(name, 'expo/metro-config');
      return { getDefaultConfig };
    },
  };
  vm.runInNewContext(source, context, { filename });
  return context.module.exports;
}

for (const asyncDefaults of [false, true]) {
  test(`retains Expo watch roots and resolver behavior (${asyncDefaults ? 'async' : 'sync'})`, async () => {
    const upstreamResult = {
      type: 'sourceFile',
      filePath: '/upstream/module.js',
    };
    const upstreamRoot = path.join(root, 'expo-default-watch-root');
    const upstreamBlock = /upstream-generated/;
    const base = {
      watchFolders: [root, upstreamRoot, path.join(root, 'node_modules')],
      resolver: {
        blockList: upstreamBlock,
        resolveRequest: () => upstreamResult,
      },
      server: { unstable_serverRoot: root },
    };
    const config = await load(() =>
      asyncDefaults ? Promise.resolve(base) : base
    );
    for (const expected of [
      root,
      upstreamRoot,
      path.join(root, 'packages'),
      path.join(root, 'node_modules'),
    ]) {
      assert.ok(
        config.watchFolders.includes(expected),
        `Missing watch folder: ${expected}`
      );
    }
    assert.equal(new Set(config.watchFolders).size, config.watchFolders.length);
    assert.equal(config.server.unstable_serverRoot, root);
    assert.ok(config.resolver.blockList.includes(upstreamBlock));
    assert.ok(
      config.resolver.blockList.some((rule) =>
        rule.test(path.join(root, 'apps/web/.next/server/page.js'))
      )
    );
    assert.equal(
      config.resolver.resolveRequest({}, 'ordinary-module', 'android'),
      upstreamResult
    );
    assert.equal(
      config.resolver.resolveRequest({}, 'jsdom', 'android').filePath,
      path.join(app, '__mocks__/jsdom.js')
    );
  });
}

test('does not hide a broken Expo config behind a minimal fallback', async () => {
  assert.throws(
    () =>
      load(() => {
        throw new Error('Expo config failed');
      }),
    /Expo config failed/
  );
  await assert.rejects(
    load(() => Promise.reject(new Error('Async Expo config failed'))),
    /Async Expo config failed/
  );
});

test('actual installed Expo default watch folders are retained', async () => {
  const { getDefaultConfig } = require(
    require.resolve('expo/metro-config', { paths: [app] })
  );
  const defaults = await getDefaultConfig(app);
  const actual = await require(filename);
  assert.ok(
    defaults.watchFolders.length > 0,
    'Expected monorepo default watch folders'
  );
  for (const folder of defaults.watchFolders)
    assert.ok(actual.watchFolders.includes(folder), folder);
  assert.equal(
    actual.server.unstable_serverRoot,
    defaults.server.unstable_serverRoot
  );
});
