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

The refreshed registry audit also reported [GHSA-834v-8h66-3h79](https://github.com/advisories/GHSA-834v-8h66-3h79) for Happy DOM. It is a development dependency used as the Vitest environment, not an application import found by this review. The fixed release is 21.0.4; the current declared range is v20, so remediation requires a test-environment major upgrade and compatibility checks. It must not be dismissed merely because it was absent from the pasted build's audit snapshot.

## Release boundary

Corrections in this follow-up branch are local until committed, reviewed and deployed. Focused regression tests and CSS compilation passed; they are not a fresh complete Next.js production build or full browser/mobile acceptance run. Preserve restricted-beta protection and the existing Supabase Free decision. Stripe delivery verification and the other readiness blockers remain tracked separately.
