# Mintenance agency repair pilot

This branch adds the first staff-operated slice to the existing homeowner Agency view in Mintenance. Select **Agency** in the homeowner view switcher, then **Open Agency workspace**. That opens the existing Portfolio workspace; there is no separate app, sign-in, or account. **Agency → CRM** goes straight to the landlord directory. Edit the directory on web; the native directory is read-only and sends eligible staff to the same workspace on the web. Staff can link a landlord’s existing verified Mintenance account and assign authorised work privately to a verified contractor account. It does not send invitations or external notifications, publish a listing, or move money.

## Staff acceptance

Set up a synthetic agency workspace with an owner, a maintenance coordinator, a non-staff account, and two explicitly synthetic properties.

1. As workspace owner, open Portfolio, then **Manage workspace → Document branding**. Save the business name, an accent colour, and a small PNG or JPEG. Create a new check-in and a new check-out on a linked property. Compare exports from web and native, and confirm a report saved before the settings change is unaffected. Change branding again and confirm an already saved report retains its own branding.
2. From the Agency dashboard open **CRM** and add a landlord on web with a primary and backup manager, a linked property, and a £150 works authorisation limit. Confirm a coordinator can read but not edit it, an unassigned external account cannot see it, and a property cannot be attached to two landlords in the same workspace. On mobile, open the same CRM and confirm it shows only the selected agency. The limit is enforced when assigning private work in Mintenance, not when staff log off-app financial records. Without a linked landlord account, the system does not allow assignment.
3. Open an internal Portfolio ticket and save **Open work order → Our contractor**, then open **Quote approval and private assignment**. Save a synthetic £240 quote and scope. With a £150 limit, assignment must stay unavailable. From that landlord’s linked account open **Agency quote approvals** and approve the exact amount and version. Before assignment revise the quote to £275. The old decision is kept as history but must not authorise the new quote. Approve the new version before staff can assign it. An explicit decline blocks assignment even under the limit until revised.
4. In the staff view, assign the approved quote to a verified synthetic contractor by exact account email. That account opens **Private work orders** and accepts; other contractors and other landlords must not see it. Staff can revoke the assignment without implying any off-app booking was cancelled. Use the same ticket on phone and web; confirm a stale edit must reload. The invoiced and recorded-paid fields are still separate manual records.
5. Confirm the work never appears as a marketplace listing and no payment, message, or invitation was sent. All data must remain in staging.

## Next product slice

- **Broader landlord portal:** quote approval is built. Add explicitly shared property updates, documents and expenditure; keep internal notes and access details private. Add property and repair-level manager overrides.
- **Contractor on-site handover:** private assignment and acceptance are built. Add appointment proposals, evidence and invoice uploads, agency closeout, and a deliberate marketplace opt-in if an existing contractor cannot take the work.
- **Generated documents:** extend snapshotted branding to generated work orders and landlord cost summaries, then agency agreements. Do not change uploaded invoices, third-party certificates, or previously signed documents.
- **Native parity:** verify approval and acceptance on actual Android and iOS simulators. Keep branding setup and landlord identity linking on web; reuse the saved brand on both platforms.

## Staging device launch gate

Use the separate Mintenance Native QA Vercel project and staging Supabase reference `pzothyoipifjwnypzcuv`. Never use existing production-bound Expo profiles for write tests. For each build, confirm API, API gateway, Auth, Share links, payment sandbox or verified disabled state, and the embedded bundle all resolve to staging. Verify an actual native request can reach the app's authentication layer without a browser session. Keep Vercel deployment protection on; no privileged credentials belong in the mobile app.

Run Android against a compatible APK and iOS against an explicit iOS Simulator build of the same Git revision; pin both to the same isolated backend. Record the two Expo build IDs, Git SHA and smoke-check results. A web preview, Jest test, or compiled build is not a device pass.

Local verification:
- `npm run build:packages`
- `npm run type-check:web` and `npm run type-check -w @mintenance/mobile`
- Run the focused agency and Portfolio tests in the web workspace, and Portfolio Inbox and action queue tests in mobile.
- For the two disposable SQL fixtures, install `@electric-sql/pglite@0.6.0` in a temporary directory and set `PGLITE_MODULE` to that installation's absolute `dist/index.js` path. Then run `node scripts/test-agency-repair-work-order-migration.mjs`, `node scripts/test-agency-landlord-records-migration.mjs` , `node scripts/test-agency-repair-pilot-integration.mjs` and `node scripts/test-agency-private-dispatch-migration.mjs`. No hosted database is contacted.

Only apply the four agency migrations to a separately verified staging database for this pilot; do not promote, merge or apply them to production.
