/** Read-only smoke checks. Never writes assessments, reviews or training labels. */
export async function checkMintStaging(baseUrl, { request = fetch, adminCookie, assessmentId, protectionBypass } = {}) {
  const base = new URL(baseUrl);
  if (!['https:', 'http:'].includes(base.protocol) || (base.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(base.hostname))) throw new Error('Use HTTPS, or HTTP on localhost');
  const results = [];
  const headers = protectionBypass ? { 'x-vercel-protection-bypass': protectionBypass } : {};
  async function check(name, path, init, expected) {
    try {
      const response = await request(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(30000), ...init, headers: { ...headers, ...init.headers } });
      const contentType = response.headers.get('content-type') ?? '';
      let body = null;
      if (contentType.includes('application/json')) body = await response.json();
      const pass = expected(response.status, body);
      results.push({ name, pass, status: response.status });
    } catch { results.push({ name, pass: false, error: 'Request failed or timed out' }); }
  }
  // Requiring JSON avoids mistaking Vercel's HTML authentication wall for app authorization.
  const denied = (status, body) => [401, 403].includes(status) && body !== null && Boolean(body.error);
  const id = assessmentId ?? '00000000-0000-4000-8000-000000000000';
  await check('Evaluation denies anonymous access', '/api/admin/building-assessments/evaluation', {}, denied);
  await check('Review evidence denies anonymous access', `/api/admin/building-assessments/${id}/expert-review`, {}, denied);
  await check('Analysis status denies anonymous access', `/api/assessments/${id}/status`, {}, denied);
  if (adminCookie) {
    await check('Admin evaluation loads the deployed database schema', '/api/admin/building-assessments/evaluation', { headers: { Cookie: adminCookie } },
      (status, body) => status === 200 && body?.kind === 'historical_review_audit' && Array.isArray(body.groups) && typeof body.reviewCount === 'number' && typeof body.datasetId === 'string');
    if (assessmentId) await check('Admin review evidence loads', `/api/admin/building-assessments/${assessmentId}/expert-review`, { headers: { Cookie: adminCookie } },
      (status, body) => status === 200 && /^[a-f0-9]{64}$/.test(body?.sourceFingerprint ?? '') && Array.isArray(body.images) && Array.isArray(body.reviews));
  }
  return { passed: results.every(result => result.pass), authenticatedChecksRun: Boolean(adminCookie), results };
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const baseUrl = process.argv[2];
  if (!baseUrl) { console.error('Usage: node scripts/mint-ai-staging-smoke.mjs https://preview-host'); process.exitCode = 1; }
  else {
    try {
      const result = await checkMintStaging(baseUrl, { adminCookie: process.env.MINT_STAGING_ADMIN_COOKIE, assessmentId: process.env.MINT_STAGING_ASSESSMENT_ID, protectionBypass: process.env.VERCEL_AUTOMATION_BYPASS_SECRET });
      console.log(JSON.stringify(result, null, 2));
      if (!result.passed) process.exitCode = 1;
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
