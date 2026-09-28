# Native dispute access — 24 September 2026

Native users previously had a dispute submission form but no registered detail screen to revisit
status or evidence. Added DisputeDetails with the same authorized live/retained reader used by the
web app.

## Reachability and behavior

- Confirmed submission replaces the form with the exact returned escrow dispute record.
- Job quick actions expose the reader for an owner, designated payer or assigned contractor when a
  payment exists. The server independently authorizes both escrow lookup and dispute access.
- Disputed payment-history cards navigate by the exact payment ID, without requiring a job-page
  visit.
- `disputes/:escrowId` is registered and the shared native/universal-link path inventory includes
  dispute children. Android needs a rebuilt binary for the new manifest path; hosted association
  changes require the normal application release.
- Archived does not imply resolved. Missing statements, resolutions and evidence are shown honestly;
  raw attachment references are omitted from the displayed statement.
- Opening an attachment first refreshes authorization and obtains a new link. Only HTTPS signed
  job-attachment URLs at the configured Supabase origin may open. Failed refreshes hide old details;
  account/route changes or leaving the screen prevent the pending request from opening evidence.
- Dispute query keys include the account, are removed when unused, and are excluded from disk
  persistence. Restore now also rejects all configured sensitive query prefixes, including legacy
  cache entries.

## Verification

72 tests passed in four native suites: dispute detail, submission, query-cache privacy and Android
intent filters. Tests use the real reader/parser and React Query with mocked HTTP/native boundaries.
Checks cover exact payment/job identity, malformed responses, retained records, safe origins,
renewal failures, retry, account changes, navigation entry actions, persistence and restoration
exclusions. Mobile type check passed. Repository commit checks run separately.

No SQL migration, hosted data mutation, real-user messaging, payment or deployment was required.
This is automated native-component verification, not a new device run. Current release
binaries/physical iOS and Android devices remain open. Job-based lookup uses the latest payment;
direct payment IDs support older/retained records but an archive discovery list and closed-account
identity recovery remain separate unfinished work.

## Real local Android follow-up

The current JavaScript ran in the dedicated Android 36 audit emulator with an existing debug binary,
real isolated Supabase Auth/Database/Storage, and the actual Next API through temporary HTTPS
tunnels. Three synthetic accounts and a private one-pixel PNG were used; no payment or production
data was involved.

- The homeowner signed in through the login screen and opened the dispute deep link. Its live
  statement and explicitly unavailable legacy evidence appeared.
- Opening the valid attachment refreshed the record and handed off to Chrome over HTTPS. Separate
  authorized API requests retrieved actual PNG bytes with image/png, not an application page.
- Deleting the synthetic canonical dispute through the normal retention trigger preserved access:
  homeowner and contractor each received the retained record and PNG; an unrelated account was
  denied both before and after archival.
- Returning to Android displayed the retained statement and the warning that archival does not mean
  resolution. Removing the synthetic object then refreshing showed both attachments unavailable.
- Removing the synthetic account and refreshing returned to sign-in without showing dispute data.

Cleanup removed active fixture records/accounts/object and the credential file, uninstalled the test
app, cleared Chrome data, stopped the audit emulator, and closed all three tunnels and owned local
servers. Protected synthetic archive/access records remain in the isolated database; no retention
control was bypassed. The ignored diagnostic cleanup initially used actor_id instead of changed_by;
that diagnostic-only column mismatch was corrected and cleanup then succeeded.

Limits: this was not a current release binary or physical device. Metro advertised HTTP font/icon
assets, correctly blocked by Android, so full visual acceptance is not claimed. Splash sign-in taps
were inconclusive; the supported login deep link and actual login form worked. New HTTPS manifest
association paths, closed-account identity recovery, archive discovery, external object
preservation, and provider/backup disposal remain separate gates.

## Native archive discovery follow-up

Payment history now opens an in-app retained-dispute list rather than hardcoding the production
website and requiring a separate browser session. The list uses the existing participant-authorized
API, validates IDs/dates, opens the exact escrow record and explicitly states the latest-50 limit.
Focus/refresh rechecks access; failed refresh hides earlier data. Its account-specific query uses
the existing sensitive dispute cache prefix and zero unused-cache lifetime. Signed-out and empty
states are explicit. Native `disputes` navigation is registered alongside the detail path.

Seventeen focused native list/detail tests pass, including failed refresh/retry, account switch,
malformed response rejection and exact record navigation. Mobile types pass. This new list has
component verification only; the Android run above verified the detail reader before this change.
Pagination beyond 50, closed-account identity recovery and release-device acceptance remain open.
