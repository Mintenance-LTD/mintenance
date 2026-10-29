# Onboarding remediation — 24 October 2026

Implementation branch: `fix/onboarding-oct24`, based on `f74655d5`.

This change implements the onboarding audit's core fixes in an isolated checkout. It has not been deployed, and the database migration has not been applied to staging or production. No notification has been sent to a real user.

## User experience

The shared catalogue contains 43 feature-family guides. Web `/getting-started` and native `GettingStarted` provide separate paths for homeowners, landlords/property managers, agencies, tenants/property contacts, contractor business owners, contractor team members and platform admins. Each path starts with a relevant first action and supports browsing, searching, moving to the next guide, reopening the feature and recording that guidance was read.

Homeowner contexts are selected by the user: an Agency entitlement does not mean someone is operating an agency. Active contractor-company membership suggests the owner or team-member path. Owners of any active contractor company retain the owner path. Membership selection is educational and never changes authorization. Existing destination checks remain authoritative.

The homeowner and contractor dashboard tours are replayable. Web feature pages expose contextual guide links. Native dashboards expose the guide catalogue; primary jobs/messages actions open their native tabs, and native profile/business features open registered screens. Web-only features explicitly open in a browser and may require sign-in. Native admins receive admin guidance and web destinations instead of the homeowner dashboard or introduction.

## Audit disposition

| Finding | Implementation |
|---|---|
| F1: browser saves fail CSRF | Contractor setup, payout setup and invitation acceptance use `fetchWithCsrf`. Payout setup now calls the existing Stripe Connect onboarding endpoint. |
| F2: benefits granted without notice | Migration adds an atomic award-to-inbox trigger, deduplication by grant ID and an idempotent backfill for existing valid grants. |
| F3: homeowner shown contractor benefits | Shared copy differentiates Agency and Business benefits. Contractor fees come from the subscription response, with no hard-coded fee or lifetime promise. |
| F4: preferences suppress tour | Homeowner preferences have their own saved completion field. Platform education uses independent versioned journeys. Native recognizes existing saved preferences. |
| F5: contractor entry disconnected | Signup/verification returns to business setup. Dashboard starts the relevant introduction. Wizard reloads saved business, skills, service area and insurance data. Team members are routed to team guidance. |
| F6: state leaks between users | Journey progress is keyed by user, platform, version and journey. Local prompt dismissals are scoped by user, and the native gate stack remounts on account changes. |
| F7: theme and targets | Web tour and contractor form controls use Mint Editorial tokens; sidebar tutorial anchors are present. Native introduction, prompts, guides and benefits resolve the active theme on render. |
| F8: finish/skip and failed writes | Finish records completion; skip records skipping. Web pending writes retry, reject non-OK responses and resist stale GET responses. Native guide saves expose retry. Repeated legacy completion calls preserve the first recorded intro timestamp. |
| F9: persona journeys | Seven guide paths, membership-aware contractor/team introductions, distinct team slides, owner-only service-area/payout prompts and explicit admin handling. |
| F10: feature discovery/replay | Shared 43-guide catalogue, web contextual links, dashboard entry points and replay. Reading guidance is deliberately separate from completing the actual feature or setup. |
| F11: accessibility | Tour has dialog semantics, keyboard focus containment/restoration, Escape, labelled controls and constrained scrolling. Native intro slides scroll and respond to window size; progress no longer animates. Real-device/screen-reader acceptance remains required. |
| F12: cohort allocation race | Automatic awards use a transaction advisory lock per role before counting and allocating slot 100. The phone-verification waiver cohort remains independent. |

Additional entry-point fixes preserve the exact onboarding/invitation return path through login, and native example job cards are now described as examples rather than live nearby work.

## Validation

- Web and mobile TypeScript checks passed.
- 36 focused web tests passed across seven suites: role entry points, feature destinations, private progress writes, rejection/retry, stale fetches, preferences independence, keyboard focus and safe login redirects.
- 160 focused mobile tests passed across 19 suites: permission/setup gates, account switching, membership audience selection, saved preferences, intro outcomes, role-specific benefits and theme-aware components.
- Six isolated PostgreSQL 17 checks passed: role-specific backfill, deduplication, grant-trigger delivery, write permissions, private independent progress, and concurrent allocation of the final cohort place.
- Changed-source ESLint completed with no errors. Existing array-style/empty-interface/unused-helper warnings remain in touched files.
- All 43 web guide URLs resolve to existing route files; every catalogue native profile destination is registered.

Focused commands (from the repository root unless noted):

```text
npm run test:onboarding --prefix scripts/db-tests
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p apps/mobile/tsconfig.json
npx jest --config apps/mobile/jest.config.js --runInBand --testPathPattern="Gate.test|HomeownerSetupRecovery|onboarding/__tests__|useOnboardingAudience"
```

Web suites, from `apps/web`:

```text
npx vitest run hooks/__tests__/useJourneyProgress.test.tsx app/api/onboarding/progress/route.test.ts app/api/homeowner/onboarding/complete/route.test.ts lib/onboarding/catalogue.test.ts components/onboarding/TutorialSpotlight.test.tsx components/onboarding/GuideHub.test.tsx lib/utils/__tests__/safe-redirect.test.ts
```

The local test setup reused installed dependencies via junctions. Database checks created and removed an isolated loopback-only cluster and did not load application environments. Windows sandbox restrictions required running test runners outside the sandbox for temporary file renames.

## Release acceptance still required

1. Verify `EARLY_ACCESS_ENABLED` is enabled in the intended environment, review the award cohort and apply `20261024142808_onboarding_journeys_and_early_access_notices.sql` to staging before the app code. Applying it creates real inbox notifications for existing grants; it does not send push or email and does not create new grants during backfill.
2. Exercise fresh signup, email verification, invitation acceptance, contractor setup and a real Stripe test-mode return in a staging browser. Verify saved values survive refresh and that role/member journeys appear as intended.
3. Check desktop, narrow mobile web, iOS and Android visually, including dark mode, large text, rotation, screen readers, permission denial, offline recovery and account switching. Automated component tests are not physical-device or visual sign-off.
4. Verify an eligible homeowner and contractor each see one inbox notice, correct benefit copy and working benefit destinations. Verify an ineligible account gets neither notice nor benefit banner. Confirm the deployment's notification delivery infrastructure does not independently send push/email for raw inbox inserts if those channels are not intended.
5. Release web/API and then the mobile build after staging acceptance. Existing builds continue using the legacy completion endpoint; the new journey table is additive.

The catalogue covers feature families, not a separate interactive tour for every detail screen or every permission-specific organization workflow. Cross-device persistence covers education progress and completed preferences; OS permission prompts and temporary nudges retain device-local, account-scoped dismissal state. Complete staging and device acceptance before calling the full onboarding audit closed.

## 25 October visual correction

The first implementation was not visually accepted: the user reported full-viewport blank panels before the dashboard. This is corrected by moving a compact onboarding surface inside dashboard content, isolating component CSS, and fixing the global rule that hid guide elements. Desktop and phone browser evidence, fixture instructions, and the confirmed missing production migration are recorded in [onboarding-visual-checks/README.md](onboarding-visual-checks/README.md). These fixture checks do not replace the remaining live signup, database rollout or native-device acceptance above.
