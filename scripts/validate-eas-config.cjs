const { spawnSync } = require('node:child_process');
const path = require('node:path');
const {
  validatePublicBuildEnvironment,
} = require('../apps/mobile/validate-public-build-env');
const {
  validateReleaseEnvironment,
} = require('../apps/mobile/validate-release-env');
const profiles = require('../apps/mobile/eas.json').build;

function resolveBuildEnvironment(profile, env = process.env) {
  if (!['production', 'staging', 'beta-login-test'].includes(profile)) {
    throw new Error(
      'Choose a production, staging or beta-login-test config preflight.'
    );
  }
  // Match EAS profile precedence. Do not fetch credentials, load local dotenv
  // files, or weaken the validators to get through initial config evaluation.
  const resolved = {
    ...env,
    // The isolated beta profile inherits preview's public build defaults.
    ...(profile === 'beta-login-test' ? profiles.preview.env : {}),
    ...profiles[profile].env,
    EAS_BUILD_PROFILE: profile,
    EXPO_NO_DOTENV: '1',
    EXPO_OFFLINE: '1',
  };
  validatePublicBuildEnvironment(resolved);
  validateReleaseEnvironment(resolved);
  return resolved;
}

function validateExpoConfig(profile, env = process.env) {
  const resolved = resolveBuildEnvironment(profile, env);
  const result = spawnSync(
    process.execPath,
    [require.resolve('expo/bin/cli'), 'config', '--json'],
    {
      cwd: path.resolve(__dirname, '../apps/mobile'),
      env: resolved,
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 4 * 1024 * 1024,
    }
  );
  // Config JSON can contain embedded settings. Never echo stdout/stderr or
  // child-process error objects into CI logs, even when Expo fails.
  if (result.error || result.status !== 0) {
    throw new Error(
      'Expo config evaluation failed after release settings validation. No build was submitted.'
    );
  }
  try {
    const config = JSON.parse(result.stdout);
    if (!config.slug || !config.extra?.eas?.projectId) throw new Error();
    return config;
  } catch {
    throw new Error(
      'Expo did not return valid project configuration. No build was submitted.'
    );
  }
}

if (require.main === module) {
  try {
    validateExpoConfig(process.argv[2]);
    console.log(
      'Expo release config validated locally; no EAS build submitted.'
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { resolveBuildEnvironment, validateExpoConfig };
