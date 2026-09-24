# Money/contracts and management acceptance follow-up

Readiness is not yet established. Neither broad gate is declared closed by this run. Source
baseline: `8352d648f5417afa36253fa3aa70a1796fea7f82`, branch `codex/migrate-next-proxy`. The working
tree was initially clean.

## Executed against real local services

The isolated application on port 3018 used local Supabase on 55321. Synthetic accounts only; email
providers were unconfigured. An authorized temporary HTTPS tunnel exposed synthetic Auth/storage,
with that exact hostname added to the audit server's normal image allowlist. Private-network URL
protections were not disabled. No Stripe operations, webhook changes, production data changes, SQL
migrations, or deployment actions occurred during this follow-up.

- Five-role property matrix passed separately with real web cookies and Supabase bearer tokens:
  owner, manager, team administrator, viewer, unrelated homeowner. Includes reporting-link
  revocation, contact/schedule writes, conflicting schedule edits and invitation identity/retry.
- Owner removed the accepted manager through the team API. Without refreshing that manager's
  session, four resource reads and three concurrent writes were denied; owner access survived.
- Real upload → job creation → bid submission → acceptance/retry → generated contract → dual
  acceptance-signature route calls passed in both cookie and bearer modes. Exactly one contract
  persisted, both signature timestamps were present, unrelated acceptance/signing was denied, and
  unfunded job start returned 400. No accepted bid or signed contract was seeded.
- Baseline verification, payout-readiness flags and trial entitlement **were fixtures** for the
  contract diagnostic. The synthetic Connect ID is deliberately not a provider account. This
  diagnostic proves no payout, onboarding, payment funding or completion journey.
- Edge browser: actual synthetic manager login, shared-property discovery, recurring-task form,
  owner revocation while input remained open, and subsequent save. Reproduced the crash below, then
  repeated with fresh fixtures after the fix: navigated to Properties; shared property and private
  cards absent; no crash or false success.
- Focused tests: 3 files / 59 tests passed, exit zero: upload authenticated limits,
  escrow-lifecycle, recurring-form-confirmation. Escrow tests use mocked providers/database; their
  success is not new real-provider fault-recovery evidence.

## Confirmed defects fixed

1. `apps/web/app/api/upload/route.ts`, POST: the separate upload limiter inferred anonymous access
   from absent cookie-proxy identity headers even after bearer authentication succeeded. Anonymous
   upload allowance is zero, so a legitimate mobile request returned 429. The route now explicitly
   supplies its verified user ID and verified role to the limiter. Limits remain enforced. Real
   bearer upload subsequently succeeded; four regression cases cover homeowner, contractor,
   administrator, forged identity headers and exhausted allowance.
2. `apps/web/app/properties/[id]/components/RecurringMaintenance.tsx`, handleAdd: a revoked manager
   received the normal structured API error `{error:{code,message}}`; passing that object to
   react-hot-toast crashed React with “Objects are not valid as a React child”. The route denied the
   write, but the entire UI crashed. The component now extracts string errors and navigates to the
   server-authorized property list for 401/403/404. Other failures preserve form input. Component
   regression and the real browser retest passed.

## Reproduction artifacts and limits

`property-management-http.cjs`: set AUDIT_WEB_URL to the isolated localhost URL; run normally for
cookies or with --bearer. It creates and removes its own synthetic fixtures.
`contract-journey-http.cjs`: same arguments; AUDIT_STORAGE_ORIGIN must be the authorized HTTPS
origin forwarding the isolated storage service, allowlisted in the audit server. It uploads an
actual generated PNG through the upload API. Default local storage is intentionally rejected by job
URL validation. Do not use either diagnostic against a hosted application.

No full build/coverage rerun is claimed here. Native UI was not exercised in this follow-up: bearer
HTTP proves API compatibility, not Android screen behavior. The complete combined funded job → work
evidence → approval → release journey with injected provider/database failures remains required, as
do broader management forms, native revocation and interruption acceptance. Prior sandbox payout/3DS
evidence remains valid within its separately documented scope.
