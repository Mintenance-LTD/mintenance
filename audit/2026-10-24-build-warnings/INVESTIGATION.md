# Production build warning investigation — 24 October 2026

Baseline: `main` commit `67dc76b1dc916da1609be23a10d0dc32aa72af24`, the merge of PR #1406. Vercel deployment `dpl_3MCNuJPtiVZzXKtMct5pezLnLz1n` is READY in the Mintenance production project. These findings concern a successful deployment; they do not establish end-to-end payment or mobile acceptance.

[Production deployment](https://vercel.com/mintenance/mintenance-clean/3MCNuJPtiVZzXKtMct5pezLnLz1n) · [Merged PR](https://github.com/Mintenance-LTD/mintenance/pull/1406)

## Findings and local corrections

### 1. Security mitigation was skipped by the Vercel build — priority 1

The committed `.npmrc` sets `ignore-scripts=true`. Vercel runs `npm ci`, so the root `prepare` lifecycle does not run. Its custom `scripts/vercel-build.js` invokes individual package builds and `next build`, bypassing the separate `build:packages` security preparation. The supplied production log confirms that path. Consequently this build did not apply the reviewed Zod v3 mitigation even though GitHub's security tests exercise it.

The build entrypoint now explicitly runs `scripts/apply-security-patches.cjs` before compilation and aborts if it fails. Lifecycle scripts remain disabled. Shared package compilation, asset copying, TypeScript and ESLint errors now also abort; previously they were allowed to fail. Existing lint warnings remain visible and are not suppressed. Next.js already has `ignoreBuildErrors: false`, so this strengthens the earlier prerequisites rather than claiming every type error previously reached production.

Validation: six entrypoint regressions prove preparation order and stopping after security/package/asset/type/lint failures. Four existing Zod tests pass against private copies, covering CJS/ESM, oversized bounded collections, valid inputs, asynchronous parsing, nested issue paths, idempotence and refusal of changed source. The Zod advisory remains visible because the installed upstream version is still 3.25.76; the mitigation and its 3 November expiry do not replace the outstanding SDK-compatible upgrade.

### 2. Three moderate web findings share one CSS parser — corrected locally

A web-scoped lockfile audit reproduced exactly the build's four findings: `zod` (high), `postcss-selector-parser`, `postcss-nested`, and `tailwindcss` (moderate). The latter three trace to parser 6.1.5, rather than three independent vulnerabilities. Full-monorepo audit counts include additional mobile/test tooling and must not be compared directly with Vercel's filtered web installation.

An exact override now selects parser 7.1.7, removing those three web findings. This changes the parser, not Tailwind's major version. An isolated installation compiled the full web stylesheet with the existing and replacement parser: both outputs were 238,979 bytes with SHA-256 `bb8c79ea85bc51af848c5e9cca9e84957bf671351b35717ccc85c86e214a77ad`. Shared dependency junctions were not modified.

The [upstream advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) identifies attacker-controlled selector parsing as the exposure; ordinary trusted-source CSS builds are not affected. The upgrade nevertheless removes the vulnerable dependency.

### 3. Tailwind 4 syntax in a Tailwind 3 stylesheet — corrected locally

The installed/configured Tailwind version is 3.4.x, with the v3 PostCSS plugin. `apps/web/app/globals.css` contained a v4-only `@theme` block. It held runtime CSS custom properties, including shadcn variables, which browsers would ignore inside that unsupported rule. It is now a normal `:root` rule. Tailwind utility colors remain defined by `tailwind.config.js`. Both parser comparison runs above used this corrected source; the generated CSS contains the root properties and no `@theme` directive.

### 4. Sentry source-map upload credential missing — configuration work remains

Vercel environment metadata confirms `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` exist for Production/Preview/Development. No `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, or `SENTRY_PROJECT` appears in that inventory. The code passes `SENTRY_AUTH_TOKEN` to Sentry and otherwise defaults organization/project to `mintenance`/`mintenance-web`.

This explains the skipped release/source-map upload; it does not prove runtime error capture is disabled or that delivery works. Before configuring uploads, verify the actual Sentry organization/project, provision an appropriately scoped upload token in Vercel as a secret, and validate symbolication on the next reviewed deployment. No secret values were read, no credential was created, and the warning was not hidden. The connector denied environment listing; the authorized CLI metadata fallback succeeded.

### 5. Unbounded Node range — bounded locally; runtime alignment remains

The root engine range was `>=20.19.4`, allowing Vercel to select future major versions. It is now `>=20.19.4 <25`, retaining the existing Node 20/22/24 compatibility range while preventing an automatic jump to 25 or later. Build logs now print `process.version`. Semver checks confirmed acceptance of 20.19.4/22/24 and rejection of 25/26.

Local instructions, `.nvmrc`, and CI still pin Node 20.19.4; prior production audit recorded Vercel Node 24. This cap does not resolve that mismatch or Node 20's end of life. Do not pin Vercel back to Node 20: [Vercel disabled new Node 20 deployments on 1 October 2026](https://vercel.com/changelog/node-js-20-is-being-deprecated). A separately validated migration of local/CI/mobile tooling to a supported runtime remains necessary.

## Lint triage

The production log reports 833 warnings and zero errors. A full local checkout scan reports 834 warnings and zero errors across 2,546 files; Vercel filters source files using `.vercelignore`.

| Rule category | Local warnings | Interpretation |
| --- | ---: | --- |
| Unused variables/imports | 683 | Mostly cleanup; remove carefully where expressions have side effects. |
| Relative `window.location` assignment | 25 | Navigation API guidance; inspect routes before replacing with client routing. |
| Explicit `any` | 25 | Type-safety debt. |
| Hook dependencies | 24 | Review for stale closures, subscriptions and request races. |
| Compiler immutability checks | 23 | Mostly callbacks declared after effects; not proof of a runtime exception because effects run after rendering. |
| CommonJS `require` | 19 | Module-style debt. |
| Unoptimized images | 16 | Performance/layout review. |
| Other rules/directives | 19 | Includes three purity warnings, one ref warning and compiler compatibility diagnostics. |

Priority review examples: stats fetching on rapid time-range changes in `HybridInferenceStatsClient`; bid line-item IDs generated during render in `BidSubmissionClient2025`; the animation closure in `AnimatedCounter`; and render-time ref assignment in the money-sensitive `useCompletionReview`. The latter also implements stale-response protection, so moving the assignment mechanically could weaken that protection. These diagnostics need targeted behavior tests rather than broad automatic rewrites. No lint rules were weakened and no warning-clean claim is made.

## Additional advisory discovered during verification

The refreshed registry audit also reported [GHSA-834v-8h66-3h79](https://github.com/advisories/GHSA-834v-8h66-3h79) for Happy DOM. It is a development dependency used as the Vitest environment, not an application import found by this review. The dependency and lockfile now use the fixed 21.0.4 release. This is a test-environment major upgrade; full web-test compatibility must pass CI before merge.

The first PR quality gate then surfaced [GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c) in Undici 6.29.0. The existing v6 override and lockfile now select patched 6.29.1, retaining Node 20 compatibility. The unchanged `npm run audit:security` gate passes locally after this update; no new advisory exception was added. Existing dated Zod/node-forge exceptions remain visible.

## Release boundary

The build/CSS corrections were pushed as `1b9eb931` in [PR #1407](https://github.com/Mintenance-LTD/mintenance/pull/1407). Its [Vercel preview](https://vercel.com/mintenance/mintenance-clean/4hXsNXzw3LEzapZxMHSLyHhZH7on) reached READY. This is not a production merge or full browser/mobile acceptance. Preserve restricted-beta protection and the existing Supabase Free decision. Stripe delivery verification and the other readiness blockers remain tracked separately.

## Post-merge cross-browser failures

[Main run 40035200409, shard 2](https://github.com/Mintenance-LTD/mintenance/actions/runs/40035200409/job/120692837169) failed four Safari/mobile-Safari signup and reset checks, with one flaky Firefox signup. Downloaded Playwright traces establish three causes:

- The CI production server used HTTP localhost while issuing `Secure; __Host-` CSRF cookies. Safari's next POST included the CSRF header but omitted the cookie; signup and reset returned 403. The Firefox retry included the cookie and registration returned 201. These traces do not establish a production HTTPS defect.
- All browser projects shared one IP and a three-per-hour password-reset budget. The later reset trace returned 429. Tests must isolate clients without disabling the real limiter.
- One randomly generated hexadecimal signup password contained a forbidden three-character sequence. The page correctly rejected it before submission.

CI now serves the production build over loopback HTTPS using an ephemeral certificate, with certificate trust relaxed only for that exact local test URL. Auth tests simulate distinct trusted-edge client IPs only against the disposable local stack; requests within each test still share real Redis budgets. A browser regression requires reset statuses 200/200/200/429. Random signup passwords retain 176 bits of entropy with separators preventing accidental banned sequences. All five auth browser projects now run on PRs, so these failures cannot hide behind Chromium-only acceptance. Production security controls are unchanged. Cross-browser CI verification of these corrections is pending.

## Admin query defects found by production monitoring

The 24 October 01:07–10:06 UTC log window exposed two mismatches with the live schema:

- `security-dashboard` requested `security_events.description`, but the column is `details`. Its broad missing-object fallback converted the error into HTTP 200 with empty event and IP lists. The query now aliases `details` to the existing `description` response field. Event/IP query errors now fail visibly. Only an explicitly missing metrics RPC (`42883` / `PGRST202`) retains the documented partial-data mode, using the same checked event/IP queries.
- Admin contractor verification requested `contractor_skills.verified` 29 times; the column is `is_verified`. The query now aliases the canonical column to `verified`, preserving both true and false values. A skills query failure returns HTTP 500 instead of a successful empty skills list.

The schema metadata and zero-row SELECTs were checked read-only against production. No data, schema, authorization, MFA, or deployment-protection changes were made. Thirteen new route regressions use a schema-aware query mock to reject nonexistent columns and exercise both successful responses and error paths; these and the two existing security-screen request tests pass (15 total). Full web TypeScript checking and lint of both changed routes pass. These are code fixes awaiting PR CI and a production deployment, not a claim that the production defects are already resolved. Earlier browser-suite success applies to head `b1d9efd3`; the new head must run its own checks.

## Homeowner renewal recommendations

The 24 October 11:03–12:05 UTC monitoring window found three `subscriptions.name` missing-column errors. `RecommendationsService` also requested nonexistent category, frequency and next-billing-date fields. Investigation of the subscription creation and provider-state services established that the canonical homeowner plans are in `homeowner_subscriptions`, keyed by `homeowner_id`, with `plan_name`, `current_period_end` and `cancel_at_period_end`.

Recommendations now use that source, restrict reads to the requesting homeowner's active plans, and suppress renewal reminders for scheduled cancellations or invalid/out-of-window dates. Reminders link to the homeowner plan management page (or Home Health management for that plan). The invented subscription trade-category scoring bonus was removed: account plans do not carry a maintenance trade category. Lookup failures are logged and independent job/property recommendations remain available; the existing five-minute recommendations cache is unchanged.

Eighteen schema-aware service regressions pass, covering owner isolation, active/non-renewing states, date boundaries, plan names, management links, empty results and observable failure handling. The exact projection and ownership/status predicates were validated with a zero-row read-only production SELECT. Lint reports zero errors and two existing unused-variable warnings. No schema, billing-state, Stripe or production configuration writes were made. Deployment verification remains separate from local validation.

## Intermittent accessibility report failure

[PR 1409 E2E shard 1](https://github.com/Mintenance-LTD/mintenance/actions/runs/40094805898/job/120874711273) failed twice for different reasons. The first attempt's page-wide `Profile Completion` locator matched two elements, with the intended match inside `#main-content`. The readiness check now scopes this label to the main landmark rather than accepting an arbitrary first text match.

The retry trace identifies a real contrast defect, not a fade-animation false positive: the Google map fallback paragraph (`Map configuration error. Please contact support.`) rendered 15px normal text in `#ef4444` on `#f8fafc`. Axe measured 3.59:1 against the required 4.5:1. The fallback appears after the code-split map mounts; waiting only for the page's main landmark allowed scans to finish before it appeared. This explains how a later green main run could miss the same defect, without establishing a production Google Maps configuration failure.

The map now uses the existing semantic error-text token `#991b1b`. It exposes loading/ready/error state, and Discover accessibility scans wait for ready or error before running axe. Contrast checks remain enabled. The aggregate failure report now includes offending selectors, HTML and failure summaries so future failures are diagnosable without decoding a trace.

Validation: seven map component tests pass using actual design tokens, including contrast checks for missing-key and script-load failure states. Three isolated Playwright readiness regressions passed three consecutive repetitions (nine passes). A headless Edge browser harness rendering the real map component reproduced the original 3.59:1 failure, then found zero contrast violations and zero incomplete checks with the fixed color at 1280x800 and 375x667. Full web TypeScript checking passes; the changed component passes lint (test files are excluded by the repository lint configuration). The local browser harness used synthetic content and blocked all external requests. Full authenticated CI and production inclusion remain separate verification steps.
