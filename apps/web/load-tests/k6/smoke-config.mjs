export function readConfig(env) {
  const raw = env.BASE_URL || '';
  const match =
    /^(https?):\/\/([a-z0-9.-]+|\[[0-9a-f:]+\])(?::([0-9]{1,5}))?\/?$/i.exec(
      raw
    );
  if (!match || (match[3] && (+match[3] < 1 || +match[3] > 65535))) {
    throw new Error(
      'BASE_URL must be an HTTP(S) origin without credentials, path, query or fragment'
    );
  }
  const host = match[2].toLowerCase();
  if (
    ['mintenance.co.uk', 'www.mintenance.co.uk'].includes(
      host.replace(/\.$/, '')
    )
  ) {
    throw new Error('Production is excluded from the staging smoke test');
  }
  if (
    match[1].toLowerCase() !== 'https' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(host)
  ) {
    throw new Error('Remote smoke targets must use HTTPS');
  }
  const vus = Number(env.VUS || '10');
  if (!Number.isInteger(vus) || vus < 1 || vus > 10) {
    throw new Error('VUS must be an integer from 1 to 10');
  }
  if (!env.TEST_USER_EMAIL || !env.TEST_USER_PASSWORD) {
    throw new Error(
      'Dedicated staging TEST_USER_EMAIL and TEST_USER_PASSWORD are required'
    );
  }
  return { baseUrl: raw.replace(/\/$/, ''), vus };
}

export function buildReport(data) {
  const metrics = data.metrics || {};
  const required = [
    'checks',
    'http_req_failed',
    'version_duration',
    'stats_duration',
    'login_duration',
    'jobs_duration',
    'version_requests',
    'stats_requests',
    'login_requests',
    'jobs_requests',
  ];
  const thresholdsPassed = required.every((name) => {
    const thresholds = Object.values(metrics[name]?.thresholds || {});
    return (
      thresholds.length > 0 &&
      thresholds.every((threshold) => threshold.ok === true)
    );
  });
  return {
    thresholdsPassed,
    totalRequests: metrics.http_reqs?.values?.count || 0,
    failedRequests: metrics.http_req_failed?.values?.passes || 0,
    // Only aggregate values; never include response bodies, URLs or credentials.
    endpoints: Object.fromEntries(
      ['version', 'stats', 'login', 'jobs'].map((name) => [
        name,
        {
          requests: metrics[`${name}_requests`]?.values?.count || 0,
          p95: metrics[`${name}_duration`]?.values?.['p(95)'] ?? null,
        },
      ])
    ),
  };
}
