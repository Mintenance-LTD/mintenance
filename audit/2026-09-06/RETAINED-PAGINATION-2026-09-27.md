# Retained dispute pagination — 27 September 2026

Starting commit: 47a96c365 on codex/migrate-next-proxy; clean working tree.

The retained-dispute list previously stopped after 50 database rows, potentially fewer visible
payments after deduplication. Both clients described that limit but provided no path to older
records. This retention-discovery defect is repaired in the API, web list and native list.

The API now requests 51 rows, returns at most 50 and supplies a continuation cursor using the last
raw row's archive timestamp and dispute UUID. Both fields are strictly validated before constructing
database filters. Descending timestamp/UUID ordering resolves tied timestamps; participant
containment remains mandatory on every page regardless of the supplied cursor. The cursor is a
position, not an access token. No archive evidence or participant IDs are added to the response.
Multiple rows for a payment remain deduplicated in the displayed list; the cursor advances over raw
rows so duplicate payment references cannot hide subsequent pages.

Web and mobile offer Load older records, validate response identifiers, deduplicate loaded links,
and retry the failed cursor. Loading/error states hide displayed evidence, preserving existing
fail-closed refresh behavior. Native cache keys remain account-scoped and excluded from persistent
sensitive-data caching. Existing clients can ignore the added nextCursor field; new clients accept
older responses without it. No database schema migration is needed or was applied for this change.

Validation:

- 11 focused web/API tests passed across three files, including existing private evidence renewal,
  cursor validation, participant filter on subsequent pages, duplicate payment references, database
  failure, malformed responses, and retrying an older page.
- Five native component tests passed: exact private-reader navigation, failed-refresh hiding,
  account switch/sign-out, malformed identifier rejection and failed-next-page retry.
- Local PostgreSQL rollback-only regression on the isolated audit stack: 65 archives with identical
  microsecond timestamps, 50/15 pages, no overlap with an intervening newer archive, and five
  separate participant rows isolated. All inserted fixtures rolled back. This validates actual query
  semantics; it is not an end-to-end browser or device pagination run.

Added artifacts: retained-pagination-regression.sql and API/web pagination regression tests. No
production business data was read or changed, no retention protection was bypassed, and no
application deployment was requested. Physical-device/iOS acceptance, processor/backup disposal,
closed-account export, complete invitation onboarding and hosted operational evidence remain
separate readiness requirements. This does not declare the overall product launch-ready.
