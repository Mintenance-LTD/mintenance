const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');

test('lockfile excludes vulnerable modern glob and minimatch copies', () => {
  const packages = require('../package-lock.json').packages;
  for (const [name, pkg] of Object.entries(packages)) {
    const major = Number(pkg.version?.split('.')[0]);
    if (name.endsWith('/glob') && major >= 9)
      assert.equal(pkg.version, '14.0.3', name);
    if (name.endsWith('/minimatch') && major >= 9)
      assert.equal(pkg.version, '11.0.3', name);
  }
});

test('minimatch bounds globstar/parent amplification at the requested limit', () => {
  const source = `
    const { Minimatch } = require(${JSON.stringify(require.resolve('minimatch'))});
    const m = new Minimatch('**/../a/b/'.repeat(10) + '*.js', {
      optimizationLevel: 2, braceExpandMax: 32
    });
    if (m.globParts.length > 32) process.exit(1);
  `;
  execFileSync(process.execPath, ['-e', source], {
    timeout: 3000,
    stdio: 'pipe',
  });
});

test('aborting glob stops recursive filesystem reads after rejection', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mintenance-glob-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (let i = 0; i < 8; i++)
    fs.mkdirSync(path.join(root, String(i), 'nested'), { recursive: true });
  const controller = new AbortController();
  let reads = 0;
  const probeFs = {
    ...fs,
    readdir(dir, options, cb) {
      reads++;
      fs.readdir(dir, options, (error, entries) => {
        controller.abort(new Error('probe-abort'));
        cb(error, entries);
      });
    },
  };
  await assert.rejects(
    require('glob').glob('**/*', {
      cwd: root,
      fs: probeFs,
      signal: controller.signal,
    }),
    /probe-abort/
  );
  const readsAtRejection = reads;
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(reads, readsAtRejection);
  assert.equal(reads, 1);
});

for (const consumer of [
  '@expo/cli',
  '@expo/config',
  '@expo/config-plugins',
  '@expo/fingerprint',
  '@expo/metro-config',
  'expo-updates',
  'archiver-utils',
  'rimraf',
]) {
  test(`${consumer} resolves the patched glob with working synchronous matching`, () => {
    const consumerRequire = createRequire(
      require.resolve(`${consumer}/package.json`)
    );
    const glob = consumerRequire('glob');
    assert.equal(consumerRequire('glob/package.json').version, '14.0.3');
    assert.ok(
      glob
        .globSync('package.json', { cwd: path.resolve(__dirname, '..') })
        .includes('package.json')
    );
  });
}

test('legacy lint and coverage consumers retain the callable minimatch API', () => {
  for (const consumer of ['eslint-plugin-react', 'test-exclude']) {
    const consumerRequire = createRequire(require.resolve(consumer));
    const minimatch = consumerRequire('minimatch');
    assert.equal(minimatch('src/example.js', '**/*.js'), true);
    assert.equal(minimatch('src/example.ts', '**/*.js'), false);
    assert.equal(minimatch('src/example.jsx', '**/*.{js,jsx}'), true);
  }
  const TestExclude = require('test-exclude');
  const coverage = new TestExclude({ cwd: process.cwd() });
  assert.equal(
    coverage.shouldInstrument(path.join(process.cwd(), 'src/example.js')),
    true
  );
  assert.equal(
    coverage.shouldInstrument(
      path.join(process.cwd(), 'node_modules/example.js')
    ),
    false
  );
});

test('legacy minimatch APIs do not perform the advisory globparts expansion', () => {
  for (const consumer of ['test-exclude', 'readdir-glob']) {
    const consumerRequire = createRequire(require.resolve(consumer));
    const { Minimatch } = consumerRequire('minimatch');
    const matcher = new Minimatch('**/../a/b/'.repeat(10) + '*.js', {
      optimizationLevel: 2,
      braceExpandMax: 32,
    });
    assert.equal(matcher.set.length, 1);
    assert.equal(typeof matcher.firstPhasePreProcess, 'undefined');
  }
});

test('React Native codegen expands its native source extension pattern', () => {
  const codegenRequire = createRequire(
    require.resolve('@react-native/codegen/package.json')
  );
  const globRequire = createRequire(codegenRequire.resolve('glob'));
  const minimatchRequire = createRequire(globRequire.resolve('minimatch'));
  assert.equal(
    minimatchRequire('brace-expansion/package.json').version,
    '1.1.21'
  );
  assert.equal(typeof minimatchRequire('brace-expansion'), 'function');
  const nativeSources = codegenRequire('glob').sync(
    'src/**/*{,.fb}.{js,ts,tsx}',
    {
      cwd: path.dirname(
        require.resolve('react-native-gesture-handler/package.json')
      ),
    }
  );
  assert.ok(
    nativeSources.some((file) => file.endsWith('RNGestureHandlerModule.ts'))
  );
});

for (const library of [
  '@react-native-community/datetimepicker',
  'react-native-gesture-handler',
  '@react-native-async-storage/async-storage',
]) {
  test(`${library} generates a nonempty Android native schema`, (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mintenance-codegen-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const manifestPath = require.resolve(`${library}/package.json`);
    const manifest = require(manifestPath);
    const output = path.join(root, 'schema.json');
    execFileSync(
      process.execPath,
      [
        require.resolve('@react-native/codegen/lib/cli/combine/combine-js-to-schema-cli.js'),
        '--platform',
        'android',
        output,
        path.resolve(
          path.dirname(manifestPath),
          manifest.codegenConfig.jsSrcsDir
        ),
      ],
      { timeout: 15000, stdio: 'pipe' }
    );
    assert.ok(
      Object.keys(JSON.parse(fs.readFileSync(output, 'utf8')).modules).length >
        0
    );
  });
}
