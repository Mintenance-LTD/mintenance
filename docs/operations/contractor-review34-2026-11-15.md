# Contractor review: 34 findings — 15 November 2026

Based on main b72d3eb7dc16be5fb866aef661fdb4dab2223806. These changes require review, the quote-expiry migration and deployment before they are live.

## Source checklist

- [x] **1.** Assigned retains Waiting to start; in_progress is distinct.
- [x] **2.** Dashboard uses shared conditional release guidance.
- [x] **3.** Dashboard, Finance and Marketing use complete caller-scoped released-net totals; held/refund balances remain separate.
- [x] **4.** Unfinalized zero fees are ignored; minimum-fee estimates are distinct from recorded release amounts.
- [x] **5.** Platform-paid processing fees are not described as a second contractor deduction.
- [x] **6.** Rows sort by their displayed release/creation date; recent-list scope is labelled separately from full totals.
- [x] **7.** Removed the erroneous division by 100; money uses two decimals.
- [x] **8.** Removed dashboard truncation; Marketing completed count is exact; customer and report scopes are labelled.
- [x] **9.** Report average identifies paid-job denominator; quote and bid rates identify their separate populations.
- [x] **10.** Currency uses two decimals across affected dashboard, bid, quote, Marketing and Finance surfaces.
- [x] **11.** Subscription fee copy includes the 50p minimum and payment cap.
- [x] **12.** Budget and structured requirements use safe rendering; bid page enforces access and minimizes homeowner data.
- [x] **13.** Quotes derive terminal status from the authenticated contractor’s linked bid.
- [x] **14.** Real expiry dates drive Expired filter; API and transaction trigger reject expired quote acceptance.
- [x] **15.** My bids includes the caller’s bid outcome and relevant next action.
- [x] **16.** Contract card opens its authenticated PDF in the same browser context with feedback.
- [x] **17.** Generated contract records display Generated PDF instead of 0 B.
- [x] **18.** Document search has an accessible name.
- [x] **19.** Invoice creation opens explicit mobile instructions instead of linking to itself.
- [x] **20.** Expense form links an assigned job/client; API assignment enforcement remains intact.
- [x] **21.** Page finder includes Finance, Expenses, Documents, Scheduling, Reviews and Support.
- [x] **22.** Empty active-job results identify the selected trade filter.
- [x] **23.** Automatic bid acceptance is held at UI, settings and service layers until it uses the full checked workflow.
- [x] **24.** Event preferences and marketing email consent have separate explanations.
- [x] **25.** Automatic release notification wording identifies release checks instead of an unconditional timeout.
- [x] **26.** Greeting uses the person’s first name, with a neutral fallback.
- [x] **27.** No-review periods display No ratings in this period.
- [x] **28.** The 48-hour reply suggestion is explicitly a recommendation.
- [x] **29.** Support directs to the available email contact instead of promising an absent chat control.
- [x] **30.** Removed unsupported review/visibility uplift and dashboard percentage claims.
- [x] **31.** Travel/location enforce assignment, funding, signed agreement, cancellation wait and explicit early-start consent.
- [x] **32.** Calendar times, durations and repeated address segments use readable formatting.
- [x] **33.** Appointment form links a job/client, accepts HTTPS video links and maps remote to the database video type.
- [x] **34.** Portfolio form saves description, work performed and outcome within the existing description limit.

## Verification and release

- [x] Focused financial, bid, travel, ownership and controls regression tests: 73 passed.
- [x] TypeScript check passed; changed application files have no ESLint findings.
- [x] Existing Windows filesystem tests passed outside the restricted sandbox (15 passed, 2 intentional skips).
- [ ] Final full web/mobile suites and isolated database/browser checks: use this PR’s current-head checks as the authoritative result.
- [ ] Apply the reviewed quote-expiry migration during release, then deploy and verify both roles against the release.
- [ ] Physical Android acceptance and actual bank settlement remain separate launch gates.

Automatic bid acceptance is held disabled because its old mutation path bypassed the checked acceptance workflow. Manual acceptance remains available to the homeowner or designated payer. This is a deliberate feature limitation, not a claim that automated acceptance has been verified.

Finance totals cover all caller-owned payments; the transaction list shows the latest 50 created payments, sorted by the date displayed. Held amounts are gross remaining balances, released earnings use recorded contractor entitlement, and processing fees are paid by the platform. The customer’s gross amount and the contractor’s net amount may legitimately differ.

Security review: document navigation is checked by safeNavigationUrl; invoice PDF navigation uses a fixed internal path and an encoded ID; job-list fetch endpoints come from a fixed local mapping. These explain the scanner’s navigation/SSRF heuristics. Remaining scan results and release evidence are recorded in the external contractor checklist.

The pre-existing Supabase collation maintenance, recurring recovery operations, plan-dependent leaked-password protection, bank-settlement/physical-device acceptance and gated AI evaluation are not closed by this change.
