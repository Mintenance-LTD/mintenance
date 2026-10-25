# Onboarding UI correction — 25 October 2026

The reported production screenshots exposed a layout regression that the original component tests did not cover. Both utility wrappers used `.me-root`, which has `min-height: 100vh`. Browser measurements on the reported deployment confirmed each wrapper consumed a full viewport before the dashboard began.

## Correction

- The onboarding provider no longer renders layout before the dashboard shell. Its compact card is placed inside the homeowner and contractor dashboard content, with role-specific copy, quick tour and guide links.
- Eligible users see a compact benefits row. The dedicated guide page retains the detailed benefits list. No notice is shown for ineligible accounts.
- Component styles are isolated from the page-height class. Removed global `guide` substring selectors that hid legitimate guide UI.
- The tour has a visible progress track, themed controls, a real spotlight, a phone sheet layout, keyboard focus trapping/return and body/root scroll locking. Welcome/final steps no longer link to an unrelated feature.
- An unavailable progress request does not auto-launch a first-visit tour. Manual tours remain usable locally and retry remains available in a compact disclosure.
- Contractor Mint Editorial navigation now uses the same phone drawer as the homeowner shell; dashboard metrics and columns stack responsively.

## Verification

The isolated fixture in `apps/web/e2e/onboarding-preview` renders the actual dashboard/shell/onboarding components and actual global CSS. Identity, network responses and dashboard records are sample data. This validates rendering and interactions, not deployed authentication or database persistence.

Browser checks covered desktop, 390×844 and 320×568 phone widths: visible dashboard content, compact cards, welcome and feature steps, target highlighting, skip and focus return, scroll locking, and the failed-progress state. The failed-progress case had zero dialogs and the main content began at 60px. At 320×568 the welcome dialog fit inside the viewport and both footer controls were visible. Contractor phone layout measured a 343px onboarding card within the 375px content area; the sidebar was off-canvas when closed. The team-member tour used its five-step journey and omitted business setup.

Screenshots below show sample accounts, not production customer data:

- [Desktop dashboard](desktop-dashboard.jpg)
- [Desktop welcome](desktop-tour.jpg)
- [Desktop feature spotlight](desktop-feature.jpg)
- [Phone dashboard](mobile-dashboard.jpg)
- [Phone welcome](mobile-tour.jpg)
- [Small-phone feature step](small-phone-feature.jpg)
- [Contractor phone dashboard](contractor-mobile.jpg)
- [Team-member tour](team-member-tour.jpg)

Web TypeScript passed. The 18 focused onboarding regression tests passed (progress races/retries, failed-load auto-start, role catalogue and keyboard behaviour). Changed-component ESLint passed with four pre-existing warnings in the legacy dashboards.

## Production prerequisite

Read-only verification found `public.onboarding_journeys` absent and migration `20261024142808` unapplied in production. Vercel logs for the reported deployment show `GET /api/onboarding/progress` returning 500. The existing migration must be reviewed/applied as part of release; it also creates inbox benefits notifications for existing eligible grants. This UI correction does not apply migrations or deploy production. Native-device acceptance from the original remediation remains outstanding.
