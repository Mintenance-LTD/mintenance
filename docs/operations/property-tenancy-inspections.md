# Tenancy folders and member-only inspection reports

PR1451 remains draft. Do not mark ready, merge, submit native builds, run Detox or publish OTA
updates.

## Scope

Web and React Native property management include dated tenancy folders and check-in, routine and
check-out reports. Editors can rename folders or add an end date using revision checks. Reports save
written observations and up to 50 existing room-photo references atomically. Saved reports are
append-only: corrections are new reports.

Only the property owner and accepted property members can read reports and their images. Owners,
accepted admins and managers can create/edit folders and create reports when the property owner's
existing Landlord/Agency room-photo entitlement allows it. Selecting a presentation view grants no
access. A global application admin without property membership has no exception. Existing history
remains readable after a plan downgrade.

Sharing copies an authenticated report-page link (native uses the system share sheet). It does not
send invitations, email or notifications. Tenant contact records alone do not grant report access.
Image routes check membership and property/report/photo associations on each request, return
no-store responses, and do not issue public or signed image URLs. The native image response is an
authenticated, bounded base64 response, with no persistent query cache.

The inspection date is author-entered; photo dates are existing upload timestamps in UTC, not
verified capture evidence. Report text and attachment metadata are preserved, but original images
remain live references. Deleting an original leaves its report entry marked unavailable. This is not
an immutable image archive, signed legal inspection or compliance certificate.

## Migration review and deployment hold

Prepared file: `supabase/migrations/20261030223935_property_tenancy_inspection_reports.sql`. **Not
applied to production.** Preview and production connected to an unmigrated database show
unavailable/retry instead of pretending records were saved. Applying this migration requires
separate authorization. Do not bulk push other pending migrations.

The migration creates three tables, their indexes and four service-only SECURITY INVOKER functions.
All tables have RLS enabled and no PUBLIC/anon/authenticated privileges. The existing API verifies
current membership for reads; writes additionally verify membership inside the transaction and lock
the property/membership/photo rows. Service grants permit insert/read, plus only folder
label/date/revision updates. Report/photo updates and deletes are not granted. Existing tables
receive no schema/data/privilege changes. No tenant accounts, invitation, notice, payment or
backfill is performed.

The existing release migration checker automatically includes this new file, so a production release
requires its recorded prerequisite. Do not weaken that gate.

Before an authorized selective application: confirm exact PR head and SQL, existing canonical
properties/profiles/property_team_members/property_room_photos types, table/function absence and
migration history. Apply only this reviewed file. Afterwards verify table constraints, indexes, RLS
and effective grants; function signatures/invoker mode/search_path; recorded migration statements
and version/name mapping; read-only API projections. Verify user flows using separately approved
test records, including another existing member and a nonmember. No such production test records
were created during implementation.

Rollback is data-preserving: disable new UI/code access while retaining these new tables. Do not
drop records or functions under active traffic. Removal requires a separate retention and rollback
decision.

## Validation

- `npm run test:inspections --prefix scripts/db-tests`: disposable actual PostgreSQL, no app
  environments or production connections. Covers role revocation, cross-property folder/photos,
  limits, dates, atomic failure, immutable reports, deleted-photo history, folder revision
  conflicts, RLS and direct-client denial. Runs in the existing real-DB CI workflow.
- Focused Vitest API/UI tests cover authorizers, owner-plan checks, no false empty success, bounded
  input, safe image delivery, dates, CSRF and folder/report forms.
- React Native Jest tests use the authenticated client boundary, including read-only states, dates,
  creation, retry and folder edits.
- Web/mobile type checks and changed-source lint; actual YAML draft-native guards.
- Actual web components reviewed at 320/375/768/1280 and native components rendered through React
  Native Web at 375/768 with synthetic records. This is not physical-device verification.
- Aikido MCP is unavailable; no Aikido scan result is claimed.
