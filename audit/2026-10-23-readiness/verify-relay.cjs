const fs = require('node:fs');
const url = 'https://ukrjudtlvapiajkjbcrd.supabase.co/functions/v1/stripe-webhook-relay';
(async () => {
  const results = [];
  for (const [label, options] of [
    ['non-post', { method: 'GET' }],
    ['unsigned', { method: 'POST', body: '{}' }],
    ['forged-signature', { method: 'POST', body: '{}', headers: { 'stripe-signature': 't=1,v1=invalid' } }],
  ]) {
    const response = await fetch(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(25000) });
    results.push({ label, status: response.status, body: await response.text() });
  }
  const protectedResponse = await fetch('https://www.mintenance.co.uk/api/webhooks/stripe', { method: 'POST', body: '{}', redirect: 'manual', signal: AbortSignal.timeout(25000) });
  const location = protectedResponse.headers.get('location');
  const ssoRedirect = location ? new URL(location, 'https://www.mintenance.co.uk').hostname === 'vercel.com' : false;
  results.push({ label: 'original-route-still-protected', status: protectedResponse.status, ssoRedirect });
  const pass = results.slice(0, 3).map(r => r.status).join(',') === '405,400,400' && (protectedResponse.status === 401 || (protectedResponse.status === 302 && ssoRedirect));
  const report = { at: new Date().toISOString(), pass, results };
  fs.writeFileSync(__dirname + '/operations-relay-smoke.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (!pass) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
