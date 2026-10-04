// Runs during config evaluation, before Expo can embed public values in an APK.
const { Buffer } = require('node:buffer');

function isPrivateCredential(value) {
  if (
    /^(?:SG\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|sk_(?:live|test)_|sb_secret_|gh[pousr]_)/.test(
      value
    )
  )
    return true;
  const parts = value.split('.');
  if (parts.length === 3) {
    try {
      return (
        JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role ===
        'service_role'
      );
    } catch {
      /* Not a JWT. */
    }
  }
  return false;
}

function validatePublicBuildEnvironment(env = process.env) {
  const unsafeNames = Object.entries(env)
    .filter(
      ([name, value]) =>
        name.startsWith('EXPO_PUBLIC_') &&
        typeof value === 'string' &&
        isPrivateCredential(value.trim())
    )
    .map(([name]) => name);
  if (unsafeNames.length) {
    // Report names only: the rejected values themselves must never reach logs.
    throw new Error(
      `Private credentials cannot be bundled in public mobile settings: ${unsafeNames.join(', ')}`
    );
  }
  const dsn = env.EXPO_PUBLIC_SENTRY_DSN;
  if (dsn) {
    let valid = false;
    try {
      const url = new URL(dsn);
      valid =
        url.protocol === 'https:' &&
        !!url.username &&
        !url.password &&
        /\/\d+$/.test(url.pathname);
    } catch {
      /* Invalid DSNs are rejected without logging their contents. */
    }
    if (!valid)
      throw new Error(
        'EXPO_PUBLIC_SENTRY_DSN must be a public HTTPS Sentry DSN or empty to disable monitoring.'
      );
  }
}

module.exports = { validatePublicBuildEnvironment };
