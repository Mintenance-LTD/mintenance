# Mintenance agency repair pilot

This branch adds the first staff-operated slice to the existing homeowner Agency view in Mintenance. Select **Agency** in the homeowner view switcher, then **Open Agency workspace**. That opens the existing Portfolio workspace; there is no separate app, sign-in, or account. **Agency → CRM** goes straight to the landlord directory. Edit the directory on web; the native directory is read-only and sends eligible staff to the same workspace on the web. It does not dispatch contractors, invite a landlord, publish a listing, or move money.

## Staff acceptance

Set up a synthetic agency workspace with an owner, a maintenance coordinator, a non-staff account, and two explicitly synthetic properties.

1. As workspace owner, open Portfolio, then **Manage workspace → Document branding**. Save the business name, an accent colour, and a small PNG or JPEG. Create a new check-in and a new check-out on a linked property. Compare exports from web and native, and confirm a report saved before the settings change is unaffected. Change branding again and confirm an already saved report retains its own branding.
2. From the Agency dashboard open **CRM** and add a landlord on web with a primary and backup manager, a linked property, and a £150 works authorisation limit. Confirm a coordinator can read but not edit it, an unassigned external account cannot see it, and a property cannot be attached to two landlords in the same workspace. On mobile, open the same CRM and confirm it shows only the selected agency. The recorded limit does not automatically enforce, notify, or approve anything.
3. Open an internal Portfolio ticket on the linked property and select **Open work order**. Record the agency contractor or work arranged elsewhere. Enter a £240 quote and confirm the approved, invoiced and paid fields remain blank. After a synthetic off-app approval and invoice, record those amounts and references. Save a recorded partial payment only after the synthetic payment evidence step.
4. Open the exact ticket in the native Portfolio Inbox and verify the same record and costs. Update the completion note on one device, then check from the other. If both edit the same revision, confirm the stale save is rejected and the draft can be copied before reloading.
5. Confirm the work never appears as a marketplace listing and no payment, message, or invitation was sent. All data must remain in staging.

## Next product slice

- **Landlord portal:** explicit, revocable access to that landlord's linked properties only, with a separate identity from agency staff. Show approved-for-sharing updates, documents, and expenditure; no staff notes, other landlords, or access details. Require named approval of the exact quote revision before instruction where policy requires it. Record property/repair-level overrides and keep an audit trail.
- **Direct contractor dispatch:** verified access to explicitly assigned work only. Add quote revision, attendance, evidence and invoice submissions; capture agency acceptance and closeout without requiring marketplace bidding or payment. Keep a distinct, deliberate opt-in marketplace action and retain the source repair.
- **Generated documents:** extend snapshotted branding to generated work orders and landlord cost summaries, then agency agreements. Do not change uploaded invoices, third-party certificates, or previously signed documents.
- **Native parity:** phone-first approval and contractor upload after the restricted flows exist. Keep branding setup on web and reuse the stored branding on both platforms.

## Staging device launch gate

Use the separate Mintenance Native QA Vercel project and staging Supabase reference `pzothyoipifjwnypzcuv`. Never use existing production-bound Expo profiles for write tests. For each build, confirm API, API gateway, Auth, Share links, payment sandbox or verified disabled state, and the embedded bundle all resolve to staging. Verify an actual native request can reach the app's authentication layer without a browser session. Keep Vercel deployment protection on; no privileged credentials belong in the mobile app.

Run Android against a compatible APK and iOS against an explicit iOS Simulator build of the same Git revision; pin both to the same isolated backend. Record the two Expo build IDs, Git SHA and smoke-check results. A web preview, Jest test, or compiled build is not a device pass.

Local verification:
- `npm run build:packages`
- `npm run type-check:web` and `npm run type-check -w @mintenance/mobile`
- Run the focused agency and Portfolio tests in the web workspace, and Portfolio Inbox and action queue tests in mobile.
- For the two disposable SQL fixtures, install `@electric-sql/pglite@0.6.0` in a temporary directory and set `PGLITE_MODULE` to that installation's absolute `dist/index.js` path. Then run `node scripts/test-agency-repair-work-order-migration.mjs`, `node scripts/test-agency-landlord-records-migration.mjs` and `node scripts/test-agency-repair-pilot-integration.mjs`. No hosted database is contacted.

Only apply the three agency migrations to a separately verified staging database for this pilot; do not promote, merge or apply them to production.
