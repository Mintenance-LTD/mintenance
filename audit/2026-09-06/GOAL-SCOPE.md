# Active Mintenance goal — scope and acceptance

Updated 22 September 2026. This records the user's added scope alongside the original active
remediation goal. It is a requirements record, not evidence of implemented behaviour or launch
readiness. Both workstreams remain active.

## Original goal — unchanged

Complete the local Mintenance production-readiness audit remediation: resolve all confirmed findings
F1–F15 in READINESS-AUDIT.md, incorporating hosted verification corrections; preserve existing user
changes; add meaningful security, payment, concurrency and recovery regression tests; validate
migrations on an isolated local Supabase/Docker stack and run relevant web/mobile checks; update
remediation evidence with exact results and remaining externally blocked verification. Do not
deploy, modify hosted databases or production data, contact real users, or make live payments. Do
not mark complete while required local fixes or validation remain.

## Added user scope — property operations

The complete attached requirements are preserved verbatim in
[PROPERTY-OPERATIONS-USER-BRIEF.md](PROPERTY-OPERATIONS-USER-BRIEF.md). The eight 21 September
screenshots are visual reference evidence, not database fixtures or proof that displayed figures are
authoritative. Do not copy personal details from screenshots into tests or seed data.

The objective is coherent professional property-management workflows using the existing architecture
and visual identity, with no fabricated data or backend success. Preserve homeowner and contractor
functionality and enforce property, tenant, team, document and sensitive access-code isolation.

### Required implementation order

- [ ] P0: Operations Inbox across authorized properties.
- [ ] P0: Property command centre with actionable KPIs, urgent actions and upcoming activity.
- [ ] P0: Consistent work-order status semantics using existing authoritative transitions.
- [ ] P0: Work-order views, supported filters, next actions and detail drawer/sheet.
- [ ] P0: Reusable target/overdue calculations using actual dates and configured rules.
- [ ] P1: Compliance tracker with explicit applicability and evidence-based status.
- [ ] P1: Asset register and linked service history where supported.
- [ ] P1: Planned maintenance, truthful automation controls and overdue/upcoming views.
- [ ] P1: Linked property history derived from real events.
- [ ] P1: Financial totals separating paid, committed, approvals and budgets where supported.
- [ ] P2: Contractor performance from sufficient underlying evidence.
- [ ] P2: Evidence-backed Mint detected recommendations with useful actions.
- [ ] P2: Linked document metadata; extraction only if supported reliably.
- [ ] P2: Portfolio analytics after P0 quality and correctness.

All numbered sections of the full brief remain acceptance requirements, including header/occupancy
data where available, access and contacts, information architecture, reusable components, query
performance, responsive layouts, accessible states and labels, authorization, and quality checks.
The checklist above is an ordering aid, not a reduction of scope. Missing backend capability must be
evidenced and explicitly reported; it must not be replaced by fake statistics or speculative
interface controls.

## Initial code evidence and implementation approach

Initial inspection on `codex/migrate-next-proxy` after remediation commit
`d02b7ad71b4fd5cc1656327428fdc454175082dd` located both theme implementations, property APIs,
compliance certificates, two recurring-maintenance concepts, property team roles, tenant/reporting
routes, appointments, document routes and shared job state-machine constants. Detailed caller,
schema and permission tracing is still in progress; comments and old design references do not prove
behaviour.

Confirmed from the currently executed code paths:

- `app/properties/[id]/page.tsx` restricts to the property owner, fetches jobs and schedules
  sequentially, ignores their query errors, sums completed-job budgets into `totalSpent`, and
  substitutes the current year when construction year is absent.
- `MintEditorialPropertyDocuments.tsx` converts completed jobs into rows labelled PDF / Receipt /
  Auto-filed with links to jobs, without fetching receipt files.
- `lib/utils/property-health-score.ts` derives a health grade from job counts, recency and
  categories; its critical grade asserts immediate deterioration risk without inspection evidence.
  The property overview renders this grade.
- `app/jobs/page.tsx` already has next-action logic and filters, while property components
  independently label statuses. Reuse and consolidate rather than introduce a second lifecycle.
- `PropertyTeamService.ts` recognizes accepted property team membership, while the property detail
  page above only accepts owners. Trace permissions throughout before extending manager access.

Short implementation plan before property feature edits:

1. Finish tracing the actual portfolio/job/property data loaders, permissions, documents,
   compliance, recurring schedules, access-code consumers and navigation. Record supported fields,
   missing capabilities and exact authoritative amounts.
2. Establish shared operational read models and status/date/financial utilities. Aggregate server
   data with explicit failure states and bounded queries.
3. Build P0 Inbox and property command centre with existing components and tokens; every supported
   KPI/action must link to the corresponding scoped records.
4. Connect work-order filters and detail actions to current APIs, then P1 workflows. Keep sensitive
   information out of broad portfolio payloads.
5. Validate domain calculations, separate-user authorization, failure/retry states, responsive
   browser interaction, relevant integration tests, types, lint and build. Report backend gaps and
   remaining risks explicitly before any completion claim.

## Completion rule

Do not mark the goal complete merely because one workstream or checkpoint passes. Audit repairs,
property workflow requirements and applicable local validation must all be accounted for with
current code/runtime evidence. Preserve the original prohibitions on deployment, hosted mutations,
live payments and real-user contact.

## Hosted SQL authorization — 22 September 2026

The user now authorizes applying reviewed application migrations to the connected hosted Supabase
project. This supersedes earlier no-hosted-mutation wording for that purpose. Preserve the
prohibitions on live payments, unrelated production data edits, destructive resets, real-user
contact and application deployment. See HOSTED-ROLLOUT-2026-09-22.md for the completed 53-migration
production rollout and remaining limitations.

## Mobile parity requirement — 22 September 2026

The user explicitly requires mobile to match applicable web management changes and audit repairs.
For each new workflow, trace both clients against the same server permissions, statuses, dates, and
response contract. Include failure states and account-scoped caches in acceptance tests. A web-only
checkpoint does not establish mobile completion. Native component tests do not replace
physical-device checks for navigation, interruptions, uploads, accessibility, and payment hand-offs.
