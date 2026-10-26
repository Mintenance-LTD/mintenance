# Bounded staging smoke test

`smoke-test.js` is the entry point for `.github/workflows/load-test.yml`. It requires an explicit
staging origin (`BASE_URL`), a dedicated staging `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`, and
`VUS` from 1 to 10 (default 10). There is no automatic application build or localhost fallback. For
local use, start the application yourself and explicitly supply its loopback origin. Remote targets
require HTTPS; the public production domain is excluded. Do not use a production alias or production
account as the staging target. Deployment protection is respected: redirects are failures, not
bypassed.

The weekly/manual workflow uses `STAGING_URL` and the existing `E2E_HOMEOWNER_EMAIL` /
`E2E_HOMEOWNER_PASSWORD` secrets. A manual `target_url` overrides the staging origin. Missing
configuration fails before requests. Set these only to a dedicated, approved staging environment.
This change does not configure those secrets or demonstrate that staging is ready.

The script obtains a real CSRF cookie/token, logs in once during setup, then passes that origin's
session cookies to the VUs. Each VU performs one iteration: GET `/api/version`, GET
`/api/stats/platform`, and authenticated GET `/api/jobs?limit=1`. At default settings this is 32
requests total, including CSRF and login, bounded to 30 seconds for setup and 30 seconds for
iterations. No job, payment or other business data is created. Login does create a session. MFA
challenges, rejected credentials, protection/login redirects, non-200 responses and malformed API
bodies fail the check.

Latency thresholds retain the documented limits: version p95 <200ms, platform stats <500ms, login
<1000ms and jobs <500ms. Login has one sample; this is a smoke check, not a sustained capacity
benchmark. Request-count and response checks prevent absent coverage from passing. Rate limits
remain enabled and a 429 is reported as a failure.

`load-test-results.json` contains only aggregate counts, per-endpoint p95 and the combined threshold
result. It contains no credentials, cookies, user/job data or response bodies. `failedRequests` is
the k6 HTTP failure count; body-contract failures additionally fail `checks` and `thresholdsPassed`.
The job requires both successful k6 execution and a passing report. A crash, missing report or
invalid configuration cannot become a green load test.

## Verification without application traffic

The PR job installs pinned k6 2.3.0 and runs:

```sh
node --test scripts/k6-smoke.test.mjs
```

The regression server binds only to 127.0.0.1, uses synthetic credentials and tests success,
cookie/CSRF propagation, rejected login, MFA, redirects, HTML responses, HTTP errors, unauthorized
jobs and latency failure. Set `K6_BINARY` to an absolute executable path if k6 is not on PATH. These
fixtures verify the checker, not real staging or production performance.
