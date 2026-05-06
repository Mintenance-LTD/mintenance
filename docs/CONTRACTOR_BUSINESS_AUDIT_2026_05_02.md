# Contractor Business Hub — End-to-End Audit (2026-05-02)

Date: 2026-05-02 Scope: every screen reachable from the contractor "Business" tab on mobile, audited
against its corresponding web API contract and the live production DB schema. Focus: did the click
actually persist, or did it silently fail?

This file is the standalone artifact for the Business-screen pass. The broader 98%-readiness sprint
that ran in the same commit window is in
[FULL_APP_AUDIT_2026_05_02_98_READINESS.md](./FULL_APP_AUDIT_2026_05_02_98_READINESS.md).

## Surfaces audited

| Hub entry        | Screen                            | Backing API                                  | Status |
| ---------------- | --------------------------------- | -------------------------------------------- | ------ |
| Time             | `AddTimeEntryScreen.tsx`          | `POST /api/contractor/time-tracking`         | FIXED  |
| Expenses         | `ExpensesScreen.tsx` (create)     | `POST /api/contractor/expenses`              | FIXED  |
| Expenses         | `ExpensesScreen.tsx` (delete)     | `DELETE /api/contractor/expenses?id=…`       | FIXED  |
| Documents        | `DocumentsScreen.tsx` (star)      | `PATCH /api/contractor/documents`            | FIXED  |
| Documents        | `DocumentsScreen.tsx` (cert read) | `supabase.from('contractor_certifications')` | FIXED  |
| Certifications   | `AddCertificationScreen.tsx`      | `POST /api/contractor/certifications`        | FIXED  |
| Reports          | `reportingData.ts`                | `supabase.from('escrow_transactions')`       | FIXED  |
| Nav registration | `BusinessNavigator.tsx`           | `check-mobile-nav-targets.ts`                | OK     |

## Initial findings (BEFORE fix)

### P0 — Add Time Entry was unreachable

`apps/mobile/src/screens/contractor/AddTimeEntryScreen.tsx` posted snake_case field names
(`task_description`, `duration_minutes`, `hourly_rate`, `is_billable`, `start_time`).

`createEntrySchema` in `apps/web/app/api/contractor/time-tracking/route.ts` uses Zod's default
(strict) shape and requires camelCase (`taskDescription`, `durationMinutes`, `hourlyRate`,
`isBillable`, `startTime`).

Zod rejected every request with a 400. No row landed; the toast still said "Time entry added". Time
tracking was effectively read-only.

### P0 — Add Certification was unreachable

`AddCertificationScreen.tsx` had the same camelCase / snake_case mismatch. The screen sent
`credential_id`, `issue_date`, `expiry_date`; `certificationSchema` in the API expects
`credentialId`, `issueDate`, `expiryDate`. Zod rejected; nothing landed.

### P0 — Expense delete 404'd

`ExpensesScreen.tsx` called `DELETE /api/contractor/expenses/:id` (path segment) but the API exposes
`DELETE /api/contractor/expenses?id=…` (query string, parsed off the URL at `route.ts:126`).
Path-segment form 404'd silently and expenses never deleted from the screen.

### P1 — Expense create dropped the billable flag

The same screen sent `billable: …` for the create call, but `createExpenseSchema` expects
`isBillable`. Zod accepts the rest of the body and silently drops unknown keys, so every job-scoped
expense was saved with `is_billable = false` regardless of the toggle state.

### P1 — Document star/unstar 404'd

`DocumentsScreen.tsx` called `PATCH /api/contractor/documents/:id` but the API exposes
`PATCH /api/contractor/documents` and reads `id` from the body (`route.ts:281`). Path-segment form
404'd; the star icon flipped only in local state and reverted on next refresh.

### P1 — Documents screen used non-existent columns

The same screen's "Certifications as documents" SELECT picked `certification_name` and
`issuing_body`. Neither column exists on `public.contractor_certifications`. Supabase tolerated the
unknown column names and silently returned null for both. Result: every certification showed up in
the documents list as "Certification — " (blank issuer) with the wrong filename.

### P1 — Mobile reporting earnings always £0

`reportingData.ts` filtered `escrow_transactions` on `contractor_id`, but that column does not exist
on this table. The contractor side of escrow is `payee_id` (verified live). The web reporting route
at `apps/web/app/api/contractor/reporting/route.ts:49` already used `payee_id`. The mobile screen's
filter returned zero rows for everyone.

### Repo-source-of-truth drift on `contractor_certifications`

Independently of the runtime fixes above, the historical migration
(`009_missing_core_tables.sql:28`) defined the table with
`issuing_body / certificate_number / verified` and no `category`. Live production (verified via
Supabase MCP) has `issuer / credential_id / is_verified / verified_at / verified_by / category`. The
shared TypeScript type `packages/types/src/contractor.ts:5` matched the historical migration, not
live. A fresh checkout / disaster restore / CI ephemeral DB would build a schema that diverged from
production.

## Fixes (commit references)

| Commit     | What it landed                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ae0a6253` | Mobile-side payload + URL fixes for AddTimeEntry, Expense create + delete, Document star, Add Certification, Reporting earnings. Also `KNOWN_LARGE_FILES` allowlist for the +5-line DocumentsScreen edit (file pre-existed at 694 lines).                                                                                                                     |
| (this PR)  | Schema source-of-truth alignment: new migration `20260502000000_contractor_certifications_canonical.sql` (idempotent rename + add columns); `packages/types/src/contractor.ts` rewritten to match canonical names; DocumentsScreen `certification_name` / `issuing_body` SELECT fixed to read `name` / `issuer`; this audit doc and 98-readiness doc updates. |

## Verification battery

```
$ npx tsc --noEmit -p apps/mobile/tsconfig.json     → exit 0
$ npx tsc --noEmit -p apps/web/tsconfig.json        → exit 0
$ TMPDIR=/tmp npx tsx scripts/check-mobile-nav-targets.ts
    → "All mobile navigation targets are registered."
      (106 registered screen names, 854 files scanned)
$ TMPDIR=/tmp npx tsx scripts/check-banned-tables.ts → OK
```

Live DB queries run during the audit:

```
$ SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='contractor_certifications';
  → id, contractor_id, name, issuer, issue_date, expiry_date,
    credential_id, document_url, category, is_verified, verified_at,
    verified_by, created_at, updated_at

$ SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='escrow_transactions'
  AND column_name IN ('contractor_id','payee_id');
  → payee_id  (no contractor_id row returned)
```

## Manual smoke-test checklist

The verification battery above only proves the API contracts now line up. Each Business-screen flow
should be smoke-tested in a real build before the "Business hub works" claim is made:

- [ ] Business → Time → "Add Time Entry" — saves, appears in the timesheet.
- [ ] Business → Expenses → "Add Expense" with billable toggle ON — row lands with
      `is_billable = true`.
- [ ] Business → Expenses → swipe-to-delete — row removed from list and DB.
- [ ] Business → Documents → tap star — `starred=true` persisted; survives refresh.
- [ ] Business → Documents → certifications appear with the real name + issuer (not blank).
- [ ] Business → Certifications → "Add Certification" — row lands with `issuer`, `credential_id`,
      `category` populated.
- [ ] Business → Reports — "Total earnings (last 30d)" reflects released escrow for the logged-in
      contractor (was £0 before the `payee_id` fix).

## Out-of-scope items / known follow-ups

- `DocumentsScreen.tsx` is 699 lines (was 694). The fix added a 5-line comment + 2 functional lines,
  but the file was already over the 500-line gate before this audit. Splitting is tracked as a P2
  alongside the other Business screens (`ExpensesScreen.tsx` 681 lines, `CalendarScreen.tsx` 595
  lines, etc).
- The historical migration `009_missing_core_tables.sql` is left unmodified by design — it
  represents the schema state at bootstrap. The new
  `20260502000000_contractor_certifications_canonical.sql` migration owns the rename forward and is
  idempotent on production.
- No standalone Detox / Playwright suite exists for the Business hub. The verification above is
  contract-level (Zod + URL shape + DB column names) rather than user-flow level. Adding a
  `business-hub.spec.ts` Detox suite is a recommended next step alongside the auth-coverage CI gate
  that's already wired in.
