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
