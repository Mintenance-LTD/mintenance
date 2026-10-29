const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const {
  resolveBuildEnvironment,
  validateExpoConfig,
} = require('./validate-eas-config.cjs');
const { requiresNativeBuild } = require('./mobile-build-changes.cjs');

const workflow = yaml.load(
  fs.readFileSync(
    path.join(__dirname, '../.github/workflows/ci-cd.yml'),
    'utf8'
  )
);
// Read actual workflow mappings with synthetic secrets, never local credentials.
const secrets = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://production.example.test',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-production-client-key',
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_synthetic',
  EXPO_PUBLIC_SUPABASE_URL_STAGING: 'https://staging-db.example.test',
  EXPO_PUBLIC_SUPABASE_ANON_KEY_STAGING: 'synthetic-staging-client-key',
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST: 'pk_test_synthetic',
  EXPO_PUBLIC_API_URL_STAGING: 'https://staging-api.example.test',
};

function workflowEnvironment(profile, availableSecrets = secrets) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|LOCALAPPDATA|APPDATA|USERPROFILE)$/i.test(
        key
      )
    )
  );
  for (const [key, value] of Object.entries(
    workflow.jobs[`build-${profile}`].env
  )) {
    if (key === 'HAS_EXPO') continue;
    const match = value.match(/^\$\{\{ secrets\.(\w+) \}\}$/);
    env[key] = match ? availableSecrets[match[1]] || '' : value;
  }
  return { ...env, CI: '1' };
}

for (const profile of ['production', 'staging']) {
  test(`${profile}: workflow settings resolve real Expo config offline`, () => {
    const env = workflowEnvironment(profile);
    const resolved = resolveBuildEnvironment(profile, env);
    assert.equal(
      resolved.EXPO_PUBLIC_SUPABASE_URL,
      profile === 'production'
        ? secrets.EXPO_PUBLIC_SUPABASE_URL
        : secrets.EXPO_PUBLIC_SUPABASE_URL_STAGING
    );
    assert.equal(
      resolved.EXPO_PUBLIC_API_BASE_URL,
      profile === 'production'
        ? 'https://www.mintenance.co.uk'
        : secrets.EXPO_PUBLIC_API_URL_STAGING
    );
    validateExpoConfig(profile, env);
  });

  for (const setting of [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ]) {
    test(`${profile}: missing ${setting} fails before any Expo invocation`, () => {
      const env = workflowEnvironment(profile);
      env[setting] = '';
      assert.throws(
        () => validateExpoConfig(profile, env),
        new RegExp(`${setting} is required`)
      );
    });
  }

  test(`${profile}: legacy token-only setup reproduces missing release inputs`, () => {
    assert.throws(
      () => resolveBuildEnvironment(profile, {}),
      /Mobile release configuration invalid/
    );
  });

  test(`${profile}: cloud submission remains gated on actual native inputs`, () => {
    const job = workflow.jobs[`build-${profile}`];
    assert.ok(job.needs.includes('quality-checks'));
    assert.ok(job.needs.includes('native-build-changes'));
    assert.match(
      job.if,
      /needs\.native-build-changes\.outputs\.should-build == 'true'/
    );
    const preflight = job.steps.findIndex(
      (step) => step.run === `node scripts/validate-eas-config.cjs ${profile}`
    );
    const submit = job.steps.findIndex((step) =>
      step.run?.startsWith('eas build')
    );
    assert.ok(preflight >= 0 && submit > preflight);
    assert.equal(job.steps[preflight].if, job.steps[submit].if);
    assert.equal(
      requiresNativeBuild([
        'apps/web/e2e/authenticated-contractor-flow.spec.ts',
        '.github/workflows/ci-cd.yml',
      ]),
      false
    );
    assert.equal(requiresNativeBuild(['apps/mobile/app.config.js']), true);
  });
}

test('staging cannot silently fall back to production settings', () => {
  assert.throws(
    () =>
      resolveBuildEnvironment(
        'staging',
        workflowEnvironment('staging', {
          EXPO_PUBLIC_SUPABASE_URL: secrets.EXPO_PUBLIC_SUPABASE_URL,
          EXPO_PUBLIC_SUPABASE_ANON_KEY: secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY,
          EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY:
            secrets.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        })
      ),
    /EXPO_PUBLIC_SUPABASE_URL is required/
  );
  assert.throws(
    () =>
      resolveBuildEnvironment('staging', {
        ...workflowEnvironment('staging'),
        EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_synthetic',
      }),
    /Staging builds require Stripe sandbox keys/
  );
});

test('private credentials and missing staging API settings stay rejected without values in errors', () => {
  const secret = 'sk_test_SYNTHETIC_NOT_A_REAL_KEY';
  assert.throws(
    () =>
      resolveBuildEnvironment('production', {
        ...workflowEnvironment('production'),
        EXPO_PUBLIC_SUPABASE_ANON_KEY: secret,
      }),
    (error) =>
      error.message.includes('Private credentials') &&
      !error.message.includes(secret)
  );
  assert.throws(
    () =>
      resolveBuildEnvironment('staging', {
        ...workflowEnvironment('staging'),
        EXPO_PUBLIC_API_BASE_URL: '',
        EXPO_PUBLIC_API_URL: '',
      }),
    /EXPO_PUBLIC_API_BASE_URL is required/
  );
});

test('isolated beta APK resolves the verified relay with OTA disabled and existing package identity', () => {
  const env = {
    ...workflowEnvironment('production'),
    EXPO_PUBLIC_SUPABASE_URL: 'https://ukrjudtlvapiajkjbcrd.supabase.co',
  };
  const resolved = resolveBuildEnvironment('beta-login-test', env);
  const config = validateExpoConfig('beta-login-test', env);
  assert.equal(
    resolved.EXPO_PUBLIC_MOBILE_API_GATEWAY_URL,
    'https://ukrjudtlvapiajkjbcrd.supabase.co/functions/v1/mobile-api-relay'
  );
  assert.equal(resolved.EXPO_PUBLIC_USE_MOCK, 'false');
  assert.equal(resolved.NODE_ENV, 'production');
  assert.equal(config.android.package, 'com.mintenance.app');
  assert.equal(config.android.versionCode, 41);
  assert.equal(config.name, 'Mintenance Beta');
  assert.equal(config.runtimeVersion, '1.2.4-beta-login1');
  assert.equal(config.updates.enabled, false);
  assert.deepEqual(
    config.plugins.find((plugin) => plugin[0] === 'expo-sqlite'),
    ['expo-sqlite', { useSQLCipher: true }]
  );
  const profiles = require('../apps/mobile/eas.json').build;
  assert.equal(profiles['beta-login-test'].extends, 'preview');
  assert.equal(profiles['beta-login-test'].channel, 'beta-login-test');
  assert.equal(profiles['beta-login-test'].credentialsSource, 'remote');
  assert.equal(profiles.preview.distribution, 'internal');
  assert.equal(profiles.preview.android.buildType, 'apk');
  assert.equal(profiles.preview.environment, 'production');
});

test('ordinary production config retains its runtime, version and update behavior', () => {
  const config = validateExpoConfig(
    'production',
    workflowEnvironment('production')
  );
  assert.equal(config.android.versionCode, 40);
  assert.equal(config.name, 'Mintenance');
  assert.equal(config.runtimeVersion, '1.2.4-sqlcipher1');
  assert.notEqual(config.updates.enabled, false);
});

test('beta APK rejects a different Supabase project before a build is submitted', () => {
  assert.throws(
    () =>
      validateExpoConfig('beta-login-test', workflowEnvironment('production')),
    /Expo config evaluation failed/
  );
});

test('beta APK still requires public client settings and rejects private keys without logging values', () => {
  const env = {
    ...workflowEnvironment('production'),
    EXPO_PUBLIC_SUPABASE_URL: 'https://ukrjudtlvapiajkjbcrd.supabase.co',
  };
  assert.throws(
    () =>
      resolveBuildEnvironment('beta-login-test', {
        ...env,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
      }),
    /EXPO_PUBLIC_SUPABASE_ANON_KEY is required/
  );
  const secret = 'sb_secret_SYNTHETIC_NOT_A_REAL_KEY';
  assert.throws(
    () =>
      resolveBuildEnvironment('beta-login-test', {
        ...env,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: secret,
      }),
    (error) =>
      error.message.includes('Private credentials') &&
      !error.message.includes(secret)
  );
});
