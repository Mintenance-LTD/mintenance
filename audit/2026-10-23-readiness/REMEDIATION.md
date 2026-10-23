# Readiness remediation — 23 October 2026

These changes are in the local checkout. They have not been deployed, and the original production observations remain valid until rollout and live verification.

## Implemented

| Finding | Change | Status |
|---|---|---|
| F1: deployment access | User explicitly chose to keep a restricted beta. Vercel protection was preserved. | Intentional beta restriction; ordinary mobile-client access still needs verification. |
| F2: failed admin alerts | Short notification types; entity/deduplication keys in metadata; duplicate checks per recipient, including queued delivery and legacy records. Creation counts now represent persisted/queued recipient notifications. Failed checks, missing recipients and persistence errors reach the cron's `failed` counter; preference suppression is counted separately. | Implemented locally, regression tested. |
| F3: money units | £5,000 threshold uses pound values; escrow and failed-payment messages format pounds directly. | Implemented locally; boundary and amount tests pass. |
| F5: missing push tokens | Queue retry stops immediately when the dispatcher reports `no_push_tokens`, retaining an explicit terminal failure. Transient provider failures retain bounded retries. | Implemented locally; historical uncertain attempts remain for review. |
| F6: assessment safeguards | Shared atomic request counter independent of saved rows; production fails closed when the distributed limiter is unavailable. Job membership is verified before inference. Save failures propagate, fallback/no-detection results use the common save path, and a database error cannot trigger another paid fallback. Provider failure cannot recurse indefinitely or return a misleading successful “no issue detected” result. | Implemented locally; rate-limit, authorization, persistence and failure tests pass. |
| F7: critical dependencies | Sentry Next.js pinned to 10.75.2; every DOMPurify copy pinned to 3.4.17. Removed incompatible global Sentry v7 overrides; each web/mobile SDK resolves its matching components. Added a shared OpenTelemetry API 1.9.1, compatible with Sentry and the core package's `<1.10.0` peer range. | Installed and lockfile updated; critical advisory count reduced to zero. |
| Test failures | Updated the recurring-category expectation to canonical `handyman`, mobile auth fixtures to provider error codes and actionable messages, and the API client's retry expectation to zero. | All previously selected tests pass. |

The existing notification API retains best-effort behavior for its other callers. Admin alert delivery opts into explicit persistence errors. Strict push-only notifications are durably queued so a missing in-app row is not confused with preference suppression. This limits the behavioral change to the operations whose cron success depends on durable notification creation.

## Verification

- First focused run: 87/87 tests passed.
- Expanded web run: 1,401/1,401 tests passed, including the previously audited payment/webhook suites, new regressions, notification delivery, sanitization and fail-closed rate limiting.
- Final notification review: 21/21 tests passed, including one additional push-only durability case. Rerun overlap is not added to the expanded-run count.
- Mobile run: 1,023/1,023 tests passed across 55 suites. Jest still reported open asynchronous handles after its assertions; this is not device-runtime verification.
- Mobile TypeScript: passed.
- ESLint on all modified server implementation files: passed with zero errors or warnings.
- Sentry's actual installed module loads after correcting the OpenTelemetry dependency resolution. The initial build attempt exposed that issue and was stopped; the corrected build is recorded separately.
- Production webpack build: passed, including TypeScript and 547/547 static pages. Sentry's Node, Edge and Client integrations ran. Source-map upload was intentionally unavailable without a real token. The final push-only adjustment was subsequently checked with focused tests and a standalone type check, rather than rerunning the entire bundle build.
- Final standalone web TypeScript: passed after the last notification adjustment. The result is in `remediation-web-types-final.log`.
- Final implementation lint and `git diff --check`: passed. A clean-install dry run (`npm ci --ignore-scripts --dry-run --no-audit --no-fund`) accepted the manifests and lockfile.
- Dependency audit after the security updates: 67 entries — zero critical, 52 high, 11 moderate and 4 low (down from 78 entries with two critical). Remaining advisories span build/test/mobile dependency chains and require separate compatibility work. Do not use a forced audit fix: its proposed changes include major-version changes and downgrades of core tooling.

The local test/build runner uses dummy service credentials. No production payment, refund, notification, email, user or database mutation was performed. Existing user changes were preserved.

## Outstanding operational work

**Later operational follow-up:** see [OPERATIONS.md](OPERATIONS.md) for current dispositions. The four uncertain push attempts now have evidence-backed reviews, staging has been restored with schema drift identified, and a separate Stripe receiver has been deployed and verified with a signed non-financial probe. The existing Stripe destination now points to the receiver and is Active. A new provider-generated delivery remains to be verified. The findings below describe the earlier remediation checkpoint.

**Payment reconciliation (F4).** The two identity mismatches and two missing-resource outcomes cannot be safely cleared from their aggregate records alone. Compare each payment intent in the correct Stripe account and mode with the escrow, job, payer, contractor, funding reservation and webhook history. The current payment-intent creation code writes the identity fields that reconciliation expects; the audit did not establish a source bug causing these specific historical records. No configured Stripe credential was found in the standard environment files in this checkout. Record the disposition and correct the source of truth before requesting a reconciliation rerun. Do not charge, refund, release funds or mark an exception matched merely to remove the warning.

**Uncertain push delivery (F5).** Four old attempts need provider/journal evidence. Existing admin review functionality can record an evidence-backed disposition, but the audit cannot infer whether a device received an uncertain push. The missing-token change prevents futile future retries; it does not rewrite the three historical terminal failures or pretend the four uncertain attempts were delivered.

**Beta acceptance (F8).** Sign in with designated test users and run the homeowner, contractor, admin and tenant journeys in the audit matrix. Use current signed Android/iOS artifacts, verify crash symbolication, delivery/deep links, offline recovery, and intended API access through the restricted-beta deployment setup. The named staging database remains inactive; enabling it or provisioning fixtures is separate operational work. No current native-device test or app-store submission was performed.

**Other hardening.** Supabase leaked-password protection, the pending database engine update, representative load/restore tests, remaining dependency chains, and Node 20/24 runtime alignment remain open. Avoid downgrading the production runtime solely to match an older local toolchain; plan and verify a supported runtime consistently across local, CI and release environments.

## Rollout checks

1. Review and deploy the code and lockfile together to the intended beta environment. No schema migration is needed for these changes; the existing metadata columns carry deduplication keys.
2. Verify the production build ID, Sentry initialization and source-map workflow for the deployed artifact.
3. Run the admin-alert job in the controlled environment with two recipients. Verify short types, correct pound amounts, per-recipient retry behavior and truthful cron failure reporting.
4. Verify the assessment limiter's Redis configuration; an unavailable distributed limiter should reject inference, not run without a shared quota.
5. Confirm the missing-token queue outcome is terminal and provider-transient failures still retry. Then perform device delivery checks.
6. Resolve the provider-backed payment/push exceptions with recorded evidence and update the readiness decision.

Test logs, dependency audit results and the dependency version delta are stored alongside this note. No commit, push, production deployment or protection change was made by this remediation pass.
