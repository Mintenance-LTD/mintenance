const { createHash } = require('node:crypto');

function isolatedClientHeaders(env, baseURL, testId, retry, headers = {}) {
  if (!env.CI) return headers;
  if (
    env.E2E_TESTING !== 'true' ||
    baseURL !== 'https://localhost:3000' ||
    env.E2E_SUPABASE_URL !== 'http://127.0.0.1:56321'
  ) {
    throw new Error(
      'Client-IP isolation requires the disposable loopback CI stack.'
    );
  }
  // One stable client per test attempt. Keep real rate limits within each test;
  // unrelated tests must not spend the same shared localhost request budget.
  const id = createHash('sha256')
    .update(`${testId}:${retry}`)
    .digest('hex')
    .slice(0, 24);
  return {
    ...headers,
    'x-vercel-forwarded-for': `2001:db8:${id.match(/.{4}/g).join(':')}`,
  };
}

module.exports = { isolatedClientHeaders };
